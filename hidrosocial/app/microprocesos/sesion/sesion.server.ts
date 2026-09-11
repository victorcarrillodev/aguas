// Sesión de acceso: cookie firmada (HMAC) con el nombre de usuario y su
// vencimiento absoluto, más el testigo CSRF del formulario. Sin secreto o sin
// padrón configurados el sistema queda cerrado: nadie entra.

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createCookieSessionStorage, redirect } from '@remix-run/node';
import type { Session, SessionStorage } from '@remix-run/node';
import { cuentaVigente, rootDeEntorno } from './usuarios.server';
import type { Rol } from './usuarios.server';

/**
 * Prefijo público de la app; debe coincidir con `basename` de vite.config.ts.
 * Sólo se usa para el ámbito de la cookie y para reconocer rutas ya prefijadas:
 * Remix antepone el basename por su cuenta a lo que devuelve `redirect()`.
 */
export const RUTA_BASE = (process.env.RUTA_BASE ?? '/calidad').replace(/\/+$/, '');
/** Ruta interna (sin base) del acceso: la que espera `redirect()`. */
export const RUTA_ACCESO = '/acceso';

const NOMBRE_COOKIE = 'calidad-sesion';
const HORAS_POR_DEFECTO = 8;
const CLAVE_USUARIO = 'usuario';
const CLAVE_VENCE = 'vence';
const CLAVE_CSRF = 'csrf';

export interface Sesion {
  usuario: string;
  correo: string;
  rol: Rol;
  /** Instante (ms) en que la sesión deja de ser válida. */
  vence: number;
}

export interface EstadoConfiguracion {
  ok: boolean;
  faltantes: string[];
}

/**
 * Comprueba que el acceso esté configurado. Se evalúa en cada petición para no
 * depender del orden de arranque ni cachear un estado que el entorno cambió.
 * El rol se resuelve en el padrón, no en la cookie: quitarle root a alguien
 * surte efecto en su siguiente petición, sin esperar a que caduque su sesión.
 */
export async function estadoConfiguracion(): Promise<EstadoConfiguracion> {
  const faltantes: string[] = [];
  if (secretos().length === 0) faltantes.push('SESSION_SECRET');
  if (!(await rootDeEntorno())) faltantes.push('ROOT_CLAVE');
  return { ok: faltantes.length === 0, faltantes };
}

/** Admite varios secretos separados por coma para rotarlos sin cerrar sesiones. */
function secretos(): string[] {
  return (process.env.SESSION_SECRET ?? '')
    .split(',')
    .map((s) => s.trim())
    // Un secreto corto no protege la firma: se descarta en vez de degradarla.
    .filter((s) => s.length >= 32);
}

function duracionMs(): number {
  const horas = Number(process.env.SESION_HORAS ?? HORAS_POR_DEFECTO);
  const valida = Number.isFinite(horas) && horas > 0 && horas <= 24 * 7;
  return (valida ? horas : HORAS_POR_DEFECTO) * 3_600_000;
}

/**
 * HTTPS directo, o declarado por un proxy en el que el despliegue confía. Tras
 * un proxy que termina TLS la petición interna llega por http: sin esto la
 * cookie saldría sin `Secure` y viajaría en claro en el primer salto.
 */
export function peticionSegura(request: Request): boolean {
  if (new URL(request.url).protocol === 'https:') return true;
  return (
    process.env.CONFIAR_PROXY === '1' &&
    request.headers.get('X-Forwarded-Proto')?.split(',')[0]?.trim() === 'https'
  );
}

function almacen(request: Request): SessionStorage | null {
  const claves = secretos();
  if (claves.length === 0) return null;
  return createCookieSessionStorage({
    cookie: {
      name: NOMBRE_COOKIE,
      httpOnly: true,
      sameSite: 'lax',
      path: RUTA_BASE === '' ? '/' : RUTA_BASE,
      secure: peticionSegura(request),
      secrets: claves,
      maxAge: Math.floor(duracionMs() / 1000),
    },
  });
}

interface Abierta {
  sesion: Session;
  almacen: SessionStorage;
}

/** Devuelve la cookie de sesión interpretada, o una vacía si no es válida. */
async function abrir(request: Request): Promise<Abierta | null> {
  const almacenaje = almacen(request);
  if (!almacenaje) return null;
  try {
    return { sesion: await almacenaje.getSession(request.headers.get('Cookie')), almacen: almacenaje };
  } catch {
    // Firma inválida o cookie corrupta: se trata como visitante sin sesión.
    return { sesion: await almacenaje.getSession(), almacen: almacenaje };
  }
}

/** Sesión válida o `null`. Nunca lanza: cualquier fallo es «sin sesión». */
export async function sesionOpcional(request: Request): Promise<Sesion | null> {
  const abierta = await abrir(request);
  if (!abierta) return null;
  const usuario = abierta.sesion.get(CLAVE_USUARIO);
  const vence = abierta.sesion.get(CLAVE_VENCE);
  if (typeof usuario !== 'string' || usuario === '') return null;
  if (typeof vence !== 'number' || !Number.isFinite(vence) || vence <= Date.now()) return null;
  // Dar de baja o desactivar a alguien cierra su sesión en la siguiente petición.
  const cuenta = await cuentaVigente(usuario);
  if (!cuenta) return null;
  return { usuario: cuenta.usuario, correo: cuenta.correo, rol: cuenta.rol, vence };
}

/** Puerta del panel de root: cualquier otro rol recibe un 403, no un desvío. */
export async function requerirRoot(request: Request): Promise<Sesion> {
  const sesion = await requerirSesion(request);
  if (sesion.rol !== 'root')
    throw new Response('Sólo la cuenta root administra el padrón.', {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    });
  return sesion;
}

