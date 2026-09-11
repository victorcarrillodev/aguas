import { redirect } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';

import { RUTA_ACCESO, cerrarSesion, verificarCSRF } from '~/microprocesos/sesion/index.server';

/** Salir es un efecto: sólo por POST desde la propia app, nunca por un enlace. */
export async function action({ request }: ActionFunctionArgs) {
  const fd = await request.formData().catch(() => new FormData());
  // Un sitio ajeno no puede cerrarte la sesión de golpe (CSRF de cierre).
  if (!(await verificarCSRF(request, fd.get('_csrf'))))
    throw new Response('Solicitud no válida', { status: 403 });
  return cerrarSesion(request);
}

export async function loader() {
  // Un GET a /salir no cierra nada: se devuelve al acceso.
  return redirect(RUTA_ACCESO, { headers: { 'Cache-Control': 'no-store' } });
}
