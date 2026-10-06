import { describe, expect, it } from 'vitest';
import { DEG_TO_RAD } from '../numbers';
import { pendulumPeriodFactor } from '../elliptic';
import { defaultParams } from '../validate';
import { simplePendulum } from './simplePendulum';

const params = defaultParams(simplePendulum.paramSchema);
const omega0 = Math.sqrt(params.g / params.L);

describe('simplePendulum', () => {
  it('los valores por defecto son L = 1 m, φ₀ = 10°, g = 9,8 m/s² y m = 0,5 kg', () => {
    expect(params).toEqual({ L: 1, phi0: 10, g: 9.8, m: 0.5, b: 0 });
  });

  it('el estado inicial parte del ángulo inicial en reposo', () => {
    const state = simplePendulum.initialState(params);
    expect(state.theta).toBeCloseTo(10 * DEG_TO_RAD, 12);
    expect(state.omega).toBe(0);
  });

  it('se llama "Péndulo simple"', () => {
    expect(simplePendulum.name).toBe('Péndulo simple');
  });

  it('la aceleración angular es -(g/L)·sen θ (no la lineal)', () => {
    const d = simplePendulum.derivatives({ theta: 1, omega: 0.3 }, params);
    expect(d.theta).toBeCloseTo(0.3, 12);
    expect(d.omega).toBeCloseTo(-(9.8 / 1) * Math.sin(1), 12);
    expect(Math.abs(d.omega - -(9.8 / 1) * 1)).toBeGreaterThan(1);
  });

  it('T₀ = 2π√(L/g) y no depende de la masa', () => {
    const state = simplePendulum.initialState(params);
    const T0 = simplePendulum.outputs(state, params).T0;
    expect(T0).toBeCloseTo(2 * Math.PI * Math.sqrt(1 / 9.8), 10);
    expect(simplePendulum.outputs(state, { ...params, m: 5 }).T0).toBeCloseTo(T0, 12);
  });

  it('T = T₀·factor(φ₀) y no depende de la masa', () => {
    for (const phi0 of [1, 10, 30, 60]) {
      const p = { ...params, phi0 };
      const out = simplePendulum.outputs(simplePendulum.initialState(p), p);
      expect(out.T).toBeCloseTo(out.T0 * pendulumPeriodFactor(phi0 * DEG_TO_RAD), 12);
      expect(simplePendulum.outputs(simplePendulum.initialState(p), { ...p, m: 5 }).T).toBeCloseTo(out.T, 12);
    }
  });

  it('T y T₀ no dependen del estado, solo de los parámetros', () => {
    const a = simplePendulum.outputs({ theta: 0.1, omega: 0 }, params);
    const b = simplePendulum.outputs({ theta: -0.05, omega: 2 }, params);
    expect(b.T).toBe(a.T);
    expect(b.T0).toBe(a.T0);
  });

  it('la frecuencia es 1/T (real) y ω₀ = √(g/L)', () => {
    const out = simplePendulum.outputs(simplePendulum.initialState(params), params);
    expect(out.f).toBeCloseTo(1 / out.T, 12);
    expect(out.omega0).toBeCloseTo(omega0, 12);
    expect(out.T0).toBeCloseTo((2 * Math.PI) / out.omega0, 12);
  });

  it('la energía inicial es m·g·L·(1 − cos θ₀)', () => {
    const out = simplePendulum.outputs(simplePendulum.initialState(params), params);
    const theta0 = 10 * DEG_TO_RAD;
    expect(out.energy).toBeCloseTo(0.5 * 9.8 * 1 * (1 - Math.cos(theta0)), 12);
  });

  it('la energía incluye la parte cinética ½·m·L²·ω²', () => {
    const out = simplePendulum.outputs({ theta: 0, omega: 2 }, params);
    expect(out.energy).toBeCloseTo(0.5 * 0.5 * 1 * 4, 12);
  });

  it('la solución teórica parte de φ₀ y pasa por el equilibrio en T/4', () => {
    const quarter = (2 * Math.PI) / omega0 / 4;
    expect(simplePendulum.theory(params, 0).theta).toBeCloseTo(10 * DEG_TO_RAD, 12);
    const atQuarter = simplePendulum.theory(params, quarter);
    expect(atQuarter.theta).toBeCloseTo(0, 10);
    expect(atQuarter.omega).toBeCloseTo(-10 * DEG_TO_RAD * omega0, 10);
  });

  it('avisa que la aproximación de ángulo pequeño no vale con φ₀ > 10°', () => {
    const limit = simplePendulum.modelLimits[0];
    expect(limit.evaluate({ ...params, phi0: 10 }).valid).toBe(true);
    const result = limit.evaluate({ ...params, phi0: 30 });
    expect(result.valid).toBe(false);
    expect(result.message).toContain('1,7 %');
    expect(result.message).toContain('T₀');
    expect(result.message).toContain('30°');
  });

  it('el aviso calcula el aumento real del período con el factor elíptico', () => {
    const limit = simplePendulum.modelLimits[0];
    const expected = ((pendulumPeriodFactor(60 * DEG_TO_RAD) - 1) * 100).toFixed(1).replace('.', ',');
    expect(limit.evaluate({ ...params, phi0: 60 }).message).toContain(`${expected} %`);
  });
});
