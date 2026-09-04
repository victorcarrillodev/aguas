import { Link } from '@remix-run/react';

import { encodeNodo } from '~/lib/rutas';
import styles from './NavegacionLateral.module.css';

interface Destino {
  id: string;
  titulo: string;
}

interface Props {
  titulo: string;
  destinos: Destino[];
  base?: 'nodo' | 'grafo';
}

/** Cauce: nav lateral (índice de destinos dentro de una vista). */
export function NavegacionLateral({ titulo, destinos, base = 'nodo' }: Props) {
  return (
    <nav className={styles.lateral} aria-label={titulo}>
      <h2 className={styles.titulo}>{titulo}</h2>
      {destinos.length === 0 ? (
        <p className={styles.vacio}>Vacío.</p>
      ) : (
        <ul className={styles.lista}>
          {destinos.map((d) => (
            <li key={d.id}>
              <Link to={`/${base}/${encodeNodo(d.id)}`} className={styles.enlace}>
                {d.titulo}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
