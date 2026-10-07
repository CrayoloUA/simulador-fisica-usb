import { describe, expect, it } from 'vitest';
import { DEG_TO_RAD, formatNumber, parseDecimal } from './numbers';

describe('parseDecimal', () => {
  it('acepta punto y coma decimal', () => {
    expect(parseDecimal('0,5')).toBe(0.5);
    expect(parseDecimal('0.5')).toBe(0.5);
  });

  it('ignora espacios y acepta signo y formas cortas', () => {
    expect(parseDecimal(' 2 ')).toBe(2);
    expect(parseDecimal('-3')).toBe(-3);
    expect(parseDecimal(',5')).toBe(0.5);
    expect(parseDecimal('5,')).toBe(5);
  });

  it('rechaza lo que no es un número simple', () => {
    for (const bad of ['', '   ', 'abc', '1,2,3', '1e3', '--1', 'Infinity', '1 2']) {
      expect(parseDecimal(bad)).toBeNull();
    }
  });
});

describe('parseDecimal con entradas hostiles', () => {
  it('rechaza de inmediato una cadena enorme (no depende del backtracking de la regex)', () => {
    const hostil = `${'1'.repeat(200_000)}x`;
    const inicio = performance.now();
    expect(parseDecimal(hostil)).toBeNull();
    expect(performance.now() - inicio).toBeLessThan(50);
  });

  it('rechaza más de 32 caracteres aunque sean dígitos válidos', () => {
    expect(parseDecimal('1'.repeat(33))).toBeNull();
  });

  it('sigue aceptando números normales largos pero razonables', () => {
    expect(parseDecimal('0,123456789012345678')).toBeCloseTo(0.123456789012345678, 15);
  });
});

describe('formatNumber', () => {
  it('usa coma decimal', () => {
    expect(formatNumber(0.1)).toBe('0,1');
    expect(formatNumber(5)).toBe('5');
  });

  it('respeta la cantidad de decimales pedida', () => {
    expect(formatNumber(9.8, 2)).toBe('9,80');
    expect(formatNumber(1.7123, 1)).toBe('1,7');
  });
});

describe('DEG_TO_RAD', () => {
  it('convierte 180° en π', () => {
    expect(180 * DEG_TO_RAD).toBeCloseTo(Math.PI, 12);
  });
});
