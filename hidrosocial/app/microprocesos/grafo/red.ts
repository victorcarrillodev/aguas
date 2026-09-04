import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';

import type { VaultGraph } from '../vault-core/tipos';

/** Nº de aristas que tocan el nodo (ambas direcciones). */
export function grado(g: VaultGraph, id: string): number {
  let n = 0;
  for (const a of g.aristas) {
    if (a.origen === id || a.destino === id) n++;
  }
  return n;
}

/** Pares no dirigidos únicos (sin bucles) para densidad/modularidad. */
function paresUnicos(g: VaultGraph): Set<string> {
  const pares = new Set<string>();
  for (const a of g.aristas) {
    if (a.origen === a.destino) continue;
    if (!g.nodos.has(a.origen) || !g.nodos.has(a.destino)) continue;
    const clave = a.origen < a.destino ? `${a.origen}|${a.destino}` : `${a.destino}|${a.origen}`;
    pares.add(clave);
  }
  return pares;
}

/** Densidad no dirigida: 2·E / (N·(N−1)); 0 si N<2. */
export function densidad(g: VaultGraph): number {
  const n = g.nodos.size;
  if (n < 2) return 0;
  return (2 * paresUnicos(g).size) / (n * (n - 1));
}

/**
 * Modularidad de la partición Louvain ([−0.5, 1]); 0 si N<2 o si
 * el algoritmo falla (grafo vacío o degenerado). RNG con semilla fija
 * para un valor determinista entre recargas.
 */
export function modularidad(g: VaultGraph): number {
  if (g.nodos.size < 2) return 0;
  try {
    const graph = new Graph({ type: 'undirected' });
    for (const id of g.nodos.keys()) graph.addNode(id);
    for (const par of paresUnicos(g)) {
      const [o, d] = par.split('|');
      if (!graph.hasEdge(o, d)) graph.addEdge(o, d);
    }
    if (graph.size === 0) return 0;
    let semilla = 42;
    const rng = () => {
      semilla = (semilla * 1664525 + 1013904223) >>> 0;
      return semilla / 2 ** 32;
    };
    const { modularity } = louvain.detailed(graph, { rng });
    return Number.isFinite(modularity) ? modularity : 0;
  } catch {
    return 0;
  }
}
