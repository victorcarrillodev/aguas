import { fileURLToPath } from 'node:url';
import { cerrarConexion, getBaseDatos } from '../app/microprocesos/persistencia/index.server';
import { migrar } from '../app/microprocesos/persistencia/migraciones';
try {
  const aplicadas = await migrar(
    getBaseDatos(),
    fileURLToPath(new URL('../db/migrations/', import.meta.url)),
  );
  console.log(
    aplicadas.length ? `Migraciones aplicadas: ${aplicadas.join(', ')}` : 'Esquema actualizado.',
  );
} catch (e) {
  console.error(
    e instanceof Error && e.message.startsWith('La migración')
      ? e.message
      : 'No se pudo migrar PostgreSQL. Comprueba conexión y configuración.',
  );
  process.exitCode = 1;
} finally {
  await cerrarConexion();
}
