import { describe, expect, it } from 'vitest';
import { simplePendulumContent } from '../content/simplePendulumContent';
import { pendulumModels } from '../engine/phenomena/pendulum';
import { HEADING_IF_NOT, HEADING_WHAT, HEADING_WHY, buildHelpEntries, paramHelpId, resultHelpId } from './helpEntries';

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

  it('los resultados llevan su explicación real como "Qué es" y luego los otros dos bloques', () => {
    const period = entries.find((entry) => entry.id === resultHelpId('T'))!;
    expect(period.sections.map((s) => s.heading)).toEqual([HEADING_WHAT, HEADING_WHY, HEADING_IF_NOT]);
    const help = simplePendulumContent.resultHelp.find((h) => h.resultKey === 'T')!;
    const extra = simplePendulumContent.resultExtras.find((e) => e.resultKey === 'T')!;
    expect(period.sections.map((s) => s.text)).toEqual([help.explanation, extra.why, extra.ifNot]);
  });

  it('la diferencia en % (sin resultHelp) toma su "Qué es" de resultExtras', () => {
    const diff = entries.find((entry) => entry.id === resultHelpId('periodError'))!;
    const extra = simplePendulumContent.resultExtras.find((e) => e.resultKey === 'periodError')!;
    expect(diff.title).toBe('Diferencia (T − T₀)/T₀');
    expect(diff.sections[0].text).toBe(extra.what);
  });

  it('las demás partes de la pantalla llevan los tres bloques, con sus encabezados', () => {
    for (const help of simplePendulumContent.elementHelp) {
      const entry = entries.find((e) => e.id === help.id)!;
      expect(entry.title).toBe(help.title);
      expect(entry.sections.map((s) => s.heading)).toEqual([HEADING_WHAT, HEADING_WHY, HEADING_IF_NOT]);
      expect(entry.sections.map((s) => s.text)).toEqual([help.what, help.why, help.ifNot]);
    }
  });

  it('todas las entradas tienen texto en cada bloque', () => {
    for (const entry of entries) {
      expect(entry.sections.length).toBeGreaterThanOrEqual(1);
      for (const section of entry.sections) expect(section.text.trim()).not.toBe('');
    }
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
