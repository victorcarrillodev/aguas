# sesión

Frontera de acceso: nadie lee el vault sin haberse identificado. Todo loader y todo action privado empieza con `await requerirSesion(request)` —o `requerirRoot` en el panel del padrón—; sin sesión válida esa llamada lanza una redirección a `/acceso` y el resto del loader no llega a ejecutarse. Una prueba recorre `app/rutas/` y falla si aparece una cuenca nueva sin guarda.

## Padrón en dos capas

- **La cuenta root vive en `.env`** y existe siempre, aunque PostgreSQL no esté configurado: es la llave que no depende de nada. Admite la contraseña en claro (`ROOT_CLAVE`) o su derivación (`ROOT_CLAVE_HASH`, que gana si están las dos). Se entra con el nombre **o** con el correo.
- **El equipo vive en la tabla `usuarios`** y lo da de alta el root desde `/usuarios`. Cada alta registra quién la firmó y cuándo.
- `AUTH_USUARIOS` sigue admitiendo cuentas extra del entorno para un despliegue sin base de datos; entran siempre como `investigador`.
- El entorno manda: una fila de la base con el mismo nombre que el root no lo suplanta.

## Decisiones que sostienen esto

- Las contraseñas nunca se guardan en claro fuera de `.env`: la base sólo contiene derivaciones scrypt (`scrypt.N.r.p.sal.derivada`, 16 MiB y ~100 ms por intento). `verificarClave` compara con `timingSafeEqual`; `autenticar` deriva siempre —también contra un señuelo cuando la cuenta no existe— para que el tiempo de respuesta no revele qué cuentas hay.
- El mensaje de error del acceso es único: «usuario o contraseña incorrectos». Distinguir «no existe» de «clave mala» es un oráculo de enumeración. Una cuenta desactivada se verifica igual y se rechaza después, para que tampoco se note por el reloj.
- `requerirSesion` falla cerrado. Sin `SESSION_SECRET` de 32 caracteres o sin cuenta root no hay sesión posible: la app queda cerrada y `/acceso` explica qué falta, en vez de abrirse por omisión.
- La sesión es una cookie firmada `HttpOnly`, `SameSite=Lax`, `Secure` bajo HTTPS —o tras un proxy declarado con `CONFIAR_PROXY=1`—, limitada a la ruta base y con vencimiento absoluto (`SESION_HORAS`, 8 por omisión). No hay estado en servidor: el acceso funciona sin PostgreSQL.
- **El rol se resuelve en el padrón, no en la cookie.** Quitarle root a alguien, desactivarlo o eliminarlo surte efecto en su siguiente petición, sin esperar a que caduque su sesión. El padrón se relee cada 5 s como mucho, así que no se consulta la base en cada petición.
- Entrar crea una cookie nueva —nunca se reutiliza la anterior—, así que un identificador plantado antes del acceso no sobrevive (fijación de sesión). Salir la destruye.
- Los formularios llevan testigo CSRF guardado en la propia cookie firmada, comparado en tiempo constante, más comprobación de `Origin`/`Referer`. `SameSite=Lax` por sí solo no cubre navegadores viejos ni proxies que borran la cabecera.
- `destinoSeguro` sólo acepta rutas internas y sin caracteres de control: una URL absoluta o un `//host` convertirían el acceso en trampolín hacia otro sitio, y un salto de línea en división de respuesta.
- `intentos.server` frena la fuerza bruta por usuario y por cliente: cinco fallos y después espera creciente de 30 s hasta 15 min. Vive en memoria del proceso, con caducidad y tope de registros; `CONFIAR_PROXY=1` habilita leer `X-Forwarded-For`, que sin proxy delante es falsificable.
- Sobre la propia cuenta no se opera desde el panel: nadie se deja fuera por accidente.

## Correo

`correo.server.ts` es un cliente SMTP mínimo sobre `node:net` —el proyecto no añade dependencias— que entrega al relay del propio servidor (`SMTP_HOST`/`SMTP_PORT`, `localhost:25` por omisión), sin cuenta de terceros ni credenciales. `plantilla-correo.server.ts` arma el mensaje en `multipart/alternative`: texto plano y HTML de correo (tablas, estilo en línea), con el nombre y la clave escapados.

El envío es cortesía, no garantía: si el relay no contesta, el alta se completa igual y el panel enseña la contraseña una sola vez para entregarla a mano. `bun run correo:prueba [destino]` guarda la vista previa y, con un destinatario, prueba el relay sin dar de alta a nadie.

## Lo que no hace

No hay permisos por vista —quien entra ve y captura todo—, ni cambio de contraseña por cuenta propia (la restablece el root), ni segundo factor, ni recuperación por enlace de un solo uso. `/healthcheck` sigue público a propósito: Docker lo consulta sin credenciales y no expone contenido del vault.
