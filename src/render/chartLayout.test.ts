import { describe, expect, it } from 'vitest';
import { NARROW_PX, chartLayout, type ChartLabels, type MeasureText } from './chartLayout';
import { containsRect, intersects, type Rect } from './geometry';
import type { CanvasTheme } from './theme';

const THEME: CanvasTheme = {
  surface: 'surface',
  line: 'line',
  lineStrong: 'line-strong',
  ink: 'ink',
  inkSoft: 'ink-soft',
  accent: 'accent',
  curveSim: 'curve-sim',
  curveLinear: 'curve-linear',
  fontSans: 'sans-serif',
  textSize: 16,
  space: { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 48, s8: 64 },
  stroke: { hair: 1, bold: 2, thin: 1.5, rod: 3, curve: 3, curveLinear: 2.5, support: 4 },
  dash: [6, 6],
  dashLong: [9, 6],
  dotRadius: 5,
  pivotRadius: 5,
  ballRadius: 22,
  ballPerSqrtKg: 8,
  markSize: 44,
};
const LABELS: ChartLabels = { title: 'Ángulo (θ) en el tiempo (s)', simulated: 'Simulación', linear: 'Ángulo pequeño' };
/** Medida falsa y predecible: 8 px por letra, 9 si es seminegrita. */
const measure: MeasureText = (text, weight) => text.length * (weight === 'semibold' ? 9 : 8);
const M = THEME.markSize;

describe('chartLayout sin marcas (la pantalla normal)', () => {
  it('ancho: márgenes de siempre, título arriba y leyenda en la misma fila, a la derecha', () => {
    const l = chartLayout(700, 220, THEME, LABELS, { showLinear: true }, measure);
    expect(l.narrow).toBe(false);
    expect(l.pad).toEqual({ left: 56, right: 16, top: 40, bottom: 32 });
    expect(l.titleBaselineY).toBe(20);
    expect(l.titleMark).toBeNull();
    expect(l.legend.map((i) => i.key)).toEqual(['simulated', 'linear']);
    expect(l.legend.every((i) => i.mark === null && i.baselineY === 20)).toBe(true);
    const [sim, lin] = l.legend;
    // La leyenda termina en el margen derecho.
    expect(lin.x + lin.rect.w).toBeCloseTo(700 - 16, 6);
    expect(lin.x).toBeCloseTo(sim.x + sim.rect.w + 24, 6);
    expect(l.plot).toEqual({ x: 56, y: 40, w: 628, h: 148 });
  });

  it('estrecho: la leyenda baja a otra fila y el margen superior crece', () => {
    const l = chartLayout(NARROW_PX - 1, 220, THEME, LABELS, { showLinear: true }, measure);
    expect(l.narrow).toBe(true);
    expect(l.pad.top).toBe(40 + 24);
    expect(l.legend[0].x).toBe(16);
    expect(l.legend[0].baselineY).toBe(32 + 8 + 4);
  });

  it('sin comparar no hay leyenda', () => {
    expect(chartLayout(700, 220, THEME, LABELS, { showLinear: false }, measure).legend).toEqual([]);
    expect(chartLayout(380, 220, THEME, LABELS, { showLinear: false }, measure).pad.top).toBe(40);
  });
});

