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
