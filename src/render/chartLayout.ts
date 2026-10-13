import type { Rect } from './geometry';
import type { CanvasTheme } from './theme';

/** Por debajo de este ancho la leyenda baja a una segunda fila. */
export const NARROW_PX = 560;

/** Textos del dibujo: los pone la interfaz (lenguaje para niños), el dibujo solo los coloca. */
export interface ChartLabels {
  title: string;
  simulated: string;
  linear: string;
}

/** Mide el ancho de un texto con la tipografía del dibujo (normal o seminegrita). */
export type MeasureText = (text: string, weight: 'regular' | 'semibold') => number;

export interface LegendItem {
  key: 'simulated' | 'linear';
  label: string;
  /** Inicio del trazo de muestra y línea base del nombre (px CSS). */
  x: number;
  baselineY: number;
  /** Largo del trazo de muestra. */
  swatchW: number;
  /** Caja de la muestra con su nombre. */
  rect: Rect;
  /** Caja de la marca de ayuda de esta curva (solo con las marcas encendidas). */
  mark: Rect | null;
}

export interface ChartLayout {
  narrow: boolean;
  pad: { left: number; right: number; top: number; bottom: number };
  /** Zona donde se dibujan las curvas. */
  plot: Rect;
  titleBaselineY: number;
  /** Marca de ayuda de la gráfica, pegada al final del título (solo con las marcas encendidas). */
  titleMark: Rect | null;
  /** Vacía si no hay leyenda. */
  legend: LegendItem[];
}

export interface ChartLayoutOptions {
  showLinear: boolean;
  /**
   * Lado de las marcas de ayuda en px; 0 es la pantalla normal. Con marcas encendidas la leyenda se
   * muestra siempre (aunque no se compare), cada nombre deja sitio a su marca y las filas de arriba
   * miden lo que una marca.
   */
  markSize?: number;
}

/**
 * Geometría de la gráfica: márgenes, zona de curvas, título y leyenda. La usan el dibujo
 * (`drawChart`) y la capa de marcas de ayuda, para que ambos coincidan al píxel. En la pantalla
 * normal (sin marcas) reproduce exactamente la disposición de siempre.
 */
export function chartLayout(
  width: number,
  height: number,
  theme: CanvasTheme,
  labels: ChartLabels,
  options: ChartLayoutOptions,
  measure: MeasureText,
): ChartLayout {
  const { showLinear, markSize = 0 } = options;
  const { s1, s2, s4, s5, s6, s7 } = theme.space;
  const swatchW = s6 + s1;
  const entryWidth = (label: string) => swatchW + s2 + measure(label, 'regular');
  const sim = { key: 'simulated' as const, label: labels.simulated };
  const lin = { key: 'linear' as const, label: labels.linear };
  const widthLimited = width < NARROW_PX;

  if (markSize === 0) {
    const narrow = widthLimited;
    const pad = { left: s7 + s2, right: s4, top: s6 + s2 + (showLinear && narrow ? s5 : 0), bottom: s6 };
    const legend: LegendItem[] = [];
    if (showLinear) {
      const simW = entryWidth(labels.simulated);
      const linW = entryWidth(labels.linear);
      const baselineY = narrow ? s6 + s2 + s1 : s5 - s1;
      const originX = narrow ? s4 : width - pad.right - simW - s5 - linW;
      const place = (item: { key: LegendItem['key']; label: string }, x: number, w: number): LegendItem => ({
        ...item,
        x,
        baselineY,
        swatchW,
        rect: { x, y: baselineY - theme.textSize, w, h: theme.textSize + s2 },
        mark: null,
      });
      legend.push(place(sim, originX, simW), place(lin, originX + simW + s5, linW));
    }
    return {
      narrow,
      pad,
      plot: { x: pad.left, y: pad.top, w: width - pad.left - pad.right, h: height - pad.top - pad.bottom },
      titleBaselineY: s5 - s1,
      titleMark: null,
      legend,
    };
  }

  // Con marcas: cada fila de arriba mide una marca; título y leyenda llevan la suya al lado.
  const M = markSize;
  const slot = s1 + M;
  const baselineOf = (rowTop: number) => rowTop + M / 2 + Math.round(theme.textSize / 3);
  const items = showLinear ? [sim, lin] : [sim];
  const widths = items.map((item) => entryWidth(item.label));
  const legendTotal = widths.reduce((sum, w) => sum + w + slot, 0) + s5 * (items.length - 1);
  const titleEnd = s4 + measure(labels.title, 'semibold');
  const titleMark: Rect = { x: titleEnd + s1, y: 0, w: M, h: M };
  const right = width - s4;

  // Una sola fila (título y leyenda juntos) solo si cabe; si no, la leyenda baja a su propia fila
  // y, si tampoco cabe junta, cada curva ocupa una fila.
  const oneRow = !widthLimited && rectRightOf(titleMark) + s5 + legendTotal <= right;
  const legendOnOwnRow = !oneRow && s4 + legendTotal <= right;
  const legendRows = oneRow ? 0 : legendOnOwnRow ? 1 : items.length;
  const pad = { left: s7 + s2, right: s4, top: M * (1 + legendRows) + s1, bottom: s6 };

  const legend: LegendItem[] = [];
  let x = oneRow ? right - legendTotal : s4;
  items.forEach((item, index) => {
    const rowTop = oneRow ? 0 : legendOnOwnRow ? M : M * (1 + index);
    if (!oneRow && !legendOnOwnRow) x = s4;
    const baselineY = baselineOf(rowTop);
    const w = widths[index];
    legend.push({
      ...item,
      x,
      baselineY,
      swatchW,
      rect: { x, y: baselineY - theme.textSize, w, h: theme.textSize + s2 },
      mark: { x: x + w + s1, y: rowTop, w: M, h: M },
    });
    x += w + slot + s5;
  });

  return {
    narrow: !oneRow,
    pad,
    plot: { x: pad.left, y: pad.top, w: width - pad.left - pad.right, h: height - pad.top - pad.bottom },
    titleBaselineY: baselineOf(0),
    titleMark,
    legend,
  };
}

const rectRightOf = (r: Rect) => r.x + r.w;
