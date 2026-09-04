// Puente cliente del preview de captura (shared kernel).
//
// `renderPlantilla`, `validarBorradorParcial` y `contextoPreview` son puros
// (sin `node:fs`). Se re-exportan aquí desde los ficheros puros de captura
// (NO desde su `index.ts`) para que las rutas puedan usarlos en el cliente
// sin arrastrar `escritor.ts`/`cache`/`vault-core` al bundle del navegador,
// donde los builtins `node:*` no existen. El `action` de captura sigue
// importando `guardarNota`/`validarBorrador` desde `captura/index.ts`
// (solo servidor; se elimina del bundle cliente).
export { contextoPreview, validarBorradorParcial } from '~/microprocesos/captura/parcial';
export type {
  BorradorParcial,
  OpcionContexto,
} from '~/microprocesos/captura/parcial';
export { renderPlantilla } from '~/microprocesos/captura/plantilla';
export type { ContextoPlantilla } from '~/microprocesos/captura/plantilla';
export type { Borrador } from '~/microprocesos/captura/esquema';
