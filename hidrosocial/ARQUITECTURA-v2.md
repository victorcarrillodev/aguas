# ARQUITECTURA v2 — hidrosocial

Delta sobre `ARQUITECTURA.md` (v1 vigente). Tres frentes: fronteras de microproceso (cohesión),
responsividad mobile-first y rediseño visual según los mockups del usuario. Los mockups son
IDEAS: se adopta el lenguaje visual, NO su taxonomía (el vault manda: C0–C4 reales, lentes
AMB/BIO/ECO/SOC/TER/INS/POL, enlaces markdown relativos — nunca wikilinks).

---

## 1. Fronteras de microproceso (DDD ligero)

Principio: un microproceso no se define por tamaño sino por **indivisibilidad**: un solo
propósito, una sola razón de cambio, y un contrato público (`index.ts`) que oculta internos.

| Microproceso | Frontera (propósito único) | Lo que NO hace | I/O |
|---|---|---|---|
| `vault-core` | Convertir texto del vault en `VaultGraph` (parse, clasificar, links, canvas) | Cachear, escribir, renderizar | solo `readFile` |
| `cache` | ÚNICA frontera de LECTURA del vault (frescura: TTL 2s + mtime) | Parsear, escribir | fs vía vault-core |
| `captura` | ÚNICA frontera de ESCRITURA (validar Borrador → plantilla → `9 · Evidencia de campo/`) | Leer el vault, métricas | solo append |
| `dashboard` | Agregaciones puras sobre `VaultGraph` (KPIs, causas, evidencias, brechas) | Tocar fs, conocer React | ninguna |
| `grafo` | Preparar datos de red (layout FA2, filtros, grado, densidad, modularidad, vecinos) | Tocar fs, renderizar | ninguna |
| `busqueda` (NUEVO) | Dado `VaultGraph` + consulta → resultados rankeados (título, resumen, capa, tipo) | Todo lo demás | ninguna |

Reglas de imports (verificables con grep):

1. `rutas/` y `design-system/` solo importan desde `~/microprocesos/<mp>/index.ts` — nunca
   un interno (`./metricas`, `./memoria`, etc.).
2. Ningún microproceso importa internos de otro: entre microprocesos solo se usan los
   `index.ts` (o tipos de `vault-core`).
3. `lib/` es shared kernel: importable por todos.
4. Cada microproceso lleva `README.md` de ≤30 líneas: **Frontera / Propósito / Lo que NO
   hace / Contrato público (firmas) / Razón de cambio**.

### Cambios concretos

- `vault-core`: ya cumple; solo README + mover `EXCLUIDOS` visible en el README.
- `cache`: ya cumple; README.
- `captura`: ya cumple; README. Verificar que `plantilla.ts` y `esquema.ts` NO importen `node:fs`
  (deben ser puros para poder usarlos en el cliente para el preview en vivo).
- `dashboard`: extender `metricas.ts` — `evidencias` pasa de `string[]` a
  `{ relPath, titulo, fecha }[]` (fecha del frontmatter o del nombre; orden desc);
  añadir `brechas: { medicionesSinLineaBase, total }`. README.
- `grafo`: añadir a `index.ts` las métricas de red puras:
  `grado(g, id)`, `densidad(g) = 2·E / (N·(N−1))` (0 si N<2),
  `modularidad(g)` usando `graphology-communities` (louvain) — nueva dep.
  README.
- `busqueda` (nuevo directorio): `buscar(g, q): ResultadoBusqueda[]` donde
  `ResultadoBusqueda = { nodo, puntos }`; rankea título (3 pts, match exacto 6),
  resumen (1), tags/arbol (2); normaliza acentos con `normalize('NFD').replace(/\p{Diacritic}/gu,'')`;
  límite 12 resultados. Puro, sin deps. README.

---

## 2. Design tokens v2 (mockups) — `tokens.css`

Se reemplaza la paleta de chrome; los colores de capas C0–C4 y por-tipo se mantienen
(canónicos del vault).