/**
 * Puerta de todas las cuencas privadas: sin sesión, redirige a `/acceso`
 * conservando el destino. Se llama al principio de cada loader y cada action.
 */
export async function requerirSesion(request: Request): Promise<Sesion> {
  const sesion = await sesionOpcional(request);
  if (sesion) return sesion;
  const destino = rutaRelativa(request);
  const url =
    destino === '/' ? RUTA_ACCESO : `${RUTA_ACCESO}?destino=${encodeURIComponent(destino)}`;
  throw redirect(url, { headers: { 'Cache-Control': 'no-store' } });
}

/** Abre sesión nueva (cookie renovada) y envía a `destino`. */
export async function iniciarSesion(
  request: Request,
  usuario: string,
  destino: string,
): Promise<Response> {
  const almacenaje = almacen(request);
  if (!almacenaje) throw new Response('Acceso no configurado', { status: 503 });
  // Sesión desde cero: nunca se reutiliza la cookie previa (fijación de sesión).
  const sesion = await almacenaje.getSession();
  sesion.set(CLAVE_USUARIO, usuario);
  sesion.set(CLAVE_VENCE, Date.now() + duracionMs());
  sesion.set(CLAVE_CSRF, randomBytes(32).toString('base64url'));
  return redirect(destino, {
    headers: {
      'Set-Cookie': await almacenaje.commitSession(sesion),
      'Cache-Control': 'no-store',
    },
  });
}

/** Cierra la sesión borrando la cookie en el navegador. */
export async function cerrarSesion(request: Request): Promise<Response> {
  const abierta = await abrir(request);
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (abierta) headers.set('Set-Cookie', await abierta.almacen.destroySession(abierta.sesion));
  return redirect(`${RUTA_ACCESO}?salida=1`, { headers });
}

/**
 * Testigo CSRF del formulario de acceso. Vive en la misma cookie firmada: el
 * navegador lo devuelve, pero un sitio ajeno no puede leerlo ni adivinarlo.
 */
export async function testigoCSRF(
  request: Request,
): Promise<{ testigo: string; cookie: string } | null> {
  const abierta = await abrir(request);
  if (!abierta) return null;
  const existente = abierta.sesion.get(CLAVE_CSRF);
  const testigo =
    typeof existente === 'string' && existente.length >= 32
      ? existente
      : randomBytes(32).toString('base64url');
  abierta.sesion.set(CLAVE_CSRF, testigo);
  return { testigo, cookie: await abierta.almacen.commitSession(abierta.sesion) };
}

/** Lee el testigo ya emitido sin generar uno nuevo (para formularios internos). */
export async function leerTestigoCSRF(request: Request): Promise<string> {
  const abierta = await abrir(request);
  const testigo = abierta?.sesion.get(CLAVE_CSRF);
  return typeof testigo === 'string' ? testigo : '';
}

/**
 * Valida el envío: origen de la propia app y testigo igual al de la cookie.
 * Cubre el caso de que `SameSite=Lax` no baste (navegador viejo, proxy raro).
 */
export async function verificarCSRF(request: Request, enviado: unknown): Promise<boolean> {
  if (!mismoOrigen(request)) return false;
  const abierta = await abrir(request);
  const guardado = abierta?.sesion.get(CLAVE_CSRF);
  if (typeof guardado !== 'string' || typeof enviado !== 'string') return false;
  const a = Buffer.from(guardado);
  const b = Buffer.from(enviado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** El envío debe proceder de esta misma aplicación (`Origin`, o `Referer`). */
export function mismoOrigen(request: Request): boolean {
  const publica = new URL(request.url);
  if (peticionSegura(request)) publica.protocol = 'https:';
  const propio = publica.origin;
  const origen = request.headers.get('Origin');
  if (origen) return origen === propio;
  const referente = request.headers.get('Referer');
  if (!referente) return false;
  try {
    return new URL(referente).origin === propio;
  } catch {
    return false;
  }
}

/**
 * Normaliza el destino tras el acceso. Sólo rutas internas: una URL absoluta o
 * un `//host` convertirían el acceso en un trampolín hacia sitios ajenos.
 */
export function destinoSeguro(valor: unknown): string {
  const inicio = '/';
  if (typeof valor !== 'string' || valor === '') return inicio;
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\')) return inicio;
  // Un salto de línea colado en `Location` es división de respuesta HTTP:
  // fuera cualquier carácter de control antes de construir la ruta.
  for (const caracter of valor) {
    const codigo = caracter.charCodeAt(0);
    if (codigo < 0x20 || codigo === 0x7f) return inicio;
  }
  // El destino viaja sin base: Remix se la antepone al redirigir.
  const ruta =
    RUTA_BASE !== '' && (valor === RUTA_BASE || valor.startsWith(`${RUTA_BASE}/`))
      ? valor.slice(RUTA_BASE.length) || '/'
      : valor;
  // Volver al propio acceso después de entrar sería un bucle.
  return ruta === RUTA_ACCESO || ruta.startsWith(`${RUTA_ACCESO}?`) ? inicio : ruta;
}

/** Ruta pedida sin el prefijo base, para reconstruirla después del acceso. */
function rutaRelativa(request: Request): string {
  const url = new URL(request.url);
  const ruta = url.pathname.startsWith(RUTA_BASE)
    ? url.pathname.slice(RUTA_BASE.length)
    : url.pathname;
  const busqueda = new URLSearchParams(url.search);
  // `_data` identifica la petición interna de Remix, no forma parte del destino.
  busqueda.delete('_data');
  const cadena = busqueda.toString();
  return `${ruta === '' ? '/' : ruta}${cadena ? `?${cadena}` : ''}`;
}
