import type { ParamSpec, Params } from '../engine/types';
import { MAIN_PARAM_KEYS } from './kidLabels';

/**
 * Al empezar un experimento, lo que el niño no ve ni puede cambiar en Experimentos (masa y
 * rozamiento: viven en "Más opciones") vuelve a su valor por defecto. Así la predicción y la prueba
 * no ocurren con un rozamiento heredado de Explorar. Lo visible (L, φ₀, g) se deja como está: el
 * paso lo prepara con "Preparar valores".
 */
export function paramsForExperimentStart(current: Params, schema: ParamSpec[]): Params {
  const next = { ...current };
  for (const spec of schema) {
    if (!MAIN_PARAM_KEYS.includes(spec.key)) next[spec.key] = spec.defaultValue;
  }
  return next;
}

/** Velocidad con la que empieza todo experimento (la de Explorar se elige en el cajón, que aquí no hay). */
export const EXPERIMENT_START_SPEED = 1;
