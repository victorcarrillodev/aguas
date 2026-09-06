import { json, redirect } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { useEffect, useMemo, useState } from 'react';

import { FormBloque } from '~/design-system/corrientes/FormBloque';
import { AreaTexto } from '~/design-system/gotas/AreaTexto';
import { Boton } from '~/design-system/gotas/Boton';
import { CampoSelect } from '~/design-system/gotas/CampoSelect';
import { CampoTexto } from '~/design-system/gotas/CampoTexto';
import { colorDeCapa } from '~/lib/colores';
import { contextoPreview, renderPlantilla, validarBorradorParcial } from '~/lib/preview-captura';
import type { BorradorParcial } from '~/lib/preview-captura';
import { decodeNodo, encodeNodo, slugificar } from '~/lib/rutas';
import { CAPAS, LENTES, TIPOS_EVIDENCIA } from '~/lib/taxonomia';
import { getVaultGraph } from '~/microprocesos/cache/index';
import { guardarNota, validarBorrador } from '~/microprocesos/captura/index';
import { RELACIONES } from '~/microprocesos/revision/index';
import type { ArbolId, CapaId } from '~/microprocesos/vault-core/tipos';
import styles from './RutaCaptura.module.css';

interface Opcion {
  valor: string;
  etiqueta: string;
  arbol?: ArbolId;
  relPath?: string;
  enunciado?: string;
}

interface Datos {
  arboles: Opcion[];
  objetivos: Opcion[];
  fichas: Opcion[];
  mediciones: Opcion[];
  error?: string;
  inicial?: {
    nodoId: string;
    afirmacion: string;
    textoOriginal: string;
    arbol: string;
    relacion: string;
    planId: string;
  };
}

const CLAVE_BORRADOR = 'hidrosocial-borrador';

export async function loader({ request }: LoaderFunctionArgs) {
  const g = await getVaultGraph();
  const arboles: Opcion[] = [...g.nodos.values()]
    .filter((n) => n.tipo === 'causa')
    .map((n) => ({
      valor: n.arbol as string,
      etiqueta: `${n.arbol} · ${n.titulo}`,
      relPath: n.relPath,
    }))
    .sort((a, b) => a.valor.localeCompare(b.valor, 'es', { numeric: true }));
  const objetivos: Opcion[] = [...g.nodos.values()]
    .filter((n) => ['causa', 'ficha', 'medicion'].includes(n.tipo) && !n.frontmatter.registro)
    .map((n) => ({
      valor: n.id,
      etiqueta: `${n.tipo} · ${n.titulo}`,
      arbol: n.arbol,
      relPath: n.relPath,
      enunciado: n.frontmatter.enunciado || n.frontmatter.afirmacion || n.resumen,
    }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { numeric: true }));
  const fichas: Opcion[] = [...g.nodos.values()]
    .filter((n) => n.tipo === 'ficha')
    .map((n) => ({ valor: n.relPath, etiqueta: n.titulo, arbol: n.arbol }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { numeric: true }));
  const mediciones: Opcion[] = [...g.nodos.values()]
    .filter((n) => n.tipo === 'medicion')
    .map((n) => ({ valor: n.relPath, etiqueta: n.titulo, arbol: n.arbol }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { numeric: true }));
  const params = new URL(request.url).searchParams;
  let inicial: Datos['inicial'];
  try {
    const n = g.nodos.get(decodeNodo(params.get('nodo') || ''));
    if (n && !n.frontmatter.registro)
      {
        let planId = '';
        try {
          const plan = g.nodos.get(decodeNodo(params.get('plan') || ''));
          if (plan?.frontmatter.registro === 'contraste' && plan.frontmatter.nodo_id === n.id)
            planId = plan.id;
        } catch {
          // El plan es opcional.
        }
        const textoOriginal = n.frontmatter.enunciado || n.frontmatter.afirmacion || n.resumen;
        inicial = {
        nodoId: n.id,
        afirmacion: textoOriginal,
        textoOriginal,
        arbol: n.arbol || '',
        relacion: params.get('relacion') === 'contradice' ? 'contradice' : 'no-concluyente',
        planId,
      };
      }
  } catch {
    /* Entrada libre sin una afirmación preseleccionada. */
  }
  return json<Datos>({ arboles, objetivos, fichas, mediciones, inicial });
}

