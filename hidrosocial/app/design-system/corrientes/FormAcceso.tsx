import { Form } from '@remix-run/react';
import { useId } from 'react';

import { Boton } from '../gotas/Boton';
import { CampoClave } from '../gotas/CampoClave';
import { CampoTexto } from '../gotas/CampoTexto';
import styles from './FormAcceso.module.css';

interface Props {
  /** Testigo CSRF emitido por el loader; viaja en un campo oculto. */
  testigo: string;
  /** Mensaje único de credencial rechazada o de freno por intentos. */
  error?: string;
  enviando?: boolean;
  /** Sin acceso configurado en el servidor el formulario queda inerte. */
  deshabilitado?: boolean;
  maxUsuario: number;
  maxClave: number;
}

/** Corriente: formulario de identificación (usuario + clave + testigo CSRF). */
export function FormAcceso({
  testigo,
  error,
  enviando,
  deshabilitado,
  maxUsuario,
  maxClave,
}: Props) {
  const idError = useId();

  return (
    <Form method="post" className={styles.formulario} replace>
      <input type="hidden" name="_csrf" value={testigo} />

      {error ? (
        <p className={styles.error} id={idError} role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">
            error
          </span>
          <span>{error}</span>
        </p>
      ) : null}

      <CampoTexto
        etiqueta="Usuario o correo"
        nombre="usuario"
        requerido
        autocompletar="username"
        maxLongitud={maxUsuario}
        autoFoco
        invalido={Boolean(error)}
        describePor={error ? idError : undefined}
        deshabilitado={deshabilitado}
      />

      <CampoClave
        etiqueta="Contraseña"
        nombre="clave"
        requerido
        autocompletar="current-password"
        maxLongitud={maxClave}
        invalido={Boolean(error)}
        describePor={error ? idError : undefined}
        deshabilitado={deshabilitado}
      />

      <Boton type="submit" disabled={enviando || deshabilitado}>
        {enviando ? 'Comprobando…' : 'Entrar'}
      </Boton>
    </Form>
  );
}
