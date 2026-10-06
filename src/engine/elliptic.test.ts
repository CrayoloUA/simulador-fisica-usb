import { describe, expect, it } from 'vitest';
import { DEG_TO_RAD } from './numbers';
import { agm, pendulumPeriodFactor } from './elliptic';

describe('agm', () => {
  it('agm(a, a) = a', () => {
    expect(agm(3, 3)).toBe(3);
  });

  it('coincide con el valor de Gauss: agm(1, √2) = 1,19814023473559...', () => {
    expect(agm(1, Math.SQRT2)).toBeCloseTo(1.1981402347355922, 14);
  });

  it('es simétrica', () => {
    expect(agm(1, 0.4)).toBeCloseTo(agm(0.4, 1), 14);
  });
});

describe('pendulumPeriodFactor', () => {
  it('vale 1 para θ₀ = 0', () => {
    expect(pendulumPeriodFactor(0)).toBe(1);
  });

  it('a 60° es 2K(sen 30°)/π con K(0,5) = 1,68575035...', () => {
    expect(pendulumPeriodFactor(60 * DEG_TO_RAD)).toBeCloseTo((2 * 1.6857503548125961) / Math.PI, 10);
    expect(pendulumPeriodFactor(60 * DEG_TO_RAD)).toBeCloseTo(1.0732, 4);
  });

  it('a 90° ≈ 1,1803', () => {
    expect(pendulumPeriodFactor(90 * DEG_TO_RAD)).toBeCloseTo(1.1803, 4);
  });

  it('a 30° ≈ 1,0174', () => {
    expect(pendulumPeriodFactor(30 * DEG_TO_RAD)).toBeCloseTo(1.0174, 4);
  });

  it('a 10° ≈ 1,00191', () => {
    expect(pendulumPeriodFactor(10 * DEG_TO_RAD)).toBeCloseTo(1.00191, 5);
  });

  it('coincide con la serie 1 + θ²/16 + 11θ⁴/3072 para θ pequeño', () => {
    for (const deg of [1, 5, 10, 15]) {
      const t = deg * DEG_TO_RAD;
      const series = 1 + (t * t) / 16 + (11 * t ** 4) / 3072;
      // el siguiente término de la serie es O(θ⁶)
      expect(Math.abs(pendulumPeriodFactor(t) - series)).toBeLessThan(t ** 6 * 1e-3);
    }
  });

  it('crece con el ángulo', () => {
    let prev = pendulumPeriodFactor(0);
    for (let deg = 5; deg <= 175; deg += 5) {
      const f = pendulumPeriodFactor(deg * DEG_TO_RAD);
      expect(f).toBeGreaterThan(prev);
      prev = f;
    }
  });
});

/**
 * Serie del profesor (Wikipedia, "Péndulo simple", oscilaciones de mayor amplitud):
 * T(θ)/T₀ = Σ_{n≥0} [ (2n)! / (2²ⁿ·(n!)²) ]² · sen²ⁿ(θ/2).
 * Los coeficientes se calculan con la recurrencia c_n = c_{n−1}·(2n−1)/(2n), c₀ = 1.
 */
function seriesFactor(theta0Rad: number, terms: number): number {
  const s2 = Math.sin(theta0Rad / 2) ** 2;
  let coefficient = 1;
  let power = 1;
  let sum = 1;
  for (let n = 1; n < terms; n++) {
    coefficient *= (2 * n - 1) / (2 * n);
    power *= s2;
    sum += coefficient * coefficient * power;
  }
  return sum;
}

describe('serie de T/T₀ del profesor frente al cálculo por media aritmético-geométrica', () => {
  it('los primeros coeficientes son (1/2)², (1·3/2·4)² y (1·3·5/2·4·6)²', () => {
    const s2 = Math.sin(30 * DEG_TO_RAD / 2) ** 2;
    const explicit = 1 + (1 / 2) ** 2 * s2 + ((1 * 3) / (2 * 4)) ** 2 * s2 ** 2 + ((1 * 3 * 5) / (2 * 4 * 6)) ** 2 * s2 ** 3;
    expect(seriesFactor(30 * DEG_TO_RAD, 4)).toBeCloseTo(explicit, 14);
  });

  it.each([1, 10, 15, 30, 40, 60])('con muchos términos coincide con el motor a φ₀ = %i° (error relativo < 1e-12)', (deg) => {
    const exact = pendulumPeriodFactor(deg * DEG_TO_RAD);
    expect(Math.abs(seriesFactor(deg * DEG_TO_RAD, 80) / exact - 1)).toBeLessThan(1e-12);
  });

  it('con pocos términos la serie se queda corta y converge de abajo hacia el valor del motor', () => {
    const theta = 60 * DEG_TO_RAD;
    const exact = pendulumPeriodFactor(theta);
    const errors = [2, 3, 4, 6].map((terms) => exact - seriesFactor(theta, terms));
    for (const error of errors) expect(error).toBeGreaterThan(0);
    for (let i = 1; i < errors.length; i++) expect(errors[i]).toBeLessThan(errors[i - 1]);
  });

  it('el primer término correctivo T ≈ T₀·(1 + θ²/16) es muy bueno a 10° y deja de serlo a 60°', () => {
    const approx = (deg: number) => 1 + (deg * DEG_TO_RAD) ** 2 / 16;
    const relError = (deg: number) => Math.abs(approx(deg) / pendulumPeriodFactor(deg * DEG_TO_RAD) - 1);
    expect(relError(10)).toBeLessThan(1e-5);
    expect(relError(60)).toBeGreaterThan(1e-3);
    expect(relError(60)).toBeLessThan(1e-2);
  });
});
