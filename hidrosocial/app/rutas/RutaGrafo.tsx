import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { getVaultGraph } from '~/microprocesos/cache/index';
import { construirGrafoRender, densidad, modularidad } from '~/microprocesos/grafo/index';
import type { CapaId, VaultNodeType } from '~/microprocesos/vault-core/tipos';
import type { DatosExplorador } from './ExploradorGrafo';
import { ExploradorGrafo } from './ExploradorGrafo';
import styles from './RutaGrafo.module.css';

const TIPOS = new Set([
  'problema',
  'causa',
  'ficha',
  'actor',
  'efecto',
  'medicion',
  'metodo',
  'evidencia',
  'indice',
]);
const CAPAS = new Set(['C0', 'C1', 'C2', 'C3', 'C4']);

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const tipoParam = url.searchParams.get('tipo');
  const capaParam = url.searchParams.get('capa');
  const q = url.searchParams.get('q') ?? '';
  const tipo = tipoParam && TIPOS.has(tipoParam) ? (tipoParam as VaultNodeType) : null;
  const capa = capaParam && CAPAS.has(capaParam) ? (capaParam as CapaId) : null;
  const g = await getVaultGraph();
  const grafo = construirGrafoRender(g);
  const conteos: Record<string, number> = {};
  for (const n of g.nodos.values()) conteos[n.tipo] = (conteos[n.tipo] ?? 0) + 1;
  const resumenes: Record<string, string> = {};
  for (const n of g.nodos.values()) resumenes[n.id] = n.resumen;
  const datos: DatosExplorador = {
    grafo,
    conteos,
    densidad: densidad(g),
    modularidad: modularidad(g),
    resumenes,
    tipoInicial: tipo,
    capaInicial: capa,
    qInicial: q,
  };
  return json(datos);
}

// Cuenca: explorador estilo Obsidian (filtros + lienzo + inspector + status).
export default function RutaGrafo() {
  const datos = useLoaderData<DatosExplorador>();
  return (
    <div className={styles.cuenca}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Explorador del grafo</h1>
        <p className={styles.subtitulo}>
          {datos.grafo.nodos.length} nodos · {datos.grafo.aristas.length} relaciones · clic en un
          nodo para inspeccionarlo
        </p>
      </div>
      <ExploradorGrafo {...datos} />
    </div>
  );
}
