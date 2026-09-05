import type { LinksFunction } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';

import { EncabezadoApp } from '~/design-system/cauces/EncabezadoApp';
import { NavegacionInferior } from '~/design-system/cauces/NavegacionInferior';
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

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <div className={styles.contenedor}>
      <EncabezadoApp />
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
