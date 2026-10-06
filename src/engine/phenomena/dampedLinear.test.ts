import { describe, expect, it } from 'vitest';
import { DEG_TO_RAD } from '../numbers';
import { dampedLinearTheory } from './dampedLinear';

const base = { g: 9.8, L: 1, phi0Rad: 10 * DEG_TO_RAD };
const omega0 = Math.sqrt(base.g / base.L);

describe('dampedLinearTheory', () => {
  it('con b = 0 es θ = φ₀·cos(ω₀t) y ω = −φ₀·ω₀·sen(ω₀t)', () => {
    for (const t of [0, 0.3, 1.7, 5]) {
      const r = dampedLinearTheory({ ...base, b: 0 }, t);
      expect(r.theta).toBeCloseTo(base.phi0Rad * Math.cos(omega0 * t), 12);
      expect(r.omega).toBeCloseTo(-base.phi0Rad * omega0 * Math.sin(omega0 * t), 12);
    }
  });

  it('parte de φ₀ en reposo para cualquier fricción válida', () => {
    for (const b of [0, 0.05, 0.4]) {
      const r = dampedLinearTheory({ ...base, b }, 0);
      expect(r.theta).toBeCloseTo(base.phi0Rad, 12);
      expect(r.omega).toBeCloseTo(0, 12);
    }
  });

  it('la amplitud decae como e^(−βt): un período después, el máximo cae en e^(−β·T_d)', () => {
    const b = 0.4;
    const beta = b / 2;
    const omegaD = Math.sqrt(omega0 * omega0 - beta * beta);
    const Td = (2 * Math.PI) / omegaD;
    // Los máximos de θ están donde ω = 0: t = 0 y t = T_d (ω_d·t = 2π).
    const first = dampedLinearTheory({ ...base, b }, 0).theta;
    const next = dampedLinearTheory({ ...base, b }, Td);
    expect(next.omega).toBeCloseTo(0, 10);
    expect(next.theta / first).toBeCloseTo(Math.exp(-beta * Td), 10);
  });

  it('el peor caso del esquema (g = 1, L = 5, b = 0,4) es subamortiguado y finito', () => {
    const worst = { g: 1, L: 5, phi0Rad: 15 * DEG_TO_RAD, b: 0.4 };
    const omegaD2 = worst.g / worst.L - (worst.b / 2) ** 2;
    expect(omegaD2).toBeGreaterThan(0);
    for (const t of [0, 1, 10, 100]) {
      const r = dampedLinearTheory(worst, t);
      expect(Number.isFinite(r.theta)).toBe(true);
      expect(Number.isFinite(r.omega)).toBe(true);
    }
  });
});
