import { formatNumber } from '../engine/numbers';
import type { PendulumModel } from '../engine/phenomena/pendulum';

export interface ModelNotice {
  /** Los dos avisos son advertencias: el estudiante debe tener cuidado con el modelo. */
  kind: 'warn';
  text: string;
  /** Si el aviso ofrece el botón "Ver la comparación" (solo mientras la curva punteada está oculta). */
  offerComparison: boolean;
}

interface Input {
  model: PendulumModel;
  /** Aumento porcentual del período real frente a T₀ (resultado `periodError` del motor). */
  periodError: number;
  /** Si el motor considera válida la aproximación de ángulo pequeño (la guarda `modelLimits`). */
  withinSmallAngle: boolean;
  /** Máximo de φ₀ al que se ajustó el ángulo al cambiar de modelo; `null` si no hubo ajuste. */
  adjustedTo: number | null;
  /** Si la curva de comparación ya está visible. */
  showLinear: boolean;
}

/**
 * Aviso del modelo, solo cuando pasa algo: nada permanente a la vista. Dos casos: el ángulo se
 * bajó al cambiar a "Ángulo pequeño", o el ángulo es grande en el modelo "Real" (el porcentaje
 * sale del motor). Quien lo dibuja añade un ícono: el estado no depende solo del color.
 */
export function describeModelNotice({
  model,
  periodError,
  withinSmallAngle,
  adjustedTo,
  showLinear,
}: Input): ModelNotice | null {
  if (adjustedTo !== null) {
    const max = formatNumber(adjustedTo);
    return {
      kind: 'warn',
      text: `El ángulo pequeño solo sirve hasta ${max}°. Bajamos el ángulo de salida a ${max}°.`,
      offerComparison: false,
    };
  }
  if (model === 'no-lineal' && !withinSmallAngle) {
    return {
      kind: 'warn',
      text: `Ángulo grande: el período es ${formatNumber(periodError, 1)} % más largo que con ángulo pequeño.`,
      offerComparison: !showLinear,
    };
  }
  return null;
}
