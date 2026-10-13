import { describe, expect, it } from 'vitest';
import { detectMathML, fractionIsStacked, MATHML_NAMESPACE, type ProbeDocument } from './mathSupport';

describe('fractionIsStacked: una fracción apilada es más alta que su numerador', () => {
  it('el doble de alto cuenta como apilada', () => {
    expect(fractionIsStacked(38, 21)).toBe(true);
  });

  it('la misma altura que una celda (el <math> tratado como texto) no cuenta', () => {
    expect(fractionIsStacked(21, 21)).toBe(false);
    expect(fractionIsStacked(0, 21)).toBe(false);
  });

  it('con una celda de referencia de 0 o con valores raros devuelve false', () => {
    expect(fractionIsStacked(38, 0)).toBe(false);
    expect(fractionIsStacked(Number.NaN, 21)).toBe(false);
    expect(fractionIsStacked(38, Number.POSITIVE_INFINITY)).toBe(false);
  });
});

/** Documento falso mínimo: cada elemento mide lo que se le diga según su etiqueta. */
function fakeDocument(heights: { cell: number; mfrac: number }, options: { throwOnAppend?: boolean } = {}) {
  const created: string[] = [];
  const removed: string[] = [];
  function element(tag: string, ns?: string) {
    const el = {
      tag,
      ns,
      style: {} as Record<string, string>,
      children: [] as unknown[],
      textContent: '',
      setAttribute() {},
      append(...nodes: unknown[]) {
        el.children.push(...nodes);
      },
      remove() {
        removed.push(tag);
      },
      getBoundingClientRect: () => ({ height: tag === 'mn' ? heights.cell : tag === 'mfrac' ? heights.mfrac : 0 }),
    };
    created.push(ns ? `${ns}#${tag}` : tag);
    return el;
  }
  const body = {
    append() {
      if (options.throwOnAppend) throw new Error('sin cuerpo');
    },
  };
  const doc = {
    createElement: (tag: string) => element(tag),
    createElementNS: (ns: string, tag: string) => element(tag, ns),
    body,
  } as unknown as ProbeDocument;
  return { doc, created, removed };
}

describe('detectMathML: mide una fracción real en el documento', () => {
  it('con fracción del doble de alto devuelve true y usa el espacio de nombres de MathML', () => {
    const { doc, created } = fakeDocument({ cell: 20, mfrac: 40 });
    expect(detectMathML(doc)).toBe(true);
    expect(created).toContain(`${MATHML_NAMESPACE}#math`);
    expect(created).toContain(`${MATHML_NAMESPACE}#mfrac`);
  });

  it('con la fracción de la altura de una celda (navegador sin MathML) devuelve false', () => {
    expect(detectMathML(fakeDocument({ cell: 20, mfrac: 20 }).doc)).toBe(false);
  });

  it('siempre retira la sonda del documento, también cuando algo falla, y entonces devuelve false', () => {
    const ok = fakeDocument({ cell: 20, mfrac: 40 });
    detectMathML(ok.doc);
    expect(ok.removed).toContain('div');
    const broken = fakeDocument({ cell: 20, mfrac: 40 }, { throwOnAppend: true });
    expect(detectMathML(broken.doc)).toBe(false);
    expect(broken.removed).toContain('div');
  });

  it('sin documento o sin cuerpo (servidor, Vitest en node) devuelve false sin lanzar', () => {
    expect(detectMathML(undefined)).toBe(false);
    expect(detectMathML({ createElement: () => null, createElementNS: () => null, body: null } as unknown as ProbeDocument)).toBe(false);
  });
});
