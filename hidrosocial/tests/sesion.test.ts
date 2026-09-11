import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { derivarClave, generarClave, verificarClave } from '../app/microprocesos/sesion/claves.server';
import {
  comprobarIntentos,
  registrarExito,
  registrarFallo,
  reiniciarIntentos,
} from '../app/microprocesos/sesion/intentos.server';
import {
  destinoSeguro,
  estadoConfiguracion,
  iniciarSesion,
  mismoOrigen,
  requerirRoot,
  requerirSesion,
  sesionOpcional,
  testigoCSRF,
  verificarCSRF,
} from '../app/microprocesos/sesion/sesion.server';

const SECRETO = 'secreto-de-pruebas-con-mas-de-32-caracteres';
const CLAVE = 'clave-de-pruebas-larga';
const ORIGEN = 'http://localhost:3000';
const RAIZ = `${ORIGEN}/calidad/`;

const entorno = { ...process.env };
let derivada: string;

// La cuenta del entorno basta para estas pruebas: no hace falta PostgreSQL.
beforeAll(async () => {
  derivada = await derivarClave(CLAVE);
  process.env.SESSION_SECRET = SECRETO;
  process.env.ROOT_USUARIO = 'ana';
  process.env.ROOT_CORREO = 'ana@calidad.com';
  process.env.ROOT_CLAVE = CLAVE;
  process.env.ROOT_CLAVE_HASH = '';
  process.env.AUTH_USUARIOS = '';
});

afterAll(() => {
  process.env = entorno;
});

/** Primer par `nombre=valor` de un Set-Cookie, listo para reenviar. */
function galleta(respuesta: Response): string {
  const cabecera = respuesta.headers.get('Set-Cookie');
  if (!cabecera) throw new Error('la respuesta no trae cookie');
  return cabecera.split(';')[0];
}

describe('claves', () => {
  test('la derivación verifica su propia clave y rechaza cualquier otra', async () => {
    expect(await verificarClave(CLAVE, derivada)).toBe(true);
    expect(await verificarClave(`${CLAVE} `, derivada)).toBe(false);
    expect(await verificarClave('', derivada)).toBe(false);
  });

  test('una derivación con formato inválido devuelve false en vez de lanzar', async () => {
    for (const mala of ['', 'scrypt', 'scrypt.16384.8.1.sal', 'md5.1.1.1.a.b', 'scrypt.3.8.1.YQ.Yg'])
      expect(await verificarClave(CLAVE, mala)).toBe(false);
  });

  test('generarClave produce claves largas y distintas cada vez', () => {
    const a = generarClave(20);
    const b = generarClave(20);
    expect(a).toHaveLength(20);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z2-9]+$/);
  });
});

describe('freno de intentos', () => {
  test('bloquea a partir del sexto fallo y el acierto limpia el historial', () => {
    reiniciarIntentos();
    const claves = ['usuario:ana'];
    for (let i = 0; i < 5; i++) expect(registrarFallo(claves).permitido).toBe(true);
    const sexto = registrarFallo(claves);
    expect(sexto.permitido).toBe(false);
    expect(sexto.espera).toBeGreaterThan(0);
    expect(comprobarIntentos(claves).permitido).toBe(false);
    registrarExito(claves);
    expect(comprobarIntentos(claves).permitido).toBe(true);
  });

  test('la espera crece con cada fallo posterior', () => {
    reiniciarIntentos();
    const claves = ['usuario:luis'];
    for (let i = 0; i < 6; i++) registrarFallo(claves);
    const primera = comprobarIntentos(claves).espera;
    const segunda = registrarFallo(claves).espera;
    expect(segunda).toBeGreaterThan(primera);
    reiniciarIntentos();
  });
});

