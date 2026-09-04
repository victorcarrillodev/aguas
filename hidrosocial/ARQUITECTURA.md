# ARQUITECTURA — `hidrosocial/`

App **Remix 2 + Vite 5 + TypeScript 5 + Bun** (runtime y package manager) sobre el vault de Obsidian `agua` (Diagnóstico hidrosanitario del AMG, 164 notas `.md`, 11 `.canvas`).

Tres vistas: **Dashboard** (métricas del vault) · **Estación de Captura** (cuestionario → nota `.md` nueva) · **Explorador del Grafo** (clic en nodo → panel legible → navegar a relacionados).

---

## 0 · Visión y modelo mental

La app es un **lector aumentado del vault**, no una base de datos paralela. Hay **una sola fuente de verdad**: los `.md` y `.canvas`. Al arrancar (y con TTL) construye en memoria un **grafo tipado** (`VaultGraph`) revalidado por `mtime`.

Dos familias de microprocesos:
- **Leen/parsan**: `vault-core` (parser md + frontmatter + links + canvas, sin React) y `cache` (frescura por mtime).
- **Transforman para una vista**: `dashboard`, `grafo`, `captura`.

Regla de independencia: **solo `vault-core` y `cache` tocan el filesystem (lectura)**. Solo `captura` escribe, y **únicamente** en `9 · Evidencia de campo/`. Comunicación entre módulos SOLO vía el `index.ts` de cada uno (nunca importar internals de otro módulo).

---

## 1 · Modelo del vault (verificado — cópialo tal cual)

- **Enlaces**: 0 wikilinks en todo el vault. TODO son **markdown links relativos URL-encoded**, ej. `[E1 · La calidad del agua](../2%20%C2%B7%20Las%20causas/E1%20%C2%B7%20La%20calidad%20del%20agua.md)`. La app DEBE generar este formato.
- **Canvas** (`8 · Mapas/`, 11 archivos): JSON `{ nodes: [{ id, type: "file"|"text", file: "2 · Las causas/E1 · La calidad del agua.md", x, y, width, height, color }], edges: [{ id, fromNode, fromSide, toNode, toSide }] }`. `file` es ruta **relativa a raíz SIN URL-encoding**. Aristas sin etiqueta. `color` = capa dominante.
- **`9 · Evidencia de campo/` NO existe todavía**: la app la crea al primer guardado.

| Tipo | Carpeta | Conteo | Frontmatter | Notas |
|---|---|---|---|---|
| problema | `1 · El problema/` | 4 | `titulo:` (+`aliases` en El problema central) | |
| causa | `2 · Las causas/` | 10 | `titulo: E1 · ...`, `aliases: [E1, ...]`, `capa: Macroprocesos\|Factores\|Actores`, `atribucion: SIAPA\|Mixto\|Legislativo\|Estatal\|Ciudadano` | Secciones `## Por qué ocurre`, `## Qué provoca`, `## Cómo se mediría`, `## Quién lo causa`, `## Dónde se conecta` |
| ficha | `3 · Las fichas/` | 57 | `titulo: E1.1`, `tipo: Causa directa`(50)\|`Causa de segundo orden`(7), `arbol: E1..E10` | `# ID` → `> enunciado` → `**Causa directa** dentro de [...]. Cuelga de [...]` → `## La cadena` (`**Hacia arriba** —` / `**Hacia abajo** —`) → `## Clasificación` |
| actor | `4 · Los actores/` | 22 + índice | `titulo:`, `nombre:`, `curva: Oferta\|Demanda\|Ambas\|Árbitro\|Oferta privada\|Oferta ilícita` | |
| efecto | `5 · Los efectos/` | 25 + índice | `titulo:`, `alcance: rama\|copa maestra\|raíz\|hipótesis` | `## Lo produce` (links a causas) |
| medicion | `6 · Las mediciones/` | 30 + índice | `titulo:`, `arbol: E<N>` | `## Línea base` = `**No disponible.**` en casi todas (dato clave del dashboard) |
| metodo | `7 · El método/` | 5 | solo `titulo:` | `Las cinco capas.md` define taxonomía |
| mapa | `8 · Mapas/` | 11 `.canvas` | JSON (ver arriba) | |
| evidencia | `9 · Evidencia de campo/` | (nuevas) | extensión propia (ver §5) | creadas por la app |

