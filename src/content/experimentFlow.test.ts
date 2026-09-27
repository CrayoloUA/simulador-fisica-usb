import { describe, expect, it } from 'vitest';
import type { Experiment } from './types';
import { advance, answerCheck, canAdvance, initialFlowState, isPredictionCorrect, predict } from './experimentFlow';

const experiment: Experiment = {
  id: 'demo',
  title: 'Demo',
  predict: {
    question: '¿Pregunta?',
    options: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    correctOptionId: 'b',
  },
  steps: [{ instruction: 'Paso 1' }, { instruction: 'Paso 2' }],
  check: [
    {
      question: '¿Check 1?',
      options: [
        { id: 'x', label: 'X' },
        { id: 'y', label: 'Y' },
      ],
      correctOptionId: 'y',
      feedback: { x: 'mal', y: 'bien' },
    },
    {
      question: '¿Check 2?',
      options: [{ id: 'z', label: 'Z' }],
      correctOptionId: 'z',
      feedback: { z: 'bien' },
    },
  ],
  conclusion: 'Fin.',
};

describe('initialFlowState', () => {
  it('empieza en predict, sin respuestas', () => {
    const state = initialFlowState(experiment);
    expect(state).toEqual({
      phase: 'predict',
      stepIndex: 0,
      questionIndex: 0,
      predictedOptionId: null,
      checkAnswers: [null, null],
    });
  });
});

describe('predict', () => {
  it('registra la predicción en la fase predict', () => {
    const state = predict(initialFlowState(experiment), 'a');
    expect(state.predictedOptionId).toBe('a');
  });

  it('no hace nada fuera de la fase predict', () => {
    let state = initialFlowState(experiment);
    state = advance(predict(state, 'a'), experiment);
    const unchanged = predict(state, 'b');
    expect(unchanged).toEqual(state);
  });
});

describe('canAdvance', () => {
  it('bloquea predict sin respuesta y lo permite con respuesta', () => {
    const state = initialFlowState(experiment);
    expect(canAdvance(state)).toBe(false);
    expect(canAdvance(predict(state, 'a'))).toBe(true);
  });

  it('permite avanzar libremente durante los pasos', () => {
    const state = advance(predict(initialFlowState(experiment), 'a'), experiment);
    expect(state.phase).toBe('steps');
    expect(canAdvance(state)).toBe(true);
  });

  it('bloquea check sin responder la pregunta actual', () => {
    let state = initialFlowState(experiment);
    state = advance(predict(state, 'a'), experiment);
    state = advance(state, experiment);
    state = advance(state, experiment);
    expect(state.phase).toBe('check');
    expect(canAdvance(state)).toBe(false);
    state = answerCheck(state, 'y');
    expect(canAdvance(state)).toBe(true);
  });
});

describe('advance', () => {
  it('recorre predict -> steps (cada paso) -> check (cada pregunta) -> conclusion', () => {
    let state = initialFlowState(experiment);
    state = predict(state, 'b');
    state = advance(state, experiment);
    expect(state).toMatchObject({ phase: 'steps', stepIndex: 0 });

    state = advance(state, experiment);
    expect(state).toMatchObject({ phase: 'steps', stepIndex: 1 });

    state = advance(state, experiment);
    expect(state).toMatchObject({ phase: 'check', questionIndex: 0 });

    state = answerCheck(state, 'y');
    state = advance(state, experiment);
    expect(state).toMatchObject({ phase: 'check', questionIndex: 1 });

    state = answerCheck(state, 'z');
    state = advance(state, experiment);
    expect(state.phase).toBe('conclusion');

    const afterEnd = advance(state, experiment);
    expect(afterEnd).toEqual(state);
  });

  it('no avanza de predict sin una predicción', () => {
    const state = initialFlowState(experiment);
    expect(advance(state, experiment)).toEqual(state);
  });

  it('no avanza de check sin responder la pregunta actual', () => {
    let state = initialFlowState(experiment);
    state = advance(predict(state, 'a'), experiment);
    state = advance(state, experiment);
    state = advance(state, experiment);
    expect(advance(state, experiment)).toEqual(state);
  });
});

describe('answerCheck', () => {
  it('guarda la respuesta en la pregunta actual del check', () => {
    let state = initialFlowState(experiment);
    state = advance(predict(state, 'a'), experiment);
    state = advance(state, experiment);
    state = advance(state, experiment);
    state = answerCheck(state, 'x');
    expect(state.checkAnswers).toEqual(['x', null]);
  });

  it('no hace nada fuera de la fase check', () => {
    const state = initialFlowState(experiment);
    expect(answerCheck(state, 'x')).toEqual(state);
  });
});

describe('isPredictionCorrect', () => {
  it('compara la predicción contra la respuesta correcta del experimento', () => {
    const wrong = predict(initialFlowState(experiment), 'a');
    const right = predict(initialFlowState(experiment), 'b');
    expect(isPredictionCorrect(wrong, experiment)).toBe(false);
    expect(isPredictionCorrect(right, experiment)).toBe(true);
  });
});
