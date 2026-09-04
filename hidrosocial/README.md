# Hidrosocial

Lector aumentado del vault de Obsidian con el diagnóstico hidrosanitario del AMG
(160 notas `.md`, 11 `.canvas`). Cuatro vistas: **dashboard**, **sistema**,
**estación de captura** y **explorador del grafo**.

La vista **sistema** (`/sistema`) es la que explica el diagnóstico en lugar de solo
contarlo: deriva del frontmatter la red de dependencias entre las diez causas
estructurales, identifica la raíz —la única causa de la que dependen otras y que no
depende de ninguna— y permite **simular correcciones**. La regla del simulador es la
tesis del diagnóstico hecha código: una causa resuelta solo se sostiene si también está
resuelto todo aquello de lo que depende. Marcar las nueve causas dejando la raíz sin
resolver da cero correcciones sostenibles.

## Mapeo Gota / Corriente / Cauce / Cuenca

El design system (`app/design-system/`) renombra atomic design con tema hidrosocial:

| Nivel | Carpeta | Qué es | Ejemplos |
|---|---|---|---|
| **Gota** (átomo) | `gotas/` | Sin estado de app | Boton, Chip, Tarjeta, Metrica, CampoTexto, CampoSelect, AreaTexto, TablaMini |
| **Corriente** (molécula) | `corrientes/` | Compone gotas | ListaMetricas, FormBloque, PanelFiltro, PanelDetalleNodo |
| **Cauce** (organismo) | `cauces/` | Compone corrientes | EncabezadoApp, NavegacionLateral |
| **Cuenca** (plantilla/página) | `cuencas/` + `app/rutas/` | Páginas completas | RutaDashboard, RutaCaptura, RutaGrafo… |

Cada componente vive junto a su `X.module.css`. El único CSS global es
`app/tokens.css` (variables). Cero Tailwind, cero CDN en runtime.

## Taxonomía

- **Capas**: C0 ciclo hidrosocial `#E8A0BF` · C1 macroprocesos `#7FB77E` ·
  C2 actores `#7EA6E0` · C3 factores `#A986C9` · C4 dimensiones `#C8B6E2`.
- **Lentes** (dimensiones C4): AMB, BIO, ECO, SOC, TER, INS, POL.
- **Macroprocesos** (C1): ABAS, DIST, FACT, COML, RECO, SANE, REUS, PROY, TARI, APOY.
- **Fuerzas** (C3): F1–F6. **Árboles**: E1–E10.
- El cuestionario de captura adapta ciclos 1–5 → capas C0–C4 y D1–D7 → lentes.

## Cómo correr

```bash
cd hidrosocial
bun install
bun run dev        # http://localhost:3000 (VAULT_PATH=.. por defecto)
```

Variables (`VAULT_PATH`, `PORT`): ver `.env.example`.

```bash
bun run build && bun run start   # producción local
docker compose up --build        # vault montado en /vault, puerto 3000
```

Rutas: `/` dashboard · `/sistema` · `/captura` · `/grafo` · `/grafo/:nodeId` ·
`/nodo/:slug` · `/healthcheck`.

## Microprocesos

`vault-core` (parseo) · `cache` (única lectura del fs) · `captura` (única escritura) ·
`dashboard` (agregaciones) · `grafo` (red para Sigma) · `busqueda` · `sistema`
(dependencias entre causas y simulación). Cada uno con su `README.md` y su `index.ts`
como contrato público.

Historial de decisiones: `ARQUITECTURA.md` (v1) → `ARQUITECTURA-v2.md` →
`ARQUITECTURA-v3.md`.

## Reglas del vault

- Solo `vault-core` y `cache` leen el filesystem; solo `captura` escribe, y
  únicamente en `9 · Evidencia de campo/`.
- Los enlaces generados son markdown relativos **URL-encoded** (0 wikilinks).
- Comunicación entre microprocesos solo vía su `index.ts`.