- **Taxonomía de capas** (de `Las cinco capas.md`): `C0` Ciclo hidrosocial `#E8A0BF` · `C1` Macroprocesos `#7FB77E` (códigos ABAS/DIST/FACT/COML/RECO/SANE/REUS/PROY/TARI/APOY) · `C2` Actores `#7EA6E0` · `C3` Factores `#A986C9` (F1–F6) · `C4` Dimensiones `#C8B6E2` (lentes AMB/BIO/ECO/SOC/TER/INS/POL).
- **Causas por capa**: E1–E5 Macroprocesos · E9 Actores · E6/E7/E8/E10 Factores.
- **EXCLUIR** del grafo y del parseo: `_Trabajo interno/` (incluye `Plantillas/`). Ignorar `README.md`/`Inicio.md` como índices (tipo `indice`).
- `.obsidian/graph.json` está DESFASADO: NO usar.
- **Clasificación por carpeta** (fallback de `tipo` cuando el frontmatter no lo diga): carpeta → tipo (ver §6).

---

## 2 · Decisiones (D1–D10)

- **D1 Ubicación**: subcarpeta `hidrosocial/` hermana de `2 · Las causas/`. Env `VAULT_PATH`, default `..` resuelto a absoluto desde `process.cwd()`. En Docker: vault montado en `/vault`, `VAULT_PATH=/vault`.
- **D2 Stack**: Remix 2 (`@remix-run/react|node|serve` `^2.x`) + Vite 5 + TS 5 + Bun. CSS Modules co-localizados (`X.module.css` junto a `X.tsx`) + `tokens.css` global. Tipografías `@fontsource/*`. **Sin Tailwind, sin CDN**.
- **D3 Design system** (atomic renombrado, tema hidrosocial): **Gota** (átomo) → **Corriente** (molécula) → **Cauce** (organismo) → **Cuenca** (plantilla/página). En `app/design-system/{gotas,corrientes,cauces,cuencas}/`.
- **D4 Microprocesos**: `vault-core`, `cache`, `dashboard`, `captura`, `grafo` en `app/microprocesos/`, cada uno con `index.ts` como única interfaz.
- **D5 Cache**: memoria singleton: `VaultGraph` + `Map<relPath,{mtimeMs,size}>`; TTL 2 s; revalida escaneando mtimes de `.md`/`.canvas`; `captura` invalida al escribir.
- **D6 Grafo**: `graphology` + `sigma` (WebGL 2D) + `graphology-layout-forceatlas2`, ejecutando el layout **en servidor** (headless) para posiciones deterministas cacheadas. Panel de detalle DOM aparte. Descartado three.js (legibilidad clic→leer).
- **D7 Rutas**: `/` dashboard · `/captura` (GET form + action POST) · `/grafo` · `/grafo/:nodeId` · `/nodo/:slug` · `/healthcheck` (resource route). `slug`/`nodeId` = base64url del `relPath`.
- **D8 Nota de captura**: escribe en `9 · Evidencia de campo/`, frontmatter `titulo`+`arbol`+extensiones, markdown links URL-encoded. Taxonomía del cuestionario adaptada: ciclos 1–5 → capas C0–C4; D1–D7 → lentes AMB/BIO/ECO/SOC/TER/INS/POL.
- **D9 Docker**: `Dockerfile` multi-stage `oven/bun:1`; `docker-compose.yml` monta vault RW en `/vault`, `VAULT_PATH=/vault`, puerto `3000:3000`, healthcheck.
- **D10 Scripts**: `dev`=`remix vite:dev` · `build`=`remix vite:build` · `start`=`remix-serve ./build/server/index.js` · `typecheck`=`tsc --noEmit` · `lint`=`biome check .`.

---

## 3 · Árbol de carpetas completo (un comentario por archivo)

