import type { Dirent } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { encodeNodo } from '~/lib/rutas';
import { parseCanvas } from './canvas';
import { arbolDeNota, capaDeNodo, tipoDeNota } from './clasificar';
import { parseFrontmatter } from './frontmatter';
import { extraerLinks } from './markdown-links';
import type {
  ArbolId,
  NotaCompleta,
  VaultEdge,
  VaultGraph,
  VaultNode,
  VaultNodeType,
} from './tipos';

export type { ArbolId, NotaCompleta, VaultEdge, VaultGraph, VaultNode, VaultNodeType };

/** Directorios de nivel raíz que nunca son contenido del vault. */
const EXCLUIDOS = new Set([
  '.obsidian',
  '.git',
  'node_modules',
  'build',
  'graphify-out',
  'hidrosocial',
]);

/** Recorre el vault buscando `.md` y `.canvas` (omite `_Trabajo interno/`, `.obsidian/` y la propia app). */
async function recogerArchivos(vaultPath: string): Promise<string[]> {
  const rels: string[] = [];
  async function caminar(dirAbs: string, dirRel: string) {
    let entradas: Dirent[] | undefined;
    try {
      entradas = await readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    if (!entradas) return;
    for (const e of entradas) {
      if (EXCLUIDOS.has(e.name)) continue;
      const rel = dirRel ? `${dirRel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (rel === '_Trabajo interno' || rel.startsWith('_Trabajo interno/')) continue;
        await caminar(join(dirAbs, e.name), rel);
      } else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.canvas'))) {
        rels.push(rel);
      }
    }
  }
  await caminar(vaultPath, '');
  return rels.sort();
}

function directorioDe(relPath: string): string {
  const i = relPath.lastIndexOf('/');
  return i === -1 ? '' : relPath.slice(0, i);
}

function nombreBase(relPath: string): string {
  const base = relPath.split('/').pop() ?? relPath;
  return base.replace(/\.md$/, '');
}

/** Primer blockquote `> ...` o los primeros 160 caracteres del cuerpo. */
function extraerResumen(cuerpo: string): string {
  for (const linea of cuerpo.split(/\r?\n/)) {
    const t = linea.trim();
    if (t.startsWith('>')) {
      const texto = t
        .replace(/^>+\s?/, '')
        .replace(/\*\*/g, '')
        .trim();
      if (texto) return texto.slice(0, 220);
    }
  }
  const plano = cuerpo
    .replace(/^#+\s?.*$/gm, '')
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plano.slice(0, 160);
}

/** `true` salvo que la sección `## Línea base` diga "No disponible". */
function lineaBase(cuerpo: string): boolean | undefined {
  const i = cuerpo.search(/^##\s+Línea base/m);
  if (i === -1) return undefined;
  const resto = cuerpo.slice(i);
  const siguiente = resto.slice(1).search(/^##\s+/m);
  const seccion = siguiente === -1 ? resto : resto.slice(0, siguiente + 1);
  return !/no disponible/i.test(seccion);
}

function construirNodo(relPath: string, texto: string): VaultNode | null {
  const { datos, cuerpo } = parseFrontmatter(texto);
  const tipo = tipoDeNota(relPath, datos);
  if (!tipo) return null;
  const arbol = arbolDeNota(relPath, datos);
  const nodo: VaultNode = {
    id: relPath,
    tipo,
    titulo: datos.titulo ?? nombreBase(relPath),
    slug: encodeNodo(relPath),
    relPath,
    frontmatter: datos,
    resumen: extraerResumen(cuerpo),
  };
  if (arbol) nodo.arbol = arbol;
  const capa = capaDeNodo(tipo, datos, arbol);
  if (capa) nodo.capa = capa;
  if (tipo === 'medicion') {
    const lb = lineaBase(cuerpo);
    if (lb !== undefined) nodo.lineaBaseDisponible = lb;
  }
  return nodo;
}

export async function parseVault(vaultPath: string): Promise<VaultGraph> {
  const rels = await recogerArchivos(vaultPath);
  const nodos = new Map<string, VaultNode>();
  const aristas: VaultEdge[] = [];
  const vistas = new Set<string>();
  const agregar = (a: VaultEdge) => {
    const clave = `${a.origen}|${a.destino}|${a.tipo}`;
    if (a.origen === a.destino || vistas.has(clave)) return;
    vistas.add(clave);
    aristas.push(a);
  };

  // 1) Nodos desde los .md.
  const cuerpos = new Map<string, string>();
  for (const rel of rels) {
    if (!rel.endsWith('.md')) continue;
    let texto: string;
    try {
      texto = await readFile(join(vaultPath, ...rel.split('/')), 'utf8');
    } catch {
      continue;
    }
    const nodo = construirNodo(rel, texto);
    if (!nodo) continue;
    nodos.set(rel, nodo);
    cuerpos.set(rel, parseFrontmatter(texto).cuerpo);
  }

  // 2) Enlaces markdown → aristas (solo a nodos existentes).
  for (const [rel, cuerpo] of cuerpos) {
    for (const destino of extraerLinks(cuerpo, directorioDe(rel))) {
      if (nodos.has(destino)) agregar({ origen: rel, destino, tipo: 'enlace' });
    }
  }

  // 3) Canvas → aristas entre archivos existentes.
  for (const rel of rels) {
    if (!rel.endsWith('.canvas')) continue;
    let texto: string;
    try {
      texto = await readFile(join(vaultPath, ...rel.split('/')), 'utf8');
    } catch {
      continue;
    }
    for (const a of parseCanvas(texto).aristas) {
      if (nodos.has(a.origen) && nodos.has(a.destino)) agregar(a);
    }
  }

  // 4) Jerarquía ficha→causa y medicion→causa por `arbol`.
  const causaPorArbol = new Map<string, string>();
  for (const n of nodos.values()) {
    if (n.tipo === 'causa' && n.arbol && !causaPorArbol.has(n.arbol)) {
      causaPorArbol.set(n.arbol, n.id);
    }
  }
  for (const n of nodos.values()) {
    if ((n.tipo === 'ficha' || n.tipo === 'medicion') && n.arbol) {
      const causa = causaPorArbol.get(n.arbol);
      if (causa) agregar({ origen: n.id, destino: causa, tipo: 'jerarquia' });
    }
  }

  return { nodos, aristas, escaneadoEn: Date.now() };
}

export async function leerNota(vaultPath: string, relPath: string): Promise<NotaCompleta> {
  const texto = await readFile(join(vaultPath, ...relPath.split('/')), 'utf8');
  const { datos, cuerpo } = parseFrontmatter(texto);
  const construido = construirNodo(relPath, texto);
  if (!construido) throw new Error(`Nota ignorada por el clasificador: ${relPath}`);
  return {
    nodo: construido,
    frontmatter: datos,
    cuerpo,
    links: extraerLinks(cuerpo, directorioDe(relPath)),
  };
}

export interface InfoArbol {
  id: ArbolId;
  titulo: string;
  causaId: string;
}

/** Una entrada por árbol E1–E10 con su causa raíz y título. */
export function listarArboles(g: VaultGraph): InfoArbol[] {
  const causas = [...g.nodos.values()].filter((n) => n.tipo === 'causa' && n.arbol);
  causas.sort((a, b) =>
    (a.arbol as string).localeCompare(b.arbol as string, 'es', { numeric: true }),
  );
  return causas.map((c) => ({ id: c.arbol as ArbolId, titulo: c.titulo, causaId: c.id }));
}

export function estadisticas(g: VaultGraph): {
  porTipo: Record<string, number>;
  porCapa: Record<string, number>;
  porArbol: Record<string, number>;
} {
  const porTipo: Record<string, number> = {};
  const porCapa: Record<string, number> = {};
  const porArbol: Record<string, number> = {};
  for (const n of g.nodos.values()) {
    porTipo[n.tipo] = (porTipo[n.tipo] ?? 0) + 1;
    if (n.capa) porCapa[n.capa] = (porCapa[n.capa] ?? 0) + 1;
    if (n.arbol) porArbol[n.arbol] = (porArbol[n.arbol] ?? 0) + 1;
  }
  return { porTipo, porCapa, porArbol };
}
