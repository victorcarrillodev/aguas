import type { VaultGraph, VaultNode } from '../vault-core/tipos';

export const RELACIONES = ['apoya', 'contradice', 'matiza', 'no-concluyente'] as const;
export const ESTADOS_DATO = [
  'pendiente',
  'no-localizado',
  'reservado',
  'inexistencia-documentada',
  'incorporado',
] as const;
export const DECISIONES = ['pendiente', 'aceptada', 'rechazada', 'revisar'] as const;
export const ETIQUETAS_DATO: Record<string, string> = {
  pendiente: 'Búsqueda o captura pendiente',
  'no-localizado': 'No localizado en las fuentes consultadas',
  reservado: 'Reserva documentada',
  'inexistencia-documentada': 'Inexistencia documentada',
  incorporado: 'Dato incorporado; revisar su calidad',
};

export function valor(v: string | undefined): string {
  return !v || ['null', 'undefined', '—'].includes(v.trim()) ? '' : v;
}

export function registrosDe(g: VaultGraph, id: string): VaultNode[] {
  return [...g.nodos.values()]
    .filter((n) => n.tipo === 'evidencia' && n.frontmatter.nodo_id === id)
    .sort(
      (a, b) =>
        (b.frontmatter.creado ?? b.frontmatter.fecha ?? '').localeCompare(
          a.frontmatter.creado ?? a.frontmatter.fecha ?? '',
        ) || b.id.localeCompare(a.id),
    );
}

export function esEvidencia(n: VaultNode): boolean {
  return n.tipo === 'evidencia' && !n.frontmatter.registro;
}

/** Las decisiones son actas registradas, no verificaciones automáticas del Consejo. */
export function estadoRevision(n: VaultNode, registros: VaultNode[]): string {
  const decision = registros.find(
    (r) =>
      r.frontmatter.registro === 'decision' &&
      r.frontmatter.objeto === 'interpretacion' &&
      !valor(r.frontmatter.propuesta_id),
  );
  if (decision) {
    const actual = valor(n.frontmatter.enunciado) || valor(n.frontmatter.afirmacion) || n.resumen;
    if (valor(decision.frontmatter.texto_original) && decision.frontmatter.texto_original !== actual)
      return 'Enunciado modificado; requiere nueva revisión';
    return `${decision.frontmatter.decision} · decisión registrada`;
  }
  if (n.frontmatter.estado === 'en-revision') return 'En revisión';
  return valor(n.frontmatter.estado) || 'Sin validación registrada';
}

export function estadoDato(n: VaultNode, registros: VaultNode[]): string {
  const ultimo = registros.find((r) =>
    ['busqueda', 'indicador'].includes(r.frontmatter.registro ?? ''),
  );
  return (
    ultimo?.frontmatter.estado_dato ??
    (valor(n.frontmatter.linea_base) ? 'incorporado' : 'pendiente')
  );
}

const FILAS: Record<string, string[]> = {
  E1: ['1', '2', '2.1', '3', '4', '5'],
  E2: ['1', '1.1', '2', '3', '4', '5'],
  E3: ['1', '2', '3', '4', '5'],
  E4: ['1', '2', '3', '4', '5'],
  E5: ['1', '2', '3', '3.1', '4', '5'],
  E6: ['1', '1.1', '2', '3', '4', '5'],
  E7: ['1', '1.1', '2', '3', '3.1', '4', '5'],
  E8: ['1', '2', '2.1', '3', '4', '5'],
  E9: ['1', '2', '3', '4', '5'],
  E10: ['1', '2', '3', '4', '5'],
};

/** Correspondencia cotejada; no atribuye al Excel texto posterior. */
export function origenDe(n: VaultNode): string {
  const id = valor(n.frontmatter.id);
  if (n.nivelCausal === 'N1' && id === 'PC') return 'AP_maestro!C12:C13';
  if (n.tipo === 'causa' && n.arbol) return `Nodos!F${Number(n.arbol.slice(1)) + 3}`;
  if (n.tipo === 'ficha' && n.arbol) {
    const fila = FILAS[n.arbol]?.indexOf(id.slice(n.arbol.length + 1)) ?? -1;
    if (fila >= 0) return `AP_${n.arbol}!F${fila + 9}:L${fila + 9}`;
  }
  return '';
}

export function relacionesDe(g: VaultGraph, n: VaultNode) {
  const salida: { id: string; titulo: string; tipo: string; mecanismo: string }[] = [];
  const agregar = (id: string, tipo: string, mecanismo: string) => {
    const otro = [...g.nodos.values()].find((x) => x.frontmatter.id === id);
    if (otro) salida.push({ id: otro.id, titulo: otro.titulo, tipo, mecanismo });
  };
  if (valor(n.frontmatter.padre))
    agregar(
      n.frontmatter.padre ?? '',
      'Causa propuesta → nivel superior',
      valor(n.frontmatter.produce) || 'Mecanismo por documentar',
    );
  for (const id of (n.frontmatter.depende_de ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean))
    agregar(
      id,
      'Supuesto externo declarado',
      'La condición específica se describe en el texto original; pendiente de contrastar.',
    );
  for (const id of (n.frontmatter.bisagra_hacia ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean))
    agregar(id, 'Bisagra', 'Conecta árboles; no determina por sí sola una dirección causal.');
  for (const x of g.nodos.values())
    if (valor(n.frontmatter.id) && x.tipo === 'ficha' && x.frontmatter.padre === n.frontmatter.id)
      salida.push({
        id: x.id,
        titulo: x.titulo,
        tipo: 'Antecedente propuesto',
        mecanismo: valor(x.frontmatter.produce) || 'Mecanismo por documentar',
      });
  return salida;
}

export const MOMENTOS_CONTRASTE = ['antes-de-observar', 'con-datos-conocidos'] as const;
export const TIPOS_VALOR = ['observado', 'estimado'] as const;
export const ETIQUETAS_DOCUMENTALES: Record<string, string> = {
  pendiente: 'Revisión documental pendiente',
  aceptada: 'Respaldo documental aceptado',
  rechazada: 'Respaldo documental rechazado',
  revisar: 'Requiere revisión documental',
};

/** Una revisión documental examina la fuente; no valida por sí sola una explicación causal. */
export function estadoDocumental(g: VaultGraph, evidencia: VaultNode): string {
  if (!esEvidencia(evidencia)) return 'pendiente';
  const decision = registrosDe(g, evidencia.id).find(
    (r) =>
      r.frontmatter.registro === 'decision' &&
      r.frontmatter.objeto === 'documental' &&
      !valor(r.frontmatter.propuesta_id),
  );
  const estado = decision?.frontmatter.decision ?? 'pendiente';
  return (DECISIONES as readonly string[]).includes(estado) ? estado : 'pendiente';
}

/** Utilizable para examinar la afirmación; no equivale a evidencia causal concluyente. */
export function evidenciaUtilizable(g: VaultGraph, evidencia: VaultNode): boolean {
  return esEvidencia(evidencia) && estadoDocumental(g, evidencia) === 'aceptada';
}
