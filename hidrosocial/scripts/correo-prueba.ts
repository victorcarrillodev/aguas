// Vista previa del correo de credenciales, y prueba del relay del servidor.
//
//   bun run correo:prueba                      guarda vista-correo.html y lo enseña
//   bun run correo:prueba ana@ejemplo.org      además lo envía de verdad
//
// Sirve para comprobar el relay local (SMTP_HOST/SMTP_PORT) sin dar de alta a
// nadie: si esto llega, el alta desde el panel también llegará.

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { correoConfigurado, enviarCorreo, remitente } from '../app/microprocesos/sesion/correo.server';
import { correoAlta, correoClaveNueva } from '../app/microprocesos/sesion/plantilla-correo.server';

const destino = process.argv.slice(2).find((a) => a.includes('@'));

const ejemplo = {
  usuario: 'ana.lopez',
  correo: destino ?? 'ana.lopez@ejemplo.org',
  clave: 'Ptra7ymKq4nVdLxu3Fbe',
  rol: 'investigador',
  url: `${process.env.URL_PUBLICA ?? 'https://calidad.example'}/calidad/acceso`,
  invitadoPor: process.env.ROOT_USUARIO ?? 'root',
};

const alta = correoAlta(ejemplo);
const nueva = correoClaveNueva(ejemplo);

const salida = resolve('vista-correo.html');
await writeFile(
  salida,
  `${alta.html}\n<!-- ─────────── segundo mensaje: contraseña restablecida ─────────── -->\n${nueva.html}`,
  'utf8',
);

console.log(`Vista previa guardada en: ${salida}`);
console.log('');
console.log('— Versión en texto plano del alta —');
console.log('');
console.log(alta.texto);
console.log('');

if (!destino) {
  console.log('Para probar el envío real: bun run correo:prueba tu@correo.org');
  process.exit(0);
}

if (!correoConfigurado()) {
  console.error('CORREO_ENVIAR=0: el envío está apagado en el entorno.');
  process.exit(1);
}

console.log(`Enviando a ${destino} desde ${remitente()}…`);
const resultado = await enviarCorreo(alta);
if (resultado.enviado) {
  console.log('Entregado al relay. Revisa la bandeja (y la carpeta de no deseados).');
} else {
  console.error(`No salió: ${resultado.detalle}`);
  console.error('Comprueba SMTP_HOST y SMTP_PORT, y que el relay acepte correo local.');
  process.exitCode = 1;
}
