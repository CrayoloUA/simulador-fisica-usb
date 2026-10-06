import { describe, expect, it } from 'vitest';
import { simplePendulumContent } from '../content/simplePendulumContent';
import { stepNeedsDrawer } from './lessonLayout';

describe('stepNeedsDrawer', () => {
  it('sin paso o sin resaltado no abre el cajón', () => {
    expect(stepNeedsDrawer(undefined)).toBe(false);
    expect(stepNeedsDrawer({})).toBe(false);
  });

  it('los controles y resultados de la pantalla principal no lo abren', () => {
    expect(stepNeedsDrawer({ highlightParamKey: 'L' })).toBe(false);
    expect(stepNeedsDrawer({ highlightParamKey: 'phi0' })).toBe(false);
    expect(stepNeedsDrawer({ highlightParamKey: 'g' })).toBe(false);
    expect(stepNeedsDrawer({ highlightResultKey: 'T' })).toBe(false);
    expect(stepNeedsDrawer({ highlightResultKey: 'f' })).toBe(false);
  });

  it('la masa, el rozamiento y los datos para curiosos sí lo abren', () => {
    expect(stepNeedsDrawer({ highlightParamKey: 'm' })).toBe(true);
    expect(stepNeedsDrawer({ highlightParamKey: 'b' })).toBe(true);
    expect(stepNeedsDrawer({ highlightResultKey: 'T0' })).toBe(true);
    expect(stepNeedsDrawer({ highlightResultKey: 'periodError' })).toBe(true);
    expect(stepNeedsDrawer({ highlightResultKey: 'omega0' })).toBe(true);
  });

  it('en los experimentos reales, solo el paso que resalta la masa pide el cajón', () => {
    const needing = simplePendulumContent.experiments.flatMap((e) =>
      e.steps.filter(stepNeedsDrawer).map((step) => `${e.id}: ${step.highlightParamKey ?? step.highlightResultKey}`),
    );
    expect(needing).toEqual(['depende-de-la-masa: m']);
  });
});
