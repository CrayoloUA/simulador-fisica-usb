import { describe, expect, it } from 'vitest';
import { pendulumModels } from '../engine/phenomena/pendulum';
import { EXPERIMENT_START_SPEED, paramsForExperimentStart } from './experimentEntry';

const schema = pendulumModels['no-lineal'].paramSchema;

describe('paramsForExperimentStart', () => {
  it('quita el rozamiento y la masa heredados de Explorar, que en Experimentos no se ven', () => {
    const next = paramsForExperimentStart({ L: 2, phi0: 30, g: 3.7, m: 4, b: 0.3 }, schema);
    expect(next.b).toBe(0);
    expect(next.m).toBe(0.5);
  });

  it('deja como están los valores visibles (L, φ₀, g)', () => {
    const next = paramsForExperimentStart({ L: 2, phi0: 30, g: 3.7, m: 4, b: 0.3 }, schema);
    expect(next).toMatchObject({ L: 2, phi0: 30, g: 3.7 });
  });

  it('no modifica el objeto que recibe', () => {
    const inherited = { L: 1, phi0: 10, g: 9.8, m: 1, b: 0.2 };
    paramsForExperimentStart(inherited, schema);
    expect(inherited.b).toBe(0.2);
  });

  it('la velocidad de partida es la normal', () => {
    expect(EXPERIMENT_START_SPEED).toBe(1);
  });
});
