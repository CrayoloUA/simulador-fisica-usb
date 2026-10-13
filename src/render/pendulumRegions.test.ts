import { describe, expect, it } from 'vitest';
import { DEG_TO_RAD } from '../engine/numbers';
import { pendulumLayout } from './drawPendulum';
import { containsRect, intersects, type Rect } from './geometry';
import { pendulumRegions, sweptByPendulum } from './pendulumRegions';
import { readCanvasTheme } from './theme';

const vars: Record<string, string> = {
  '--s1': '4px',
  '--s2': '8px',
  '--s4': '16px',
  '--s6': '32px',
  '--s8': '64px',
  '--ball-r': '22px',
  '--ball-k': '8px',
  '--pivot-r': '5px',
  '--stroke-rod': '3px',
  '--text-small': '1rem',
  '--mark': '2.75rem',
};
const THEME = readCanvasTheme({ getPropertyValue: (name) => vars[name] ?? '' });
const M = THEME.markSize;
const params = (overrides: Record<string, number> = {}) => ({ L: 1, phi0: 10, g: 9.8, m: 0.5, b: 0, ...overrides });

/** Cajas típicas: escritorio (el escenario a 1366 × 768) y celular de 375 px. */
const SIZES = [
  { name: 'escritorio', width: 980, height: 420 },
  { name: 'cajón abierto', width: 628, height: 420 },
  { name: 'celular', width: 341, height: 288 },
];
const ANGLES = [1, 10, 30, 45, 60];
/**
 * Con un celular, 60° y un hilo corto o una bolita pesada, el apoyo queda dentro de lo que alcanza
 * la bolita: ahí no hay sitio libre y las marcas del péndulo y del círculo se dejan cerca (se mueve la
 * bolita por debajo de ellas, no cubren ningún valor ni control). Se comprueba igual que no pisa a
 * otra marca ni sale del escenario.
 */
const CROWDED = (size: string, phi0: number, L: number, m: number) => size === 'celular' && phi0 === 60 && (L === 0.1 || m === 5);
const LENGTHS = [0.1, 1, 5];
const MASSES = [0.05, 0.5, 5];

describe('pendulumRegions: las marcas caben, no se pisan y no estorban al péndulo', () => {
  for (const size of SIZES) {
    for (const phi0 of ANGLES) {
      for (const L of LENGTHS) {
        for (const m of MASSES) {
          const label = `${size.name}, φ₀ = ${phi0}°, L = ${L} m, m = ${m} kg`;
          it(label, () => {
            const p = params({ phi0, L, m });
            const { layout, marks } = pendulumRegions(size.width, size.height, p, THEME);
            const boxes = Object.entries(marks) as Array<[string, Rect]>;
            const stage: Rect = { x: 0, y: 0, w: size.width, h: size.height };
            for (const [name, box] of boxes) {
              expect(box.w, `${name} ancho`).toBe(M);
              expect(box.h, `${name} alto`).toBe(M);
              expect(containsRect(stage, box), `${name} dentro del escenario`).toBe(true);
            }
            for (let i = 0; i < boxes.length; i++) {
              for (let j = i + 1; j < boxes.length; j++) {
                expect(intersects(boxes[i][1], boxes[j][1]), `${boxes[i][0]} y ${boxes[j][0]} se pisan`).toBe(false);
              }
            }
            // El péndulo entero (hilo y bolita en todo su recorrido) queda fuera de las marcas.
            const phi = phi0 * DEG_TO_RAD;
            for (let k = -20; k <= 20; k++) {
              const theta = (phi * k) / 20;
              const bob = {
                x: layout.pivotX + layout.lengthPx * Math.sin(theta),
                y: layout.pivotY + layout.lengthPx * Math.cos(theta),
              };
              for (const [name, box] of boxes) {
                if (name !== 'vertical' && CROWDED(size.name, phi0, L, m)) continue;
                const nearestX = Math.min(Math.max(bob.x, box.x), box.x + box.w);
                const nearestY = Math.min(Math.max(bob.y, box.y), box.y + box.h);
                const distance = Math.hypot(bob.x - nearestX, bob.y - nearestY);
                expect(distance, `la bolita pisa la marca ${name} con θ = ${(theta / DEG_TO_RAD).toFixed(0)}°`).toBeGreaterThanOrEqual(
                  layout.bobRadius,
                );
              }
            }
          });
        }
      }
    }
  }

  it('la marca de la vertical queda bajo la bolita en reposo', () => {
    const { layout, marks } = pendulumRegions(980, 420, params(), THEME);
    expect(marks.vertical.y).toBeGreaterThanOrEqual(layout.pivotY + layout.lengthPx + layout.bobRadius);
    expect(marks.vertical.x + M / 2).toBeCloseTo(layout.pivotX, 6);
  });

  it('la marca del péndulo queda junto al apoyo, a la altura del soporte y del lado contrario a la salida', () => {
    const { layout, zones, marks } = pendulumRegions(980, 420, params(), THEME);
    expect(marks.pendulo.y + M / 2).toBeCloseTo(zones.pendulo.y + zones.pendulo.h / 2, 6);
    expect(marks.pendulo.x + M).toBeLessThanOrEqual(layout.pivotX - 32);
  });

  it('la marca del círculo de salida queda hacia afuera de donde se soltó', () => {
    const { layout, marks } = pendulumRegions(980, 420, params({ phi0: 30 }), THEME);
    const startX = layout.pivotX + layout.lengthPx * Math.sin(30 * DEG_TO_RAD);
    expect(marks.salida.x).toBeGreaterThanOrEqual(startX + layout.bobRadius);
  });
});

