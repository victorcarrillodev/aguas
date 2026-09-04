import { enlaceMarkdown } from '~/lib/rutas';
import type { Borrador } from './esquema';

export interface ContextoPlantilla {
  causa: { relPath: string; titulo: string };
  ficha?: { relPath: string; titulo: string };
  medicion?: { relPath: string; titulo: string };
}

const DIR_EVIDENCIA = '9 · Evidencia de campo';

/** Enlace real si hay relPath; negrita provisional para el preview en vivo. */
function ref(titulo: string, relPath: string): string {
  if (!relPath) return `**${titulo}**`;
  return enlaceMarkdown(titulo, DIR_EVIDENCIA, relPath);
}

/**
 * Nota de captura literal (§5): frontmatter + markdown links URL-encoded
 * generados desde el árbol, la ficha y la medición elegidas.
 * Pura: NO importa `node:fs` (apta para el preview en vivo del cliente).
 */
export function renderPlantilla(b: Borrador, ctx: ContextoPlantilla): string {
  const lentes = (b.lentes?.length ? b.lentes : [b.lente]).join(', ');
  const linkCausa = ref(ctx.causa.titulo, ctx.causa.relPath);
  const linkFicha = ctx.ficha ? ref(ctx.ficha.titulo, ctx.ficha.relPath) : null;
  const linkMedicion = ctx.medicion ? ref(ctx.medicion.titulo, ctx.medicion.relPath) : null;

  const presenta: string[] = [`**Evidencia de campo** del árbol ${linkCausa}.`];
  if (linkFicha) presenta.push(`Observa a ${linkFicha}.`);
  if (linkMedicion) presenta.push(`Ayuda a capturar ${linkMedicion}.`);

  const haciaAbajo = linkMedicion
    ? `\n\n**Hacia abajo** — alimenta la captura de ${linkMedicion}.`
    : '';

  const municipio = b.municipio ? `\nmunicipio: ${b.municipio}` : '';

  return `---
titulo: ${b.titulo}
arbol: ${b.arbol}
tipo-evidencia: ${b.tipoEvidencia}
capa: ${b.capa}
lente: ${lentes}
mide: ${ctx.medicion?.titulo ?? ''}
fecha: ${b.fecha}
fuente: ${b.fuente}${municipio}
---

# ${b.titulo}

> ${b.enunciado}

${presenta.join(' ')}

## Observación de campo

${b.observacion}

## La cadena

**Hacia arriba** — apoya a ${linkCausa}.${haciaAbajo}

## Fuentes

| Tipo | Referencia | Fecha |
|---|---|---|
| ${b.tipoEvidencia} | ${b.fuente} | ${b.fecha} |
`;
}
