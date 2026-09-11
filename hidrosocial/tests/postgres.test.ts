import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { migrar } from '../app/microprocesos/persistencia/migraciones';
import { ConflictoBorrador, Repositorio } from '../app/microprocesos/persistencia/repositorio';
import { basePostgresPrueba } from './postgres-prueba';

let pg: PGlite;
let repo: Repositorio;

beforeAll(async () => {
  pg = new PGlite();
  const db = basePostgresPrueba(pg);
  expect(await migrar(db, resolve('db/migrations'))).toEqual([
    '001_persistencia.sql',
    '002_usuarios.sql',
  ]);
  expect(await migrar(db, resolve('db/migrations'))).toEqual([]);
  repo = new Repositorio(db);
}, 30_000);

afterAll(async () => pg.close(), 30_000);

describe('persistencia PostgreSQL', () => {
  test('guarda borradores incompletos con control de versión', async () => {
    const token = randomUUID();
    expect(await repo.guardarBorrador(token, { titulo: '', lentes: [] }, 0)).toBe(1);
    expect(await repo.guardarBorrador(token, { titulo: 'En curso', lentes: ['BIO'] }, 1)).toBe(2);
    expect(await repo.leerBorrador(token)).toEqual({
      datos: { titulo: 'En curso', lentes: ['BIO'] },
      version: 2,
    });
    await expect(repo.guardarBorrador(token, { titulo: 'Copia vieja' }, 1)).rejects.toBeInstanceOf(
      ConflictoBorrador,
    );
  });

  test('envía una aportación y consume el borrador en una transacción', async () => {
    const token = randomUUID();
    await repo.guardarBorrador(token, { titulo: 'Lista' }, 0);
    const documento = {
      id: `9 · Evidencia de campo/prueba-${randomUUID()}.md`,
      metadatos: { titulo: 'Prueba', arbol: 'E1', nodo_id: '2 · Las causas/E1.md' },
      cuerpo: '# Prueba\n',
    };
    await repo.crearDocumento(documento, { token, version: 1 });
    expect(await repo.obtenerDocumento(documento.id)).toMatchObject(documento);
    expect(await repo.leerBorrador(token)).toBeNull();
    await expect(
      repo.crearDocumento({ ...documento, id: `${documento.id}-2` }, { token, version: 1 }),
    ).rejects.toBeInstanceOf(ConflictoBorrador);
  });

  test('importa registros históricos sin cambiarlos y rechaza conflictos', async () => {
    const id = `9 · Evidencia de campo/historico-${randomUUID()}.md`;
    const antiguo = {
      id,
      metadatos: { titulo: 'Formato histórico' },
      cuerpo: '# Texto conservado\n',
      original: '---\ntitulo: "Formato histórico"\n---\n# Texto conservado\n',
      hash: 'hash-estable',
    };
    expect(await repo.importar([antiguo])).toEqual({ nuevos: 1, existentes: 0 });
    expect(await repo.importar([antiguo])).toEqual({ nuevos: 0, existentes: 1 });
    expect(await repo.obtenerDocumento(id)).toMatchObject(antiguo);
    await expect(repo.importar([{ ...antiguo, hash: 'otro-hash' }])).rejects.toThrow(
      'no se sobrescribió',
    );
  });
});