```
hidrosocial/
├── package.json                     # deps + scripts (D2/D10)
├── tsconfig.json                    # strict, jsx react-jsx, moduleResolution bundler, paths "~/*"
├── vite.config.ts                   # remix() + vite-tsconfig-paths()
├── biome.json                       # linter+formatter (indent 2, comillas simples)
├── .env.example                     # VAULT_PATH=..
├── .gitignore                       # node_modules, build, .env, .cache, graphify-out
├── .dockerignore                    # node_modules, build, .env, .git
├── Dockerfile                       # multi-stage oven/bun:1 (deps → build → serve :3000)
├── docker-compose.yml               # mount vault RW en /vault, VAULT_PATH=/vault, healthcheck
├── README.md                        # mapeo Gota/Corriente/Cauce/Cuenca + taxonomía C0-C4/lentes + cómo correr
├── public/
│   └── favicon.svg                  # gota de agua
└── app/
    ├── entry.client.tsx             # hydrateRoot(<RemixBrowser/>)
    ├── entry.server.tsx             # renderToString + handleRequest con isbot
    ├── root.tsx                     # <html><Links/><Meta/><Scripts/>; importa tokens.css y root.module.css
    ├── root.module.css              # layout raíz: header + nav + <main> + footer
    ├── tokens.css                   # :root variables: colores capas C0-C4, neutros, fuentes, espaciado
    ├── lib/
    │   ├── rutas.ts                 # encodeNodo/decodeNodo (base64url), relPath→slug, helpers URL-encode markdown
    │   ├── colores.ts               # colorDeCapa(CapaId)→hex, colorDeTipo(VaultNodeType)→hex, paleta neutra
    │   └── taxonomia.ts             # constantes: CAPAS, LENTES, MACROPROCESOS, FUERZAS, ARBOLES, TIPOS_EVIDENCIA
    ├── design-system/
    │   ├── index.ts                 # barrel: re-exporta gotas/corrientes/cauces
    │   ├── gotas/                   # nivel ATOMO (sin estado de app)
    │   │   ├── Boton.tsx            # botón primario/secundario/fantasma
    │   │   ├── Boton.module.css
    │   │   ├── Chip.tsx             # badge de capa/tipo (usa color de colores.ts)
    │   │   ├── Chip.module.css
    │   │   ├── Tarjeta.tsx          # contenedor de superficie con borde
    │   │   ├── Tarjeta.module.css
    │   │   ├── Metrica.tsx          # número grande + etiqueta + acento
    │   │   ├── Metrica.module.css
    │   │   ├── CampoTexto.tsx       # input texto
    │   │   ├── CampoTexto.module.css
    │   │   ├── CampoSelect.tsx      # select con opciones
    │   │   ├── CampoSelect.module.css
    │   │   ├── AreaTexto.tsx        # textarea
    │   │   ├── AreaTexto.module.css
    │   │   ├── TablaMini.tsx        # tabla simple cabecera+cuerpo
    │   │   └── TablaMini.module.css
    │   ├── corrientes/              # nivel MOLECULA (compone gotas)
    │   │   ├── ListaMetricas.tsx    # grilla de Metricas
    │   │   ├── ListaMetricas.module.css
    │   │   ├── FormBloque.tsx       # sección de formulario con título + campos
    │   │   ├── FormBloque.module.css
    │   │   ├── PanelFiltro.tsx      # controles de filtro del grafo (tipo/capa)
    │   │   ├── PanelFiltro.module.css
    │   │   ├── PanelDetalleNodo.tsx # panel DOM del nodo seleccionado + vecinos
    │   │   └── PanelDetalleNodo.module.css
    │   ├── cauces/                  # nivel ORGANISMO (compone corrientes)
    │   │   ├── EncabezadoApp.tsx    # header sticky + nav a las 3 vistas
    │   │   ├── EncabezadoApp.module.css
    │   │   ├── NavegacionLateral.tsx# nav lateral (dashboard/captura/grafo)
    │   │   └── NavegacionLateral.module.css
    │   └── cuencas/                 # nivel TEMPLATE/PAGINA (solo README documenta el nivel)
    │       └── README.md            # "las páginas viven en app/rutas y son cuencas"
    ├── microprocesos/
    │   ├── vault-core/
    │   │   ├── index.ts             # barrel: parseVault, leerNota, listarArboles, estadisticas
    │   │   ├── tipos.ts             # VaultNode, VaultEdge, VaultGraph, VaultNodeType, CapaId, FileMeta, NotaCompleta
    │   │   ├── frontmatter.ts       # parseFrontmatter(texto): {datos, cuerpo}
    │   │   ├── markdown-links.ts    # extraerLinks(cuerpo, dirActual): string[] relPaths
    │   │   ├── canvas.ts            # parseCanvas(texto): VaultEdge[] + posiciones/colores
    │   │   └── clasificar.ts        # tipoDeNota(relPath, frontmatter): VaultNodeType + resumen
    │   ├── cache/
    │   │   ├── index.ts             # getVaultGraph(), invalidar(), getVaultPath()
    │   │   └── memoria.ts           # singleton + escaneo mtime + TTL
    │   ├── dashboard/
    │   │   ├── index.ts             # calcularMetricas(graph): MetricasDashboard
    │   │   └── metricas.ts          # agregaciones por tipo/capa/arbol + mediciones sin línea base
    │   ├── captura/
    │   │   ├── index.ts             # validarBorrador(), guardarNota()
    │   │   ├── esquema.ts           # Borrador + opciones del formulario + reglas de validación
    │   │   ├── plantilla.ts         # renderPlantilla(borrador): string (md completo)
    │   │   └── escritor.ts          # slug único + mkdir + write + cache.invalidar()
    │   └── grafo/
    │       ├── index.ts             # construirGrafoRender(), vecinosDe()
    │       ├── construir.ts         # graph→nodos/aristas serializables (filtra tipo/capa)
    │       └── layout.ts            # forceatlas2 headless → {x,y} por nodo
    └── rutas/
        ├── RutaDashboard.tsx        # cuenca: página del dashboard (loader→metricas)
        ├── RutaDashboard.module.css
        ├── RutaCaptura.tsx          # cuenca: formulario de captura (loader→opciones, action→guardar)
        ├── RutaCaptura.module.css
        ├── RutaGrafo.tsx            # cuenca: explorador (loader→nodos/aristas) + WrapperSigma
        ├── RutaGrafo.module.css
        ├── RutaGrafoNodo.tsx        # /grafo/:nodeId (loader→nodo+vecinos) + PanelDetalleNodo
        ├── RutaGrafoNodo.module.css
        ├── RutaNodo.tsx             # /nodo/:slug (loader→leerNota) artículo legible
        ├── RutaNodo.module.css
        ├── SalidaHealthcheck.tsx    # resource route /healthcheck → {ok:true}
        ├── WrapperSigma.tsx         # componente cliente que monta sigma en un <div>
        └── WrapperSigma.module.css
```

