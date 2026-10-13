import { describe, expect, it } from 'vitest';
import { advance, answerCheck, initialFlowState, predict, type FlowState } from '../content/experimentFlow';
import { simplePendulumContent } from '../content/simplePendulumContent';
import {
  EXPERIMENT_BLURBS,
  STAGES,
  answerVerdict,
  explanationText,
  lessonAnnouncement,
  lessonTitle,
  positionKey,
  predictionVerdict,
  stageIndex,
  stageStatus,
  verdictText,
} from './lessonProgress';

const mass = simplePendulumContent.experiments.find((e) => e.id === 'depende-de-la-masa')!;

/** Recorre el flujo de un experimento hasta la conclusión, devolviendo cada estado. */
function walk(): FlowState[] {
  const states: FlowState[] = [];
  let state = predict(initialFlowState(mass), 'igual');
  states.push(state);
  for (let i = 0; i < 20 && state.phase !== 'conclusion'; i++) {
    state = advance(state, mass);
    if (state.phase === 'check') state = answerCheck(state, 'igual');
    states.push(state);
  }
  return states;
}

describe('etapas', () => {
  it('son cuatro, en orden: predecir, probar, comprobar, concluir', () => {
    expect(STAGES.map((s) => s.label)).toEqual(['Predecir', 'Probar', 'Comprobar', 'Concluir']);
    expect(STAGES.map((s) => stageIndex(s.phase))).toEqual([0, 1, 2, 3]);
  });

  it('cada etapa es hecha, actual o pendiente según la fase', () => {
    expect([0, 1, 2, 3].map((i) => stageStatus(i, 'predict'))).toEqual(['current', 'pending', 'pending', 'pending']);
    expect([0, 1, 2, 3].map((i) => stageStatus(i, 'steps'))).toEqual(['done', 'current', 'pending', 'pending']);
    expect([0, 1, 2, 3].map((i) => stageStatus(i, 'check'))).toEqual(['done', 'done', 'current', 'pending']);
    expect([0, 1, 2, 3].map((i) => stageStatus(i, 'conclusion'))).toEqual(['done', 'done', 'done', 'current']);
  });
});

describe('lessonTitle y lessonAnnouncement', () => {
  it('titula cada etapa; el paso lleva "Paso N de M"', () => {
    const titles = walk().map((state) => lessonTitle(state, mass));
    expect(titles).toEqual(['Tu predicción', 'Paso 1 de 3', 'Paso 2 de 3', 'Paso 3 de 3', 'Comprueba lo que viste', 'Lo que aprendiste']);
  });

  it('anuncia la etapa y el paso; al entrar al experimento dice cuál es', () => {
    const states = walk();
    expect(lessonAnnouncement(states[0], mass)).toBe('¿Depende de la masa?. Etapa 1 de 4, Predecir. Tu predicción.');
    expect(lessonAnnouncement(states[2], mass)).toBe('Etapa 2 de 4, Probar. Paso 2 de 3.');
    expect(lessonAnnouncement(states[5], mass)).toBe('Etapa 4 de 4, Concluir. Lo que aprendiste.');
  });

  it('en la lista anuncia "Elige un experimento"', () => {
    expect(lessonAnnouncement(null, null)).toBe('Elige un experimento.');
  });

  it('con varias preguntas, la comprobación numera las preguntas', () => {
    const two = { ...mass, check: [mass.check[0], mass.check[0]] };
    const check: FlowState = { ...initialFlowState(two), phase: 'check', questionIndex: 1 };
    expect(lessonTitle(check, two)).toBe('Pregunta 2 de 2');
  });
});

