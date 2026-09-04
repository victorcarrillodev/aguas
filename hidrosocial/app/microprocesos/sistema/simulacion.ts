import type { ArbolId } from '../vault-core/tipos';
import { ordenArbol } from './red';
import type { RedSistema, ResultadoSimulacion } from './tipos';

/**
 * Simula resolver un conjunto de causas.
 *
 * Regla: una causa resuelta solo **se sostiene** si todo aquello de lo que
 * depende (su cierre transitivo de supuestos) también está resuelto. Si no,
 * la corrección se deshará — que es exactamente lo que afirma el diagnóstico.
 */
export function simular(red: RedSistema, seleccion: Iterable<ArbolId>): ResultadoSimulacion {
  const resueltos = [...new Set(seleccion)].sort(ordenArbol);
  const conjunto = new Set(resueltos);

  const sostenibles: ArbolId[] = [];
  const fragiles: { arbol: ArbolId; falta: ArbolId[] }[] = [];

  for (const arbol of resueltos) {
    const info = red.porArbol.get(arbol);
    const falta = (info?.requiere ?? []).filter((r) => !conjunto.has(r));
    if (falta.length === 0) sostenibles.push(arbol);
    else fragiles.push({ arbol, falta });
  }

  const total = red.arboles.length || 1;
  const cobertura = Math.round((sostenibles.length / total) * 100);

  return {
    resueltos,
    sostenibles,
    fragiles,
    cobertura,
    veredicto: veredictoDe(red, resueltos, sostenibles, fragiles),
  };
}

function veredictoDe(
  red: RedSistema,
  resueltos: ArbolId[],
  sostenibles: ArbolId[],
  fragiles: { arbol: ArbolId; falta: ArbolId[] }[],
): string {
  if (resueltos.length === 0) {
    return 'Elige las causas que quieres resolver. El sistema calculará cuáles de esas correcciones se sostienen y cuáles se desharán.';
  }
  if (sostenibles.length === 0) {
    const faltantes = new Set<ArbolId>();
    for (const f of fragiles) for (const x of f.falta) faltantes.add(x);
    const lista = [...faltantes].sort(ordenArbol).join(', ');
    return `Ninguna de las ${resueltos.length} correcciones se sostiene. Todas dependen de algo que sigue sin resolverse: ${lista}.`;
  }
  if (sostenibles.length === red.arboles.length) {
    return 'El sistema completo queda corregido de forma sostenible. Nótese el orden que hizo falta: la raíz primero.';
  }
  if (fragiles.length === 0) {
    return `Las ${sostenibles.length} correcciones se sostienen: cada una tiene resuelto todo aquello de lo que depende.`;
  }
  return `${sostenibles.length} de ${resueltos.length} correcciones se sostienen. Las otras ${fragiles.length} se desharán mientras no se resuelva lo que las condiciona.`;
}

/**
 * Orden mínimo para que una causa se sostenga: su cierre de dependencias
 * ordenado de menos a más profundo, y la causa al final.
 */
export function ordenRecomendado(red: RedSistema, objetivo: ArbolId): ArbolId[] {
  const info = red.porArbol.get(objetivo);
  if (!info) return [];
  const previos = [...info.requiere].sort((a, b) => {
    const pa = red.porArbol.get(a)?.profundidad ?? 0;
    const pb = red.porArbol.get(b)?.profundidad ?? 0;
    return pa - pb || ordenArbol(a, b);
  });
  return [...previos, objetivo];
}
