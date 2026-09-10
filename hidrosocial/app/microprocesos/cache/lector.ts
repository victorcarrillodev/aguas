import { obtenerDocumento, postgresConfigurado } from '../persistencia/index.server';
import { leerNota as leerNotaArchivo, notaDesdeDatos } from '../vault-core/index';
import type { NotaCompleta } from '../vault-core/tipos';

/** PostgreSQL es la fuente del registro; las notas de diagnóstico siguen en el vault. */
export async function leerNota(vaultPath: string, relPath: string): Promise<NotaCompleta> {
  if (postgresConfigurado()) {
    const documento = await obtenerDocumento(relPath);
    if (documento) return notaDesdeDatos(documento.id, documento.metadatos, documento.cuerpo);
  }
  return leerNotaArchivo(vaultPath, relPath);
}
