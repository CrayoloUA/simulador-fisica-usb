import type { ExperimentStep } from '../content/types';
import { MAIN_PARAM_KEYS, MAIN_RESULT_KEYS } from './kidLabels';

/**
 * Dice si lo que un paso del experimento pide mirar vive en "Más opciones" (masa, rozamiento,
 * T₀, diferencia, ω₀). Si es así, el cajón debe abrirse solo para que el elemento se vea resaltado.
 */
export function stepNeedsDrawer(step: Pick<ExperimentStep, 'highlightParamKey' | 'highlightResultKey'> | undefined): boolean {
  if (!step) return false;
  const paramInDrawer = step.highlightParamKey !== undefined && !MAIN_PARAM_KEYS.includes(step.highlightParamKey);
  const resultInDrawer = step.highlightResultKey !== undefined && !MAIN_RESULT_KEYS.includes(step.highlightResultKey);
  return paramInDrawer || resultInDrawer;
}
