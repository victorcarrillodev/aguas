import { Form } from '@remix-run/react';

import { Chip } from '../gotas/Chip';
import styles from './TablaPadron.module.css';

export interface FilaPadron {
  usuario: string;
  correo: string;
  rol: string;
  activo: boolean;
  /** `entorno` viene de `.env`: se cambia ahí, no desde aquí. */
  origen: 'entorno' | 'base';
  creadoPor?: string;
  creadoEn?: string;
}

interface Props {
  filas: FilaPadron[];
  /** Testigo CSRF del panel; el mismo de la cookie de sesión. */
  testigo: string;
  /** Usuario de la sesión: sobre uno mismo no se opera desde aquí. */
  yo: string;
  ocupado?: boolean;
}

/** Corriente: padrón con sus acciones (clave nueva, desactivar, eliminar). */
export function TablaPadron({ filas, testigo, yo, ocupado }: Props) {
  if (filas.length === 0) return <p className={styles.vacio}>Todavía no hay cuentas dadas de alta.</p>;

  return (
    <ul className={styles.lista}>
      {filas.map((f) => {
        const propia = f.usuario === yo;
        const delEntorno = f.origen === 'entorno';
        return (
          <li key={f.usuario} className={f.activo ? styles.fila : styles.filaInactiva}>
            <div className={styles.identidad}>
              <p className={styles.usuario}>
                {f.usuario}
                {propia ? <span className={styles.tuya}>tu sesión</span> : null}
              </p>
              <p className={styles.correo}>{f.correo || 'sin correo'}</p>
              {f.creadoEn ? (
                <p className={styles.meta}>
                  Alta {f.creadoEn.slice(0, 10)}
                  {f.creadoPor ? ` · por ${f.creadoPor}` : ''}
                </p>
              ) : (
                <p className={styles.meta}>Definida en el archivo .env del servidor</p>
              )}
            </div>

            <div className={styles.etiquetas}>
              <Chip color={f.rol === 'root' ? 'var(--primary)' : 'var(--secondary)'}>{f.rol}</Chip>
              {f.activo ? null : <Chip color="var(--error)">inactiva</Chip>}
              {delEntorno ? <Chip color="var(--outline)">entorno</Chip> : null}
            </div>

            <div className={styles.acciones}>
              {delEntorno ? (
                <span className={styles.nota}>Se administra en .env</span>
              ) : (
                <>
                  <Accion
                    testigo={testigo}
                    usuario={f.usuario}
                    intent="clave"
                    icono="key"
                    texto="Clave nueva"
                    ocupado={ocupado}
                  />
                  <Accion
                    testigo={testigo}
                    usuario={f.usuario}
                    intent={f.activo ? 'desactivar' : 'activar'}
                    icono={f.activo ? 'block' : 'check_circle'}
                    texto={f.activo ? 'Desactivar' : 'Reactivar'}
                    ocupado={ocupado || propia}
                  />
                  <Accion
                    testigo={testigo}
                    usuario={f.usuario}
                    intent="eliminar"
                    icono="delete"
                    texto="Eliminar"
                    peligro
                    confirmacion={`Se elimina la cuenta de ${f.usuario} y deja de poder entrar. Lo que ya haya aportado al expediente se conserva. ¿Continuar?`}
                    ocupado={ocupado || propia}
                  />
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface AccionProps {
  testigo: string;
  usuario: string;
  intent: string;
  icono: string;
  texto: string;
  peligro?: boolean;
  confirmacion?: string;
  ocupado?: boolean;
}

/** Cada acción es su propio POST: sin JavaScript siguen funcionando. */
function Accion({
  testigo,
  usuario,
  intent,
  icono,
  texto,
  peligro,
  confirmacion,
  ocupado,
}: AccionProps) {
  return (
    <Form
      method="post"
      replace
      onSubmit={(e) => {
        if (confirmacion && !window.confirm(confirmacion)) e.preventDefault();
      }}
    >
      <input type="hidden" name="_csrf" value={testigo} />
      <input type="hidden" name="_intent" value={intent} />
      <input type="hidden" name="usuario" value={usuario} />
      <button
        type="submit"
        className={peligro ? styles.peligro : styles.boton}
        disabled={ocupado}
        title={texto}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {icono}
        </span>
        <span className={styles.textoAccion}>{texto}</span>
      </button>
    </Form>
  );
}
