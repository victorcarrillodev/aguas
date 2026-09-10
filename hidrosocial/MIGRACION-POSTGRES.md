# Migración a PostgreSQL

Las aportaciones, revisiones y demás registros creados por la web se guardan en PostgreSQL. El vault sigue siendo el contenido documental de base, montado en solo lectura. Capturar datos ya no requiere modificar archivos YAML ni hacer un push. El despliegue de cambios de código sigue siendo independiente.

Docker no se ejecutó en el PC de desarrollo. La construcción y la comprobación real del contenedor deben hacerse en el servidor Linux donde funciona Docker, desde `/opt/calidad/hidrosocial`. Usa Docker Compose v2.

## Qué despliega Compose

- `db`: PostgreSQL 17 Alpine con volumen persistente `postgres_data`, sin puerto publicado al anfitrión.
- `migrate`: ejecuta `bun run db:migrate` con la misma imagen que la web. Espera a que PostgreSQL esté disponible; la web solo arranca si termina correctamente.
- `calidad`: conserva el contenedor `calidad-web`, el puerto externo 3005 y el interno 3000. Lee el vault desde `/vault`.

Las migraciones de esquema se ejecutan al arrancar el servicio de migración; volver a ejecutarlas es seguro. La importación del contenido antiguo es **explícita**, no ocurre al iniciar la web.

La configuración usa campos de conexión separados para admitir contraseñas con caracteres especiales sin construir una URL. `POSTGRES_PASSWORD` es obligatorio. En un volumen existente, cambiar esta variable no cambia la contraseña de la base ya creada: hay que rotarla dentro de PostgreSQL y actualizar la configuración de la aplicación.

## 1. Pausar y respaldar antes de actualizar el servidor

Hazlo antes de reemplazar el Compose anterior. Pausa temporalmente la captura para que no haya escrituras durante la copia e importación.

```bash
cd /opt/calidad/hidrosocial
docker stop calidad-web
umask 077
CALIDAD_BACKUP_DIR="$HOME/calidad-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CALIDAD_BACKUP_DIR"
cp docker-compose.yml "$CALIDAD_BACKUP_DIR/docker-compose.antes.yml"
if [ -f .env ]; then cp .env "$CALIDAD_BACKUP_DIR/env.antes"; fi
docker tag "$(docker inspect --format '{{.Image}}' calidad-web)" calidad-web:pre-postgres
if [ -d "/opt/calidad/9 · Evidencia de campo" ]; then
  tar -C /opt/calidad -czf "$CALIDAD_BACKUP_DIR/evidencia-antes.tar.gz" "9 · Evidencia de campo"
fi
```

Conserva la ruta de `CALIDAD_BACKUP_DIR` y registra la versión del código anterior. Protege los respaldos, que pueden contener datos de campo.

La carpeta `9 · Evidencia de campo/` está ignorada por Git. Importa desde **el vault del servidor**, donde están las capturas reales; una copia nueva del repositorio puede no contenerlas. Los borradores antiguos guardados solo en el navegador no están en esa carpeta y esta importación no puede recuperarlos: consérvalos y revisa cada navegador antes de borrar datos locales.

## 2. Preparar configuración e imagen

Actualiza el código del servidor a esta versión. Conserva la web detenida durante la importación. Crea `.env` a partir de `.env.example` si aún no existe; si existe, agrega las variables nuevas sin borrar las anteriores.

Configura `POSTGRES_DB=calidad`, `POSTGRES_USER=calidad` y una contraseña aleatoria no vacía en `POSTGRES_PASSWORD`. Puedes generarla con `openssl rand -hex 32`; guárdala en `.env`. No la incluyas en comandos compartidos, capturas o Git.

```bash
chmod 600 .env
docker compose config --quiet
docker compose build
docker compose up -d db
docker compose run --rm migrate
```

`config --quiet` valida sin imprimir las credenciales. Si la migración falla, revisa el error y mantén la web detenida.

## 3. Revisar e importar los archivos existentes

```bash
docker compose run --rm --no-deps migrate bun run db:import --dry-run
```

Revisa el resultado antes de continuar. El modo de revisión no escribe registros. La importación conserva los archivos originales, mantiene sus identificadores y rechaza conflictos en vez de sobreescribir un registro distinto. Repetirla con los mismos registros ya importados no debe duplicarlos. Si aparecen conflictos o archivos inválidos, resuélvelos antes de publicar la web.

```bash
docker compose run --rm --no-deps migrate bun run db:import
```

Si ya existen registros en PostgreSQL, haz también un `pg_dump` antes de importar. Al terminar, conserva otro respaldo de la base importada siguiendo la sección de respaldos.

