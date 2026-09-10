import type { ArbolId, CapaId, NivelCausal, VaultNodeType } from '../vault-core/tipos';
import { calcularMetricas, criticidadDe } from './metricas';

export interface EvidenciaReciente {
  relPath: string;
  titulo: string;
  /** `aaaa-mm-dd` del frontmatter o del nombre; `''` si no hay. */
  fecha: string;
}

export interface MetricasDashboard {
  totalNotas: number;
  porNivel: Record<NivelCausal, number>;
  nodosIntegrados: number;
  porTipo: Record<VaultNodeType, number>;
  porCapa: Record<CapaId, number>;
  porArbol: Record<ArbolId, number>;
  /** Mediciones con `## Línea base` = "No disponible". */
  medicionesSinLineaBase: number;
  mediciones: number;
  actores: number;
  /** Evidencias recientes, orden descendente por fecha. */
  evidencias: EvidenciaReciente[];
  causas: {
    id: string;
    titulo: string;
    capa: CapaId;
    atribucion?: string;
    fichas: number;
    directas: number;
    subyacentes: number;
    directasSinDesglose: number;
    /** Nº de árboles que declaran a éste como supuesto. */
    sostieneA: number;
    /** Nº de supuestos propios. */
    dependeDe: number;
    /** Cierre transitivo: causas a resolver antes de que ésta se sostenga. */
    requiere: number;
    /** No depende de nadie y otros dependen de ella. */
    esRaiz: boolean;
  }[];
  brechas: { medicionesSinLineaBase: number; total: number };
}

export { calcularMetricas, criticidadDe };
