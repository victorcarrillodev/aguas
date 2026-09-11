import { json } from '@remix-run/node';
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';

import { EncabezadoApp } from '~/design-system/cauces/EncabezadoApp';
import { NavegacionInferior } from '~/design-system/cauces/NavegacionInferior';
import { useNonce } from '~/lib/nonce';
import { leerTestigoCSRF, sesionOpcional } from '~/microprocesos/sesion/index.server';
import styles from './root.module.css';
import './tokens.css';

import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/400-italic.css';
import '@fontsource/jetbrains-mono/400.css';
import 'material-symbols/outlined.css';

export const links: LinksFunction = () => [
  { rel: 'icon', href: '/calidad/favicon.svg', type: 'image/svg+xml' },
];

interface DatosRaiz {
  usuario: string | null;
  /** Sólo el root ve la entrada al padrón; la puerta real está en el loader. */
  esRoot: boolean;
  testigo: string;
}

/**
 * La raíz sólo mira si hay sesión: no exige ninguna, porque también envuelve a
 * `/acceso`. Cada cuenca privada se defiende sola con `requerirSesion`.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const sesion = await sesionOpcional(request);
  return json<DatosRaiz>(
    {
      usuario: sesion?.usuario ?? null,
      esRoot: sesion?.rol === 'root',
      testigo: sesion ? await leerTestigoCSRF(request) : '',
    },
    { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } },
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const nonce = useNonce();
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Expediente en revisión con datos de campo: fuera de los buscadores. */}
        <meta name="robots" content="noindex, nofollow" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const datos = useLoaderData<DatosRaiz>();

  // Sin sesión sólo existe el acceso: ni cabecera, ni navegación, ni pie.
  if (!datos?.usuario) return <Outlet />;

  return (
    <div className={styles.contenedor}>
      <EncabezadoApp usuario={datos.usuario} esRoot={datos.esRoot} testigo={datos.testigo} />
      <main className={styles.principal}>
        <Outlet />
      </main>
      <NavegacionInferior />
      <footer className={styles.pie}>
        <div className={styles.pieInterior}>
          <span>Hidrosocial · lector aumentado del vault del AMG</span>
          <span>Una sola fuente de verdad: los .md y .canvas del vault</span>
        </div>
      </footer>
    </div>
  );
}
