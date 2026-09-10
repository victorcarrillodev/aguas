import { Link } from '@remix-run/react';
import { useMemo, useState } from 'react';

import { Chip } from '~/design-system/gotas/Chip';
import { colorDeCapa, colorDeNodo, colorDeTipo } from '~/lib/colores';
import { encodeNodo } from '~/lib/rutas';
import { ETIQUETAS_DOCUMENTALES } from '~/microprocesos/revision/index';
import { normalizar } from '~/microprocesos/busqueda/index';
import { disponerArbol } from '~/microprocesos/grafo/layout-causal';
import type { GrafoRender } from '~/microprocesos/grafo/index';
import type { CapaId, VaultNodeType } from '~/microprocesos/vault-core/tipos';
import styles from './ExploradorGrafo.module.css';
import WrapperSigma from './WrapperSigma';

export interface DatosExplorador {
  grafo: GrafoRender;
  /** Conteos por tipo sobre el vault completo (pills). */
  conteos: Record<string, number>;
  densidad: number;
  modularidad: number;
  resumenes: Record<string, string>;
  tipoInicial?: VaultNodeType | null;
  capaInicial?: CapaId | null;
  qInicial?: string;
  focoInicial?: string | null;
  arbolInicial?: string | null;
}

const TIPOS_PILL: { id: VaultNodeType; etiqueta: string }[] = [
  { id: 'causa', etiqueta: 'Causas' },
  { id: 'ficha', etiqueta: 'Fichas' },
  { id: 'actor', etiqueta: 'Actores' },
  { id: 'efecto', etiqueta: 'Efectos' },
  { id: 'medicion', etiqueta: 'Mediciones' },
  { id: 'problema', etiqueta: 'Problemas' },
  { id: 'evidencia', etiqueta: 'Aportaciones y revisiones' },
];

const CAPAS: CapaId[] = ['C0', 'C1', 'C2', 'C3', 'C4'];

/** Nombre de cada capa, para que `C0…C4` no sea un código opaco. */
const NOMBRE_CAPA: Record<CapaId, string> = {
  C0: 'Ciclo hidrosocial',
  C1: 'Macroprocesos',
  C2: 'Actores',
  C3: 'Factores',
  C4: 'Dimensiones',
};

/**
 * Explorador compartido por `/grafo` y `/grafo/:nodeId`: barra superpuesta
 * (buscador + pills + chips), lienzo Obsidian, inspector y status bar.
 */
