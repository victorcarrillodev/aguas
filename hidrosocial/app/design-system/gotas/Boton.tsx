import { Link } from '@remix-run/react';
import type { ReactNode } from 'react';

import styles from './Boton.module.css';

interface Props {
  children: ReactNode;
  to?: string;
  type?: 'button' | 'submit';
  variante?: 'primario' | 'secundario' | 'fantasma';
  disabled?: boolean;
  onClick?: () => void;
}

/** Gota: botón primario/secundario/fantasma (enlace si recibe `to`). */
export function Boton({
  children,
  to,
  type = 'button',
  variante = 'primario',
  disabled,
  onClick,
}: Props) {
  const clase = `${styles.boton} ${styles[variante]}`;
  if (to) {
    return (
      <Link to={to} className={clase}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={clase} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
