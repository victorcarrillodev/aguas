import styles from './AreaTexto.module.css';

interface Props {
  etiqueta: string;
  nombre: string;
  requerido?: boolean;
  valorInicial?: string;
  /** Controlado: fija el valor y notifica cambios (preview en vivo). */
  valor?: string;
  alCambiar?: (v: string) => void;
  filas?: number;
  placeholder?: string;
  descripcion?: string;
}

/** Gota: textarea con etiqueta (controlada o no controlada). */
export function AreaTexto({
  etiqueta,
  nombre,
  requerido,
  valorInicial,
  valor,
  alCambiar,
  filas = 4,
  placeholder,
  descripcion,
}: Props) {
  return (
    <label className={styles.campo}>
      <span className={styles.etiqueta}>
        {etiqueta}
        {requerido ? (
          <span className={styles.req} aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </span>
      <textarea
        className={styles.entrada}
        name={nombre}
        required={requerido}
        defaultValue={valor === undefined ? valorInicial : undefined}
        value={valor}
        onChange={alCambiar ? (e) => alCambiar(e.target.value) : undefined}
        rows={filas}
        placeholder={placeholder}
      />
      {descripcion ? <span className={styles.descripcion}>{descripcion}</span> : null}
    </label>
  );
}
