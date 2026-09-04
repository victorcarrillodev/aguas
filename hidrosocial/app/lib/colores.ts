import type { CapaId, VaultNodeType } from '~/microprocesos/vault-core/tipos';

/** Color de capa C0-C4 (Las cinco capas). */
export function colorDeCapa(capa: CapaId): string {
  switch (capa) {
    case 'C0':
      return '#E8A0BF';
    case 'C1':
      return '#7FB77E';
    case 'C2':
      return '#7EA6E0';
    case 'C3':
      return '#A986C9';
    case 'C4':
      return '#C8B6E2';
  }
}

/** Color por tipo de nodo (cuando no hay capa asignada). */
export function colorDeTipo(tipo: VaultNodeType): string {
  switch (tipo) {
    case 'causa':
      return '#7FB77E';
    case 'ficha':
      return '#A986C9';
    case 'actor':
      return '#7EA6E0';
    case 'efecto':
      return '#C9C9C9';
    case 'medicion':
      return '#D4A373';
    case 'problema':
      return '#111827';
    case 'evidencia':
      return '#0EA5E9';
    case 'metodo':
    case 'indice':
      return '#9CA3AF';
  }
}

/** Color final de un nodo: capa si la tiene, si no el de su tipo. */
export function colorDeNodo(tipo: VaultNodeType, capa?: CapaId): string {
  return capa ? colorDeCapa(capa) : colorDeTipo(tipo);
}