describe('pendulumRegions: la disposición es la del dibujo', () => {
  it('reserva abajo una franja del alto de una marca (el péndulo se dibuja más bajo que sin marcas)', () => {
    const normal = pendulumLayout(980, 420, params({ L: 5 }), THEME);
    const withMarks = pendulumRegions(980, 420, params({ L: 5 }), THEME).layout;
    expect(withMarks).toEqual(pendulumLayout(980, 420, params({ L: 5 }), THEME, M));
    expect(withMarks.lengthPx).toBeLessThan(normal.lengthPx);
    expect(normal.lengthPx - withMarks.lengthPx).toBeCloseTo(M, 6);
  });

  it('sin franja reservada la disposición normal no cambia', () => {
    expect(pendulumLayout(980, 420, params(), THEME, 0)).toEqual(pendulumLayout(980, 420, params(), THEME));
  });

  it('las zonas son la vertical de reposo, el círculo de salida y el soporte', () => {
    const { layout, zones } = pendulumRegions(980, 420, params({ phi0: 30 }), THEME);
    expect(zones.vertical.y).toBe(layout.pivotY);
    expect(zones.vertical.h).toBeCloseTo(layout.lengthPx, 6);
    expect(zones.salida.w).toBeCloseTo(2 * layout.bobRadius, 6);
    expect(zones.salida.x + zones.salida.w / 2).toBeCloseTo(layout.pivotX + layout.lengthPx * Math.sin(30 * DEG_TO_RAD), 6);
    expect(zones.pendulo.x + zones.pendulo.w / 2).toBeCloseTo(layout.pivotX, 6);
  });
});

describe('sweptByPendulum', () => {
  const layout = pendulumLayout(600, 400, params({ phi0: 30 }), THEME);
  const phi = 30 * DEG_TO_RAD;

  it('el hilo en reposo y la bolita están dentro de lo que barre', () => {
    expect(sweptByPendulum(layout, phi, { x: layout.pivotX, y: layout.pivotY + layout.lengthPx / 2 })).toBe(true);
    expect(sweptByPendulum(layout, phi, { x: layout.pivotX, y: layout.pivotY + layout.lengthPx })).toBe(true);
  });

  it('un punto lejos, al lado o más abajo de la bolita, no', () => {
    expect(sweptByPendulum(layout, phi, { x: layout.pivotX + 3 * layout.lengthPx, y: layout.pivotY })).toBe(false);
    expect(sweptByPendulum(layout, phi, { x: layout.pivotX, y: layout.pivotY + layout.lengthPx + layout.bobRadius + 10 })).toBe(
      false,
    );
  });

  it('con un ángulo mayor barre más a los lados', () => {
    const side = { x: layout.pivotX + layout.lengthPx * Math.sin(50 * DEG_TO_RAD), y: layout.pivotY + layout.lengthPx * Math.cos(50 * DEG_TO_RAD) };
    expect(sweptByPendulum(layout, phi, side)).toBe(false);
    expect(sweptByPendulum(layout, 60 * DEG_TO_RAD, side)).toBe(true);
  });
});
