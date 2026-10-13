import { toPlainText } from './equations';
import type { MathNode } from './types';

/*
 * Evaluador numérico del árbol de ecuaciones. Solo lo usan las pruebas: sirve para comprobar que lo
 * que está escrito en la hoja de Teoría (el período T₀ y la serie del período) da los mismos números
 * que el motor. No se importa desde la aplicación, así que no entra en el paquete que se publica.
 */

export type Env = Record<string, number>;

export interface EvalOptions {
  /** Cuántos términos suma una sumatoria que llega a ∞. */
  terms?: number;
}

const FUNCTIONS: Record<string, (x: number) => number> = { sen: Math.sin, cos: Math.cos };

function factorial(x: number): number {
  let result = 1;
  for (let i = 2; i <= x; i += 1) result *= i;
  return result;
}

function functionOf(node: MathNode, env: Env, opts: EvalOptions): { name: string; power: number } | null {
  if (node.k === 'fn') return { name: node.v, power: 1 };
  if (node.k === 'sup' && node.b.k === 'fn') return { name: node.b.v, power: evaluate(node.p, env, opts) };
  return null;
}

/** Una suma de productos: parte la fila por `+` y `−`; la juxtaposición y `·` multiplican. */
function evaluateRow(children: MathNode[], env: Env, opts: EvalOptions): number {
  const terms: MathNode[][] = [[]];
  for (const child of children) {
    if (child.k === 'op' && child.v === '+') terms.push([]);
    else terms[terms.length - 1].push(child);
  }
  let total = 0;
  for (const term of terms) {
    // El "…" final de una serie no suma nada.
    if (term.length === 1 && term[0].k === 'op' && term[0].v === '…') continue;
    const factors: number[] = [];
    for (let i = 0; i < term.length; i += 1) {
      const node = term[i];
      if (node.k === 'gap') continue;
      if (node.k === 'op') {
        if (node.v === '·') continue;
        if (node.v === '!') {
          factors.push(factorial(factors.pop() as number));
          continue;
        }
        throw new Error(`Operador no evaluable: ${node.v}`);
      }
      const applied = functionOf(node, env, opts);
      if (applied) {
        let j = i + 1;
        while (term[j]?.k === 'gap') j += 1;
        factors.push(FUNCTIONS[applied.name](evaluate(term[j], env, opts)) ** applied.power);
        i = j;
        continue;
      }
      factors.push(evaluate(node, env, opts));
    }
    total += factors.reduce((product, value) => product * value, 1);
  }
  return total;
}

/** Valor numérico de una expresión; las variables salen de `env` (por su texto plano: `L`, `φ₀`, `T₀`). */
export function evaluate(node: MathNode, env: Env, opts: EvalOptions = {}): number {
  switch (node.k) {
    case 'num':
      return Number(node.v.replace(',', '.'));
    case 'id': {
      if (node.v === 'π') return Math.PI;
      if (node.v === '∞') return Infinity;
      if (!(node.v in env)) throw new Error(`Falta la variable ${node.v}`);
      return env[node.v];
    }
    case 'row':
      return evaluateRow(node.c, env, opts);
    case 'frac':
      return evaluate(node.n, env, opts) / evaluate(node.d, env, opts);
    case 'sqrt':
      return Math.sqrt(evaluate(node.c, env, opts));
    case 'sub': {
      const name = toPlainText(node);
      if (!(name in env)) throw new Error(`Falta la variable ${name}`);
      return env[name];
    }
    case 'sup':
      return evaluate(node.b, env, opts) ** evaluate(node.p, env, opts);
    case 'subsup':
      return evaluate({ k: 'sub', b: node.b, s: node.s }, env, opts) ** evaluate(node.p, env, opts);
    case 'paren':
      return evaluate(node.c, env, opts);
    case 'sum': {
      // Los límites se leen como `n = 0` (variable y valor inicial) y `∞` o un número.
      if (node.from.k !== 'row' || node.from.c.length !== 3 || node.from.c[0].k !== 'id') {
        throw new Error('Límite inferior de la sumatoria no reconocido');
      }
      const variable = node.from.c[0].v;
      const start = evaluate(node.from.c[2], env, opts);
      const end = evaluate(node.to, env, opts);
      const last = Number.isFinite(end) ? end : start + (opts.terms ?? 40) - 1;
      let total = 0;
      for (let i = start; i <= last; i += 1) total += evaluate(node.body, { ...env, [variable]: i }, opts);
      return total;
    }
    case 'fn':
    case 'op':
    case 'gap':
    case 'prime':
      throw new Error(`No evaluable por sí solo: ${node.k}`);
  }
}

/** Lado derecho de una igualdad `a = b` (o de una aproximación `a ≈ b`): la fila de lo que sigue al primer `=`. */
export function rightSide(node: MathNode): MathNode {
  if (node.k !== 'row') throw new Error('Se esperaba una fila');
  const at = node.c.findIndex((child) => child.k === 'op' && (child.v === '=' || child.v === '≈'));
  if (at < 0) throw new Error('La expresión no tiene "=" ni "≈"');
  return { k: 'row', c: node.c.slice(at + 1) };
}
