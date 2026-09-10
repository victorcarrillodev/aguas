import type { VaultGraph } from '../vault-core/tipos';
import { leerNota } from './lector';

/** Incluye las notas completas y todas las revisiones descendientes, sin perder observaciones. */
export async function exportarExpediente(g: VaultGraph, id: string, vaultPath: string): Promise<string> {
  const raiz = g.nodos.get(id);
  if (!raiz) throw new Error('El expediente no está disponible.');
  const hijos = new Map<string, string[]>();
  for (const n of g.nodos.values()) {
    const padre = n.frontmatter.nodo_id;
    if (n.tipo !== 'evidencia' || !padre || !g.nodos.has(padre)) continue;
    hijos.set(padre, [...(hijos.get(padre) || []), n.id]);
    const plan = g.nodos.get(n.frontmatter.plan_id || '');
    if (!n.frontmatter.registro && plan?.frontmatter.registro === 'contraste' &&
      plan.frontmatter.nodo_id === padre)
      hijos.set(plan.id, [...(hijos.get(plan.id) || []), n.id]);
  }
  const ids = [id];
  const vistos = new Set(ids);
  for (let i = 0; i < ids.length; i++) {
    for (const hijo of hijos.get(ids[i]) || []) {
      if (vistos.has(hijo)) continue;
      vistos.add(hijo);
      ids.push(hijo);
    }
  }
  const notas = await Promise.all(ids.map((rel) => leerNota(vaultPath, rel)));
  const cabecera = [
    `# Expediente: ${raiz.titulo}`,
    `Identificador: ${raiz.id}`,
    `Exportado: ${new Date().toISOString()}`,
    'Contiene el texto íntegro de la nota y sus aportaciones, planes y revisiones vinculadas. Las decisiones son declaraciones registradas; su aceptación documental no establece causalidad.',
    'Los identificadores y enlaces relativos remiten a la bóveda de origen. Los archivos o sitios externos citados no se adjuntan en esta descarga.',
  ].join('\n\n');
  return `${cabecera}\n\n${notas.map((nota) => [
    `## Nota: ${nota.nodo.titulo}`,
    `Identificador: ${nota.nodo.id}`,
    '### Metadatos conservados',
    ...Object.entries(nota.frontmatter).filter(([, v]) => v !== undefined)
      .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`),
    '### Contenido íntegro',
    nota.cuerpo,
  ].join('\n\n')).join('\n\n---\n\n')}\n`;
}
