// Deriva una contraseña para `.env`, cuando no quieres escribirla en claro.
// Lo normal es al revés: pones la contraseña del root en `ROOT_CLAVE` y a los
// compañeros los das de alta desde el panel. Esto es para el caso cuidadoso.
//
//   bun run clave root                (la pide sin mostrarla en pantalla)
//   bun run clave ana --generar       (inventa una clave larga y la enseña)
//
// La contraseña nunca se guarda: sólo se imprime su derivación scrypt.

import { derivarClave, generarClave } from '../app/microprocesos/sesion/claves.server';

const USUARIO_VALIDO = /^[a-zA-Z0-9._-]{1,64}$/;
const MINIMO = 12;

const CODIGO_FIN_TEXTO = 4;
const CODIGO_INTERRUPCION = 3;
const CODIGO_RETROCESO = 8;
const CODIGO_SUPRIMIR = 127;

const argumentos = process.argv.slice(2);
const usuario = argumentos.find((a) => !a.startsWith('-')) ?? '';
const generar = argumentos.includes('--generar');

if (!USUARIO_VALIDO.test(usuario)) {
  console.error('Uso: bun run clave <usuario> [--generar]');
  console.error('El usuario admite letras, dígitos, punto, guion y guion bajo.');
  process.exit(1);
}

const clave = generar ? generarClave(24) : await pedirClave();

if (clave.length < MINIMO) {
  console.error(`La clave debe tener al menos ${MINIMO} caracteres.`);
  process.exit(1);
}

const derivada = await derivarClave(clave);

console.log('');
console.log('Para la cuenta root, en .env (sustituye a ROOT_CLAVE):');
console.log('');
console.log(`ROOT_CLAVE_HASH=${derivada}`);
console.log('');
console.log('Para una cuenta adicional sin base de datos, en AUTH_USUARIOS:');
console.log('');
console.log(`${usuario}=${derivada}`);
console.log('');
if (generar) {
  console.log(`Clave de ${usuario}: ${clave}`);
  console.log('Entrégala por un canal privado y no la guardes en el repositorio.');
}

/** Lee la clave por entrada estándar; sin eco cuando la terminal lo permite. */
async function pedirClave(): Promise<string> {
  const entrada = process.stdin;
  const interactiva = Boolean(entrada.isTTY) && typeof entrada.setRawMode === 'function';
  process.stdout.write(`Clave para ${usuario}: `);
  if (interactiva) entrada.setRawMode(true);
  entrada.resume();
  entrada.setEncoding('utf8');

  return new Promise<string>((resolver) => {
    let clave = '';
    const terminar = () => {
      entrada.off('data', alRecibir);
      if (interactiva) entrada.setRawMode(false);
      entrada.pause();
      process.stdout.write('\n');
      resolver(clave.normalize('NFKC'));
    };
    const alRecibir = (trozo: string) => {
      for (const caracter of trozo) {
        const codigo = caracter.charCodeAt(0);
        if (caracter === '\n' || caracter === '\r' || codigo === CODIGO_FIN_TEXTO) {
          terminar();
          return;
        }
        if (codigo === CODIGO_INTERRUPCION) {
          process.stdout.write('\n');
          process.exit(130);
        }
        if (codigo === CODIGO_SUPRIMIR || codigo === CODIGO_RETROCESO) {
          clave = clave.slice(0, -1);
          continue;
        }
        clave += caracter;
      }
    };
    entrada.on('data', alRecibir);
  });
}