describe('chartLayout con marcas', () => {
  const marks = (l: ReturnType<typeof chartLayout>): Rect[] => [
    ...(l.titleMark ? [l.titleMark] : []),
    ...l.legend.flatMap((i) => (i.mark ? [i.mark] : [])),
  ];

  it('muestra la leyenda aunque no se compare, solo con la curva azul', () => {
    const l = chartLayout(700, 220, THEME, LABELS, { showLinear: false, markSize: M }, measure);
    expect(l.legend.map((i) => i.key)).toEqual(['simulated']);
    expect(l.titleMark).not.toBeNull();
    expect(l.legend[0].mark).not.toBeNull();
  });

  it('con comparación hay una marca por curva y una por la gráfica, todas de markSize', () => {
    const l = chartLayout(700, 220, THEME, LABELS, { showLinear: true, markSize: M }, measure);
    expect(l.legend.map((i) => i.key)).toEqual(['simulated', 'linear']);
    expect(marks(l)).toHaveLength(3);
    for (const box of marks(l)) {
      expect(box.w).toBe(M);
      expect(box.h).toBe(M);
    }
  });

  for (const width of [341, 400, 559, 560, 640, 700, 980]) {
    for (const showLinear of [false, true]) {
      it(`ancho ${width}, ${showLinear ? 'comparando' : 'sin comparar'}: las marcas caben, no se pisan entre sí ni con el texto, ni con las curvas`, () => {
        const height = 260;
        const l = chartLayout(width, height, THEME, LABELS, { showLinear, markSize: M }, measure);
        const box: Rect = { x: 0, y: 0, w: width, h: height };
        const all = marks(l);
        for (const mark of all) {
          expect(containsRect(box, mark), `marca fuera de la caja: ${JSON.stringify(mark)}`).toBe(true);
          // Las marcas viven sobre la zona de curvas, nunca dentro.
          expect(mark.y + mark.h).toBeLessThanOrEqual(l.plot.y);
        }
        for (let i = 0; i < all.length; i++) {
          for (let j = i + 1; j < all.length; j++) expect(intersects(all[i], all[j])).toBe(false);
        }
        // El nombre de cada curva y el título no quedan bajo ninguna marca.
        const title: Rect = { x: 16, y: l.titleBaselineY - 16, w: measure(LABELS.title, 'semibold'), h: 16 };
        for (const mark of all) {
          expect(intersects(mark, title)).toBe(false);
          for (const item of l.legend) expect(intersects(mark, item.rect)).toBe(false);
        }
        for (const a of l.legend) {
          for (const b of l.legend) if (a !== b) expect(intersects(a.rect, b.rect)).toBe(false);
          expect(a.rect.x + a.rect.w).toBeLessThanOrEqual(width);
          expect(intersects(a.rect, title)).toBe(false);
        }
        expect(l.plot.h).toBeGreaterThan(0);
      });
    }
  }

  it('cada marca queda pegada al final de su nombre', () => {
    const l = chartLayout(700, 220, THEME, LABELS, { showLinear: true, markSize: M }, measure);
    for (const item of l.legend) expect(item.mark!.x).toBe(item.x + item.rect.w + 4);
    expect(l.titleMark!.x).toBe(16 + measure(LABELS.title, 'semibold') + 4);
  });

  it('en ancho suficiente título y leyenda comparten fila; en estrecho la leyenda baja', () => {
    const wide = chartLayout(980, 260, THEME, LABELS, { showLinear: true, markSize: M }, measure);
    const narrow = chartLayout(341, 260, THEME, LABELS, { showLinear: true, markSize: M }, measure);
    expect(wide.narrow).toBe(false);
    expect(wide.legend.every((i) => i.mark!.y === 0)).toBe(true);
    expect(wide.pad.top).toBe(M + 4);
    expect(narrow.narrow).toBe(true);
    expect(narrow.legend.every((i) => i.mark!.y >= M)).toBe(true);
    expect(narrow.pad.top).toBeGreaterThan(wide.pad.top);
  });

  it('si ni juntas caben en una fila, cada curva ocupa la suya', () => {
    const l = chartLayout(240, 400, THEME, LABELS, { showLinear: true, markSize: M }, measure);
    const rows = l.legend.map((i) => i.mark!.y);
    expect(new Set(rows).size).toBe(2);
    expect(l.pad.top).toBe(M * 3 + 4);
  });

  it('el título y las marcas de una fila quedan centrados con su texto', () => {
    const l = chartLayout(700, 260, THEME, LABELS, { showLinear: true, markSize: M }, measure);
    expect(l.titleBaselineY).toBeGreaterThan(M / 2);
    expect(l.titleBaselineY).toBeLessThan(M);
  });
});
