import { describe, expect, it } from 'vitest';
import { describeModelChange, switchModel } from './modelSwitch';
import { pendulumModels } from './phenomena/pendulum';
import { defaultParams } from './validate';

const lineal = pendulumModels.lineal.paramSchema;
const noLineal = pendulumModels['no-lineal'].paramSchema;

const rawFor = (patch: Record<string, string> = {}) => ({ L: '1', phi0: '10', g: '9,8', m: '0,5', b: '0', ...patch });

describe('switchModel', () => {
  it('recorta φ₀ al máximo del modo nuevo y avisa', () => {
    const result = switchModel({
      raw: rawFor({ phi0: '40' }),
      params: { ...defaultParams(noLineal), phi0: 40 },
      nextSchema: lineal,
    });
    expect(result.raw.phi0).toBe('15');
    expect(result.params.phi0).toBe(15);
    expect(result.notice).toBe('φ₀ se ajustó a 15° (máximo de ese modo)');
  });

  it('acepta coma decimal al comparar con el máximo', () => {
    const result = switchModel({
      raw: rawFor({ phi0: '15,5' }),
      params: { ...defaultParams(noLineal), phi0: 15.5 },
      nextSchema: lineal,
    });
    expect(result.raw.phi0).toBe('15');
    expect(result.params.phi0).toBe(15);
  });

  it('si φ₀ ya cabe en el modo nuevo no cambia nada ni avisa', () => {
    const params = { ...defaultParams(noLineal), phi0: 12 };
    const result = switchModel({ raw: rawFor({ phi0: '12' }), params, nextSchema: lineal });
    expect(result.raw).toEqual(rawFor({ phi0: '12' }));
    expect(result.params).toEqual(params);
    expect(result.notice).toBeNull();
  });

  it('pasar a un modo con máximo mayor no cambia φ₀', () => {
    const params = { ...defaultParams(lineal), phi0: 15 };
    const result = switchModel({ raw: rawFor({ phi0: '15' }), params, nextSchema: noLineal });
    expect(result.raw.phi0).toBe('15');
    expect(result.params.phi0).toBe(15);
    expect(result.notice).toBeNull();
  });

  it('con texto inválido en φ₀ no toca el texto, pero sí recorta el valor aplicado', () => {
    const result = switchModel({
      raw: rawFor({ phi0: '4x' }),
      params: { ...defaultParams(noLineal), phi0: 40 },
      nextSchema: lineal,
    });
    expect(result.raw.phi0).toBe('4x');
    expect(result.params.phi0).toBe(15);
    expect(result.notice).toBe('φ₀ se ajustó a 15° (máximo de ese modo)');
  });

  it('no modifica los demás parámetros', () => {
    const params = { ...defaultParams(noLineal), phi0: 40, L: 2.5, g: 3.71, b: 0.2 };
    const result = switchModel({
      raw: rawFor({ phi0: '40', L: '2,5', g: '3,71', b: '0,2' }),
      params,
      nextSchema: lineal,
    });
    expect(result.params).toEqual({ ...params, phi0: 15 });
    expect(result.raw).toEqual(rawFor({ phi0: '15', L: '2,5', g: '3,71', b: '0,2' }));
  });
});

describe('switchModel: casos borde', () => {
  it('con φ₀ exactamente en el máximo no avisa', () => {
    const params = { ...defaultParams(noLineal), phi0: 15 };
    const result = switchModel({ raw: rawFor({ phi0: '15' }), params, nextSchema: lineal });
    expect(result.notice).toBeNull();
    expect(result.params.phi0).toBe(15);
  });

  it('con el campo de φ₀ vacío no toca el texto y solo recorta el valor aplicado', () => {
    const result = switchModel({
      raw: rawFor({ phi0: '' }),
      params: { ...defaultParams(noLineal), phi0: 40 },
      nextSchema: lineal,
    });
    expect(result.raw.phi0).toBe('');
    expect(result.params.phi0).toBe(15);
  });

  it('formatea un máximo decimal con su unidad separada por un espacio', () => {
    const schema = [{ key: 'L', label: 'Longitud', symbol: 'L', unit: 'm', min: 0.1, max: 2.5, step: 0.1, defaultValue: 1 }];
    const result = switchModel({ raw: { L: '4' }, params: { L: 4 }, nextSchema: schema });
    expect(result.raw.L).toBe('2,5');
    expect(result.notice).toBe('L se ajustó a 2,5 m (máximo de ese modo)');
  });
});

describe('describeModelChange', () => {
  it('siempre anuncia el modelo nuevo y que la simulación se reinició', () => {
    expect(describeModelChange({ adjustedNotice: null, modelName: 'No lineal (real)', experimentClosed: false })).toBe(
      'Modelo cambiado a «No lineal (real)»: la simulación se reinició.',
    );
  });

  it('suma el ajuste de φ₀ y el cierre del experimento cuando ocurren', () => {
    expect(
      describeModelChange({
        adjustedNotice: 'φ₀ se ajustó a 15° (máximo de ese modo)',
        modelName: 'Lineal (ángulo pequeño)',
        experimentClosed: true,
      }),
    ).toBe(
      'φ₀ se ajustó a 15° (máximo de ese modo). Modelo cambiado a «Lineal (ángulo pequeño)»: la simulación se reinició. Se cerró el experimento en curso.',
    );
  });
});
