import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { encodeNodo, slugificar } from '~/lib/rutas';
import { getVaultGraph, getVaultPath, invalidar } from '../cache/index';
import type { VaultNode } from '../vault-core/tipos';
import type { Borrador } from './esquema';
import { renderPlantilla } from './plantilla';

const DIR_EVIDENCIA = '9 · Evidencia de campo';

async function existe(rutaAbs: string): Promise<boolean> {
  try {
    await stat(rutaAbs);
    return true;
  } catch {
    return false;
  }
}

/**
 * Escribe la nota en `9 · Evidencia de campo/<slug>.md` (sufijo -2, -3…
 * si colisiona), crea la carpeta si no existe e invalida la caché.
 */
export async function guardarNota(b: Borrador): Promise<VaultNode> {
  const vaultPath = getVaultPath();
  const g = await getVaultGraph();

  const causa = [...g.nodos.values()].find((n) => n.tipo === 'causa' && n.arbol === b.arbol);
  if (!causa) throw new Error(`No hay causa para el árbol ${b.arbol}.`);

  let ficha: { relPath: string; titulo: string } | undefined;
  if (b.fichaId) {
    const n = g.nodos.get(b.fichaId);
    if (!n || n.tipo !== 'ficha') throw new Error('La ficha elegida no existe.');
    ficha = { relPath: n.relPath, titulo: n.titulo };
  }
  let medicion: { relPath: string; titulo: string } | undefined;
  if (b.medicionId) {
    const n = g.nodos.get(b.medicionId);
    if (!n || n.tipo !== 'medicion') throw new Error('La medición elegida no existe.');
    medicion = { relPath: n.relPath, titulo: n.titulo };
  }

  const contenido = renderPlantilla(b, {
    causa: { relPath: causa.relPath, titulo: causa.titulo },
    ficha,
    medicion,
  });

  const base = slugificar(b.titulo) || 'evidencia';
  const dirAbs = join(vaultPath, DIR_EVIDENCIA);
  await mkdir(dirAbs, { recursive: true });
  let nombre = `${base}.md`;
  let i = 2;
  while (await existe(join(dirAbs, nombre))) {
    nombre = `${base}-${i}.md`;
    i++;
  }
  await writeFile(join(dirAbs, nombre), contenido, 'utf8');

  const relPath = `${DIR_EVIDENCIA}/${nombre}`;
  invalidar();
  return {
    id: relPath,
    tipo: 'evidencia',
    titulo: b.titulo,
    slug: encodeNodo(relPath),
    relPath,
    frontmatter: {
      titulo: b.titulo,
      arbol: b.arbol,
      'tipo-evidencia': b.tipoEvidencia,
      capa: b.capa,
      lente: (b.lentes?.length ? b.lentes : [b.lente]).join(', '),
      fecha: b.fecha,
      fuente: b.fuente,
      ...(b.municipio ? { municipio: b.municipio } : {}),
    },
    resumen: b.enunciado,
    arbol: b.arbol,
    capa: b.capa,
  };
}
