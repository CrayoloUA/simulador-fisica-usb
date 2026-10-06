import { describe, expect, it } from 'vitest';
import type { Sample } from '../engine/types';
import { chartYMaxDeg, drawChart, timeTicks, type ChartLabels } from './drawChart';
import type { CanvasTheme } from './theme';

/** Colores distintos y reconocibles: así las pruebas identifican cada trazo por su color. */
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
};

const LABELS: ChartLabels = { title: 'Ángulo (θ) en el tiempo (s)', simulated: 'Simulación', linear: 'Ángulo pequeño' };
const WITH_LINEAR = { showLinear: true, labels: LABELS };
const ONLY_SIM = { showLinear: false, labels: LABELS };

interface Stroke {
  color: string;
  dash: number[];
  points: number[][];
}

/** Contexto falso: registra cada trazo (color, punteado y puntos), cada texto y cada círculo. */
function fakeContext() {
  const strokes: Stroke[] = [];
  const texts: string[] = [];
  const arcs: Array<{ x: number; y: number; r: number }> = [];
  let points: number[][] = [];
  let strokeStyle = '';
  let dash: number[] = [];
  const noop = () => undefined;
  const ctx = new Proxy(
    {},
    {
      get: (_t, name: string) => {
        if (name === 'beginPath') return () => (points = []);
        if (name === 'moveTo' || name === 'lineTo') return (x: number, y: number) => points.push([x, y]);
        if (name === 'stroke') return () => strokes.push({ color: strokeStyle, dash, points });
        if (name === 'setLineDash') return (d: number[]) => (dash = d);
        if (name === 'fillText') return (text: string) => texts.push(text);
        if (name === 'arc') return (x: number, y: number, r: number) => arcs.push({ x, y, r });
        if (name === 'measureText') return (text: string) => ({ width: text.length * 8 });
        return noop;
      },
      set: (_t, name: string, value: unknown) => {
        if (name === 'strokeStyle') strokeStyle = String(value);
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, strokes, texts, arcs };
}

function makeSamples(n: number): Sample[] {
  return Array.from({ length: n }, (_, i) => ({
    t: i * 0.01,
    values: { theta: Math.cos(i * 0.01) },
    theory: { theta: Math.cos(i * 0.01) },
  }));
}

const seriesOf = (strokes: Stroke[], color: string) => strokes.filter((s) => s.color === color);

describe('chartYMaxDeg', () => {
  it('sube a pasos de 5° dejando un 12 % de aire sobre el ángulo inicial', () => {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    expect(chartYMaxDeg(rad(10))).toBe(15);
    expect(chartYMaxDeg(rad(15))).toBe(20);
    expect(chartYMaxDeg(rad(60))).toBe(70);
  });

  it('nunca baja de 5°', () => {
    expect(chartYMaxDeg((1 * Math.PI) / 180)).toBe(5);
  });
});

describe('drawChart', () => {
  it('limita los puntos dibujados por serie y conserva la muestra más reciente', () => {
    const { ctx, strokes } = fakeContext();
    drawChart(ctx, 700, 220, makeSamples(1000), 0.2, THEME, WITH_LINEAR);
    const [sim] = seriesOf(strokes, THEME.curveSim);
    expect(sim.points.length).toBeLessThanOrEqual(300);
    expect(sim.points.length).toBeGreaterThan(200);
    // Último punto: t = 9,99 s sobre una ventana de 10 s, con margen izquierdo de 56 px y derecho de 16.
    const last = sim.points[sim.points.length - 1];
    expect(last[0]).toBeCloseTo(56 + (9.99 / 10) * (700 - 56 - 16), 6);
  });

  it('con pocas muestras dibuja todas, en las dos series', () => {
    const { ctx, strokes } = fakeContext();
    drawChart(ctx, 700, 220, makeSamples(50), 0.2, THEME, WITH_LINEAR);
    expect(seriesOf(strokes, THEME.curveSim)[0].points).toHaveLength(50);
    expect(seriesOf(strokes, THEME.curveLinear)[0].points).toHaveLength(50);
  });

  it('dibuja primero la simulada (sólida) y después la de comparación (punteada) encima', () => {
    const { ctx, strokes } = fakeContext();
    drawChart(ctx, 700, 220, makeSamples(50), 0.2, THEME, WITH_LINEAR);
    const curves = strokes.filter((s) => s.color === THEME.curveSim || s.color === THEME.curveLinear);
    const sim = curves.findIndex((s) => s.color === THEME.curveSim && s.points.length === 50);
    const lin = curves.findIndex((s) => s.color === THEME.curveLinear && s.points.length === 50);
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(lin).toBeGreaterThan(sim);
    expect(curves[sim].dash).toEqual([]);
    expect(curves[lin].dash).toEqual(THEME.dashLong);
  });

  it('sin comparar no dibuja la curva punteada ni su leyenda, pero sí la simulada y el título', () => {
    const { ctx, strokes, texts } = fakeContext();
    drawChart(ctx, 700, 220, makeSamples(50), 0.2, THEME, ONLY_SIM);
    expect(seriesOf(strokes, THEME.curveSim).length).toBeGreaterThan(0);
    expect(seriesOf(strokes, THEME.curveLinear)).toHaveLength(0);
    expect(texts).toContain(LABELS.title);
    expect(texts).not.toContain(LABELS.simulated);
    expect(texts).not.toContain(LABELS.linear);
  });

  it('al comparar, la leyenda nombra las dos curvas con los textos recibidos', () => {
    const { ctx, texts } = fakeContext();
    drawChart(ctx, 700, 220, makeSamples(50), 0.2, THEME, WITH_LINEAR);
    expect(texts).toContain('Simulación');
    expect(texts).toContain('Ángulo pequeño');
  });

  it('rotula la escala de θ con el signo menos tipográfico y los segundos sin unidad', () => {
    const { ctx, texts } = fakeContext();
    drawChart(ctx, 700, 220, makeSamples(50), (10 * Math.PI) / 180, THEME, ONLY_SIM);
    expect(texts).toEqual(expect.arrayContaining(['+15°', '0°', '−15°']));
    expect(texts).toEqual(expect.arrayContaining(['0', '2', '4', '6', '8', '10']));
  });

  it('marca el instante actual con un punto sobre la última muestra', () => {
    const { ctx, arcs } = fakeContext();
    drawChart(ctx, 700, 220, makeSamples(50), 0.2, THEME, ONLY_SIM);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].r).toBe(THEME.dotRadius);
    expect(arcs[0].x).toBeCloseTo(56 + (0.49 / 10) * (700 - 56 - 16), 6);
  });

  it('usa solo los colores del tema', () => {
    const { ctx, strokes } = fakeContext();
    drawChart(ctx, 700, 220, makeSamples(50), 0.2, THEME, WITH_LINEAR);
    const allowed = new Set(Object.values(THEME).filter((v): v is string => typeof v === 'string'));
    for (const stroke of strokes) expect(allowed.has(stroke.color)).toBe(true);
  });

  it('en un ancho estrecho la leyenda baja a otra fila (más margen superior)', () => {
    const wide = fakeContext();
    const narrow = fakeContext();
    drawChart(wide.ctx, 700, 220, makeSamples(50), 0.2, THEME, WITH_LINEAR);
    drawChart(narrow.ctx, 380, 220, makeSamples(50), 0.2, THEME, WITH_LINEAR);
    // El eje θ = 0 queda más abajo cuando la leyenda ocupa su propia fila.
    const axisY = (strokes: Stroke[]) => strokes.find((s) => s.color === THEME.lineStrong)!.points[0][1];
    expect(axisY(narrow.strokes)).toBeGreaterThan(axisY(wide.strokes));
  });

  it('no dibuja nada con cero muestras', () => {
    const { ctx, strokes, texts } = fakeContext();
    drawChart(ctx, 700, 220, [], 0.2, THEME, WITH_LINEAR);
    expect(strokes).toHaveLength(0);
    expect(texts).toHaveLength(0);
  });
});

describe('timeTicks', () => {
  it('con la ventana inicial marca 0, 2, 4, 6, 8 y 10 s', () => {
    expect(timeTicks(0, 10)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('cuando la ventana avanza, las marcas siguen siendo múltiplos de 2 s', () => {
    expect(timeTicks(3.3, 13.3)).toEqual([4, 6, 8, 10, 12]);
  });
});
