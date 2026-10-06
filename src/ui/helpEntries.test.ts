import { describe, expect, it } from 'vitest';
import { simplePendulumContent } from '../content/simplePendulumContent';
import { pendulumModels } from '../engine/phenomena/pendulum';
import { buildHelpEntries, paramHelpId, resultHelpId } from './helpEntries';

const schema = pendulumModels['no-lineal'].paramSchema;
const entries = buildHelpEntries(simplePendulumContent, schema);

describe('buildHelpEntries', () => {
  it('crea una entrada por cada parámetro y por cada resultado con ayuda, sin ids repetidos', () => {
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const spec of schema) expect(ids).toContain(paramHelpId(spec.key));
    for (const help of simplePendulumContent.resultHelp) expect(ids).toContain(resultHelpId(help.resultKey));
  });

  it('los parámetros llevan los tres textos reales del contenido', () => {
    const mass = entries.find((entry) => entry.id === paramHelpId('m'))!;
    expect(mass.sections.map((s) => s.heading)).toEqual(['De dónde sale', 'Para qué sirve', 'Si la cambias u omites']);
    const help = simplePendulumContent.paramHelp.find((h) => h.paramKey === 'm')!;
    expect(mass.sections.map((s) => s.text)).toEqual([help.origin, help.role, help.effect]);
  });

  it('los resultados llevan su texto único real', () => {
    const period = entries.find((entry) => entry.id === resultHelpId('T'))!;
    expect(period.sections).toHaveLength(1);
    const help = simplePendulumContent.resultHelp.find((h) => h.resultKey === 'T')!;
    expect(period.sections[0].text).toBe(help.explanation);
  });

  it('los títulos usan el nombre para niños con su símbolo', () => {
    const title = (id: string) => entries.find((entry) => entry.id === id)!.title;
    expect(title(paramHelpId('L'))).toBe('Largo del hilo (L)');
    expect(title(paramHelpId('phi0'))).toBe('Ángulo de salida (φ₀)');
    expect(title(resultHelpId('T'))).toBe('Período (T)');
    expect(title(resultHelpId('f'))).toBe('Frecuencia (f)');
  });

  it('no inventa ayuda para un parámetro que el contenido no explica', () => {
    const partial = {
      ...simplePendulumContent,
      paramHelp: simplePendulumContent.paramHelp.filter((h) => h.paramKey !== 'b'),
    };
    const ids = buildHelpEntries(partial, schema).map((entry) => entry.id);
    expect(ids).not.toContain(paramHelpId('b'));
  });
});
