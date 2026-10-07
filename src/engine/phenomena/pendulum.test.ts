import { describe, expect, it } from 'vitest';
import { pendulumPeriodFactor } from '../elliptic';
import { DEG_TO_RAD } from '../numbers';
import { Simulation } from '../simulation';
import type { Params } from '../types';
import { defaultParams } from '../validate';
import { pendulumModels } from './pendulum';
import { simplePendulum } from './simplePendulum';

const lineal = pendulumModels.lineal;
const noLineal = pendulumModels['no-lineal'];

function simulate(model: typeof lineal, params: Params, seconds: number): Simulation {
  const sim = new Simulation(model, params, { maxSamples: 200_000 });
  while (sim.t < seconds) sim.advance(1 / 60);
  return sim;
}

/** Período medido con cruces por cero consecutivos de θ (descendentes), promediado. */
function measuredPeriod(sim: Simulation): number {
  const crossings: number[] = [];
  for (let i = 1; i < sim.samples.length; i++) {
    const a = sim.samples[i - 1];
    const b = sim.samples[i];
    if (a.values.theta > 0 && b.values.theta <= 0) {
      crossings.push(a.t + ((b.t - a.t) * a.values.theta) / (a.values.theta - b.values.theta));
    }
  }
  return (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
}

describe('pendulumModels: esquema de parámetros', () => {
  it('ambos modelos tienen L, φ₀, g, m y b', () => {
    for (const model of [lineal, noLineal]) {
      expect(model.paramSchema.map((s) => s.key)).toEqual(['L', 'phi0', 'g', 'm', 'b']);
    }
  });

  it('el ángulo máximo es 15° en el modo lineal y 60° en el no lineal', () => {
    const max = (m: typeof lineal) => m.paramSchema.find((s) => s.key === 'phi0')!.max;
    expect(max(lineal)).toBe(15);
    expect(max(noLineal)).toBe(60);
  });

  it('la fricción b va de 0 a 0,4 con paso 0,01 y vale 0 por defecto', () => {
    const b = noLineal.paramSchema.find((s) => s.key === 'b')!;
    expect([b.min, b.max, b.step, b.defaultValue]).toEqual([0, 0.4, 0.01, 0]);
    expect(defaultParams(lineal.paramSchema)).toEqual({ L: 1, phi0: 10, g: 9.8, m: 0.5, b: 0 });
  });

  it('los id son distintos, el objeto es estable y simplePendulum es el modo no lineal', () => {
    expect(lineal.id).toBe('mas-pendulo-lineal');
    expect(noLineal.id).toBe('mas-pendulo-no-lineal');
    expect(pendulumModels['no-lineal']).toBe(noLineal);
    expect(simplePendulum).toBe(noLineal);
  });
});

describe('pendulumModels: ecuaciones', () => {
  const params = defaultParams(noLineal.paramSchema);

  it('lineal: θ̈ = −(g/L)·θ − b·ω', () => {
    const d = lineal.derivatives({ theta: 1, omega: 0.3 }, { ...params, b: 0.2 });
    expect(d.theta).toBeCloseTo(0.3, 12);
    expect(d.omega).toBeCloseTo(-9.8 * 1 - 0.2 * 0.3, 12);
  });

  it('no lineal: θ̈ = −(g/L)·sen θ − b·ω', () => {
    const d = noLineal.derivatives({ theta: 1, omega: 0.3 }, { ...params, b: 0.2 });
    expect(d.omega).toBeCloseTo(-9.8 * Math.sin(1) - 0.2 * 0.3, 12);
  });
});

describe('independencia de la masa (HU-12)', () => {
  it.each([
    ['lineal', lineal],
    ['no lineal', noLineal],
  ])('en modo %s, θ(t), T y f no cambian con la masa y la energía sí', (_name, model) => {
    const base = { ...defaultParams(model.paramSchema), phi0: 12, b: 0.1 };
    const light = simulate(model, { ...base, m: 0.05 }, 10);
    const heavy = simulate(model, { ...base, m: 5 }, 10);
    expect(heavy.samples.length).toBe(light.samples.length);
    for (let i = 0; i < light.samples.length; i++) {
      const a = light.samples[i].values;
      const b = heavy.samples[i].values;
      expect(b.theta).toBeCloseTo(a.theta, 12);
      expect(b.omega).toBeCloseTo(a.omega, 12);
      expect(b.T).toBe(a.T);
      expect(b.f).toBe(a.f);
      if (a.energy > 1e-12) expect(b.energy / a.energy).toBeCloseTo(5 / 0.05, 6);
    }
  });
});

describe('fricción', () => {
  it('con b > 0 la energía mecánica decrece sin subir nunca', () => {
    const p = { ...defaultParams(noLineal.paramSchema), phi0: 40, b: 0.3 };
    const sim = simulate(noLineal, p, 10);
    for (let i = 1; i < sim.samples.length; i++) {
      expect(sim.samples[i].values.energy).toBeLessThanOrEqual(sim.samples[i - 1].values.energy + 1e-12);
    }
    expect(sim.samples[sim.samples.length - 1].values.energy).toBeLessThan(0.2 * sim.samples[0].values.energy);
  });

  it('la masa mantiene su esquema (0,05 a 5 kg, paso 0,05, 0,5 por defecto)', () => {
    const m = noLineal.paramSchema.find((s) => s.key === 'm')!;
    expect([m.min, m.max, m.step, m.defaultValue]).toEqual([0.05, 5, 0.05, 0.5]);
  });
});

describe('modo lineal: la azul y la punteada coinciden', () => {
  it.each([
    { L: 1, g: 9.8, tolerance: 1e-6 },
    { L: 0.1, g: 9.8, tolerance: 1e-5 },
  ])('con L = $L, b = 0 y b = 0,3 (error absoluto / φ₀ ≤ $tolerance en 10 s)', ({ L, g, tolerance }) => {
    for (const b of [0, 0.3]) {
      const p = { ...defaultParams(lineal.paramSchema), L, g, phi0: 15, b };
      const sim = simulate(lineal, p, 10);
      const amplitude = 15 * DEG_TO_RAD;
      const worst = Math.max(...sim.samples.map((s) => Math.abs(s.values.theta - s.theory.theta) / amplitude));
      expect(worst).toBeLessThan(tolerance);
    }
  });
});

describe('modo no lineal sin fricción', () => {
  it('el período medido a φ₀ = 40° coincide con T de las salidas (error relativo < 1e-3)', () => {
    const p = { ...defaultParams(noLineal.paramSchema), phi0: 40, b: 0 };
    const sim = simulate(noLineal, p, 25);
    expect(Math.abs(measuredPeriod(sim) / sim.samples[0].values.T - 1)).toBeLessThan(1e-3);
  });

  it('con φ₀ = 40° la curva punteada se separa de la simulada', () => {
    const p = { ...defaultParams(noLineal.paramSchema), phi0: 40, b: 0 };
    const sim = simulate(noLineal, p, 10);
    const amplitude = 40 * DEG_TO_RAD;
    const worst = Math.max(...sim.samples.map((s) => Math.abs(s.values.theta - s.theory.theta) / amplitude));
    expect(worst).toBeGreaterThan(0.3);
  });
});

describe('salidas', () => {
  const at = (model: typeof lineal, patch: Params) => {
    const p = { ...defaultParams(model.paramSchema), ...patch };
    return model.outputs(model.initialState(p), p);
  };

  it('periodError usa el factor real también en modo lineal (no vale 0)', () => {
    const expected = (pendulumPeriodFactor(15 * DEG_TO_RAD) - 1) * 100;
    expect(at(lineal, { phi0: 15 }).periodError).toBeCloseTo(expected, 10);
    expect(at(noLineal, { phi0: 15 }).periodError).toBeCloseTo(expected, 10);
    expect(at(lineal, { phi0: 15 }).periodError).toBeGreaterThan(0);
  });

  it('T = T₀ en modo lineal y T = T₀·factor en el no lineal', () => {
    const l = at(lineal, { phi0: 15 });
    expect(l.T).toBe(l.T0);
    const n = at(noLineal, { phi0: 40 });
    expect(n.T).toBeCloseTo(n.T0 * pendulumPeriodFactor(40 * DEG_TO_RAD), 12);
  });

  it('tau = 2/b solo existe con b > 0 (con b = 0 no hay Infinity que detenga la simulación)', () => {
    expect(at(noLineal, { b: 0 })).not.toHaveProperty('tau');
    expect(at(noLineal, { b: 0.25 }).tau).toBeCloseTo(8, 12);
    const sim = simulate(noLineal, defaultParams(noLineal.paramSchema), 1);
    expect(sim.error).toBeNull();
  });

  it('energía: no lineal mgL(1 − cos θ) + cinética; lineal ½mgLθ² + cinética', () => {
    const theta = 0.2;
    const omega = 1.5;
    const p = defaultParams(noLineal.paramSchema);
    const kinetic = 0.5 * p.m * p.L * p.L * omega * omega;
    expect(noLineal.outputs({ theta, omega }, p).energy).toBeCloseTo(kinetic + p.m * p.g * p.L * (1 - Math.cos(theta)), 12);
    expect(lineal.outputs({ theta, omega }, p).energy).toBeCloseTo(kinetic + 0.5 * p.m * p.g * p.L * theta * theta, 12);
  });
});

describe('aviso de límites del modelo', () => {
  const p = defaultParams(noLineal.paramSchema);

  it.each([
    ['lineal', lineal],
    ['no lineal', noLineal],
  ])('en modo %s es válido hasta 10° y avisa por encima', (_n, model) => {
    const limit = model.modelLimits[0];
    expect(limit.evaluate({ ...p, phi0: 10 }).valid).toBe(true);
    const result = limit.evaluate({ ...p, phi0: 15 });
    expect(result.valid).toBe(false);
    const expected = ((pendulumPeriodFactor(15 * DEG_TO_RAD) - 1) * 100).toFixed(1).replace('.', ',');
    expect(result.message).toContain(`${expected} %`);
    expect(result.message).toContain('15°');
  });
});

describe('modo lineal: peor caso del esquema contra la integración RK4', () => {
  it('con g = 1, L = 5 y b = 0,4 (ω_d mínima) la punteada sigue a la azul (error absoluto / φ₀ < 1e-6)', () => {
    const p = { ...defaultParams(lineal.paramSchema), g: 1, L: 5, phi0: 15, b: 0.4 };
    const sim = simulate(lineal, p, 30);
    const amplitude = 15 * DEG_TO_RAD;
    const worst = Math.max(...sim.samples.map((s) => Math.abs(s.values.theta - s.theory.theta) / amplitude));
    expect(worst).toBeLessThan(1e-6);
    // Y de verdad decae: la amplitud final es una fracción pequeña de la inicial.
    const last = sim.samples[sim.samples.length - 1].values.theta;
    expect(Math.abs(last)).toBeLessThan(0.01 * amplitude);
  });
});
