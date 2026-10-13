import { describe, expect, it } from 'vitest';
import { agm, pendulumPeriodFactor } from '../engine/elliptic';
import { evaluate, rightSide } from './equationEval';
import { countEquationStructure, countStructure, equationPlainText, theoryEquations, toPlainText } from './equations';
import { simplePendulumContent } from './simplePendulumContent';
import type { Equation, MathNode } from './types';

const DEG = Math.PI / 180;

/**
 * Referencia dorada: las cadenas que tenía el contenido antes de pasar al árbol. Cualquier
 * diferencia con el texto plano que sale del árbol debe ser aprobada por el equipo (y por el
 * profesor, si cambia el sentido de una ecuación).
 */
const GOLDEN = {
  lineal: [
    "θ'' + (g/L)·θ + b·θ' = 0",
    'θ(t) = A·cos(ω₀t + φ), con ω₀ = √(g/L) (sin fricción, b = 0)',
    'T₀ = 2π√(L/g)',
  ],
  'no-lineal': [
    "θ'' + (g/L)·sen θ + b·θ' = 0",
    'T(φ₀) = T₀ · [1 + (1/2)²·sen²(φ₀/2) + (1·3 / 2·4)²·sen⁴(φ₀/2) + (1·3·5 / 2·4·6)²·sen⁶(φ₀/2) + …]',
    'T(φ₀) = T₀ · Σ [ (2n)! / (2²ⁿ·(n!)²) ]² · sen²ⁿ(φ₀/2), con n desde 0 hasta ∞, y T₀ = 2π√(L/g)',
    'T ≈ T₀ · (1 + φ₀²/16), con φ₀ en radianes (solo el primer término corrector)',
    'La misma serie es T = T₀ · 2K(k)/π, con k = sen(φ₀/2) (K: integral elíptica de primera especie); el programa la calcula con la media aritmético-geométrica',
  ],
} as const;

const num = (v: string): MathNode => ({ k: 'num', v });
const id = (v: string): MathNode => ({ k: 'id', v });

function mathOf(equation: Equation, index = 0): MathNode {
  const parts = equation.parts.filter((part) => part.kind === 'math');
  const part = parts[index];
  if (!part || part.kind !== 'math') throw new Error('Sin parte matemática');
  return part.node;
}

describe('ecuaciones: texto plano generado del árbol = cadena original', () => {
  for (const model of ['lineal', 'no-lineal'] as const) {
    it(`el modelo ${model} conserva el número, el orden y el texto de cada ecuación`, () => {
      const equations = simplePendulumContent.theoryByModel[model].equations;
      expect(equations.map(equationPlainText)).toEqual([...GOLDEN[model]]);
    });
  }

  it('el contenido toma las ecuaciones del archivo de ecuaciones (un solo origen)', () => {
    expect(simplePendulumContent.theoryByModel.lineal.equations).toBe(theoryEquations.lineal);
    expect(simplePendulumContent.theoryByModel['no-lineal'].equations).toBe(theoryEquations.noLineal);
  });
});

