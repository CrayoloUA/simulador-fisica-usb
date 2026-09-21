import { describe, expect, it } from 'vitest';
import type { ParamSpec } from './types';
import { defaultParams, validateParams } from './validate';

const schema: ParamSpec[] = [
  { key: 'L', label: 'Longitud', symbol: 'L', unit: 'm', min: 0.1, max: 5, step: 0.1, defaultValue: 1 },
  { key: 'g', label: 'Gravedad', symbol: 'g', unit: 'm/s²', min: 1, max: 25, step: 0.1, defaultValue: 9.8 },
];

describe('validateParams', () => {
  it('acepta valores válidos, incluida la coma decimal', () => {
    const result = validateParams(schema, { L: '2', g: '9,8' });
    expect(result.ok).toBe(true);
    expect(result.params).toEqual({ L: 2, g: 9.8 });
    expect(result.errors).toEqual({});
  });

  it('incluye los límites en el rango permitido', () => {
    expect(validateParams(schema, { L: '5', g: '1' }).ok).toBe(true);
    expect(validateParams(schema, { L: '0,1', g: '25' }).ok).toBe(true);
  });

  it('rechaza un valor fuera de rango con un mensaje en español', () => {
    const result = validateParams(schema, { L: '0', g: '9,8' });
    expect(result.ok).toBe(false);
    expect(result.errors.L).toBe('L debe estar entre 0,1 y 5 m');
    expect(result.params).toEqual({ g: 9.8 });
  });

  it('rechaza texto que no es un número', () => {
    const result = validateParams(schema, { L: 'abc', g: '9,8' });
    expect(result.errors.L).toBe('L debe ser un número');
  });

  it('trata una clave ausente como no numérica', () => {
    const result = validateParams(schema, { g: '9,8' });
    expect(result.errors.L).toBe('L debe ser un número');
  });
});

describe('defaultParams', () => {
  it('devuelve el valor por defecto de cada parámetro', () => {
    expect(defaultParams(schema)).toEqual({ L: 1, g: 9.8 });
  });
});
