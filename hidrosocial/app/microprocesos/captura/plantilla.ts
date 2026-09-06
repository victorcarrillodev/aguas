import { enlaceMarkdown } from '~/lib/rutas';
import type { Borrador } from './esquema';

export interface ContextoPlantilla {
  causa: { relPath: string; titulo: string };
  ficha?: { relPath: string; titulo: string };
  medicion?: { relPath: string; titulo: string };
}

const DIR_EVIDENCIA = '9 · Evidencia de campo';

function ref(titulo: string, relPath: string): string {
  // Corchetes y saltos dentro de la etiqueta romperían el enlace Markdown.
  const etiqueta = titulo.replace(/[\r\n]+/g, ' ').replace(/\[/g, '(').replace(/\]/g, ')');
  if (!relPath) return '**' + etiqueta + '**';
  return enlaceMarkdown(etiqueta, DIR_EVIDENCIA, relPath);
}

/** Nota completa y transportable: todos los escalares se serializan como strings JSON. */
export function renderPlantilla(b: Borrador, ctx: ContextoPlantilla): string {
  const linkCausa = ref(ctx.causa.titulo, ctx.causa.relPath);
  const linkFicha = ctx.ficha ? ref(ctx.ficha.titulo, ctx.ficha.relPath) : null;
  const linkMedicion = ctx.medicion ? ref(ctx.medicion.titulo, ctx.medicion.relPath) : null;
  const linkObjetivo = ref(b.afirmacion || 'Afirmación por elegir', b.nodoId || '');
  const presenta = ['**Evidencia de campo** del árbol ' + linkCausa + '.'];
  if (linkFicha) presenta.push('Ficha relacionada: ' + linkFicha + '.');
  if (linkMedicion) presenta.push('Medición relacionada: ' + linkMedicion + '.');

  const fm = {
    esquema_version: '2',
    titulo: b.titulo,
    enunciado: b.enunciado,
    observacion: b.observacion,
    arbol: b.arbol,
    'tipo-evidencia': b.tipoEvidencia,
    capa: b.capa,
    lente: (b.lentes?.length ? b.lentes : [b.lente]).join(', '),
    mide: ctx.medicion?.titulo ?? '',
    fecha: b.fecha,
    fuente: b.fuente,
    ...(b.municipio ? { municipio: b.municipio } : {}),
    nodo_id: b.nodoId || '',
    texto_original: b.textoOriginal || '',
    afirmacion: b.afirmacion || '',
    relacion: b.relacion || 'no-concluyente',
    referencia: b.referencia || '',
    responsable: b.responsable || '',
    alcance: b.alcance || '',
    metodo: b.metodo || '',
    interpretacion: b.interpretacion || '',
    limitaciones: b.limitaciones || '',
    alternativa: b.alternativa || '',
    ...(b.planId ? { plan_id: b.planId } : {}),
    ...(b.fichaId ? { ficha_id: b.fichaId } : {}),
    ...(b.medicionId ? { medicion_id: b.medicionId } : {}),
    estado_documental: 'pendiente',
  };
  const lineas = [
    '---',
    ...Object.entries(fm).map(([k, v]) => k + ': ' + JSON.stringify(v)),
    '---', '',
    '# ' + b.titulo.replace(/[\r\n]+/g, ' '), '',
    '> ' + b.enunciado.replace(/\r?\n/g, '\n> '), '',
    presenta.join(' '), '',
    '## Afirmación examinada', '',
    linkObjetivo, '',
    '**Enunciado conservado al registrar:** ' + (b.textoOriginal || 'Se incorpora al guardar en el servidor.'), '',
    '**Relación declarada:** ' + (b.relacion || 'no-concluyente') + '. La revisión documental está pendiente.', '',
    '## Observación de campo', '',
    b.observacion, '',
    '## Cómo se obtuvo la información', '',
    b.metodo || 'Por documentar', '',
    '## Interpretación de la observación', '',
    b.interpretacion || 'Por documentar', '',
    '## Alcance', '',
    b.alcance || 'Por documentar', '',
    '## Límites e incertidumbres', '',
    b.limitaciones || 'Por documentar', '',
    '## Explicación alternativa', '',
    b.alternativa || 'No se registró una explicación alternativa.', '',
  ];
  if (b.planId) lineas.push('**Plan de contraste:** ' + ref('Consultar plan', b.planId), '');
  lineas.push(
    '**Responsable:** ' + (b.responsable || 'Por registrar'), '',
    '## Fuentes', '',
    '| Tipo | Referencia | Fecha |',
    '|---|---|---|',
    '| ' + b.tipoEvidencia + ' | ' +
      (b.referencia || b.fuente).replaceAll('|', '/').replace(/[\r\n]/g, ' ') +
      ' | ' + b.fecha + ' |', '',
  );
  return lineas.join('\n');
}
