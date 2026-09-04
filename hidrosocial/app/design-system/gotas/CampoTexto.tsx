import styles from './CampoTexto.module.css';

interface Props {
  etiqueta: string;
  nombre: string;
  requerido?: boolean;
  valorInicial?: string;
  /** Controlado: fija el valor y notifica cambios (preview en vivo). */
  valor?: string;
  alCambiar?: (v: string) => void;
  placeholder?: string;
  descripcion?: string;
}

/** Gota: input de texto con etiqueta (controlado o no controlado). */
export function CampoTexto({
  etiqueta,
  nombre,
  requerido,
  valorInicial,
  valor,
  alCambiar,
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
      <input
        className={styles.entrada}
        type="text"
        name={nombre}
        required={requerido}
        defaultValue={valor === undefined ? valorInicial : undefined}
        value={valor}
        onChange={alCambiar ? (e) => alCambiar(e.target.value) : undefined}
        placeholder={placeholder}
      />
      {descripcion ? <span className={styles.descripcion}>{descripcion}</span> : null}
    </label>
  );
}
