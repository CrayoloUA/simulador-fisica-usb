import type { Experiment } from './types';

export type FlowPhase = 'predict' | 'steps' | 'check' | 'conclusion';

export interface FlowState {
  phase: FlowPhase;
  stepIndex: number;
  questionIndex: number;
  predictedOptionId: string | null;
  checkAnswers: (string | null)[];
}

export function initialFlowState(experiment: Experiment): FlowState {
  return {
    phase: 'predict',
    stepIndex: 0,
    questionIndex: 0,
    predictedOptionId: null,
    checkAnswers: experiment.check.map(() => null),
  };
}

export function predict(state: FlowState, optionId: string): FlowState {
  if (state.phase !== 'predict') return state;
  return { ...state, predictedOptionId: optionId };
}

export function answerCheck(state: FlowState, optionId: string): FlowState {
  if (state.phase !== 'check') return state;
  const checkAnswers = [...state.checkAnswers];
  checkAnswers[state.questionIndex] = optionId;
  return { ...state, checkAnswers };
}

export function canAdvance(state: FlowState): boolean {
  if (state.phase === 'predict') return state.predictedOptionId !== null;
  if (state.phase === 'check') return state.checkAnswers[state.questionIndex] !== null;
  return true;
}

export function advance(state: FlowState, experiment: Experiment): FlowState {
  if (!canAdvance(state)) return state;
  if (state.phase === 'predict') {
    return { ...state, phase: 'steps', stepIndex: 0 };
  }
  if (state.phase === 'steps') {
    if (state.stepIndex < experiment.steps.length - 1) {
      return { ...state, stepIndex: state.stepIndex + 1 };
    }
    return { ...state, phase: 'check', questionIndex: 0 };
  }
  if (state.phase === 'check') {
    if (state.questionIndex < experiment.check.length - 1) {
      return { ...state, questionIndex: state.questionIndex + 1 };
    }
    return { ...state, phase: 'conclusion' };
  }
  return state;
}

export function isPredictionCorrect(state: FlowState, experiment: Experiment): boolean {
  return state.predictedOptionId === experiment.predict.correctOptionId;
}
