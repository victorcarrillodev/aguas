import { NavLink } from '@remix-run/react';

import styles from './NavegacionInferior.module.css';

const ENLACES = [
  { to: '/', etiqueta: 'Panel', icono: 'dashboard', fin: true },
  { to: '/sistema', etiqueta: 'Sistema', icono: 'account_tree', fin: false },
  { to: '/revision', etiqueta: 'Investigar', icono: 'science', fin: false },
  { to: '/captura', etiqueta: 'Captura', icono: 'add_circle', fin: false },
  { to: '/grafo', etiqueta: 'Grafo', icono: 'hub', fin: false },
];

/** Cauce: barra fija inferior solo en móvil (<1024px); 4 botones-icono ≥44px. */
export function NavegacionInferior() {
  return (
    <nav className={styles.barra} aria-label="Vistas">
      {ENLACES.map((e) => (
        <NavLink
          key={e.to}
          to={e.to}
          end={e.fin}
          className={({ isActive }) => (isActive ? styles.activo : styles.enlace)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {e.icono}
          </span>
          <span className={styles.etiqueta}>{e.etiqueta}</span>
        </NavLink>
      ))}
    </nav>
  );
}
