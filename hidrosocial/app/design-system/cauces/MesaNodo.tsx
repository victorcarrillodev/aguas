import { Link, useFetcher } from '@remix-run/react';
import { useState } from 'react';
import { encodeNodo } from '~/lib/rutas';
import { DECISIONES, ESTADOS_DATO, ETIQUETAS_DATO, valor } from '~/microprocesos/revision/index';
import type { VaultNode } from '~/microprocesos/vault-core/tipos';
import styles from './MesaNodo.module.css';

interface Props {
  nodo: VaultNode;
  registros: VaultNode[];
  estado: string;
  dato: string;
  origen: string;
  relaciones: { id: string; titulo: string; tipo: string; mecanismo: string }[];
}

export function MesaNodo({ nodo, registros, estado, dato, origen, relaciones }: Props) {
  const fetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const [modo, setModo] = useState('propuesta');
  const [estadoBusqueda, setEstadoBusqueda] = useState('pendiente');
  const evidencia = registros.filter((r) => !r.frontmatter.registro);
  const propuestas = registros.filter((r) => r.frontmatter.registro === 'propuesta');
  const esRegistro = !!nodo.frontmatter.registro;
  const esMedicion = nodo.tipo === 'medicion';
  const documental = registros.find(
    (r) => r.frontmatter.registro === 'decision' && r.frontmatter.objeto === 'documental',
  );
  const enunciado =
    valor(nodo.frontmatter.enunciado) || valor(nodo.frontmatter.afirmacion) || nodo.resumen;
  const exportar = () => {
    const texto = [
      `# Expediente: ${nodo.titulo}`,
      `Estado: ${estado}`,
      `Correspondencia: ${origen || 'No establecida'}`,
      `## Enunciado conservado\n${enunciado}`,
      ...registros.map(
        (r) =>
          `## ${r.titulo}\n${Object.entries(r.frontmatter)
            .filter(([, v]) => valor(v))
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n')}`,
      ),
    ].join('\n\n');
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expediente-hidrosocial.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className={styles.mesa} aria-label="Expediente de investigación">
      <div className={styles.hero}>
        <span className={styles.estado}>{esMedicion ? ETIQUETAS_DATO[dato] : estado}</span>
        <h2>Una afirmación que podemos examinar</h2>
        <p className={styles.cita}>{enunciado}</p>
        {origen ? (
          <p>
            Correspondencia con el documento de trabajo: <strong>{origen}</strong>
            <br />
            260831_DX_correlacion_AP_capas.xlsx. La correspondencia identifica el antecedente; no
            certifica el texto añadido.
          </p>
        ) : null}
        {nodo.tipo === 'evidencia' ? (
          <p>
            Revisión documental:{' '}
            {documental ? `${documental.frontmatter.decision} · decisión registrada` : 'Pendiente'}.
            Autoría declarada; la aplicación no certifica acuerdos.
          </p>
        ) : null}
        <div className={styles.acciones}>
          {!esRegistro ? (
            <Link to={`/captura?nodo=${encodeNodo(nodo.id)}`}>Contrastar con evidencia</Link>
          ) : null}
          <Link to="/revision">Mesa de investigación</Link>
          <button type="button" onClick={exportar}>
            Descargar expediente
          </button>
        </div>
      </div>
      {!esRegistro ? (
        <details className={styles.bloque}>
          <summary>¿Y si estamos equivocados?</summary>
          <p>
            Estas preguntas son ejercicios de contraste, no hallazgos. Elige una y registra qué
            observación permitiría responderla.
          </p>
          <ol>
            <li>
              <strong>La excepción.</strong> ¿Dónde y cuándo no ocurre lo que afirma este enunciado?
              ¿Qué diferencia ese caso?
            </li>
            <li>
              <strong>La dirección.</strong> ¿Podría lo descrito ser consecuencia de otra condición?
              ¿Qué secuencia temporal distinguiría las explicaciones?
            </li>
            <li>
              <strong>El mecanismo.</strong>{' '}
              {valor(nodo.frontmatter.produce)
                ? `El mecanismo propuesto es «${nodo.frontmatter.produce}». ¿Qué observaríamos si no operara?`
                : '¿Qué pasos observables conectan esta condición con el efecto atribuido?'}
            </li>
            <li>
              <strong>La desigualdad.</strong> ¿Cambia por colonia, ingreso, acceso al
              almacenamiento o época del año? ¿A quién deja fuera el promedio?
            </li>
          </ol>
          <Link to={`/captura?nodo=${encodeNodo(nodo.id)}&relacion=contradice`}>
            Registrar una contraprueba
          </Link>
        </details>
      ) : null}
      {relaciones.length ? (
        <details className={styles.bloque} open>
          <summary>Cómo se construye la explicación</summary>
          <ul className={styles.lista}>
            {relaciones.map((r) => (
              <li key={`${r.id}-${r.tipo}`}>
                <strong>{r.tipo}</strong> · <Link to={`/nodo/${encodeNodo(r.id)}`}>{r.titulo}</Link>
                <p>{r.mecanismo}</p>
                <small>
                  Relación propuesta; su evidencia se consulta en el expediente correspondiente.
                </small>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <details className={styles.bloque} open>
        <summary>Evidencia vinculada a esta afirmación ({evidencia.length})</summary>
        {evidencia.length ? (
          <ul className={styles.lista}>
            {evidencia.map((r) => (
              <li key={r.id}>
                <strong>{r.frontmatter.relacion || 'Relación por precisar'}</strong> ·{' '}
                <Link to={`/nodo/${encodeNodo(r.id)}`}>{r.titulo}</Link>
                <p>{r.frontmatter.afirmacion || r.resumen}</p>
                <small>
                  Fuente: {r.frontmatter.fuente || 'Sin registrar'} · Referencia:{' '}
                  {r.frontmatter.referencia || 'Sin registrar'} · {r.frontmatter.fecha}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No hay evidencia vinculada a esta afirmación específica. Puede haber notas del mismo
            árbol pendientes de vincular; esto no demuestra inexistencia de datos.
          </p>
        )}
      </details>
      {!esRegistro ? (
        <details className={styles.bloque}>
          <summary>Proponer un cambio o registrar una revisión</summary>
          <p>
            El texto original se conserva. Cada envío agrega una entrada al historial. Las
            decisiones requieren responsable y referencia del acuerdo; no se certifican
            automáticamente.
          </p>
          <fetcher.Form method="post" className={styles.form}>
            <label>
              Tipo de registro
              <select name="registro" value={modo} onChange={(e) => setModo(e.target.value)}>
                <option value="propuesta">Propuesta de cambio</option>
                <option value="decision">Decisión de revisión</option>
                {esMedicion ? (
                  <>
                    <option value="busqueda">Búsqueda de información</option>
                    <option value="indicador">Definición y dato del indicador</option>
                  </>
                ) : null}
              </select>
            </label>
            {modo === 'propuesta' ? (
              <label>
                Texto propuesto
                <textarea name="texto_propuesto" required maxLength={12000} />
              </label>
            ) : null}
            {modo === 'decision' ? (
              <>
                <label>
                  Qué se revisó
                  <select name="objeto">
                    <option value="interpretacion">Interpretación o relación causal</option>
                    {nodo.tipo === 'evidencia' ? (
                      <option value="documental">Respaldo documental de esta evidencia</option>
                    ) : null}
                  </select>
                </label>
                <label>
                  Decisión
                  <select name="decision">
                    {DECISIONES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Propuesta examinada
                  <select name="propuesta_id">
                    <option value="">Enunciado original</option>
                    {propuestas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.frontmatter.texto_propuesto?.slice(0, 100)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
            {['busqueda', 'indicador'].includes(modo) ? (
              <>
                <label>
                  Situación del dato
                  <select
                    name="estado_dato"
                    value={estadoBusqueda}
                    onChange={(e) => setEstadoBusqueda(e.target.value)}
                  >
                    {ESTADOS_DATO.map((v) => (
                      <option key={v} value={v}>
                        {ETIQUETAS_DATO[v]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fuentes consultadas y fechas
                  <textarea
                    name="fuentes_consultadas"
                    required={estadoBusqueda === 'no-localizado'}
                  />
                </label>
                <div className={styles.dos}>
                  {[
                    ['valor', 'Valor o resultado'],
                    ['unidad', 'Unidad'],
                    ['poblacion', 'Población y cobertura'],
                    ['territorio', 'Territorio o colonia'],
                    ['periodo', 'Periodo del dato'],
                    ['metodo', 'Método o fórmula'],
                    ['meta', 'Meta propuesta (opcional)'],
                  ].map(([k, label]) => (
                    <label key={k}>
                      {label}
                      <input name={k} required={estadoBusqueda === 'incorporado' && k !== 'meta'} />
                    </label>
                  ))}
                </div>
              </>
            ) : null}
            <label>
              Motivo, evidencia y límites
              <textarea name="fundamento" required maxLength={12000} />
            </label>
            <div className={styles.dos}>
              <label>
                Responsable o participantes
                <input name="responsable" required maxLength={300} />
              </label>
              <label>
                Referencia, folio o acta
                <input
                  name="referencia"
                  required={
                    modo === 'decision' ||
                    (['busqueda', 'indicador'].includes(modo) && estadoBusqueda !== 'pendiente')
                  }
                  maxLength={2000}
                />
              </label>
            </div>
            <button type="submit" disabled={fetcher.state !== 'idle'}>
              {fetcher.state === 'idle' ? 'Agregar al historial' : 'Guardando…'}
            </button>
            {fetcher.data?.error ? (
              <p role="alert" className={styles.error}>
                {fetcher.data.error}
              </p>
            ) : null}
            {fetcher.data?.ok && fetcher.state === 'idle' ? (
              <output>
                Registro guardado. El original se conserva y el historial se ha actualizado.
              </output>
            ) : null}
          </fetcher.Form>
        </details>
      ) : null}
      <details className={styles.bloque} open={registros.some((r) => !!r.frontmatter.registro)}>
        <summary>Historial de propuestas, decisiones y datos</summary>
        <ul className={styles.lista}>
          {registros
            .filter((r) => r.frontmatter.registro)
            .map((r) => (
              <li key={r.id}>
                <strong>
                  {r.frontmatter.registro} ·{' '}
                  {r.frontmatter.decision || ETIQUETAS_DATO[r.frontmatter.estado_dato || ''] || ''}
                </strong>
                <p className={styles.meta}>
                  {r.frontmatter.creado} · {r.frontmatter.responsable}
                </p>
                {r.frontmatter.texto_propuesto ? (
                  <p className={styles.cita}>{r.frontmatter.texto_propuesto}</p>
                ) : null}
                <p>{r.frontmatter.fundamento}</p>
                <dl>
                  {Object.entries(r.frontmatter)
                    .filter(
                      ([k, v]) =>
                        [
                          'objeto',
                          'propuesta_id',
                          'referencia',
                          'valor',
                          'unidad',
                          'poblacion',
                          'territorio',
                          'periodo',
                          'metodo',
                          'meta',
                          'fuentes_consultadas',
                        ].includes(k) && valor(v),
                    )
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k.replaceAll('_', ' ')}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                </dl>
              </li>
            ))}
        </ul>
        {!registros.some((r) => r.frontmatter.registro) ? (
          <p>Aún no hay revisiones registradas.</p>
        ) : null}
      </details>
    </section>
  );
}
