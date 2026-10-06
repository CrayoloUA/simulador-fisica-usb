/**
 * Colores, tipografía y medidas del dibujo en canvas. No se escriben a mano: se leen de los tokens
 * de `src/tokens.css` (variables CSS), para que el canvas cambie junto con el resto de la interfaz.
 */
export type SpaceKey = 's1' | 's2' | 's3' | 's4' | 's5' | 's6' | 's7' | 's8';

export interface CanvasTheme {
  surface: string;
  line: string;
  lineStrong: string;
  ink: string;
  inkSoft: string;
  accent: string;
  curveSim: string;
  curveLinear: string;
  /** Pila de la fuente de la interfaz, lista para `ctx.font`. */
  fontSans: string;
  /** Tamaño mínimo de texto (--text-small) en px: todo el texto del dibujo usa este tamaño. */
  textSize: number;
  /** Escala de espaciado (--s1 a --s8) en px. */
  space: Record<SpaceKey, number>;
  /** Grosores de trazo en px. */
  stroke: { hair: number; bold: number; thin: number; rod: number; curve: number; curveLinear: number; support: number };
  /** Punteado corto (referencias) y largo (curva de comparación). */
  dash: number[];
  dashLong: number[];
  /** Punto móvil de la curva, apoyo y bolita (radio base y aumento por raíz de la masa), en px. */
  dotRadius: number;
  pivotRadius: number;
  ballRadius: number;
  ballPerSqrtKg: number;
}

/** Lo único que se necesita de `getComputedStyle`: así se puede probar sin navegador. */
export interface StyleReader {
  getPropertyValue(name: string): string;
}

/** Convierte "1rem" o "16px" a píxeles. Devuelve `fallback` si el valor no se entiende. */
export function cssLengthToPx(value: string, rootFontPx: number, fallback: number): number {
  const match = /^\s*(-?\d*\.?\d+)\s*(px|rem)\s*$/.exec(value);
  if (!match) return fallback;
  const amount = Number(match[1]);
  return match[2] === 'rem' ? amount * rootFontPx : amount;
}

/** Convierte un punteado como "6 6" en `[6, 6]`; vacío si el valor no se entiende. */
export function parseDashArray(value: string): number[] {
  const parts = value.trim().split(/[\s,]+/).map(Number);
  return parts.length > 0 && parts.every((n) => Number.isFinite(n) && n >= 0) && value.trim() !== '' ? parts : [];
}

const SPACE_KEYS: SpaceKey[] = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];

/**
 * Lee el tema una vez (al montar y al cambiar de tamaño), no en cada fotograma: pedir estilos
 * calculados 60 veces por segundo fuerza recálculos de estilo innecesarios.
 */
export function readCanvasTheme(styles: StyleReader, rootFontPx = 16): CanvasTheme {
  const read = (name: string) => styles.getPropertyValue(name).trim();
  const px = (name: string) => cssLengthToPx(read(name), rootFontPx, 0);
  return {
    surface: read('--surface'),
    line: read('--line'),
    lineStrong: read('--line-strong'),
    ink: read('--ink'),
    inkSoft: read('--ink-soft'),
    accent: read('--accent'),
    curveSim: read('--curve-sim'),
    curveLinear: read('--curve-linear'),
    fontSans: read('--font-sans'),
    textSize: cssLengthToPx(read('--text-small'), rootFontPx, rootFontPx),
    space: Object.fromEntries(SPACE_KEYS.map((key) => [key, px(`--${key}`)])) as Record<SpaceKey, number>,
    stroke: {
      hair: px('--hair'),
      bold: px('--bold'),
      thin: px('--stroke-thin'),
      rod: px('--stroke-rod'),
      curve: px('--stroke-curve'),
      curveLinear: px('--stroke-curve2'),
      support: px('--support'),
    },
    dash: parseDashArray(read('--dash')),
    dashLong: parseDashArray(read('--dash2')),
    dotRadius: px('--dot-r'),
    pivotRadius: px('--pivot-r'),
    ballRadius: px('--ball-r'),
    ballPerSqrtKg: px('--ball-k'),
  };
}
