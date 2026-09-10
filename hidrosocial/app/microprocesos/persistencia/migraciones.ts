import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { BaseDatos } from './repositorio';
export async function migrar(db: BaseDatos, directorio: string): Promise<string[]> {
  const archivos = (await readdir(directorio)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  return db.transaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(738291045)');
    await tx.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      nombre text PRIMARY KEY, checksum text NOT NULL, aplicado_en timestamptz NOT NULL DEFAULT now())`);
    const aplicadas: string[] = [];
    for (const nombre of archivos) {
      const sql = await readFile(join(directorio, nombre), 'utf8');
      const checksum = createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
      const { rows } = await tx.query<{ checksum: string }>(
        'SELECT checksum FROM schema_migrations WHERE nombre = $1',
        [nombre],
      );
      if (rows[0]) {
        if (rows[0].checksum !== checksum)
          throw new Error(
            `La migración ${nombre} cambió después de aplicarse. Crea una migración nueva.`,
          );
        continue;
      }
      await tx.query(sql);
      await tx.query('INSERT INTO schema_migrations (nombre, checksum) VALUES ($1, $2)', [
        nombre,
        checksum,
      ]);
      aplicadas.push(nombre);
    }
    return aplicadas;
  });
}
