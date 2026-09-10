import type { VaultGraph } from '../vault-core/tipos';
import { leerNota } from './lector';
import { getVaultPath, getVaultGraph as grafo, invalidar } from './memoria';

export { getVaultPath, invalidar };
export { exportarExpediente } from './expediente';
export { leerNota };

/** Grafo del diagnóstico y sus registros operativos, con caché breve. */
export function getVaultGraph(): Promise<VaultGraph> {
  return grafo();
}