describe('sesión', () => {
  test('sin cookie no hay sesión y requerirSesion redirige conservando el destino', async () => {
    expect(await sesionOpcional(new Request(RAIZ))).toBeNull();
    const peticion = new Request(`${ORIGEN}/calidad/grafo?q=agua`);
    const lanzado = await requerirSesion(peticion).catch((e: unknown) => e);
    expect(lanzado).toBeInstanceOf(Response);
    const respuesta = lanzado as Response;
    expect(respuesta.status).toBe(302);
    // Sin la base: Remix antepone el basename a lo que devuelve `redirect()`.
    expect(respuesta.headers.get('Location')).toBe('/acceso?destino=%2Fgrafo%3Fq%3Dagua');
  });

  test('la cookie emitida al entrar abre sesión en la petición siguiente', async () => {
    const respuesta = await iniciarSesion(new Request(RAIZ, { method: 'POST' }), 'ana', '/calidad/');
    expect(respuesta.status).toBe(302);
    const cookie = galleta(respuesta);
    expect(respuesta.headers.get('Set-Cookie')).toContain('HttpOnly');
    expect(respuesta.headers.get('Set-Cookie')).toContain('SameSite=Lax');
    const sesion = await sesionOpcional(new Request(RAIZ, { headers: { Cookie: cookie } }));
    expect(sesion?.usuario).toBe('ana');
    expect(await requerirSesion(new Request(RAIZ, { headers: { Cookie: cookie } }))).toBeTruthy();
  });

  test('una cookie manipulada no vale: la firma no cuadra', async () => {
    const respuesta = await iniciarSesion(new Request(RAIZ, { method: 'POST' }), 'ana', '/calidad/');
    const cookie = galleta(respuesta);
    const alterada = `${cookie.slice(0, -4)}AAAA`;
    expect(await sesionOpcional(new Request(RAIZ, { headers: { Cookie: alterada } }))).toBeNull();
  });

  test('quitar la cuenta del entorno cierra su sesión', async () => {
    const respuesta = await iniciarSesion(new Request(RAIZ, { method: 'POST' }), 'ana', '/calidad/');
    const cookie = galleta(respuesta);
    const clave = process.env.ROOT_CLAVE;
    process.env.ROOT_CLAVE = '';
    expect(await sesionOpcional(new Request(RAIZ, { headers: { Cookie: cookie } }))).toBeNull();
    process.env.ROOT_CLAVE = clave;
  });

  test('la sesión lleva el rol y el correo del padrón, no de la cookie', async () => {
    const respuesta = await iniciarSesion(new Request(RAIZ, { method: 'POST' }), 'ana', '/');
    const sesion = await sesionOpcional(new Request(RAIZ, { headers: { Cookie: galleta(respuesta) } }));
    expect(sesion).toMatchObject({ usuario: 'ana', rol: 'root', correo: 'ana@calidad.com' });
  });

  test('tras un proxy de confianza la cookie sale con Secure', async () => {
    const cabeceras = { 'X-Forwarded-Proto': 'https' };
    const conProxy = async (confiar: string) => {
      const previo = process.env.CONFIAR_PROXY;
      process.env.CONFIAR_PROXY = confiar;
      const r = await iniciarSesion(new Request(RAIZ, { method: 'POST', headers: cabeceras }), 'ana', '/');
      process.env.CONFIAR_PROXY = previo;
      return r.headers.get('Set-Cookie') ?? '';
    };
    expect(await conProxy('1')).toContain('Secure');
    // Sin proxy declarado la cabecera es falsificable: no se hace caso.
    expect(await conProxy('0')).not.toContain('Secure');
  });

  test('sin secreto configurado el sistema queda cerrado, no abierto', async () => {
    const secreto = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = 'corto';
    expect((await estadoConfiguracion()).ok).toBe(false);
    expect((await estadoConfiguracion()).faltantes).toContain('SESSION_SECRET');
    expect(await sesionOpcional(new Request(RAIZ))).toBeNull();
    const lanzado = await requerirSesion(new Request(RAIZ)).catch((e: unknown) => e);
    expect(lanzado).toBeInstanceOf(Response);
    process.env.SESSION_SECRET = secreto;
    expect((await estadoConfiguracion()).ok).toBe(true);
  });

  test('sin cuenta root el acceso también queda cerrado', async () => {
    const clave = process.env.ROOT_CLAVE;
    process.env.ROOT_CLAVE = '';
    const estado = await estadoConfiguracion();
    expect(estado.ok).toBe(false);
    expect(estado.faltantes).toContain('ROOT_CLAVE');
    process.env.ROOT_CLAVE = clave;
  });

  test('requerirRoot deja pasar al root', async () => {
    const respuesta = await iniciarSesion(new Request(RAIZ, { method: 'POST' }), 'ana', '/');
    const conSesion = new Request(`${ORIGEN}/calidad/usuarios`, {
      headers: { Cookie: galleta(respuesta) },
    });
    expect((await requerirRoot(conSesion)).rol).toBe('root');
  });

  test('a quien no es root el panel le responde 403, no un desvío', async () => {
    // Una cuenta extra del entorno entra como investigador, nunca como root.
    process.env.AUTH_USUARIOS = `luis=${derivada}`;
    const respuesta = await iniciarSesion(new Request(RAIZ, { method: 'POST' }), 'luis', '/');
    const conSesion = new Request(`${ORIGEN}/calidad/usuarios`, {
      headers: { Cookie: galleta(respuesta) },
    });
    expect((await sesionOpcional(conSesion))?.rol).toBe('investigador');
    const lanzado = await requerirRoot(conSesion).catch((e: unknown) => e);
    process.env.AUTH_USUARIOS = '';
    expect(lanzado).toBeInstanceOf(Response);
    expect((lanzado as Response).status).toBe(403);
  });

  test('una sesión sin cuenta vigente se desvía al acceso, no da 403', async () => {
    const respuesta = await iniciarSesion(new Request(RAIZ, { method: 'POST' }), 'fantasma', '/');
    const conSesion = new Request(`${ORIGEN}/calidad/usuarios`, {
      headers: { Cookie: galleta(respuesta) },
    });
    const lanzado = await requerirRoot(conSesion).catch((e: unknown) => e);
    expect((lanzado as Response).status).toBe(302);
  });
});

