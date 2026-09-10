import type { Borrador } from './esquema';
import type { ContextoPlantilla } from './plantilla';

/** Datos todavía incompletos del formulario; puro y utilizable en el cliente. */
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
  nodoId?: string;
  afirmacion?: string;
  relacion?: string;
  referencia?: string;
  responsable?: string;
  alcance?: string;
  metodo?: string;
  interpretacion?: string;
  limitaciones?: string;
  alternativa?: string;
  planId?: string;
  textoOriginal?: string;
}

export interface OpcionContexto {
  valor: string;
  etiqueta: string;
  relPath?: string;
}

/** Mide campos completos, no fuerza de evidencia ni validez de conclusiones. */
const REQUERIDOS: (keyof BorradorParcial)[] = [
  'titulo', 'observacion', 'arbol', 'nodoId', 'capa', 'tipoEvidencia',
  'fecha', 'fuente', 'afirmacion', 'referencia', 'responsable',
  'lentes', 'alcance', 'metodo', 'interpretacion', 'limitaciones',
];

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function enunciadoDe(observacion: string): string {
  const una = observacion.split(/(?<=[.!?])\s+/)[0]?.trim() ?? '';
  return una || observacion.trim().slice(0, 120) || '…';
}

/** Los valores provisionales solo sirven para visualizar; no validan ni guardan una captura. */
export function validarBorradorParcial(p: BorradorParcial): {
  borrador: Borrador;
  completitud: number;
} {
  const completos = REQUERIDOS.filter((k) => (p[k] ?? '').toString().trim() !== '').length;
  const observacion = p.observacion?.trim() ?? '';
  const lentes = [...new Set((p.lentes ?? []).map((l) => l.trim().toUpperCase()).filter(Boolean))];
  const borrador: Borrador = {
    titulo: p.titulo?.trim() || 'Sin título',
    enunciado: enunciadoDe(observacion),
    observacion: observacion || '…',
    arbol: /^E(10|[1-9])$/.test((p.arbol ?? '').toUpperCase())
      ? (p.arbol?.toUpperCase() as Borrador['arbol']) : 'E1',
    capa: /^C[0-4]$/.test((p.capa ?? '').toUpperCase())
      ? (p.capa?.toUpperCase() as Borrador['capa']) : 'C0',
    lente: lentes[0] ?? 'AMB',
    lentes: lentes.length ? lentes : ['AMB'],
    tipoEvidencia: p.tipoEvidencia?.trim().toLowerCase() || 'observacion',
    fuente: p.fuente?.trim() || '…',
    fecha: p.fecha?.slice(0, 10) || hoy(),
    nodoId: p.nodoId,
    afirmacion: p.afirmacion,
    relacion: p.relacion || 'no-concluyente',
    referencia: p.referencia,
    responsable: p.responsable,
    alcance: p.alcance,
    metodo: p.metodo,
    interpretacion: p.interpretacion,
    limitaciones: p.limitaciones,
    alternativa: p.alternativa,
    planId: p.planId,
    textoOriginal: p.textoOriginal,
  };
  if (p.fichaId) borrador.fichaId = p.fichaId;
  if (p.medicionId) borrador.medicionId = p.medicionId;
  if (p.municipio?.trim()) borrador.municipio = p.municipio.trim();
  return { borrador, completitud: Math.round((completos / REQUERIDOS.length) * 100) };
}

/** Preserva rutas reales del loader en los archivos que descargan los investigadores. */
export function contextoPreview(
  p: BorradorParcial,
  arboles: OpcionContexto[],
  fichas: OpcionContexto[],
  mediciones: OpcionContexto[],
): ContextoPlantilla {
  const arbol = arboles.find((a) => a.valor === (p.arbol ?? '').toUpperCase());
  const ficha = fichas.find((f) => f.valor === p.fichaId);
  const medicion = mediciones.find((m) => m.valor === p.medicionId);
  return {
    causa: {
      relPath: arbol?.relPath ?? '',
      titulo: arbol?.etiqueta ?? 'Árbol por elegir',
    },
    ...(ficha ? { ficha: { relPath: ficha.relPath || ficha.valor, titulo: ficha.etiqueta } } : {}),
    ...(medicion ? {
      medicion: { relPath: medicion.relPath || medicion.valor, titulo: medicion.etiqueta },
    } : {}),
  };
}