describe('toPlainText: reglas del texto de respaldo', () => {
  it('pasa dígitos, n y signos a sub y superíndices Unicode', () => {
    expect(toPlainText({ k: 'sub', b: id('T'), s: num('0') })).toBe('T₀');
    expect(toPlainText({ k: 'sup', b: id('x'), p: { k: 'row', c: [num('2'), id('n')] } })).toBe('x²ⁿ');
    expect(toPlainText({ k: 'subsup', b: id('φ'), s: num('0'), p: num('2') })).toBe('φ₀²');
  });

  it('si un carácter no tiene versión Unicode usa _(…) o ^(…) en vez de perderlo', () => {
    expect(toPlainText({ k: 'sup', b: id('x'), p: id('q') })).toBe('x^(q)');
    expect(toPlainText({ k: 'sub', b: id('x'), s: id('q') })).toBe('x_(q)');
  });

  it('la raíz solo lleva paréntesis cuando su contenido tiene más de un carácter', () => {
    expect(toPlainText({ k: 'sqrt', c: id('x') })).toBe('√x');
    expect(toPlainText({ k: 'sqrt', c: { k: 'frac', n: id('L'), d: id('g') } })).toBe('√(L/g)');
  });

  it('los apóstrofos, los corchetes con relleno y la fracción con espacios salen como en el original', () => {
    expect(toPlainText({ k: 'prime', b: id('θ'), count: 2 })).toBe("θ''");
    expect(toPlainText({ k: 'paren', c: id('x'), open: '[', pad: true })).toBe('[ x ]');
    expect(toPlainText({ k: 'frac', n: id('a'), d: id('b'), spaced: true })).toBe('a / b');
  });

  it('la sumatoria se escribe Σ y no repite sus límites (la frase ya los dice con palabras)', () => {
    const sum: MathNode = { k: 'sum', from: { k: 'row', c: [id('n'), { k: 'op', v: '=' }, num('0')] }, to: id('∞'), body: id('x') };
    expect(toPlainText(sum)).toBe('Σ x');
  });

  it('ninguna ecuación deja un carácter de sustitución ni texto vacío', () => {
    for (const equation of [...theoryEquations.lineal, ...theoryEquations.noLineal]) {
      const text = equationPlainText(equation);
      expect(text.trim()).not.toBe('');
      expect(text).not.toMatch(/undefined|\[object|\^\(|_\(/);
    }
  });
});

describe('countStructure: símbolos y estructura de cada ecuación', () => {
  it('T₀ = 2π√(L/g): una fracción, una raíz y un subíndice', () => {
    const count = countStructure(mathOf(theoryEquations.lineal[2]));
    expect(count).toMatchObject({ fractions: 1, roots: 1, subscripts: 1, superscripts: 0, sums: 0, numbers: 2 });
  });

  it('la ecuación de movimiento tiene dos derivadas y una fracción; solo la real lleva sen', () => {
    const lineal = countStructure(mathOf(theoryEquations.lineal[0]));
    const real = countStructure(mathOf(theoryEquations.noLineal[0]));
    expect(lineal).toMatchObject({ primes: 2, fractions: 1, functions: 0 });
    expect(real).toMatchObject({ primes: 2, fractions: 1, functions: 1 });
  });

  it('la serie escrita tiene tres sen con su potencia y cuatro fracciones de coeficiente', () => {
    const count = countStructure(mathOf(theoryEquations.noLineal[1]));
    expect(count.functions).toBe(3);
    expect(count.fractions).toBe(3 * 1 + 3); // 3 coeficientes + 3 argumentos φ₀/2
    expect(count.sums).toBe(0);
  });

  it('la sumatoria tiene una Σ, el coeficiente (2n)!/(2²ⁿ(n!)²) y el argumento φ₀/2', () => {
    const count = countStructure(mathOf(theoryEquations.noLineal[2]));
    expect(count.sums).toBe(1);
    expect(count.fractions).toBe(2);
  });

  it('countEquationStructure suma todas las partes matemáticas de una ecuación', () => {
    const second = theoryEquations.lineal[1];
    const total = countEquationStructure(second);
    expect(total.roots).toBe(1);
    expect(total.functions).toBe(1);
    expect(total.fractions).toBe(1);
  });

  it('el modelo real muestra más fracciones y una sumatoria; el lineal, ninguna sumatoria', () => {
    const totals = (equations: Equation[]) => equations.map(countEquationStructure);
    expect(totals(theoryEquations.lineal).reduce((s, c) => s + c.sums, 0)).toBe(0);
    expect(totals(theoryEquations.noLineal).reduce((s, c) => s + c.sums, 0)).toBe(1);
  });
});

describe('las ecuaciones escritas coinciden con el motor', () => {
  const noLineal = theoryEquations.noLineal;

  it('T₀ = 2π√(L/g) con L = 1 m y g = 9,8 m/s² da 2,007 s (lineal y no lineal)', () => {
    for (const node of [mathOf(theoryEquations.lineal[2]), mathOf(noLineal[2], 2)]) {
      expect(evaluate(rightSide(node), { L: 1, g: 9.8 })).toBeCloseTo(2.007, 3);
    }
  });

  it('ω₀ = √(g/L) da 3,130 rad/s con L = 1 y g = 9,8', () => {
    const omega = mathOf(theoryEquations.lineal[1], 1);
    expect(evaluate(rightSide(omega), { L: 1, g: 9.8 })).toBeCloseTo(3.13, 2);
  });

  for (const deg of [10, 30]) {
    it(`la sumatoria escrita (coeficientes ((2n)!/(2²ⁿ(n!)²))² con sen²ⁿ(φ₀/2)) a ${deg}° da el mismo T/T₀ que pendulumPeriodFactor`, () => {
      const factor = evaluate(rightSide(mathOf(noLineal[2])), { 'T₀': 1, 'φ₀': deg * DEG }, { terms: 60 });
      expect(factor).toBeCloseTo(pendulumPeriodFactor(deg * DEG), 9);
    });
  }

  it('los primeros términos escritos de la serie se acercan al factor del motor (error de orden φ₀⁸)', () => {
    const phi0 = 10 * DEG;
    const four = evaluate(rightSide(mathOf(noLineal[1])), { 'T₀': 1, 'φ₀': phi0 });
    expect(Math.abs(four - pendulumPeriodFactor(phi0))).toBeLessThan(1e-6);
  });

  it('T ≈ T₀·(1 + φ₀²/16) queda cerca del factor exacto a 10° (diferencia menor que 1e-4)', () => {
    const phi0 = 10 * DEG;
    const approx = evaluate(rightSide(mathOf(noLineal[3])), { 'T₀': 1, 'φ₀': phi0 });
    expect(Math.abs(approx - pendulumPeriodFactor(phi0))).toBeLessThan(1e-4);
  });

  for (const deg of [10, 30, 60]) {
    it(`T = T₀·2K(k)/π con k = sen(φ₀/2) equivale a T₀/AGM(1, cos(φ₀/2)) a ${deg}° (el método del motor)`, () => {
      const k = Math.sin((deg * DEG) / 2);
      // K(k) = π / (2·AGM(1, √(1−k²))), de modo que 2K(k)/π = 1 / AGM(1, √(1−k²)).
      const factor = 1 / agm(1, Math.sqrt(1 - k * k));
      expect(factor).toBeCloseTo(pendulumPeriodFactor(deg * DEG), 12);
    });
  }

  it('la ecuación con K(k) nombra a k = sen(φ₀/2) en el árbol, no solo en el texto', () => {
    const kEquation = mathOf(noLineal[4], 1);
    expect(toPlainText(kEquation)).toBe('k = sen(φ₀/2)');
    expect(countStructure(kEquation)).toMatchObject({ functions: 1, fractions: 1, subscripts: 1 });
  });
});
