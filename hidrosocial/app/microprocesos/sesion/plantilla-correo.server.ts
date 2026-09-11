// Plantillas del correo de acceso. HTML de correo, no de web: tablas, anchos
// fijos y estilo en línea, porque Gmail y Outlook descartan hojas externas y
// buena parte de los selectores. Cada mensaje viaja además en texto plano.
//
// Los colores son los mismos tokens de la app (azul marino, verde azulado),
// escritos aquí en literal porque un correo no puede leer `tokens.css`.

import type { Mensaje } from './correo.server';

export interface Credenciales {
  usuario: string;
  correo: string;
  clave: string;
  rol: string;
  /** URL absoluta de la pantalla de acceso. */
  url: string;
  invitadoPor: string;
}

const MARINO = '#00355f';
const MARINO_HONDO = '#00243f';
const VERDE = '#006a61';
const TINTA = '#0b1c30';
const TINTA_SUAVE = '#565e71';
const BORDE = '#dde1ec';
const PAPEL = '#f8f9ff';

/** Alta de una cuenta nueva: bienvenida + credenciales + botón de entrada. */
export function correoAlta(c: Credenciales): Mensaje {
  const titulo = 'Tu acceso al expediente';
  const entrada = `${c.invitadoPor} te dio de alta en Hidrosocial, el lector del diagnóstico hidrosanitario del Área Metropolitana de Guadalajara. Estas son tus credenciales.`;
  return {
    para: c.correo,
    asunto: 'Tu acceso a Hidrosocial',
    texto: textoPlano(titulo, entrada, c),
    html: documento(titulo, entrada, c, 'Entrar al expediente'),
  };
}

/** Contraseña restablecida por el root: la anterior deja de servir. */
export function correoClaveNueva(c: Credenciales): Mensaje {
  const titulo = 'Tu contraseña nueva';
  const entrada = `${c.invitadoPor} restableció la contraseña de tu cuenta en Hidrosocial. La anterior ya no sirve; entra con ésta.`;
  return {
    para: c.correo,
    asunto: 'Tu contraseña de Hidrosocial cambió',
    texto: textoPlano(titulo, entrada, c),
    html: documento(titulo, entrada, c, 'Entrar con la clave nueva'),
  };
}

const AVISOS = [
  'La contraseña es personal: no la reenvíes ni la compartas en grupos.',
  'El expediente incluye evidencia de campo con datos de informantes. No dejes la sesión abierta en un equipo compartido.',
  'Si no esperabas este correo, avisa a quien administra el expediente y no entres.',
];

function textoPlano(titulo: string, entrada: string, c: Credenciales): string {
  return [
    `HIDROSOCIAL — ${titulo}`,
    '',
    entrada,
    '',
    `Usuario:     ${c.usuario}`,
    `Contraseña:  ${c.clave}`,
    `Rol:         ${c.rol}`,
    '',
    `Entra en: ${c.url}`,
    '',
    ...AVISOS.map((a) => `· ${a}`),
    '',
    'Mensaje automático del servidor del expediente. No respondas a esta dirección.',
  ].join('\n');
}

function documento(titulo: string, entrada: string, c: Credenciales, textoBoton: string): string {
  const preheader = `Usuario ${c.usuario}. Tu contraseña va dentro; ábrelo en privado.`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapar(titulo)}</title>
<style>
  /* Lo único que no puede ir en línea: el ajuste a pantalla estrecha. */
  @media (max-width: 620px) {
    .marco { width: 100% !important; }
    .aire { padding-left: 24px !important; padding-right: 24px !important; }
    .titular { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAPEL};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPEL};">
  <tr>
    <td align="center" style="padding:32px 12px;">

      <table role="presentation" class="marco" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid ${BORDE};border-radius:14px;overflow:hidden;">

        <!-- Cabecera: la gota del expediente sobre el azul del vault -->
        <tr>
          <td style="background:${MARINO_HONDO};background-image:linear-gradient(135deg,${MARINO_HONDO} 0%,${MARINO} 55%,${VERDE} 140%);padding:36px 40px 30px 40px;" class="aire">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="44" valign="middle" style="padding-right:12px;">
                  <div style="width:44px;height:44px;background:#7ea6e0;border-radius:50% 50% 50% 4px;transform:rotate(45deg);"></div>
                </td>
                <td valign="middle">
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.2px;">Hidrosocial</div>
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(255,255,255,0.72);letter-spacing:0.6px;text-transform:uppercase;padding-top:3px;">Diagnóstico hidrosanitario del AMG</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Titular y entrada -->
        <tr>
          <td class="aire" style="padding:36px 40px 0 40px;">
            <h1 class="titular" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;font-weight:600;color:${TINTA};">${escapar(titulo)}</h1>
            <p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${TINTA_SUAVE};">${escapar(entrada)}</p>
          </td>
        </tr>

        <!-- Credenciales -->
        <tr>
          <td class="aire" style="padding:26px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPEL};border:1px solid ${BORDE};border-left:4px solid ${VERDE};border-radius:10px;">
              <tr>
                <td style="padding:22px 24px;">
                  ${dato('Usuario', c.usuario)}
                  ${dato('Contraseña', c.clave, true)}
                  ${dato('Rol', c.rol)}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Botón -->
        <tr>
          <td class="aire" align="left" style="padding:26px 40px 0 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background:${MARINO};border-radius:10px;">
                  <a href="${escapar(c.url)}" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">${escapar(textoBoton)}</a>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${TINTA_SUAVE};">Si el botón no abre, copia esta dirección:<br><span style="font-family:'Courier New',Courier,monospace;color:${MARINO};word-break:break-all;">${escapar(c.url)}</span></p>
          </td>
        </tr>

        <!-- Avisos -->
        <tr>
          <td class="aire" style="padding:28px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BORDE};">
              <tr><td style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
              ${AVISOS.map(aviso).join('')}
            </table>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td class="aire" style="padding:26px 40px 34px 40px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:1.6;color:${TINTA_SUAVE};">Mensaje automático del servidor del expediente. No respondas a esta dirección: nadie la lee.</p>
          </td>
        </tr>

      </table>

      <p style="margin:18px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8b93a5;">Una sola fuente de verdad: los .md y .canvas del vault.</p>

    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Una línea de credencial; la contraseña va en monoespaciada y más grande. */
function dato(etiqueta: string, valor: string, destacado = false): string {
  return `<div style="padding:6px 0;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.7px;text-transform:uppercase;color:${TINTA_SUAVE};">${escapar(etiqueta)}</div>
    <div style="font-family:'Courier New',Courier,monospace;font-size:${destacado ? '19px' : '15px'};font-weight:${destacado ? 'bold' : 'normal'};color:${destacado ? MARINO : TINTA};padding-top:3px;word-break:break-all;">${escapar(valor)}</div>
  </div>`;
}

function aviso(texto: string): string {
  return `<tr>
    <td width="18" valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${VERDE};padding-bottom:8px;">&bull;</td>
    <td valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${TINTA_SUAVE};padding-bottom:8px;">${escapar(texto)}</td>
  </tr>`;
}

/** Ni el usuario ni la clave se interpolan crudos: el correo también es HTML. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