describe('destino y CSRF', () => {
  test('el destino sólo admite rutas internas y viaja sin la base', () => {
    expect(destinoSeguro('/grafo')).toBe('/grafo');
    expect(destinoSeguro('/calidad/grafo')).toBe('/grafo');
    expect(destinoSeguro('/calidad')).toBe('/');
    expect(destinoSeguro('https://ajeno.example/x')).toBe('/');
    expect(destinoSeguro('//ajeno.example/x')).toBe('/');
    expect(destinoSeguro('/\\ajeno.example')).toBe('/');
    expect(destinoSeguro('/grafo\nLocation: http://ajeno')).toBe('/');
    expect(destinoSeguro('/acceso')).toBe('/');
    expect(destinoSeguro('/acceso?destino=%2F')).toBe('/');
    expect(destinoSeguro(null)).toBe('/');
  });

  test('el testigo se compara contra la cookie y exige origen propio', async () => {
    const emitido = await testigoCSRF(new Request(RAIZ));
    expect(emitido).not.toBeNull();
    const cookie = (emitido as { cookie: string }).cookie.split(';')[0];
    const testigo = (emitido as { testigo: string }).testigo;
    const envio = (cabeceras: Record<string, string>, valor: string) =>
      verificarCSRF(new Request(`${ORIGEN}/calidad/acceso`, { method: 'POST', headers: { Cookie: cookie, ...cabeceras } }), valor);

    expect(await envio({ Origin: ORIGEN }, testigo)).toBe(true);
    expect(await envio({ Origin: ORIGEN }, 'otro')).toBe(false);
    expect(await envio({ Origin: 'https://ajeno.example' }, testigo)).toBe(false);
    // Sin Origin ni Referer no se puede comprobar la procedencia: se rechaza.
    expect(await envio({}, testigo)).toBe(false);
    expect(await envio({ Referer: `${ORIGEN}/calidad/acceso` }, testigo)).toBe(true);
  });

  test('mismoOrigen rechaza un Referer de otro sitio', () => {
    const con = (cabeceras: Record<string, string>) =>
      mismoOrigen(new Request(`${ORIGEN}/calidad/acceso`, { method: 'POST', headers: cabeceras }));
    expect(con({ Origin: ORIGEN })).toBe(true);
    expect(con({ Referer: 'https://ajeno.example/x' })).toBe(false);
    expect(con({ Referer: 'no-es-una-url' })).toBe(false);
  });
});

describe('cobertura de la guarda', () => {
  /** Rutas públicas a propósito: el acceso, la salida y la sonda de Docker. */
  const PUBLICAS = new Set(['RutaAcceso.tsx', 'SalidaSalir.tsx', 'SalidaHealthcheck.tsx']);

  test('toda ruta con loader o action llama a requerirSesion', async () => {
    const directorio = join(import.meta.dir, '..', 'app', 'rutas');
    const desprotegidas: string[] = [];
    for (const archivo of await readdir(directorio)) {
      if (!archivo.endsWith('.tsx') || PUBLICAS.has(archivo)) continue;
      const codigo = await readFile(join(directorio, archivo), 'utf8');
      const exporta = /export\s+(async\s+)?(function|const)\s+(loader|action)\b/.test(codigo);
      // `requerirRoot` llama a `requerirSesion`: ambas cierran la puerta.
      const guardada = codigo.includes('requerirSesion') || codigo.includes('requerirRoot');
      if (exporta && !guardada) desprotegidas.push(archivo);
    }
    expect(desprotegidas).toEqual([]);
  });
});
