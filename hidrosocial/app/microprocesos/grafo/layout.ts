import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';

// Layout ForceAtlas2 headless en servidor para posiciones deterministas
// cacheadas. Si falla, fallback a disposición circular determinista.

export interface Posicion {
  x: number;
  y: number;
}

function circular(ids: string[]): Map<string, Posicion> {
  const mapa = new Map<string, Posicion>();
  const n = ids.length || 1;
  ids.forEach((id, i) => {
    const ang = (2 * Math.PI * i) / n;
    mapa.set(id, { x: Math.cos(ang) * 10, y: Math.sin(ang) * 10 });
  });
  return mapa;
}

export function calcularLayout(
  ids: string[],
  aristas: { origen: string; destino: string }[],
): Map<string, Posicion> {
  if (ids.length === 0) return new Map();
  try {
    const graph = new Graph();
    const base = circular(ids);
    for (const id of ids) {
      const p = base.get(id) as Posicion;
      graph.addNode(id, { x: p.x, y: p.y });
    }
    for (const a of aristas) {
      if (a.origen !== a.destino && graph.hasNode(a.origen) && graph.hasNode(a.destino)) {
        graph.addEdge(a.origen, a.destino);
      }
    }
    forceAtlas2.assign(graph, {
      iterations: 150,
      settings: { ...forceAtlas2.inferSettings(graph), barnesHutOptimize: graph.order > 500 },
    });
    const mapa = new Map<string, Posicion>();
    for (const id of ids) {
      const pos = graph.getNodeAttributes(id) as { x?: number; y?: number };
      const x = Number.isFinite(pos.x) ? (pos.x as number) : 0;
      const y = Number.isFinite(pos.y) ? (pos.y as number) : 0;
      mapa.set(id, { x, y });
    }
    return mapa;
  } catch {
    return circular(ids);
  }
}
