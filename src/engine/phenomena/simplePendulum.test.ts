import { describe, expect, it } from 'vitest';
import { DEG_TO_RAD } from '../numbers';
import { defaultParams } from '../validate';
import { simplePendulum } from './simplePendulum';

const params = defaultParams(simplePendulum.paramSchema);
const omega0 = Math.sqrt(params.g / params.L);

describe('simplePendulum', () => {
  it('los valores por defecto son L = 1 m, φ₀ = 10°, g = 9,8 m/s² y m = 0,5 kg', () => {
    expect(params).toEqual({ L: 1, phi0: 10, g: 9.8, m: 0.5 });
  });

  it('el estado inicial parte del ángulo inicial en reposo', () => {
    const state = simplePendulum.initialState(params);
    expect(state.theta).toBeCloseTo(10 * DEG_TO_RAD, 12);
    expect(state.omega).toBe(0);
  });

  it('la aceleración angular es -(g/L)·θ', () => {
    const d = simplePendulum.derivatives({ theta: 0.1, omega: 0.3 }, params);
    expect(d.theta).toBeCloseTo(0.3, 12);
    expect(d.omega).toBeCloseTo(-(9.8 / 1) * 0.1, 12);
  });

  it('el período es 2π√(L/g) y no depende de la masa', () => {
    const state = simplePendulum.initialState(params);
    const T = simplePendulum.outputs(state, params).T;
    expect(T).toBeCloseTo(2 * Math.PI * Math.sqrt(1 / 9.8), 10);
    expect(simplePendulum.outputs(state, { ...params, m: 5 }).T).toBeCloseTo(T, 12);
  });

  it('la frecuencia es 1/T y ω₀ = √(g/L)', () => {
    const out = simplePendulum.outputs(simplePendulum.initialState(params), params);
    expect(out.f).toBeCloseTo(1 / out.T, 12);
    expect(out.omega0).toBeCloseTo(omega0, 12);
  });

  it('la energía inicial es ½·m·g·L·θ₀²', () => {
    const out = simplePendulum.outputs(simplePendulum.initialState(params), params);
    const theta0 = 10 * DEG_TO_RAD;
    expect(out.energy).toBeCloseTo(0.5 * 0.5 * 9.8 * 1 * theta0 * theta0, 12);
  });

  it('la solución teórica parte de φ₀ y pasa por el equilibrio en T/4', () => {
    const quarter = (2 * Math.PI) / omega0 / 4;
    expect(simplePendulum.theory(params, 0).theta).toBeCloseTo(10 * DEG_TO_RAD, 12);
    const atQuarter = simplePendulum.theory(params, quarter);
    expect(atQuarter.theta).toBeCloseTo(0, 10);
    expect(atQuarter.omega).toBeCloseTo(-10 * DEG_TO_RAD * omega0, 10);
  });

  it('avisa que la aproximación de ángulo pequeño no vale con φ₀ > 15°', () => {
    const limit = simplePendulum.modelLimits[0];
    expect(limit.evaluate({ ...params, phi0: 15 }).valid).toBe(true);
    const result = limit.evaluate({ ...params, phi0: 30 });
    expect(result.valid).toBe(false);
    expect(result.message).toContain('1,7 %');
  });
});
