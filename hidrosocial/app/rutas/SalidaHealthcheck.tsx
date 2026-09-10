import { json } from '@remix-run/node';
import { comprobarPersistencia, postgresConfigurado } from '~/microprocesos/persistencia/index.server';
export async function loader() {
  if (!postgresConfigurado()) {
    return json({ ok: true, almacenamiento: 'solo-lectura' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    await comprobarPersistencia();
    return json({ ok: true, almacenamiento: 'postgresql' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return json({ ok: false, almacenamiento: 'no-disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
