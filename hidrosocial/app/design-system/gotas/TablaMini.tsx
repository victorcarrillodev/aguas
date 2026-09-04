import type { ReactNode } from 'react';

import styles from './TablaMini.module.css';

interface Props {
  columnas: string[];
  filas: ReactNode[][];
}

/** Gota: tabla simple cabecera + cuerpo. */
export function TablaMini({ columnas, filas }: Props) {
  return (
    <div className={styles.contenedor}>
      <table className={styles.tabla}>
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i}>
              {f.map((celda, j) => (
                <td key={j}>{celda}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
