import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { migrar } from '../app/microprocesos/persistencia/migraciones';
import { derivarClave } from '../app/microprocesos/sesion/claves.server';
import { correoAlta, correoClaveNueva } from '../app/microprocesos/sesion/plantilla-correo.server';
import { sesionOpcional } from '../app/microprocesos/sesion/sesion.server';
import {
  activarUsuario,
  autenticar,
  cambiarClave,
  crearUsuario,
  cuentaVigente,
  eliminarUsuario,
  ErrorUsuario,
  establecerBaseParaPruebas,
  listarUsuarios,
  olvidarCache,
  padronEscribible,
  rootDeEntorno,
} from '../app/microprocesos/sesion/usuarios.server';
import { basePostgresPrueba } from './postgres-prueba';

const CLAVE_ROOT = 'clave-root-de-pruebas';
const CLAVE_ANA = 'clave-de-ana-larga';
const entorno = { ...process.env };
let pg: PGlite;

beforeAll(async () => {
  pg = new PGlite();
  await migrar(basePostgresPrueba(pg), fileURLToPath(new URL('../db/migrations/', import.meta.url)));
  establecerBaseParaPruebas(basePostgresPrueba(pg));
});

afterAll(async () => {
  establecerBaseParaPruebas(undefined);
  process.env = entorno;
  await pg.close();
});

beforeEach(async () => {
  process.env.ROOT_USUARIO = 'root';
  process.env.ROOT_CORREO = 'aguaCalidad@calidad.com';
  process.env.ROOT_CLAVE = CLAVE_ROOT;
  process.env.ROOT_CLAVE_HASH = '';
  process.env.AUTH_USUARIOS = '';
  await pg.query('DELETE FROM usuarios');
  olvidarCache();
});

describe('cuenta root del entorno', () => {
  test('la contraseña en claro de .env basta para entrar', async () => {
    const raiz = await rootDeEntorno();
    expect(raiz?.usuario).toBe('root');
    expect(raiz?.correo).toBe('aguaCalidad@calidad.com');
    expect(raiz?.rol).toBe('root');
    expect(await autenticar('root', CLAVE_ROOT)).toMatchObject({ usuario: 'root', rol: 'root' });
    expect(await autenticar('root', 'otra cosa')).toBeNull();
  });

  test('también se entra con el correo del root', async () => {
    expect(await autenticar('aguaCalidad@calidad.com', CLAVE_ROOT)).toMatchObject({ rol: 'root' });
    expect(await autenticar('AGUACALIDAD@CALIDAD.COM', CLAVE_ROOT)).toMatchObject({ rol: 'root' });
  });

  test('la derivación tiene prioridad sobre la clave en claro', async () => {
    process.env.ROOT_CLAVE_HASH = await derivarClave('otra-clave-distinta');
    expect(await autenticar('root', CLAVE_ROOT)).toBeNull();
    expect(await autenticar('root', 'otra-clave-distinta')).toMatchObject({ usuario: 'root' });
  });

  test('una clave demasiado corta no habilita la cuenta: queda cerrado', async () => {
    process.env.ROOT_CLAVE = 'corta';
    expect(await rootDeEntorno()).toBeNull();
    expect(await autenticar('root', 'corta')).toBeNull();
  });

  test('el root del entorno no se puede suplantar desde la base', async () => {
    await expect(
      crearUsuario({ usuario: 'root', correo: 'falso@calidad.com', rol: 'root', clave: CLAVE_ANA }, 'root'),
    ).rejects.toThrow(ErrorUsuario);
  });
});

describe('altas desde el panel', () => {
  test('alta, acceso y listado', async () => {
    expect(padronEscribible()).toBe(true);
    const ana = await crearUsuario(
      { usuario: 'ana', correo: 'ana@ejemplo.org', rol: 'investigador', clave: CLAVE_ANA },
      'root',
    );
    expect(ana).toMatchObject({ usuario: 'ana', rol: 'investigador', activo: true, origen: 'base' });
    expect(await autenticar('ana', CLAVE_ANA)).toMatchObject({ usuario: 'ana' });
    expect(await autenticar('ana@ejemplo.org', CLAVE_ANA)).toMatchObject({ usuario: 'ana' });
    expect((await listarUsuarios()).map((u) => u.usuario)).toEqual(['root', 'ana']);
    // El listado nunca lleva derivaciones de contraseña.
    expect(JSON.stringify(await listarUsuarios())).not.toContain('scrypt.');
  });

  test('rechaza usuario, correo, rol y clave inválidos', async () => {
    const alta = (p: Record<string, string>) =>
      crearUsuario(
        {
          usuario: 'ok',
          correo: 'ok@ejemplo.org',
          rol: 'investigador',
          clave: CLAVE_ANA,
          ...p,
        } as never,
        'root',
      );
    await expect(alta({ usuario: 'con espacio' })).rejects.toThrow(ErrorUsuario);
    await expect(alta({ correo: 'sin-arroba' })).rejects.toThrow(ErrorUsuario);
    await expect(alta({ rol: 'jefe' })).rejects.toThrow(ErrorUsuario);
    await expect(alta({ clave: 'corta' })).rejects.toThrow(ErrorUsuario);
  });

  test('no admite dos cuentas con el mismo usuario ni el mismo correo', async () => {
    await crearUsuario({ usuario: 'ana', correo: 'ana@ejemplo.org', rol: 'investigador', clave: CLAVE_ANA }, 'root');
    await expect(
      crearUsuario({ usuario: 'ana', correo: 'otra@ejemplo.org', rol: 'investigador', clave: CLAVE_ANA }, 'root'),
    ).rejects.toThrow(ErrorUsuario);
    await expect(
      crearUsuario({ usuario: 'ana2', correo: 'ANA@ejemplo.org', rol: 'investigador', clave: CLAVE_ANA }, 'root'),
    ).rejects.toThrow(ErrorUsuario);
  });
});

