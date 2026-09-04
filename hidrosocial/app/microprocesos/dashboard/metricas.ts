import { construirRed } from '../sistema/index';
import type { ArbolId, CapaId, VaultGraph, VaultNode, VaultNodeType } from '../vault-core/tipos';
import type { EvidenciaReciente, MetricasDashboard } from './index';

/**
 * Peso sistémico de una causa raíz: cuántos otros árboles la declaran como
 * supuesto. Alta si ≥ 3, media si ≥ 1, baja si nadie depende de ella.
 *
 * Antes se calculaba por nº de fichas colgadas, pero las diez causas tienen
 * entre 5 y 7 fichas: la columna salía «media» en todas y no informaba nada.
 * Lo que sí discrimina es de cuántas otras causas se sostiene el sistema.
 */
export function criticidadDe(sostieneA: number): 'alta' | 'media' | 'baja' {
  if (sostieneA >= 3) return 'alta';
  if (sostieneA >= 1) return 'media';
  return 'baja';
}

/** Fecha `aaaa-mm-dd` del frontmatter (`fecha:`) o incrustada en el nombre; `''` si no hay. */
function extraerFecha(n: VaultNode): string {
  const fm = (n.frontmatter.fecha ?? '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(fm)) return fm;
  const m = n.relPath.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

export function calcularMetricas(g: VaultGraph): MetricasDashboard {
  const porTipo = {
    problema: 0,
    causa: 0,
    ficha: 0,
    actor: 0,
    efecto: 0,
    medicion: 0,
    metodo: 0,
    evidencia: 0,
    indice: 0,
  } satisfies Record<VaultNodeType, number>;
  const porCapa: Record<CapaId, number> = { C0: 0, C1: 0, C2: 0, C3: 0, C4: 0 };
  const porArbol: Record<ArbolId, number> = {
    E1: 0,
    E2: 0,
    E3: 0,
    E4: 0,
    E5: 0,
    E6: 0,
    E7: 0,
    E8: 0,
    E9: 0,
    E10: 0,
  };

  for (const n of g.nodos.values()) {
    porTipo[n.tipo] += 1;
    if (n.capa) porCapa[n.capa] += 1;
    if (n.arbol) porArbol[n.arbol] += 1;
  }

  let medicionesSinLineaBase = 0;
  for (const n of g.nodos.values()) {
    if (n.tipo === 'medicion' && n.lineaBaseDisponible === false) {
      medicionesSinLineaBase += 1;
    }
  }

  // Fichas por causa (aristas de jerarquía ficha→causa).
  const fichasPorCausa = new Map<string, number>();
  for (const a of g.aristas) {
    if (a.tipo !== 'jerarquia') continue;
    const origen = g.nodos.get(a.origen);
    const destino = g.nodos.get(a.destino);
    if (origen?.tipo === 'ficha' && destino?.tipo === 'causa') {
      fichasPorCausa.set(a.destino, (fichasPorCausa.get(a.destino) ?? 0) + 1);
    }
  }

  // La red del sistema es la fuente de las relaciones entre árboles.
  const red = construirRed(g);

  const causas = [...g.nodos.values()]
    .filter((n) => n.tipo === 'causa')
    .map((n) => {
      const enRed = red.arboles.find((a) => a.id === n.id);
      return {
        id: n.id,
        titulo: n.titulo,
        capa: (n.capa ?? 'C1') as CapaId,
        atribucion: n.frontmatter.ambito ?? n.frontmatter.atribucion,
        fichas: fichasPorCausa.get(n.id) ?? 0,
        sostieneA: enRed?.sostieneA.length ?? 0,
        dependeDe: enRed?.dependeDe.length ?? 0,
        requiere: enRed?.profundidad ?? 0,
        esRaiz: enRed?.esRaiz ?? false,
      };
    })
    .sort((a, b) => b.sostieneA - a.sostieneA || a.titulo.localeCompare(b.titulo, 'es'));

  const evidencias: EvidenciaReciente[] = [...g.nodos.values()]
    .filter((n) => n.tipo === 'evidencia')
    .map((n) => ({ relPath: n.relPath, titulo: n.titulo, fecha: extraerFecha(n) }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.relPath.localeCompare(a.relPath));

  return {
    totalNotas: g.nodos.size,
    porTipo,
    porCapa,
    porArbol,
    medicionesSinLineaBase,
    mediciones: porTipo.medicion,
    actores: porTipo.actor,
    evidencias,
    causas,
    brechas: { medicionesSinLineaBase, total: porTipo.medicion },
  };
}
