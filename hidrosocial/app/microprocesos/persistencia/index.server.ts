import pg from 'pg';
import { ConflictoBorrador, ErrorPersistencia, Repositorio } from './repositorio';
import type { BaseDatos, DatosBorrador, Documento, ReferenciaBorrador } from './repositorio';
export { ErrorPersistencia, ConflictoBorrador, Repositorio };
export type {
  BaseDatos,
  Consulta,
  Documento,
  DatosBorrador,
  ReferenciaBorrador,
} from './repositorio';
let pool: pg.Pool | undefined;
let repositorio: Repositorio | undefined;
export function postgresConfigurado(): boolean {
  return !!(repositorio || process.env.DATABASE_URL || process.env.PGHOST);
}
export function getBaseDatos(): BaseDatos {
  if (!postgresConfigurado()) throw new ErrorPersistencia();
  if (!pool) {
    pool = new pg.Pool({
      ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {}),
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    pool.on('error', () => console.error('PostgreSQL: conexión inactiva interrumpida.'));
  }
  const actual = pool;
  return {
    query: (texto, valores) => actual.query(texto, valores),
    async transaction(fn) {
      const cliente = await actual.connect();
      try {
        await cliente.query('BEGIN');
        const resultado = await fn({ query: (texto, valores) => cliente.query(texto, valores) });
        await cliente.query('COMMIT');
        return resultado;
      } catch (e) {
        await cliente.query('ROLLBACK');
        throw e;
      } finally {
        cliente.release();
      }
    },
  };
}
export function getRepositorio(): Repositorio {
  if (!repositorio) repositorio = new Repositorio(getBaseDatos());
  return repositorio;
}
/** Inyección explícita para pruebas con PostgreSQL embebido; nunca se usa en runtime. */
export function establecerRepositorioParaPruebas(nuevo?: Repositorio): void {
  repositorio = nuevo;
}
async function ejecutar<T>(fn: (repo: Repositorio) => Promise<T>): Promise<T> {
  try {
    return await fn(getRepositorio());
  } catch (e) {
    if (e instanceof ConflictoBorrador || e instanceof ErrorPersistencia) throw e;
    // No exponer direcciones, credenciales ni mensajes del driver en formularios.
    console.error('PostgreSQL: operación de persistencia fallida.');
    throw new ErrorPersistencia();
  }
}
export const listarDocumentos = () => ejecutar((r) => r.listarDocumentos());
export const obtenerDocumento = (id: string) => ejecutar((r) => r.obtenerDocumento(id));
export const crearDocumento = (d: Documento, b?: ReferenciaBorrador) =>
  ejecutar((r) => r.crearDocumento(d, b));
export const leerBorrador = (token: string) => ejecutar((r) => r.leerBorrador(token));
export const guardarBorrador = (token: string, datos: DatosBorrador, version: number) =>
  ejecutar((r) => r.guardarBorrador(token, datos, version));
export const eliminarBorrador = (token: string) => ejecutar((r) => r.eliminarBorrador(token));
export async function comprobarPersistencia(): Promise<void> {
  await ejecutar(async (r) => {
    await r.db.query('SELECT id FROM documentos LIMIT 0');
    await r.db.query('SELECT token FROM borradores LIMIT 0');
  });
}
export async function cerrarConexion(): Promise<void> {
  const actual = pool;
  pool = undefined;
  repositorio = undefined;
  if (actual) await actual.end();
}
