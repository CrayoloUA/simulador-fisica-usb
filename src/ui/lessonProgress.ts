import type { FlowPhase, FlowState } from '../content/experimentFlow';
import type { Experiment } from '../content/types';

/*
 * Lógica pura de la tarjeta de lección: etapas, títulos, anuncios y veredictos. Los textos de los
 * experimentos viven en src/content; aquí solo están los de la interfaz (etapas, títulos, avisos).
 */

export const LIST_TITLE = 'Elige un experimento';

export const STAGES: Array<{ phase: FlowPhase; label: string }> = [
  { phase: 'predict', label: 'Predecir' },
  { phase: 'steps', label: 'Probar' },
  { phase: 'check', label: 'Comprobar' },
  { phase: 'conclusion', label: 'Concluir' },
];

export type StageStatus = 'done' | 'current' | 'pending';

export function stageIndex(phase: FlowPhase): number {
  return STAGES.findIndex((stage) => stage.phase === phase);
}

/** Estado de una etapa frente a la actual: hecha, actual o pendiente. */
export function stageStatus(index: number, phase: FlowPhase): StageStatus {
  const current = stageIndex(phase);
  if (index < current) return 'done';
  return index === current ? 'current' : 'pending';
}

/** Título de la etapa en que está el estudiante: es el destino del foco y lo que se anuncia. */
export function lessonTitle(flow: FlowState, experiment: Experiment): string {
  switch (flow.phase) {
    case 'predict':
      return 'Tu predicción';
    case 'steps':
      return `Paso ${flow.stepIndex + 1} de ${experiment.steps.length}`;
    case 'check':
      return experiment.check.length > 1
        ? `Pregunta ${flow.questionIndex + 1} de ${experiment.check.length}`
        : 'Comprueba lo que viste';
    case 'conclusion':
      return 'Lo que aprendiste';
  }
}

/** Llave de la posición en el flujo: cambia con cada etapa, paso o pregunta (y con la lista). */
export function positionKey(experiment: Experiment | null, flow: FlowState | null): string {
  if (!experiment || !flow) return 'lista';
  return `${experiment.id}:${flow.phase}:${flow.stepIndex}:${flow.questionIndex}`;
}

/** Texto que anuncia el lector de pantalla al cambiar de etapa o de paso. */
export function lessonAnnouncement(flow: FlowState | null, experiment: Experiment | null): string {
  if (!flow || !experiment) return `${LIST_TITLE}.`;
  const stage = STAGES[stageIndex(flow.phase)];
  const position = `Etapa ${stageIndex(flow.phase) + 1} de ${STAGES.length}, ${stage.label}. ${lessonTitle(flow, experiment)}.`;
  // Al entrar al experimento se dice cuál es; después basta con la etapa.
  return flow.phase === 'predict' ? `${experiment.title}. ${position}` : position;
}

export type Verdict = 'correct' | 'wrong';

export const VERDICT_LABELS: Record<Verdict, string> = { correct: 'Correcto', wrong: 'No' };

/** Veredicto de una respuesta de comprobación; `null` mientras no se ha respondido. */
export function answerVerdict(answerId: string | null | undefined, correctOptionId: string): Verdict | null {
  if (!answerId) return null;
  return answerId === correctOptionId ? 'correct' : 'wrong';
}

/**
 * Aperturas que puede traer una explicación ("Casi: ...") y que el veredicto mostrado hace suyas.
 * Una respuesta equivocada puede abrir con "No", "No tanto", "Casi" o "Revisa de nuevo"; una
 * correcta, con "Correcto". El orden importa: "No tanto" va antes que "No".
 */
const OPENERS: Record<Verdict, string[]> = {
  correct: ['Correcto'],
  wrong: ['No tanto', 'No', 'Casi', 'Revisa de nuevo'],
};

export interface VerdictText {
  /** Palabra del veredicto: la apertura de la explicación o, si no trae, "Correcto" / "No". */
  label: string;
  /** Explicación sin la apertura, para no repetirla bajo el veredicto. */
  body: string;
}

/**
 * Parte la explicación en el veredicto que se muestra en grande y el texto que va debajo. Si la
 * explicación abre con "Casi:" o "Revisa de nuevo:", el veredicto es esa palabra (en vez de un "No"
 * seco) y el resto sigue con mayúscula inicial. Una apertura que no corresponde al veredicto
 * ("No:" en una respuesta correcta) no se toca.
 */
export function verdictText(text: string, verdict: Verdict): VerdictText {
  for (const opener of OPENERS[verdict]) {
    const prefix = `${opener}: `;
    if (text.startsWith(prefix)) {
      const rest = text.slice(prefix.length);
      return { label: opener, body: rest.charAt(0).toUpperCase() + rest.slice(1) };
    }
  }
  return { label: VERDICT_LABELS[verdict], body: text };
}

/** La explicación sin la apertura que el veredicto ya dice en grande. */
export function explanationText(text: string, verdict: Verdict): string {
  return verdictText(text, verdict).body;
}

export interface PredictionVerdict {
  /** `ok` si acertó; `info` (tono sereno, no de error) si no: equivocarse al predecir es aprender. */
  tone: 'ok' | 'info';
  text: string;
}

export function predictionVerdict(correct: boolean): PredictionVerdict {
  return correct
    ? { tone: 'ok', text: 'Tu predicción inicial fue correcta.' }
    : { tone: 'info', text: 'Tu predicción inicial no coincidió con lo observado, y eso también es parte de aprender.' };
}

/**
 * Una línea corta por experimento para la lista. Vive en la interfaz porque el contenido solo trae
 * el título; si un experimento nuevo no tiene línea, la lista muestra solo su título.
 */
export const EXPERIMENT_BLURBS: Record<string, string> = {
  'conoce-el-pendulo': 'Mira cómo se mueve.',
  'depende-de-la-masa': 'Liviana contra pesada.',
  'depende-de-la-longitud': 'Alarga el hilo.',
  'depende-de-la-gravedad': 'Llévalo a la Luna.',
  'depende-del-angulo': 'Suéltalo desde más arriba.',
};
