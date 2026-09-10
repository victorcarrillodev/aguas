import { randomUUID } from 'node:crypto';
import { createCookie } from '@remix-run/node';
import { ARBOLES, CAPAS, LENTES, TIPOS_EVIDENCIA } from '~/lib/taxonomia';
import { RELACIONES } from '../revision/index';
import { VACIO } from './estado';
import type { EstadoForm } from './estado';

const cookieBorrador = createCookie('calidad-borrador', {
  httpOnly: true,
  sameSite: 'lax',
  path: '/calidad',
  maxAge: 60 * 60 * 24 * 30,
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** La cookie es una capacidad secreta: nunca se devuelve el token en el JSON. */
export async function sesionBorrador(request: Request, nueva = false) {
  let guardado: unknown;
  try {
    guardado = nueva ? null : await cookieBorrador.parse(request.headers.get('Cookie'));
  } catch {
    guardado = null;
  }
  const token = typeof guardado === 'string' && UUID.test(guardado) ? guardado : randomUUID();
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    Vary: 'Cookie',
    'Set-Cookie': await cookieBorrador.serialize(token, {
      secure: new URL(request.url).protocol === 'https:',
    }),
  });
  return { token, headers };
}

export class ErrorFormularioCaptura extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

/** Limita también peticiones sin Content-Length antes de interpretar el formulario. */
export async function leerFormularioCaptura(request: Request): Promise<FormData> {
  const origen = request.headers.get('Origin');
  if (origen && origen !== new URL(request.url).origin)
    throw new ErrorFormularioCaptura('La solicitud debe enviarse desde esta aplicación.', 403);
  const lector = request.body?.getReader();
  const trozos: Uint8Array[] = [];
  let bytes = 0;
  if (lector) {
    try {
      while (true) {
        const { value, done } = await lector.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 160_000) {
          await lector.cancel();
          throw new ErrorFormularioCaptura('El formulario supera el tamaño permitido.', 413);
        }
        trozos.push(value);
      }
    } finally {
      lector.releaseLock();
    }
  }
  try {
    return await new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: Buffer.concat(trozos),
    }).formData();
  } catch {
    throw new ErrorFormularioCaptura('No se pudo leer el formulario.');
  }
}

export function versionBorrador(fd: FormData): number {
  const valor = fd.get('_version');
  if (typeof valor !== 'string' || !/^(0|[1-9]\d{0,9})$/.test(valor))
    throw new ErrorFormularioCaptura('La versión del borrador no es válida. Recarga la página.');
  return Number(valor);
}

const LIMITES: Partial<Record<keyof EstadoForm, number>> = {
  titulo: 300,
  arbol: 10,
  fichaId: 2000,
  medicionId: 2000,
  capa: 10,
  tipoEvidencia: 40,
  fuente: 2000,
  fecha: 30,
  municipio: 300,
  nodoId: 2000,
  relacion: 40,
  referencia: 2000,
  responsable: 300,
  planId: 2000,
};

/** Un borrador admite campos vacíos; completarlo solo se exige al enviarlo. */
export function validarDatosBorrador(fd: FormData): EstadoForm {
  const datos: EstadoForm = { ...VACIO, lentes: [] };
  for (const clave of Object.keys(VACIO) as (keyof EstadoForm)[]) {
    if (clave === 'lentes') continue;
    const valores = fd.getAll(clave);
    if (valores.length > 1 || valores.some((v) => typeof v !== 'string'))
      throw new ErrorFormularioCaptura(`El campo ${clave} debe contener un único texto.`);
    const valor = (valores[0] as string | undefined) ?? '';
    if (valor.length > (LIMITES[clave] ?? 12000))
      throw new ErrorFormularioCaptura(`El campo ${clave} supera el tamaño permitido.`);
    datos[clave] = valor;
  }
  const lentes = fd.getAll('lentes');
  if (
    lentes.length > LENTES.length ||
    lentes.some((v) => typeof v !== 'string' || !(LENTES as readonly string[]).includes(v))
  )
    throw new ErrorFormularioCaptura('Las dimensiones del borrador no son válidas.');
  datos.lentes = [...new Set(lentes as string[])];
  const opciones: [string, readonly string[]][] = [
    [datos.arbol, ARBOLES],
    [datos.capa, CAPAS.map((c) => c.id)],
    [datos.tipoEvidencia, TIPOS_EVIDENCIA],
    [datos.relacion, RELACIONES],
  ];
  if (opciones.some(([valor, permitidos]) => valor !== '' && !permitidos.includes(valor)))
    throw new ErrorFormularioCaptura('Una clasificación del borrador no es válida.');
  if (datos.fecha) {
    const fecha = datos.fecha.match(
      /^(\d{4}-\d{2}-\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?)?$/,
    );
    const dia = fecha ? new Date(`${fecha[1]}T12:00:00Z`) : null;
    if (
      !fecha ||
      !dia ||
      !Number.isFinite(dia.getTime()) ||
      dia.toISOString().slice(0, 10) !== fecha[1]
    )
      throw new ErrorFormularioCaptura('La fecha del borrador no es válida.');
  }
  if (Buffer.byteLength(JSON.stringify(datos), 'utf8') > 100_000)
    throw new ErrorFormularioCaptura('El borrador supera el tamaño permitido.', 413);
  return datos;
}