```
--surface: #f8f9ff;  --on-surface: #0b1c30;  --on-surface-variant: #565e71;
--outline: #727780;  --outline-variant: #dde1ec;
--primary: #00355f;  --on-primary: #ffffff;  --primary-container: #0f4c81;
--secondary: #006a61; --secondary-container: #86f2e4;
--tertiary: #3f0099; --error: #ba1a1a;  --error-container: #ffdad6;
--surface-container-lowest: #ffffff; --surface-container: #eef1f9; --surface-container-high: #e6eaf4;
```

Fuentes (vía @fontsource, sin CDN):
- UI: `@fontsource/plus-jakarta-sans` (reemplaza Hanken Grotesk) → `--fuente-ui`.
- Titulares: `@fontsource/source-serif-4` (reemplaza Newsreader) → `--fuente-titular`.
- Datos: `@fontsource/jetbrains-mono` se conserva → `--fuente-datos`.
- Quitar deps de Hanken/Newsreader de package.json.

Iconos: dep `material-symbols` (paquete npm, se autohospeda al bundlear — NO CDN):
`import 'material-symbols/outlined.woff2.css'` en `entry.client.tsx`/`root.tsx`; uso
`<span className="material-symbols-outlined">groups</span>`. Si el paquete falla al
instalar, fallback: `@fontsource/material-symbols-outlined`.

Tipografía fluida y touch:
```
--texto-titulo: clamp(1.6rem, 2.2vw + 1rem, 2.4rem);
--texto-seccion: clamp(1.1rem, 1vw + 0.9rem, 1.5rem);
--min-touch: 44px;
```

Breakpoints: `--bp-m: 480px; --bp-t: 768px; --bp-d: 1024px;` (media queries no aceptan
var(), usar literales 480/768/1024 en los .module.css).

---

## 3. Responsividad (mobile-first)

- `EncabezadoApp`: en ≥1024px nav píldora (Panel · Captura · Grafo) + buscador con `Ctrl+K`
  (keydown global que enfoca el input; Enter → `/grafo?q=<texto>`). En <1024px: solo logo;
  aparece `NavegacionInferior` (barra fija bottom con 3 botones-icono ≥44px, safe-area-inset).
- Grid del dashboard: KPIs `repeat(2,1fr)` → `repeat(3,1fr)`@768 → `repeat(6,1fr)`@1024.
- Tabla de causas: en <768px scroll horizontal con sticky primera columna (o tarjetas;
  elegir scroll — más simple y el mockup es tabla).
- Captura: grid 2 columnas (form | preview) → 1 columna <1024px; preview colapsado a
  un `<details>` "Ver nota .md" en móvil. Action bar sticky bottom siempre.
- Grafo: inspector 320px a la derecha ≥1024px; <1024px se convierte en bottom-sheet
  (posición fija, altura 45vh, botón cerrar, arrastrable no necesario). Barra de filtros
  con scroll horizontal en móvil.
- Todos los botones/inputs/chips clicables: `min-height: var(--min-touch)`.

---

## 4. Dashboard v2 (mockup 1)

- Hero: titular en `--fuente-titular`, subtítulo con totales, acciones (Nueva evidencia,
  Explorar grafo).
- 6 KPI tiles (Tarjeta con franja superior de color + icono + número grande + etiqueta + sub):
  Causas raíz (icono `account_tree`, C1), Fichas (`description`, C3), Mediciones
  (`monitoring`, #D4A373), Efectos (`waves`, #94A3B8), Actores (`groups`, C2),
  Sin línea base (`warning`, --error, sub "de N mediciones").
- Fila principal (8/4): izquierda Tarjeta "Causas raíz" con buscador client-side
  (`useState`) + pills de filtro C0–C4 + TablaMini columnas Causa / Capa / Criticidad /
  Fichas. Criticidad (regla documentada en dashboard/metricas.ts): alta si fichas ≥ 8,
  media si ≥ 4, baja si no (badge de color error/primary/outline).
- Derecha: Tarjeta "Evidencias recientes" (feed real: fecha, título, enlace a `/nodo/:slug`;
  estado vacío amable con CTA a /captura) + Tarjeta "Brecha de información" (N de M
  mediciones sin línea base; barra de progreso; CTA).
- El buscador Ctrl+K del header navega a `/grafo?q=...`.

## 5. Captura v2 (mockup 2)

- Bloques numerados (FormBloque reutilizado, numeración 1/2/3):
  1) **Hallazgo**: título, texto de observación (AreaTexto).
  2) **Conexión ontológica**: select Árbol (E1–E10, de `listarArboles`) → select Ficha
     filtrada por árbol → select Medición filtrada por árbol (opcional); selector visual
     de capa: 5 chips C0–C4 con color real; pills de lentes (multi-select); select tipo
     de evidencia (Entrevista / Observación / Medición / Documento / Fotografía).
  3) **Fuente y trazabilidad**: informante, fecha (input datetime-local, default ahora),
     municipio (text).
