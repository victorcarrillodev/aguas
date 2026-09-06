import { Link, useFetcher } from '@remix-run/react';
import { useState } from 'react';
import { encodeNodo } from '~/lib/rutas';
import {
  DECISIONES,
  ESTADOS_DATO,
  ETIQUETAS_DATO,
  ETIQUETAS_DOCUMENTALES,
  valor,
} from '~/microprocesos/revision/index';
import type { VaultNode } from '~/microprocesos/vault-core/tipos';
import styles from './MesaNodo.module.css';

interface Props {
  nodo: VaultNode;
  registros: VaultNode[];
  estado: string;
  dato: string;
  origen: string;
  relaciones: { id: string; titulo: string; tipo: string; mecanismo: string }[];
  exportacion?: string;
  documentales?: Record<string, string>;
}

const CAMPOS_PLAN = [
  ['pregunta', 'La pregunta que queremos responder', '¿Qué queremos distinguir y por qué importa?'],
  ['hipotesis_alternativa', 'Otra explicación posible', '¿Qué otra condición podría producir lo mismo?'],
  ['prediccion', 'Qué esperaríamos observar', 'Describe qué resultado distinguiría la explicación actual de la alternativa.'],
  ['criterio_revision', 'Qué nos haría cambiar de opinión', 'Antes de evaluar el resultado, concreta qué hallazgo obligaría a revisar el enunciado.'],
  ['metodo', 'Cómo lo vamos a contrastar', 'Fuente o instrumento, selección de casos, comparación y pasos de análisis.'],
  ['alcance', 'Dónde, cuándo y a quién aplica', 'Territorio, periodo, población y casos que quedarán fuera.'],
] as const;

const ETIQUETAS_HISTORIAL: Record<string, string> = {
  objeto: 'Objeto de la revisión',
  decision: 'Decisión registrada',
  texto_propuesto: 'Texto propuesto',
  propuesta_id: 'Propuesta examinada',
  referencia: 'Referencia',
  valor: 'Valor o resultado',
  unidad: 'Unidad',
  poblacion: 'Población y cobertura',
  territorio: 'Territorio',
  periodo: 'Periodo',
  metodo: 'Método',
  meta: 'Meta propuesta',
  fuentes_consultadas: 'Fuentes consultadas',
  tipo_valor: 'Origen del valor',
  muestra: 'Muestra y selección',
  limitaciones: 'Limitaciones e incertidumbre',
  pregunta: 'Pregunta',
  hipotesis_alternativa: 'Explicación alternativa',
  prediccion: 'Resultado esperado',
  criterio_revision: 'Criterio para revisar',
  alcance: 'Alcance',
  momento: 'Momento declarado',
};

