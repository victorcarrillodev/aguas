import type { ReactNode } from 'react';

import styles from './PanelAcceso.module.css';

interface Props {
  titulo: string;
  descripcion: string;
  /** Mensaje de estado (sesión cerrada, por ejemplo). */
  aviso?: ReactNode;
  /** El formulario, o el aviso de que el acceso no está configurado. */
  children: ReactNode;
  pie?: ReactNode;
}

/**
 * Cauce: pantalla de acceso a dos paneles. El panel de marca es decorativo y
 * queda oculto a los lectores de pantalla; el contenido vive en el derecho.
 */
export function PanelAcceso({ titulo, descripcion, aviso, children, pie }: Props) {
  return (
    <div className={styles.pantalla}>
      <section className={styles.marca} aria-hidden="true">
        <div className={styles.marcaInterior}>
          <img src="/calidad/favicon.svg" alt="" className={styles.gota} />
          <p className={styles.marcaTitulo}>Hidrosocial</p>
          <p className={styles.marcaTexto}>
            Diagnóstico hidrosanitario del AMG. Expediente en revisión: evidencia de campo,
            mediciones y actores identificados.
          </p>
          <p className={styles.marcaPie}>Acceso restringido al equipo de investigación</p>
        </div>
        <div className={styles.olas} />
      </section>

      <main className={styles.panel}>
        <div className={styles.tarjeta}>
          <p className={styles.marcaMovil}>
            <img src="/calidad/favicon.svg" alt="" className={styles.gotaMovil} />
            Hidrosocial
          </p>
          <h1 className={styles.titulo}>{titulo}</h1>
          <p className={styles.descripcion}>{descripcion}</p>
          {aviso ? <output className={styles.aviso}>{aviso}</output> : null}
          {children}
          {pie ? <p className={styles.pie}>{pie}</p> : null}
        </div>
      </main>
    </div>
  );
}