---

## 4 · Contratos TypeScript

```ts
// microprocesos/vault-core/tipos.ts
export type CapaId = "C0" | "C1" | "C2" | "C3" | "C4";
export type ArbolId = "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7" | "E8" | "E9" | "E10";
export type VaultNodeType =
  | "problema" | "causa" | "ficha" | "actor" | "efecto"
  | "medicion" | "metodo" | "evidencia" | "indice";

export interface VaultEdge {
  origen: string;   // id del nodo (relPath)
  destino: string;  // id del nodo
  tipo: "enlace" | "canvas" | "jerarquia";
  etiqueta?: string;
}

export interface VaultNode {
  id: string;              // relPath normalizado con "/" (sin URL-encoding)
  tipo: VaultNodeType;
  titulo: string;          // del frontmatter o del nombre de archivo
  slug: string;            // base64url del relPath (para rutas)
  relPath: string;         // igual que id
  frontmatter: Record<string, string | undefined>;
  resumen: string;         // primer blockquote "> ..." o primeros 160 chars del cuerpo
  arbol?: ArbolId;
  capa?: CapaId;
  lineaBaseDisponible?: boolean; // solo mediciones (## Línea base != No disponible)
}

export interface VaultGraph {
  nodos: Map<string, VaultNode>;
  aristas: VaultEdge[];
  escaneadoEn: number;     // Date.now()
}

export interface FileMeta { mtimeMs: number; size: number; }

export interface NotaCompleta {
  nodo: VaultNode;
  frontmatter: Record<string, string | undefined>;
  cuerpo: string;          // markdown sin frontmatter
  links: string[];         // relPaths destino
}

// ---- vault-core/index.ts ----
export function parseVault(vaultPath: string): Promise<VaultGraph>;
export function leerNota(vaultPath: string, relPath: string): Promise<NotaCompleta>;
export function estadisticas(g: VaultGraph): { porTipo: Record<string, number>; porCapa: Record<string, number>; porArbol: Record<string, number> };

// ---- cache/index.ts ----
export function getVaultGraph(): Promise<VaultGraph>; // lee VAULT_PATH, TTL 2s, revalida por mtime
export function invalidar(): void;
export function getVaultPath(): string;

// ---- dashboard/index.ts ----
export interface MetricasDashboard {
  totalNotas: number;
  porTipo: Record<VaultNodeType, number>;
  porCapa: Record<CapaId, number>;
  porArbol: Record<ArbolId, number>;
  medicionesSinLineaBase: number;   // mediciones con ## Línea base "No disponible"
  mediciones: number;
  actores: number;
  evidencias: string[];             // relPaths de evidencia (más recientes primero)
  causas: { id: string; titulo: string; capa: CapaId; atribucion?: string; fichas: number }[];
}
export function calcularMetricas(g: VaultGraph): MetricasDashboard;

// ---- captura/index.ts ----
export interface Borrador {
  titulo: string;        // requerido, no vacío
  enunciado: string;     // requerido, una frase
  observacion: string;   // requerido
  arbol: ArbolId;
  fichaId?: string;      // relPath de ficha observada
  medicionId?: string;   // relPath de medición que ayuda a capturar
  capa: CapaId;
  lente: string;         // AMB|BIO|ECO|SOC|TER|INS|POL
  tipoEvidencia: string; // observacion|testimonio|dato de campo|documento
  fuente: string;        // requerido
  fecha: string;         // ISO yyyy-mm-dd
}
export function validarBorrador(fd: FormData): Borrador; // lanza Error con mensaje legible si inválido
export async function guardarNota(b: Borrador): Promise<VaultNode>; // escribe + cache.invalidar()

// ---- grafo/index.ts ----
export interface NodoRender { id: string; slug: string; titulo: string; tipo: VaultNodeType; capa?: CapaId; color: string; x: number; y: number; size: number; }
export interface AristaRender { origen: string; destino: string; }
export interface GrafoRender { nodos: NodoRender[]; aristas: AristaRender[]; }
export function construirGrafoRender(g: VaultGraph, filtro?: { tipo?: VaultNodeType; capa?: CapaId }): GrafoRender;
export function vecinosDe(id: string, g: VaultGraph, profundidad?: number): VaultNode[];
```

