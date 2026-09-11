import { describe, expect, test } from 'bun:test';
import { capaDeNodo, nivelCausalDe } from '../app/microprocesos/vault-core/clasificar';

describe('convención DX de cuatro niveles', () => {
  test('el maestro y cada árbol comparten la misma causa estructural N2', () => {
    expect(nivelCausalDe('problema', 'PC')).toBe('N1');
    for (let i = 1; i <= 10; i++) expect(nivelCausalDe('causa', `E${i}`)).toBe('N2');
    expect(nivelCausalDe('ficha', 'E10.2')).toBe('N3');
    expect(nivelCausalDe('ficha', 'E10.2.1')).toBe('N4');
  });
  test('N4 es terminal y los puntos delimitan el ID', () => {
    expect(nivelCausalDe('ficha', 'E10.2.1.1')).toBeUndefined();
    expect(nivelCausalDe('ficha', 'E1.0.2')).toBeUndefined();
    expect(nivelCausalDe('causa', 'E11')).toBeUndefined();
    // La imagen permite ampliar los rangos por acuerdo: no truncar por cuota.
    expect(nivelCausalDe('ficha', 'E1.6')).toBe('N3');
  });
  test('la copa queda fuera del conteo y C0–C4 no alteran N', () => {
    expect(nivelCausalDe('efecto', 'E1.1')).toBeUndefined();
    for (const capa of ['C0', 'C1', 'C2', 'C3', 'C4']) {
      expect(capaDeNodo('ficha', { capa }, 'E1')).toBe(capa);
      expect(nivelCausalDe('ficha', 'E1.1.1')).toBe('N4');
    }
  });
});
