import { ARBOLES, CAPAS, LENTES, TIPOS_EVIDENCIA } from '~/lib/taxonomia';
import type { ArbolId, CapaId } from '~/microprocesos/vault-core/tipos';
import { RELACIONES } from '../revision/index';

export interface Borrador {
  titulo: string;
  enunciado: string;
  observacion: string;
  arbol: ArbolId;
  fichaId?: string;
  medicionId?: string;
  capa: CapaId;
  lente: string;
  lentes: string[];
  tipoEvidencia: string;
  fuente: string;
  fecha: string;
  municipio?: string;
  nodoId?: string;
  afirmacion?: string;
  relacion?: string;
  referencia?: string;
  responsable?: string;
  alcance?: string;
  // Opcionales en el tipo para leer capturas anteriores; obligatorios en nuevos formularios.
  metodo?: string;
  interpretacion?: string;
  limitaciones?: string;
  alternativa?: string;
  planId?: string;
  // El servidor toma esta copia del nodo, nunca del formulario enviado.
  textoOriginal?: string;
}

function campo(fd: FormData, nombre: string, maximo = 12000): string {
  const raw = fd.get(nombre);
  if (raw !== null && typeof raw !== 'string')
    throw new Error('El campo ' + nombre + ' debe contener texto.');
  const valor = (raw ?? '').trim();
  if (valor.length > maximo)
    throw new Error('El campo ' + nombre + ' supera los ' + maximo + ' caracteres.');
  return valor;
}

/** Acepta un día o una fecha y hora local completa; no descarta sufijos inválidos. */
function normalizarFecha(raw: string): string {
  const m = raw.match(
    /^(\d{4}-\d{2}-\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?)?$/,
  );
  return m ? m[1] : '';
}

/** Valida los datos nuevos sin atribuirles una calidad científica por estar completos. */
export function validarBorrador(fd: FormData): Borrador {
  const titulo = campo(fd, 'titulo', 300);
  const enunciado = campo(fd, 'enunciado');
  const observacion = campo(fd, 'observacion');
  const arbol = campo(fd, 'arbol', 10).toUpperCase();
  const fichaId = campo(fd, 'fichaId', 2000);
  const medicionId = campo(fd, 'medicionId', 2000);
  const capa = campo(fd, 'capa', 10).toUpperCase();
  const multi = fd.getAll('lentes').map((v) => {
    if (typeof v !== 'string' || v.length > 10) throw new Error('Lente inválida.');
    return v.trim().toUpperCase();
  }).filter(Boolean);
  const uno = campo(fd, 'lente', 10).toUpperCase();
  const lentes = [...new Set(multi.length > 0 ? multi : uno ? [uno] : [])];
  const tipoEvidencia = campo(fd, 'tipoEvidencia', 40).toLowerCase();
  const fuente = campo(fd, 'fuente', 2000);
  const fecha = normalizarFecha(campo(fd, 'fecha', 30));
  const municipio = campo(fd, 'municipio', 300);
  const relacion = campo(fd, 'relacion', 40) || 'no-concluyente';

  if (!titulo) throw new Error('Falta el título de la evidencia.');
  if (/[\r\n]/.test(titulo)) throw new Error('Escribe el título en una sola línea.');
  if (!enunciado) throw new Error('Falta el enunciado de la observación.');
  if (!observacion) throw new Error('Falta la observación de campo.');
  if (!fuente) throw new Error('Falta la fuente.');
  if (!(ARBOLES as readonly string[]).includes(arbol))
    throw new Error('Árbol inválido: usa uno de ' + ARBOLES.join(', ') + '.');
  if (!(CAPAS.map((c) => c.id) as string[]).includes(capa))
    throw new Error('Capa inválida: usa una de C0–C4.');
  if (lentes.length === 0 || !lentes.every((l) => (LENTES as readonly string[]).includes(l)))
    throw new Error('Elige al menos una dimensión válida: ' + LENTES.join(', ') + '.');
  if (!(TIPOS_EVIDENCIA as readonly string[]).includes(tipoEvidencia))
    throw new Error('Tipo de evidencia inválido.');
  if (!(RELACIONES as readonly string[]).includes(relacion))
    throw new Error('Relación con la afirmación inválida.');
  if (!fecha) throw new Error('Fecha inválida: usa aaaa-mm-dd o una fecha y hora local válidas.');
  const fechaReal = new Date(fecha + 'T12:00:00Z');
  if (!Number.isFinite(fechaReal.getTime()) || fechaReal.toISOString().slice(0, 10) !== fecha)
    throw new Error('La fecha no existe en el calendario.');

  const b: Borrador = {
    titulo, enunciado, observacion,
    arbol: arbol as ArbolId,
    capa: capa as CapaId,
    lente: lentes[0],
    lentes, tipoEvidencia, fuente, fecha,
    nodoId: campo(fd, 'nodoId', 2000),
    afirmacion: campo(fd, 'afirmacion'),
    relacion,
    referencia: campo(fd, 'referencia', 2000),
    responsable: campo(fd, 'responsable', 300),
    alcance: campo(fd, 'alcance'),
    metodo: campo(fd, 'metodo'),
    interpretacion: campo(fd, 'interpretacion'),
    limitaciones: campo(fd, 'limitaciones'),
    alternativa: campo(fd, 'alternativa'),
    planId: campo(fd, 'planId', 2000),
  };
  if (!b.nodoId) throw new Error('Selecciona la afirmación del diagnóstico que vas a examinar.');
  const requeridos: [keyof Borrador, string][] = [
    ['afirmacion', 'el aspecto específico de la afirmación que se examina'],
    ['referencia', 'la referencia de la evidencia'],
    ['responsable', 'la persona responsable'],
    ['alcance', 'el alcance: territorio, población, periodo y condiciones'],
    ['metodo', 'cómo se obtuvo la información'],
    ['interpretacion', 'el razonamiento que conecta la observación con la afirmación'],
    ['limitaciones', 'los límites o incertidumbres del registro'],
  ];
  for (const [clave, etiqueta] of requeridos)
    if (!b[clave]) throw new Error('Completa ' + etiqueta + '.');
  if (fichaId) b.fichaId = fichaId;
  if (medicionId) b.medicionId = medicionId;
  if (municipio) b.municipio = municipio;
  return b;
}
