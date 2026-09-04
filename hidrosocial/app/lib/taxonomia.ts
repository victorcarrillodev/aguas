import type { ArbolId, CapaId } from '~/microprocesos/vault-core/tipos';

export interface InfoCapa {
  id: CapaId;
  etiqueta: string;
}

export const CAPAS: InfoCapa[] = [
  { id: 'C0', etiqueta: 'Ciclo hidrosocial' },
  { id: 'C1', etiqueta: 'Macroprocesos' },
  { id: 'C2', etiqueta: 'Actores' },
  { id: 'C3', etiqueta: 'Factores' },
  { id: 'C4', etiqueta: 'Dimensiones' },
];

/** Lentes de la dimensión C4. El cuestionario mapea D1–D7 → estas lentes. */
export const LENTES = ['AMB', 'BIO', 'ECO', 'SOC', 'TER', 'INS', 'POL'] as const;
export type Lente = (typeof LENTES)[number];

export const ARBOLES: ArbolId[] = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10'];

export const TIPOS_EVIDENCIA = [
  'entrevista',
  'observacion',
  'medicion',
  'documento',
  'fotografia',
] as const;
export type TipoEvidencia = (typeof TIPOS_EVIDENCIA)[number];

export const MACROPROCESOS = [
  'ABAS',
  'DIST',
  'FACT',
  'COML',
  'RECO',
  'SANE',
  'REUS',
  'PROY',
  'TARI',
  'APOY',
] as const;

export const FUERZAS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'] as const;

/** Capa heredada por árbol (E1–E5→C1, E9→C2, E6/E7/E8/E10→C3). */
export function capaDeArbol(arbol: ArbolId): CapaId {
  if (arbol === 'E9') return 'C2';
  if (['E1', 'E2', 'E3', 'E4', 'E5'].includes(arbol)) return 'C1';
  return 'C3';
}

/** El cuestionario adapta ciclos 1–5 → capas C0–C4. */
export function capaDeCiclo(ciclo: number): CapaId {
  const ids: CapaId[] = ['C0', 'C1', 'C2', 'C3', 'C4'];
  return ids[ciclo - 1] ?? 'C0';
}