describe('positionKey', () => {
  it('cambia en cada etapa, paso y pregunta, y es "lista" sin experimento', () => {
    expect(positionKey(null, null)).toBe('lista');
    const keys = walk().map((state) => positionKey(mass, state));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('no cambia al elegir una opción dentro de la misma etapa', () => {
    const start = initialFlowState(mass);
    expect(positionKey(mass, predict(start, 'igual'))).toBe(positionKey(mass, start));
  });
});

describe('answerVerdict y predictionVerdict', () => {
  it('sin respuesta no hay veredicto; acierta o falla según la opción correcta', () => {
    expect(answerVerdict(null, 'igual')).toBeNull();
    expect(answerVerdict(undefined, 'igual')).toBeNull();
    expect(answerVerdict('igual', 'igual')).toBe('correct');
    expect(answerVerdict('aumento', 'igual')).toBe('wrong');
  });

  it('si la predicción no acertó, el tono es sereno (info), no de error', () => {
    expect(predictionVerdict(true).tone).toBe('ok');
    expect(predictionVerdict(false).tone).toBe('info');
  });

  it('los textos hablan de lo que el niño vio, sin consuelo de plantilla', () => {
    expect(predictionVerdict(true).text).toBe('Tu predicción salió bien.');
    expect(predictionVerdict(false).text).toBe('Tu predicción no coincidió con lo que viste. Para eso se hacen las pruebas.');
    expect(predictionVerdict(false).text).not.toMatch(/parte de aprender/);
  });
});

describe('explanationText', () => {
  it('quita la palabra que el veredicto ya dice y pone mayúscula', () => {
    expect(explanationText('Correcto: T es el tiempo que tarda.', 'correct')).toBe('T es el tiempo que tarda.');
    expect(explanationText('No: la masa es un parámetro.', 'wrong')).toBe('La masa es un parámetro.');
  });

  it('también quita "Casi:", "Revisa de nuevo:" y "No tanto:" de una respuesta equivocada', () => {
    expect(explanationText('Revisa de nuevo: el período no depende de la masa.', 'wrong')).toBe('El período no depende de la masa.');
    expect(explanationText('Casi: T depende de la raíz.', 'wrong')).toBe('T depende de la raíz.');
    expect(explanationText('No tanto: T pasó de 2 s a 3 s.', 'wrong')).toBe('T pasó de 2 s a 3 s.');
  });

  it('no quita una apertura que no corresponde al veredicto ni una frase que solo empieza igual', () => {
    expect(explanationText('No: algo.', 'correct')).toBe('No: algo.');
    expect(explanationText('Casi: algo.', 'correct')).toBe('Casi: algo.');
    expect(explanationText('Correcto: algo.', 'wrong')).toBe('Correcto: algo.');
    expect(explanationText('Casimiro dijo que sí.', 'wrong')).toBe('Casimiro dijo que sí.');
    expect(explanationText('Nota: la masa no cuenta.', 'wrong')).toBe('Nota: la masa no cuenta.');
  });

  it('en el contenido real, toda explicación queda con texto y sin repetir el veredicto', () => {
    for (const experiment of simplePendulumContent.experiments) {
      for (const question of experiment.check) {
        for (const [id, text] of Object.entries(question.feedback)) {
          const verdict = answerVerdict(id, question.correctOptionId)!;
          const shown = explanationText(text, verdict);
          expect(shown.length).toBeGreaterThan(10);
          expect(shown).not.toMatch(/^(Correcto|No|No tanto|Casi|Revisa de nuevo|Mira otra vez|Fíjate):/);
        }
      }
    }
  });
});

describe('verdictText', () => {
  it('una respuesta correcta se llama "Correcto"', () => {
    expect(verdictText('Correcto: T es el tiempo.', 'correct')).toEqual({ label: 'Correcto', body: 'T es el tiempo.' });
  });

  it('"Mira otra vez:" y "Fíjate:" también son el veredicto de una respuesta equivocada', () => {
    expect(verdictText('Mira otra vez: T sí depende de L.', 'wrong')).toEqual({ label: 'Mira otra vez', body: 'T sí depende de L.' });
    expect(verdictText('Fíjate: T sí depende de g.', 'wrong')).toEqual({ label: 'Fíjate', body: 'T sí depende de g.' });
    expect(verdictText('Fíjate: algo.', 'correct')).toEqual({ label: 'Correcto', body: 'Fíjate: algo.' });
  });

  it('"Casi:" y "Revisa de nuevo:" son el veredicto en vez de un "No" seco', () => {
    expect(verdictText('Casi: T depende de la RAÍZ CUADRADA de L.', 'wrong')).toEqual({
      label: 'Casi',
      body: 'T depende de la RAÍZ CUADRADA de L.',
    });
    expect(verdictText('Revisa de nuevo: T sí depende de L.', 'wrong')).toEqual({
      label: 'Revisa de nuevo',
      body: 'T sí depende de L.',
    });
    expect(verdictText('No tanto: cambia solo un poco.', 'wrong')).toEqual({ label: 'No tanto', body: 'Cambia solo un poco.' });
  });

  it('con "No:" o sin apertura, el veredicto de una respuesta equivocada es "No"', () => {
    expect(verdictText('No: la masa es un parámetro.', 'wrong')).toEqual({ label: 'No', body: 'La masa es un parámetro.' });
    expect(verdictText('La altura no es lo que mide T.', 'wrong')).toEqual({ label: 'No', body: 'La altura no es lo que mide T.' });
  });

  it('una apertura que no corresponde no cambia el veredicto', () => {
    expect(verdictText('Casi: algo.', 'correct')).toEqual({ label: 'Correcto', body: 'Casi: algo.' });
  });

  it('en el contenido real, cada veredicto equivocado es una palabra conocida y nunca queda vacío ni repetido', () => {
    const labels = new Set<string>();
    for (const experiment of simplePendulumContent.experiments) {
      for (const question of experiment.check) {
        for (const [id, text] of Object.entries(question.feedback)) {
          const verdict = answerVerdict(id, question.correctOptionId)!;
          const { label, body } = verdictText(text, verdict);
          labels.add(label);
          expect(body.startsWith(label + ':')).toBe(false);
          expect(body.charAt(0)).toBe(body.charAt(0).toUpperCase());
        }
      }
    }
    expect([...labels].sort()).toEqual(['Casi', 'Correcto', 'Fíjate', 'Mira otra vez', 'No', 'No tanto', 'Revisa de nuevo']);
  });
});

describe('EXPERIMENT_BLURBS', () => {
  it('cada experimento del contenido tiene su línea corta, sin rayas largas', () => {
    for (const experiment of simplePendulumContent.experiments) {
      const blurb = EXPERIMENT_BLURBS[experiment.id];
      expect(blurb, experiment.id).toBeTruthy();
      expect(blurb).not.toMatch(/—|–/);
    }
  });
});
