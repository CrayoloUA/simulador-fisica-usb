import type { PendulumModel } from '../engine/phenomena/pendulum';
import type { Params } from '../engine/types';

export interface ParamHelp {
  paramKey: string;
  /** De dónde sale el valor (cómo se mide o se elige). */
  origin: string;
  /** Para qué sirve dentro del modelo. */
  role: string;
  /** Qué pasa con el experimento si se cambia u omite. */
  effect: string;
  /** Aviso corto que se muestra siempre junto al control (no solo al abrir la ayuda). */
  note?: string;
}

export interface PresetValue {
  label: string;
  value: number;
}

export interface ResultHelp {
  resultKey: string;
  label: string;
  unit: string;
  decimals: number;
  explanation: string;
}

/**
 * Explicación en tres bloques de una parte de la pantalla que no es un parámetro ni un resultado
 * (la leyenda de la gráfica, el dibujo del péndulo, los botones). Alimenta las marcas del modo
 * "¿Qué es esto?" y la sección "Qué es cada cosa" de la hoja de Teoría.
 */
export interface ElementHelp {
  id: string;
  /** Nombre corto; el botón de la marca dice "Explicar: <título>". */
  title: string;
  /** Qué es. */
  what: string;
  /** Por qué es así. */
  why: string;
  /** Qué pasaría si no fuera así. */
  ifNot: string;
}

/**
 * Los dos bloques que faltan en un resultado: su "Qué es" ya vive en `resultHelp.explanation`.
 * Si el resultado no tiene `resultHelp` (la diferencia en %), `what` lo trae aquí.
 */
export interface ResultExtraHelp {
  resultKey: string;
  what?: string;
  why: string;
  ifNot: string;
}

export interface FormulaDisplay {
  template: string;
  describe(params: Params, results: Record<string, number>): string;
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface PredictStage {
  question: string;
  options: ChoiceOption[];
  correctOptionId: string;
}

export interface ExperimentStep {
  instruction: string;
  prepareParams?: Partial<Params>;
  highlightParamKey?: string;
  highlightResultKey?: string;
}

export interface CheckQuestion {
  question: string;
  options: ChoiceOption[];
  correctOptionId: string;
  feedback: Record<string, string>;
}

export interface Experiment {
  id: string;
  title: string;
  predict: PredictStage;
  steps: ExperimentStep[];
  check: CheckQuestion[];
  conclusion: string;
}

/**
 * Árbol de una expresión matemática (puro y sin HTML): de él salen tanto el dibujo (MathML, en
 * `Formula`) como el texto plano de respaldo (`toPlainText`). `spaced` pide espacios alrededor del
 * operador o de la barra de la fracción en el texto plano; el dibujo los pone solo.
 */
export type MathNode =
  | { k: 'num'; v: string }
  /** Variable o letra griega. `upright` la dibuja derecha (π). */
  | { k: 'id'; v: string; upright?: boolean }
  /** Nombre de función (sen, cos): siempre derecho. */
  | { k: 'fn'; v: string }
  | { k: 'op'; v: string; spaced?: boolean }
  /** Espacio fino (entre `sen` y su argumento sin paréntesis). */
  | { k: 'gap' }
  | { k: 'row'; c: MathNode[] }
  | { k: 'frac'; n: MathNode; d: MathNode; spaced?: boolean }
  | { k: 'sqrt'; c: MathNode }
  | { k: 'sub'; b: MathNode; s: MathNode }
  | { k: 'sup'; b: MathNode; p: MathNode }
  | { k: 'subsup'; b: MathNode; s: MathNode; p: MathNode }
  /** Apóstrofos de derivada: θ' (1) y θ'' (2). */
  | { k: 'prime'; b: MathNode; count: 1 | 2 | 3 }
  /** Paréntesis o corchetes alrededor de `c`; `pad` pone espacios por dentro en el texto plano. */
  | { k: 'paren'; c: MathNode; open?: '(' | '['; pad?: boolean }
  /** Sumatoria: los límites solo se dibujan (el texto plano los dice con palabras en la frase). */
  | { k: 'sum'; from: MathNode; to: MathNode; body: MathNode };

/** Un trozo de una ecuación: prosa (texto corriente) o matemáticas. */
export type EquationPart = { kind: 'text'; text: string } | { kind: 'math'; node: MathNode };

/** Una ecuación de la hoja de Teoría: matemáticas intercaladas con las palabras que las unen. */
export interface Equation {
  parts: EquationPart[];
}

/** Teoría que acompaña a cada modelo del péndulo: ecuaciones y explicaciones (HU-14, 16, 17). */
export interface ModelTheory {
  title: string;
  equations: Equation[];
  /** Cuándo es válido el modelo y qué pasa con ángulos grandes. */
  validity: string;
  /** De dónde sale cada curva de la gráfica y, si aplica, por qué se separan. */
  chartOrigin: string;
  /** Eje de referencia y signo del ángulo. */
  signConvention: string;
}

export interface LabContent {
  /**
   * Modelo para el que están escritos los experimentos (valores de "Preparar valores" y cifras de
   * las conclusiones). Al elegir un experimento, la app pasa a este modelo.
   */
  experimentModel: PendulumModel;
  theoryByModel: Record<PendulumModel, ModelTheory>;
  paramHelp: ParamHelp[];
  presets: Record<string, PresetValue[]>;
  resultHelp: ResultHelp[];
  /** Por qué y qué pasaría sin cada resultado (y la diferencia en %, que no tiene `resultHelp`). */
  resultExtras: ResultExtraHelp[];
  /** Explicaciones de las demás partes de la pantalla (dibujo, gráfica y botones). */
  elementHelp: ElementHelp[];
  formula: FormulaDisplay;
  experiments: Experiment[];
}
