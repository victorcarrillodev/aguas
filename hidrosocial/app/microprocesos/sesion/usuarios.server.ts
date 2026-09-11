// Padrón en dos capas. La cuenta root vive en el entorno y existe siempre,
// aunque PostgreSQL no esté configurado: es la llave de emergencia. El resto
// del equipo vive en la tabla `usuarios` y lo da de alta el root desde su panel.

import { getBaseDatos, postgresConfigurado } from '../persistencia/index.server';
import type { BaseDatos } from '../persistencia/index.server';
import { derivarClave, verificarClave } from './claves.server';

export type Rol = 'root' | 'investigador';
export const ROLES: readonly Rol[] = ['root', 'investigador'];

export interface Usuario {
  usuario: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  /** `entorno` no se puede editar desde el panel: se cambia en `.env`. */
  origen: 'entorno' | 'base';
  creadoPor?: string;
  creadoEn?: string;
}

interface Cuenta extends Usuario {
  derivada: string;
}

export class ErrorUsuario extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

const USUARIO_VALIDO = /^[A-Za-z0-9._-]{1,64}$/;
const CORREO_VALIDO = /^[^\s@,;]+@[^\s@,;.]+(\.[^\s@,;.]+)+$/;
export const CLAVE_MINIMA = 12;
const CLAVE_MAXIMA = 256;
/** La lista de la base se relee cada pocos segundos, no en cada petición. */
const CACHE_MS = 5_000;

let baseDePruebas: BaseDatos | undefined;
let cache: { hasta: number; cuentas: Cuenta[] } | undefined;
/** Derivación de ROOT_CLAVE en claro, calculada una vez por valor. */
let rootEnClaro: { clave: string; derivada: string } | undefined;

/** Inyección explícita para pruebas; en runtime siempre se usa PostgreSQL. */
export function establecerBaseParaPruebas(nueva?: BaseDatos): void {
  baseDePruebas = nueva;
  cache = undefined;
}

function base(): BaseDatos | null {
  if (baseDePruebas) return baseDePruebas;
  return postgresConfigurado() ? getBaseDatos() : null;
}

/** ¿Se pueden dar de alta compañeros, o sólo existe la cuenta del entorno? */
export function padronEscribible(): boolean {
  return base() !== null;
}

export function olvidarCache(): void {
  cache = undefined;
}

// ─── Cuenta root del entorno ────────────────────────────────────────────────

/**
 * Lee la cuenta root de `.env`. Acepta la contraseña en claro (`ROOT_CLAVE`,
 * cómodo y suficiente en un archivo que no sale del servidor) o su derivación
 * (`ROOT_CLAVE_HASH`, si prefieres no escribirla). La derivación gana.
 */
export async function rootDeEntorno(): Promise<Cuenta | null> {
  const usuario = (process.env.ROOT_USUARIO ?? 'root').trim();
  const correo = (process.env.ROOT_CORREO ?? '').trim();
  const hash = (process.env.ROOT_CLAVE_HASH ?? '').trim();
  const clara = process.env.ROOT_CLAVE ?? '';
  if (!USUARIO_VALIDO.test(usuario)) return null;

  let derivada = '';
  if (hash.startsWith('scrypt.')) derivada = hash;
  else if (clara.length >= CLAVE_MINIMA) {
    if (rootEnClaro?.clave !== clara)
      rootEnClaro = { clave: clara, derivada: await derivarClave(clara) };
    derivada = rootEnClaro.derivada;
  }
  if (derivada === '') return null;

  return {
    usuario,
    correo: CORREO_VALIDO.test(correo) ? correo : '',
    rol: 'root',
    activo: true,
    origen: 'entorno',
    derivada,
  };
}

