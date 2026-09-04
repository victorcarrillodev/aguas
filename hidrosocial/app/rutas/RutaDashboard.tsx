import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { useState } from 'react';

import { ListaMetricas } from '~/design-system/corrientes/ListaMetricas';
import { Boton } from '~/design-system/gotas/Boton';
import { Chip } from '~/design-system/gotas/Chip';
import { TablaMini } from '~/design-system/gotas/TablaMini';
import { Tarjeta } from '~/design-system/gotas/Tarjeta';
import { colorDeCapa } from '~/lib/colores';
import { encodeNodo } from '~/lib/rutas';
import { getVaultGraph } from '~/microprocesos/cache/index';
import { calcularMetricas, criticidadDe } from '~/microprocesos/dashboard/index';
import type { MetricasDashboard } from '~/microprocesos/dashboard/index';
import styles from './RutaDashboard.module.css';

export async function loader() {
  const g = await getVaultGraph();
  const metricas = calcularMetricas(g);
  return json(metricas);
}

const CAPAS = ['C0', 'C1', 'C2', 'C3', 'C4'] as const;

function colorCriticidad(c: 'alta' | 'media' | 'baja'): string {
  if (c === 'alta') return 'var(--error)';
  if (c === 'media') return 'var(--primary)';
  return 'var(--outline)';
}

// Cuenca: dashboard v2 (hero + 6 KPI tiles + causas filtrables + evidencias + brecha).
export default function RutaDashboard() {
  const m = useLoaderData<MetricasDashboard>();
  const [busqueda, setBusqueda] = useState('');
  const [capa, setCapa] = useState<string | null>(null);

  const causas = m.causas.filter((c) => {
    if (capa && c.capa !== capa) return false;
    const q = busqueda.trim().toLowerCase();
    if (q && !c.titulo.toLowerCase().includes(q)) return false;
    return true;
  });

  const brechaPct =
    m.brechas.total > 0
      ? Math.round((m.brechas.medicionesSinLineaBase / m.brechas.total) * 100)
      : 0;

  return (
    <div className={styles.cuenca}>
      <div className={styles.cabecera}>
        <div>
          <h1 className={styles.titulo}>Diagnóstico hidrosanitario del AMG</h1>
          <p className={styles.subtitulo}>
            {m.totalNotas} notas del vault · {m.evidencias.length} evidencias de campo ·{' '}
            {m.porTipo.causa} causas raíz
          </p>
        </div>
        <div className={styles.acciones}>
          <Boton to="/sistema">Ver el sistema</Boton>
          <Boton to="/captura" variante="secundario">
            Nueva evidencia
          </Boton>
          <Boton to="/grafo" variante="secundario">
            Explorar grafo
          </Boton>
        </div>
      </div>

      <ListaMetricas
        items={[
          {
            valor: m.porTipo.causa,
            etiqueta: 'Causas raíz',
            acento: colorDeCapa('C1'),
            icono: 'account_tree',
          },
          {
            valor: m.porTipo.ficha,
            etiqueta: 'Fichas',
            acento: colorDeCapa('C3'),
            icono: 'description',
          },
          {
            valor: m.porTipo.medicion,
            etiqueta: 'Mediciones',
            acento: '#D4A373',
            icono: 'monitoring',
          },
          { valor: m.porTipo.efecto, etiqueta: 'Efectos', acento: '#94A3B8', icono: 'waves' },
          {
            valor: m.porTipo.actor,
            etiqueta: 'Actores',
            acento: colorDeCapa('C2'),
            icono: 'groups',
          },
          {
            valor: m.medicionesSinLineaBase,
            etiqueta: 'Sin línea base',
            acento: 'var(--error)',
            sub: `de ${m.mediciones} mediciones`,
            icono: 'warning',
          },
        ]}
      />

      <div className={styles.columnas}>
        <Tarjeta titulo="Causas raíz">
          <div className={styles.filtros}>
            <input
              type="search"
              className={styles.buscador}
              placeholder="Filtrar causas…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Filtrar causas por título"
            />
            <fieldset className={styles.grupoFiltro}>
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
                  >
                    <span
                      className={styles.punto}
                      style={{ background: colorDeCapa(c) }}
                      aria-hidden="true"
                    />
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <TablaMini
            columnas={['Causa', 'Capa', 'Peso en el sistema', 'Fichas']}
            filas={causas.map((c) => {
              const crit = criticidadDe(c.sostieneA);
              return [
                <Link key={c.id} to={`/nodo/${encodeNodo(c.id)}`}>
                  {c.titulo}
                  {c.esRaiz ? <span className={styles.raiz}> raíz</span> : null}
                </Link>,
                <Chip key={`${c.id}-c`} color={colorDeCapa(c.capa)}>
                  {c.capa}
                </Chip>,
                <span
                  key={`${c.id}-crit`}
                  className={styles.criticidad}
                  style={{ color: colorCriticidad(crit) }}
                  title={`${c.sostieneA} causas dependen de ésta; ella depende de ${c.dependeDe}`}
                >
                  ● {crit}
                  <span className={styles.criticidadSub}>
                    {c.sostieneA === 0
                      ? 'nadie depende de ella'
                      : `${c.sostieneA} depende${c.sostieneA === 1 ? '' : 'n'} de ella`}
                  </span>
                </span>,
                String(c.fichas),
              ];
            })}
          />
          {causas.length === 0 ? (
            <p className={styles.vacio}>Sin causas para este filtro.</p>
          ) : null}
        </Tarjeta>

        <div className={styles.lateral}>
          <Tarjeta titulo="Evidencias recientes">
            {m.evidencias.length === 0 ? (
              <p className={styles.vacio}>
                Aún no hay evidencia de campo. <Link to="/captura">Captura la primera</Link>.
              </p>
            ) : (
              <ul className={styles.evidencias}>
                {m.evidencias.slice(0, 8).map((e) => (
                  <li key={e.relPath} className={styles.evidencia}>
                    {e.fecha ? <span className={styles.fecha}>{e.fecha}</span> : null}
                    <Link to={`/nodo/${encodeNodo(e.relPath)}`}>{e.titulo}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <Tarjeta titulo="Brecha de información">
            <p className={styles.brechaTexto}>
              {m.brechas.medicionesSinLineaBase} de {m.brechas.total} mediciones sin línea base
            </p>
            <div
              className={styles.barra}
              role="progressbar"
              tabIndex={0}
              aria-valuenow={brechaPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Mediciones sin línea base"
            >
              <div className={styles.relleno} style={{ width: `${brechaPct}%` }} />
            </div>
            <p className={styles.vacio}>
              <Link to="/captura">Capturar evidencia</Link> para cerrar la brecha.
            </p>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