export function MesaNodo({
  nodo,
  registros,
  estado,
  dato,
  origen,
  relaciones,
  exportacion,
  documentales = {},
}: Props) {
  const fetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const contrasteFetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const [modo, setModo] = useState('propuesta');
  const [estadoBusqueda, setEstadoBusqueda] = useState('pendiente');
  const [objetoRevision, setObjetoRevision] = useState('interpretacion');
  const evidencia = registros.filter((r) => !r.frontmatter.registro);
  const propuestas = registros.filter((r) => r.frontmatter.registro === 'propuesta');
  const planes = registros.filter((r) => r.frontmatter.registro === 'contraste');
  const esRegistro = !!nodo.frontmatter.registro;
  const esMedicion = nodo.tipo === 'medicion';
  const permiteContraste = !esRegistro && ['causa', 'ficha', 'medicion'].includes(nodo.tipo);
  const documental = registros.find(
    (r) =>
      r.frontmatter.registro === 'decision' &&
      r.frontmatter.objeto === 'documental' &&
      !valor(r.frontmatter.propuesta_id),
  );
  const enunciado =
    valor(nodo.frontmatter.enunciado) || valor(nodo.frontmatter.afirmacion) || nodo.resumen;
  const exportar = () => {
    if (!exportacion) return;
    const url = URL.createObjectURL(new Blob([exportacion], { type: 'text/markdown;charset=utf-8' }));
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
        <h2>{nodo.frontmatter.registro === 'contraste' ? 'Plan de contraste' : nodo.tipo === 'metodo' ? 'Guía de trabajo' : nodo.tipo === 'evidencia' ? 'Registro para examinar' : 'Una afirmación que podemos examinar'}</h2>
        <p className={styles.cita}>{enunciado}</p>
        {origen ? (
          <p>
            Correspondencia con el documento de trabajo: <strong>{origen}</strong>
            <br />
            260831_DX_correlacion_AP_capas.xlsx. La correspondencia identifica el antecedente; no
            certifica el texto añadido.
          </p>
        ) : null}
        {nodo.tipo === 'evidencia' && !esRegistro ? (
          <p>
            {ETIQUETAS_DOCUMENTALES[documental?.frontmatter.decision || 'pendiente'] ||
              ETIQUETAS_DOCUMENTALES.pendiente}.
            {' '}Autoría declarada; la aplicación no certifica acuerdos ni valida causalidad.
          </p>
        ) : null}
        <div className={styles.acciones}>
          {permiteContraste ? (
            <Link to={'/captura?nodo=' + encodeNodo(nodo.id)}>Contrastar con evidencia</Link>
          ) : null}
          <Link to="/revision">Mesa de investigación</Link>
          <button type="button" onClick={exportar} disabled={!exportacion}>
            Descargar expediente completo
          </button>
        </div>
      </div>
      {esRegistro ? (
        <section className={styles.bloque} aria-label="Detalle del registro">
          <h3>{nodo.frontmatter.registro === 'contraste' ? 'Plan de contraste conservado' : 'Detalle de la revisión'}</h3>
          <p className={styles.meta}>{nodo.frontmatter.creado} · {nodo.frontmatter.responsable}</p>
          {valor(nodo.frontmatter.texto_original) ? (
            <>
              <h4>Afirmación de partida conservada</h4>
              <p className={styles.cita}>{nodo.frontmatter.texto_original}</p>
            </>
          ) : null}
          <dl className={styles.detalleRegistro}>
            {Object.entries(nodo.frontmatter)
              .filter(([k, v]) => k in ETIQUETAS_HISTORIAL && valor(v))
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{ETIQUETAS_HISTORIAL[k]}</dt>
                  <dd>{k === 'momento'
                    ? (v === 'antes-de-observar' ? 'Antes de observar (declarado)' : 'Con datos ya conocidos')
                    : v}</dd>
                </div>
              ))}
          </dl>
          {nodo.frontmatter.registro === 'contraste' ? (
            <p className={styles.meta}>El momento declarado y la fecha de guardado no constituyen un prerregistro certificado.</p>
          ) : null}
          {nodo.frontmatter.nodo_id ? (
            <Link to={'/nodo/' + encodeNodo(nodo.frontmatter.nodo_id)}>Volver al expediente de la afirmación</Link>
          ) : null}
        </section>
      ) : null}
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
                ? 'El mecanismo propuesto es «' + nodo.frontmatter.produce + '». ¿Qué observaríamos si no operara?'
                : '¿Qué pasos observables conectan esta condición con el efecto atribuido?'}
            </li>
            <li>
              <strong>La desigualdad.</strong> ¿Cambia por colonia, ingreso, acceso al
              almacenamiento o época del año? ¿A quién deja fuera el promedio?
            </li>
          </ol>
          <Link to={'/captura?nodo=' + encodeNodo(nodo.id) + '&relacion=contradice'}>
            Registrar una contraprueba
          </Link>
        </details>
      ) : null}
      {permiteContraste ? (
        <section className={styles.laboratorio} aria-labelledby="hipotesis-rivales">
          <p className={styles.eyebrow}>La idea: poner a competir las explicaciones</p>
          <h3 id="hipotesis-rivales">Hipótesis rivales</h3>
          <p>
            Una misma observación puede tener varias explicaciones. Conserva la afirmación de partida,
            formula una alternativa y acuerda qué resultado permitiría distinguirlas. Después vincula
            aquí lo observado, incluso si no permite concluir.
          </p>
          <div className={styles.recorrido} aria-label="Recorrido de contraste">
            <span>1. Explicaciones</span>
            <span>2. Predicción</span>
            <span>3. Observación</span>
            <span>4. Revisión</span>
          </div>
          <details className={styles.planNuevo}>
            <summary>Crear un plan de contraste</summary>
            <contrasteFetcher.Form method="post" className={styles.form}>
              <input type="hidden" name="registro" value="contraste" />
              {CAMPOS_PLAN.map(([nombre, etiqueta, ayuda]) => (
                <label key={nombre}>
                  {etiqueta}
                  <textarea name={nombre} placeholder={ayuda} required maxLength={12000} />
                </label>
              ))}
              <label>
                Cuándo se formula este plan
                <select name="momento" required defaultValue="">
                  <option value="" disabled>Indica qué información ya conoces</option>
                  <option value="antes-de-observar">Antes de observar los resultados que contrastaremos</option>
                  <option value="con-datos-conocidos">Con resultados o datos ya conocidos</option>
                </select>
              </label>
              <p className={styles.meta}>
                El momento es una declaración de quien registra el plan. La fecha de guardado
                conserva el historial; no constituye un prerregistro certificado.
              </p>
              <label>
                Responsable o equipo
                <input name="responsable" required maxLength={300} />
              </label>
              <label>
                Referencia del protocolo o acuerdo (opcional)
                <input name="referencia" maxLength={2000} />
              </label>
              <button type="submit" disabled={contrasteFetcher.state !== 'idle'}>
                {contrasteFetcher.state === 'idle' ? 'Guardar plan de contraste' : 'Guardando…'}
              </button>
              {contrasteFetcher.data?.error ? (
                <p role="alert" className={styles.error}>{contrasteFetcher.data.error}</p>
              ) : null}
              {contrasteFetcher.data?.ok && contrasteFetcher.state === 'idle' ? (
                <output>Plan guardado. Ya puedes vincular observaciones desde su ficha.</output>
              ) : null}
            </contrasteFetcher.Form>
          </details>
          {planes.length ? (
            <ul className={styles.lista}>
              {planes.map((p) => (
                <li className={styles.plan} key={p.id}>
                  <h4>{p.frontmatter.pregunta}</h4>
                  <p className={styles.meta}>{p.frontmatter.creado} · {p.frontmatter.responsable}</p>
                  <p><strong>Alternativa:</strong> {p.frontmatter.hipotesis_alternativa}</p>
                  <p><strong>Qué esperamos observar:</strong> {p.frontmatter.prediccion}</p>
                  <p><strong>Nos haría revisar:</strong> {p.frontmatter.criterio_revision}</p>
                  <p><strong>Método:</strong> {p.frontmatter.metodo}</p>
                  <p><strong>Alcance:</strong> {p.frontmatter.alcance}</p>
                  <p className={styles.meta}>
                    Momento declarado: {p.frontmatter.momento === 'antes-de-observar'
                      ? 'antes de observar los resultados' : 'con datos ya conocidos'}.
                  </p>
                  <div className={styles.acciones}>
                    <Link to={'/captura?nodo=' + encodeNodo(nodo.id) + '&plan=' + encodeNodo(p.id)}>
                      Vincular una observación
                    </Link>
                    <Link to={'/nodo/' + encodeNodo(p.id)}>Ver registro del plan</Link>
                  </div>
                  <small>
                    {evidencia.filter((r) => r.frontmatter.plan_id === p.id).length} observaciones
                    vinculadas · su interpretación queda abierta a revisión.
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.meta}>Este expediente todavía no tiene un plan de contraste registrado.</p>
          )}
        </section>
      ) : null}
      {relaciones.length ? (
        <details className={styles.bloque} open>
          <summary>Cómo se construye la explicación</summary>
          <ul className={styles.lista}>
            {relaciones.map((r) => (
              <li key={r.id + '-' + r.tipo}>
                <strong>{r.tipo}</strong> · <Link to={'/nodo/' + encodeNodo(r.id)}>{r.titulo}</Link>
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
        <summary>Evidencia recibida para esta afirmación ({evidencia.length})</summary>
        <p className={styles.meta}>
          Apoya, contradice o matiza expresa la interpretación declarada por quien aporta.
          La aceptación documental revisa el respaldo de la fuente; la explicación causal se delibera
          por separado. Los registros rechazados se conservan y quedan fuera del respaldo documental.
        </p>
        {evidencia.length ? (
          <ul className={styles.lista}>
            {evidencia.map((r) => (
              <li key={r.id}>
                <strong>{r.frontmatter.relacion || 'Relación por precisar'}</strong> ·{' '}
                <Link to={'/nodo/' + encodeNodo(r.id)}>{r.titulo}</Link>
                <p className={styles.documental} data-estado={documentales[r.id] || 'pendiente'}>
                  {ETIQUETAS_DOCUMENTALES[documentales[r.id] || 'pendiente'] ||
                    ETIQUETAS_DOCUMENTALES.pendiente}
                </p>
                <p>{r.frontmatter.afirmacion || r.resumen}</p>
                <small>
                  Fuente: {r.frontmatter.fuente || 'Sin registrar'} · Referencia:{' '}
                  {r.frontmatter.referencia || 'Sin registrar'} · {r.frontmatter.fecha}
                </small>
                {r.frontmatter.plan_id ? (
                  <p className={styles.meta}>
                    <Link to={'/nodo/' + encodeNodo(r.frontmatter.plan_id)}>Plan de contraste vinculado</Link>
                  </p>
                ) : null}
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
                  <select name="objeto" value={objetoRevision} onChange={(e) => setObjetoRevision(e.target.value)}>
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
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </label>
                {objetoRevision === 'interpretacion' ? (
                  <label>
                    Propuesta examinada
                    <select name="propuesta_id">
                      <option value="">Enunciado original</option>
                      {propuestas.map((p) => (
                        <option key={p.id} value={p.id}>{p.frontmatter.texto_propuesto?.slice(0, 100)}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </>
            ) : null}
            {['busqueda', 'indicador'].includes(modo) ? (
              <>
                <label>
                  Situación del dato
                  <select name="estado_dato" value={estadoBusqueda} onChange={(e) => setEstadoBusqueda(e.target.value)}>
                    {ESTADOS_DATO.map((v) => (
                      <option key={v} value={v}>{ETIQUETAS_DATO[v]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Fuentes consultadas y fechas
                  <textarea name="fuentes_consultadas" required={estadoBusqueda === 'no-localizado'} maxLength={12000} />
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
                      <input name={k} required={estadoBusqueda === 'incorporado' && k !== 'meta'} maxLength={12000} />
                    </label>
                  ))}
                </div>
                <label>
                  Origen del valor
                  <select name="tipo_valor" required={estadoBusqueda === 'incorporado'} defaultValue="">
                    <option value="">Por precisar</option>
                    <option value="observado">Observado en una medición o registro</option>
                    <option value="estimado">Estimado mediante cálculo o modelo</option>
                  </select>
                </label>
                <label>
                  Muestra y selección de casos (si aplica)
                  <input name="muestra" placeholder="Número de casos, cómo se eligieron y cuáles se excluyeron." maxLength={12000} />
                </label>
                <label>
                  Limitaciones e incertidumbre
                  <textarea name="limitaciones" required={estadoBusqueda === 'incorporado'} maxLength={12000}
                    placeholder="Cobertura, posibles sesgos, datos faltantes y margen de error si se conoce. Si algo no se evaluó, indícalo." />
                </label>
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
                <input name="referencia"
                  required={modo === 'decision' ||
                    (['busqueda', 'indicador'].includes(modo) && estadoBusqueda !== 'pendiente')}
                  maxLength={2000} />
              </label>
            </div>
            <button type="submit" disabled={fetcher.state !== 'idle'}>
              {fetcher.state === 'idle' ? 'Agregar al historial' : 'Guardando…'}
            </button>
            {fetcher.data?.error ? <p role="alert" className={styles.error}>{fetcher.data.error}</p> : null}
            {fetcher.data?.ok && fetcher.state === 'idle' ? (
              <output>Registro guardado. El original se conserva y el historial se ha actualizado.</output>
            ) : null}
          </fetcher.Form>
        </details>
      ) : null}
      <details className={styles.bloque} open={registros.some((r) => !!r.frontmatter.registro)}>
        <summary>Historial de planes, propuestas, decisiones y datos</summary>
        <ul className={styles.lista}>
          {registros.filter((r) => r.frontmatter.registro).map((r) => (
            <li key={r.id}>
              <strong>
                {r.frontmatter.registro === 'contraste' ? 'Plan de contraste' : r.frontmatter.registro}
                {' · '}{r.frontmatter.decision || ETIQUETAS_DATO[r.frontmatter.estado_dato || ''] || ''}
              </strong>
              <p className={styles.meta}>{r.frontmatter.creado} · {r.frontmatter.responsable}</p>
              {r.frontmatter.texto_propuesto ? <p className={styles.cita}>{r.frontmatter.texto_propuesto}</p> : null}
              <p>{r.frontmatter.fundamento}</p>
              <dl>
                {Object.entries(r.frontmatter)
                  .filter(([k, v]) => k in ETIQUETAS_HISTORIAL && valor(v))
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{ETIQUETAS_HISTORIAL[k]}</dt>
                      <dd>{k === 'momento'
                        ? (v === 'antes-de-observar' ? 'Antes de observar (declarado)' : 'Con datos ya conocidos')
                        : v}</dd>
                    </div>
                  ))}
              </dl>
            </li>
          ))}
        </ul>
        {!registros.some((r) => r.frontmatter.registro) ? <p>Aún no hay revisiones registradas.</p> : null}
      </details>
    </section>
  );
}
