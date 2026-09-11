import { useState } from 'react';

import styles from './CampoClave.module.css';

interface Props {
  etiqueta: string;
  nombre: string;
  requerido?: boolean;
  /** Pista de autocompletado del gestor de claves (`current-password`…). */
  autocompletar?: string;
  maxLongitud?: number;
  invalido?: boolean;
  describePor?: string;
  deshabilitado?: boolean;
}

/**
 * Gota: campo de contraseña con conmutador de visibilidad. El valor nunca sale
 * del input (no controlado): no hay copia en el estado de React ni en el DOM.
 */
export function CampoClave({
  etiqueta,
  nombre,
  requerido,
  autocompletar,
  maxLongitud,
  invalido,
  describePor,
  deshabilitado,
}: Props) {
  const [visible, setVisible] = useState(false);

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
      <span className={styles.marco}>
        <input
          className={styles.entrada}
          type={visible ? 'text' : 'password'}
          name={nombre}
          required={requerido}
          autoComplete={autocompletar}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={maxLongitud}
          aria-invalid={invalido || undefined}
          aria-describedby={describePor}
          disabled={deshabilitado}
        />
        <button
          type="button"
          className={styles.ojo}
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          disabled={deshabilitado}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {visible ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </span>
    </label>
  );
}
