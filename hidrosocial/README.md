# Hidrosocial

Lector aumentado del vault de Obsidian con el diagnóstico hidrosanitario del AMG.
Cinco vistas: **panel**, **sistema**, **mesa de investigación**, **estación de captura**
y **explorador del grafo**.

La mesa de investigación (`/revision`) trata el diagnóstico como documento de trabajo:
cada causa, ficha e indicador abre un expediente que conserva el texto original, muestra
su correspondencia con el Excel, admite evidencia favorable, contradictoria, matizada o
no concluyente y registra propuestas y decisiones como entradas separadas. La pregunta
«¿Y si estamos equivocados?» propone contrapruebas sin presentarlas como hallazgos.

La vista **sistema** (`/sistema`) deriva del frontmatter la red de dependencias entre las
diez causas estructurales. Su explorador muestra cuáles supuestos quedan dentro o fuera
de una selección. No predice resultados, sostenibilidad ni un orden de intervención. E8
aparece como base de esa red; la raíz maestra del planteamiento completo conserva sus dos
componentes: medición verificable y fiscalización.

El grafo incluye una **radiografía del cuello de botella**. Al seleccionar una afirmación,
aísla su corredor explicativo hasta tres relaciones y destaca los puntos muy conectados que
todavía no tienen evidencia específica. Es una brújula para decidir qué investigar después:
la puntuación expresa rendimiento documental potencial, no verdad, gravedad ni prioridad
política.

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

Rutas: `/` panel · `/sistema` · `/revision` · `/captura` · `/grafo` · `/grafo/:nodeId` ·
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

## Aportaciones y planes de contraste

La captura separa observación, método, interpretación, alcance y límites, conserva el enunciado examinado y permite asociar la aportación a un plan de contraste. Cada expediente distingue recepción de aceptación documental y exporta sus notas completas y revisiones.

Consulta [la revisión del método y sus límites](REVISION-METODO.md) y [la guía para investigadores](../7%20%C2%B7%20El%20m%C3%A9todo/C%C3%B3mo%20aportar%20y%20revisar%20evidencia.md). La autoría es declarada: esta versión no incorpora cuentas, permisos de revisión ni carga automática de documentos externos.
