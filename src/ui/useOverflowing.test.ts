import { describe, expect, it } from 'vitest';
import { isOverflowing } from './useOverflowing';

describe('isOverflowing', () => {
  it('es true cuando el contenido es más ancho que la caja', () => {
    expect(isOverflowing(640, 320)).toBe(true);
  });

  it('tolera 1 px de diferencia por redondeos', () => {
    expect(isOverflowing(321, 320)).toBe(false);
    expect(isOverflowing(322, 320)).toBe(true);
  });

  it('es false cuando cabe', () => {
    expect(isOverflowing(300, 320)).toBe(false);
  });
});