- Columna derecha **PREVIEW .md EN VIVO**: panel estilo terminal (fondo #0b1c30, texto mono
  claro, cabecera "NUEVA NOTA · 9 · Evidencia de campo/<slug>.md") que renderiza
  `renderPlantilla(validarBorradorParcial(borrador))` en el cliente (la plantilla es pura).
  Se actualiza con cada tecla — sin action calls.
- **Anillo de completitud**: SVG circular (stroke-dashoffset) con % de campos requeridos
  completos (título, hallazgo, árbol, tipo evidencia, fecha, informante). ≥100% pone el
  botón "Enviar al vault" en variante primaria; antes, deshabilitado.
- Action bar sticky bottom: [Guardar borrador] (localStorage `hidrosocial-borrador`,
  restaurar al cargar) · [Descargar .md] (Blob + a.download) · [Enviar al vault]
  (action POST existente; tras éxito navigate a /nodo/:slug de la nota creada).
- Fuera de alcance: adjuntos, GPS/mapa.

## 6. Grafo v2 estilo Obsidian (mockup 3)

- `RutaGrafo`: barra superior superpuesta (no sidebar): buscador (lee `?q=` del header,
  filtra client-side), pills por tipo con conteos reales (Todos/Causas/Fichas/Actores/
  Efectos/Mediciones/Problemas/Evidencias), chips de capa C0–C4.
- Canvas estilo Obsidian: fondo `--surface-container` con **grid de puntos**
  (radial-gradient CSS), nodos circulares color por capa/tipo, tamaño ∝ 4+2·log(1+grado),
  labels solo a zoom cercano (`labelRenderedSizeThreshold: 9`, `labelDensity`, halos:
  `labelColor` con stroke blanco vía `defaultDrawNodeLabel` custom o settings estándar).
- Hover = resaltar vecinos (ya existe) + pulir: vecinos conservan label, resto `hidden`
  en vez de gris (Obsidian atenúa del todo), aristas del vecindario más gruesas.
- **Arrastrar nodos**: `downNode` → en `mousemove` usar `sigma.getViewportToGraph()`
  para setear posición + `refresh()`; `mouseup` termina (implementación local, ~30 líneas).
- Toolbar flotante (esquina): zoom+, zoom−, reset (camera.animate ratio 1),
  pantalla completa (`requestFullscreen` del contenedor).
- Inspector (320px derecha / bottom-sheet móvil): badge tipo + chip capa, título serif,
  resumen, métricas reales (grado, N vecinos), lista de vecinos enlazable (top 8,
  "ver todos" en /nodo/:slug), botón primario "Leer nota completa" → `/nodo/:slug`.
  Estado inicial sin selección: mensaje "Pasa el cursor o haz clic en un nodo".
- Status bar bottom: `N nodos · E aristas · densidad 0.0XX · modularidad 0.XX`
  (de `grafo/index.ts`, reales).
- `RutaGrafoNodo`: reutiliza todo lo anterior con `foco` + inspector poblado del nodo
  (reemplazar PanelDetalleNodo si conviene, mismo contrato visual).

## 7. No-regresión

- `bun install && bun run build && bun run typecheck && bun run lint` en verde.
- Rutas v1 siguen respondiendo: `/`, `/captura`, `/grafo`, `/grafo/:id`, `/nodo/:slug`,
  `/healthcheck`.
- El vault (164 notas) intacto: captura solo escribe en `9 · Evidencia de campo/`.
- Conteos reales en `/`: 10 causas, 57 fichas, 30 mediciones, 25 efectos, 22 actores.
