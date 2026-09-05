import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: '/calidad/',
  plugins: [
    remix({
      basename: '/calidad',
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
      },
      // Las cuencas viven en app/rutas/ (D7); se mapean aquí en vez de app/routes/.
      routes(defineRoutes) {
        return defineRoutes((route) => {
          route('/', 'rutas/RutaDashboard.tsx', { index: true });
          route('/sistema', 'rutas/RutaSistema.tsx');
          route('/revision', 'rutas/RutaRevision.tsx');
          route('/captura', 'rutas/RutaCaptura.tsx');
          route('/grafo', 'rutas/RutaGrafo.tsx');
          route('/grafo/:nodeId', 'rutas/RutaGrafoNodo.tsx');
          route('/nodo/:slug', 'rutas/RutaNodo.tsx');
          route('/healthcheck', 'rutas/SalidaHealthcheck.tsx');
        });
      },
    }),
    tsconfigPaths(),
  ],
});
