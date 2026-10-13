import tokensCss from '../tokens.css?raw';
import { describe, expect, it } from 'vitest';
import { cssLengthToPx, parseDashArray, readCanvasTheme } from './theme';

describe('cssLengthToPx', () => {
  it('convierte rem y px', () => {
    expect(cssLengthToPx('1rem', 16, 0)).toBe(16);
    expect(cssLengthToPx('1.125rem', 16, 0)).toBeCloseTo(18);
    expect(cssLengthToPx(' 14px ', 16, 0)).toBe(14);
  });

  it('usa el valor de respaldo si no entiende la unidad', () => {
    expect(cssLengthToPx('2em', 16, 99)).toBe(99);
    expect(cssLengthToPx('', 16, 99)).toBe(99);
  });
});

describe('parseDashArray', () => {
  it('convierte el punteado de los tokens', () => {
    expect(parseDashArray('6 6')).toEqual([6, 6]);
    expect(parseDashArray(' 9 6 ')).toEqual([9, 6]);
  });

  it('devuelve vacío (línea continua) si no lo entiende', () => {
    expect(parseDashArray('')).toEqual([]);
    expect(parseDashArray('none')).toEqual([]);
  });
});

describe('readCanvasTheme', () => {
  const vars: Record<string, string> = {
    '--surface': ' #fdfcf9 ',
    '--line': '#dad7cf',
    '--line-strong': '#6d7584',
    '--ink': '#141a29',
    '--ink-soft': '#3b4253',
    '--accent': '#0f3f9c',
    '--curve-sim': '#03379a',
    '--curve-linear': '#e16c10',
    '--font-sans': "'IBM Plex Sans', sans-serif",
    '--text-small': '1rem',
    '--s2': '8px',
    '--s6': '32px',
    '--stroke-rod': '3px',
    '--stroke-curve2': '2.5px',
    '--dash': '6 6',
    '--dash2': '9 6',
    '--ball-r': '22px',
    '--ball-k': '8px',
    '--mark': '2.75rem',
  };
  const styles = { getPropertyValue: (name: string) => vars[name] ?? '' };

  it('lee cada token de color y recorta los espacios', () => {
    const theme = readCanvasTheme(styles);
    expect(theme.surface).toBe('#fdfcf9');
    expect(theme.curveSim).toBe('#03379a');
    expect(theme.curveLinear).toBe('#e16c10');
    expect(theme.fontSans).toBe("'IBM Plex Sans', sans-serif");
  });

  it('convierte el tamaño de texto con la fuente raíz recibida', () => {
    expect(readCanvasTheme(styles, 16).textSize).toBe(16);
    expect(readCanvasTheme(styles, 20).textSize).toBe(20);
  });

  it('lee espaciados, trazos, punteados y medidas de la bolita', () => {
    const theme = readCanvasTheme(styles);
    expect(theme.space.s2).toBe(8);
    expect(theme.space.s6).toBe(32);
    expect(theme.stroke.rod).toBe(3);
    expect(theme.stroke.curveLinear).toBe(2.5);
    expect(theme.dash).toEqual([6, 6]);
    expect(theme.dashLong).toEqual([9, 6]);
    expect(theme.ballRadius).toBe(22);
    expect(theme.ballPerSqrtKg).toBe(8);
  });

  it('lee el lado de las marcas de ayuda (--mark) y el token real mide 44 px', () => {
    expect(readCanvasTheme(styles).markSize).toBe(44);
    expect(tokensCss).toMatch(/--mark:\s*2\.75rem;/);
    expect(tokensCss).toMatch(/--mark-ic:\s*1\.75rem;/);
  });
});

/* ---------- Contraste de la curva punteada (tokens.css) ---------- */
// Un trazo gráfico necesita 3:1 contra su fondo (WCAG 1.4.11); se pide 3,9:1 para dejar margen.
const MIN_CURVE_CONTRAST = 3.9;


/** Valor de un token dentro de un bloque: el de respaldo en hex o el de `@supports` en OKLCH. */
function tokenValues(name: string): { hex: string; oklch: string } {
  const all = [...tokensCss.matchAll(new RegExp(`--${name}:\s*([^;]+);`, 'g'))].map((m) => m[1].trim());
  const hex = all.find((v) => v.startsWith('#'));
  const oklch = all.find((v) => v.startsWith('oklch('));
  if (!hex || !oklch) throw new Error(`falta el token --${name} en hex u OKLCH`);
  return { hex, oklch };
}

