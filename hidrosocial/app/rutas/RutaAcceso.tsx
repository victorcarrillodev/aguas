import { json, redirect } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useActionData, useLoaderData, useNavigation, useSearchParams } from '@remix-run/react';

import { PanelAcceso } from '~/design-system/cauces/PanelAcceso';
import { FormAcceso } from '~/design-system/corrientes/FormAcceso';
import {
  autenticar,
  claveCliente,
  comprobarIntentos,
  destinoSeguro,
  estadoConfiguracion,
  iniciarSesion,
  registrarExito,
  registrarFallo,
  sesionOpcional,
  testigoCSRF,
  verificarCSRF,
} from '~/microprocesos/sesion/index.server';
import styles from './RutaAcceso.module.css';

/** Un solo mensaje para toda credencial rechazada: no revela qué usuarios existen. */
const CREDENCIAL_INVALIDA = 'Usuario o contraseña incorrectos.';
/** Cabe un correo completo: se entra con el nombre de usuario o con él. */
const LIMITE_USUARIO = 254;
const LIMITE_CLAVE = 256;
const LIMITE_CUERPO = 8_192;

interface Datos {
  testigo: string;
  configuracion: { ok: boolean; faltantes: string[] };
}

export const meta: MetaFunction = () => [
  { title: 'Acceso · Hidrosocial' },
  { name: 'robots', content: 'noindex, nofollow' },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const destino = destinoSeguro(new URL(request.url).searchParams.get('destino'));
  // Con sesión abierta el formulario no tiene sentido: al contenido.
  if (await sesionOpcional(request)) throw redirect(destino);
  const configuracion = await estadoConfiguracion();
  const csrf = await testigoCSRF(request);
  return json<Datos>(
    { testigo: csrf?.testigo ?? '', configuracion },
    {
      headers: {
        // La página lleva el testigo CSRF: ni proxies ni el navegador la guardan.
        'Cache-Control': 'private, no-store',
        Vary: 'Cookie',
        ...(csrf ? { 'Set-Cookie': csrf.cookie } : {}),
      },
    },
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const destino = destinoSeguro(new URL(request.url).searchParams.get('destino'));
  const { ok } = await estadoConfiguracion();
  if (!ok) return fallo('El acceso todavía no está configurado en el servidor.', 503);

  let fd: FormData;
  try {
    fd = await leerFormularioLimitado(request);
  } catch {
    return fallo('No se pudo leer el formulario.', 400);
  }

  if (!(await verificarCSRF(request, fd.get('_csrf'))))
    return fallo('La sesión del formulario caducó. Recarga la página e inténtalo otra vez.', 403);

  const usuario = texto(fd.get('usuario'), LIMITE_USUARIO);
  const clave = texto(fd.get('clave'), LIMITE_CLAVE);

  // El freno se consulta antes de derivar: un bloqueo no debe costar CPU.
  const claves = [`usuario:${usuario.toLowerCase()}`, claveCliente(request)];
  const previo = comprobarIntentos(claves);
  if (!previo.permitido) return fallo(mensajeEspera(previo.espera), 429);

  const cuenta = usuario === '' || clave === '' ? null : await autenticar(usuario, clave);
  if (!cuenta) {
    const veredicto = registrarFallo(claves);
    // Traza para la bitácora del servidor: nunca la clave, nunca el motivo exacto.
    console.warn(`Acceso: intento fallido de "${usuario.slice(0, 64)}" (${claves[1]}).`);
    return fallo(
      veredicto.permitido ? CREDENCIAL_INVALIDA : mensajeEspera(veredicto.espera),
      veredicto.permitido ? 401 : 429,
    );
  }

  registrarExito(claves);
  console.info(`Acceso: sesión abierta por "${cuenta.usuario}" (${cuenta.rol}).`);
  return iniciarSesion(request, cuenta.usuario, destino);
}

function fallo(error: string, status: number) {
  return json({ error }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function mensajeEspera(segundos: number): string {
  const minutos = Math.ceil(segundos / 60);
  return segundos <= 90
    ? `Demasiados intentos. Espera ${Math.max(segundos, 1)} segundos.`
    : `Demasiados intentos. Espera ${minutos} minutos.`;
}

/** Un campo del formulario, normalizado: varios valores o un archivo se descartan. */
function texto(valor: FormDataEntryValue | null, limite: number): string {
  if (typeof valor !== 'string') return '';
  return valor.length > limite ? '' : valor.trim().normalize('NFKC');
}

/** Lee el cuerpo con tope propio: no se interpreta un envío desmedido. */
async function leerFormularioLimitado(request: Request): Promise<FormData> {
  const declarado = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(declarado) && declarado > LIMITE_CUERPO) throw new Error('cuerpo excesivo');
  const lector = request.body?.getReader();
  const trozos: Uint8Array[] = [];
  let bytes = 0;
  if (lector) {
    try {
      while (true) {
        const { value, done } = await lector.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > LIMITE_CUERPO) {
          await lector.cancel();
          throw new Error('cuerpo excesivo');
        }
        trozos.push(value);
      }
    } finally {
      lector.releaseLock();
    }
  }
  return new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: Buffer.concat(trozos),
  }).formData();
}

// Cuenca de acceso: compone el cauce PanelAcceso con la corriente FormAcceso.
export default function RutaAcceso() {
  const { testigo, configuracion } = useLoaderData<Datos>();
  const resultado = useActionData<{ error?: string }>();
  const navegacion = useNavigation();
  const [params] = useSearchParams();

  const enviando = navegacion.state !== 'idle' && navegacion.formMethod === 'POST';
  const error = resultado?.error;
  const salida = params.get('salida') === '1' && !error;

  return (
    <PanelAcceso
      titulo="Identifícate"
      descripcion="El contenido del expediente sólo está disponible para personas autorizadas."
      aviso={salida ? 'Sesión cerrada. Puedes volver a entrar cuando quieras.' : undefined}
      pie="Los intentos de acceso quedan registrados. La evidencia de campo puede contener datos personales de informantes: no compartas tu credencial ni dejes la sesión abierta en un equipo compartido."
    >
      {configuracion.ok ? null : (
        <div className={styles.bloqueo} role="alert">
          <p className={styles.bloqueoTitulo}>El acceso no está configurado</p>
          <p>
            Falta definir {configuracion.faltantes.join(' y ')} en el entorno del servidor. Mientras
            tanto nadie puede entrar y nada del expediente es visible.
          </p>
          <p className={styles.bloqueoAyuda}>
            Escribe la contraseña de la cuenta root en <code>ROOT_CLAVE</code> dentro de{' '}
            <code>.env</code> y reinicia el servicio.
          </p>
        </div>
      )}
      <FormAcceso
        testigo={testigo}
        error={error}
        enviando={enviando}
        deshabilitado={!configuracion.ok}
        maxUsuario={LIMITE_USUARIO}
        maxClave={LIMITE_CLAVE}
      />
    </PanelAcceso>
  );
}
