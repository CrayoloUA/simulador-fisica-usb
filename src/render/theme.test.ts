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
});
