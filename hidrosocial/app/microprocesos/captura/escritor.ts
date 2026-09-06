import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { encodeNodo, slugificar } from '~/lib/rutas';
import { getVaultGraph, getVaultPath, invalidar } from '../cache/index';
import { parseFrontmatter } from '../vault-core/frontmatter';
import type { VaultNode } from '../vault-core/tipos';
import type { Borrador } from './esquema';
import { renderPlantilla } from './plantilla';

const DIR_EVIDENCIA = '9 · Evidencia de campo';

/** Escritura exclusiva: las colisiones nunca reemplazan una aportación ya recibida. */
export async function guardarNota(b: Borrador): Promise<VaultNode> {
  const vaultPath = getVaultPath();
  const g = await getVaultGraph();
  if (!b.nodoId) throw new Error('Selecciona la afirmación que vas a examinar.');
  const objetivo = g.nodos.get(b.nodoId);
  if (!objetivo || objetivo.frontmatter.registro || (objetivo.arbol && objetivo.arbol !== b.arbol))
    throw new Error('La afirmación elegida no corresponde al árbol.');
  const causa = [...g.nodos.values()].find((n) => n.tipo === 'causa' && n.arbol === b.arbol);
  if (!causa) throw new Error('No hay causa para el árbol ' + b.arbol + '.');
  if (b.planId) {
    const plan = g.nodos.get(b.planId);
    if (plan?.frontmatter.registro !== 'contraste' || plan.frontmatter.nodo_id !== objetivo.id)
      throw new Error('El plan de contraste no corresponde a la afirmación elegida.');
  }

  let ficha: { relPath: string; titulo: string } | undefined;
  if (b.fichaId) {
    const n = g.nodos.get(b.fichaId);
    if (!n || n.tipo !== 'ficha' || n.arbol !== b.arbol)
      throw new Error('La ficha elegida no corresponde al árbol.');
    ficha = { relPath: n.relPath, titulo: n.titulo };
  }
  let medicion: { relPath: string; titulo: string } | undefined;
  if (b.medicionId) {
    const n = g.nodos.get(b.medicionId);
    if (!n || n.tipo !== 'medicion' || n.arbol !== b.arbol)
      throw new Error('La medición elegida no corresponde al árbol.');
    medicion = { relPath: n.relPath, titulo: n.titulo };
  }
  const captura = {
    ...b,
    nodoId: objetivo.id,
    textoOriginal: objetivo.frontmatter.enunciado || objetivo.frontmatter.afirmacion || objetivo.resumen,
  };
  const contenido = renderPlantilla(captura, {
    causa: { relPath: causa.relPath, titulo: causa.titulo },
    ficha,
    medicion,
  }).replace('---\n', '---\ncreado: ' + JSON.stringify(new Date().toISOString()) + '\n');

  // Evita nombres más largos que los límites habituales del sistema de archivos.
  const base = slugificar(b.titulo).slice(0, 120).replace(/-+$/, '') || 'evidencia';
  const dirAbs = join(vaultPath, DIR_EVIDENCIA);
  await mkdir(dirAbs, { recursive: true });
  let nombre = base + '.md';
  let sufijo = 2;
  for (;;) {
    try {
      await writeFile(join(dirAbs, nombre), contenido, { encoding: 'utf8', flag: 'wx' });
      break;
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error;
      nombre = base + '-' + sufijo++ + '.md';
    }
  }

  const relPath = DIR_EVIDENCIA + '/' + nombre;
  invalidar();
  return {
    id: relPath,
    tipo: 'evidencia',
    titulo: b.titulo,
    slug: encodeNodo(relPath),
    relPath,
    frontmatter: parseFrontmatter(contenido).datos,
    resumen: b.enunciado,
    arbol: b.arbol,
    capa: b.capa,
  };
}
