import { resolve } from 'node:path';
import { leerEvidenciaLegacy } from '../app/microprocesos/persistencia/importar';
import { cerrarConexion, getRepositorio } from '../app/microprocesos/persistencia/index.server';
const argumentos = process.argv.slice(2);
try {
  if (argumentos.some((a) => a !== '--dry-run'))
    throw new Error('Uso: bun run db:import [--dry-run]');
  const documentos = await leerEvidenciaLegacy(resolve(process.env.VAULT_PATH ?? '..'));
  const resultado = await getRepositorio().importar(documentos, argumentos.includes('--dry-run'));
  console.log(
    JSON.stringify({
      simulacion: argumentos.includes('--dry-run'),
      leidos: documentos.length,
      ...resultado,
    }),
  );
} catch (e) {
  const mensaje = e instanceof Error ? e.message : '';
  console.error(
    /^(Conflicto de importación|Uso:|La ruta|La importación)/.test(mensaje)
      ? mensaje
      : 'No se pudo importar. Comprueba VAULT_PATH, la conexión y que db:migrate terminó. No se modificaron los originales.',
  );
  process.exitCode = 1;
} finally {
  await cerrarConexion();
}
