import type { PGlite } from '@electric-sql/pglite';
import type { BaseDatos, Consulta } from '../app/microprocesos/persistencia/repositorio';

type Conexion = Pick<PGlite, 'query' | 'exec'>;

function consulta(conexion: Conexion): Consulta {
  return {
    async query<T extends Record<string, unknown>>(texto: string, valores?: unknown[]) {
      if (!valores && texto.includes(';')) {
        const resultados = await conexion.exec(texto);
        return { rows: (resultados.at(-1)?.rows ?? []) as T[] };
      }
      const resultado = await conexion.query<T>(texto, valores);
      return { rows: resultado.rows };
    },
  };
}

export function basePostgresPrueba(pg: PGlite): BaseDatos {
  return {
    ...consulta(pg),
    transaction: (fn) => pg.transaction((tx) => fn(consulta(tx))),
  };
}