---

## 5 · Plantilla LITERAL de la nota de captura

Escrita en `9 · Evidencia de campo/<titulo-slugificado>.md`. `captura/plantilla.ts` reemplaza `{{...}}` y construye los links reales (URL-encoded) a partir del `arbol`, `fichaId` y `medicionId` elegidos.

```
---
titulo: {{titulo}}
arbol: {{arbol}}
tipo-evidencia: {{tipoEvidencia}}
capa: {{capa}}
lente: {{lente}}
mide: {{tituloMedicion}}
fecha: {{fecha}}
fuente: {{fuente}}
---

# {{titulo}}

> {{enunciado}}

**Evidencia de campo** del árbol [{{tituloCausa}}](../2%20%C2%B7%20Las%20causas/{{archivoCausa}}.md). Observa a [{{tituloFicha}}](../3%20%C2%B7%20Las%20fichas/{{archivoFicha}}.md). Ayuda a capturar [{{tituloMedicion}}](../6%20%C2%B7%20Las%20mediciones/{{archivoMedicion}}.md).

## Observación de campo

{{observacion}}

## La cadena

**Hacia arriba** — apoya a [{{tituloCausa}}](../2%20%C2%B7%20Las%20causas/{{archivoCausa}}.md).

**Hacia abajo** — alimenta la captura de [{{tituloMedicion}}](../6%20%C2%B7%20Las%20mediciones/{{archivoMedicion}}.md).

## Fuentes

| Tipo | Referencia | Fecha |
|---|---|---|
| {{tipoEvidencia}} | {{fuente}} | {{fecha}} |
```

Ejemplos de valores reales (para que el coder valide el encode): `{{archivoCausa}}` = `E1%20%C2%B7%20La%20calidad%20del%20agua`, `{{archivoFicha}}` = `E1.1`, `{{archivoMedicion}}` = `Cumplimiento%20de%20la%20NOM-127`. Los helpers de encode viven en `lib/rutas.ts` (URL-encode de path por segmento, respetando `/`).