export function ExploradorGrafo(d: DatosExplorador) {
  const [q, setQ] = useState(d.qInicial ?? '');
  const [tipo, setTipo] = useState<VaultNodeType | null>(d.tipoInicial ?? null);
  const [capa, setCapa] = useState<CapaId | null>(d.capaInicial ?? null);
  const [seleccionado, setSeleccionado] = useState<string | null>(d.focoInicial ?? null);
  const [radiografia, setRadiografia] = useState(false);
  const inicial = d.grafo.nodos.find((n) => n.id === d.focoInicial);
  const [vista, setVista] = useState<'causal' | 'documental'>(
    d.tipoInicial || (inicial && !inicial.nivelCausal) ? 'documental' : 'causal',
  );
  const [arbol, setArbol] = useState(d.arbolInicial || inicial?.arbol || 'maestro');
  const [conexion, setConexion] = useState('');
  const arboles = useMemo(() => d.grafo.nodos.filter((n) => n.nivelCausal === 'N2')
    .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', 'es', { numeric: true })), [d.grafo]);

  const porId = useMemo(() => new Map(d.grafo.nodos.map((n) => [n.id, n])), [d.grafo]);

  const corredor = useMemo(() => {
    if (!radiografia || !seleccionado) return null;
    const tipos = new Set(['causa-propuesta', 'supuesto', 'bisagra', 'evidencia', 'revision']);
    const vistos = new Set([seleccionado]);
    let frontera = [seleccionado];
    for (let profundidad = 0; profundidad < 3; profundidad++) {
      const siguiente: string[] = [];
      for (const actual of frontera) {
        for (const a of d.grafo.aristas) {
          if (!tipos.has(a.tipo ?? '')) continue;
          const otro = a.origen === actual ? a.destino : a.destino === actual ? a.origen : null;
          if (otro && !vistos.has(otro)) { vistos.add(otro); siguiente.push(otro); }
        }
      }
      frontera = siguiente;
    }
    return vistos;
  }, [d.grafo.aristas, radiografia, seleccionado]);

  const filtrados = useMemo(() => {
    const terms = normalizar(q.trim()).split(/\s+/).filter(Boolean);
    const candidatos = d.grafo.nodos.filter((n) => vista !== 'causal' || (n.nivelCausal &&
      (arbol === 'todos' || terms.length > 0 || capa ||
        (arbol === 'maestro' ? ['N1', 'N2'].includes(n.nivelCausal) : n.arbol === arbol))));
    const coincidencias = candidatos.filter((n) => {
      if (vista === 'documental' && tipo && n.tipo !== tipo) return false;
      if (capa && n.capa !== capa) return false;
      if (corredor && !corredor.has(n.id)) return false;
      if (terms.length > 0) {
        const hay = normalizar(`${n.titulo} ${n.tipo} ${n.capa ?? ''} ${n.id}`);
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    if (vista !== 'causal') return coincidencias;
    // Un filtro de lectura conserva la cadena hacia arriba, aunque el padre tenga otra capa.
    const dentro = new Set(coincidencias.map((n) => n.id));
    const candidatosIds = new Set(candidatos.map((n) => n.id));
    let cambio = true;
    while (cambio) {
      cambio = false;
      for (const a of d.grafo.aristas) {
        if (a.tipo === 'causa-propuesta' && dentro.has(a.origen) && candidatosIds.has(a.destino) && !dentro.has(a.destino)) {
          dentro.add(a.destino); cambio = true;
        }
      }
    }
    return candidatos.filter((n) => dentro.has(n.id));
  }, [d.grafo, tipo, capa, q, corredor, vista, arbol]);

  const dentro = useMemo(() => new Set(filtrados.map((n) => n.id)), [filtrados]);
  const aristasVisibles = useMemo(
    () => d.grafo.aristas.filter((a) => dentro.has(a.origen) && dentro.has(a.destino) &&
      (vista === 'causal' ? a.tipo === 'causa-propuesta' : !conexion || a.tipo === conexion)),
    [d.grafo, dentro, vista, conexion],
  );
  const dibujados = useMemo(() => vista === 'causal' ? disponerArbol(filtrados, aristasVisibles) : filtrados,
    [vista, filtrados, aristasVisibles]);

  const adyacencia = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of d.grafo.aristas) {
      if (!m.has(a.origen)) m.set(a.origen, []);
      if (!m.has(a.destino)) m.set(a.destino, []);
      m.get(a.origen)?.push(a.destino);
      m.get(a.destino)?.push(a.origen);
    }
    return m;
  }, [d.grafo]);

  const sel = seleccionado ? porId.get(seleccionado) : undefined;
  const vecinosSel = [...new Set(seleccionado ? (adyacencia.get(seleccionado) ?? []) : [])]
    .map((id) => porId.get(id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));

  return (
    <div className={styles.explorador}>
      <div className={styles.barra}>
        <div className={styles.modos}>
          <button type="button" aria-pressed={vista === 'causal'} className={vista === 'causal' ? styles.modoActivo : undefined}
            onClick={() => { setVista('causal'); setTipo(null); setSeleccionado(null); setRadiografia(false); }}>
            Árbol causal N1–N4
          </button>
          <button type="button" aria-pressed={vista === 'documental'} className={vista === 'documental' ? styles.modoActivo : undefined}
            onClick={() => { setVista('documental'); setSeleccionado(null); setRadiografia(false); }}>
            Relaciones y documentos
          </button>
          {vista === 'causal' ? (
            <label>Vista del mismo modelo{' '}
              <select value={arbol} onChange={(e) => { setArbol(e.target.value); setSeleccionado(null); setQ(''); setCapa(null); }}>
                <option value="maestro">AP maestro · N1 y N2</option>
                {arboles.map((n) => <option key={n.id} value={n.arbol}>{n.codigo} · N2, N3 y N4</option>)}
                <option value="todos">Todos los niveles</option>
              </select>
            </label>
          ) : (
            <label>Tipo de conexión{' '}
              <select value={conexion} onChange={(e) => setConexion(e.target.value)}>
                <option value="">Todas las relaciones</option>
                <option value="causa-propuesta">Causa propuesta</option>
                <option value="supuesto">Supuesto externo</option>
                <option value="bisagra">Bisagra</option>
                <option value="efecto-propuesto">Efecto propuesto</option>
                <option value="mide">Indicador de una condición</option>
                <option value="genera">Actor que genera</option>
                <option value="debe-resolver">Actor que debe resolver</option>
                <option value="evidencia">Evidencia de una afirmación</option>
                <option value="revision">Revisión o plan</option>
                <option value="enlace">Referencia entre notas</option>
                <option value="canvas">Enlace de un mapa documental</option>
              </select>
            </label>
          )}
        </div>
        <p className={styles.ayuda}>
          {vista === 'causal'
            ? 'N indica profundidad causal; el color indica la capa C. Las flechas suben del antecedente a su padre inmediato. Al abrir E1 se conserva el mismo nodo del maestro. Los filtros mantienen sus padres como contexto.'
            : 'Cada relación conserva su función. Un enlace, una bisagra o una fuente no equivalen a una causa demostrada. Los efectos quedan fuera del conteo N.'}
        </p>
        {d.grafo.incidenciasModelo?.length ? <details><summary>Relaciones que requieren conciliación</summary>
          <ul>{d.grafo.incidenciasModelo.map((x) => <li key={x}>{x}</li>)}</ul></details> : null}
        <div className={styles.modos}>
          <button
            type="button"
            className={radiografia ? styles.modoActivo : undefined}
            onClick={() => setRadiografia((actual) => !actual)}
          >
            Radiografía del cuello de botella
          </button>
          <span className={styles.leyendaCuello}>
            {radiografia
              ? seleccionado
                ? 'Muestra el corredor explicativo a tres pasos. En rojo: afirmaciones sin aportaciones con revisión documental aceptada.'
                : 'Selecciona una afirmación para aislar su corredor explicativo.'
              : 'Señala afirmaciones sin respaldo documental aceptado. No calcula su verdad ni su importancia causal.'}
          </span>
        </div>
        <div className={styles.buscador}>
          <span className={`material-symbols-outlined ${styles.lupa}`} aria-hidden="true">
            search
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nodos…"
            aria-label="Buscar nodos"
            className={styles.entrada}
          />
        </div>
        {vista === 'documental' ? <fieldset className={styles.pillsGrupo}>
          <legend className={styles.leyenda}>Filtrar por tipo</legend>
          <div className={styles.pills}>
            <button
              type="button"
              className={tipo === null ? styles.pillActiva : styles.pill}
              onClick={() => setTipo(null)}
            >
              Todos ({d.grafo.nodos.length})
            </button>
            {TIPOS_PILL.map((t) => (
              <button
                key={t.id}
                type="button"
                className={tipo === t.id ? styles.pillActiva : styles.pill}
                onClick={() => setTipo(tipo === t.id ? null : t.id)}
              >
                <span
                  className={styles.punto}
                  style={{ background: colorDeTipo(t.id) }}
                  aria-hidden="true"
                />
                {t.etiqueta} ({d.conteos[t.id] ?? 0})
              </button>
            ))}
          </div>
        </fieldset> : null}
        <fieldset className={styles.pillsGrupo}>
          <legend className={styles.leyenda}>Filtrar por capa</legend>
          <div className={styles.pills}>
            <button
              type="button"
              className={capa === null ? styles.pillActiva : styles.pill}
              onClick={() => setCapa(null)}
            >
              Todas
            </button>
            {CAPAS.map((c) => (
              <button
                key={c}
                type="button"
                className={capa === c ? styles.pillActiva : styles.pill}
                onClick={() => setCapa(capa === c ? null : c)}
                title={`${c} · ${NOMBRE_CAPA[c]}`}
              >
                <span
                  className={styles.punto}
                  style={{ background: colorDeCapa(c) }}
                  aria-hidden="true"
                />
                {c} <span className={styles.nombreCapa}>{NOMBRE_CAPA[c]}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={styles.cuerpo}>
        <div className={styles.lienzo}>
          <WrapperSigma
            nodos={dibujados}
            aristas={aristasVisibles}
            foco={seleccionado ?? undefined}
            onSeleccionar={setSeleccionado}
            radiografia={radiografia}
            causal={vista === 'causal'}
          />
        </div>

        <aside
          className={seleccionado ? styles.inspector : `${styles.inspector} ${styles.vacio}`}
          aria-label="Inspector del nodo"
        >
          {sel ? (
            <>
              <button
                type="button"
                className={styles.cerrar}
                onClick={() => setSeleccionado(null)}
                aria-label="Cerrar inspector"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
              <div className={styles.chips}>
                <Chip color={colorDeTipo(sel.tipo)}>{sel.tipo}</Chip>
                {sel.nivelCausal ? <Chip color={colorDeTipo(sel.tipo)}>{sel.nivelCausal}</Chip> : null}
                {sel.capa ? <Chip color={colorDeCapa(sel.capa)}>{sel.capa}</Chip> : null}
              </div>
              <h2 className={styles.tituloNodo}>{sel.titulo}</h2>
              {sel.nivelCausal === 'N2' ? <button type="button" className={styles.vecino}
                onClick={() => { setVista('causal'); setArbol(sel.arbol || 'maestro'); setTipo(null); setCapa(null); setQ(''); setRadiografia(false); }}>
                Abrir árbol {sel.codigo} · conservar este nodo como N2
              </button> : null}
              {sel.nivelCausal === 'N3' && !d.grafo.aristas.some((a) => a.tipo === 'causa-propuesta' && a.destino === sel.id) ?
                <p>Sin causas N4 desarrolladas. El desglose está pendiente; no significa que no existan antecedentes.</p> : null}
              {d.resumenes[sel.id] ? <p className={styles.resumen}>{d.resumenes[sel.id]}</p> : null}
              <p className={styles.metricas}>{vecinosSel.length} vecinos conectados</p>
              {['causa', 'ficha', 'medicion', 'problema'].includes(sel.tipo) ? (
                <p className={styles.metricas}>
                  {sel.evidencias} aportaciones recibidas · {sel.evidenciasAceptadas ?? 0} con revisión documental aceptada.
                  Esto no determina si la afirmación es correcta.
                </p>
              ) : null}
              {sel.documental ? (
                <p className={styles.metricas}>{ETIQUETAS_DOCUMENTALES[sel.documental]}</p>
              ) : null}
              {sel.registro === 'contraste' ? <p>Plan de contraste vinculado a una afirmación.</p> : null}
              {radiografia && sel.cuello > 0 ? (
                <div className={styles.cuello}>
                  <strong>Respaldo documental pendiente</strong>
                  <p>{sel.motivoCuello}</p>
                  <Link to={`/nodo/${encodeNodo(sel.id)}`}>Examinar el expediente y preparar el contraste</Link>
                </div>
              ) : null}
              <details>
                <summary>Qué significa cada conexión</summary>
                <p>
                  El tamaño representa conexiones, no gravedad. Una referencia entre notas no
                  demuestra causalidad.
                </p>
                <ul>
                  {d.grafo.aristas
                    .filter((a) => a.origen === sel.id || a.destino === sel.id)
                    .map((a) => (
                      <li key={`${a.origen}-${a.destino}-${a.tipo}`}>
                        <strong>{a.tipo || 'enlace'}</strong>: {porId.get(a.origen)?.titulo} →{' '}
                        {porId.get(a.destino)?.titulo}.{' '}
                        {a.etiqueta ||
                          (a.tipo === 'jerarquia'
                            ? 'Agrupación por árbol; no indica una causa directa.'
                            : 'Referencia documental; consultar el contenido.')}
                      </li>
                    ))}
                </ul>
              </details>
              <h3 className={styles.subtitulo}>Vecinos ({vecinosSel.length})</h3>
              {vecinosSel.length === 0 ? (
                <p className={styles.ayuda}>Sin vecinos en el grafo.</p>
              ) : (
                <ul className={styles.vecinos}>
                  {vecinosSel.slice(0, 8).map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        className={styles.vecino}
                        onClick={() => setSeleccionado(v.id)}
                      >
                        <Chip color={colorDeNodo(v.tipo, v.capa)}>{v.tipo}</Chip>
                        <span>{v.titulo}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {vecinosSel.length > 8 ? (
                <p className={styles.ayuda}>
                  <Link to={`/nodo/${encodeNodo(sel.id)}`}>
                    Ver todos ({vecinosSel.length}) en la nota
                  </Link>
                </p>
              ) : null}
              <Link to={`/nodo/${encodeNodo(sel.id)}`} className={styles.leer}>
                Leer nota completa
              </Link>
            </>
          ) : (
            <p className={styles.ayuda}>Pasa el cursor o haz clic en un nodo.</p>
          )}
        </aside>
      </div>

      <output className={styles.status}>
        {filtrados.length} {vista === 'causal' ? 'nodos causales en esta vista' : 'notas'} · {aristasVisibles.length} relaciones
        {radiografia ? ' · radiografía activa' : ''}
        {vista === 'documental' ? ` · red documental completa: densidad ${d.densidad.toFixed(3)} · modularidad ${d.modularidad.toFixed(2)}` : ' · propuestas sujetas a revisión'}
      </output>
    </div>
  );
}
