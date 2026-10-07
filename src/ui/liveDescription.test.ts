import { describe, expect, it } from 'vitest';
import { LIVE_INTERVAL_MS, describeLive, liveDue } from './liveDescription';

describe('liveDue', () => {
  it('el intervalo con la simulación en marcha es de un segundo', () => {
    expect(LIVE_INTERVAL_MS).toBe(1000);
  });

  it('en marcha: espera el intervalo completo', () => {
    expect(liveDue(true, true, 1500, 1000)).toBe(false);
    expect(liveDue(true, true, 2000, 1000)).toBe(true);
  });

  it('en pausa o reiniciada: actualiza de inmediato', () => {
    expect(liveDue(true, false, 1001, 1000)).toBe(true);
  });

  it('sin cambios nuevos no actualiza nunca', () => {
    expect(liveDue(false, false, 5000, 0)).toBe(false);
    expect(liveDue(false, true, 5000, 0)).toBe(false);
  });
});

describe('describeLive', () => {
  it('da tiempo, ángulo en grados y rapidez angular con coma decimal', () => {
    expect(describeLive(1.5, Math.PI / 6, 0.25)).toBe('En vivo: t = 1,50 s, θ = 30,0°, ω = 0,25 rad/s');
  });
});
