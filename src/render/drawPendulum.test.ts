import { describe, expect, it } from 'vitest';
import { drawPendulum, lengthFraction, pendulumLayout } from './drawPendulum';
import { readCanvasTheme } from './theme';

const vars: Record<string, string> = {
  '--s2': '8px',
  '--s4': '16px',
  '--s6': '32px',
  '--s8': '64px',
  '--ball-r': '22px',
  '--ball-k': '8px',
  '--pivot-r': '5px',
  '--stroke-rod': '3px',
  '--text-small': '1rem',
};
const THEME = readCanvasTheme({ getPropertyValue: (name) => vars[name] ?? '' });
const params = (overrides: Record<string, number> = {}) => ({ L: 1, phi0: 10, g: 9.8, m: 0.5, b: 0, ...overrides });

describe('lengthFraction', () => {
  it('va de 62 % con el hilo más corto a 100 % con el más largo', () => {
    expect(lengthFraction(0.1)).toBeCloseTo(0.62, 9);
    expect(lengthFraction(5)).toBeCloseTo(1, 9);
  });

  it('crece con L y nunca sale de ese rango', () => {
    expect(lengthFraction(1)).toBeGreaterThan(lengthFraction(0.5));
    expect(lengthFraction(0)).toBeCloseTo(0.62, 9);
    expect(lengthFraction(50)).toBeCloseTo(1, 9);
  });
});

describe('pendulumLayout', () => {
  it('el hilo y la bolita caben en alto, con el apoyo centrado', () => {
    const layout = pendulumLayout(600, 400, params({ L: 5 }), THEME);
    expect(layout.pivotX).toBe(300);
    expect(layout.pivotY + layout.lengthPx + layout.bobRadius).toBeLessThan(400);
  });

  it('con un ángulo grande el hilo se acorta para que la oscilación quepa en el ancho', () => {
    const small = pendulumLayout(280, 900, params({ L: 5, phi0: 10 }), THEME);
    const large = pendulumLayout(280, 900, params({ L: 5, phi0: 60 }), THEME);
    expect(large.lengthPx).toBeLessThan(small.lengthPx);
    // Con 60° la bolita, en su punto más lejano, queda dentro del ancho.
    const reach = 140 + large.lengthPx * Math.sin((60 * Math.PI) / 180) + large.bobRadius;
    expect(reach).toBeLessThanOrEqual(280);
  });

  it('un hilo corto se dibuja más corto que uno largo', () => {
    const short = pendulumLayout(600, 500, params({ L: 0.1 }), THEME);
    const long = pendulumLayout(600, 500, params({ L: 5 }), THEME);
    expect(short.lengthPx).toBeLessThan(long.lengthPx);
  });

  it('una bolita más masiva deja menos largo disponible en alto', () => {
    const light = pendulumLayout(900, 300, params({ L: 5, m: 0.05 }), THEME);
    const heavy = pendulumLayout(900, 300, params({ L: 5, m: 5 }), THEME);
    expect(heavy.lengthPx).toBeLessThan(light.lengthPx);
  });

  it('nunca baja de un largo mínimo legible', () => {
    const layout = pendulumLayout(120, 150, params({ L: 5, phi0: 60 }), THEME);
    expect(layout.lengthPx).toBeGreaterThanOrEqual(64);
  });
});

describe('drawPendulum', () => {
  /** Contexto falso: cuenta los círculos (arc) y cuáles llevan relleno. */
  function fakeContext() {
    const arcs: Array<{ x: number; y: number; r: number }> = [];
    const noop = () => undefined;
    const ctx = new Proxy(
      {},
      {
        get: (_t, name: string) => (name === 'arc' ? (x: number, y: number, r: number) => arcs.push({ x, y, r }) : noop),
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D;
    return { ctx, arcs };
  }

  it('dibuja el círculo punteado de salida, el apoyo y la bolita', () => {
    const { ctx, arcs } = fakeContext();
    drawPendulum(ctx, 600, 400, { theta: 0, omega: 0 }, params({ phi0: 30 }), THEME);
    expect(arcs).toHaveLength(3);
    const layout = pendulumLayout(600, 400, params({ phi0: 30 }), THEME);
    const ghost = arcs[0];
    expect(ghost.r).toBe(layout.bobRadius);
    expect(ghost.x).toBeCloseTo(layout.pivotX + layout.lengthPx * Math.sin(Math.PI / 6), 6);
  });
});
