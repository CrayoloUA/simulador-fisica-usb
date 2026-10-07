import { describe, expect, it } from 'vitest';
import { simplePendulumContent } from '../content/simplePendulumContent';
import { lessonInlineItems, presetsVisible } from './lessonLayout';

describe('lessonInlineItems', () => {
  it('sin paso o sin resaltado no muestra nada dentro de la tarjeta', () => {
    expect(lessonInlineItems(undefined)).toEqual([]);
    expect(lessonInlineItems({})).toEqual([]);
  });

  it('los controles y resultados de la pantalla principal se resaltan en su sitio', () => {
    expect(lessonInlineItems({ highlightParamKey: 'L' })).toEqual([]);
    expect(lessonInlineItems({ highlightParamKey: 'phi0' })).toEqual([]);
    expect(lessonInlineItems({ highlightParamKey: 'g' })).toEqual([]);
    expect(lessonInlineItems({ highlightResultKey: 'T' })).toEqual([]);
    expect(lessonInlineItems({ highlightResultKey: 'f' })).toEqual([]);
  });

  it('la masa y el rozamiento se muestran dentro de la tarjeta', () => {
    expect(lessonInlineItems({ highlightParamKey: 'm' })).toEqual([{ kind: 'param', key: 'm' }]);
    expect(lessonInlineItems({ highlightParamKey: 'b' })).toEqual([{ kind: 'param', key: 'b' }]);
  });

  it('T₀, la diferencia y ω₀ se muestran dentro de la tarjeta', () => {
    expect(lessonInlineItems({ highlightResultKey: 'T0' })).toEqual([{ kind: 'result', key: 'T0' }]);
    expect(lessonInlineItems({ highlightResultKey: 'periodError' })).toEqual([{ kind: 'result', key: 'periodError' }]);
    expect(lessonInlineItems({ highlightResultKey: 'omega0' })).toEqual([{ kind: 'result', key: 'omega0' }]);
  });

  it('un paso con control y resultado del cajón los muestra a los dos, el control primero', () => {
    expect(lessonInlineItems({ highlightParamKey: 'b', highlightResultKey: 'T0' })).toEqual([
      { kind: 'param', key: 'b' },
      { kind: 'result', key: 'T0' },
    ]);
  });

  it('en los experimentos reales, solo el paso que resalta la masa lleva algo dentro de la tarjeta', () => {
    const inline = simplePendulumContent.experiments.flatMap((e) =>
      e.steps.filter((step) => lessonInlineItems(step).length > 0).map((step) => `${e.id}: ${step.highlightParamKey}`),
    );
    expect(inline).toEqual(['depende-de-la-masa: m']);
  });
});

describe('presetsVisible', () => {
  it('en Explorar siempre se ven', () => {
    expect(presetsVisible(false, undefined)).toBe(true);
    expect(presetsVisible(false, { highlightParamKey: 'L' })).toBe(true);
  });

  it('en Experimentos solo se ven cuando el paso resalta la gravedad', () => {
    expect(presetsVisible(true, undefined)).toBe(false);
    expect(presetsVisible(true, { highlightParamKey: 'L' })).toBe(false);
    expect(presetsVisible(true, { highlightResultKey: 'T' })).toBe(false);
    expect(presetsVisible(true, { highlightParamKey: 'g' })).toBe(true);
  });

  it('el experimento de la gravedad tiene el paso que pide los botones de planeta', () => {
    const gravity = simplePendulumContent.experiments.find((e) => e.id === 'depende-de-la-gravedad');
    expect(gravity?.steps.some((step) => presetsVisible(true, step))).toBe(true);
  });
});
