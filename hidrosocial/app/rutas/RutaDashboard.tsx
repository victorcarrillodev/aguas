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
import { calcularMetricas } from '~/microprocesos/dashboard/index';
import type { MetricasDashboard } from '~/microprocesos/dashboard/index';
import styles from './RutaDashboard.module.css';

export async function loader() {
  const g = await getVaultGraph();
  const metricas = calcularMetricas(g);
  return json(metricas);
}

const CAPAS = ['C0', 'C1', 'C2', 'C3', 'C4'] as const;

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
            {m.porTipo.causa} causas estructurales · documento en revisión
          </p>
        </div>
        <div className={styles.acciones}>
          <Boton to="/grafo">Árbol maestro N1–N4</Boton>
          <Boton to="/sistema" variante="secundario">Supuestos entre árboles</Boton>
          <Boton to="/revision">Investigar y contrastar</Boton>
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
          { valor: m.porNivel.N1, etiqueta: 'N1 · Problema central', acento: 'var(--primary)', icono: 'account_tree' },
          {
            valor: m.porNivel.N2,
            etiqueta: 'N2 · Causas estructurales',
            acento: colorDeCapa('C1'),
            icono: 'account_tree',
          },
          {
            valor: m.porNivel.N3,
            etiqueta: 'N3 · Causas directas',
            acento: colorDeCapa('C3'),
            icono: 'description',
          },
          { valor: m.porNivel.N4, etiqueta: 'N4 · Causas subyacentes', acento: colorDeCapa('C3'), icono: 'account_tree' },
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
      <p>Los niveles N cuentan condiciones del árbol; C0–C4 son capas de lectura.
        Efectos, actores, indicadores y documentos tienen conteos separados.
        {' '}{m.nodosIntegrados} nodos con integración documentada en la copia local.
        La presencia de una ficha o una fuente no equivale a aprobación del Consejo.</p>

      <div className={styles.columnas}>
        <Tarjeta titulo="Causas estructurales en revisión">
          <p>
            El modelo propone un servicio deficiente, inequitativo e insostenible para habitantes
            del AMG, cuenca y erario.{' '}
            <Link to="/revision">
              Comprende el problema, examina su evidencia y registra una revisión.
            </Link>
          </p>
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
            columnas={['Causa N2', 'Capa dominante', 'Referencias como supuesto', 'Directas N3', 'Subyacentes N4', 'N3 sin desglose N4']}
            filas={causas.map((c) => {
              return [
                <Link key={c.id} to={`/nodo/${encodeNodo(c.id)}`}>
                  {c.titulo}
                </Link>,
                <Chip key={`${c.id}-c`} color={colorDeCapa(c.capa)}>
                  {c.capa}
                </Chip>,
                <span
                  key={`${c.id}-crit`}
                  className={styles.criticidad}
                  title={`${c.sostieneA} causas dependen de ésta; ella depende de ${c.dependeDe}`}
                >
                  {c.sostieneA} referencias
                  <span className={styles.criticidadSub}>
                    {c.sostieneA === 0
                      ? 'sin referencias registradas'
                      : `${c.sostieneA} depende${c.sostieneA === 1 ? '' : 'n'} de ella`}
                  </span>
                </span>,
                String(c.directas), String(c.subyacentes), String(c.directasSinDesglose),
              ];
            })}
          />
          <p>Un desglose pendiente indica trabajo por desarrollar o deliberar, no ausencia demostrada de causas.
            La pauta de profundidad no se completa inventando nodos.</p>
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
              <Link to="/revision">Documentar la búsqueda y el dato</Link>. Una casilla pendiente no
              demuestra inexistencia de información ni se completa solo al agregar evidencia.
            </p>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
