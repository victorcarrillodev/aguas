import type { VaultEdge } from './tipos';

// Canvas de Obsidian: `{ nodes: [{ id, type, file?, x, y, color }],
// edges: [{ id, fromNode, fromSide, toNode, toSide }] }`.
// `file` es ruta relativa a raíz SIN URL-encoding → se usa tal cual.

interface NodoCanvas {
  id?: string;
  type?: string;
  file?: string;
  x?: number;
  y?: number;
  color?: string;
}

interface AristaCanvas {
  id?: string;
  fromNode?: string;
  toNode?: string;
}

export interface ArchivoCanvas {
  relPath: string;
  x: number;
  y: number;
  color?: string;
}

export interface CanvasParseado {
  archivos: ArchivoCanvas[];
  aristas: VaultEdge[];
}

export function parseCanvas(texto: string): CanvasParseado {
  const archivos: ArchivoCanvas[] = [];
  const aristas: VaultEdge[] = [];
  let doc: { nodes?: NodoCanvas[]; edges?: AristaCanvas[] };
  try {
    doc = JSON.parse(texto);
  } catch {
    return { archivos, aristas };
  }
  const porId = new Map<string, string>(); // id de canvas → relPath
  for (const n of doc.nodes ?? []) {
    if (n.type === 'file' && n.id && n.file) {
      const relPath = n.file.replace(/\\/g, '/');
      porId.set(n.id, relPath);
      archivos.push({ relPath, x: n.x ?? 0, y: n.y ?? 0, color: n.color });
    }
  }
  const vistas = new Set<string>();
  for (const e of doc.edges ?? []) {
    const origen = e.fromNode ? porId.get(e.fromNode) : undefined;
    const destino = e.toNode ? porId.get(e.toNode) : undefined;
    // Solo aristas entre dos nodos-archivo (se ignoran los nodos de texto).
    if (!origen || !destino || origen === destino) continue;
    const clave = `${origen}|${destino}|canvas`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    aristas.push({ origen, destino, tipo: 'canvas' });
  }
  return { archivos, aristas };
}
