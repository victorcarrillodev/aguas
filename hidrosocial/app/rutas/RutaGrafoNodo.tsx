import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';

import { decodeNodo } from '~/lib/rutas';
import { getVaultGraph } from '~/microprocesos/cache/index';
import { construirGrafoRender, densidad, modularidad } from '~/microprocesos/grafo/index';
import { requerirSesion } from '~/microprocesos/sesion/index.server';
import type { DatosExplorador } from './ExploradorGrafo';
import { ExploradorGrafo } from './ExploradorGrafo';
import styles from './RutaGrafoNodo.module.css';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await requerirSesion(request);
  let id: string;
  try {
    id = decodeNodo(params.nodeId ?? '');
  } catch {
    throw new Response('Nodo inválido', { status: 404 });
  }
  const g = await getVaultGraph();
  const nodo = g.nodos.get(id);
  if (!nodo) throw new Response('Nodo no encontrado', { status: 404 });
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
    focoInicial: id,
  };
  return json(datos);
}

// /grafo/:nodeId — mismo explorador con foco e inspector poblado.
export default function RutaGrafoNodo() {
  const d = useLoaderData<DatosExplorador>();
  return (
    <div className={styles.cuenca}>
      <Link to="/grafo" className={styles.volver}>
        ← Volver al grafo
      </Link>
      <ExploradorGrafo {...d} />
    </div>
  );
}
