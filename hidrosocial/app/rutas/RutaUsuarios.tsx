import { json } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useActionData, useLoaderData, useNavigation } from '@remix-run/react';

import { FormUsuario } from '~/design-system/corrientes/FormUsuario';
import { TablaPadron } from '~/design-system/corrientes/TablaPadron';
import { Tarjeta } from '~/design-system/gotas/Tarjeta';
import {
  CLAVE_MINIMA,
  ErrorUsuario,
  RUTA_BASE,
  ROLES,
  activarUsuario,
  cambiarClave,
  correoConfigurado,
  crearUsuario,
  eliminarUsuario,
  enviarCorreo,
  leerTestigoCSRF,
  listarUsuarios,
  padronEscribible,
  remitente,
  requerirRoot,
  verificarCSRF,
} from '~/microprocesos/sesion/index.server';
import type { Rol, Usuario } from '~/microprocesos/sesion/index.server';
import { generarClave } from '~/microprocesos/sesion/claves.server';
import { correoAlta, correoClaveNueva } from '~/microprocesos/sesion/plantilla-correo.server';
import styles from './RutaUsuarios.module.css';

const LIMITE_CAMPO = 254;

interface Datos {
  usuarios: Usuario[];
  yo: string;
  testigo: string;
  escribible: boolean;
  correo: { activo: boolean; remitente: string };
  /** Del loader, no importados: el módulo del padrón es sólo de servidor. */
  roles: { valor: string; etiqueta: string }[];
  claveMinima: number;
}

/** Credencial recién emitida: se enseña una vez y no se guarda en ningún lado. */
interface Emision {
  titulo: string;
  usuario: string;
  correo: string;
  clave: string;
  enviado: boolean;
  detalle?: string;
}

interface Resultado {
  error?: string;
  hecho?: string;
  emision?: Emision;
}

