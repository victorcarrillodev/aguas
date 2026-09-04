// Helpers de rutas e identificadores de nodo.
// Sin dependencias de Node: se usan en servidor (loaders) y en cliente
// (WrapperSigma, PanelDetalleNodo). slug/nodeId = base64url del relPath.

export function encodeNodo(relPath: string): string {
  const bytes = new TextEncoder().encode(relPath);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeNodo(slug: string): string {
  let b64 = slug.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Codifica UN segmento de ruta (nombre de carpeta o archivo) para markdown links. */
export function urlSegmento(nombre: string): string {
  return encodeURIComponent(nombre);
}

/** Codifica un relPath completo por segmentos, respetando `/` (formato del vault). */
export function urlPath(relPath: string): string {
  return relPath.split('/').map(urlSegmento).join('/');
}

/** Enlace markdown relativo URL-encoded desde `dirOrigen` hacia `relDestino`. */
export function enlaceMarkdown(titulo: string, dirOrigen: string, relDestino: string): string {
  const relativo = relativoA(dirOrigen, relDestino);
  return `[${titulo}](${urlPath(relativo)})`;
}

/**
 * Resuelve un enlace relativo contra la carpeta que lo contiene y devuelve el
 * relPath desde la raíz del vault. Inverso de `relativoA`.
 *
 *     unirPosix('2 · Las causas', '../3 · Las fichas/E8.1.md')
 *     // → '3 · Las fichas/E8.1.md'
 */
export function unirPosix(base: string, relativo: string): string {
  const partes: string[] = [];
  const baseSegs = base === '' || base === '.' ? [] : base.split('/');
  for (const seg of [...baseSegs, ...relativo.split('/')]) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      partes.pop();
      continue;
    }
    partes.push(seg);
  }
  return partes.join('/');
}

/** Ruta relativa POSIX desde una carpeta origen hasta un relPath de raíz. */
function relativoA(dirOrigen: string, relDestino: string): string {
  if (dirOrigen === '' || dirOrigen === '.') return relDestino;
  const de = dirOrigen.split('/').filter(Boolean);
  const a = relDestino.split('/').filter(Boolean);
  let i = 0;
  while (i < de.length && i < a.length && de[i] === a[i]) i++;
  const subidas = de.length - i;
  const resto = a.slice(i);
  return [...Array<string>(subidas).fill('..'), ...resto].join('/');
}

/** slug de archivo: minúsculas, sin acentos, espacios→`-`, solo [a-z0-9-]. */
export function slugificar(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}
