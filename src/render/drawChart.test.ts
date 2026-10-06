import { describe, expect, it } from 'vitest';
import type { Sample } from '../engine/types';
import { drawChart } from './drawChart';

function fakeContext() {
  const calls = {
    moveTo: [] as number[][],
    lineTo: [] as number[][],
    strokeColors: [] as string[],
    texts: [] as string[],
  };
  let strokeStyle = '';
  const noop = () => undefined;
  const ctx = new Proxy(
    {},
    {
      get: (_t, name: string) => {
        if (name === 'moveTo' || name === 'lineTo') return (x: number, y: number) => calls[name].push([x, y]);
        if (name === 'stroke') return () => calls.strokeColors.push(strokeStyle);
        if (name === 'fillText') return (text: string) => calls.texts.push(text);
        return noop;
      },
      set: (_t, name: string, value: unknown) => {
        if (name === 'strokeStyle') strokeStyle = String(value);
        return true;
      },
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

  it('dibuja primero la simulada (azul) y después la aproximación lineal (naranja) encima', () => {
    const { ctx, calls } = fakeContext();
    drawChart(ctx, 560, 220, makeSamples(50), 0.2);
    expect(calls.strokeColors.slice(-2)).toEqual(['#2563eb', '#ea580c']);
  });

  it('con showLinear = false no dibuja la curva punteada ni su leyenda, pero sí la simulada', () => {
    const { ctx, calls } = fakeContext();
    drawChart(ctx, 560, 220, makeSamples(50), 0.2, { showLinear: false });
    expect(calls.strokeColors).toContain('#2563eb');
    expect(calls.strokeColors).not.toContain('#ea580c');
    expect(calls.texts).toContain('Simulada');
    expect(calls.texts).not.toContain('Aprox. lineal');
    expect(calls.moveTo.length - 2 + (calls.lineTo.length - 2)).toBe(50);
  });

  it('con showLinear = true (explícito) se comporta igual que por defecto', () => {
    const a = fakeContext();
    const b = fakeContext();
    drawChart(a.ctx, 560, 220, makeSamples(50), 0.2);
    drawChart(b.ctx, 560, 220, makeSamples(50), 0.2, { showLinear: true });
    expect(b.calls).toEqual(a.calls);
  });

  it('rotula el eje de referencia y los signos del ángulo', () => {
    const { ctx, calls } = fakeContext();
    drawChart(ctx, 560, 220, makeSamples(50), 0.2);
    expect(calls.texts).toContain('θ = 0 (vertical)');
    expect(calls.texts).toContain('+13°');
    expect(calls.texts).toContain('-13°');
  });

  it('la leyenda dice "Simulada" y "Aprox. lineal"', () => {
    const { ctx, calls } = fakeContext();
    drawChart(ctx, 560, 220, makeSamples(50), 0.2);
    expect(calls.texts).toContain('Simulada');
    expect(calls.texts).toContain('Aprox. lineal');
    expect(calls.texts).not.toContain('Teórica');
  });
});
