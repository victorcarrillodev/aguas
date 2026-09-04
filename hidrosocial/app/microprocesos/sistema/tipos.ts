import type { ArbolId, CapaId } from '../vault-core/tipos';

/** Cómo se relaciona un árbol con otro. */
export type TipoRelacion = 'dependencia' | 'contacto';

export interface RelacionSistema {
  /** Árbol que declara la relación. */
  de: ArbolId;
  /** Árbol al que apunta. */
  a: ArbolId;
  tipo: TipoRelacion;
}

/** Una de las diez causas estructurales, vista como pieza del sistema. */
export interface ArbolSistema {
  arbol: ArbolId;
  /** relPath de la nota de la causa (para enlazar). */
  id: string;
  slug: string;
  titulo: string;
  resumen: string;
  enunciado: string;
  capa: CapaId;
  ambito: string;
  naturaleza: string;
  brecha: string;
  genera: string[];
  debeResolver: string[];
  /** Supuestos que este árbol declara: no funciona si esos no funcionan. */
  dependeDe: ArbolId[];
  /** Árboles que lo declaran a él como supuesto. */
  sostieneA: ArbolId[];
  /** Bisagras: puntos de contacto sin dirección de dependencia. */
  contacto: ArbolId[];
  /** Nº de fichas colgadas del árbol. */
  fichas: number;
  /** Relaciones entrantes (dependencia + contacto). */
  entra: number;
  /** Relaciones salientes (dependencia + contacto). */
  sale: number;
  /** entra − sale. Positivo = el resto del sistema se apoya en él. */
  saldo: number;
  /** Cierre transitivo de `dependeDe`: todo lo que hay que resolver antes. */
  requiere: ArbolId[];
  /** Tamaño de `requiere`. 0 = no depende de nadie. */
  profundidad: number;
  /** Altura en la jerarquía: 0 = raíz; n = camino de dependencias más largo hasta una raíz. */
  nivel: number;
  /** No depende de nadie y otros dependen de él. */
  esRaiz: boolean;
}

export interface RedSistema {
  arboles: ArbolSistema[];
  porArbol: Map<ArbolId, ArbolSistema>;
  relaciones: RelacionSistema[];
  /** Árboles sin dependencias de los que otros sí dependen. */
  raices: ArbolId[];
  totalRelaciones: number;
  totalDependencias: number;
  totalContactos: number;
}

export interface ResultadoSimulacion {
  /** Marcados como resueltos por quien simula. */
  resueltos: ArbolId[];
  /** Resueltos cuyo cierre de dependencias también está resuelto. */
  sostenibles: ArbolId[];
  /**
   * Resueltos que se desharán: les falta resolver algo de lo que dependen.
   * Incluye qué les falta.
   */
  fragiles: { arbol: ArbolId; falta: ArbolId[] }[];
  /** sostenibles / 10, en porcentaje entero. */
  cobertura: number;
  /** Lectura en lenguaje llano del estado actual de la simulación. */
  veredicto: string;
}

export interface IncidenciaActor {
  codigo: string;
  nombre: string;
  grupo: string;
  curva: string;
  /** Causas que este actor genera. */
  genera: ArbolId[];
  /** Causas que debería resolver. */
  debeResolver: ArbolId[];
  /** genera.length − debeResolver.length. */
  delta: number;
  lectura: string;
}
