import { describe, expect, it } from 'vitest';
import type { Sample } from '../engine/types';
import { drawChart } from './drawChart';

function fakeContext() {
  const calls = { moveTo: [] as number[][], lineTo: [] as number[][] };
  const noop = () => undefined;
  const ctx = new Proxy(
    {},
    {
      get: (_t, name: string) => {
        if (name === 'moveTo' || name === 'lineTo') return (x: number, y: number) => calls[name].push([x, y]);
        return noop;
      },
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

function makeSamples(n: number): Sample[] {
  return Array.from({ length: n }, (_, i) => ({
    t: i * 0.01,
    values: { theta: Math.cos(i * 0.01) },
    theory: { theta: Math.cos(i * 0.01) },
  }));
}

describe('drawChart', () => {
  it('limita los puntos dibujados por serie y conserva la muestra más reciente', () => {
    const { ctx, calls } = fakeContext();
    drawChart(ctx, 560, 220, makeSamples(1000), 0.2);
    // 2 líneas de ejes (1 moveTo + 1 lineTo cada) + 2 series
    const seriesPoints = calls.moveTo.length - 2 + (calls.lineTo.length - 2);
    expect(seriesPoints / 2).toBeLessThanOrEqual(300);
    expect(seriesPoints / 2).toBeGreaterThan(200);
    const lastX = calls.lineTo[calls.lineTo.length - 1][0];
    const expectedX = 44 + ((9.99 - 0) / 10) * (560 - 44 - 12);
    expect(lastX).toBeCloseTo(expectedX, 6);
  });

  it('con pocas muestras dibuja todas', () => {
    const { ctx, calls } = fakeContext();
    drawChart(ctx, 560, 220, makeSamples(50), 0.2);
    expect(calls.moveTo.length - 2 + (calls.lineTo.length - 2)).toBe(100);
  });
});
