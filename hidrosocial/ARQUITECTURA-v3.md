# ARQUITECTURA v3 — hidrosocial

Delta sobre `ARQUITECTURA-v2.md`. Un solo frente: **hacer computable la tesis del
diagnóstico**. Hasta v2 la app contaba el vault (cuántas notas, de qué tipo, cuántas
mediciones sin línea base); no explicaba nada sobre él. v3 añade el microproceso
`sistema` y la cuenca `/sistema`, que derivan del vault la estructura de dependencias
entre las diez causas estructurales y permiten simular correcciones.

---

## 1. Precondición: frontmatter completo en las causas y fichas

La lógica de v3 no infiere relaciones: las lee. Cada nota de `2 · Las causas/` declara
ahora en su frontmatter, además de lo que ya tenía:

```yaml
id: E7
rama: 7
capa: C3
macroproceso: APOY
actores: [SIAPA, DGRAL, ADMON, RH, COMS]
factor: F4
dimension: INS
genera: [DGRAL, ADMON, RH]
debe_resolver: [DGRAL]
brecha: parcial
naturaleza: Acción
ambito: SIAPA
depende_de: [E8]        # supuestos que este árbol declara
sostiene_a: [E1, E2]    # árboles que lo declaran a él como supuesto
contacto: [E9, E10, E3] # bisagras, sin dirección
efectos: [...]
mediciones: [...]
```

Y cada ficha de `3 · Las fichas/`: `id`, `tipo`, `rama`, `padre`, `hijos`, `capa`,
`naturaleza`, `ambito`, `bisagra_hacia`, `toca_raiz`, `vigilar`.

Estas claves son invisibles al leer (Obsidian tiene `propertiesInDocument: hidden`) y
son la interfaz de datos entre el vault y la app. **Nota:** `atribucion` pasó a llamarse
`ambito`; `dashboard/metricas.ts` lee `ambito ?? atribucion` para no romper notas viejas.

## 2. Microproceso `sistema` (nuevo)

| | |
|---|---|
| **Frontera** | Las diez causas como red: quién depende de quién y qué pasa si se corrige una sin corregir aquello de lo que depende. |
| **Lo que NO hace** | fs, caché, escritura, React, render. No inventa relaciones que el vault no declare. |
| **I/O** | `VaultGraph` → estructuras puras. |
| **Razón de cambio** | Que cambie el modelo de vínculos entre árboles o la regla de sostenibilidad. |

Contrato público (`app/microprocesos/sistema/index.ts`):

```ts
construirRed(g): RedSistema
desdeArboles(arboles): RedSistema        // rehidrata en cliente (RedSistema lleva un Map)
simular(red, seleccion): ResultadoSimulacion
ordenRecomendado(red, objetivo): ArbolId[]
incidenciaActores(g, red): IncidenciaActor[]
actoresSinIncidencia(g, red): string[]
ordenArbol(a, b): number
```

Derivados por árbol: `requiere` (cierre transitivo de `depende_de`, tolera ciclos),
`profundidad` (|requiere|), `nivel` (camino más largo a una raíz), `entra`/`sale`/`saldo`,
`esRaiz` (no depende de nadie y otros dependen de él).

**Regla de sostenibilidad:** una causa resuelta solo *se sostiene* si todo su `requiere`
también está resuelto. Es la traducción computable de la tesis del diagnóstico.

`dashboard` pasa a importar `sistema/index.ts` (index → index, permitido por la regla 2
de v2). No hay ciclo: `sistema` solo depende de `vault-core` y `lib`.

## 3. Cuenca `/sistema` (nueva)

Ruta registrada en `vite.config.ts`; añadida a `EncabezadoApp` y `NavegacionInferior`.

- **Hero + 4 KPI**: causas, dependencias declaradas, puntos de contacto, y la raíz única
  con cuántos árboles dependen de ella.
- **Tarjeta de raíz**: se muestra sola si `red.raices` tiene un elemento; el texto se
  genera con los conteos reales.
- **Simulador**: diagrama SVG propio (sin dependencias) con los árboles colocados por
  `nivel` — la raíz abajo, lo que depende de ella arriba. Ancho del lienzo calculado a
  partir del nivel más poblado para que las cajas nunca se encimen; el contenedor hace
  scroll horizontal. Cada caja es un `role="switch"` operable con teclado. Atajos:
  *Todo menos la raíz*, *Empezar por la raíz*, *Limpiar*.
- **Tabla del sistema**: depende de / sostiene a / requiere antes / brecha / fichas.
- **Incidencia de actores**: barras enfrentadas genera ● contra debe resolver ◆, con la
  lectura en texto (juez y parte, daña sin reparar, repara sin haber causado…).

## 4. Corrección de una métrica muerta

`criticidadDe(fichas)` daba «media» en las diez causas: todas tienen entre 5 y 7 fichas,
así que la columna no informaba nada. Pasa a ser `criticidadDe(sostieneA)` — cuántos
árboles dependen de esa causa — que sí discrimina (1 alta, 5 media, 4 baja) y comunica
la tesis. La columna del dashboard se renombra a **Peso en el sistema** y muestra el
conteo bajo la etiqueta; las causas se ordenan por él y la raíz lleva distintivo.

## 5. Convenciones respetadas

- CSS Modules sin `composes` (biome no lo parsea con la config del proyecto).
- Un `.module.css` por componente; único CSS global `tokens.css`.
- Colores de capa y tipo intactos (canónicos del vault).
- Cero dependencias nuevas: el diagrama es SVG a mano.

## 6. No-regresión verificada

- `bun run typecheck`, `bun run lint` y `bun run build` en verde.
- Rutas v1/v2 respondiendo: `/`, `/captura`, `/grafo`, `/grafo/:id`, `/nodo/:slug`,
  `/healthcheck` (`{"ok":true}`).
- Conteos reales sin cambio: 10 causas, 57 fichas, 30 mediciones, 25 efectos, 22 actores.
- El vault no se toca desde la app: `captura` sigue escribiendo solo en
  `9 · Evidencia de campo/`.