function srgbFromHex(hex: string): number[] {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
}

/** OKLCH a sRGB (matriz de Björn Ottosson), recortado al rango. */
function srgbFromOklch(value: string): number[] {
  const [l, c, h] = /oklch\(([^)]+)\)/.exec(value)![1].split(/\s+/).map(Number);
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ];
  const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.abs(v) ** (1 / 2.4) - 0.055);
  return linear.map((v) => Math.min(1, Math.max(0, encode(v))));
}

function relativeLuminance(rgb: number[]): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

function contrast(a: number[], b: number[]): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('contraste de la curva punteada de comparación', () => {
  const surface = tokenValues('surface');
  const paper = tokenValues('paper');
  const linear = tokenValues('curve-linear');
  const sim = tokenValues('curve-sim');

  it('en hex (respaldo) llega a 3,9:1 sobre el papel y sobre la superficie', () => {
    expect(contrast(srgbFromHex(linear.hex), srgbFromHex(paper.hex))).toBeGreaterThanOrEqual(MIN_CURVE_CONTRAST);
    expect(contrast(srgbFromHex(linear.hex), srgbFromHex(surface.hex))).toBeGreaterThanOrEqual(MIN_CURVE_CONTRAST);
  });

  it('en OKLCH llega a 3,9:1 sobre el papel y sobre la superficie', () => {
    expect(contrast(srgbFromOklch(linear.oklch), srgbFromOklch(paper.oklch))).toBeGreaterThanOrEqual(MIN_CURVE_CONTRAST);
    expect(contrast(srgbFromOklch(linear.oklch), srgbFromOklch(surface.oklch))).toBeGreaterThanOrEqual(MIN_CURVE_CONTRAST);
  });

  it('el hex y el OKLCH son el mismo color (diferencia de luminancia menor a 0,02)', () => {
    const diff = Math.abs(relativeLuminance(srgbFromHex(linear.hex)) - relativeLuminance(srgbFromOklch(linear.oklch)));
    expect(diff).toBeLessThan(0.02);
  });

  it('la curva azul sigue distinguible: mucho más oscura que la naranja', () => {
    expect(relativeLuminance(srgbFromHex(sim.hex))).toBeLessThan(relativeLuminance(srgbFromHex(linear.hex)) / 3);
    expect(contrast(srgbFromHex(sim.hex), srgbFromHex(linear.hex))).toBeGreaterThanOrEqual(2.2);
  });
});

describe('contraste de las marcas de ayuda y su aviso', () => {
  // El borde y el ? de la marca (azul de acento) son gráficos: 3:1 como mínimo (WCAG 1.4.11). Abierta, el ?
  // claro va sobre el azul lleno y se lee como texto: 4,5:1. El aviso fijo es texto sobre el papel.
  const surface = tokenValues('surface');
  const sunken = tokenValues('paper-sunken');
  const paper = tokenValues('paper');
  const accent = tokenValues('accent');
  const onAccent = tokenValues('on-accent');
  const inkSoft = tokenValues('ink-soft');
  const rgbOf = (token: { hex: string; oklch: string }, mode: 'hex' | 'oklch') =>
    mode === 'hex' ? srgbFromHex(token.hex) : srgbFromOklch(token.oklch);

  for (const mode of ['hex', 'oklch'] as const) {
    it(`en ${mode}: la marca contrasta al menos 3:1 sobre la superficie del dibujo y sobre el panel gris`, () => {
      expect(contrast(rgbOf(accent, mode), rgbOf(surface, mode))).toBeGreaterThanOrEqual(3);
      expect(contrast(rgbOf(accent, mode), rgbOf(sunken, mode))).toBeGreaterThanOrEqual(3);
      expect(contrast(rgbOf(accent, mode), rgbOf(paper, mode))).toBeGreaterThanOrEqual(3);
    });

    it(`en ${mode}: la marca abierta (? claro sobre azul) llega a 4,5:1 y el aviso sobre el papel también`, () => {
      expect(contrast(rgbOf(onAccent, mode), rgbOf(accent, mode))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgbOf(inkSoft, mode), rgbOf(paper, mode))).toBeGreaterThanOrEqual(4.5);
    });
  }
});
