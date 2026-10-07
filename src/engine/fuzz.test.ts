import { describe, expect, it } from 'vitest';
import { pendulumModels } from './phenomena/pendulum';
import { Simulation } from './simulation';
import type { Params } from './types';
import { clampToSpec, defaultParams } from './validate';

/** Generador pseudoaleatorio con semilla (mulberry32): el ataque es reproducible. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EXTREMOS = [0, -0, 1e-300, 1e-12, 1, 1e6, 1e12, 1e150, 1e308, -1, -1e308, Infinity, -Infinity, NaN];

function hostil(random: () => number): number {
  return random() < 0.5 ? EXTREMOS[Math.floor(random() * EXTREMOS.length)] : (random() - 0.5) * 10 ** (random() * 40 - 10);
}

describe('fuzzing del motor con parámetros fuera de rango (Fase 9)', () => {
  for (const [nombre, modelo] of Object.entries(pendulumModels)) {
    it(`modelo ${nombre}: 300 combinaciones hostiles no lanzan, no se cuelgan y fallan con mensaje fijo`, () => {
      const random = rng(20261007);
      const base = defaultParams(modelo.paramSchema);
      const inicio = performance.now();
      for (let caso = 0; caso < 300; caso++) {
        const params: Params = { ...base };
        for (const spec of modelo.paramSchema) if (random() < 0.7) params[spec.key] = hostil(random);
        const sim = new Simulation(modelo, params);
        expect(() => {
          for (let frame = 0; frame < 5; frame++) sim.advance(0.016);
        }, JSON.stringify(params)).not.toThrow();
        if (sim.error !== null) expect(sim.error).toBe('La simulación se detuvo: el cálculo produjo un valor no válido.');
        for (const muestra of sim.samples) {
          for (const valor of Object.values(muestra.values)) expect(Number.isFinite(valor)).toBe(true);
        }
      }
      expect(performance.now() - inicio).toBeLessThan(5000);
    });

    it(`modelo ${nombre}: con el recorte del esquema, ningún valor hostil llega a producir un error`, () => {
      const random = rng(7);
      const base = defaultParams(modelo.paramSchema);
      for (let caso = 0; caso < 300; caso++) {
        const params: Params = { ...base };
        for (const spec of modelo.paramSchema) params[spec.key] = clampToSpec(spec, hostil(random));
        const sim = new Simulation(modelo, params);
        for (let frame = 0; frame < 20; frame++) sim.advance(0.016);
        expect(sim.error, JSON.stringify(params)).toBeNull();
      }
    });
  }
});
