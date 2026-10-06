import { describe, expect, it } from 'vitest';
import { simplePendulumContent } from '../content/simplePendulumContent';
import { pendulumModels } from '../engine/phenomena/pendulum';
import {
  CURIOUS_RESULT_KEYS,
  MAIN_PARAM_KEYS,
  MAIN_RESULT_KEYS,
  MODEL_LABELS,
  PARAM_NOTES,
  RESULT_LABELS,
  formatParamValue,
  formatResult,
  modelNote,
  paramLabel,
  speedLabel,
} from './kidLabels';

const schema = pendulumModels['no-lineal'].paramSchema;

describe('formatParamValue', () => {
  it('largo con un decimal y coma', () => {
    expect(formatParamValue('L', 1)).toEqual({ number: '1,0', unit: ' m', spoken: '1,0 metros' });
  });

  it('ángulo entero con el grado pegado', () => {
    expect(formatParamValue('phi0', 10)).toEqual({ number: '10', unit: '°', spoken: '10 grados' });
  });

  it('gravedad con un decimal si cabe y dos si no', () => {
    expect(formatParamValue('g', 9.8).number).toBe('9,8');
    expect(formatParamValue('g', 1.62).number).toBe('1,62');
    expect(formatParamValue('g', 24.79).number).toBe('24,79');
    expect(formatParamValue('g', 9.8).spoken).toBe('9,8 metros por segundo al cuadrado');
  });

  it('masa y rozamiento con dos decimales', () => {
    expect(formatParamValue('m', 0.5)).toEqual({ number: '0,50', unit: ' kg', spoken: '0,50 kilogramos' });
    expect(formatParamValue('b', 0)).toEqual({ number: '0,00', unit: ' 1/s', spoken: '0,00 por segundo' });
  });
});

describe('formatResult', () => {
  it('usa la precisión de cada resultado', () => {
    expect(formatResult('T', 2.0113)).toBe('2,011');
    expect(formatResult('periodError', 7.3126)).toBe('7,3');
  });

  it('devuelve n/d si el motor no entrega el dato', () => {
    expect(formatResult('T', undefined)).toBe('n/d');
  });
});

describe('etiquetas para niños', () => {
  it('cubren todos los parámetros del esquema con los nombres para niños', () => {
    const labels = Object.fromEntries(schema.map((spec) => [spec.key, paramLabel(spec).label]));
    expect(labels).toEqual({
      L: 'Largo del hilo',
      phi0: 'Ángulo de salida',
      g: 'Gravedad',
      m: 'Masa',
      b: 'Rozamiento del aire',
    });
    for (const spec of schema) expect(paramLabel(spec).symbol).toBe(spec.symbol);
  });

  it('los tres parámetros principales existen en el esquema', () => {
    const keys = schema.map((spec) => spec.key);
    for (const key of MAIN_PARAM_KEYS) expect(keys).toContain(key);
    expect(MAIN_PARAM_KEYS).toHaveLength(3);
  });

  it('las unidades y decimales de los resultados coinciden con los del contenido', () => {
    for (const help of simplePendulumContent.resultHelp) {
      expect(RESULT_LABELS[help.resultKey].unit).toBe(help.unit);
      expect(RESULT_LABELS[help.resultKey].decimals).toBe(help.decimals);
    }
  });

  it('resultados principales y datos para curiosos son disjuntos y están definidos', () => {
    for (const key of [...MAIN_RESULT_KEYS, ...CURIOUS_RESULT_KEYS]) expect(RESULT_LABELS[key]).toBeDefined();
    for (const key of CURIOUS_RESULT_KEYS) expect(MAIN_RESULT_KEYS).not.toContain(key);
  });

  it('la nota del modelo dice el máximo de φ₀ del motor', () => {
    const max = (model: 'lineal' | 'no-lineal') => pendulumModels[model].paramSchema.find((s) => s.key === 'phi0')!.max;
    expect(modelNote('lineal', max('lineal'))).toBe('Ángulo pequeño: una cuenta más fácil, que solo sirve hasta 15°.');
    expect(modelNote('no-lineal', max('no-lineal'))).toBe('Real: la cuenta completa, que sirve hasta 60°.');
  });

  it('la velocidad se escribe con coma y el signo ×', () => {
    expect(speedLabel(0.25)).toBe('0,25×');
    expect(speedLabel(1)).toBe('1×');
  });

  it('ningún texto lleva guion largo', () => {
    const texts = [
      ...Object.values(MODEL_LABELS),
      ...Object.values(PARAM_NOTES),
      ...Object.values(RESULT_LABELS).flatMap((r) => [r.label, r.symbol, r.note]),
    ];
    for (const text of texts) expect(text).not.toContain('—');
  });
});
