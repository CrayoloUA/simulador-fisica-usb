import { describe, expect, it } from 'vitest';
import { pendulumPeriodFactor } from './elliptic';
import { DEG_TO_RAD } from './numbers';
import { simplePendulum } from './phenomena/simplePendulum';
import { Simulation } from './simulation';
import type { Params, Phenomenon } from './types';
import { defaultParams } from './validate';

const params = defaultParams(simplePendulum.paramSchema);

function runFor(sim: Simulation, seconds: number): void {
  while (sim.t < seconds) sim.advance(0.016);
}

function exactPeriod(p: Params): number {
  return 2 * Math.PI * Math.sqrt(p.L / p.g) * pendulumPeriodFactor(p.phi0 * DEG_TO_RAD);
}

/** Período medido: tiempo entre cruces por cero de θ (interpolación lineal), promediado en varios períodos. */
function measuredPeriod(sim: Simulation): number {
  const crossings: number[] = [];
  for (let i = 1; i < sim.samples.length; i++) {
    const a = sim.samples[i - 1];
    const b = sim.samples[i];
    if (a.values.theta * b.values.theta < 0) {
      const frac = a.values.theta / (a.values.theta - b.values.theta);
      crossings.push(a.t + frac * (b.t - a.t));
    }
  }
  // Cruces alternados: cada dos cruces transcurre un período.
  const k = crossings.length - 1;
  return (2 * (crossings[k] - crossings[0])) / k;
}

function simulate(p: Params, periods: number): Simulation {
  const sim = new Simulation(simplePendulum, p, { maxSamples: 200_000 });
  runFor(sim, periods * exactPeriod(p));
  return sim;
}

function maxEnergyDrift(sim: Simulation): number {
  const e0 = sim.samples[0].values.energy;
  return Math.max(...sim.samples.map((s) => Math.abs(s.values.energy - e0) / e0));
}

describe('Simulation: precisión física (ecuación real con sen θ)', () => {
  it.each([10, 30, 60])('el período medido coincide con el elíptico (error relativo < 1e-6) a φ₀ = %i°', (phi0) => {
    const p: Params = { ...params, phi0 };
    const T = measuredPeriod(simulate(p, 10));
    const relative = Math.abs(T - exactPeriod(p)) / exactPeriod(p);
    // Medido: ~1e-8. Se exige 1e-6 (100 veces más estricto que 1e-4) para detectar cualquier error real de modelo.
    expect(relative).toBeLessThan(1e-6);
  });

  it('a 60° el período real supera claramente a T₀ (la aproximación lineal ya no sirve)', () => {
    const p: Params = { ...params, phi0: 60 };
    const T0 = 2 * Math.PI * Math.sqrt(p.L / p.g);
    expect(measuredPeriod(simulate(p, 10)) / T0).toBeGreaterThan(1.07);
  });

  it('a φ₀ = 1° la simulación y la teoría lineal coinciden (error relativo < 2e-3) en 10 períodos', () => {
    const sim = simulate({ ...params, phi0: 1 }, 10);
    const amplitude = sim.samples[0].values.theta;
    const maxError = Math.max(...sim.samples.map((s) => Math.abs(s.values.theta - s.theory.theta) / amplitude));
    // Aun a 1° el período real es T₀·(1 + θ₀²/16), así que las curvas se desfasan poco a poco:
    // 2π·10·θ₀²/16 ≈ 1,2e-3 rad tras 10 períodos (medido: 1,17e-3). El umbral 2e-3 admite ese desfase físico
    // y sigue siendo ~100 veces menor que el error a 10° (0,117), donde ya se nota la diferencia.
    expect(maxError).toBeLessThan(2e-3);
  });

  it.each([10, 60])('conserva la energía real con deriva relativa < 1e-7 en 10 períodos a φ₀ = %i°', (phi0) => {
    expect(maxEnergyDrift(simulate({ ...params, phi0 }, 10))).toBeLessThan(1e-7);
  });

  it('parámetros extremos (L = 0,1, g = 25, φ₀ = 60°): período elíptico y energía conservada', () => {
    const p: Params = { ...params, L: 0.1, g: 25, phi0: 60 };
    const sim = simulate(p, 10);
    expect(Math.abs(measuredPeriod(sim) - exactPeriod(p)) / exactPeriod(p)).toBeLessThan(1e-6);
    // Con L = 0,1 y g = 25 la frecuencia es alta (ω₀ ≈ 15,8 rad/s) y dt = 5 ms da menos pasos por período:
    // la deriva de RK4 medida es 2,1e-6, no 1e-7. Umbral 1e-5 (≈5 veces la medida).
    expect(maxEnergyDrift(sim)).toBeLessThan(1e-5);
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

describe('Simulation: entradas hostiles al avance (ataque de la Fase 9)', () => {
  it('una escala de tiempo enorme no ejecuta millones de pasos: el avance por cuadro tiene tope', () => {
    const sim = new Simulation(simplePendulum, params);
    sim.timeScale = 20_000; // p. ej. un <option value> manipulado en el selector de velocidad
    const inicio = performance.now();
    sim.advance(0.1);
    expect(performance.now() - inicio).toBeLessThan(250);
    expect(sim.t).toBeLessThanOrEqual(0.1 * 4 + 1e-9);
  });

  it('una escala NaN o infinita no envenena la simulación: después sigue avanzando con normalidad', () => {
    for (const mala of [NaN, Infinity, -Infinity, -3]) {
      const sim = new Simulation(simplePendulum, params);
      sim.timeScale = mala;
      sim.advance(0.1);
      sim.timeScale = 1;
      sim.advance(0.1);
      expect(sim.error).toBeNull();
      expect(sim.t).toBeGreaterThan(0.09);
    }
  });

  it('un tiempo transcurrido NaN, infinito o negativo no envenena el acumulador ni retrocede el tiempo', () => {
    for (const malo of [NaN, Infinity, -Infinity, -5]) {
      const sim = new Simulation(simplePendulum, params);
      sim.advance(malo);
      const tras = sim.t;
      expect(tras).toBeGreaterThanOrEqual(0);
      expect(tras).toBeLessThanOrEqual(0.1 + 1e-9);
      sim.advance(0.1);
      expect(sim.t).toBeGreaterThan(tras + 0.09);
    }
  });
});
