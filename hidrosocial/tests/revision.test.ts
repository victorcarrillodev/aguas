import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { invalidar } from '../app/microprocesos/cache/index';
import { guardarNota } from '../app/microprocesos/captura/escritor';
import { validarBorrador } from '../app/microprocesos/captura/esquema';
import { guardarRegistro } from '../app/microprocesos/captura/registro.server';
import { calcularMetricas } from '../app/microprocesos/dashboard/metricas';
import { construirGrafoRender } from '../app/microprocesos/grafo/construir';
import {
  estadoDato,
  estadoRevision,
  origenDe,
  registrosDe,
} from '../app/microprocesos/revision/index';
import { construirRed } from '../app/microprocesos/sistema/red';
import { simular } from '../app/microprocesos/sistema/simulacion';
import { parseFrontmatter } from '../app/microprocesos/vault-core/frontmatter';
import { parseVault } from '../app/microprocesos/vault-core/index';
import {
  establecerRepositorioParaPruebas,
  Repositorio,
} from '../app/microprocesos/persistencia/index.server';
import { migrar } from '../app/microprocesos/persistencia/migraciones';
import { basePostgresPrueba } from './postgres-prueba';
import { establecerBaseParaPruebas } from '../app/microprocesos/sesion/usuarios.server';

let directorio: string;
let pg: PGlite;
let repo: Repositorio;
async function cargar() {
  return parseVault(directorio, await repo.listarDocumentos());
}
function obtener(g: Awaited<ReturnType<typeof parseVault>>, id: string) {
  const n = g.nodos.get(id);
  if (!n) throw new Error(`Falta el nodo de prueba ${id}`);
  return n;
}
const anterior = process.env.VAULT_PATH;
const causa = '2 · Las causas/E1.md';
const indicador = '6 · Las mediciones/Horas.md';
const original =
  '---\nid: E1\narbol: E1\nenunciado: "Servicio discontinuo"\nestado: en-revision\ndepende_de: [E8]\nsostiene_a: []\n---\n# Servicio\n';
function fd(valores: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(valores)) f.set(k, v);
  return f;
}

beforeAll(async () => {
  pg = new PGlite();
  const db = basePostgresPrueba(pg);
  establecerBaseParaPruebas(db);
  await migrar(db, resolve('db/migrations'));
  repo = new Repositorio(db);
  establecerRepositorioParaPruebas(repo);
  directorio = await mkdtemp(join(tmpdir(), 'hidrosocial-test-'));
  process.env.VAULT_PATH = directorio;
  for (const dir of ['2 · Las causas', '3 · Las fichas', '6 · Las mediciones'])
    await mkdir(join(directorio, dir));
  await writeFile(join(directorio, causa), original);
  await writeFile(
    join(directorio, '2 · Las causas/E8.md'),
    '---\nid: E8\narbol: E8\ndepende_de: []\nsostiene_a: []\n---\n# Fiscalización',
  );
  await writeFile(
    join(directorio, '3 · Las fichas/E1.2.md'),
    '---\nid: E1.2\narbol: E1\npadre: E1\n---\n# Causa intermedia',
  );
  await writeFile(
    join(directorio, '3 · Las fichas/E1.2.1.md'),
    '---\nid: E1.2.1\narbol: E1\npadre: E1.2\nproduce: menos control\n---\n# Muestreo',
  );
  await writeFile(
    join(directorio, indicador),
    '---\nid: IND-horas\narbol: E1\nlinea_base: null\n---\n# Horas\n## Línea base\nNo disponible.',
  );
  invalidar();
}, 30_000);
afterAll(async () => {
  establecerRepositorioParaPruebas();
  establecerBaseParaPruebas();
  await pg.close();
  if (anterior === undefined) Reflect.deleteProperty(process.env, 'VAULT_PATH');
  else process.env.VAULT_PATH = anterior;
  invalidar();
  if (directorio) {
    const absoluto = resolve(directorio);
    if (absoluto.startsWith(`${resolve(tmpdir())}${sep}hidrosocial-test-`))
      await rm(absoluto, { recursive: true, force: true });
  }
}, 30_000);

