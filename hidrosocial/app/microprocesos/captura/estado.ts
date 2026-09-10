export interface EstadoForm {
  titulo: string;
  observacion: string;
  arbol: string;
  fichaId: string;
  medicionId: string;
  capa: string;
  lentes: string[];
  tipoEvidencia: string;
  fuente: string;
  fecha: string;
  municipio: string;
  nodoId: string;
  afirmacion: string;
  relacion: string;
  referencia: string;
  responsable: string;
  alcance: string;
  metodo: string;
  interpretacion: string;
  limitaciones: string;
  alternativa: string;
  planId: string;
  textoOriginal: string;
}

export const VACIO: EstadoForm = {
  titulo: '',
  observacion: '',
  arbol: '',
  fichaId: '',
  medicionId: '',
  capa: '',
  lentes: [],
  tipoEvidencia: 'observacion',
  fuente: '',
  fecha: '',
  municipio: '',
  nodoId: '',
  afirmacion: '',
  relacion: 'no-concluyente',
  referencia: '',
  responsable: '',
  alcance: '',
  metodo: '',
  interpretacion: '',
  limitaciones: '',
  alternativa: '',
  planId: '',
  textoOriginal: '',
};

/** Recupera únicamente campos conocidos de un borrador guardado en PostgreSQL. */
export function normalizarEstado(datos: unknown): EstadoForm {
  const salida: EstadoForm = { ...VACIO, lentes: [] };
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return salida;
  const entrada = datos as Record<string, unknown>;
  for (const clave of Object.keys(VACIO) as (keyof EstadoForm)[]) {
    if (clave === 'lentes') {
      salida.lentes = Array.isArray(entrada.lentes)
        ? [...new Set(entrada.lentes.filter((v): v is string => typeof v === 'string'))].slice(0, 7)
        : [];
    } else if (typeof entrada[clave] === 'string') {
      salida[clave] = (entrada[clave] as string).slice(0, 12000);
    }
  }
  return salida;
}
