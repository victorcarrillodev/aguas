import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getVaultGraph, getVaultPath, invalidar } from '../cache/index';
import { DECISIONES, ESTADOS_DATO } from '../revision/index';

/** Registro inmutable: solo escribe evidencia, nunca sustituye la fuente. */
export async function guardarRegistro(fd: FormData, nodoId: string): Promise<string> {
  const g = await getVaultGraph();
  const nodo = g.nodos.get(nodoId);
  if (!nodo) throw new Error('La afirmación ya no está disponible.');
  const campo = (k: string, requerido = false) => {
    const v = (fd.get(k)?.toString() ?? '').trim();
    if (requerido && !v) throw new Error(`Completa ${k.replaceAll('_', ' ')}.`);
    if (v.length > 12000) throw new Error('Un campo supera los 12 000 caracteres.');
    return v;
  };
  const registro = campo('registro', true);
  if (!['propuesta', 'decision', 'busqueda', 'indicador'].includes(registro))
    throw new Error('Tipo de registro inválido.');
  const datos: Record<string, string> = {
    registro,
    nodo_id: nodoId,
    responsable: campo('responsable', true),
    fundamento: campo('fundamento', true),
    referencia: campo('referencia'),
    creado: new Date().toISOString(),
    estado: 'registrado',
    texto_original: nodo.frontmatter.enunciado || nodo.resumen,
  };
  if (registro === 'propuesta') datos.texto_propuesto = campo('texto_propuesto', true);
  if (registro === 'decision') {
    datos.objeto = campo('objeto', true);
    datos.decision = campo('decision', true);
    datos.referencia = campo('referencia', true);
    datos.propuesta_id = campo('propuesta_id');
    if (
      !['interpretacion', 'documental'].includes(datos.objeto) ||
      !(DECISIONES as readonly string[]).includes(datos.decision)
    )
      throw new Error('Decisión inválida.');
    if (datos.objeto === 'documental' && nodo.tipo !== 'evidencia')
      throw new Error('La revisión documental se registra sobre una evidencia.');
    if (datos.propuesta_id) {
      const propuesta = g.nodos.get(datos.propuesta_id);
      if (
        propuesta?.frontmatter.registro !== 'propuesta' ||
        propuesta.frontmatter.nodo_id !== nodoId
      )
        throw new Error('La propuesta no corresponde a esta afirmación.');
    }
  }
  if (registro === 'busqueda' || registro === 'indicador') {
    if (nodo.tipo !== 'medicion') throw new Error('Selecciona un indicador.');
    datos.estado_dato = campo('estado_dato', true);
    if (!(ESTADOS_DATO as readonly string[]).includes(datos.estado_dato))
      throw new Error('Estado del dato inválido.');
    if (datos.estado_dato !== 'pendiente') datos.referencia = campo('referencia', true);
    for (const k of [
      'unidad',
      'poblacion',
      'territorio',
      'periodo',
      'metodo',
      'valor',
      'meta',
      'fuentes_consultadas',
    ])
      datos[k] = campo(k);
    if (datos.estado_dato === 'incorporado') {
      for (const k of ['valor', 'unidad', 'poblacion', 'territorio', 'periodo', 'metodo'])
        datos[k] = campo(k, true);
    }
    if (datos.estado_dato === 'no-localizado')
      datos.fuentes_consultadas = campo('fuentes_consultadas', true);
  }
  const titulo = `${registro} · ${nodo.titulo}`;
  const fm = { titulo, arbol: nodo.arbol || '', ...datos };
  const contenido = `---\n${Object.entries(fm)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')}\n---\n\n# ${titulo.replace(/[\r\n]/g, ' ')}\n\n${datos.fundamento}\n`;
  const dir = join(getVaultPath(), '9 · Evidencia de campo');
  await mkdir(dir, { recursive: true });
  const nombre = `revision-${randomUUID()}.md`;
  await writeFile(join(dir, nombre), contenido, { encoding: 'utf8', flag: 'wx' });
  invalidar();
  return `9 · Evidencia de campo/${nombre}`;
}
