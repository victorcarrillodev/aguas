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
  const resueltos = [...new Set(seleccion)].filter((id) => red.porArbol.has(id)).sort(ordenArbol);
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
    return 'Selecciona causas para explorar los supuestos registrados en el diagnóstico.';
  }
  if (sostenibles.length === 0) {
    const faltantes = new Set<ArbolId>();
    for (const f of fragiles) for (const x of f.falta) faltantes.add(x);
    const lista = [...faltantes].sort(ordenArbol).join(', ');
    return `Las ${resueltos.length} causas seleccionadas tienen supuestos fuera de la selección: ${lista}. Revisa la evidencia de estas relaciones.`;
  }
  if (sostenibles.length === red.arboles.length) {
    return 'La selección incluye todos los supuestos registrados. Esto no demuestra efectividad ni sostenibilidad y no establece un orden de intervención.';
  }
  if (fragiles.length === 0) {
    return `Las ${sostenibles.length} causas incluyen sus supuestos registrados. Su efectividad requiere contrastarse con evidencia.`;
  }
  return `${sostenibles.length} de ${resueltos.length} causas incluyen sus supuestos; ${fragiles.length} dejan condiciones fuera de la selección. No es una predicción de resultados.`;
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