---

## 6 · Instrucciones por archivo para el coder

### Microproceso `vault-core`
- `clasificar.ts` — `tipoDeNota(relPath, frontmatter)`:
  - si `relPath` empieza por `_Trabajo interno/` → **ignorar** (no devolver nodo).
  - carpeta → tipo: `1 · El problema/`→`problema`, `2 · Las causas/`→`causa`, `3 · Las fichas/`→`ficha`, `4 · Los actores/`→`actor`, `5 · Los efectos/`→`efecto`, `6 · Las mediciones/`→`medicion`, `7 · El método/`→`metodo`, `9 · Evidencia de campo/`→`evidencia`.
  - nombres de índice (`Índice de fichas`, `Los efectos`, `Las mediciones`, `Los actores`, `Mapa general`, raíz `Inicio.md`, `README.md`) → `indice`.
  - `capa` del nodo: si frontmatter tiene `capa`, mapear `Macroprocesos`→`C1`, `Factores`→`C3`, `Actores`→`C2`. Para fichas sin `capa`, heredar de su `arbol` (ver tabla §1: E1-E5→C1, E9→C2, E6/E7/E8/E10→C3). Para `medicion`, capa nula (sin color de capa, color por tipo).
- `frontmatter.ts` — parser YAML mínimo: separa el bloque `---\n...\n---` inicial; soporta `clave: valor`, `clave: "valor"`, y listas inline `clave: [a, b]`. Devuelve `{ datos, cuerpo }`.
- `markdown-links.ts` — `extraerLinks(cuerpo, dirActual)`: regex `\]\(([^)\s]+)\)`; descarta targets `http(s)://`, `#`, `mailto:`. `decodeURIComponent` al target, resuelve relativo a `dirActual`, normaliza a `/`, quita `.md` si se pide. Devuelve relPaths.
- `canvas.ts` — `parseCanvas(texto, archivoRelPath)`: `JSON.parse`; por cada `node.type==="file"` genera un nodo (o lo referencia) con `color` y `{x,y}`; por cada `edge` genera `VaultEdge { origen, destino, tipo:"canvas" }` mapeando `fromNode`/`toNode` a los `file` correspondientes. Las rutas `file` ya están relativas a raíz SIN encoding → usarlas tal cual como `relPath`.
- `index.ts` — `parseVault`: recorre recursivamente `vaultPath` buscando `*.md` y `*.canvas`; construye `VaultNode` por nota (frontmatter + cuerpo para `resumen`), extrae links → `VaultEdge{ tipo:"enlace" }`, suma edges de canvas, y añade `VaultEdge{ tipo:"jerarquia" }` ficha→causa (por `arbol`) y medicion→causa (por `arbol`). `leerNota` devuelve `NotaCompleta`.

### Microproceso `cache`
- `memoria.ts` — singleton: `{ grafo?: VaultGraph, firmas: Map<relPath, FileMeta>, escaneadoEn: number }`. `getVaultGraph()`: si no hay grafo o pasaron >2 s desde `escaneadoEn`, escanea mtimes/size de todos los `.md`/`.canvas`; si difieren de `firmas`, reconstruye `parseVault`. Devuelve el grafo. `invalidar()`: pone `grafo=undefined` y `firmas.clear()`.
- `getVaultPath()`: `path.resolve(process.env.VAULT_PATH ?? "..")`.

### Microproceso `dashboard`
- `calcularMetricas(g)`: cuenta por tipo, capa, árbol; `medicionesSinLineaBase` = mediciones cuyo `frontmatter`/cuerpo marque `## Línea base` con `No disponible` (o `lineaBaseDisponible===false`); `causas[]` con título, capa, atribución y nº de fichas (edges jerarquia desde el nodo causa). Devuelve `MetricasDashboard`.

