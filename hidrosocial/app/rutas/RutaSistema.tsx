import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { useMemo, useState } from 'react';

import { Boton } from '~/design-system/gotas/Boton';
import { Chip } from '~/design-system/gotas/Chip';
import { Metrica } from '~/design-system/gotas/Metrica';
import { Tarjeta } from '~/design-system/gotas/Tarjeta';
import { colorDeCapa } from '~/lib/colores';
import { getVaultGraph } from '~/microprocesos/cache/index';
import {
  actoresSinIncidencia,
  construirRed,
  desdeArboles,
  incidenciaActores,
  ordenRecomendado,
  simular,
} from '~/microprocesos/sistema/index';
import type { ArbolSistema, IncidenciaActor } from '~/microprocesos/sistema/index';
import type { ArbolId } from '~/microprocesos/vault-core/tipos';
import styles from './RutaSistema.module.css';

export async function loader() {
  const g = await getVaultGraph();
  const red = construirRed(g);
  return json({
    arboles: red.arboles,
    raices: red.raices,
    totalDependencias: red.totalDependencias,
    totalContactos: red.totalContactos,
    incidencia: incidenciaActores(g, red),
    sinIncidencia: actoresSinIncidencia(g, red),
  });
}

interface Datos {
  arboles: ArbolSistema[];
  raices: ArbolId[];
  totalDependencias: number;
  totalContactos: number;
  incidencia: IncidenciaActor[];
  sinIncidencia: string[];
}

/* ── Diagrama ─────────────────────────────────────────────────────────── */

const CAJA_W = 178;
const CAJA_H = 62;
const FILA_H = 132;
const MARGEN_Y = 34;
const HUECO_X = 22;
const ANCHO_MIN = 1040;

interface Punto {
  x: number;
  y: number;
}

interface Trazado {
  pos: Map<ArbolId, Punto>;
  ancho: number;
  alto: number;
}

/**
 * Posiciona los árboles por nivel: la raíz abajo, lo que depende de ella
 * arriba. El ancho del lienzo se calcula a partir del nivel más poblado para
 * que las cajas nunca se encimen (el contenedor hace scroll si hace falta).
 */
function posicionar(arboles: ArbolSistema[]): Trazado {
  const porNivel = new Map<number, ArbolSistema[]>();
  for (const a of arboles) {
    porNivel.set(a.nivel, [...(porNivel.get(a.nivel) ?? []), a]);
  }
  const maxNivel = Math.max(0, ...arboles.map((a) => a.nivel));
  const masPoblado = Math.max(1, ...[...porNivel.values()].map((f) => f.length));
  const ancho = Math.max(ANCHO_MIN, (masPoblado + 1) * (CAJA_W + HUECO_X));
  const alto = (maxNivel + 1) * FILA_H + MARGEN_Y;

  const pos = new Map<ArbolId, Punto>();
  for (const [nivel, fila] of porNivel) {
    // Los que más sostienen, al centro: reduce el cruce de flechas.
    const porPeso = [...fila].sort((a, b) => b.sostieneA.length - a.sostieneA.length);
    const centrada: ArbolSistema[] = [];
    porPeso.forEach((a, i) => {
      if (i % 2 === 0) centrada.push(a);
      else centrada.unshift(a);
    });
    const paso = ancho / (centrada.length + 1);
    centrada.forEach((a, i) => {
      pos.set(a.arbol, {
        x: paso * (i + 1),
        y: alto - MARGEN_Y - nivel * FILA_H - CAJA_H / 2,
      });
    });
  }
  return { pos, ancho, alto };
}

type Estado = 'sostenible' | 'fragil' | 'pendiente';

function colorEstado(estado: Estado): string {
  if (estado === 'sostenible') return 'var(--secondary)';
  if (estado === 'fragil') return 'var(--error)';
  return 'var(--outline-variant)';
}

/* ── Cuenca ───────────────────────────────────────────────────────────── */

