import type { ReactNode } from 'react';

import styles from './Chip.module.css';

interface Props {
  children: ReactNode;
  color?: string;
}

/** Gota: badge de capa/tipo con punto de color. */
export function Chip({ children, color = '#9CA3AF' }: Props) {
  return (
    <span className={styles.chip}>
      <span className={styles.punto} style={{ background: color }} aria-hidden="true" />
      {children}
    </span>
  );
}
