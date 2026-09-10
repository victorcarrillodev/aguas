import type { Dirent } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { listarDocumentos, postgresConfigurado } from '../persistencia/index.server';
import { parseVault } from '../vault-core/index';
import type { FileMeta, VaultGraph } from '../vault-core/tipos';

// TTL 2 s: revalida archivos y registros de PostgreSQL, incluidos cambios de otros procesos.

const TTL_MS = 2000;

/** Ruta absoluta del vault: `VAULT_PATH` o `..` desde el cwd. */
export function getVaultPath(): string {
  return resolve(process.env.VAULT_PATH ?? '..');
}

let grafo: VaultGraph | undefined;
let firmas: Map<string, FileMeta> = new Map();
let escaneadoEn = 0;
let enVuelo: Promise<VaultGraph> | null = null;
let generacion = 0;
let rutaCache = '';
let postgresCache = false;

const EXCLUIDOS = new Set([
  '.obsidian',
  '.git',
  'node_modules',
  'build',
  'graphify-out',
  'hidrosocial',
]);

async function recogerFirmas(vaultPath: string): Promise<Map<string, FileMeta>> {
  const mapa = new Map<string, FileMeta>();
  async function caminar(dirAbs: string, dirRel: string): Promise<void> {
    let entradas: Dirent[] | undefined;
    try {
      entradas = await readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    if (!entradas) return;
    for (const e of entradas) {
      if (EXCLUIDOS.has(e.name)) continue;
      const rel = dirRel ? `${dirRel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (rel === '_Trabajo interno' || rel.startsWith('_Trabajo interno/')) continue;
        await caminar(join(dirAbs, e.name), rel);
      } else if (e.name.endsWith('.md') || e.name.endsWith('.canvas')) {
        try {
          const s = await stat(join(dirAbs, e.name));
          mapa.set(rel, { mtimeMs: s.mtimeMs, size: s.size });
        } catch {
          // El archivo desapareció entre readdir y stat: se ignora.
        }
      }
    }
  }
  await caminar(vaultPath, '');
  return mapa;
}

function mismasFirmas(a: Map<string, FileMeta>, b: Map<string, FileMeta>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    const o = b.get(k);
    if (!o || o.mtimeMs !== v.mtimeMs || o.size !== v.size) return false;
  }
  return true;
}

async function cargar(): Promise<VaultGraph> {
  const vaultPath = getVaultPath();
  const usaPostgres = postgresConfigurado();
  const ahora = Date.now();
  const version = generacion;
  const mismaFuente = rutaCache === vaultPath && postgresCache === usaPostgres;
  if (grafo && mismaFuente && ahora - escaneadoEn < TTL_MS) return grafo;
  const [nuevas, documentos] = await Promise.all([
    recogerFirmas(vaultPath),
    usaPostgres ? listarDocumentos() : Promise.resolve([]),
  ]);
  // Los mtimes no reflejan cambios en PostgreSQL: siempre incorporar su nueva lectura.
  const resultado = grafo && mismaFuente && !usaPostgres && mismasFirmas(firmas, nuevas)
    ? grafo
    : await parseVault(vaultPath, documentos);
  // Una lectura iniciada antes del guardado no puede restaurar la caché invalidada.
  if (version === generacion) {
    grafo = resultado;
    firmas = nuevas;
    escaneadoEn = ahora;
    rutaCache = vaultPath;
    postgresCache = usaPostgres;
  }
  return resultado;
}

/** Grafo combinado; los cambios externos se incorporan al vencer el TTL. */
export function getVaultGraph(): Promise<VaultGraph> {
  if (!enVuelo) {
    const pendiente = cargar().finally(() => {
      if (enVuelo === pendiente) enVuelo = null;
    });
    enVuelo = pendiente;
  }
  return enVuelo;
}

/** Invalida inmediatamente después de confirmar una escritura. */
export function invalidar(): void {
  generacion += 1;
  grafo = undefined;
  firmas = new Map();
  escaneadoEn = 0;
  enVuelo = null;
}
