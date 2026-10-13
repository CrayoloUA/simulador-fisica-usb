import type { Equation, EquationPart, MathNode } from './types';

/*
 * Ecuaciones de la hoja de Teoría como árbol (ver `MathNode`). Un solo origen para dos salidas:
 * el dibujo con MathML (`src/ui/Formula.tsx`) y el texto plano (`toPlainText`), que sirve de
 * respaldo en navegadores sin MathML y de nombre accesible. Las funciones de este archivo son
 * puras y no tocan `document`, así que corren en Vitest (entorno node).
 */

// ---------- Constructores cortos (solo para escribir los datos de abajo) ----------

const num = (v: string): MathNode => ({ k: 'num', v });
const id = (v: string, upright = false): MathNode => (upright ? { k: 'id', v, upright } : { k: 'id', v });
const fn = (v: string): MathNode => ({ k: 'fn', v });
/** Operador con espacios alrededor en el texto plano (`a + b`). */
const op = (v: string): MathNode => ({ k: 'op', v, spaced: true });
/** Operador pegado (`b·θ`, `n!`). */
const tight = (v: string): MathNode => ({ k: 'op', v, spaced: false });
const gap: MathNode = { k: 'gap' };
/** Fila: las filas anidadas se aplanan (una sola lista de símbolos, que es lo que lee el evaluador). */
const row = (...c: MathNode[]): MathNode => ({ k: 'row', c: c.flatMap((n) => (n.k === 'row' ? n.c : [n])) });
const frac = (n: MathNode, d: MathNode, spaced = false): MathNode => ({ k: 'frac', n, d, spaced });
const sqrt = (c: MathNode): MathNode => ({ k: 'sqrt', c });
const sub = (b: MathNode, s: MathNode): MathNode => ({ k: 'sub', b, s });
const sup = (b: MathNode, p: MathNode): MathNode => ({ k: 'sup', b, p });
const subsup = (b: MathNode, s: MathNode, p: MathNode): MathNode => ({ k: 'subsup', b, s, p });
const prime = (b: MathNode, count: 1 | 2 | 3): MathNode => ({ k: 'prime', b, count });
const paren = (c: MathNode): MathNode => ({ k: 'paren', c });
const bracket = (c: MathNode, pad = false): MathNode => ({ k: 'paren', c, open: '[', pad });
const sum = (from: MathNode, to: MathNode, body: MathNode): MathNode => ({ k: 'sum', from, to, body });

const text = (t: string): EquationPart => ({ kind: 'text', text: t });
const math = (node: MathNode): EquationPart => ({ kind: 'math', node });

// ---------- Texto plano ----------

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  n: 'ⁿ', '+': '⁺', '-': '⁻', '−': '⁻',
};
const SUBSCRIPT: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '−': '₋',
};

/** Pasa un texto a sub o superíndice Unicode; si algún carácter no existe, usa `_(…)` o `^(…)`. */
function script(text: string, table: Record<string, string>, fallback: '_' | '^'): string {
  const chars = [...text];
  return chars.every((ch) => ch in table) ? chars.map((ch) => table[ch]).join('') : `${fallback}(${text})`;
}

/**
 * Texto plano de una expresión: las mismas cadenas que tenía el contenido antes de pasar al árbol
 * (θ'' + (g/L)·θ + …, sen²ⁿ(φ₀/2), 2π√(L/g)).
 */
