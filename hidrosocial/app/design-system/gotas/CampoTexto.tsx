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
  /** Pista de autocompletado del navegador (p. ej. `username`). */
  autocompletar?: string;
  maxLongitud?: number;
  /** Foco al montar: sólo cuando el campo es la única acción de la pantalla. */
  autoFoco?: boolean;
  /** Marca el campo como erróneo y lo enlaza con el texto que lo explica. */
  invalido?: boolean;
  describePor?: string;
  deshabilitado?: boolean;
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
  autocompletar,
  maxLongitud,
  autoFoco,
  invalido,
  describePor,
  deshabilitado,
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
        autoComplete={autocompletar}
        autoCapitalize={autocompletar ? 'none' : undefined}
        autoCorrect={autocompletar ? 'off' : undefined}
        spellCheck={autocompletar ? false : undefined}
        maxLength={maxLongitud}
        // biome-ignore lint/a11y/noAutofocus: sólo lo pide la pantalla de acceso.
        autoFocus={autoFoco}
        aria-invalid={invalido || undefined}
        aria-describedby={describePor}
        disabled={deshabilitado}
      />
      {descripcion ? <span className={styles.descripcion}>{descripcion}</span> : null}
    </label>
  );
}