### Microproceso `captura`
- `esquema.ts` — `validarBorrador(fd)`: lee campos del FormData (`titulo`, `enunciado`, `observacion`, `arbol`, `fichaId`, `medicionId`, `capa`, `lente`, `tipoEvidencia`, `fuente`, `fecha`); valida obligatorios (titulo, enunciado, observacion, fuente, fecha, arbol válido). Lanza `Error` descriptivo si falta algo.
- `plantilla.ts` — `renderPlantilla(b, ctx)`: sustituye placeholders de §5 y genera los links URL-encoded con `lib/rutas.ts`. `ctx` trae `{causa, ficha?, medicion?}` resueltos desde el grafo.
- `escritor.ts` — `guardarNota(b)`: resuelve `causa/ficha/medicion` desde `cache.getVaultGraph()`; calcula `relPath` destino `9 · Evidencia de campo/<slug(titulo)>.md` (slug = minúsculas, sin acentos, espacios→`-`); si ya existe añade sufijo `-2`, `-3`…; crea la carpeta si no existe; escribe el md; llama `cache.invalidar()`; devuelve el `VaultNode` nuevo.

### Microproceso `grafo`
- `layout.ts` — construye un `Graph` de `graphology`, añade nodos/aristas, ejecuta `forceAtlas2(graph, { iterations: 150 })` (headless, en servidor); extrae `{x,y}` por nodo. (Si forceatlas2 falla en Bun, fallback: `graphology-layout` `circular` + jitter determinista.)
- `construir.ts` — mapea `VaultGraph` → `GrafoRender` (filtra `indice`/`metodo` por defecto), asigna `color` por `capa`/`tipo` (colores.ts), `size` por grado del nodo.
- `index.ts` — `vecinosDe(id, g, profundidad=1)` recorre aristas (origen/destino) hasta la profundidad dada.

### Rutas Remix (`app/rutas/`)
- **`RutaDashboard.tsx`** — `loader`: `const g = await getVaultGraph(); return calcularMetricas(g);`. Renderiza `ListaMetricas` + tabla de causas por capa + lista de evidencias recientes.
- **`RutaCaptura.tsx`** — `loader`: del grafo devuelve listas para los `select`: `arboles` (E1-E10 con título), `fichas` (por árbol), `mediciones` (por árbol), `capas`, `lentes`, `tiposEvidencia`. `action`: `validarBorrador(fd)` → `guardarNota(b)` → `redirect("/grafo/" + encodeNodo(nodo.id))`. Renderiza el formulario (bloques tipo el HTML del usuario, adaptado a la taxonomía real).
- **`RutaGrafo.tsx`** — `loader`: `construirGrafoRender(g)` → `{ nodos, aristas }`. Renderiza `WrapperSigma` a pantalla completa + `PanelFiltro`.
- **`RutaGrafoNodo.tsx`** — `loader` (`params.nodeId`): `decodeNodo(nodeId)` → `nodo` + `vecinosDe(id, g, 1)` + aristas entre ellos. Renderiza `WrapperSigma` (mismo grafo, `focus` en el nodo) + `PanelDetalleNodo` (título, tipo/capa, resumen, vecinos con link a `/nodo/:slug` y botón "ver en grafo").
- **`RutaNodo.tsx`** — `loader` (`params.slug`): `decodeNodo(slug)` → `leerNota` → `{ nodo, cuerpo }`. Renderiza el artículo legible (cuerpo markdown preformateado con Newsreader; se recomienda `dangerouslySetInnerHTML` sobre el md crudo con estilos básicos, o render de líneas). Incluye enlaces de vuelta.
- **`SalidaHealthcheck.tsx`** — `loader`: `return json({ ok: true })`.
- **`WrapperSigma.tsx`** — componente cliente (`"use client"` implícito en Remix: no exporta `loader`; importa sigma). Montaje:
  1. `useEffect` una vez: `import Sigma from "sigma"; import Graph from "graphology";`
  2. Construye `Graph`, `addNode(id, {x,y,size,label:titulo,color})`, `addEdge(origen,destino)`.
  3. `const renderer = new Sigma(graph, contenedor, { allowInvalidContainer: true, renderEdgeLabels: false, defaultNodeColor: "#7EA6E0" });`
  4. Eventos: `renderer.on("clickNode", ({node}) => navigate("/grafo/" + encodeNodo(node)))`; `enterNode`/`leaveNode` → resalta vecinos (reduce opacidad del resto).
  5. Cleanup: `renderer.kill()`.
  - Nota: recibe `nodos`/`aristas` como props serializadas (no instancias de graphology).

