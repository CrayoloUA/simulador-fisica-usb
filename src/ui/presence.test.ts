import { describe, expect, it } from 'vitest';
import { finishClosing, longestTransitionMs, nextPresence, parseCssTimeMs } from './presence';

describe('nextPresence', () => {
  it('abrir lo deja abierto, venga de donde venga (también si se estaba cerrando: se retoma)', () => {
    expect(nextPresence('closed', true)).toBe('open');
    expect(nextPresence('closing', true)).toBe('open');
    expect(nextPresence('open', true)).toBe('open');
  });

  it('cerrar lo abierto lo pasa por "cerrándose" (la salida se ve); lo cerrado sigue cerrado', () => {
    expect(nextPresence('open', false)).toBe('closing');
    expect(nextPresence('closing', false)).toBe('closing');
    expect(nextPresence('closed', false)).toBe('closed');
  });
});

describe('finishClosing', () => {
  it('solo termina lo que se estaba cerrando; lo reabierto a mitad de la salida sigue abierto', () => {
    expect(finishClosing('closing')).toBe('closed');
    expect(finishClosing('open')).toBe('open');
    expect(finishClosing('closed')).toBe('closed');
  });
});

describe('parseCssTimeMs', () => {
  it('convierte segundos y milisegundos', () => {
    expect(parseCssTimeMs('0.12s')).toBeCloseTo(120);
    expect(parseCssTimeMs('120ms')).toBe(120);
    expect(parseCssTimeMs(' .2s ')).toBeCloseTo(200);
    expect(parseCssTimeMs('0s')).toBe(0);
  });

  it('lo que no entiende vale 0 (no se espera nada)', () => {
    expect(parseCssTimeMs('')).toBe(0);
    expect(parseCssTimeMs('auto')).toBe(0);
    expect(parseCssTimeMs('-1s')).toBe(0);
  });
});

describe('longestTransitionMs', () => {
  it('es lo que tarda la última transición en terminar (duración más retraso)', () => {
    expect(longestTransitionMs('0.12s, 0.2s', '0s, 0s')).toBeCloseTo(200);
    expect(longestTransitionMs('0.12s, 0s', '0s, 0.12s')).toBeCloseTo(120);
  });

  it('las listas cortas se repiten, como hace CSS', () => {
    expect(longestTransitionMs('0.1s', '0s, 0.05s, 0s')).toBeCloseTo(150);
    expect(longestTransitionMs('0.12s, 0.3s', '0.1s')).toBeCloseTo(400);
  });

  it('sin transiciones espera 0', () => {
    expect(longestTransitionMs('', '')).toBe(0);
    expect(longestTransitionMs('0s', '0s')).toBe(0);
  });
});
