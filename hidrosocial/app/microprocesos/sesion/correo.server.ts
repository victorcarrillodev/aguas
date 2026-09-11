// Envío de correo por el relay del propio servidor (Postfix, sendmail, MSA
// local): sin cuenta de terceros, sin credenciales y sin dependencias nuevas
// —el proyecto no añade paquetes—. Es un cliente SMTP mínimo sobre node:net.
//
// El correo es un aviso, no una garantía: si el relay no responde, el alta se
// completa igual y el panel enseña la contraseña para entregarla a mano.

import { randomUUID } from 'node:crypto';
import { createConnection } from 'node:net';
import type { Socket } from 'node:net';

export interface Mensaje {
  para: string;
  asunto: string;
  /** Versión en texto plano: la que se lee si el cliente no admite HTML. */
  texto: string;
  /** Versión con formato; viaja junto a la anterior en multipart/alternative. */
  html?: string;
}

export interface ResultadoCorreo {
  enviado: boolean;
  /** Motivo legible cuando no se pudo entregar; nunca detalles del servidor. */
  detalle?: string;
}

const TIEMPO_LIMITE = 8_000;
const MAXIMO_CUERPO = 64_000;

export function correoConfigurado(): boolean {
  return process.env.CORREO_ENVIAR !== '0';
}

export function remitente(): string {
  return (process.env.CORREO_REMITENTE ?? 'no-responder@calidad.local').trim();
}

/**
 * Entrega un mensaje. Nunca lanza: devuelve si salió y, si no, por qué, para
 * que quien llama decida cómo contarlo sin romper la operación principal.
 */
export async function enviarCorreo(mensaje: Mensaje): Promise<ResultadoCorreo> {
  if (!correoConfigurado()) return { enviado: false, detalle: 'El envío de correo está apagado.' };
  const de = remitente();
  const para = mensaje.para.trim();
  if (!/^[^\s@,;]+@[^\s@,;]+$/.test(para) || !/^[^\s@,;]+@[^\s@,;]+$/.test(de))
    return { enviado: false, detalle: 'La dirección de correo no es válida.' };

  const host = (process.env.SMTP_HOST ?? 'localhost').trim();
  const puerto = Number(process.env.SMTP_PORT ?? 25);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535)
    return { enviado: false, detalle: 'El puerto SMTP configurado no es válido.' };

  try {
    await conversacion(host, puerto, de, para, sobre(de, para, mensaje));
    return { enviado: true };
  } catch (e) {
    const detalle = e instanceof Error ? e.message : 'El relay de correo no respondió.';
    console.error(`Correo: no se pudo entregar a ${para}. ${detalle}`);
    return { enviado: false, detalle };
  }
}

/**
 * Cabeceras + cuerpo. Con HTML se envía `multipart/alternative`: primero el
 * texto y después el formato, que es el orden que exige MIME —el cliente
 * enseña la última parte que sepa interpretar—.
 */
function sobre(de: string, para: string, mensaje: Mensaje): string {
  const texto = mensaje.texto.slice(0, MAXIMO_CUERPO);
  const html = mensaje.html?.slice(0, MAXIMO_CUERPO);
  const cabeceras = [
    `From: ${de}`,
    `To: ${para}`,
    `Subject: ${asuntoCodificado(mensaje.asunto)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@${nombreLocal()}>`,
    'MIME-Version: 1.0',
    'Auto-Submitted: auto-generated',
  ];

  if (!html)
    return `${[...cabeceras, 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64'].join('\r\n')}\r\n\r\n${base64(texto)}\r\n`;

  const frontera = `=_hidrosocial_${randomUUID().replace(/-/g, '')}`;
  return [
    ...cabeceras,
    `Content-Type: multipart/alternative; boundary="${frontera}"`,
    '',
    'Este mensaje va en varias partes; tu programa de correo elige una.',
    '',
    `--${frontera}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64(texto),
    `--${frontera}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64(html),
    `--${frontera}--`,
    '',
  ].join('\r\n');
}

