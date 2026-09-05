import { Form, Link, NavLink, useNavigate, useSearchParams } from '@remix-run/react';
import { useEffect, useRef } from 'react';

import styles from './EncabezadoApp.module.css';

const ENLACES = [
  { to: '/', etiqueta: 'Panel', fin: true },
  { to: '/sistema', etiqueta: 'Sistema', fin: false },
  { to: '/captura', etiqueta: 'Captura', fin: false },
  { to: '/grafo', etiqueta: 'Grafo', fin: false },
];

/** Cauce: header sticky + nav píldora (≥1024px) + buscador con Ctrl+K → `/grafo?q=`. */
export function EncabezadoApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    function alTeclar(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', alTeclar);
    return () => window.removeEventListener('keydown', alTeclar);
  }, []);

  return (
    <header className={styles.encabezado}>
      <div className={styles.interior}>
        <Link to="/" className={styles.marca}>
          <img src="/calidad/favicon.svg" alt="" className={styles.gota} aria-hidden="true" />
          <span>Hidrosocial</span>
        </Link>
        <Form
          method="get"
          action="/grafo"
          className={styles.buscador}
          onSubmit={(e) => {
            e.preventDefault();
            const q = inputRef.current?.value.trim() ?? '';
            navigate(q ? `/grafo?q=${encodeURIComponent(q)}` : '/grafo');
          }}
        >
          <span className={`material-symbols-outlined ${styles.lupa}`} aria-hidden="true">
            search
          </span>
          <input
            ref={inputRef}
            name="q"
            type="search"
            className={styles.entrada}
            placeholder="Buscar (Ctrl+K)"
            defaultValue={params.get('q') ?? ''}
            aria-label="Buscar en el grafo"
          />
        </Form>
        <nav aria-label="Vistas" className={styles.navWrap}>
          <ul className={styles.nav}>
            {ENLACES.map((e) => (
              <li key={e.to}>
                <NavLink
                  to={e.to}
                  end={e.fin}
                  className={({ isActive }) => (isActive ? styles.activo : styles.enlace)}
                >
                  {e.etiqueta}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
