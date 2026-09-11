import { Form } from '@remix-run/react';
import { useId } from 'react';

import { Boton } from '../gotas/Boton';
import { CampoClave } from '../gotas/CampoClave';
import { CampoSelect } from '../gotas/CampoSelect';
import { CampoTexto } from '../gotas/CampoTexto';
import styles from './FormUsuario.module.css';

export interface OpcionRol {
  valor: string;
  etiqueta: string;
}

interface Props {
  /** Testigo CSRF del panel; el mismo de la cookie de sesión. */
  testigo: string;
  roles: OpcionRol[];
  claveMinima: number;
  enviando?: boolean;
  /** Sin PostgreSQL no hay dónde guardar el alta: el formulario queda inerte. */
  deshabilitado?: boolean;
  error?: string;
}

/** Corriente: alta de una cuenta (usuario, correo, rol y contraseña). */
export function FormUsuario({
  testigo,
  roles,
  claveMinima,
  enviando,
  deshabilitado,
  error,
}: Props) {
  const idError = useId();

  return (
    <Form method="post" className={styles.formulario} replace>
      <input type="hidden" name="_csrf" value={testigo} />
      <input type="hidden" name="_intent" value="crear" />

      {error ? (
        <p className={styles.error} id={idError} role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">
            error
          </span>
          <span>{error}</span>
        </p>
      ) : null}

      <div className={styles.pareja}>
        <CampoTexto
          etiqueta="Usuario"
          nombre="usuario"
          requerido
          maxLongitud={64}
          placeholder="ana.lopez"
          descripcion="Letras, dígitos, punto, guion y guion bajo."
          invalido={Boolean(error)}
          describePor={error ? idError : undefined}
          deshabilitado={deshabilitado}
        />
        <CampoTexto
          etiqueta="Correo"
          nombre="correo"
          requerido
          maxLongitud={254}
          placeholder="ana@ejemplo.org"
          descripcion="Ahí llegan sus credenciales."
          invalido={Boolean(error)}
          describePor={error ? idError : undefined}
          deshabilitado={deshabilitado}
        />
      </div>

      <div className={styles.pareja}>
        <CampoSelect etiqueta="Rol" nombre="rol" opciones={roles} valorInicial="investigador" />
        <CampoClave
          etiqueta="Contraseña"
          nombre="clave"
          autocompletar="new-password"
          maxLongitud={256}
          invalido={Boolean(error)}
          describePor={error ? idError : undefined}
          deshabilitado={deshabilitado}
        />
      </div>

      <p className={styles.nota}>
        Déjala en blanco y el servidor inventa una de 20 caracteres. Mínimo {claveMinima} si la
        escribes tú. La verás una sola vez, al crear la cuenta.
      </p>

      <div className={styles.acciones}>
        <Boton type="submit" disabled={enviando || deshabilitado}>
          {enviando ? 'Creando…' : 'Crear cuenta'}
        </Boton>
      </div>
    </Form>
  );
}
