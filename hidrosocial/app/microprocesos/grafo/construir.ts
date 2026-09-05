import { colorDeNodo } from '~/lib/colores';
import { encodeNodo } from '~/lib/rutas';
import type { CapaId, VaultGraph, VaultNodeType } from '../vault-core/tipos';
import type { AristaRender, GrafoRender, NodoRender } from './index';
import { calcularLayout } from './layout';

export interface FiltroGrafo {
  tipo?: VaultNodeType;
  capa?: CapaId;
}

const EXCLUIDOS_POR_DEFECTO: VaultNodeType[] = ['indice', 'metodo'];

/** VaultGraph → nodos/aristas serializables con color, tamaño por grado y layout. */
export function construirGrafoRender(g: VaultGraph, filtro?: FiltroGrafo): GrafoRender {
  const nodos = [...g.nodos.values()].filter((n) => {
    if (!filtro?.tipo && !filtro?.capa && EXCLUIDOS_POR_DEFECTO.includes(n.tipo)) return false;
    if (filtro?.tipo && n.tipo !== filtro.tipo) return false;
    if (filtro?.capa && n.capa !== filtro.capa) return false;
    return true;
  });
  const dentro = new Set(nodos.map((n) => n.id));

  const grado = new Map<string, number>();
  const aristas: AristaRender[] = [];
  const vistas = new Set<string>();
  for (const a of g.aristas) {
    if (!dentro.has(a.origen) || !dentro.has(a.destino)) continue;
    const clave = `${a.origen}|${a.destino}|${a.tipo}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    aristas.push({ origen: a.origen, destino: a.destino, tipo: a.tipo, etiqueta: a.etiqueta });
    grado.set(a.origen, (grado.get(a.origen) ?? 0) + 1);
    grado.set(a.destino, (grado.get(a.destino) ?? 0) + 1);
  }

  const posiciones = calcularLayout(
    nodos.map((n) => n.id),
    aristas,
  );
  const salida: NodoRender[] = nodos.map((n) => {
    const p = posiciones.get(n.id) ?? { x: 0, y: 0 };
    return {
      id: n.id,
      slug: encodeNodo(n.id),
      titulo: n.titulo,
      tipo: n.tipo,
      capa: n.capa,
      color: colorDeNodo(n.tipo, n.capa),
      x: p.x,
      y: p.y,
      size: 4 + 2 * Math.log(1 + (grado.get(n.id) ?? 0)),
    };
  });
  return { nodos: salida, aristas };
}
