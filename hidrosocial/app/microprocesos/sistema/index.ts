// Contrato público del microproceso `sistema`.
// Agregaciones puras sobre VaultGraph: la red de las diez causas
// estructurales, su jerarquía de dependencias y la simulación de
// correcciones. No toca fs, no conoce React.

export { construirRed, desdeArboles, ordenArbol } from './red';
export { simular, ordenRecomendado } from './simulacion';
export { incidenciaActores, actoresSinIncidencia } from './actores';
export type {
  ArbolSistema,
  IncidenciaActor,
  RedSistema,
  RelacionSistema,
  ResultadoSimulacion,
  TipoRelacion,
} from './tipos';
