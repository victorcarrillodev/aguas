import { json, redirect } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { useEffect, useMemo, useState } from 'react';

import { FormBloque } from '~/design-system/corrientes/FormBloque';
import { AreaTexto } from '~/design-system/gotas/AreaTexto';
import { Boton } from '~/design-system/gotas/Boton';
import { CampoSelect } from '~/design-system/gotas/CampoSelect';
import { CampoTexto } from '~/design-system/gotas/CampoTexto';
import { colorDeCapa } from '~/lib/colores';
import { contextoPreview, renderPlantilla, validarBorradorParcial } from '~/lib/preview-captura';
import type { BorradorParcial } from '~/lib/preview-captura';
import { encodeNodo, slugificar } from '~/lib/rutas';
import { CAPAS, LENTES, TIPOS_EVIDENCIA } from '~/lib/taxonomia';
import { getVaultGraph } from '~/microprocesos/cache/index';
import { guardarNota, validarBorrador } from '~/microprocesos/captura/index';
import type { ArbolId, CapaId } from '~/microprocesos/vault-core/tipos';
import styles from './RutaCaptura.module.css';

interface Opcion {
  valor: string;
  etiqueta: string;
  arbol?: ArbolId;
}

interface Datos {
  arboles: Opcion[];
  fichas: Opcion[];
  mediciones: Opcion[];
  error?: string;
}

const CLAVE_BORRADOR = 'hidrosocial-borrador';

export async function loader() {
  const g = await getVaultGraph();
  const arboles: Opcion[] = [...g.nodos.values()]
    .filter((n) => n.tipo === 'causa')
    .map((n) => ({ valor: n.arbol as string, etiqueta: `${n.arbol} · ${n.titulo}` }))
    .sort((a, b) => a.valor.localeCompare(b.valor, 'es', { numeric: true }));
  const fichas: Opcion[] = [...g.nodos.values()]
    .filter((n) => n.tipo === 'ficha')
    .map((n) => ({ valor: n.relPath, etiqueta: n.titulo, arbol: n.arbol }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { numeric: true }));
  const mediciones: Opcion[] = [...g.nodos.values()]
    .filter((n) => n.tipo === 'medicion')
    .map((n) => ({ valor: n.relPath, etiqueta: n.titulo, arbol: n.arbol }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { numeric: true }));
  return json<Datos>({ arboles, fichas, mediciones });
}

export async function action({ request }: ActionFunctionArgs) {
  const fd = await request.formData();
  try {
    const borrador = validarBorrador(fd);
    const nodo = await guardarNota(borrador);
    return redirect(`/nodo/${encodeNodo(nodo.id)}`);
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
}

const VACIO: EstadoForm = {
  titulo: '',
  observacion: '',
  arbol: '',
  fichaId: '',
  medicionId: '',
  capa: 'C0',
  lentes: [],
  tipoEvidencia: 'observacion',
  fuente: '',
  fecha: '',
  municipio: '',
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

// Cuenca: captura v2 (3 bloques + preview .md en vivo + anillo + action bar).
export default function RutaCaptura() {
  const { arboles, fichas, mediciones } = useLoaderData<Datos>();
  const accion = useActionData<{ error?: string } | undefined>();
  const [form, setForm] = useState<EstadoForm>(VACIO);
  const [guardado, setGuardado] = useState(false);

  // Restaura borrador + fecha por defecto (solo cliente, tras hidratar).
  useEffect(() => {
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
  }, []);

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

  const guardarBorrador = () => {
    try {
      window.localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(form));
      setGuardado(true);
    } catch {
      // Almacenamiento no disponible.
    }
  };

  const descargar = () => {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugificar(form.titulo) || 'evidencia'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const enunciado = borrador.enunciado === '…' ? '' : borrador.enunciado;
  const completa = completitud >= 100;

  return (
    <div className={styles.cuenca}>
      <h1 className={styles.titulo}>Estación de captura</h1>
      <p className={styles.subtitulo}>
        El cuestionario guarda una nota `.md` válida en <code>9 · Evidencia de campo/</code> con
        frontmatter y enlaces markdown URL-encoded, navegable en el grafo de Obsidian.
      </p>
      {accion?.error ? (
        <p className={styles.error} role="alert">
          {accion.error}
        </p>
      ) : null}
      <Form method="post" className={styles.rejilla}>
        <div className={styles.formulario}>
          <FormBloque numero={1} titulo="Hallazgo" descripcion="Título y texto de observación.">
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
          </FormBloque>

          <FormBloque
            numero={2}
            titulo="Conexión ontológica"
            descripcion="Árbol, ficha y medición relacionados; capa, lentes y tipo de evidencia."
          >
            <CampoSelect
              etiqueta="Árbol"
              nombre="arbol"
              requerido
              valor={form.arbol}
              alCambiar={(v) => {
                set('arbol', v);
                set('fichaId', '');
                set('medicionId', '');
              }}
              opciones={[
                { valor: '', etiqueta: 'Elige árbol…' },
                ...arboles.map((a) => ({ valor: a.valor, etiqueta: a.etiqueta })),
              ]}
            />
            <CampoSelect
              etiqueta="Ficha observada"
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
              <legend className={styles.etiquetaGrupo}>Lentes (multi-select)</legend>
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
          </FormBloque>

          <FormBloque
            numero={3}
            titulo="Fuente y trazabilidad"
            descripcion="Quién reporta y cuándo."
          >
            <CampoTexto
              etiqueta="Informante"
              nombre="fuente"
              requerido
              valor={form.fuente}
              alCambiar={(v) => set('fuente', v)}
              placeholder="Nombre, medio o documento"
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
              <span>
                NUEVA NOTA · 9 · Evidencia de campo/{slugificar(form.titulo) || 'evidencia'}.md
              </span>
            </div>
            <pre className={styles.terminalCuerpo}>{md}</pre>
          </div>
          <details className={styles.previewMovil}>
            <summary>Ver nota .md</summary>
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
              Descargar .md
            </Boton>
            <Boton
              type="submit"
              variante={completa ? 'primario' : 'secundario'}
              disabled={!completa}
            >
              Enviar al vault
            </Boton>
          </div>
        </div>
      </Form>
    </div>
  );
}