export async function action({ request }: ActionFunctionArgs) {
  const fd = await request.formData();
  try {
    const borrador = validarBorrador(fd);
    const nodo = await guardarNota(borrador);
    const url = new URL(request.url);
    const base = url.pathname.replace(/\/captura\/?$/, '');
    return redirect(`${base}/nodo/${encodeNodo(nodo.id)}?recibido=1`);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : 'No se pudo guardar la evidencia.';
    return json({ error: mensaje }, { status: 400 });
  }
}

interface EstadoForm {
  titulo: string;
  observacion: string;
  arbol: string;
  fichaId: string;
  medicionId: string;
  capa: string;
  lentes: string[];
  tipoEvidencia: string;
  fuente: string;
  fecha: string;
  municipio: string;
  nodoId: string;
  afirmacion: string;
  relacion: string;
  referencia: string;
  responsable: string;
  alcance: string;
  metodo: string;
  interpretacion: string;
  limitaciones: string;
  alternativa: string;
  planId: string;
  textoOriginal: string;
}

const VACIO: EstadoForm = {
  titulo: '',
  observacion: '',
  arbol: '',
  fichaId: '',
  medicionId: '',
  capa: '',
  lentes: [],
  tipoEvidencia: 'observacion',
  fuente: '',
  fecha: '',
  municipio: '',
  nodoId: '',
  afirmacion: '',
  relacion: 'no-concluyente',
  referencia: '',
  responsable: '',
  alcance: '',
  metodo: '',
  interpretacion: '',
  limitaciones: '',
  alternativa: '',
  planId: '',
  textoOriginal: '',
};

function ahoraLocal(): string {
  const d = new Date();
  const p = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Anillo de completitud SVG (stroke-dashoffset). */
function Anillo({ valor }: { valor: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" role="img" aria-label={`Completitud ${valor}%`}>
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="var(--surface-container-high)"
        strokeWidth="6"
      />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke={valor >= 100 ? 'var(--secondary)' : 'var(--primary-container)'}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - valor / 100)}
        transform="rotate(-90 24 24)"
      />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="var(--on-surface)"
      >
        {valor}%
      </text>
    </svg>
  );
}

