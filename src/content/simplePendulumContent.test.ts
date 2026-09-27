import { describe, expect, it } from 'vitest';
import { simplePendulum } from '../engine/phenomena/simplePendulum';
import { defaultParams } from '../engine/validate';
import { simplePendulumContent } from './simplePendulumContent';

function periodFor(overrides: Partial<Record<string, number>>): number {
  const params = { ...defaultParams(simplePendulum.paramSchema), ...overrides };
  return simplePendulum.outputs(simplePendulum.initialState(params), params).T;
}

describe('simplePendulumContent: consistencia con el motor', () => {
  it('tiene ayuda para los 4 parámetros y los 3 resultados mostrados', () => {
    const paramKeys = simplePendulum.paramSchema.map((s) => s.key).sort();
    expect(simplePendulumContent.paramHelp.map((h) => h.paramKey).sort()).toEqual(paramKeys);
    expect(simplePendulumContent.resultHelp.map((h) => h.resultKey).sort()).toEqual(['T', 'f', 'omega0'].sort());
  });

  it('incluye las 4 gravedades predefinidas dentro del rango válido de g', () => {
    const gSpec = simplePendulum.paramSchema.find((s) => s.key === 'g')!;
    const presets = simplePendulumContent.presets.g;
    expect(presets).toHaveLength(4);
    for (const preset of presets) {
      expect(preset.value).toBeGreaterThanOrEqual(gSpec.min);
      expect(preset.value).toBeLessThanOrEqual(gSpec.max);
    }
  });

  it('experimento "¿Depende de la masa?": T no cambia entre 0,5 kg y 5 kg', () => {
    expect(periodFor({ m: 5 })).toBeCloseTo(periodFor({ m: 0.5 }), 6);
  });

  it('experimento "¿Depende de la longitud?": L×4 duplica T', () => {
    expect(periodFor({ L: 4 })).toBeCloseTo(2 * periodFor({ L: 1 }), 6);
  });

  it('experimento "¿Depende de la gravedad?": en la Luna T está entre 4,9 y 5,0 s', () => {
    const moonG = simplePendulumContent.presets.g.find((p) => p.label === 'Luna')!.value;
    const T = periodFor({ g: moonG });
    expect(T).toBeGreaterThan(4.9);
    expect(T).toBeLessThan(5.0);
  });

  it('experimento "¿Y del ángulo?": T no cambia con φ₀, y el aviso reporta ~1,7 % a 30°', () => {
    expect(periodFor({ phi0: 30 })).toBeCloseTo(periodFor({ phi0: 10 }), 6);
    const warning = simplePendulum.modelLimits[0].evaluate({
      ...defaultParams(simplePendulum.paramSchema),
      phi0: 30,
    });
    expect(warning.message).toContain('1,7 %');
  });

  it('los ids de los experimentos son únicos', () => {
    const ids = simplePendulumContent.experiments.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada experimento tiene predict, steps, check y conclusion completos', () => {
    for (const exp of simplePendulumContent.experiments) {
      expect(exp.predict.options.length).toBeGreaterThan(1);
      expect(exp.predict.options.some((o) => o.id === exp.predict.correctOptionId)).toBe(true);
      expect(exp.steps.length).toBeGreaterThan(0);
      expect(exp.check.length).toBeGreaterThan(0);
      for (const q of exp.check) {
        expect(q.options.some((o) => o.id === q.correctOptionId)).toBe(true);
        for (const opt of q.options) expect(q.feedback[opt.id]).toBeTruthy();
      }
      expect(exp.conclusion.length).toBeGreaterThan(0);
    }
  });

  it('los valores de "Preparar" de cada paso están dentro de rango', () => {
    const schemaByKey = Object.fromEntries(simplePendulum.paramSchema.map((s) => [s.key, s]));
    for (const exp of simplePendulumContent.experiments) {
      for (const step of exp.steps) {
        if (!step.prepareParams) continue;
        for (const [key, value] of Object.entries(step.prepareParams)) {
          const spec = schemaByKey[key];
          expect(spec).toBeDefined();
          expect(value as number).toBeGreaterThanOrEqual(spec.min);
          expect(value as number).toBeLessThanOrEqual(spec.max);
        }
      }
    }
  });

  it('los highlightParamKey y highlightResultKey referencian claves existentes', () => {
    const paramKeys = new Set(simplePendulum.paramSchema.map((s) => s.key));
    const resultKeys = new Set(simplePendulumContent.resultHelp.map((h) => h.resultKey));
    for (const exp of simplePendulumContent.experiments) {
      for (const step of exp.steps) {
        if (step.highlightParamKey) expect(paramKeys.has(step.highlightParamKey)).toBe(true);
        if (step.highlightResultKey) expect(resultKeys.has(step.highlightResultKey)).toBe(true);
      }
    }
  });

  it('la fórmula describe T con los parámetros actuales', () => {
    const params = defaultParams(simplePendulum.paramSchema);
    const results = simplePendulum.outputs(simplePendulum.initialState(params), params);
    expect(simplePendulumContent.formula.describe(params, results)).toContain('2,007 s');
  });
});
