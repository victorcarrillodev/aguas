import type { ReactNode } from 'react';

import styles from './FormBloque.module.css';

interface Props {
  titulo: string;
  descripcion?: string;
  /** Numeración del bloque (captura v2: 1/2/3). */
  numero?: number;
  children: ReactNode;
}

/** Corriente: sección de formulario con título + campos (+ número opcional). */
export function FormBloque({ titulo, descripcion, numero, children }: Props) {
  return (
    <fieldset className={styles.bloque}>
      <legend className={styles.titulo}>
        {numero !== undefined ? (
          <span className={styles.numero} aria-hidden="true">
            {numero}
          </span>
        ) : null}
        {titulo}
      </legend>
      {descripcion ? <p className={styles.descripcion}>{descripcion}</p> : null}
      <div className={styles.campos}>{children}</div>
    </fieldset>
  );
}
