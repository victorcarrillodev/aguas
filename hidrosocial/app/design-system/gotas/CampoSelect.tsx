import styles from './CampoSelect.module.css';

export interface OpcionSelect {
  valor: string;
  etiqueta: string;
}

interface Props {
  etiqueta: string;
  nombre: string;
  opciones: OpcionSelect[];
  requerido?: boolean;
  valorInicial?: string;
  /** Controlado: fija el valor y notifica cambios (cascadas, preview). */
  valor?: string;
  alCambiar?: (v: string) => void;
  descripcion?: string;
}

/** Gota: select con opciones (controlado o no controlado). */
export function CampoSelect({
  etiqueta,
  nombre,
  opciones,
  requerido,
  valorInicial,
  valor,
  alCambiar,
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
      <select
        className={styles.entrada}
        name={nombre}
        required={requerido}
        defaultValue={valor === undefined ? (valorInicial ?? opciones[0]?.valor ?? '') : undefined}
        value={valor}
        onChange={alCambiar ? (e) => alCambiar(e.target.value) : undefined}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      {descripcion ? <span className={styles.descripcion}>{descripcion}</span> : null}
    </label>
  );
}
