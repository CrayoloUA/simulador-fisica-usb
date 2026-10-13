import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { countEquationStructure, equationPlainText, theoryEquations } from '../content/equations';
import { Formula } from './Formula';

const all = [...theoryEquations.lineal, ...theoryEquations.noLineal];
const markup = (index: number, mathml: boolean) =>
  renderToStaticMarkup(createElement(Formula, { equation: all[index], label: `Ecuación ${index + 1}`, mathml }));
const occurrences = (html: string, tag: string) => (html.match(new RegExp(`<${tag}[ >]`, 'g')) ?? []).length;

describe('Formula con MathML', () => {
  it('dibuja cada ecuación con tantos <mfrac>, <msqrt> y <munderover> como estructuras tiene el árbol', () => {
    all.forEach((equation, index) => {
      const html = markup(index, true);
      const count = countEquationStructure(equation);
      expect(occurrences(html, 'mfrac'), `mfrac de la ecuación ${index}`).toBe(count.fractions);
      expect(occurrences(html, 'msqrt')).toBe(count.roots);
      expect(occurrences(html, 'munderover')).toBe(count.sums);
    });
  });

  it('usa <msub> con <mi> para los subíndices, no el carácter Unicode ₀', () => {
    const html = markup(2, true); // T₀ = 2π√(L/g)
    expect(html).toContain('<msub><mi>T</mi><mn>0</mn></msub>');
    // El nombre accesible sí usa el texto plano (con ₀); lo dibujado, no.
    expect(html.replace(/aria-label="[^"]*"/g, '')).not.toMatch(/[₀-₉]/);
  });

  it('cada <math> lleva como nombre el texto plano de su expresión', () => {
    const html = markup(0, true);
    expect(html).toContain('aria-label="θ&#x27;&#x27; + (g/L)·θ + b·θ&#x27; = 0"');
  });

  it('la prosa que une las fórmulas queda como texto, fuera del <math>', () => {
    const html = markup(1, true);
    expect(html).toContain('</math>, con <math');
    expect(html).toContain('(sin fricción, ');
  });

  it('el signo de las derivadas son apóstrofos de MathML (′ y ″), no comillas', () => {
    const html = markup(0, true);
    expect(html).toContain('<mo>″</mo>');
    expect(html).toContain('<mo>′</mo>');
  });

  it('marca la caja como con MathML', () => {
    expect(markup(0, true)).toContain('data-mathml="true"');
  });
});

describe('Formula sin MathML (respaldo)', () => {
  it('muestra exactamente el texto plano y ningún elemento MathML', () => {
    all.forEach((equation, index) => {
      const html = markup(index, false);
      expect(html).not.toContain('<math');
      expect(html).toContain('data-mathml="false"');
      const plain = equationPlainText(equation).replace(/'/g, '&#x27;');
      expect(html).toContain(plain);
    });
  });
});