export function toPlainText(node: MathNode): string {
  switch (node.k) {
    case 'num':
    case 'id':
    case 'fn':
      return node.v;
    case 'op':
      return node.spaced ? ` ${node.v} ` : node.v;
    case 'gap':
      return ' ';
    case 'row':
      return node.c.map(toPlainText).join('');
    case 'frac':
      return `${toPlainText(node.n)}${node.spaced ? ' / ' : '/'}${toPlainText(node.d)}`;
    case 'sqrt': {
      const inner = toPlainText(node.c);
      return [...inner].length === 1 ? `√${inner}` : `√(${inner})`;
    }
    case 'sub':
      return toPlainText(node.b) + script(toPlainText(node.s), SUBSCRIPT, '_');
    case 'sup':
      return toPlainText(node.b) + script(toPlainText(node.p), SUPERSCRIPT, '^');
    case 'subsup':
      return (
        toPlainText(node.b) + script(toPlainText(node.s), SUBSCRIPT, '_') + script(toPlainText(node.p), SUPERSCRIPT, '^')
      );
    case 'prime':
      return toPlainText(node.b) + "'".repeat(node.count);
    case 'paren': {
      const inner = toPlainText(node.c);
      const [open, close] = node.open === '[' ? ['[', ']'] : ['(', ')'];
      return node.pad ? `${open} ${inner} ${close}` : `${open}${inner}${close}`;
    }
    case 'sum':
      return `Σ ${toPlainText(node.body)}`;
  }
}

/** Texto plano de una ecuación completa (prosa y matemáticas, en orden). */
export function equationPlainText(equation: Equation): string {
  return equation.parts.map((part) => (part.kind === 'text' ? part.text : toPlainText(part.node))).join('');
}

// ---------- Conteo de símbolos y estructura ----------

export interface StructureCount {
  numbers: number;
  variables: number;
  functions: number;
  operators: number;
  fractions: number;
  roots: number;
  subscripts: number;
  superscripts: number;
  primes: number;
  groups: number;
  sums: number;
}

const EMPTY_COUNT: StructureCount = {
  numbers: 0, variables: 0, functions: 0, operators: 0, fractions: 0, roots: 0,
  subscripts: 0, superscripts: 0, primes: 0, groups: 0, sums: 0,
};

function add(into: StructureCount, key: keyof StructureCount, by = 1): void {
  into[key] += by;
}

function walk(node: MathNode, into: StructureCount): void {
  switch (node.k) {
    case 'num': add(into, 'numbers'); return;
    case 'id': add(into, 'variables'); return;
    case 'fn': add(into, 'functions'); return;
    case 'op': add(into, 'operators'); return;
    case 'gap': return;
    case 'row': node.c.forEach((child) => walk(child, into)); return;
    case 'frac': add(into, 'fractions'); walk(node.n, into); walk(node.d, into); return;
    case 'sqrt': add(into, 'roots'); walk(node.c, into); return;
    case 'sub': add(into, 'subscripts'); walk(node.b, into); walk(node.s, into); return;
    case 'sup': add(into, 'superscripts'); walk(node.b, into); walk(node.p, into); return;
    case 'subsup':
      add(into, 'subscripts'); add(into, 'superscripts');
      walk(node.b, into); walk(node.s, into); walk(node.p, into);
      return;
    case 'prime': add(into, 'primes'); walk(node.b, into); return;
    case 'paren': add(into, 'groups'); walk(node.c, into); return;
    case 'sum': add(into, 'sums'); walk(node.from, into); walk(node.to, into); walk(node.body, into); return;
  }
}

/** Cuenta símbolos y estructuras de una expresión (en el árbol, no en el texto). */
export function countStructure(node: MathNode): StructureCount {
  const into = { ...EMPTY_COUNT };
  walk(node, into);
  return into;
}

/** Suma el conteo de todas las partes matemáticas de una ecuación. */
export function countEquationStructure(equation: Equation): StructureCount {
  const total = { ...EMPTY_COUNT };
  for (const part of equation.parts) {
    if (part.kind === 'math') walk(part.node, total);
  }
  return total;
}

// ---------- Ecuaciones de cada modelo ----------

const theta = id('θ');
const phi = id('φ');
const phi0 = sub(phi, num('0'));
const t0 = sub(id('T'), num('0'));
const omega0 = sub(id('ω'), num('0'));
const dot = tight('·');
const dotSpaced = op('·');
const eq = op('=');
const plus = op('+');
const half = frac(phi0, num('2'));
const sinHalf = (power: string): MathNode => row(sup(fn('sen'), num(power)), paren(half));

