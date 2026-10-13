import { Fragment, useRef, type ReactNode } from 'react';
import { countStructure, equationPlainText, toPlainText } from '../content/equations';
import type { Equation, MathNode } from '../content/types';
import { supportsMathML } from './mathSupport';
import { useOverflowing } from './useOverflowing';

interface Props {
  equation: Equation;
  /** Nombre de la caja cuando hay que desplazarla con el teclado ("Ecuación 2 de 5"). */
  label: string;
  /** Solo para pruebas: fuerza el modo con o sin MathML. Sin él, se mide el navegador. */
  mathml?: boolean;
}

/** Signos de la pantalla: el árbol guarda `·` (igual que el texto plano); aquí va el punto matemático. */
const DISPLAY_OPERATOR: Record<string, string> = { '·': '⋅' };
const PRIMES = ['′', '″', '‴'];

/** `true` si la expresión tiene algo más alto que una línea de texto. */
function isTall(node: MathNode): boolean {
  const count = countStructure(node);
  return count.fractions + count.roots + count.sums > 0;
}

/** Un solo elemento MathML (las filas se envuelven en <mrow>): lo que piden <mfrac>, <msub>, etc. */
function one(node: MathNode): ReactNode {
  return node.k === 'row' ? <mrow>{many(node)}</mrow> : render(node);
}

/** Los hijos de una expresión como lista (una fila se abre; lo demás es un solo elemento). */
function many(node: MathNode): ReactNode {
  const items = node.k === 'row' ? node.c : [node];
  return items.map((item, index) => <Fragment key={index}>{render(item)}</Fragment>);
}

function render(node: MathNode): ReactNode {
  switch (node.k) {
    case 'num':
      return <mn>{node.v}</mn>;
    case 'id':
      return node.upright ? <mi mathvariant="normal">{node.v}</mi> : <mi>{node.v}</mi>;
    case 'fn':
      return <mi>{node.v}</mi>;
    case 'op':
      return <mo>{DISPLAY_OPERATOR[node.v] ?? node.v}</mo>;
    case 'gap':
      return <mspace className="eq-gap" />;
    case 'row':
      return <mrow>{many(node)}</mrow>;
    case 'frac':
      return (
        <mfrac>
          {one(node.n)}
          {one(node.d)}
        </mfrac>
      );
    case 'sqrt':
      return <msqrt>{many(node.c)}</msqrt>;
    case 'sub':
      return (
        <msub>
          {one(node.b)}
          {one(node.s)}
        </msub>
      );
    case 'sup':
      return (
        <msup>
          {one(node.b)}
          {one(node.p)}
        </msup>
      );
    case 'subsup':
      return (
        <msubsup>
          {one(node.b)}
          {one(node.s)}
          {one(node.p)}
        </msubsup>
      );
    case 'prime':
      return (
        <msup>
          {one(node.b)}
          <mo>{PRIMES[node.count - 1]}</mo>
        </msup>
      );
    case 'paren': {
      // Los signos se estiran solo si encierran algo alto (fracción, raíz, sumatoria); alrededor de
      // un argumento como (φ₀) quedan del tamaño de la letra. Sin espacios extra por dentro.
      const stretchy = isTall(node.c);
      return (
        <mrow>
          <mo stretchy={stretchy ? 'true' : 'false'} lspace="0em" rspace="0em">
            {node.open === '[' ? '[' : '('}
          </mo>
          {many(node.c)}
          <mo stretchy={stretchy ? 'true' : 'false'} lspace="0em" rspace="0em">
            {node.open === '[' ? ']' : ')'}
          </mo>
        </mrow>
      );
    }
    case 'sum':
      return (
        <mrow>
          <munderover>
            <mo>∑</mo>
            {one(node.from)}
            {one(node.to)}
          </munderover>
          {many(node.body)}
        </mrow>
      );
  }
}

/**
 * Una ecuación de la hoja de Teoría. Con MathML (navegadores actuales) dibuja fracciones, raíces,
 * subíndices y sumatoria; las palabras que la acompañan quedan como texto corriente. Sin MathML
 * (Chrome anterior a la 109) muestra el texto plano de respaldo, que sale del mismo árbol.
 *
 * Accesibilidad: cada <math> lleva como nombre el texto plano de su expresión (un lector de pantalla
 * lo lee de corrido, sin depender de cómo interprete el MathML). Si una ecuación es más ancha que la
 * hoja (la serie en un celular), la caja se desplaza con el teclado: solo entonces entra en el orden
 * de Tab, como región con nombre.
 */
export function Formula({ equation, label, mathml }: Props) {
  const native = mathml ?? supportsMathML();
  const boxRef = useRef<HTMLDivElement>(null);
  const overflowing = useOverflowing(boxRef);

  return (
    <>
      <div
        ref={boxRef}
        className="eq"
        data-mathml={native ? 'true' : 'false'}
        tabIndex={overflowing ? 0 : undefined}
        role={overflowing ? 'region' : undefined}
        aria-label={overflowing ? label : undefined}
      >
        {native ? (
          <div className="eq-line">
            {equation.parts.map((part, index) =>
              part.kind === 'text' ? (
                <Fragment key={index}>{part.text}</Fragment>
              ) : (
                <math key={index} aria-label={toPlainText(part.node)}>
                  {many(part.node)}
                </math>
              ),
            )}
          </div>
        ) : (
          <div className="eq-line eq-plain">{equationPlainText(equation)}</div>
        )}
      </div>
      {overflowing && <p className="mut eq-hint">Esta ecuación es larga: desliza hacia los lados para verla completa.</p>}
    </>
  );
}
