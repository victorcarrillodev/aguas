import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { encodeNodo } from '~/lib/rutas';
import { getVaultGraph } from '~/microprocesos/cache/index';
import {
  ETIQUETAS_DATO,
  estadoDocumental,
  evidenciaUtilizable,
  esEvidencia,
  estadoDato,
  estadoRevision,
  origenDe,
  registrosDe,
  valor,
} from '~/microprocesos/revision/index';
import styles from './RutaRevision.module.css';

export async function loader() {
  const g = await getVaultGraph();
  const notas = [...g.nodos.values()];
  const filas = notas
    .filter((n) => ['causa', 'ficha', 'medicion'].includes(n.tipo))
    .map((n) => {
      const registros = registrosDe(g, n.id);
      const ev = registros.filter(esEvidencia);
      const revisadas = ev.filter((r) => evidenciaUtilizable(g, r));
      const documentales = ev.map((r) => estadoDocumental(g, r));
      return {
        id: n.id,
        titulo: n.titulo,
        tipo: n.tipo,
        arbol: n.arbol,
        texto: valor(n.frontmatter.enunciado) || n.resumen,
        origen: origenDe(n),
        estado: estadoRevision(n, registros),
        dato: estadoDato(n, registros),
        evidencia: ev.length,
        apoya: ev.filter((r) => r.frontmatter.relacion === 'apoya').length,
        contradice: ev.filter((r) => r.frontmatter.relacion === 'contradice').length,
        documentadas: revisadas.length,
        apoyoDocumentado: revisadas.filter((r) => r.frontmatter.relacion === 'apoya').length,
        contradiceDocumentada: revisadas.filter((r) => r.frontmatter.relacion === 'contradice').length,
        pendientes: documentales.filter((e) => e === 'pendiente' || e === 'revisar').length,
        rechazadas: documentales.filter((e) => e === 'rechazada').length,
        planes: registros.filter((r) => r.frontmatter.registro === 'contraste').length,
        revisiones: registros.filter((r) => !!r.frontmatter.registro).length,
        abierta: n.frontmatter.vigilar === 'true',
        sinClasificar: n.frontmatter.pendiente_clasificar === 'true',
      };
    });
  return json({
    filas,
    sinVincular: notas
      .filter(
        (n) => esEvidencia(n) && (!n.frontmatter.nodo_id || !g.nodos.has(n.frontmatter.nodo_id)),
      )
      .map((n) => ({ id: n.id, titulo: n.titulo })),
    problemas: notas
      .filter((n) => n.tipo === 'problema')
      .map((n) => ({ id: n.id, titulo: n.titulo })),
  });
}