/** θ'' + (g/L)·[sen] θ + b·θ' = 0: con `nonLinear` lleva sen θ en lugar de θ. */
const motionEquation = (nonLinear: boolean): MathNode =>
  row(
    prime(theta, 2), plus, paren(frac(id('g'), id('L'))), dot,
    ...(nonLinear ? [fn('sen'), gap, theta] : [theta]),
    plus, id('b'), dot, prime(theta, 1), eq, num('0'),
  );

/** T₀ = 2π√(L/g). */
const basePeriod: MathNode = row(t0, eq, num('2'), id('π', true), sqrt(frac(id('L'), id('g'))));

/** Un término de la serie: (1·3 / 2·4)²·sen⁴(φ₀/2); el primero es (1/2)². */
const seriesTerm = (top: string[], bottom: string[], power: string): MathNode => {
  const product = (digits: string[]): MathNode => row(...digits.flatMap((d, i) => (i === 0 ? [num(d)] : [dot, num(d)])));
  const ratio = top.length === 1 ? frac(num(top[0]), num(bottom[0])) : frac(product(top), product(bottom), true);
  return row(sup(paren(ratio), num('2')), dot, sinHalf(power));
};

const periodOfAmplitude = row(id('T'), paren(phi0), eq);

/** Coeficiente general de la serie: (2n)! / (2²ⁿ·(n!)²). */
const seriesCoefficient: MathNode = frac(
  row(paren(row(num('2'), id('n'))), tight('!')),
  paren(row(sup(num('2'), row(num('2'), id('n'))), dot, sup(paren(row(id('n'), tight('!'))), num('2')))),
  true,
);

export const theoryEquations = {
  lineal: [
    { parts: [math(motionEquation(false))] },
    {
      parts: [
        math(row(theta, paren(id('t')), eq, id('A'), dot, fn('cos'), paren(row(omega0, id('t'), plus, phi)))),
        text(', con '),
        math(row(omega0, eq, sqrt(frac(id('g'), id('L'))))),
        text(' (sin fricción, '),
        math(row(id('b'), eq, num('0'))),
        text(')'),
      ],
    },
    { parts: [math(basePeriod)] },
  ],
  noLineal: [
    { parts: [math(motionEquation(true))] },
    {
      parts: [
        math(
          row(
            periodOfAmplitude, t0, dotSpaced,
            bracket(
              row(
                num('1'), plus, seriesTerm(['1'], ['2'], '2'), plus,
                seriesTerm(['1', '3'], ['2', '4'], '4'), plus,
                seriesTerm(['1', '3', '5'], ['2', '4', '6'], '6'), plus, tight('…'),
              ),
            ),
          ),
        ),
      ],
    },
    {
      parts: [
        math(
          row(
            periodOfAmplitude, t0, dotSpaced,
            sum(
              row(id('n'), eq, num('0')), id('∞', true),
              row(sup(bracket(seriesCoefficient, true), num('2')), dotSpaced, sup(fn('sen'), row(num('2'), id('n'))), paren(half)),
            ),
          ),
        ),
        text(', con '),
        math(id('n')),
        text(' desde 0 hasta ∞, y '),
        math(basePeriod),
      ],
    },
    {
      parts: [
        math(row(id('T'), op('≈'), t0, dotSpaced, paren(row(num('1'), plus, frac(subsup(phi, num('0'), num('2')), num('16')))))),
        text(', con '),
        math(phi0),
        text(' en radianes (solo el primer término corrector)'),
      ],
    },
    {
      parts: [
        text('La misma serie es '),
        math(row(id('T'), eq, t0, dotSpaced, frac(row(num('2'), id('K'), paren(id('k'))), id('π', true)))),
        text(', con '),
        math(row(id('k'), eq, fn('sen'), paren(half))),
        text(' (K: integral elíptica de primera especie); el programa la calcula con la media aritmético-geométrica'),
      ],
    },
  ],
} satisfies Record<'lineal' | 'noLineal', Equation[]>;