// Cuenca: captura trazable + preview .md en vivo + anillo de campos completos.
export default function RutaCaptura() {
  const { arboles, objetivos, fichas, mediciones, inicial } = useLoaderData<Datos>();
  const accion = useActionData<{ error?: string } | undefined>();
  const navegacion = useNavigation();
  const [form, setForm] = useState<EstadoForm>(VACIO);
  const [guardado, setGuardado] = useState(false);
  const [mensajeLocal, setMensajeLocal] = useState('');

  // Restaura borrador + fecha por defecto (solo cliente, tras hidratar).
  useEffect(() => {
    if (inicial) {
      setForm({ ...VACIO, ...inicial, fecha: ahoraLocal() });
      return;
    }
    try {
      const raw = window.localStorage.getItem(CLAVE_BORRADOR);
      if (raw) {
        const prev = JSON.parse(raw) as Partial<EstadoForm>;
        setForm({ ...VACIO, ...prev, lentes: prev.lentes ?? [] });
        return;
      }
    } catch {
      // Sin borrador guardado.
    }
    setForm((f) => ({ ...f, fecha: ahoraLocal() }));
  }, [inicial?.nodoId, inicial?.planId]);

  const set = <K extends keyof EstadoForm>(k: K, v: EstadoForm[K]) => {
    setGuardado(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const toggleLente = (l: string) =>
    set(
      'lentes',
      form.lentes.includes(l) ? form.lentes.filter((x) => x !== l) : [...form.lentes, l],
    );

  const parcial = useMemo<BorradorParcial>(
    () => ({
      titulo: form.titulo,
      observacion: form.observacion,
      arbol: form.arbol,
      fichaId: form.fichaId || undefined,
      medicionId: form.medicionId || undefined,
      capa: form.capa,
      lentes: form.lentes,
      tipoEvidencia: form.tipoEvidencia,
      fuente: form.fuente,
      fecha: form.fecha,
      municipio: form.municipio,
      nodoId: form.nodoId,
      afirmacion: form.afirmacion,
      relacion: form.relacion,
      referencia: form.referencia,
      responsable: form.responsable,
      alcance: form.alcance,
      metodo: form.metodo,
      interpretacion: form.interpretacion,
      limitaciones: form.limitaciones,
      alternativa: form.alternativa,
      planId: form.planId || undefined,
      textoOriginal: form.textoOriginal,
    }),
    [form],
  );
  const { borrador, completitud } = useMemo(() => validarBorradorParcial(parcial), [parcial]);
  const md = useMemo(
    () => renderPlantilla(borrador, contextoPreview(parcial, arboles, fichas, mediciones)),
    [borrador, arboles, fichas, mediciones, parcial],
  );

  const fichasFiltradas = form.arbol ? fichas.filter((f) => f.arbol === form.arbol) : fichas;
  const medicionesFiltradas = form.arbol
    ? mediciones.filter((f) => f.arbol === form.arbol)
    : mediciones;
  const objetivosFiltrados = form.arbol
    ? objetivos.filter((o) => o.arbol === form.arbol)
    : [];

  const guardarBorrador = () => {
    try {
      window.localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(form));
      setGuardado(true);
      setMensajeLocal('Borrador guardado en este navegador. Todavía no se ha enviado.');
    } catch {
      setMensajeLocal('Este navegador no permitió guardar el borrador. Puedes descargar una copia cuando esté completa.');
    }
  };

  const descargar = () => {
    if (!completa) {
      setMensajeLocal('Completa los campos requeridos antes de descargar la aportación.');
      return;
    }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugificar(form.titulo) || 'evidencia'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setMensajeLocal('Aportación descargada. El archivo no se ha enviado al servidor.');
  };

  const enunciado = borrador.enunciado === '…' ? '' : borrador.enunciado;
  const completa = completitud >= 100;
  const enviando = navegacion.state === 'submitting';

  return (
    <div className={styles.cuenca}>
      <h1 className={styles.titulo}>Estación de captura</h1>
      <p className={styles.subtitulo}>
        Registra por separado lo observado, cómo se obtuvo y por qué afecta una afirmación. Puede
        apoyarla, contradecirla, matizarla o no permitir una conclusión. La revisión documental
        queda pendiente.
      </p>
      {accion?.error ? (
        <p className={styles.error} role="alert">
          {accion.error}
        </p>
      ) : null}
      {mensajeLocal ? <p role="status">{mensajeLocal}</p> : null}
      <Form method="post" className={styles.rejilla}>
        <div className={styles.formulario}>
          <FormBloque
            numero={1}
            titulo="Afirmación que se examina"
            descripcion="Elige el objeto explícitamente. Las fichas y mediciones auxiliares no lo cambian."
          >
            <CampoSelect
              etiqueta="Árbol"
              nombre="arbol"
              requerido
              valor={form.arbol}
              alCambiar={(v) =>
                setForm((actual) => ({
                  ...actual,
                  arbol: v,
                  nodoId: '',
                  afirmacion: '',
                  textoOriginal: '',
                  fichaId: '',
                  medicionId: '',
                  planId: '',
                }))
              }
              opciones={[
                { valor: '', etiqueta: 'Elige árbol…' },
                ...arboles.map((a) => ({ valor: a.valor, etiqueta: a.etiqueta })),
              ]}
            />
            <CampoSelect
              etiqueta="Afirmación o indicador del diagnóstico"
              nombre="nodoId"
              requerido
              valor={form.nodoId}
              alCambiar={(v) => {
                const objetivo = objetivos.find((o) => o.valor === v);
                setForm((actual) => ({
                  ...actual,
                  nodoId: v,
                  afirmacion: objetivo?.enunciado || '',
                  textoOriginal: objetivo?.enunciado || '',
                  planId: '',
                }));
              }}
              opciones={[
                { valor: '', etiqueta: form.arbol ? 'Elige una afirmación…' : 'Primero elige un árbol' },
                ...objetivosFiltrados.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta })),
              ]}
            />
            {form.textoOriginal ? (
              <p><strong>Enunciado conservado:</strong> {form.textoOriginal}</p>
            ) : null}
            <input type="hidden" name="planId" value={form.planId} />
            {form.planId ? <p>Esta aportación quedará vinculada al plan de contraste seleccionado.</p> : null}
            <AreaTexto
              etiqueta="Aspecto específico que esta aportación examina"
              nombre="afirmacion"
              requerido
              valor={form.afirmacion}
              alCambiar={(v) => set('afirmacion', v)}
              descripcion="Puedes acotar el enunciado sin sustituir el texto original."
            />
          </FormBloque>

          <FormBloque numero={2} titulo="Observación y método" descripcion="Separa el resultado del procedimiento.">
            <CampoTexto
              etiqueta="Título"
              nombre="titulo"
              requerido
              valor={form.titulo}
              alCambiar={(v) => set('titulo', v)}
              placeholder="p. ej. Fuga en la red de la colonia…"
            />
            <AreaTexto
              etiqueta="Observación de campo"
              nombre="observacion"
              requerido
              filas={5}
              valor={form.observacion}
              alCambiar={(v) => set('observacion', v)}
              placeholder="Qué viste, dónde, en qué condiciones…"
            />
            <input type="hidden" name="enunciado" value={enunciado} />
            <AreaTexto
              etiqueta="Cómo se obtuvo o analizó la información"
              nombre="metodo"
              requerido
              valor={form.metodo}
              alCambiar={(v) => set('metodo', v)}
              placeholder="Instrumento, selección de casos, consulta o pasos de análisis…"
            />
          </FormBloque>

          <FormBloque numero={3} titulo="Interpretación y límites" descripcion="Explica el salto entre observación y conclusión.">
            <CampoSelect
              etiqueta="Qué aporta a la afirmación"
              nombre="relacion"
              valor={form.relacion}
              alCambiar={(v) => set('relacion', v)}
              opciones={RELACIONES.map((v) => ({
                valor: v,
                etiqueta: v === 'no-concluyente' ? 'No permite concluir todavía' : v,
              }))}
            />
            <AreaTexto
              etiqueta="Por qué la observación tiene esa relación"
              nombre="interpretacion"
              requerido
              valor={form.interpretacion}
              alCambiar={(v) => set('interpretacion', v)}
            />
            <AreaTexto
              etiqueta="Alcance: territorio, población, periodo y condiciones"
              nombre="alcance"
              requerido
              valor={form.alcance}
              alCambiar={(v) => set('alcance', v)}
            />
            <AreaTexto
              etiqueta="Limitaciones, incertidumbres y posibles sesgos"
              nombre="limitaciones"
              requerido
              valor={form.limitaciones}
              alCambiar={(v) => set('limitaciones', v)}
            />
            <AreaTexto
              etiqueta="Explicación alternativa (opcional)"
              nombre="alternativa"
              valor={form.alternativa}
              alCambiar={(v) => set('alternativa', v)}
              descripcion="Otro proceso que podría producir la misma observación."
            />
          </FormBloque>

          <FormBloque
            numero={4}
            titulo="Clasificación y procedencia"
            descripcion="Contexto analítico, fuente y responsable."
          >
            <CampoSelect
              etiqueta="Ficha relacionada (opcional)"
              nombre="fichaId"
              valor={form.fichaId}
              alCambiar={(v) => set('fichaId', v)}
              opciones={[
                { valor: '', etiqueta: '— Sin asignar —' },
                ...fichasFiltradas.map((f) => ({ valor: f.valor, etiqueta: f.etiqueta })),
              ]}
            />
            <CampoSelect
              etiqueta="Medición que ayuda a capturar (opcional)"
              nombre="medicionId"
              valor={form.medicionId}
              alCambiar={(v) => set('medicionId', v)}
              opciones={[
                { valor: '', etiqueta: '— Sin asignar —' },
                ...medicionesFiltradas.map((f) => ({ valor: f.valor, etiqueta: f.etiqueta })),
              ]}
            />
            <fieldset className={styles.grupo}>
              <legend className={styles.etiquetaGrupo}>Capa</legend>
              <div className={styles.chips}>
                {CAPAS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={form.capa === c.id ? styles.chipActivo : styles.chip}
                    onClick={() => set('capa', c.id)}
                    aria-pressed={form.capa === c.id}
                  >
                    <span
                      className={styles.punto}
                      style={{ background: colorDeCapa(c.id as CapaId) }}
                      aria-hidden="true"
                    />
                    {c.id}
                  </button>
                ))}
              </div>
            </fieldset>
            <input type="hidden" name="capa" value={form.capa} />
            <fieldset className={styles.grupo}>
              <legend className={styles.etiquetaGrupo}>
                Dimensiones de análisis (elige una o varias)
              </legend>
              <div className={styles.chips}>
                {(LENTES as readonly string[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={form.lentes.includes(l) ? styles.pillActiva : styles.pill}
                    onClick={() => toggleLente(l)}
                    aria-pressed={form.lentes.includes(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
            {form.lentes.map((l) => (
              <input key={l} type="hidden" name="lentes" value={l} />
            ))}
            <CampoSelect
              etiqueta="Tipo de evidencia"
              nombre="tipoEvidencia"
              requerido
              valor={form.tipoEvidencia}
              alCambiar={(v) => set('tipoEvidencia', v)}
              opciones={(TIPOS_EVIDENCIA as readonly string[]).map((t) => ({
                valor: t,
                etiqueta: t.charAt(0).toUpperCase() + t.slice(1),
              }))}
            />
            <CampoTexto
              etiqueta="Fuente o informante"
              nombre="fuente"
              requerido
              valor={form.fuente}
              alCambiar={(v) => set('fuente', v)}
              placeholder="Institución, autor o código de entrevista"
              descripcion="Si necesitas proteger identidad, usa el código acordado por el equipo."
            />
            <CampoTexto
              etiqueta="Referencia, folio, enlace o identificación de entrevista"
              nombre="referencia"
              requerido
              valor={form.referencia}
              alCambiar={(v) => set('referencia', v)}
            />
            <CampoTexto
              etiqueta="Persona responsable del registro"
              nombre="responsable"
              requerido
              valor={form.responsable}
              alCambiar={(v) => set('responsable', v)}
            />
            <label className={styles.campo}>
              <span className={styles.etiqueta}>
                Fecha <span aria-hidden="true"> *</span>
              </span>
              <input
                className={styles.entrada}
                type="datetime-local"
                name="fecha"
                required
                value={form.fecha}
                onChange={(e) => set('fecha', e.target.value)}
              />
            </label>
            <CampoTexto
              etiqueta="Municipio"
              nombre="municipio"
              valor={form.municipio}
              alCambiar={(v) => set('municipio', v)}
              placeholder="p. ej. Guadalajara"
            />
          </FormBloque>
        </div>

        <aside className={styles.preview} aria-label="Vista previa de la nota">
          <div className={styles.terminal}>
            <div className={styles.terminalBar}>
              <span>VISTA PREVIA DEL REGISTRO</span>
            </div>
            <pre className={styles.terminalCuerpo}>{md}</pre>
          </div>
          <details className={styles.previewMovil}>
            <summary>Ver registro</summary>
            <pre className={styles.terminalCuerpo}>{md}</pre>
          </details>
        </aside>

        <div className={styles.actionBar}>
          <Anillo valor={completitud} />
          <div className={styles.botones}>
            <Boton type="button" variante="secundario" onClick={guardarBorrador}>
              {guardado ? 'Borrador guardado ✓' : 'Guardar borrador'}
            </Boton>
            <Boton type="button" variante="secundario" onClick={descargar}>
              Descargar aportación
            </Boton>
            <Boton
              type="submit"
              variante={completa ? 'primario' : 'secundario'}
              disabled={!completa || enviando}
            >
              {enviando ? 'Enviando…' : 'Enviar aportación'}
            </Boton>
          </div>
        </div>
      </Form>
    </div>
  );
}
