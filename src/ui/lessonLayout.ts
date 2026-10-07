import type { ExperimentStep } from '../content/types';
import { MAIN_PARAM_KEYS, MAIN_RESULT_KEYS } from './kidLabels';

type StepHighlight = Pick<ExperimentStep, 'highlightParamKey' | 'highlightResultKey'>;

/** Control o resultado que normalmente vive en "Más opciones" y que el paso pide mirar. */
export type InlineItem = { kind: 'param'; key: string } | { kind: 'result'; key: string };

/**
 * En Experimentos no hay cajón: si el paso resalta algo que vive en él (masa, rozamiento, T₀,
 * diferencia, ω₀), ese elemento se muestra dentro de la tarjeta de lección, justo bajo la
 * instrucción. Lo que vive en la pantalla principal (L, φ₀, g, T, f) se resalta en su sitio.
 */
export function lessonInlineItems(step: StepHighlight | undefined): InlineItem[] {
  if (!step) return [];
  const items: InlineItem[] = [];
  if (step.highlightParamKey !== undefined && !MAIN_PARAM_KEYS.includes(step.highlightParamKey)) {
    items.push({ kind: 'param', key: step.highlightParamKey });
  }
  if (step.highlightResultKey !== undefined && !MAIN_RESULT_KEYS.includes(step.highlightResultKey)) {
    items.push({ kind: 'result', key: step.highlightResultKey });
  }
  return items;
}

/**
 * Los botones de planeta (Tierra, Luna...) solo se ven en Explorar o cuando el paso pide cambiar
 * la gravedad: así la columna de Experimentos se mantiene corta y con pocos botones.
 */
export function presetsVisible(inExperiment: boolean, step: StepHighlight | undefined): boolean {
  return !inExperiment || step?.highlightParamKey === 'g';
}