/** Padrón adicional sin base de datos: `AUTH_USUARIOS=usuario=derivada;…`. */
function extrasDeEntorno(): Cuenta[] {
  const cuentas: Cuenta[] = [];
  for (const entrada of (process.env.AUTH_USUARIOS ?? '').split(/[;\n]/)) {
    const texto = entrada.trim();
    if (texto === '' || texto.startsWith('#')) continue;
    const corte = texto.indexOf('=');
    if (corte <= 0) continue;
    const usuario = texto.slice(0, corte).trim();
    const derivada = texto.slice(corte + 1).trim();
    if (!USUARIO_VALIDO.test(usuario) || !derivada.startsWith('scrypt.')) continue;
    if (cuentas.some((c) => igual(c.usuario, usuario))) continue;
    cuentas.push({
      usuario,
      correo: '',
      rol: 'investigador',
      activo: true,
      origen: 'entorno',
      derivada,
    });
  }
  return cuentas;
}

// ─── Padrón completo ────────────────────────────────────────────────────────

type Fila = {
  usuario: string;
  correo: string;
  clave: string;
  rol: Rol;
  activo: boolean;
  creado_por: string | null;
  creado_en: Date | string;
};

async function cuentasDeBase(): Promise<Cuenta[]> {
  const db = base();
  if (!db) return [];
  if (cache && cache.hasta > Date.now()) return cache.cuentas;
  const { rows } = await db.query<Fila>(
    `SELECT usuario, correo, clave, rol, activo, creado_por, creado_en
       FROM usuarios ORDER BY creado_en`,
  );
  const cuentas = rows.map<Cuenta>((f) => ({
    usuario: f.usuario,
    correo: f.correo,
    rol: f.rol,
    activo: f.activo,
    origen: 'base',
    derivada: f.clave,
    creadoPor: f.creado_por ?? undefined,
    creadoEn: new Date(f.creado_en).toISOString(),
  }));
  cache = { hasta: Date.now() + CACHE_MS, cuentas };
  return cuentas;
}

/** Todas las cuentas, con el root del entorno primero. Nunca lanza por la base. */
async function todas(): Promise<Cuenta[]> {
  const raiz = await rootDeEntorno();
  const entorno = [...(raiz ? [raiz] : []), ...extrasDeEntorno()];
  let guardadas: Cuenta[] = [];
  try {
    guardadas = await cuentasDeBase();
  } catch {
    // Sin base disponible el acceso sigue en pie con las cuentas del entorno.
    console.error('Padrón: no se pudo leer la tabla usuarios.');
  }
  // El entorno manda: una fila con el mismo nombre no puede suplantar al root.
  return [
    ...entorno,
    ...guardadas.filter((g) => !entorno.some((e) => igual(e.usuario, g.usuario))),
  ];
}

/** Vista pública del padrón, sin derivaciones, para el panel del root. */
export async function listarUsuarios(): Promise<Usuario[]> {
  return (await todas()).map(({ derivada: _derivada, ...resto }) => resto);
}

/** Cuenta vigente por nombre: si dejó de existir o se desactivó, `null`. */
export async function cuentaVigente(usuario: string): Promise<Usuario | null> {
  const cuenta = (await todas()).find((c) => igual(c.usuario, usuario) && c.activo);
  if (!cuenta) return null;
  const { derivada: _derivada, ...resto } = cuenta;
  return resto;
}

/**
 * Autentica por nombre de usuario **o** correo. Siempre deriva una clave —también
 * contra un señuelo— para que el tiempo de respuesta no revele qué cuentas hay.
 */
export async function autenticar(identificador: string, clave: string): Promise<Usuario | null> {
  const buscado = identificador.trim();
  const cuentas = await todas();
  const cuenta = cuentas.find(
    (c) => igual(c.usuario, buscado) || (c.correo !== '' && igual(c.correo, buscado)),
  );
  const derivada = cuenta?.derivada ?? (await senuelo());
  const valida = await verificarClave(clave, derivada);
  // Una cuenta desactivada verifica igual y se rechaza después: mismo tiempo.
  if (!valida || !cuenta || !cuenta.activo) return null;
  const { derivada: _derivada, ...resto } = cuenta;
  return resto;
}

// ─── Altas y bajas (sólo con base de datos) ─────────────────────────────────

export interface AltaUsuario {
  usuario: string;
  correo: string;
  rol: Rol;
  clave: string;
}