/**
 * Base64 en líneas de 76 caracteres: respeta el límite de longitud de línea de
 * SMTP y evita cualquier problema con acentos o con un punto al inicio de línea.
 */
function base64(contenido: string): string {
  const datos = Buffer.from(contenido, 'utf8').toString('base64');
  return (datos.match(/.{1,76}/g) ?? []).join('\r\n');
}

/** Un asunto con acentos viaja codificado (RFC 2047) o llega roto. */
function asuntoCodificado(asunto: string): string {
  const limpio = asunto.replace(/[\r\n]/g, ' ').slice(0, 200);
  // Si todo es ASCII imprimible el asunto viaja tal cual.
  if (/^[\x20-\x7e]*$/.test(limpio)) return limpio;
  return `=?UTF-8?B?${Buffer.from(limpio, 'utf8').toString('base64')}?=`;
}

/** Diálogo SMTP mínimo: EHLO/HELO, MAIL FROM, RCPT TO, DATA, QUIT. */
function conversacion(
  host: string,
  puerto: number,
  de: string,
  para: string,
  sobreTexto: string,
): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const socket: Socket = createConnection({ host, port: puerto });
    socket.setTimeout(TIEMPO_LIMITE);
    socket.setEncoding('utf8');

    const pasos = [
      { esperado: 220, enviar: `EHLO ${nombreLocal()}` },
      { esperado: 250, enviar: `MAIL FROM:<${de}>` },
      { esperado: 250, enviar: `RCPT TO:<${para}>` },
      { esperado: 250, enviar: 'DATA' },
      { esperado: 354, enviar: `${puntear(sobreTexto)}.` },
      { esperado: 250, enviar: 'QUIT' },
    ];
    let paso = 0;
    let buffer = '';
    let terminado = false;

    const fallar = (motivo: string) => {
      if (terminado) return;
      terminado = true;
      socket.destroy();
      rechazar(new Error(motivo));
    };

    socket.on('error', () => fallar(`No se pudo hablar con el relay SMTP en ${host}:${puerto}.`));
    socket.on('timeout', () => fallar('El relay SMTP no respondió a tiempo.'));
    socket.on('close', () => {
      if (!terminado) fallar('El relay SMTP cerró la conexión antes de aceptar el mensaje.');
    });

    socket.on('data', (trozo: string) => {
      buffer += trozo;
      // Una respuesta puede venir en varias líneas; la última no lleva guion.
      let linea = ultimaRespuesta(buffer);
      while (linea) {
        buffer = '';
        const codigo = Number(linea.slice(0, 3));
        const actual = pasos[paso];
        if (!actual) return;
        if (codigo !== actual.esperado)
          return fallar(`El relay SMTP respondió ${codigo} donde se esperaba ${actual.esperado}.`);
        paso += 1;
        if (actual.enviar === 'QUIT') {
          terminado = true;
          socket.end('QUIT\r\n');
          return resolver();
        }
        socket.write(`${actual.enviar}\r\n`);
        linea = ultimaRespuesta(buffer);
      }
    });
  });
}

/** Devuelve la línea final de una respuesta SMTP completa, o `''` si falta. */
function ultimaRespuesta(buffer: string): string {
  const lineas = buffer.split('\r\n').filter((l) => l !== '');
  const ultima = lineas.at(-1);
  if (!ultima || !buffer.endsWith('\r\n')) return '';
  return /^\d{3} /.test(ultima) ? ultima : '';
}

/** Un punto al inicio de línea termina el DATA: hay que duplicarlo. */
function puntear(texto: string): string {
  return texto.replace(/\r\n\./g, '\r\n..');
}

function nombreLocal(): string {
  const nombre = (process.env.CORREO_DOMINIO ?? '').trim();
  return /^[A-Za-z0-9.-]{1,255}$/.test(nombre) ? nombre : 'calidad.local';
}
