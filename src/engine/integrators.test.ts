import { describe, expect, it } from 'vitest';
import { rk4Step } from './integrators';
import type { State } from './types';

const decay = (s: State): State => ({ y: -s.y });

function integrateDecay(dt: number): number {
  let state: State = { y: 1 };
  const steps = Math.round(1 / dt);
  for (let i = 0; i < steps; i++) state = rk4Step(decay, state, dt);
  return Math.abs(state.y - Math.exp(-1));
}

describe('rk4Step', () => {
  it("integra y' = -y con error menor que 1e-6 usando dt = 0,1", () => {
    expect(integrateDecay(0.1)).toBeLessThan(1e-6);
  });

  it('es de cuarto orden: reducir dt a la mitad reduce el error unas 16 veces', () => {
    const ratio = integrateDecay(0.1) / integrateDecay(0.05);
    expect(ratio).toBeGreaterThan(12);
    expect(ratio).toBeLessThan(20);
  });

  it('no modifica el estado de entrada', () => {
    const state: State = { y: 1 };
    rk4Step(decay, state, 0.1);
    expect(state).toEqual({ y: 1 });
  });
});
