import type { AristaRender, NodoRender } from './index';

/** Distribuye únicamente padres inmediatos. Las capas no intervienen en la posición. */
export function disponerArbol(nodos: NodoRender[], aristas: AristaRender[]): NodoRender[] {
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const hijos = new Map<string, string[]>();
  const conPadre = new Set<string>();
  const ordenar = (a: string, b: string) =>
    (porId.get(a)?.codigo || a).localeCompare(porId.get(b)?.codigo || b, 'es', { numeric: true });
  for (const a of aristas) {
    if (a.tipo !== 'causa-propuesta' || !porId.has(a.origen) || !porId.has(a.destino)) continue;
    hijos.set(a.destino, [...(hijos.get(a.destino) || []), a.origen]);
    conPadre.add(a.origen);
  }
  const posiciones = new Map<string, number>();
  const visitados = new Set<string>();
  let siguiente = 0;
  function situar(id: string): number {
    if (visitados.has(id)) return posiciones.get(id) ?? 0;
    visitados.add(id);
    const descendientes = [...new Set(hijos.get(id) || [])].sort(ordenar);
    const xs = descendientes.map(situar);
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : siguiente++ * 4;
    posiciones.set(id, x);
    return x;
  }
  [...porId.keys()].filter((id) => !conPadre.has(id)).sort(ordenar).forEach(situar);
  // Conserva visibles los nodos pendientes de conciliación aunque no tengan padre válido.
  [...porId.keys()].filter((id) => !visitados.has(id)).sort(ordenar).forEach(situar);
  return nodos.map((n) => ({
    ...n,
    x: posiciones.get(n.id) ?? 0,
    y: -Number(n.nivelCausal?.slice(1) || 0) * 6,
    size: 7,
  }));
}