export const meta: MetaFunction = () => [
  { title: 'Padrón de usuarios · Hidrosocial' },
  { name: 'robots', content: 'noindex, nofollow' },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const sesion = await requerirRoot(request);
  return json<Datos>(
    {
      usuarios: await listarUsuarios(),
      yo: sesion.usuario,
      testigo: await leerTestigoCSRF(request),
      escribible: padronEscribible(),
      correo: { activo: correoConfigurado(), remitente: remitente() },
      roles: ROLES.map((r) => ({
        valor: r,
        etiqueta: r === 'root' ? 'root · administra el padrón' : 'investigador · lee y captura',
      })),
      claveMinima: CLAVE_MINIMA,
    },
    { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const sesion = await requerirRoot(request);
  const fd = await request.formData().catch(() => new FormData());
  if (!(await verificarCSRF(request, fd.get('_csrf'))))
    return fallo('La sesión del formulario caducó. Recarga la página e inténtalo otra vez.', 403);

  const intent = campo(fd, '_intent');
  const usuario = campo(fd, 'usuario');
  // Sobre la propia cuenta no se opera desde el panel: evita quedarse fuera.
  if (usuario === sesion.usuario && intent !== 'crear')
    return fallo('No puedes desactivar ni eliminar la cuenta con la que estás dentro.', 409);

  try {
    switch (intent) {
      case 'crear':
        return json<Resultado>(await alta(fd, sesion.usuario, request));
      case 'clave':
        return json<Resultado>(await claveNueva(usuario, sesion.usuario, request));
      case 'activar':
      case 'desactivar': {
        await activarUsuario(usuario, intent === 'activar');
        return json<Resultado>({
          hecho: `La cuenta de ${usuario} quedó ${intent === 'activar' ? 'activa' : 'desactivada'}.`,
        });
      }
      case 'eliminar': {
        await eliminarUsuario(usuario);
        console.info(`Padrón: ${sesion.usuario} eliminó la cuenta "${usuario}".`);
        return json<Resultado>({
          hecho: `Se eliminó la cuenta de ${usuario}. Sus aportaciones al expediente siguen ahí.`,
        });
      }
      default:
        return fallo('Acción no reconocida.', 400);
    }
  } catch (e) {
    if (e instanceof ErrorUsuario) return fallo(e.message, e.status);
    console.error('Padrón: operación fallida.');
    return fallo('No se pudo completar la operación.', 500);
  }
}

async function alta(fd: FormData, root: string, request: Request): Promise<Resultado> {
  const escrita = campo(fd, 'clave', 256);
  const clave = escrita === '' ? generarClave(20) : escrita;
  const rol = campo(fd, 'rol') as Rol;
  const creado = await crearUsuario(
    { usuario: campo(fd, 'usuario', 64), correo: campo(fd, 'correo'), rol, clave },
    root,
  );
  console.info(`Padrón: ${root} dio de alta a "${creado.usuario}" (${creado.rol}).`);
  const aviso = await avisar(
    correoAlta({ ...creado, clave, url: urlAcceso(request), invitadoPor: root }),
  );
  return {
    emision: {
      titulo: 'Cuenta creada',
      usuario: creado.usuario,
      correo: creado.correo,
      clave,
      ...aviso,
    },
  };
}

async function claveNueva(usuario: string, root: string, request: Request): Promise<Resultado> {
  const clave = generarClave(20);
  await cambiarClave(usuario, clave);
  console.info(`Padrón: ${root} restableció la contraseña de "${usuario}".`);
  const cuenta = (await listarUsuarios()).find((u) => u.usuario === usuario);
  const aviso = await avisar(
    correoClaveNueva({
      usuario,
      correo: cuenta?.correo ?? '',
      rol: cuenta?.rol ?? 'investigador',
      clave,
      url: urlAcceso(request),
      invitadoPor: root,
    }),
  );
  return {
    emision: {
      titulo: 'Contraseña restablecida',
      usuario,
      correo: cuenta?.correo ?? '',
      clave,
      ...aviso,
    },
  };
}

/** El correo es cortesía: si no sale, el alta sigue en pie y se avisa. */
async function avisar(mensaje: {
  para: string;
  asunto: string;
  texto: string;
  html?: string;
}): Promise<{ enviado: boolean; detalle?: string }> {
  if (mensaje.para === '') return { enviado: false, detalle: 'La cuenta no tiene correo.' };
  const resultado = await enviarCorreo(mensaje);
  return { enviado: resultado.enviado, detalle: resultado.detalle };
}

function urlAcceso(request: Request): string {
  return `${new URL(request.url).origin}${RUTA_BASE}/acceso`;
}

function campo(fd: FormData, nombre: string, limite = LIMITE_CAMPO): string {
  const valor = fd.get(nombre);
  if (typeof valor !== 'string' || valor.length > limite) return '';
  return valor.trim();
}

function fallo(error: string, status: number) {
  return json<Resultado>({ error }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

// Cuenca: panel del root. Alta de cuentas arriba, padrón con sus acciones abajo.
export default function RutaUsuarios() {
  const { usuarios, yo, testigo, escribible, correo, roles, claveMinima } =
    useLoaderData<Datos>();
  const resultado = useActionData<Resultado>();
  const navegacion = useNavigation();
  const ocupado = navegacion.state !== 'idle';

  return (
    <div className={styles.cuenca}>
      <header className={styles.cabecera}>
        <div>
          <h1 className={styles.titulo}>Padrón de usuarios</h1>
          <p className={styles.subtitulo}>
            {usuarios.length} cuenta{usuarios.length === 1 ? '' : 's'} · el alta la firma tu cuenta
            root y queda registrada en la bitácora del servidor.
          </p>
        </div>
      </header>

      {resultado?.emision ? <Credencial emision={resultado.emision} /> : null}

      {resultado?.hecho && !resultado.emision ? (
        <output className={styles.hecho}>{resultado.hecho}</output>
      ) : null}

      {escribible ? null : (
        <p className={styles.aviso} role="alert">
          El padrón necesita PostgreSQL. Sin base de datos sólo existe la cuenta root del entorno y
          no se pueden dar de alta compañeros.
        </p>
      )}

      <Tarjeta titulo="Dar de alta a alguien">
        <FormUsuario
          testigo={testigo}
          roles={roles}
          claveMinima={claveMinima}
          enviando={ocupado}
          deshabilitado={!escribible}
          error={resultado?.error}
        />
        <p className={styles.correoNota}>
          {correo.activo
            ? `Las credenciales salen desde ${correo.remitente} por el relay del propio servidor.`
            : 'El envío de correo está apagado (CORREO_ENVIAR=0): entrega la contraseña a mano.'}
        </p>
      </Tarjeta>

      <Tarjeta titulo="Cuentas">
        <TablaPadron filas={usuarios} testigo={testigo} yo={yo} ocupado={ocupado} />
      </Tarjeta>
    </div>
  );
}

/** La contraseña se enseña una sola vez: ni se guarda ni se puede volver a ver. */
function Credencial({ emision }: { emision: Emision }) {
  return (
    <section className={styles.credencial} aria-live="polite">
      <p className={styles.credencialTitulo}>
        <span className="material-symbols-outlined" aria-hidden="true">
          {emision.enviado ? 'mark_email_read' : 'key'}
        </span>
        {emision.titulo}: {emision.usuario}
      </p>
      <dl className={styles.datos}>
        <div>
          <dt>Usuario</dt>
          <dd className={styles.dato}>{emision.usuario}</dd>
        </div>
        <div>
          <dt>Contraseña</dt>
          <dd className={styles.clave}>{emision.clave}</dd>
        </div>
      </dl>
      <p className={styles.credencialPie}>
        {emision.enviado
          ? `Enviada a ${emision.correo}. Cópiala ahora si quieres entregarla también en persona: al recargar esta página desaparece.`
          : `No se pudo enviar el correo${emision.detalle ? ` (${emision.detalle})` : ''}. Entrégala por un canal privado: al recargar esta página desaparece.`}
      </p>
    </section>
  );
}
