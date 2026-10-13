import { describe, expect, it } from 'vitest';
import { asideReadingOrder } from './readingOrder';

describe('asideReadingOrder', () => {
  it('escritorio, Explorar: aviso de error, controles, resultados, estado, Más opciones (como se ve)', () => {
    expect(asideReadingOrder({ narrow: false, experiments: false })).toEqual(['alert', 'params', 'results', 'status', 'more']);
  });

  it('escritorio, Experimentos: los resultados y el aviso del modelo van antes de los controles', () => {
    expect(asideReadingOrder({ narrow: false, experiments: true })).toEqual(['alert', 'results', 'status', 'params', 'more']);
  });

  it('celular (los dos modos): error, resultados, controles, estado, Más opciones', () => {
    expect(asideReadingOrder({ narrow: true, experiments: false })).toEqual(['alert', 'results', 'params', 'status', 'more']);
    expect(asideReadingOrder({ narrow: true, experiments: true })).toEqual(['alert', 'results', 'params', 'status', 'more']);
  });

  it('siempre trae las cinco partes, una vez cada una', () => {
    for (const narrow of [false, true]) {
      for (const experiments of [false, true]) {
        expect([...asideReadingOrder({ narrow, experiments })].sort()).toEqual(['alert', 'more', 'params', 'results', 'status']);
      }
    }
  });
});
