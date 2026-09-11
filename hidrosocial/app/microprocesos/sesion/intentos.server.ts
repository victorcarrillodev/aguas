// Freno de fuerza bruta en memoria del proceso: cuenta fallos por usuario y por
// cliente, y bloquea con espera creciente. En memoria a propósito — el acceso
// debe seguir funcionando cuando PostgreSQL no está configurado (README).

export interface Veredicto {
  /** `false` mientras dure el bloqueo. */
  permitido: boolean;
  /** Segundos que faltan para poder reintentar. */
  espera: number;
}

interface Registro {
  fallos: number;
  bloqueadoHasta: number;
  visto: number;
}

/** Fallos tolerados antes del primer bloqueo. */
const TOLERANCIA = 5;
const ESPERA_BASE = 30_000;
const ESPERA_MAXIMA = 15 * 60_000;
/** Un registro sin actividad caduca; el mapa no crece sin límite. */
const CADUCIDAD = 60 * 60_000;
const MAXIMO_REGISTROS = 5000;

const registros = new Map<string, Registro>();

/** Espera exponencial: 30 s, 1 min, 2 min… hasta 15 min. */
function esperaDe(fallos: number): number {
  if (fallos <= TOLERANCIA) return 0;
  const exponente = Math.min(fallos - TOLERANCIA - 1, 20);
  return Math.min(ESPERA_BASE * 2 ** exponente, ESPERA_MAXIMA);
}

/** Consulta sin registrar nada: ¿alguna de las claves está bloqueada ahora? */
export function comprobarIntentos(claves: string[], ahora = Date.now()): Veredicto {
  let espera = 0;
  for (const clave of claves) {
    const registro = registros.get(clave);
    if (!registro) continue;
    if (registro.bloqueadoHasta > ahora)
      espera = Math.max(espera, Math.ceil((registro.bloqueadoHasta - ahora) / 1000));
  }
  return { permitido: espera === 0, espera };
}

/** Suma un fallo a cada clave y devuelve el bloqueo resultante. */
export function registrarFallo(claves: string[], ahora = Date.now()): Veredicto {
  purgar(ahora);
  for (const clave of claves) {
    const registro = registros.get(clave) ?? { fallos: 0, bloqueadoHasta: 0, visto: ahora };
    registro.fallos += 1;
    registro.visto = ahora;
    const espera = esperaDe(registro.fallos);
    if (espera > 0) registro.bloqueadoHasta = ahora + espera;
    registros.delete(clave);
    registros.set(clave, registro);
  }
  return comprobarIntentos(claves, ahora);
}

/** Un acceso correcto limpia el historial de esas claves. */
export function registrarExito(claves: string[]): void {
  for (const clave of claves) registros.delete(clave);
}

/** Sólo para pruebas: deja el freno como recién arrancado. */
export function reiniciarIntentos(): void {
  registros.clear();
}

function purgar(ahora: number): void {
  for (const [clave, registro] of registros) {
    if (registro.visto + CADUCIDAD < ahora && registro.bloqueadoHasta < ahora)
      registros.delete(clave);
  }
  // Map conserva el orden de inserción: se descartan primero los más antiguos.
  while (registros.size >= MAXIMO_REGISTROS) {
    const primera = registros.keys().next();
    if (primera.done) break;
    registros.delete(primera.value);
  }
}

/**
 * Identificador del cliente. `X-Forwarded-For` es falsificable, así que sólo se
 * lee cuando el despliegue declara que hay un proxy de confianza delante
 * (`CONFIAR_PROXY=1`); si no, todos los clientes comparten un mismo cubo.
 */
export function claveCliente(request: Request): string {
  if (process.env.CONFIAR_PROXY !== '1') return 'cliente:compartido';
  const cabecera =
    request.headers.get('X-Forwarded-For') ?? request.headers.get('X-Real-IP') ?? '';
  const ip = cabecera.split(',')[0]?.trim() ?? '';
  return ip === '' ? 'cliente:compartido' : `cliente:${ip.slice(0, 64)}`;
}
