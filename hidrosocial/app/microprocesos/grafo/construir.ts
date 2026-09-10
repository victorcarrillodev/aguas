import { estadoDato, estadoDocumental, registrosDe } from '../revision/index';
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
  const evidenciaPorNodo = new Map<string, number>();
  const aceptadasPorNodo = new Map<string, number>();
  const documentales = new Map<string, string>();
  // La clasificación documental depende del expediente completo, no del filtro visual.
  for (const n of g.nodos.values()) {
    if (n.tipo !== 'evidencia' || n.frontmatter.registro) continue;
    const estado = estadoDocumental(g, n);
    documentales.set(n.id, estado);
    const objetivo = n.frontmatter.nodo_id;
    if (!objetivo || !g.nodos.has(objetivo)) continue;
    evidenciaPorNodo.set(objetivo, (evidenciaPorNodo.get(objetivo) || 0) + 1);
    if (estado === 'aceptada')
      aceptadasPorNodo.set(objetivo, (aceptadasPorNodo.get(objetivo) || 0) + 1);
  }
  const gradoExplicativo = new Map<string, number>();
  const relacionesExplicativas = new Set<string>();
  for (const a of g.aristas) {
    if (!g.nodos.has(a.origen) || !g.nodos.has(a.destino) || a.origen === a.destino ||
      !['causa-propuesta', 'supuesto', 'bisagra'].includes(a.tipo)) continue;
    const clave = `${a.origen}|${a.destino}|${a.tipo}`;
    if (relacionesExplicativas.has(clave)) continue;
    relacionesExplicativas.add(clave);
    gradoExplicativo.set(a.origen, (gradoExplicativo.get(a.origen) || 0) + 1);
    gradoExplicativo.set(a.destino, (gradoExplicativo.get(a.destino) || 0) + 1);
  }
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
    const evidencias = evidenciaPorNodo.get(n.id) ?? 0;
    const aceptadas = aceptadasPorNodo.get(n.id) ?? 0;
    const explicativas = gradoExplicativo.get(n.id) ?? 0;
    const requiereEvidencia = ['causa', 'ficha', 'medicion', 'problema'].includes(n.tipo);
    const datoPendiente = n.tipo === 'medicion' && estadoDato(n, registrosDe(g, n.id)) !== 'incorporado';
    const cuello = requiereEvidencia && aceptadas === 0 ? explicativas + (datoPendiente ? 2 : 1) : 0;
    return {
      id: n.id,
      slug: encodeNodo(n.id),
      titulo: n.titulo,
      tipo: n.tipo,
      codigo: n.codigo,
      nivelCausal: n.nivelCausal,
      arbol: n.arbol,
      capa: n.capa,
      color: colorDeNodo(n.tipo, n.capa),
      x: p.x,
      y: p.y,
      size: 4 + 2 * Math.log(1 + (grado.get(n.id) ?? 0)),
      evidencias,
      evidenciasAceptadas: aceptadas,
      documental: documentales.get(n.id),
      registro: n.frontmatter.registro,
      cuello,
      motivoCuello: cuello
        ? datoPendiente
          ? 'Indicador sin línea base incorporada y conectado a la explicación.'
          : evidencias > 0
            ? 'Tiene aportaciones vinculadas, pero ninguna con revisión documental aceptada.'
            : 'Afirmación conectada al razonamiento sin evidencia específica vinculada.'
        : undefined,
    };
  });
  return { nodos: salida, aristas, incidenciasModelo: g.incidenciasModelo };
}
