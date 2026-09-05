import type { CapaId, VaultGraph, VaultNode, VaultNodeType } from '../vault-core/tipos';
import { construirGrafoRender } from './construir';
import type { FiltroGrafo } from './construir';
import { densidad, grado, modularidad } from './red';

export interface NodoRender {
  id: string;
  slug: string;
  titulo: string;
  tipo: VaultNodeType;
  capa?: CapaId;
  color: string;
  x: number;
  y: number;
  size: number;
  /** Evidencias enlazadas a esta afirmación concreta. */
  evidencias: number;
  /** Prioriza afirmaciones muy conectadas que siguen sin evidencia. */
  cuello: number;
  motivoCuello?: string;
}

export interface AristaRender {
  origen: string;
  destino: string;
  tipo?: string;
  etiqueta?: string;
}

export interface GrafoRender {
  nodos: NodoRender[];
  aristas: AristaRender[];
}

/** Recorre aristas (ambas direcciones) hasta la profundidad dada. */
export function vecinosDe(id: string, g: VaultGraph, profundidad = 1): VaultNode[] {
  if (!g.nodos.has(id) || profundidad < 1) return [];
  const visitados = new Set<string>([id]);
  let frontera = [id];
  for (let d = 0; d < profundidad; d++) {
    const siguiente: string[] = [];
    for (const actual of frontera) {
      for (const a of g.aristas) {
        const otro = a.origen === actual ? a.destino : a.destino === actual ? a.origen : null;
        if (otro && !visitados.has(otro) && g.nodos.has(otro)) {
          visitados.add(otro);
          siguiente.push(otro);
        }
      }
    }
    frontera = siguiente;
    if (frontera.length === 0) break;
  }
  visitados.delete(id);
  return [...visitados]
    .map((vid) => g.nodos.get(vid) as VaultNode)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
}

export { construirGrafoRender, densidad, grado, modularidad };
export type { FiltroGrafo };
