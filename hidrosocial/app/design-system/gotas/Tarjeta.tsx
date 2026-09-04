import type { ReactNode } from 'react';

import styles from './Tarjeta.module.css';

interface Props {
  children: ReactNode;
  titulo?: string;
}

/** Gota: contenedor de superficie con borde. */
export function Tarjeta({ children, titulo }: Props) {
  return (
    <section className={styles.tarjeta}>
      {titulo ? <h2 className={styles.titulo}>{titulo}</h2> : null}
      {children}
    </section>
  );
}
