import { describe, expect, it } from 'vitest';
import { simplePendulum } from './phenomena/simplePendulum';
import { Simulation } from './simulation';
import type { Phenomenon } from './types';
import { defaultParams } from './validate';

const params = defaultParams(simplePendulum.paramSchema);
const period = 2 * Math.PI * Math.sqrt(params.L / params.g);

function runFor(sim: Simulation, seconds: number): void {
  while (sim.t < seconds) sim.advance(0.016);
}

describe('Simulation: precisión física', () => {
  it('reproduce θ(t) teórico con error relativo < 1e-6 en 10 períodos', () => {
    const sim = new Simulation(simplePendulum, params, { maxSamples: 100_000 });
    runFor(sim, 10 * period);
    const amplitude = sim.samples[0].values.theta;
    const maxError = Math.max(...sim.samples.map((s) => Math.abs(s.values.theta - s.theory.theta) / amplitude));
    expect(maxError).toBeLessThan(1e-6);
  });

  it('conserva la energía con deriva relativa < 1e-7 en 10 períodos', () => {
    const sim = new Simulation(simplePendulum, params, { maxSamples: 100_000 });
    runFor(sim, 10 * period);
    const e0 = sim.samples[0].values.energy;
    const maxDrift = Math.max(...sim.samples.map((s) => Math.abs(s.values.energy - e0) / e0));
    expect(maxDrift).toBeLessThan(1e-7);
  });
});

describe('Simulation: control del tiempo', () => {
  it('reset vuelve al estado inicial con una sola muestra', () => {
    const sim = new Simulation(simplePendulum, params);
    sim.advance(0.1);
    sim.reset();
    expect(sim.t).toBe(0);
    expect(sim.state).toEqual(simplePendulum.initialState(params));
    expect(sim.samples).toHaveLength(1);
  });

  it('con escala de tiempo 2 avanza el doble de tiempo simulado', () => {
    const slow = new Simulation(simplePendulum, params);
    const fast = new Simulation(simplePendulum, params);
    fast.timeScale = 2;
    slow.advance(0.1);
    fast.advance(0.1);
    expect(Math.abs(fast.t - 2 * slow.t)).toBeLessThanOrEqual(0.011);
  });

  it('limita el tiempo por cuadro para evitar saltos tras una pausa larga', () => {
    const sim = new Simulation(simplePendulum, params);
    sim.advance(5);
    expect(sim.t).toBeLessThanOrEqual(0.1 + 1e-9);
  });

  it('mantiene el buffer de muestras acotado', () => {
    const sim = new Simulation(simplePendulum, params, { maxSamples: 10 });
    for (let i = 0; i < 50; i++) sim.advance(0.1);
    expect(sim.samples.length).toBeLessThanOrEqual(10);
  });
});

describe('Simulation: guarda numérica', () => {
  const broken: Phenomenon = {
    id: 'roto',
    name: 'Roto',
    paramSchema: [],
    modelLimits: [],
    initialState: () => ({ x: 1 }),
    derivatives: () => ({ x: Number.NaN }),
    outputs: (s) => ({ x: s.x }),
    theory: () => ({ x: 1 }),
  };

  it('se detiene con un mensaje si el cálculo produce un valor no finito', () => {
    const sim = new Simulation(broken, {});
    sim.advance(0.05);
    expect(sim.error).toContain('valor no válido');
    expect(sim.state).toEqual({ x: 1 });
    expect(sim.t).toBe(0);
  });

  it('no avanza mientras haya un error y reset lo limpia', () => {
    const sim = new Simulation(broken, {});
    sim.advance(0.05);
    sim.advance(0.05);
    expect(sim.t).toBe(0);
    sim.reset();
    expect(sim.error).toBeNull();
  });
});
