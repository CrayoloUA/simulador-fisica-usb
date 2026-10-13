import { describe, expect, it } from 'vitest';
import { clampInto, containsRect, intersects, squareAt, type Rect } from './geometry';
import { pickMark, ringCandidates } from './markPlacement';

const BOUNDS: Rect = { x: 0, y: 0, w: 300, h: 200 };
const TARGET: Rect = { x: 120, y: 80, w: 40, h: 20 };

describe('geometry', () => {
  it('intersects: compartir solo un borde no es pisarse', () => {
    expect(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 10, h: 10 })).toBe(true);
  });

  it('containsRect y clampInto', () => {
    expect(containsRect(BOUNDS, { x: 0, y: 0, w: 300, h: 200 })).toBe(true);
    expect(containsRect(BOUNDS, { x: -1, y: 0, w: 10, h: 10 })).toBe(false);
    expect(clampInto({ x: 290, y: -5, w: 44, h: 44 }, BOUNDS)).toEqual({ x: 256, y: 0, w: 44, h: 44 });
    // Más grande que el límite: se alinea arriba a la izquierda en vez de salir disparada.
    expect(clampInto({ x: 50, y: 50, w: 500, h: 500 }, BOUNDS)).toEqual({ x: 0, y: 0, w: 500, h: 500 });
  });

  it('squareAt centra el cuadrado', () => {
    expect(squareAt(100, 50, 44)).toEqual({ x: 78, y: 28, w: 44, h: 44 });
  });
});

describe('ringCandidates', () => {
  it('empieza por la derecha, sigue por la izquierda, debajo y encima, y deja el aire pedido', () => {
    const [right, left, below, above] = ringCandidates(TARGET, 44, 8);
    expect(right).toEqual({ x: 168, y: 68, w: 44, h: 44 });
    expect(left).toEqual({ x: 68, y: 68, w: 44, h: 44 });
    expect(below).toEqual({ x: 118, y: 108, w: 44, h: 44 });
    expect(above).toEqual({ x: 118, y: 28, w: 44, h: 44 });
    expect(ringCandidates(TARGET, 44, 8)).toHaveLength(8);
  });

  it('ninguna candidata pisa la parte que explica', () => {
    for (const candidate of ringCandidates(TARGET, 44, 4)) expect(intersects(candidate, TARGET)).toBe(false);
  });
});

describe('pickMark', () => {
  const rules = (over: Partial<Parameters<typeof pickMark>[1]> = {}) => ({ bounds: BOUNDS, taken: [], blocked: [], ...over });

  it('toma la primera candidata libre', () => {
    const candidates = ringCandidates(TARGET, 44, 8);
    expect(pickMark(candidates, rules())).toEqual(candidates[0]);
  });

  it('salta las que se salen de los límites', () => {
    const target: Rect = { x: 270, y: 80, w: 20, h: 20 };
    const candidates = ringCandidates(target, 44, 8);
    const picked = pickMark(candidates, rules());
    expect(picked).toEqual(candidates[1]);
    expect(containsRect(BOUNDS, picked)).toBe(true);
  });

  it('salta las que pisan otra marca', () => {
    const candidates = ringCandidates(TARGET, 44, 8);
    const picked = pickMark(candidates, rules({ taken: [candidates[0]] }));
    expect(picked).toEqual(candidates[1]);
  });

  it('salta las que caen en una zona prohibida', () => {
    const candidates = ringCandidates(TARGET, 44, 8);
    const picked = pickMark(candidates, rules({ blocked: [(rect) => rect.x > TARGET.x] }));
    expect(picked).toEqual(candidates[1]);
  });

  it('si todas estorban, gana la que menos estorba y no pisa otra marca', () => {
    const candidates = ringCandidates(TARGET, 44, 8);
    const cost = (rect: Rect) => (rect === candidates[2] ? 1 : 5);
    const picked = pickMark(candidates, rules({ blocked: [() => true], cost }));
    expect(picked).toEqual(candidates[2]);
  });

  it('si ninguna cabe, acomoda la primera dentro de los límites', () => {
    const tiny: Rect = { x: 0, y: 0, w: 30, h: 30 };
    const picked = pickMark(ringCandidates({ x: 10, y: 10, w: 10, h: 10 }, 44, 8), rules({ bounds: tiny }));
    expect(picked.w).toBe(44);
    expect(picked.x).toBe(0);
    expect(picked.y).toBe(0);
  });
});
