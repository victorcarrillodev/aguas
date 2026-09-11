// Primitiva de claves: scrypt (node:crypto) y comparación en tiempo constante.
// Las contraseñas NUNCA se guardan en claro: ni el entorno ni la base guardan
// más que derivaciones `scrypt.N.r.p.sal.derivada`. Quién es quién lo resuelve
// `usuarios.server.ts`; aquí sólo se deriva y se compara.

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derivar = promisify(scrypt) as (
  clave: string | Buffer,
  sal: Buffer,
  longitud: number,
  opciones: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** Coste de derivación por defecto (~16 MiB de memoria, ~100 ms por intento). */
const N = 16384;
const R = 8;
const P = 1;
const LONGITUD = 32;
/** 128 · N · r con holgura: el límite por defecto de Node (32 MiB) se queda corto. */
const maxmemDe = (n: number, r: number) => Math.max(64 * 1024 * 1024, 256 * n * r);

/** Genera la cadena `scrypt.N.r.p.sal.derivada` para una clave nueva. */
export async function derivarClave(clave: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await derivar(clave.normalize('NFKC'), sal, LONGITUD, {
    N,
    r: R,
    p: P,
    maxmem: maxmemDe(N, R),
  });
  return ['scrypt', N, R, P, b64(sal), b64(hash)].join('.');
}

/**
 * Compara una clave contra su derivación. Devuelve `false` ante cualquier
 * formato inválido en vez de lanzar: un error distinguible sería un oráculo.
 */
export async function verificarClave(clave: string, derivada: string): Promise<boolean> {
  const partes = derivada.split('.');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
  const n = Number(partes[1]);
  const r = Number(partes[2]);
  const p = Number(partes[3]);
  // Un coste absurdo en el entorno no debe convertirse en una denegación de servicio.
  if (!esEntero(n, 2, 1 << 20) || !esEntero(r, 1, 64) || !esEntero(p, 1, 16)) return false;
  if ((n & (n - 1)) !== 0) return false;
  let sal: Buffer;
  let esperado: Buffer;
  try {
    sal = Buffer.from(partes[4], 'base64url');
    esperado = Buffer.from(partes[5], 'base64url');
  } catch {
    return false;
  }
  if (sal.length === 0 || esperado.length < 16) return false;
  let obtenido: Buffer;
  try {
    obtenido = await derivar(clave.normalize('NFKC'), sal, esperado.length, {
      N: n,
      r,
      p,
      maxmem: maxmemDe(n, r),
    });
  } catch {
    return false;
  }
  return timingSafeEqual(obtenido, esperado);
}

/** Alfabeto sin caracteres que se confundan al dictar la clave por teléfono. */
const ALFABETO = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Contraseña aleatoria uniforme: se descartan los bytes que sesgarían el módulo.
 * La usan el panel del root y `bun run clave`; una sola implementación.
 */
export function generarClave(longitud = 20): string {
  const techo = Math.floor(256 / ALFABETO.length) * ALFABETO.length;
  let salida = '';
  while (salida.length < longitud) {
    for (const b of randomBytes(longitud * 2)) {
      if (b >= techo) continue;
      salida += ALFABETO[b % ALFABETO.length];
      if (salida.length === longitud) break;
    }
  }
  return salida;
}

function b64(b: Buffer): string {
  return b.toString('base64url');
}

function esEntero(valor: number, min: number, max: number): boolean {
  return Number.isInteger(valor) && valor >= min && valor <= max;
}
