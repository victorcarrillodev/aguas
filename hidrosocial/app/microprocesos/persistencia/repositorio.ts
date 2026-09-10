export interface Consulta {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    texto: string,
    valores?: unknown[],
  ): Promise<{ rows: T[] }>;
}
export interface BaseDatos extends Consulta {
  transaction<T>(fn: (tx: Consulta) => Promise<T>): Promise<T>;
}
export interface Documento {
  id: string;
  metadatos: Record<string, string | undefined>;
  cuerpo: string;
  original?: string;
  hash?: string;
}
export interface ReferenciaBorrador {
  token: string;
  version: number;
}
export type DatosBorrador = Record<string, string | string[]>;
export class ConflictoBorrador extends Error {
  status = 409;
  constructor() {
    super(
      'Este borrador cambió o ya se envió desde otra pestaña. Recarga la página antes de continuar; conserva una copia de tus cambios.',
    );
  }
}
export class ErrorPersistencia extends Error {
  status = 503;
  constructor() {
    super(
      'No se pudo acceder al almacenamiento del servidor. Conserva tus cambios y vuelve a intentarlo cuando se restablezca PostgreSQL.',
    );
  }
}
type FilaDocumento = {
  id: string;
  metadatos: Record<string, string>;
  cuerpo: string;
  original_md: string | null;
  hash_origen: string | null;
};
function documento(f: FilaDocumento): Documento {
  return {
    id: f.id,
    metadatos: f.metadatos,
    cuerpo: f.cuerpo,
    original: f.original_md ?? undefined,
    hash: f.hash_origen ?? undefined,
  };
}
async function insertar(tx: Consulta, d: Documento) {
  await tx.query(
    `INSERT INTO documentos (id, metadatos, cuerpo, origen, original_md, hash_origen)
    VALUES ($1, $2::jsonb, $3, $4, $5, $6)`,
    [
      d.id,
      JSON.stringify(d.metadatos),
      d.cuerpo,
      d.hash ? 'vault' : 'app',
      d.original ?? null,
      d.hash ?? null,
    ],
  );
}
export class Repositorio {
  constructor(readonly db: BaseDatos) {}
  async listarDocumentos(): Promise<Documento[]> {
    const { rows } = await this.db.query<FilaDocumento>(
      'SELECT id, metadatos, cuerpo, original_md, hash_origen FROM documentos ORDER BY id',
    );
    return rows.map(documento);
  }
  async obtenerDocumento(id: string): Promise<Documento | null> {
    const { rows } = await this.db.query<FilaDocumento>(
      'SELECT id, metadatos, cuerpo, original_md, hash_origen FROM documentos WHERE id = $1',
      [id],
    );
    return rows[0] ? documento(rows[0]) : null;
  }
  async crearDocumento(d: Documento, borrador?: ReferenciaBorrador): Promise<void> {
    await this.db.transaction(async (tx) => {
      if (borrador) {
        // La misma clave serializa guardados, consumo y reintentos del borrador.
        await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [borrador.token]);
        const usados = await tx.query('SELECT token FROM envios_captura WHERE token = $1', [
          borrador.token,
        ]);
        if (usados.rows.length) throw new ConflictoBorrador();
        const { rows } = await tx.query<{ version: number }>(
          'SELECT version FROM borradores WHERE token = $1 FOR UPDATE',
          [borrador.token],
        );
        if ((rows[0]?.version ?? 0) !== borrador.version) throw new ConflictoBorrador();
      }
      await insertar(tx, d);
      if (borrador) {
        await tx.query('INSERT INTO envios_captura (token, documento_id) VALUES ($1, $2)', [
          borrador.token,
          d.id,
        ]);
        await tx.query('DELETE FROM borradores WHERE token = $1', [borrador.token]);
      }
    });
  }
  async leerBorrador(token: string): Promise<{ datos: DatosBorrador; version: number } | null> {
    const { rows } = await this.db.query<{ datos: DatosBorrador; version: number }>(
      'SELECT datos, version FROM borradores WHERE token = $1',
      [token],
    );
    return rows[0] ?? null;
  }
  async guardarBorrador(token: string, datos: DatosBorrador, version: number): Promise<number> {
    if (!Number.isSafeInteger(version) || version < 0) throw new ConflictoBorrador();
    return this.db.transaction(async (tx) => {
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [token]);
      const usados = await tx.query('SELECT token FROM envios_captura WHERE token = $1', [token]);
      if (usados.rows.length) throw new ConflictoBorrador();
      if (version === 0) {
        const { rows } = await tx.query<{ version: number }>(
          `INSERT INTO borradores (token, datos, version)
          VALUES ($1, $2::jsonb, 1) ON CONFLICT (token) DO NOTHING RETURNING version`,
          [token, JSON.stringify(datos)],
        );
        if (!rows[0]) throw new ConflictoBorrador();
        return rows[0].version;
      }
      const { rows } = await tx.query<{ version: number }>(
        `UPDATE borradores SET datos = $2::jsonb,
        version = version + 1, actualizado_en = now() WHERE token = $1 AND version = $3 RETURNING version`,
        [token, JSON.stringify(datos), version],
      );
      if (!rows[0]) throw new ConflictoBorrador();
      return rows[0].version;
    });
  }
  async eliminarBorrador(token: string): Promise<void> {
    await this.db.query('DELETE FROM borradores WHERE token = $1', [token]);
  }
  async importar(
    documentos: Documento[],
    simulacion = false,
  ): Promise<{ nuevos: number; existentes: number }> {
    return this.db.transaction(async (tx) => {
      await tx.query('SELECT pg_advisory_xact_lock(738291046)');
      let nuevos = 0;
      let existentes = 0;
      for (const d of documentos) {
        const { rows } = await tx.query<{ hash_origen: string | null }>(
          'SELECT hash_origen FROM documentos WHERE id = $1',
          [d.id],
        );
        if (rows.length) {
          if (rows[0].hash_origen !== d.hash)
            throw new Error(
              `Conflicto de importación: ${d.id}. El contenido cambió; no se sobrescribió la base de datos.`,
            );
          existentes++;
        } else {
          if (!simulacion) await insertar(tx, d);
          nuevos++;
        }
      }
      return { nuevos, existentes };
    });
  }
}
