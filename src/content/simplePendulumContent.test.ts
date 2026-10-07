import { describe, expect, it } from 'vitest';
import { pendulumModels } from '../engine/phenomena/pendulum';
import { simplePendulum } from '../engine/phenomena/simplePendulum';
import { defaultParams } from '../engine/validate';
import { simplePendulumContent } from './simplePendulumContent';

function outputsFor(overrides: Record<string, number>): Record<string, number> {
  const params = { ...defaultParams(simplePendulum.paramSchema), ...overrides };
  return simplePendulum.outputs(simplePendulum.initialState(params), params);
}

function periodFor(overrides: Record<string, number>): number {
  return outputsFor(overrides).T;
}

const fmt = (value: number, decimals: number) => value.toFixed(decimals).replace('.', ',');
const allExperimentText = () =>
  simplePendulumContent.experiments
    .flatMap((e) => [
      e.conclusion,
      ...e.check.flatMap((q) => Object.values(q.feedback)),
      ...e.steps.map((st) => st.instruction),
    ])
    .join(' ');
const experiment = (id: string) => simplePendulumContent.experiments.find((e) => e.id === id)!;

describe('simplePendulumContent: consistencia con el motor', () => {
  it('tiene ayuda para los 5 parámetros y los 4 resultados mostrados', () => {
    const paramKeys = simplePendulum.paramSchema.map((s) => s.key).sort();
    expect(simplePendulumContent.paramHelp.map((h) => h.paramKey).sort()).toEqual(paramKeys);
    expect(simplePendulumContent.resultHelp.map((h) => h.resultKey).sort()).toEqual(['T', 'T0', 'f', 'omega0'].sort());
  });

  it('"Preparar valores" siempre fija la fricción en 0, para no heredar la del estudiante', () => {
    for (const e of simplePendulumContent.experiments) {
      for (const step of e.steps) {
        if (step.prepareParams) expect(step.prepareParams.b).toBe(0);
      }
    }
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

  it('experimento "¿Depende de la gravedad?": T ∝ 1/√g y la conclusión cita el T real en la Luna y en la Tierra', () => {
    const moonG = simplePendulumContent.presets.g.find((p) => p.label === 'Luna')!.value;
    expect(periodFor({ g: moonG }) / periodFor({})).toBeCloseTo(Math.sqrt(9.8 / moonG), 6);
    const conclusion = experiment('depende-de-la-gravedad').conclusion;
    expect(conclusion).toContain(`${fmt(periodFor({ g: moonG }), 3)} s`);
    expect(conclusion).toContain(`${fmt(periodFor({}), 3)} s`);
  });

  it('las cifras de T citadas en las conclusiones coinciden con el motor real', () => {
    expect(experiment('conoce-el-pendulo').conclusion).toContain(`T ≈ ${fmt(periodFor({}), 3)} s`);
    expect(experiment('depende-de-la-longitud').check[0].feedback.doble).toContain(
      `de ${fmt(periodFor({}), 3)} s a ${fmt(periodFor({ L: 4 }), 3)} s`,
    );
  });

  it('experimento "¿Y del ángulo?": T sube con φ₀ y predicción, comprobación y motor dan la misma respuesta', () => {
    const t10 = periodFor({ phi0: 10 });
    const t60 = periodFor({ phi0: 60 });
    const rise = ((t60 - t10) / t10) * 100;
    expect(rise).toBeGreaterThan(0);
    expect(rise).toBeLessThan(10);
    const exp = experiment('depende-del-angulo');
    const check = exp.check[0];
    expect(exp.predict.correctOptionId).toBe('poco');
    expect(check.correctOptionId).toBe('poco');
    expect(check.options.find((o) => o.id === 'poco')!.label).toContain('menos de un 10 %');
    expect(check.feedback.poco).toContain(`de ${fmt(t10, 3)} s a ${fmt(t60, 3)} s`);
    expect(check.feedback.poco).toContain(`${fmt(rise, 0)} %`);
    expect(exp.conclusion).toContain(`${fmt(t10, 3)} s (10°) a ${fmt(t60, 3)} s (60°)`);
    expect(exp.conclusion).toContain(`${fmt(rise, 0)} %`);
    const warning = simplePendulum.modelLimits[0].evaluate({ ...defaultParams(simplePendulum.paramSchema), phi0: 60 });
    expect(exp.conclusion).toContain(`${fmt(((outputsFor({ phi0: 60 }).T / outputsFor({ phi0: 60 }).T0) - 1) * 100, 1)} %`);
    expect(warning.message).toContain(`${fmt(((outputsFor({ phi0: 60 }).T / outputsFor({ phi0: 60 }).T0) - 1) * 100, 1)} %`);
  });

  it('el aviso a 30° reporta 1,7 % y ese es el aumento real de T respecto a T₀', () => {
    const warning = simplePendulum.modelLimits[0].evaluate({
      ...defaultParams(simplePendulum.paramSchema),
      phi0: 30,
    });
    expect(warning.message).toContain('1,7 %');
    const out = outputsFor({ phi0: 30 });
    expect(fmt((out.T / out.T0 - 1) * 100, 1)).toBe('1,7');
  });

  it('T₀ y T se muestran con explicaciones distintas y T₀ es el de ángulo pequeño', () => {
    const help = (key: string) => simplePendulumContent.resultHelp.find((h) => h.resultKey === key)!;
    expect(help('T').label).toBe('Período T');
    expect(help('T').explanation).toContain('real');
    expect(help('T0').label).toBe('Período T₀ (ángulo pequeño)');
    expect(help('T0').unit).toBe('s');
    expect(help('T0').decimals).toBe(3);
    expect(help('T0').explanation).toContain('2π√(L/g)');
    expect(help('f').explanation).toContain('real');
  });

  it('no queda texto obsoleto: "tal como predijiste", Galileo, modelo simplificado, valores de T de ángulo pequeño', () => {
    const text = allExperimentText();
    expect(text).not.toContain('tal como predijiste');
    expect(text).not.toContain('Galileo');
    expect(text).not.toContain('modelo simplificado');
    expect(text).not.toContain('2,007');
    expect(text).not.toContain('4,937');
    expect(simplePendulumContent.paramHelp.find((h) => h.paramKey === 'L')!.origin).toContain(
      'El péndulo de un reloj de pie mide cerca de 1 m.',
    );
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

  it('la fórmula describe T₀ y el período real T con los parámetros actuales', () => {
    const params = defaultParams(simplePendulum.paramSchema);
    const results = simplePendulum.outputs(simplePendulum.initialState(params), params);
    const text = simplePendulumContent.formula.describe(params, results);
    expect(text).toContain('T₀ = 2π√(L/g) = 2π√(1/9,8)');
    expect(text).toContain(`= ${fmt(results.T0, 3)} s`);
    expect(text).toContain(`con φ₀ = 10°, el período real es T = ${fmt(results.T, 3)} s`.replace('con', 'Con'));
    expect(fmt(results.T0, 3)).toBe('2,007');
    expect(fmt(results.T, 3)).toBe('2,011');
  });
});

describe('simplePendulumContent: teoría por modelo (HU-14, HU-16, HU-17)', () => {
  const models = ['lineal', 'no-lineal'] as const;
  const textOf = (model: (typeof models)[number]) => {
    const t = simplePendulumContent.theoryByModel[model];
    return [t.title, ...t.equations, t.validity, t.chartOrigin, t.signConvention].join(' ');
  };

  it.each(models)('el modelo %s tiene título, ecuaciones y los tres textos explicativos no vacíos', (model) => {
    const t = simplePendulumContent.theoryByModel[model];
    expect(t.title.trim()).not.toBe('');
    expect(t.equations.length).toBeGreaterThanOrEqual(2);
    for (const equation of t.equations) expect(equation.trim()).not.toBe('');
    for (const text of [t.validity, t.chartOrigin, t.signConvention]) expect(text.trim()).not.toBe('');
  });

  it.each(models)('el origen de la gráfica (%s) dice que la azul es integración numérica y no la solución analítica', (model) => {
    const origin = simplePendulumContent.theoryByModel[model].chartOrigin;
    expect(origin).toContain('integración numérica');
    expect(origin).toMatch(/solución analítica/);
    expect(origin).not.toMatch(/azul[^.]*es la solución analítica/i);
    expect(origin).toMatch(/no es una fórmula escrita a mano ni una captura/);
  });

  it.each(models)('la convención de signos (%s) nombra el eje vertical, la derecha y la izquierda', (model) => {
    const signs = simplePendulumContent.theoryByModel[model].signConvention;
    expect(signs).toContain('vertical');
    expect(signs).toMatch(/positivo[^.]*derecha/);
    expect(signs).toMatch(/negativo[^.]*izquierda/);
  });

  it.each(models)('la validez (%s) menciona el umbral de 10°', (model) => {
    expect(simplePendulumContent.theoryByModel[model].validity).toContain('10°');
  });

  it('las ecuaciones incluyen la fricción y, en el modo no lineal, sen θ y el período con K(k)', () => {
    const lineal = simplePendulumContent.theoryByModel.lineal.equations.join(' ');
    const noLineal = simplePendulumContent.theoryByModel['no-lineal'].equations.join(' ');
    expect(lineal).toContain('b·θ');
    expect(lineal).toContain('θ(t) = A·cos');
    expect(noLineal).toContain('sen θ');
    expect(noLineal).toContain('b·θ');
    expect(noLineal).toContain('K(k)');
    expect(noLineal).toContain('sen(φ₀/2)');
  });

  it('el modo no lineal muestra la serie del profesor, su suma y el primer término', () => {
    const equations = simplePendulumContent.theoryByModel['no-lineal'].equations.join(' | ');
    expect(equations).toContain('(1/2)²·sen²(φ₀/2)');
    expect(equations).toContain('(1·3 / 2·4)²·sen⁴(φ₀/2)');
    expect(equations).toContain('(1·3·5 / 2·4·6)²·sen⁶(φ₀/2)');
    expect(equations).toContain('Σ');
    expect(equations).toContain('(2n)!');
    expect(equations).toContain('T ≈ T₀ · (1 + φ₀²/16)');
  });

  it.each(models)('los textos (%s) usan coma decimal, no punto', (model) => {
    expect(textOf(model)).not.toMatch(/\d\.\d/);
  });

  it('el modo no lineal explica por qué las curvas se separan desde el primer ciclo', () => {
    const origin = simplePendulumContent.theoryByModel['no-lineal'].chartOrigin;
    expect(origin).toMatch(/se separan/);
    expect(origin).toContain('sen θ');
  });
});

describe('simplePendulumContent: ayuda de parámetros en tres textos (HU-12, HU-18)', () => {
  const helpFor = (key: string) => simplePendulumContent.paramHelp.find((h) => h.paramKey === key)!;
  const keys = simplePendulum.paramSchema.map((s) => s.key);

  it.each(keys)('el parámetro %s tiene origen, función y efecto no vacíos', (key) => {
    const help = helpFor(key);
    expect(help.origin.trim()).not.toBe('');
    expect(help.role.trim()).not.toBe('');
    expect(help.effect.trim()).not.toBe('');
  });

  it.each(keys)('los textos de %s usan coma decimal, no punto', (key) => {
    const help = helpFor(key);
    expect(`${help.origin} ${help.role} ${help.effect} ${help.note ?? ''}`).not.toMatch(/\d\.\d/);
  });

  it('la masa explica la cancelación y avisa de forma permanente que θ(t) y T no cambian', () => {
    const m = helpFor('m');
    expect(m.effect).toContain('no cambian');
    expect(m.effect).toContain('cancela');
    expect(m.effect).toContain('energía');
    expect(m.note).toBe('La masa se cancela: θ(t) y T no cambian.');
  });

  it('la fricción es por unidad de masa y menciona su máximo y el período amortiguado', () => {
    const b = helpFor('b');
    const text = `${b.origin} ${b.role} ${b.effect}`;
    expect(text).toContain('por unidad de masa');
    expect(text).toContain('0,4');
    expect(text).toContain('2π/√(ω₀² − b²/4)');
  });

  it('φ₀ distingue los dos modelos y su rango', () => {
    const phi = helpFor('phi0');
    const text = `${phi.role} ${phi.effect}`;
    expect(text).toContain('lineal');
    expect(text).toContain('no lineal');
    expect(text).toContain('15°');
    expect(text).toContain('60°');
  });

  it('solo la masa lleva aviso permanente', () => {
    expect(simplePendulumContent.paramHelp.filter((h) => h.note).map((h) => h.paramKey)).toEqual(['m']);
  });
});

describe('simplePendulumContent: experimentos y resultados tras la revisión de la Fase 6', () => {
  it('los experimentos están escritos para el modelo no lineal y sus valores caben en su esquema', () => {
    expect(simplePendulumContent.experimentModel).toBe('no-lineal');
    const schema = pendulumModels[simplePendulumContent.experimentModel].paramSchema;
    for (const experiment of simplePendulumContent.experiments) {
      for (const step of experiment.steps) {
        for (const [key, value] of Object.entries(step.prepareParams ?? {})) {
          const spec = schema.find((s) => s.key === key)!;
          expect(value).toBeGreaterThanOrEqual(spec.min);
          expect(value).toBeLessThanOrEqual(spec.max);
        }
      }
    }
  });

  it('un experimento pide 60° en sus instrucciones (por eso no puede correr en el modelo lineal, máximo 15°)', () => {
    expect(allExperimentText()).toContain('60°');
    const linealMax = pendulumModels.lineal.paramSchema.find((s) => s.key === 'phi0')!.max;
    expect(linealMax).toBeLessThan(60);
  });

  it('la ayuda de T y de f aclara que son los valores sin fricción', () => {
    for (const key of ['T', 'f']) {
      const text = simplePendulumContent.resultHelp.find((h) => h.resultKey === key)!.explanation;
      expect(text).toContain('sin fricción');
    }
  });
});

describe('simplePendulumContent: vocabulario igual al de la interfaz', () => {
  const models = ['lineal', 'no-lineal'] as const;
  const theoryTexts = () =>
    models.flatMap((model) => {
      const t = simplePendulumContent.theoryByModel[model];
      return [t.title, t.validity, t.chartOrigin];
    });

  it.each(models)('el origen de la gráfica (%s) nombra las curvas como la leyenda: Simulación y Ángulo pequeño', (model) => {
    const origin = simplePendulumContent.theoryByModel[model].chartOrigin;
    expect(origin).toContain('La curva azul (Simulación)');
    expect(origin).toContain('La curva punteada (Ángulo pequeño)');
    expect(origin).not.toMatch(/Simulada|Aprox\. lineal/);
  });

  it('los títulos de la teoría empiezan con el nombre del modelo en la interfaz (Ángulo pequeño, Real)', () => {
    expect(simplePendulumContent.theoryByModel.lineal.title).toMatch(/^Ángulo pequeño/);
    expect(simplePendulumContent.theoryByModel['no-lineal'].title).toMatch(/^Real/);
  });

  it('los experimentos no usan nombres que la pantalla ya no tiene', () => {
    const text = allExperimentText();
    expect(text).not.toMatch(/Lo que obtienes|Aproximación lineal|aproximación lineal|Aprox\. lineal|Simulada/);
    expect(text).not.toMatch(/Longitud L|Ángulo inicial φ₀|Masa m/);
    expect(theoryTexts().join(' ')).not.toMatch(/Aproximación lineal|Aprox\. lineal/);
  });

  it('los pasos nombran los controles como la pantalla: Largo del hilo, Ángulo de salida, Masa', () => {
    const instructions = (id: string) => experiment(id).steps.map((step) => step.instruction).join(' ');
    expect(instructions('depende-de-la-longitud')).toContain('Largo del hilo (L)');
    expect(instructions('depende-del-angulo')).toContain('Ángulo de salida (φ₀)');
    expect(instructions('depende-de-la-masa')).toContain('Masa (m)');
    expect(instructions('depende-del-angulo')).toContain('curva punteada (Ángulo pequeño)');
    expect(instructions('depende-del-angulo')).toContain('curva azul (Simulación)');
  });

  it('el experimento de la longitud mantiene "Casi:" para quien responde "cuatro veces mayor"', () => {
    expect(experiment('depende-de-la-longitud').check[0].feedback.cuadruple).toMatch(/^Casi: /);
  });
});

