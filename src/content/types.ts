import type { Params } from '../engine/types';

export interface ParamHelp {
  paramKey: string;
  explanation: string;
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

export interface LabContent {
  paramHelp: ParamHelp[];
  presets: Record<string, PresetValue[]>;
  resultHelp: ResultHelp[];
  formula: FormulaDisplay;
  experiments: Experiment[];
}
