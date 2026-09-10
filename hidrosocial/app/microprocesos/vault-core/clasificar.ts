import { capaDeArbol } from '~/lib/taxonomia';
import type { ArbolId, CapaId, NivelCausal, VaultNodeType } from './tipos';

const ARBOLES_VALIDOS = new Set(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10']);

/** Nombres (sin extensión) que son índices, no contenido. */
const INDICES = new Set([
  'Índice de fichas',
  'Los efectos',
  'Las mediciones',
  'Los actores',
  'Mapa general',
  'Inicio',
  'README',
]);

const CAPA_POR_NOMBRE: Record<string, CapaId> = {
  macroprocesos: 'C1',
  factores: 'C3',
  actores: 'C2',
  'ciclo hidrosocial': 'C0',
  dimensiones: 'C4',
  c0: 'C0',
  c1: 'C1',
  c2: 'C2',
  c3: 'C3',
  c4: 'C4',
};

/**
 * Carpeta → tipo. Devuelve `null` cuando la nota debe ignorarse
 * (`_Trabajo interno/` o carpetas desconocidas).
 */
export function tipoDeNota(
  relPath: string,
  _frontmatter: Record<string, string | undefined>,
): VaultNodeType | null {
  if (relPath.startsWith('_Trabajo interno/')) return null;
  const base = relPath.split('/').pop() ?? '';
  const nombre = base.replace(/\.md$/, '');
  if (INDICES.has(nombre)) return 'indice';
  if (relPath.startsWith('1 · El problema/')) return 'problema';
  if (relPath.startsWith('2 · Las causas/')) return 'causa';
  if (relPath.startsWith('3 · Las fichas/')) return 'ficha';
  if (relPath.startsWith('4 · Los actores/')) return 'actor';
  if (relPath.startsWith('5 · Los efectos/')) return 'efecto';
  if (relPath.startsWith('6 · Las mediciones/')) return 'medicion';
  if (relPath.startsWith('7 · El método/')) return 'metodo';
  if (relPath.startsWith('9 · Evidencia de campo/')) return 'evidencia';
  if (relPath.startsWith('8 · Mapas/')) return 'indice';
  return null;
}

/** `arbol` del frontmatter o del nombre de archivo (`E1 · ...`, `E1.1`). */
export function arbolDeNota(
  relPath: string,
  frontmatter: Record<string, string | undefined>,
): ArbolId | undefined {
  const fm = (frontmatter.arbol ?? '').trim().toUpperCase();
  if (ARBOLES_VALIDOS.has(fm)) return fm as ArbolId;
  const base = relPath.split('/').pop() ?? '';
  const m = base.match(/^(E\d{1,2})\b/);
  if (m && ARBOLES_VALIDOS.has(m[1])) return m[1] as ArbolId;
  return undefined;
}

/**
 * Capa del nodo: frontmatter (`Macroprocesos`→C1, `Factores`→C3,
 * `Actores`→C2, o C0–C4 directo); si no, herencia del árbol para
 * causas/fichas; actores→C2. Una nota del problema no recibe una capa por su profundidad.
 */
export function capaDeNodo(
  tipo: VaultNodeType,
  frontmatter: Record<string, string | undefined>,
  arbol?: ArbolId,
): CapaId | undefined {
  const cruda = (frontmatter.capa ?? '').trim().toLowerCase();
  if (cruda && CAPA_POR_NOMBRE[cruda]) return CAPA_POR_NOMBRE[cruda];
  if (arbol && (tipo === 'causa' || tipo === 'ficha')) return capaDeArbol(arbol);
  if (tipo === 'actor') return 'C2';
  return undefined;
}

/** Solo los códigos y papeles causales del modelo reciben un nivel N. */
export function nivelCausalDe(tipo: VaultNodeType, codigo: string | undefined): NivelCausal | undefined {
  if (tipo === 'problema' && codigo === 'PC') return 'N1';
  if (tipo === 'causa' && /^E(?:10|[1-9])$/.test(codigo ?? '')) return 'N2';
  if (tipo !== 'ficha') return undefined;
  if (/^E(?:10|[1-9])\.[1-9]\d*$/.test(codigo ?? '')) return 'N3';
  if (/^E(?:10|[1-9])\.[1-9]\d*\.[1-9]\d*$/.test(codigo ?? '')) return 'N4';
  return undefined;
}