describe('Expedientes durables', () => {
  test('preserva texto original, multilínea y decisiones por propuesta', async () => {
    const propuesta = await guardarRegistro(
      fd({
        registro: 'propuesta',
        responsable: 'Equipo',
        fundamento: 'Contrastar dos zonas',
        texto_propuesto: 'Texto "alternativo"\ncon: dos líneas',
      }),
      causa,
    );
    await guardarRegistro(
      fd({
        registro: 'decision',
        responsable: 'Mesa',
        referencia: 'Acta de prueba',
        fundamento: 'Pendiente de medición',
        objeto: 'interpretacion',
        decision: 'revisar',
        propuesta_id: propuesta,
      }),
      causa,
    );
    const g = await cargar();
    const registros = registrosDe(g, causa);
    expect(registros).toHaveLength(2);
    expect(
      registros.find((r) => r.frontmatter.registro === 'propuesta')?.frontmatter.texto_propuesto,
    ).toBe('Texto "alternativo"\ncon: dos líneas');
    expect(estadoRevision(obtener(g, causa), registros)).toBe('En revisión');
    expect(await readFile(join(directorio, causa), 'utf8')).toBe(original);
  });
  test('rechaza una decisión sin referencia y una propuesta ajena', async () => {
    await expect(
      guardarRegistro(
        fd({
          registro: 'decision',
          responsable: 'Mesa',
          fundamento: 'Revisión',
          objeto: 'interpretacion',
          decision: 'aceptada',
        }),
        causa,
      ),
    ).rejects.toThrow();
    await expect(
      guardarRegistro(
        fd({
          registro: 'decision',
          responsable: 'Mesa',
          fundamento: 'Revisión',
          referencia: 'Acta',
          objeto: 'interpretacion',
          decision: 'aceptada',
          propuesta_id: indicador,
        }),
        causa,
      ),
    ).rejects.toThrow();
  });
  test('no interpreta una búsqueda pendiente como inexistencia', async () => {
    await guardarRegistro(
      fd({
        registro: 'busqueda',
        responsable: 'Equipo',
        fundamento: 'Por solicitar',
        estado_dato: 'pendiente',
      }),
      indicador,
    );
    let g = await cargar();
    expect(estadoDato(obtener(g, indicador), registrosDe(g, indicador))).toBe('pendiente');
    expect(calcularMetricas(g).medicionesSinLineaBase).toBe(1);
    await expect(
      guardarRegistro(
        fd({
          registro: 'busqueda',
          responsable: 'Equipo',
          fundamento: 'No hay',
          estado_dato: 'reservado',
        }),
        indicador,
      ),
    ).rejects.toThrow();
    await guardarRegistro(
      fd({
        registro: 'indicador',
        responsable: 'Equipo',
        fundamento: 'Ejemplo de prueba',
        estado_dato: 'incorporado',
        referencia: 'Registro sintético',
        valor: '0',
        unidad: 'horas/día',
        poblacion: 'Muestra de prueba',
        territorio: 'Zona de prueba',
        periodo: '2026-09',
        metodo: 'Registro horario',
        tipo_valor: 'observado',
        limitaciones: 'Caso sintético para comprobar persistencia; no representa datos de campo.',
      }),
      indicador,
    );
    invalidar();
    g = await cargar();
    expect(estadoDato(obtener(g, indicador), registrosDe(g, indicador))).toBe('incorporado');
    expect(calcularMetricas(g).medicionesSinLineaBase).toBe(0);
  });
  test('una contraprueba sigue siendo contraprueba al volver a leerla', async () => {
    const f = fd({
      titulo: 'Prueba con "comillas"',
      enunciado: 'Observación',
      observacion: 'Caso contrario',
      arbol: 'E1',
      capa: 'C1',
      lentes: 'BIO',
      tipoEvidencia: 'documento',
      fuente: 'Archivo',
      fecha: '2026-09-04',
      afirmacion: 'Servicio discontinuo',
      referencia: 'Referencia sintética',
      responsable: 'Equipo',
      relacion: 'contradice',
      nodoId: causa,
      alcance: 'Zona y periodo sintéticos de la prueba.',
      metodo: 'Lectura de un documento sintético.',
      interpretacion: 'El caso sintético permite examinar una excepción a la afirmación.',
      limitaciones: 'Ejemplo ficticio sin pretensión de representar la población.',
    });
    const nota = await guardarNota(validarBorrador(f));
    const g = await cargar();
    expect(g.nodos.get(nota.id)?.frontmatter.relacion).toBe('contradice');
    expect(
      registrosDe(g, causa).filter((r) => r.frontmatter.relacion === 'contradice'),
    ).toHaveLength(1);
    expect(calcularMetricas(g).evidencias).toHaveLength(1);
    f.set('fecha', '2026-02-31');
    expect(() => validarBorrador(f)).toThrow();
    f.set('fecha', '2026-09-04');
    f.set('arbol', 'E8');
    await expect(guardarNota(validarBorrador(f))).rejects.toThrow();
  });
  test('rutas ajenas no escriben registros', async () => {
    const antes = await repo.listarDocumentos();
    await expect(guardarRegistro(fd({ registro: 'propuesta' }), '../fuera.md')).rejects.toThrow();
    expect(await repo.listarDocumentos()).toEqual(antes);
  });
});

