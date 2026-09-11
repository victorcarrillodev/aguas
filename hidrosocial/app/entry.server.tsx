import { randomBytes } from 'node:crypto';
import { PassThrough } from 'node:stream';

import { createReadableStreamFromReadable } from '@remix-run/node';
import type { AppLoadContext, EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';

import { ContextoNonce } from '~/lib/nonce';
import { peticionSegura } from '~/microprocesos/sesion/index.server';

export const streamTimeout = 5000;

const PRODUCCION = process.env.NODE_ENV === 'production';

/**
 * Cabeceras de seguridad de toda respuesta. El expediente es privado: nada de
 * caché compartida, nada de marcos ajenos, nada de fugas por `Referer`.
 */
function endurecer(headers: Headers, request: Request, nonce?: string): Headers {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  // Contenido personalizado por sesión: ni proxies ni el navegador lo archivan.
  headers.set('Cache-Control', 'private, no-store, must-revalidate');
  headers.append('Vary', 'Cookie');
  if (peticionSegura(request))
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (nonce) headers.set('Content-Security-Policy', politica(nonce));
  return headers;
}

/**
 * `script-src` sólo admite el propio origen y el nonce de esta respuesta: un
 * `<script>` inyectado en el HTML no se ejecuta. En desarrollo se relaja lo
 * imprescindible para el recargado en caliente de Vite.
 */
function politica(nonce: string): string {
  // En desarrollo el nonce se omite a propósito: Vite inyecta scripts en línea
  // sin él y, con un nonce presente, el navegador ignora `unsafe-inline`.
  const script = PRODUCCION
    ? `'self' 'nonce-${nonce}'`
    : "'self' 'unsafe-inline' 'unsafe-eval'";
  const conexion = PRODUCCION ? "'self'" : "'self' ws: wss:";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Los módulos CSS y los estilos en línea de sigma necesitan `unsafe-inline`.
    "style-src 'self' 'unsafe-inline'",
    `script-src ${script}`,
    `connect-src ${conexion}`,
    "worker-src 'self' blob:",
  ].join('; ');
}

/** Las respuestas de datos (navegación en cliente) llevan la misma dureza. */
export function handleDataRequest(response: Response, { request }: { request: Request }): Response {
  endurecer(response.headers, request);
  return response;
}

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _loadContext: AppLoadContext,
) {
  const nonce = randomBytes(16).toString('base64');
  endurecer(responseHeaders, request, nonce);
  return isbot(request.headers.get('user-agent') || '')
    ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext, nonce)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext, nonce);
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  nonce: string,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <ContextoNonce.Provider value={nonce}>
        <RemixServer context={remixContext} url={request.url} abortDelay={streamTimeout} />
      </ContextoNonce.Provider>,
      {
        nonce,
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set('Content-Type', 'text/html');
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          // biome-ignore lint/style/noParameterAssign: plantilla oficial de Remix.
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );
    setTimeout(abort, streamTimeout + 1000);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  nonce: string,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <ContextoNonce.Provider value={nonce}>
        <RemixServer context={remixContext} url={request.url} abortDelay={streamTimeout} />
      </ContextoNonce.Provider>,
      {
        nonce,
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set('Content-Type', 'text/html');
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          // biome-ignore lint/style/noParameterAssign: plantilla oficial de Remix.
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );
    setTimeout(abort, streamTimeout + 1000);
  });
}
