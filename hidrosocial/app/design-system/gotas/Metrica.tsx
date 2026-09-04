import styles from './Metrica.module.css';

interface Props {
  valor: number | string;
  etiqueta: string;
  acento?: string;
  sub?: string;
  /** Nombre del icono material-symbols (p. ej. `groups`); opcional. */
  icono?: string;
}

/** Gota: número grande + etiqueta + acento de color + icono opcional. */
export function Metrica({ valor, etiqueta, acento = 'var(--primary)', sub, icono }: Props) {
  return (
    <div className={styles.metrica} style={{ borderTopColor: acento }}>
      <div className={styles.cabecera}>
        {icono ? (
          <span className={`material-symbols-outlined ${styles.icono}`} aria-hidden="true">
            {icono}
          </span>
        ) : null}
        <div className={styles.valor}>{valor}</div>
      </div>
      <div className={styles.etiqueta}>{etiqueta}</div>
      {sub ? <div className={styles.sub}>{sub}</div> : null}
    </div>
  );
}
