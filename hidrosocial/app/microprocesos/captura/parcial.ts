import type { Borrador } from './esquema';
import type { ContextoPlantilla } from './plantilla';

/**
 * Borrador parcial del formulario (todo opcional) para el preview en vivo
 * del cliente. Puro: NO importa `node:fs` (solo tipos).
 */
export interface BorradorParcial {
  titulo?: string;
  observacion?: string;
  arbol?: string;
  fichaId?: string;
  medicionId?: string;
  capa?: string;
  lentes?: string[];
  tipoEvidencia?: string;
  fuente?: string;
  fecha?: string;
  municipio?: string;
}

export interface OpcionContexto {
  valor: string;
  etiqueta: string;
}

/** Campos requeridos del anillo de completitud (título, hallazgo, árbol, tipo, fecha, informante). */
const REQUERIDOS: (keyof BorradorParcial)[] = [
  'titulo',
  'observacion',
  'arbol',
  'tipoEvidencia',
  'fecha',
  'fuente',
];

function hoy(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const dia = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

/** Primera frase de la observación como enunciado provisional. */
function enunciadoDe(observacion: string): string {
  const una = observacion.split(/(?<=[.!?])\s+/)[0]?.trim() ?? '';
  return una || observacion.trim().slice(0, 120) || '…';
}

/**
 * Convierte el parcial en Borrador válido con valores provisionales
 * (sin lanzar) + % de campos requeridos completos (0–100).
 */
export function validarBorradorParcial(p: BorradorParcial): {
  borrador: Borrador;
  completitud: number;
} {
  const completos = REQUERIDOS.filter((k) => (p[k] ?? '').toString().trim() !== '').length;
  const observacion = p.observacion?.trim() ?? '';
  const borrador: Borrador = {
    titulo: p.titulo?.trim() || 'Sin título',
    enunciado: enunciadoDe(observacion),
    observacion: observacion || '…',
    arbol: /^E(1[0-9]|[1-9])$/.test((p.arbol ?? '').toUpperCase())
      ? (p.arbol as Borrador['arbol'])
      : 'E1',
    capa: /^C[0-4]$/.test((p.capa ?? '').toUpperCase()) ? (p.capa as Borrador['capa']) : 'C0',
    lente: p.lentes?.[0] ?? 'AMB',
    lentes: p.lentes?.length ? p.lentes : ['AMB'],
    tipoEvidencia: p.tipoEvidencia?.trim().toLowerCase() || 'observacion',
    fuente: p.fuente?.trim() || '…',
    fecha: p.fecha?.slice(0, 10) || hoy(),
  };
  if (p.fichaId) borrador.fichaId = p.fichaId;
  if (p.medicionId) borrador.medicionId = p.medicionId;
  if (p.municipio?.trim()) borrador.municipio = p.municipio.trim();
  return { borrador, completitud: Math.round((completos / REQUERIDOS.length) * 100) };
}

/**
 * Contexto de plantilla desde las listas del loader (sin grafo):
 * causa por árbol, ficha/medición por relPath.
 */
export function contextoPreview(
  p: BorradorParcial,
  arboles: OpcionContexto[],
  fichas: OpcionContexto[],
  mediciones: OpcionContexto[],
): ContextoPlantilla {
  const arbol = arboles.find((a) => a.valor === (p.arbol ?? 'E1').toUpperCase());
  const ficha = fichas.find((f) => f.valor === p.fichaId);
  const medicion = mediciones.find((m) => m.valor === p.medicionId);
  return {
    causa: { relPath: '', titulo: arbol?.etiqueta ?? (p.arbol || 'E1') },
    ...(ficha ? { ficha: { relPath: '', titulo: ficha.etiqueta } } : {}),
    ...(medicion ? { medicion: { relPath: '', titulo: medicion.etiqueta } } : {}),
  };
}
