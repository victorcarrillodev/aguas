import type { VaultGraph } from '../vault-core/tipos';
import { getVaultPath, getVaultGraph as grafo, invalidar } from './memoria';

export { getVaultPath, invalidar };
export { exportarExpediente } from './expediente';

/** Grafo del vault con caché TTL; reparsea solo si cambiaron mtimes. */
export function getVaultGraph(): Promise<VaultGraph> {
  return grafo();
}
