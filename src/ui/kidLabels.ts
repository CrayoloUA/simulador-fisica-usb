import { formatNumber } from '../engine/numbers';
import type { PendulumModel } from '../engine/phenomena/pendulum';
import type { ParamSpec } from '../engine/types';
import type { ChartLabels } from '../render/drawChart';

/*
 * Etiquetas para niños de 10° y 11°. Viven en la capa de interfaz a propósito: el motor y el
 * contenido (src/content) conservan los nombres técnicos. PENDIENTE: confirmar cada texto con el
 * profesor de física antes de darlos por definitivos.
 */

export const LAB_TITLE = 'Péndulo simple';

export type Mode = 'explorar' | 'experimentos';
export const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'explorar', label: 'Explorar' },
  { id: 'experimentos', label: 'Experimentos' },
];

export const MODEL_LABELS: Record<PendulumModel, string> = {
  lineal: 'Ángulo pequeño',
  'no-lineal': 'Real',
};
export const MODEL_ORDER: PendulumModel[] = ['lineal', 'no-lineal'];

/** Una línea que explica el modelo elegido; el máximo de φ₀ sale del esquema del motor. */
export function modelNote(model: PendulumModel, maxPhi0: number): string {
  const max = `${formatNumber(maxPhi0)}°`;
  return model === 'lineal'
    ? `Ángulo pequeño: una cuenta más fácil, que solo sirve hasta ${max}.`
    : `Real: la cuenta completa, que sirve hasta ${max}.`;
}

/** Aviso previo, junto al selector de modelo: cambiarlo reinicia la simulación. */
export const MODEL_CHANGE_WARNING = 'Al cambiar, la simulación empieza de nuevo.';

export const CHART_LABELS: ChartLabels = {
  title: 'Ángulo (θ) en el tiempo (s)',
  simulated: 'Simulación',
  linear: 'Ángulo pequeño',
};

export interface ParamLabel {
  label: string;
  symbol: string;
}

const PARAM_LABELS: Record<string, ParamLabel> = {
  L: { label: 'Largo del hilo', symbol: 'L' },
  phi0: { label: 'Ángulo de salida', symbol: 'φ₀' },
  g: { label: 'Gravedad', symbol: 'g' },
  m: { label: 'Masa', symbol: 'm' },
  b: { label: 'Rozamiento del aire', symbol: 'b' },
};

/** Etiqueta para niños de un parámetro; si no hay, la del esquema del motor. */
export function paramLabel(spec: ParamSpec): ParamLabel {
  return PARAM_LABELS[spec.key] ?? { label: spec.label, symbol: spec.symbol };
}

/** Parámetros que viven en la pantalla principal; el resto va en "Más opciones". */
export const MAIN_PARAM_KEYS = ['L', 'phi0', 'g'];
/** Resultados que viven en la pantalla principal; el resto va en "Datos para curiosos". */
export const MAIN_RESULT_KEYS = ['T', 'f'];

export interface ParamValueText {
  /** Número ya formateado con coma decimal. */
  number: string;
  /** Unidad para mostrar, con su espacio inicial cuando lo lleva (el grado va pegado). */
  unit: string;
  /** Texto completo para lectores de pantalla, sin símbolos. */
  spoken: string;
}

/** La gravedad lleva un decimal si cabe (9,8) y dos si no (1,62). */
function formatGravity(g: number): string {
  return Math.abs(g * 10 - Math.round(g * 10)) < 1e-9 ? formatNumber(g, 1) : formatNumber(g, 2);
}

/** Valor de un parámetro tal como se lee en pantalla. */
export function formatParamValue(key: string, value: number): ParamValueText {
  switch (key) {
    case 'L': {
      const n = formatNumber(value, 1);
      return { number: n, unit: ' m', spoken: `${n} metros` };
    }
    case 'phi0': {
      const n = String(Math.round(value));
      return { number: n, unit: '°', spoken: `${n} grados` };
    }
    case 'g': {
      const n = formatGravity(value);
      return { number: n, unit: ' m/s²', spoken: `${n} metros por segundo al cuadrado` };
    }
    case 'm': {
      const n = formatNumber(value, 2);
      return { number: n, unit: ' kg', spoken: `${n} kilogramos` };
    }
    case 'b': {
      const n = formatNumber(value, 2);
      return { number: n, unit: ' 1/s', spoken: `${n} por segundo` };
    }
    default:
      return { number: formatNumber(value), unit: '', spoken: formatNumber(value) };
  }
}

/** Notas que van bajo el control, en la capa de interfaz (la masa y el rozamiento viven en el cajón). */
export const PARAM_NOTES: Record<string, string> = {
  m: 'La masa no cambia el movimiento.',
  b: 'Con rozamiento, el péndulo va perdiendo vaivén.',
};

export interface ResultLabel {
  label: string;
  /** Símbolo entre paréntesis, en cursiva. */
  symbol: string;
  unit: string;
  decimals: number;
  /** Subtítulo (período) o descripción corta (datos para curiosos); vacío si no lleva. */
  note: string;
}

/** Orden en que se muestran: primero los principales, después los datos para curiosos. */
export const RESULT_LABELS: Record<string, ResultLabel> = {
  T: { label: 'Período', symbol: 'T', unit: 's', decimals: 3, note: 'tiempo de un vaivén completo' },
  f: { label: 'Frecuencia', symbol: 'f', unit: 'Hz', decimals: 3, note: '' },
  T0: {
    label: 'Período con ángulo pequeño',
    symbol: 'T₀',
    unit: 's',
    decimals: 3,
    note: 'Lo que daría la cuenta fácil.',
  },
  periodError: {
    label: 'Diferencia',
    symbol: '(T − T₀)/T₀',
    unit: '%',
    decimals: 1,
    note: 'Cuánto más largo es T que T₀.',
  },
  omega0: {
    label: 'Rapidez angular',
    symbol: 'ω₀',
    unit: 'rad/s',
    decimals: 3,
    note: 'Qué tan rápido gira, en radianes por segundo.',
  },
};
export const CURIOUS_RESULT_KEYS = ['T0', 'periodError', 'omega0'];

/** Valor de un resultado con la coma decimal y la precisión de su etiqueta. */
export function formatResult(key: string, value: number | undefined): string {
  const label = RESULT_LABELS[key];
  if (value === undefined || !label) return 'n/d';
  return formatNumber(value, label.decimals);
}

export const SPEEDS = [0.25, 0.5, 1, 2];
export const speedLabel = (speed: number) => `${formatNumber(speed)}×`;