export default function RutaSistema() {
  const datos = useLoaderData<Datos>();
  const red = useMemo(() => desdeArboles(datos.arboles), [datos.arboles]);
  const [resueltos, setResueltos] = useState<ArbolId[]>([]);
  const [foco, setFoco] = useState<ArbolId | null>(null);

  const sim = useMemo(() => simular(red, resueltos), [red, resueltos]);
  const { pos, ancho, alto } = useMemo(() => posicionar(datos.arboles), [datos.arboles]);

  const estados = useMemo(() => {
    const m = new Map<ArbolId, Estado>();
    for (const a of datos.arboles) m.set(a.arbol, 'pendiente');
    for (const a of sim.sostenibles) m.set(a, 'sostenible');
    for (const f of sim.fragiles) m.set(f.arbol, 'fragil');
    return m;
  }, [datos.arboles, sim]);

  const raiz = datos.arboles.find((a) => a.esRaiz);
  const enfocado = foco ? red.porArbol.get(foco) : undefined;

  function alternar(a: ArbolId) {
    setResueltos((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  const todosMenosRaiz = datos.arboles.filter((a) => !a.esRaiz).map((a) => a.arbol);
  const ordenRaiz = raiz ? ordenRecomendado(red, 'E10' as ArbolId) : [];

  return (
    <div className={styles.cuenca}>
      <header className={styles.hero}>
        <p className={styles.antetitulo}>Lógica del modelo</p>
        <h1 className={styles.titulo}>Qué supone cada explicación</h1>
        <p className={styles.entrada}>
          Las diez causas estructurales no son independientes: cada una declara de qué otras
          depende. Las relaciones son propuestas del diagnóstico en revisión. Este explorador
          comprueba su inclusión en una selección; no predice resultados ni sostenibilidad.
        </p>
      </header>

      <div className={styles.kpis}>
        <Metrica
          valor={datos.arboles.length}
          etiqueta="Causas estructurales"
          acento="var(--capa-c1)"
          icono="account_tree"
        />
        <Metrica
          valor={datos.totalDependencias}
          etiqueta="Dependencias declaradas"
          acento="var(--primary)"
          icono="arrow_upward"
          sub="un árbol da por supuesto a otro"
        />
        <Metrica
          valor={datos.totalContactos}
          etiqueta="Puntos de contacto"
          acento="var(--capa-c3)"
          icono="hub"
          sub="bisagras sin dirección"
        />
        <Metrica
          valor={raiz ? raiz.arbol : '—'}
          etiqueta="Sin supuestos externos registrados"
          acento="var(--error)"
          icono="warning"
          sub={raiz ? `${raiz.sostieneA.length} árboles dependen de ella` : undefined}
        />
      </div>

      {raiz ? (
        <Tarjeta>
          <div className={styles.raiz}>
            <span className={`material-symbols-outlined ${styles.raizIcono}`} aria-hidden="true">
              flag
            </span>
            <div>
              <h2 className={styles.raizTitulo}>
                {raiz.arbol} · {raiz.resumen}
              </h2>
              <p className={styles.raizTexto}>
                Este árbol no tiene supuestos externos registrados en esta red. Otros{' '}
                <strong>
                  {raiz.sostieneA.length} de {datos.arboles.length}
                </strong>{' '}
                lo declaran como supuesto. Esto describe el modelo actual, no prueba independencia
                causal. La raíz maestra propuesta tiene dos componentes: medición verificable y
                fiscalización. E8 desarrolla el segundo.
              </p>
              <Link to={`/nodo/${raiz.slug}`} className={styles.raizEnlace}>
                Leer la causa completa
              </Link>
            </div>
          </div>
        </Tarjeta>
      ) : null}

      {/* ── Simulador ────────────────────────────────────────────────── */}
      <Tarjeta>
        <div className={styles.simCabecera}>
          <div>
            <h2 className={styles.h2}>Explorador de supuestos</h2>
            <p className={styles.ayuda}>
              Selecciona causas para ver qué condiciones del modelo quedan incluidas y cuáles quedan
              fuera. Examina su evidencia antes de formular una intervención.
            </p>
          </div>
          <div className={styles.simAcciones}>
            <Boton variante="secundario" onClick={() => setResueltos(todosMenosRaiz)}>
              Todas salvo E8
            </Boton>
            <Boton variante="secundario" onClick={() => setResueltos(ordenRaiz)}>
              Supuestos de E10
            </Boton>
            <Boton variante="secundario" onClick={() => setResueltos([])}>
              Limpiar
            </Boton>
          </div>
        </div>

        <div className={styles.marcador}>
          <div className={styles.marcadorNumeros}>
            <span className={styles.marcadorGrande}>{sim.sostenibles.length}</span>
            <span className={styles.marcadorDe}>de {datos.arboles.length}</span>
            <span className={styles.marcadorEtiqueta}>causas con sus supuestos incluidos</span>
          </div>
          <div
            className={styles.barra}
            role="progressbar"
            tabIndex={0}
            aria-valuenow={sim.cobertura}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Causas con supuestos incluidos en la selección"
          >
            <span className={styles.barraRelleno} style={{ width: `${sim.cobertura}%` }} />
          </div>
          <p
            className={
              sim.sostenibles.length === 0 && sim.resueltos.length > 0
                ? styles.veredictoAlerta
                : styles.veredicto
            }
          >
            {sim.veredicto}
          </p>
        </div>

        <div className={styles.lienzo}>
          <svg
            viewBox={`0 0 ${ancho} ${alto}`}
            className={styles.svg}
            role="img"
            aria-label="Jerarquía de dependencias entre las diez causas estructurales"
          >
            <title>Jerarquía de dependencias entre las diez causas estructurales</title>
            <defs>
              <marker
                id="punta"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--outline)" />
              </marker>
            </defs>

            {datos.arboles.flatMap((a) =>
              a.dependeDe.map((dep) => {
                const desde = pos.get(a.arbol);
                const hasta = pos.get(dep);
                if (!desde || !hasta) return null;
                const activa = foco === a.arbol || foco === dep;
                const x1 = desde.x;
                const y1 = desde.y + CAJA_H / 2;
                const x2 = hasta.x;
                const y2 = hasta.y - CAJA_H / 2;
                const medio = (y1 + y2) / 2;
                return (
                  <path
                    key={`${a.arbol}-${dep}`}
                    d={`M ${x1} ${y1} C ${x1} ${medio}, ${x2} ${medio}, ${x2} ${y2}`}
                    className={activa ? styles.aristaActiva : styles.arista}
                    markerEnd="url(#punta)"
                  />
                );
              }),
            )}

            {datos.arboles.map((a) => {
              const p = pos.get(a.arbol);
              if (!p) return null;
              const estado = estados.get(a.arbol) ?? 'pendiente';
              const marcado = resueltos.includes(a.arbol);
              return (
                <g
                  key={a.arbol}
                  transform={`translate(${p.x - CAJA_W / 2} ${p.y - CAJA_H / 2})`}
                  className={styles.nodo}
                  onClick={() => alternar(a.arbol)}
                  onMouseEnter={() => setFoco(a.arbol)}
                  onMouseLeave={() => setFoco(null)}
                  onFocus={() => setFoco(a.arbol)}
                  onBlur={() => setFoco(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      alternar(a.arbol);
                    }
                  }}
                  tabIndex={0}
                  role="switch"
                  aria-checked={marcado}
                  aria-label={`${a.arbol}: ${a.resumen}`}
                >
                  <rect
                    width={CAJA_W}
                    height={CAJA_H}
                    rx="10"
                    className={styles.caja}
                    style={{
                      fill: marcado ? colorEstado(estado) : 'var(--surface-container-lowest)',
                      stroke: marcado ? colorEstado(estado) : 'var(--outline-variant)',
                    }}
                  />
                  <rect width="5" height={CAJA_H} rx="2.5" fill={colorDeCapa(a.capa)} />
                  <text x="16" y="25" className={marcado ? styles.idMarcado : styles.id}>
                    {a.arbol}
                  </text>
                  {a.esRaiz ? (
                    <text x={CAJA_W - 14} y="25" className={styles.raizTag} textAnchor="end">
                      base
                    </text>
                  ) : null}
                  <text
                    x="16"
                    y="45"
                    className={marcado ? styles.etiquetaMarcada : styles.etiqueta}
                  >
                    {a.resumen.length > 26 ? `${a.resumen.slice(0, 25)}…` : a.resumen}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className={styles.leyenda}>
            Las flechas apuntan hacia abajo, de cada causa al supuesto del que depende. Clic para
            incluir: <span className={styles.puntoSostenible} aria-hidden="true" /> supuestos
            incluidos · <span className={styles.puntoFragil} aria-hidden="true" /> supuestos fuera.
            La franja de color es la capa dominante.
          </p>
        </div>

        {sim.fragiles.length > 0 ? (
          <ul className={styles.fragiles}>
            {sim.fragiles.map((f) => (
              <li key={f.arbol}>
                <strong>{f.arbol}</strong> deja fuera los supuestos {f.falta.join(', ')}.
              </li>
            ))}
          </ul>
        ) : null}
      </Tarjeta>

      {/* ── Tabla ────────────────────────────────────────────────────── */}
      <Tarjeta titulo="El sistema, causa por causa">
        <div className={styles.scroll}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col">Causa</th>
                <th scope="col">Capa</th>
                <th scope="col">Depende de</th>
                <th scope="col">Es supuesto de</th>
                <th scope="col" className={styles.num}>
                  Supuestos transitivos
                </th>
                <th scope="col">Brecha ● ≠ ◆</th>
                <th scope="col" className={styles.num}>
                  Fichas
                </th>
              </tr>
            </thead>
            <tbody>
              {[...datos.arboles]
                .sort((a, b) => b.sostieneA.length - a.sostieneA.length || a.nivel - b.nivel)
                .map((a) => (
                  <tr
                    key={a.arbol}
                    className={foco === a.arbol ? styles.filaFoco : undefined}
                    onMouseEnter={() => setFoco(a.arbol)}
                    onMouseLeave={() => setFoco(null)}
                  >
                    <th scope="row" className={styles.celdaCausa}>
                      <Link to={`/nodo/${a.slug}`}>
                        {a.arbol} · {a.resumen}
                      </Link>
                      {a.esRaiz ? <span className={styles.badgeRaiz}>base de esta red</span> : null}
                    </th>
                    <td>
                      <Chip color={colorDeCapa(a.capa)}>{a.capa}</Chip>
                    </td>
                    <td className={styles.mono}>
                      {a.dependeDe.length ? a.dependeDe.join(', ') : '—'}
                    </td>
                    <td className={styles.mono}>
                      {a.sostieneA.length ? a.sostieneA.join(', ') : '—'}
                    </td>
                    <td className={styles.num}>
                      <span className={a.profundidad === 0 ? styles.cero : styles.cuenta}>
                        {a.profundidad}
                      </span>
                    </td>
                    <td>{a.brecha}</td>
                    <td className={styles.num}>{a.fichas}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className={styles.nota}>
          <strong>Supuestos transitivos</strong> incluye las dependencias de otras dependencias. Un
          0 significa que no se registraron supuestos externos; no demuestra independencia.
        </p>
      </Tarjeta>

      {enfocado ? (
        <Tarjeta titulo={`${enfocado.arbol} · ${enfocado.resumen}`}>
          <p className={styles.enunciado}>{enfocado.enunciado}</p>
          <dl className={styles.detalle}>
            <div>
              <dt>Ámbito</dt>
              <dd>{enfocado.ambito}</dd>
            </div>
            <div>
              <dt>Naturaleza</dt>
              <dd>{enfocado.naturaleza}</dd>
            </div>
            <div>
              <dt>Generación atribuida</dt>
              <dd>{enfocado.genera.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Debería resolverla</dt>
              <dd>{enfocado.debeResolver.join(', ') || '—'}</dd>
            </div>
          </dl>
        </Tarjeta>
      ) : null}

      {/* ── Incidencia de actores ────────────────────────────────────── */}
      <Tarjeta titulo="Quién causa y quién debería resolver">
        <p className={styles.ayuda}>
          Para cada actor, en cuántas causas aparece como quien <strong>genera</strong> el problema
          y en cuántas como quien <strong>debería resolverlo</strong>. La diferencia entre las dos
          columnas es la lectura que importa.
        </p>
        <ul className={styles.actores}>
          {datos.incidencia.map((a) => {
            const tope = Math.max(
              1,
              ...datos.incidencia.map((x) => Math.max(x.genera.length, x.debeResolver.length)),
            );
            return (
              <li key={a.codigo} className={styles.actor}>
                <div className={styles.actorNombre}>
                  <strong>{a.codigo}</strong>
                  <span>{a.nombre}</span>
                </div>
                <div className={styles.balanza}>
                  <div className={styles.ladoIzq}>
                    <span
                      className={styles.barraGenera}
                      style={{ width: `${(a.genera.length / tope) * 100}%` }}
                    />
                    <span className={styles.cifra}>{a.genera.length}</span>
                  </div>
                  <div className={styles.ladoDer}>
                    <span className={styles.cifra}>{a.debeResolver.length}</span>
                    <span
                      className={styles.barraResuelve}
                      style={{ width: `${(a.debeResolver.length / tope) * 100}%` }}
                    />
                  </div>
                </div>
                <span className={styles.lectura}>{a.lectura}</span>
              </li>
            );
          })}
        </ul>
        <div className={styles.piesActores}>
          <p className={styles.nota}>
            <span className={styles.claveGenera} aria-hidden="true" /> genera ·{' '}
            <span className={styles.claveResuelve} aria-hidden="true" /> debería resolver. Cuenta
            presencia, no peso: un actor puede aparecer pocas veces y hacerlo en la raíz.
          </p>
          {datos.sinIncidencia.length > 0 ? (
            <p className={styles.nota}>
              Sin incidencia asignada en ninguna causa: {datos.sinIncidencia.join(' · ')}.
            </p>
          ) : null}
        </div>
      </Tarjeta>
    </div>
  );
}