## 4. Arrancar y verificar

```bash
docker compose up -d calidad
docker compose ps -a
docker compose logs --tail=100 db migrate calidad
curl --fail http://127.0.0.1:3005/calidad/healthcheck
```

Es normal que `migrate` aparezca como terminado con código 0. `db` y `calidad` deben estar saludables.

Comprueba en la interfaz una aportación antigua y sus revisiones; después guarda una aportación identificada como prueba. Verifica que aparece en otro navegador y que sigue ahí después de:

```bash
docker compose restart calidad
```

Comprueba que el guardado no creó archivos nuevos en el vault. Revisa errores de la aplicación antes de reabrir la captura al equipo. El arranque y esta comprobación de persistencia en Docker quedan pendientes hasta ejecutarlos en el servidor.

## Respaldos y restauración

El volumen sobrevive a la recreación de contenedores. **No uses `docker compose down -v` ni borres el volumen**: eso elimina la base. Conserva respaldos fuera del volumen y prueba periódicamente su restauración.

Respaldo en formato personalizado, desde el servidor Linux:

```bash
cd /opt/calidad/hidrosocial
umask 077
mkdir -p "$HOME/calidad-backups"
CALIDAD_DUMP="$HOME/calidad-backups/calidad-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$CALIDAD_DUMP"
test -s "$CALIDAD_DUMP"
docker compose exec -T db pg_restore --list < "$CALIDAD_DUMP"
```

Verifica que `pg_dump` terminó con código 0; un archivo existente no garantiza un respaldo correcto. Copia el archivo a otro lugar seguro.

Prueba de restauración en una base **separada y nueva**, sin tocar producción:

```bash
# Ajusta esta ruta al respaldo elegido y usa un nombre de prueba que no exista.
CALIDAD_DUMP="$HOME/calidad-backups/calidad-FECHA-HORA.dump"
docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" calidad_restore_check'
docker compose exec -T db sh -c 'pg_restore --exit-on-error -U "$POSTGRES_USER" -d calidad_restore_check' < "$CALIDAD_DUMP"
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d calidad_restore_check -c "\\dt"'
```

Comprueba los registros y sus cantidades en la base restaurada. No la conectes a la web por accidente. La restauración sobre producción requiere detener las escrituras, conservar un respaldo de su estado actual y decidir explícitamente el punto de recuperación.

## Recuperación ante un despliegue fallido

Si todavía no hubo escrituras nuevas en PostgreSQL, puedes detener `calidad` y volver a la imagen y configuración anteriores guardadas en el paso 1. Restaura la configuración anterior en su ubicación original, para conservar la ruta relativa del vault, y usa la imagen `calidad-web:pre-postgres` sin reconstruirla. Los archivos originales siguen disponibles. Conserva el volumen PostgreSQL para analizar o reintentar la migración.

Si ya hubo escrituras nuevas, la versión anterior que solo lee archivos **no las verá**. En ese caso:

1. Detén `calidad` y crea un `pg_dump` del estado actual.
2. Conserva el volumen y la imagen actual. No ejecutes una migración inversa ni restaures un respaldo antiguo sobre la base actual.
3. Corrige el despliegue o vuelve a una versión compatible con el mismo esquema de PostgreSQL.
4. Si necesitas volver al sistema de archivos, primero prepara y valida una exportación de todos los registros nuevos y sus revisiones. Esta migración no incluye una exportación inversa automática.

Volver a la imagen antigua sin ese paso deja datos fuera de la vista del equipo aunque el volumen siga conservándolos. Mantén la captura pausada hasta verificar la recuperación.

## Desarrollo sin Docker

Sin `DATABASE_URL` ni `PGHOST`, la web permite consultar el vault pero no guardar en el servidor. Los intentos de escritura deben mostrar el error de configuración. No hay retorno automático al guardado en archivos.

Si tienes un PostgreSQL externo accesible, configura `DATABASE_URL` o los campos `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`, `PGPASSWORD` en `.env`, y ejecuta:

```bash
bun install --frozen-lockfile
bun run db:migrate
bun run db:import --dry-run
bun run dev
```

El PostgreSQL de este Compose no expone 5432 al anfitrión; una ejecución de Bun fuera de Docker necesita otra conexión accesible o un túnel configurado por el administrador.

Referencias: [orden de arranque de Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/), [condiciones de dependencia](https://docs.docker.com/reference/compose-file/services/#depends_on), [imagen oficial de PostgreSQL](https://hub.docker.com/_/postgres), [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html) y [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).