// Barrel del microproceso de sesión: interfaz única para rutas y loaders.
// `.server` en el nombre: nada de esto debe acabar en el paquete del navegador.

export { derivarClave, verificarClave } from './claves.server';
export { correoConfigurado, enviarCorreo, remitente } from './correo.server';
export type { Mensaje, ResultadoCorreo } from './correo.server';
export {
  claveCliente,
  comprobarIntentos,
  registrarExito,
  registrarFallo,
  reiniciarIntentos,
} from './intentos.server';
export type { Veredicto } from './intentos.server';
export {
  RUTA_ACCESO,
  RUTA_BASE,
  cerrarSesion,
  destinoSeguro,
  estadoConfiguracion,
  iniciarSesion,
  leerTestigoCSRF,
  mismoOrigen,
  peticionSegura,
  requerirRoot,
  requerirSesion,
  sesionOpcional,
  testigoCSRF,
  verificarCSRF,
} from './sesion.server';
export type { EstadoConfiguracion, Sesion } from './sesion.server';
export {
  CLAVE_MINIMA,
  ErrorUsuario,
  ROLES,
  activarUsuario,
  autenticar,
  cambiarClave,
  crearUsuario,
  cuentaVigente,
  eliminarUsuario,
  establecerBaseParaPruebas,
  listarUsuarios,
  olvidarCache,
  padronEscribible,
} from './usuarios.server';
// `rootDeEntorno` no se re-exporta a propósito: devuelve la derivación de la
// clave y no debe quedar a un `json()` de distancia de un loader.
export type { AltaUsuario, Rol, Usuario } from './usuarios.server';
