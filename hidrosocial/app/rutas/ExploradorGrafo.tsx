import { Link } from '@remix-run/react';
import { useMemo, useState } from 'react';

import { Chip } from '~/design-system/gotas/Chip';
import { colorDeCapa, colorDeNodo, colorDeTipo } from '~/lib/colores';
import { encodeNodo } from '~/lib/rutas';
import { normalizar } from '~/microprocesos/busqueda/index';
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
}

const TIPOS_PILL: { id: VaultNodeType; etiqueta: string }[] = [
  { id: 'causa', etiqueta: 'Causas' },
  { id: 'ficha', etiqueta: 'Fichas' },
  { id: 'actor', etiqueta: 'Actores' },
  { id: 'efecto', etiqueta: 'Efectos' },
  { id: 'medicion', etiqueta: 'Mediciones' },
  { id: 'problema', etiqueta: 'Problemas' },
  { id: 'evidencia', etiqueta: 'Evidencias' },
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

  const porId = useMemo(() => new Map(d.grafo.nodos.map((n) => [n.id, n])), [d.grafo]);

  const filtrados = useMemo(() => {
    const terms = normalizar(q.trim()).split(/\s+/).filter(Boolean);
    return d.grafo.nodos.filter((n) => {
      if (tipo && n.tipo !== tipo) return false;
      if (capa && n.capa !== capa) return false;
      if (terms.length > 0) {
        const hay = normalizar(`${n.titulo} ${n.tipo} ${n.capa ?? ''} ${n.id}`);
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [d.grafo, tipo, capa, q]);

  const dentro = useMemo(() => new Set(filtrados.map((n) => n.id)), [filtrados]);
  const aristasVisibles = useMemo(
    () => d.grafo.aristas.filter((a) => dentro.has(a.origen) && dentro.has(a.destino)),
    [d.grafo, dentro],
  );

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
        <fieldset className={styles.pillsGrupo}>
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
        </fieldset>
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
            nodos={filtrados}
            aristas={aristasVisibles}
            foco={seleccionado ?? undefined}
            onSeleccionar={setSeleccionado}
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
                {sel.capa ? <Chip color={colorDeCapa(sel.capa)}>{sel.capa}</Chip> : null}
              </div>
              <h2 className={styles.tituloNodo}>{sel.titulo}</h2>
              {d.resumenes[sel.id] ? <p className={styles.resumen}>{d.resumenes[sel.id]}</p> : null}
              <p className={styles.metricas}>{vecinosSel.length} vecinos conectados</p>
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
        {filtrados.length} nodos · {aristasVisibles.length} aristas · densidad{' '}
        {d.densidad.toFixed(3)} · modularidad {d.modularidad.toFixed(2)}
      </output>
    </div>
  );
}
