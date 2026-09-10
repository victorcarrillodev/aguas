import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFrontmatter } from '../vault-core/frontmatter';
import type { Documento } from './repositorio';

/** Lee únicamente evidencia operativa; no modifica los originales ni sigue enlaces simbólicos. */
export async function leerEvidenciaLegacy(vaultPath: string): Promise<Documento[]> {
  if (!(await stat(vaultPath)).isDirectory())
    throw new Error('La ruta del vault no es un directorio.');
  const documentos: Documento[] = [];
  async function caminar(rel: string): Promise<void> {
    let entradas: Dirent[];
    try {
      entradas = await readdir(join(vaultPath, rel), { withFileTypes: true });
    } catch (e) {
      if (rel === '9 · Evidencia de campo' && (e as NodeJS.ErrnoException).code === 'ENOENT')
        return;
      throw e;
    }
    for (const e of entradas.sort((a, b) => a.name.localeCompare(b.name))) {
      const id = `${rel}/${e.name}`;
      if (e.isSymbolicLink()) throw new Error(`La importación no admite enlaces simbólicos: ${id}`);
      if (e.isDirectory()) await caminar(id);
      else if (e.isFile() && e.name.endsWith('.md')) {
        const original = await readFile(join(vaultPath, id), 'utf8');
        const { datos, cuerpo } = parseFrontmatter(original);
        documentos.push({
          id,
          metadatos: datos,
          cuerpo,
          original,
          hash: createHash('sha256').update(original).digest('hex'),
        });
      }
    }
  }
  await caminar('9 · Evidencia de campo');
  return documentos;
}
