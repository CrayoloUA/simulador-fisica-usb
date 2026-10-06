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

/** Teoría que acompaña a cada modelo del péndulo: ecuaciones y explicaciones (HU-14, 16, 17). */
export interface ModelTheory {
  title: string;
  equations: string[];
  /** Cuándo es válido el modelo y qué pasa con ángulos grandes. */
  validity: string;
  /** De dónde sale cada curva de la gráfica y, si aplica, por qué se separan. */
  chartOrigin: string;
  /** Eje de referencia y signo del ángulo. */
  signConvention: string;
}

export interface LabContent {
  theoryByModel: Record<PendulumModel, ModelTheory>;
  paramHelp: ParamHelp[];
  presets: Record<string, PresetValue[]>;
  resultHelp: ResultHelp[];
  formula: FormulaDisplay;
  experiments: Experiment[];
}
