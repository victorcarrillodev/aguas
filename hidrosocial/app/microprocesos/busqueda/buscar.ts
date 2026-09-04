import type { VaultGraph, VaultNode } from '../vault-core/tipos';

export interface ResultadoBusqueda {
  nodo: VaultNode;
  puntos: number;
}

const MAX_RESULTADOS = 12;

/** Minúsculas sin acentos para comparar (títulos, resúmenes y consultas). */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Búsqueda rankeada sobre el grafo: título (3 pts por término, 6 si el
 * título coincide exacto), resumen (1), arbol/tipo/capa/frontmatter (2).
 * Pura, sin dependencias. Máximo 12 resultados.
 */
export function buscar(g: VaultGraph, q: string): ResultadoBusqueda[] {
  const consulta = normalizar(q.trim());
  if (!consulta) return [];
  const terminos = consulta.split(/\s+/).filter(Boolean);
  const salida: ResultadoBusqueda[] = [];

  for (const nodo of g.nodos.values()) {
    let puntos = 0;
    const titulo = normalizar(nodo.titulo);
    if (titulo === consulta) {
      puntos += 6;
    } else {
      for (const t of terminos) {
        if (titulo.includes(t)) puntos += 3;
      }
    }
    const resumen = normalizar(nodo.resumen);
    for (const t of terminos) {
      if (resumen.includes(t)) puntos += 1;
    }
    const extra = normalizar(
      [
        nodo.arbol ?? '',
        nodo.tipo,
        nodo.capa ?? '',
        Object.values(nodo.frontmatter ?? {}).join(' '),
      ].join(' '),
    );
    for (const t of terminos) {
      if (extra.includes(t)) puntos += 2;
    }
    if (puntos > 0) salida.push({ nodo, puntos });
  }

  salida.sort((a, b) => b.puntos - a.puntos || a.nodo.titulo.localeCompare(b.nodo.titulo, 'es'));
  return salida.slice(0, MAX_RESULTADOS);
}
