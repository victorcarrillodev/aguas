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
| **Gota** (átomo) | `gotas/` | Sin estado de app | Boton, Chip, Tarjeta, Metrica, CampoTexto, CampoClave, CampoSelect, AreaTexto, TablaMini |
| **Corriente** (molécula) | `corrientes/` | Compone gotas | ListaMetricas, FormBloque, FormAcceso, FormUsuario, TablaPadron, PanelFiltro, PanelDetalleNodo |
| **Cauce** (organismo) | `cauces/` | Compone corrientes | EncabezadoApp, NavegacionLateral, PanelAcceso |
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
bun run dev        # http://localhost:5173/calidad/ (VAULT_PATH=.. por defecto)
```

Variables de conexión y servidor: ver `.env.example`. Sin PostgreSQL configurado, la web funciona en solo lectura. Para guardar, configura `DATABASE_URL` o `PGHOST` y ejecuta `bun run db:migrate`.

```bash
bun run build && bun run start   # producción local
# Docker en el servidor: configura .env y sigue MIGRACION-POSTGRES.md
docker compose up -d --build     # vault en solo lectura, web en puerto 3005
```

`remix-serve` no lee `.env` (sí lo hace `bun run dev`, y en Docker las entrega Compose):
para una producción local, exporta antes las variables o arrancarás con el acceso cerrado.

Rutas: `/acceso` · `/` panel · `/sistema` · `/revision` · `/captura` · `/grafo` ·
`/grafo/:nodeId` · `/nodo/:slug` · `/usuarios` (sólo root) · `/salir` · `/healthcheck`.

## Acceso

**Nada del expediente es visible sin sesión.** Cada loader y cada action privado llama a
`requerirSesion(request)` antes de tocar el vault; sin sesión válida la petición se va a
`/acceso` —también las peticiones de datos de la navegación en cliente—. Sólo `/acceso`,
`/salir` y `/healthcheck` (la sonda de Docker) responden sin credencial.

### Tu cuenta va en `.env`

Ahí está tu contraseña, y sólo la tuya:

```bash
SESSION_SECRET=…                       # firma la cookie; mínimo 32 caracteres
ROOT_USUARIO=root
ROOT_CORREO=aguaCalidad@calidad.com    # también sirve para entrar
ROOT_CLAVE=tu-contraseña               # ⬅ aquí, en claro, mínimo 12 caracteres
```

El secreto lo genera esta orden:

```bash
bun -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Si prefieres no dejar la contraseña en claro, `bun run clave root` imprime su derivación
para `ROOT_CLAVE_HASH`, que tiene prioridad. Con cualquiera de las dos formas basta.

Compose pasa esas variables al contenedor: en el servidor el despliegue sigue siendo
`docker compose up -d --build`, sin pasos extra. Si llegaran vacías el servicio **arranca
cerrado** —nadie ve nada— y `/acceso` dice qué falta, en vez de abortar la construcción.

### A los demás los das de alta desde el panel

Con sesión de root aparece **Usuarios** en la cabecera (`/usuarios`). Desde ahí se crea una
cuenta con usuario, correo y rol, se restablece su contraseña, se desactiva y se elimina.
Deja la contraseña en blanco y el servidor inventa una de 20 caracteres; la verás una sola
vez. Estas cuentas viven en PostgreSQL, así que el panel necesita base de datos
(`bun run db:migrate`); sin ella sigue existiendo la cuenta root del entorno.

Dos roles: **root** administra el padrón; **investigador** lee y captura. El rol se resuelve
en el padrón en cada petición, no en la cookie: desactivar o eliminar a alguien le cierra la
sesión en su siguiente clic.

### El correo lo envía el propio servidor

Las credenciales salen por el relay de la máquina (`SMTP_HOST`/`SMTP_PORT`, `localhost:25`
por omisión): no hace falta una cuenta de Gmail ni credenciales de terceros. El mensaje va
en texto plano y HTML. Si el relay no responde, el alta se completa igual y el panel enseña
la contraseña para entregarla a mano.

```bash
bun run correo:prueba                  # guarda vista-correo.html con el diseño
bun run correo:prueba tu@correo.org    # además lo envía, para probar el relay
```

| Variable | Qué hace |
|---|---|
| `SESSION_SECRET` | Firma la cookie. Admite varios separados por coma para rotarlo sin cerrar sesiones: el primero firma, los demás siguen validando. |
| `ROOT_USUARIO` · `ROOT_CORREO` · `ROOT_CLAVE` | La cuenta root. `ROOT_CLAVE_HASH` sustituye a la contraseña en claro. |
| `SESION_HORAS` | Duración de la sesión (1–168, por omisión 8). Al vencer se pide la clave otra vez. |
| `CORREO_REMITENTE` · `SMTP_HOST` · `SMTP_PORT` · `CORREO_ENVIAR` | Envío de credenciales. `CORREO_ENVIAR=0` lo apaga. |
| `CONFIAR_PROXY` | `1` sólo si hay un proxy inverso de confianza delante: habilita leer `X-Forwarded-For` y `X-Forwarded-Proto`. |
| `AUTH_USUARIOS` | Opcional: cuentas extra del entorno (`usuario=derivada`, separadas por `;`) para correr sin base de datos. |

Detalles del diseño —scrypt, testigo CSRF, freno de fuerza bruta, fallo cerrado— en
[`app/microprocesos/sesion/README.md`](app/microprocesos/sesion/README.md).

Consulta [la migración a PostgreSQL](MIGRACION-POSTGRES.md) antes del primer despliegue para respaldar e importar las capturas existentes del servidor. Los registros nuevos se guardan en la base sin cambiar el vault ni hacer push.

## Microprocesos

`vault-core` (parseo) · `cache` (lectura del vault y registros guardados) · `captura` (validación de aportaciones) · `persistencia` (PostgreSQL) ·
`sesion` (acceso, padrón de usuarios, cookie firmada, freno de intentos y correo) ·
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

Consulta [la revisión del método y sus límites](REVISION-METODO.md) y [la guía para investigadores](../7%20%C2%B7%20El%20m%C3%A9todo/C%C3%B3mo%20aportar%20y%20revisar%20evidencia.md). La autoría es declarada: el acceso exige una credencial del padrón, pero esta versión no incorpora permisos distintos por persona —quien entra ve y captura todo— ni carga automática de documentos externos.
