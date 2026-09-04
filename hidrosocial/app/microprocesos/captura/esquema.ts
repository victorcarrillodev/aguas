import { ARBOLES, CAPAS, LENTES, TIPOS_EVIDENCIA } from '~/lib/taxonomia';
import type { ArbolId, CapaId } from '~/microprocesos/vault-core/tipos';

export interface Borrador {
  titulo: string; // requerido, no vacío
  enunciado: string; // requerido, una frase
  observacion: string; // requerido
  arbol: ArbolId;
  fichaId?: string; // relPath de ficha observada
  medicionId?: string; // relPath de medición que ayuda a capturar
  capa: CapaId;
  lente: string; // primera lente (compat); ver `lentes`
  /** Lentes seleccionadas (multi-select v2); `lente` es `lentes[0]`. */
  lentes: string[]; // AMB|BIO|ECO|SOC|TER|INS|POL
  tipoEvidencia: string; // entrevista|observacion|medicion|documento|fotografia
  fuente: string; // requerido (informante)
  fecha: string; // ISO yyyy-mm-dd
  municipio?: string;
}

function campo(fd: FormData, nombre: string): string {
  return (fd.get(nombre)?.toString() ?? '').trim();
}

/** Normaliza fecha `aaaa-mm-dd` o `datetime-local` a `aaaa-mm-dd`. */
function normalizarFecha(raw: string): string {
  const m = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

/** Valida el FormData del cuestionario; lanza Error legible si algo falta. */
export function validarBorrador(fd: FormData): Borrador {
  const titulo = campo(fd, 'titulo');
  const enunciado = campo(fd, 'enunciado');
  const observacion = campo(fd, 'observacion');
  const arbol = campo(fd, 'arbol').toUpperCase();
  const fichaId = campo(fd, 'fichaId');
  const medicionId = campo(fd, 'medicionId');
  const capa = campo(fd, 'capa').toUpperCase();
  const multi = fd
    .getAll('lentes')
    .map((v) => v.toString().trim().toUpperCase())
    .filter(Boolean);
  const uno = campo(fd, 'lente').toUpperCase();
  const lentes = multi.length > 0 ? multi : uno ? [uno] : [];
  const tipoEvidencia = campo(fd, 'tipoEvidencia').toLowerCase();
  const fuente = campo(fd, 'fuente');
  const fecha = normalizarFecha(campo(fd, 'fecha'));
  const municipio = campo(fd, 'municipio');

  if (!titulo) throw new Error('Falta el título de la evidencia.');
  if (!enunciado) throw new Error('Falta el enunciado (una frase).');
  if (!observacion) throw new Error('Falta la observación de campo.');
  if (!fuente) throw new Error('Falta la fuente.');
  if (!(ARBOLES as readonly string[]).includes(arbol)) {
    throw new Error(`Árbol inválido: usa uno de ${(ARBOLES as readonly string[]).join(', ')}.`);
  }
  if (!(CAPAS.map((c) => c.id) as string[]).includes(capa)) {
    throw new Error('Capa inválida: usa una de C0–C4.');
  }
  if (lentes.length === 0 || !lentes.every((l) => (LENTES as readonly string[]).includes(l))) {
    throw new Error(
      `Lente inválida: usa al menos una de ${(LENTES as readonly string[]).join(', ')}.`,
    );
  }
  if (!(TIPOS_EVIDENCIA as readonly string[]).includes(tipoEvidencia)) {
    throw new Error('Tipo de evidencia inválido.');
  }
  if (!fecha) {
    throw new Error('Fecha inválida: usa el formato aaaa-mm-dd.');
  }

  const b: Borrador = {
    titulo,
    enunciado,
    observacion,
    arbol: arbol as ArbolId,
    capa: capa as CapaId,
    lente: lentes[0],
    lentes,
    tipoEvidencia,
    fuente,
    fecha,
  };
  if (fichaId) b.fichaId = fichaId;
  if (medicionId) b.medicionId = medicionId;
  if (municipio) b.municipio = municipio;
  return b;
}