test('el explorador calcula inclusión, no sostenibilidad ni orden', async () => {
  const g = await cargar();
  const red = construirRed(g);
  expect(red.porArbol.get('E8')?.sostieneA).toEqual(['E1']);
  expect(simular(red, ['E1']).fragiles[0].falta).toEqual(['E8']);
  expect(simular(red, ['E1', 'E8']).veredicto).toContain('no establece un orden');
  expect(simular(red, ['E8', 'E1'])).toEqual(simular(red, ['E1', 'E8']));
  expect(simular(red, ['E10']).resueltos).toEqual([]);
});

test('conserva relaciones semánticas y correspondencia de subyacentes', async () => {
  const g = await cargar();
  expect(origenDe(obtener(g, '3 · Las fichas/E1.2.1.md'))).toBe('AP_E1!F11:L11');
  const render = construirGrafoRender(g);
  expect(
    render.aristas.some((a) => a.tipo === 'causa-propuesta' && a.etiqueta === 'menos control'),
  ).toBe(true);
  expect(render.aristas.some((a) => a.tipo === 'supuesto')).toBe(true);
  expect(parseFrontmatter('---\nx: "a\\nb"\n---\nTexto').datos.x).toBe('a\nb');
});

test('el guardado autenticado redirige sin repetir el basename y abre la evidencia', async () => {
  const { action } = await import('../app/rutas/RutaCaptura');
  const { loader: leerNodo, action: revisarNodo } = await import('../app/rutas/RutaNodo');
  const { iniciarSesion } = await import('../app/microprocesos/sesion/sesion.server');
  const entorno = { ...process.env };
  try {
    process.env.SESSION_SECRET = 'secreto-sintetico-de-prueba-de-mas-de-32-caracteres';
    process.env.ROOT_USUARIO = 'prueba-ruta';
    process.env.ROOT_CLAVE = 'clave-sintetica-para-pruebas';
    process.env.ROOT_CLAVE_HASH = '';
    process.env.CONFIAR_PROXY = '0';
    const acceso = await iniciarSesion(new Request('http://localhost/calidad/acceso'), 'prueba-ruta', '/');
    const cookie = acceso.headers.get('Set-Cookie')?.split(';')[0] || '';
    const campos = fd({
      _version: '0', titulo: 'Prueba de ruta', enunciado: 'Observación', observacion: 'Caso sintético',
      arbol: 'E1', capa: 'C1', lentes: 'BIO', tipoEvidencia: 'documento', fuente: 'Prueba',
      fecha: '2026-09-10', afirmacion: 'Servicio discontinuo', referencia: 'Referencia sintética',
      responsable: 'Equipo', relacion: 'no-concluyente', nodoId: causa,
      alcance: 'Zona sintética', metodo: 'Documento sintético',
      interpretacion: 'Sin conclusión poblacional', limitaciones: 'Datos ficticios',
    });
    const respuesta = await action({
      request: new Request('http://localhost/calidad/captura', { method: 'POST', body: campos,
        headers: { Cookie: cookie, Origin: 'http://localhost' } }), params: {}, context: {},
    });
    expect(respuesta.status).toBe(302);
    const destino = respuesta.headers.get('Location') || '';
    expect(destino).toMatch(/^\/nodo\/[^/]+\?recibido=1$/);
    const url = new URL(`/calidad${destino}`, 'http://localhost');
    const slug = url.pathname.split('/').pop() || '';
    const pagina = await leerNodo({ request: new Request(url, { headers: { Cookie: cookie } }),
      params: { slug }, context: {} });
    expect(pagina.status).toBe(200);
    expect((await pagina.json()).recibido).toBe(true);

    // La ruta de revisiones debe rechazar el envío antes de tocar la persistencia.
    const antes = (await repo.listarDocumentos()).length;
    for (const [headers, body, status] of [
      [{}, 'registro=propuesta', 403],
      [{ Origin: 'http://localhost' }, 'a'.repeat(160_001), 413],
    ] as const) {
      const rechazada = await revisarNodo({ request: new Request(url, {
        method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body,
      }), params: { slug }, context: {} });
      expect(rechazada.status).toBe(status);
    }
    expect((await repo.listarDocumentos()).length).toBe(antes);
  } finally {
    process.env = entorno;
  }
});