export async function crearUsuario(alta: AltaUsuario, creadoPor: string): Promise<Usuario> {
  const db = exigirBase();
  const usuario = alta.usuario.trim();
  const correo = alta.correo.trim();
  if (!USUARIO_VALIDO.test(usuario))
    throw new ErrorUsuario('El usuario admite letras, dígitos, punto, guion y guion bajo.');
  if (!CORREO_VALIDO.test(correo) || correo.length > 254)
    throw new ErrorUsuario('Escribe un correo válido.');
  if (!ROLES.includes(alta.rol)) throw new ErrorUsuario('Rol no válido.');
  exigirClave(alta.clave);
  const raiz = await rootDeEntorno();
  if (raiz && igual(raiz.usuario, usuario))
    throw new ErrorUsuario('Ese nombre es el de la cuenta root del entorno.', 409);

  const derivada = await derivarClave(alta.clave);
  try {
    await db.query(
      'INSERT INTO usuarios (usuario, correo, clave, rol, creado_por) VALUES ($1, $2, $3, $4, $5)',
      [usuario, correo, derivada, alta.rol, creadoPor],
    );
  } catch (e) {
    // 23505 = clave duplicada; el resto no debe filtrar detalles del driver.
    if (esDuplicado(e))
      throw new ErrorUsuario('Ese usuario o ese correo ya están dados de alta.', 409);
    console.error('Padrón: no se pudo dar de alta al usuario.');
    throw new ErrorUsuario('No se pudo guardar el alta.', 503);
  }
  olvidarCache();
  return { usuario, correo, rol: alta.rol, activo: true, origen: 'base', creadoPor };
}

export async function cambiarClave(usuario: string, clave: string): Promise<void> {
  const db = exigirBase();
  exigirClave(clave);
  const derivada = await derivarClave(clave);
  const { rows } = await db.query<{ usuario: string }>(
    'UPDATE usuarios SET clave = $2, clave_actualizada_en = now() WHERE usuario = $1 RETURNING usuario',
    [usuario, derivada],
  );
  if (rows.length === 0) throw new ErrorUsuario('Ese usuario no está en el padrón.', 404);
  olvidarCache();
}

export async function activarUsuario(usuario: string, activo: boolean): Promise<void> {
  const db = exigirBase();
  const { rows } = await db.query<{ usuario: string }>(
    'UPDATE usuarios SET activo = $2 WHERE usuario = $1 RETURNING usuario',
    [usuario, activo],
  );
  if (rows.length === 0) throw new ErrorUsuario('Ese usuario no está en el padrón.', 404);
  olvidarCache();
}

export async function eliminarUsuario(usuario: string): Promise<void> {
  const db = exigirBase();
  const { rows } = await db.query<{ usuario: string }>(
    'DELETE FROM usuarios WHERE usuario = $1 RETURNING usuario',
    [usuario],
  );
  if (rows.length === 0) throw new ErrorUsuario('Ese usuario no está en el padrón.', 404);
  olvidarCache();
}

// ─── Auxiliares ─────────────────────────────────────────────────────────────

function exigirBase(): BaseDatos {
  const db = base();
  if (!db)
    throw new ErrorUsuario(
      'El padrón necesita PostgreSQL. Sin base de datos sólo existe la cuenta del entorno.',
      503,
    );
  return db;
}

function exigirClave(clave: string): void {
  if (clave.length < CLAVE_MINIMA)
    throw new ErrorUsuario(`La contraseña necesita al menos ${CLAVE_MINIMA} caracteres.`);
  if (clave.length > CLAVE_MAXIMA) throw new ErrorUsuario('La contraseña es demasiado larga.');
}

/** Comparación de identificadores: sin distinguir mayúsculas ni acentos sueltos. */
function igual(a: string, b: string): boolean {
  return a.normalize('NFKC').toLowerCase() === b.normalize('NFKC').toLowerCase();
}

let senueloCache: Promise<string> | undefined;
function senuelo(): Promise<string> {
  if (!senueloCache) senueloCache = derivarClave(`señuelo-${Math.random()}`);
  return senueloCache;
}

/** 23505 en PostgreSQL; PGlite lo reporta a veces sólo en el mensaje. */
function esDuplicado(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const error = e as { code?: string; message?: string };
  return error.code === '23505' || /duplicate key|unique constraint/i.test(error.message ?? '');
}