export default function RutaRevision() {
  const { filas, sinVincular, problemas } = useLoaderData<typeof loader>();
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [filtro, setFiltro] = useState('');
  const visibles = filas.filter(
    (n) =>
      (!tipo || n.tipo === tipo) &&
      `${n.titulo} ${n.texto}`.toLocaleLowerCase('es').includes(q.toLocaleLowerCase('es')) &&
      (!filtro ||
        (filtro === 'sin-evidencia' && !n.evidencia) ||
        (filtro === 'contraprueba' && n.contradice > 0) ||
        (filtro === 'documental' && n.pendientes > 0) ||
        (filtro === 'sin-contraste' && n.planes === 0) ||
        (filtro === 'abierta' && (n.abierta || n.sinClasificar)) ||
        (filtro === 'datos' && n.tipo === 'medicion' && n.dato !== 'incorporado')),
  );
  return (
    <main className={styles.pagina}>
      <header className={styles.hero}>
        <p>Documento de trabajo · Consejo Social y Científico por el Agua</p>
        <h1>¿Y si estamos equivocados?</h1>
        <p>
          Un diagnóstico se fortalece cuando podemos cuestionarlo. Sigue una afirmación hasta su
          fuente, busca una excepción y deja una revisión que otras personas puedan examinar.
        </p>
        <p>
          Los conteos muestran el avance documental. La gravedad del daño y las prioridades
          requieren criterios y acuerdos propios.
        </p>
        <div className={styles.acciones}>
          <Link to="/sistema">Explorar los supuestos del sistema →</Link>
          <Link to={`/nodo/${encodeNodo('7 · El método/Cómo aportar y revisar evidencia.md')}`}>
            Cómo enviar y revisar una aportación
          </Link>
        </div>
      </header>
      <section className={styles.tarjeta} aria-label="Comprender el problema">
        <h2>El punto de partida</h2>
        <p>
          El diagnóstico propone que habitantes del AMG, cuenca y erario padecen un servicio de agua
          y saneamiento deficiente, inequitativo e insostenible. Diez causas estructurales
          desarrollan esa explicación, todavía en revisión.
        </p>
        <div className={styles.puentes}>
          <div>
            <strong>Medición verificable</strong>
            <p>Qué ocurre, dónde, a quién afecta y con qué información puede comprobarse.</p>
          </div>
          <div>
            <strong>Fiscalización</strong>
            <p>Cómo se evalúa el desempeño, se da seguimiento y se determinan consecuencias.</p>
          </div>
        </div>
        <p>
          Son los dos componentes de la raíz maestra propuesta. E8 desarrolla el de fiscalización;
          la red de diez árboles no reemplaza el modelo completo.
        </p>
        <div className={styles.acciones}>
          {problemas.map((n) => (
            <Link key={n.id} to={`/nodo/${encodeNodo(n.id)}`}>
              {n.titulo}
            </Link>
          ))}
        </div>
      </section>
      <div className={styles.cuentas}>
        <div className={styles.cuenta}>
          <strong>{filas.filter((n) => n.origen).length}</strong>afirmaciones con correspondencia en
          el Excel
        </div>
        <div className={styles.cuenta}>
          <strong>{filas.filter((n) => n.evidencia > 0).length}</strong>fichas, causas o indicadores
          con evidencia vinculada
        </div>
        <div className={styles.cuenta}>
          <strong>{filas.filter((n) => n.contradiceDocumentada > 0).length}</strong>afirmaciones con
          contrapruebas cuyo respaldo documental fue aceptado
        </div>
        <div className={styles.cuenta}>
          <strong>{filas.filter((n) => n.planes > 0).length}</strong>expedientes con un plan de
          contraste registrado
        </div>
      </div>
      <section className={styles.tarjeta}>
        <h2>Hipótesis rivales: qué nos haría cambiar de opinión</h2>
        <p>
          Antes de salir a campo o volver a analizar datos, abre un expediente y crea un plan de
          contraste: una explicación alternativa, un resultado esperado y el criterio que te haría
          revisar la afirmación. Vincula las observaciones al plan para comparar lo previsto con lo
          encontrado. También puedes registrar un plan con datos ya conocidos, indicando ese momento.
        </p>
        <p className={styles.meta}>
          La aceptación documental permite examinar una fuente; no demuestra causalidad. Una
          contraprueba puede ser útil aunque todavía no permita resolver la discusión. Los registros
          pendientes, en revisión o rechazados permanecen visibles y no se cuentan como respaldo
          documental aceptado.
        </p>
      </section>
      <section className={styles.tarjeta}>
        <h2>Cinco recorridos para investigar</h2>
        <p>
          Comprender el problema → examinar la explicación → contrastar evidencia → deliberar →
          preparar la medición. Abre un expediente para seguir el recorrido completo.
        </p>
        <div className={styles.filtros}>
          <label>
            Buscar afirmación
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tandeo, tarifa, calidad…"
            />
          </label>
          <label>
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="causa">Causas estructurales</option>
              <option value="ficha">Fichas</option>
              <option value="medicion">Indicadores</option>
            </select>
          </label>
          <label>
            Qué revisar
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todo</option>
              <option value="sin-evidencia">Sin evidencia vinculada</option>
              <option value="contraprueba">Con contrapruebas recibidas</option>
              <option value="documental">Revisión documental pendiente</option>
              <option value="sin-contraste">Sin plan de contraste</option>
              <option value="abierta">Preguntas o clasificación pendientes</option>
              <option value="datos">Datos pendientes</option>
            </select>
          </label>
        </div>
        <output>{visibles.length} expedientes</output>
      </section>
      <div className={styles.lista}>
        {visibles.map((n) => (
          <article key={n.id} className={styles.tarjeta}>
            <span className={styles.meta}>
              {n.arbol} · {n.tipo} · {n.tipo === 'medicion' ? ETIQUETAS_DATO[n.dato] : n.estado}
            </span>
            <h2>
              <Link to={`/nodo/${encodeNodo(n.id)}`}>{n.titulo}</Link>
            </h2>
            <p>{n.texto}</p>
            {n.origen ? <p className={styles.meta}>Correspondencia: {n.origen}</p> : null}
            <p className={styles.meta}>
              {n.evidencia} evidencias recibidas: {n.apoya} declaran apoyo y {n.contradice} contradicción.
            </p>
            <p className={styles.meta}>
              Respaldo documental aceptado: {n.documentadas}; de ellas, {n.apoyoDocumentado} declaran
              apoyo y {n.contradiceDocumentada} contradicción. Pendientes o en revisión: {n.pendientes}.
              Rechazadas: {n.rechazadas}.
            </p>
            <p className={styles.meta}>{n.planes} planes de contraste · {n.revisiones} entradas al historial</p>
            {n.abierta ? <p>Pregunta abierta: revisar su posición causal.</p> : null}
            {n.sinClasificar ? (
              <p className={styles.meta}>Clasificación y atribuciones pendientes de completar.</p>
            ) : null}
            <div className={styles.acciones}>
              <Link to={`/nodo/${encodeNodo(n.id)}`}>Abrir expediente</Link>
              <Link to={`/captura?nodo=${encodeNodo(n.id)}&relacion=contradice`}>
                Aportar contraprueba
              </Link>
            </div>
          </article>
        ))}
      </div>
      {!visibles.length ? <p>No hay expedientes para estos filtros.</p> : null}
      <details className={styles.tarjeta}>
        <summary>Correspondencias y límites de la migración</summary>
        <p>
          Las 57 fichas y las diez causas tienen correspondencia con
          260831_DX_correlacion_AP_capas.xlsx. El registro 3.B.1 (Nodos!A3:Y3) no tiene una
          equivalencia aprobada: su tema aparece en E4.5 y E5.4. Se conserva como pendiente de
          conciliación; no se agrega otra causa ni se cuenta doble.
        </p>
        <p>
          Revisar con el Consejo: clasificación de E6 en SANE, atribuciones de E2 y comparación
          entre SIAPA y su área SANE en E5. Son cuestiones heredadas de la fuente; no se corrigieron
          como si ya hubiera un acuerdo.
        </p>
      </details>
      <details className={styles.tarjeta}>
        <summary>Notas de evidencia pendientes de vinculación ({sinVincular.length})</summary>
        <ul>
          {sinVincular.map((n) => (
            <li key={n.id}>
              <Link to={`/nodo/${encodeNodo(n.id)}`}>{n.titulo}</Link>
            </li>
          ))}
        </ul>
        <p>
          Las notas anteriores se conservan. Su sola presencia no se cuenta como respaldo de una
          afirmación concreta.
        </p>
      </details>
    </main>
  );
}