describe('bajas y cambios', () => {
  beforeEach(async () => {
    await crearUsuario(
      { usuario: 'ana', correo: 'ana@ejemplo.org', rol: 'investigador', clave: CLAVE_ANA },
      'root',
    );
  });

  test('la clave nueva invalida la anterior', async () => {
    await cambiarClave('ana', 'clave-nueva-de-ana');
    expect(await autenticar('ana', CLAVE_ANA)).toBeNull();
    expect(await autenticar('ana', 'clave-nueva-de-ana')).toMatchObject({ usuario: 'ana' });
  });

  test('desactivar cierra el paso sin borrar la cuenta', async () => {
    await activarUsuario('ana', false);
    expect(await autenticar('ana', CLAVE_ANA)).toBeNull();
    expect(await cuentaVigente('ana')).toBeNull();
    expect((await listarUsuarios()).find((u) => u.usuario === 'ana')?.activo).toBe(false);
    await activarUsuario('ana', true);
    expect(await autenticar('ana', CLAVE_ANA)).toMatchObject({ usuario: 'ana' });
  });

  test('eliminar borra la cuenta del padrón', async () => {
    await eliminarUsuario('ana');
    expect(await autenticar('ana', CLAVE_ANA)).toBeNull();
    expect((await listarUsuarios()).map((u) => u.usuario)).toEqual(['root']);
    await expect(eliminarUsuario('ana')).rejects.toThrow(ErrorUsuario);
  });

  test('eliminar a alguien invalida su sesión abierta', async () => {
    process.env.SESSION_SECRET = 'secreto-de-pruebas-con-mas-de-32-caracteres';
    const { iniciarSesion } = await import('../app/microprocesos/sesion/sesion.server');
    const peticion = new Request('http://localhost/calidad/', { method: 'POST' });
    const cookie = (await iniciarSesion(peticion, 'ana', '/'))
      .headers.get('Set-Cookie')
      ?.split(';')[0] as string;
    const conCookie = new Request('http://localhost/calidad/', { headers: { Cookie: cookie } });
    expect((await sesionOpcional(conCookie))?.usuario).toBe('ana');
    await eliminarUsuario('ana');
    expect(await sesionOpcional(conCookie)).toBeNull();
  });
});

describe('correo de credenciales', () => {
  const credenciales = {
    usuario: 'ana',
    correo: 'ana@ejemplo.org',
    clave: 'Clave-De-Prueba-24',
    rol: 'investigador',
    url: 'https://calidad.example/calidad/acceso',
    invitadoPor: 'root',
  };

  test('el alta lleva texto plano y HTML con las credenciales', () => {
    const mensaje = correoAlta(credenciales);
    expect(mensaje.para).toBe('ana@ejemplo.org');
    expect(mensaje.texto).toContain('Clave-De-Prueba-24');
    expect(mensaje.html).toContain('Clave-De-Prueba-24');
    expect(mensaje.html).toContain('https://calidad.example/calidad/acceso');
    expect(mensaje.html?.startsWith('<!doctype html>')).toBe(true);
  });

  test('el restablecimiento avisa de que la anterior ya no sirve', () => {
    const mensaje = correoClaveNueva(credenciales);
    expect(mensaje.asunto).toContain('contraseña');
    expect(mensaje.texto).toContain('La anterior ya no sirve');
  });

  test('un nombre con HTML no se cuela en el mensaje', () => {
    const mensaje = correoAlta({ ...credenciales, usuario: '<img src=x onerror=alert(1)>' });
    expect(mensaje.html).not.toContain('<img src=x');
    expect(mensaje.html).toContain('&lt;img src=x');
  });
});
