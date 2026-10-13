/*
 * ¿El navegador dibuja MathML de verdad? (Chrome desde la 109, Firefox y Safari sí.) Los navegadores
 * viejos tratan <math> como texto corrido: no dan error, pero la fracción queda en una sola línea.
 * Por eso no basta preguntar si el elemento existe: se mide si una fracción ocupa más alto que su
 * propio numerador. La medición necesita `document`; todo lo demás es puro y se prueba en Vitest.
 */

export const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

/** Una fracción apilada mide cerca del doble que una de sus celdas; "dibujada" como texto, lo mismo. */
const STACKED_RATIO = 1.4;

/** `true` si la fracción es claramente más alta que una de sus celdas (el numerador, en una línea). */
export function fractionIsStacked(fractionHeight: number, cellHeight: number): boolean {
  return Number.isFinite(fractionHeight) && Number.isFinite(cellHeight) && cellHeight > 0 && fractionHeight >= cellHeight * STACKED_RATIO;
}

/** Lo mínimo del documento que usa la prueba: se puede sustituir por un documento falso. */
export type ProbeDocument = Pick<Document, 'createElement' | 'createElementNS' | 'body'>;

/** Mide en `doc` una fracción MathML contra una línea de texto. Devuelve `false` ante cualquier fallo. */
export function detectMathML(doc: ProbeDocument | undefined): boolean {
  if (!doc || !doc.body) return false;
  const host = doc.createElement('div');
  try {
    host.style.position = 'absolute';
    host.style.visibility = 'hidden';
    host.style.pointerEvents = 'none';
    host.style.left = '0';
    host.style.top = '0';
    host.setAttribute('aria-hidden', 'true');

    const math = doc.createElementNS(MATHML_NAMESPACE, 'math');
    const fraction = doc.createElementNS(MATHML_NAMESPACE, 'mfrac');
    const cells = ['1', '2'].map((digit) => {
      const cell = doc.createElementNS(MATHML_NAMESPACE, 'mn');
      cell.textContent = digit;
      fraction.append(cell);
      return cell;
    });
    math.append(fraction);
    host.append(math);
    doc.body.append(host);

    // Con MathML, numerador y denominador van uno sobre otro: la fracción mide más que una celda.
    // Sin MathML, todo es texto en una línea y mide lo mismo que una celda.
    return fractionIsStacked(fraction.getBoundingClientRect().height, cells[0].getBoundingClientRect().height);
  } catch {
    return false;
  } finally {
    host.remove();
  }
}

let cached: boolean | undefined;

/** Resultado de `detectMathML(document)`, calculado una sola vez; `false` donde no hay `document`. */
export function supportsMathML(): boolean {
  if (cached === undefined) cached = typeof document === 'undefined' ? false : detectMathML(document);
  return cached;
}