### `lib/rutas.ts`
- `encodeNodo(relPath)`: `Buffer.from(relPath, "utf8").toString("base64url")`.
- `decodeNodo(slug)`: `Buffer.from(slug, "base64url").toString("utf8")`.
- `urlSegmento(nombre)`: `encodeURIComponent(nombre)` (para rutas de archivo en markdown links, dejando `/` sin codificar).
- `slugificar(titulo)`: minúsculas, elimina acentos (`.normalize("NFD").replace(/\p{Diacritic}/gu,"")`), espacios→`-`.

### `lib/colores.ts`
- `colorDeCapa`: C0 `#E8A0BF`, C1 `#7FB77E`, C2 `#7EA6E0`, C3 `#A986C9`, C4 `#C8B6E2`.
- `colorDeTipo`: causa `#7FB77E`, ficha `#A986C9`, actor `#7EA6E0`, efecto `#C9C9C9`, medicion `#D4A373`, problema `#111827`, evidencia `#0EA5E9`, metodo/indice `#9CA3AF`.
- Paleta neutra (tokens.css): surface `#ffffff`, on-surface `#111827`, on-surface-variant `#4b5563`, outline `#d1d5db`, outline-variant `#e5e7eb`, primary `#111827`, on-primary `#ffffff`, surface-container `#f9fafb`, surface-container-low `#f3f4f6`, secondary `#374151`.

### `lib/taxonomia.ts`
- `CAPAS = ["C0","C1","C2","C3","C4"]` con etiqueta; `LENTES = ["AMB","BIO","ECO","SOC","TER","INS","POL"]`; `ARBOLES = ["E1"..."E10"]`; `TIPOS_EVIDENCIA = ["observacion","testimonio","dato de campo","documento"]`; `MACROPROCESOS = ["ABAS","DIST","FACT","COML","RECO","SANE","REUS","PROY","TARI","APOY"]`; `FUERZAS = ["F1"..."F6"]`.

### `tokens.css`
- `:root` con las variables de color (capas + neutra), `--fuente-ui: "Hanken Grotesk"`, `--fuente-lectura: "Newsreader"`, `--fuente-datos: "JetBrains Mono"`, espaciado `--esp-1..--esp-8`. Importa los `@fontsource/*` (en `root.tsx` o aquí con `@import`).

---

## 7 · Fases de implementación (para build incremental y verificación)

1. **Scaffold** (package.json, tsconfig, vite, biome, env, docker, README, favicon, entry, root, tokens).
2. **lib/** (rutas, colores, taxonomia) + **vault-core** (parser). Verificar con un script `bun x tsx` que `parseVault("..")` arroja ~164 notas y edges correctos.
3. **cache** + **dashboard** + **RutaDashboard** (ya renderiza métricas reales).
4. **grafo** (layout + construir) + **WrapperSigma** + **RutaGrafo** + **RutaGrafoNodo** + **PanelDetalleNodo** + **RutaNodo**.
5. **captura** (esquema, plantilla, escritor) + **RutaCaptura** + action.
6. **Docker** + healthcheck + polish visual (design-system completo).

---

## 8 · Criterios de aceptación (a verificar por el reviewer)

1. `bun install && bun run build` termina sin errores en `hidrosocial/`.
2. `bun run dev` levanta la app; el dashboard muestra conteos reales del vault (10 causas, 57 fichas, 30 mediciones, 25 efectos, 22 actores) calculados de los `.md`, sin errores en consola.
3. El cuestionario guarda una nota `.md` válida con frontmatter + markdown links URL-encoded dentro del vault (en `9 · Evidencia de campo/`), navegable en el grafo de Obsidian.
4. El explorador renderiza nodos desde el vault; clic en un nodo (ej. E1) abre panel con su info y relaciones; se navega a nodos relacionados.
5. Todo el CSS vive en archivos `.module.css` por componente + `tokens.css` (cero CSS inline crítico, sin CDN de Tailwind en runtime).
6. **NO-REGRESIÓN**: las 164 notas existentes del vault no se modifican; la app solo añade notas en `9 · Evidencia de campo/`.

## Fuera de alcance

- Autenticación/usuarios. Modificar o reescribir notas existentes del vault. Despliegue en nube (solo Dockerfile + compose local). Migrar el HTML del cuestionario tal cual (su taxonomía ciclos 1-5/D1-D7 se adapta a la real C0-C4/lentes).
