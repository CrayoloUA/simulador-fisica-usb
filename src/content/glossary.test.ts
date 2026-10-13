import { describe, expect, it } from 'vitest';
import { formatNumber } from '../engine/numbers';
import { pendulumModels } from '../engine/phenomena/pendulum';
import { elementHelp, resultExtras } from './elementHelp';
import { glossary, termsIn } from './glossary';
import { simplePendulumContent } from './simplePendulumContent';

const sentencesOf = (text: string) => text.match(/[.!?](?=\s|$)/g)?.length ?? 0;

describe('glosario: estructura', () => {
  it('cada palabra tiene id único, definición de 1 o 2 oraciones y al menos una forma de buscarla', () => {
    const ids = glossary.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of glossary) {
      expect(entry.words.length, entry.id).toBeGreaterThan(0);
      const n = sentencesOf(entry.definition);
      expect(n, entry.definition).toBeGreaterThanOrEqual(1);
      expect(n, entry.definition).toBeLessThanOrEqual(2);
    }
  });

  it('no usa guiones largos ni emojis', () => {
    const all = glossary.flatMap((g) => [g.term, g.definition]).join(' ');
    expect(all).not.toMatch(/—|–/);
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('las cifras de las definiciones salen de la física: 2π ≈ 6,28 y g = 9,8 m/s²', () => {
    expect(formatNumber(2 * Math.PI, 2)).toBe('6,28');
    expect(pendulumModels['no-lineal'].paramSchema.find((s) => s.key === 'g')!.defaultValue).toBe(9.8);
    const definition = (id: string) => glossary.find((g) => g.id === id)!.definition;
    expect(definition('radian')).toContain('unos 6,28');
    expect(definition('gravedad')).toContain('9,8 m/s²');
    const found = glossary.flatMap((g) => [...g.definition.matchAll(/(?<![\p{L}\d])\d+(?:,\d+)?/gu)].map((m) => m[0]));
    const allowed = new Set(['1', '2', '6,28', '9,8']);
    expect(found.filter((n) => !allowed.has(n))).toEqual([]);
  });
});

describe('termsIn: qué palabras explica cada tarjeta', () => {
  it('encuentra la palabra entera sin importar mayúsculas, y no dentro de otra palabra', () => {
    expect(termsIn('El Período se mide en segundos').map((t) => t.id)).toEqual(['periodo']);
    expect(termsIn('seno').map((t) => t.id)).toEqual(['seno-coseno']);
    expect(termsIn('desenlace').map((t) => t.id)).toEqual([]);
    expect(termsIn('masas de aire').map((t) => t.id)).toEqual([]);
  });

  it('reconoce símbolos y unidades: Hz, φ₀, ω₀, rad/s, RK4', () => {
    const ids = (text: string) => termsIn(text, { max: 10 }).map((t) => t.id);
    expect(ids('Frecuencia en Hz')).toEqual(['frecuencia', 'hercio']);
    expect(ids('con φ₀ = 60°')).toEqual(['angulo-de-salida']);
    expect(ids('gira a 3,13 rad/s')).toEqual(['radian']);
    expect(ids('ω₀ sube')).toEqual(['rapidez-angular']);
    expect(ids('con un método llamado RK4')).toEqual(['paso-a-paso']);
  });

  it('devuelve en el orden de aparición y respeta el máximo', () => {
    const text = 'La amplitud, el rozamiento, la gravedad y el período aparecen en ese orden.';
    expect(termsIn(text, { max: 10 }).map((t) => t.id)).toEqual(['amplitud', 'rozamiento', 'gravedad', 'periodo']);
    expect(termsIn(text, { max: 2 }).map((t) => t.id)).toEqual(['amplitud', 'rozamiento']);
    expect(termsIn(text)).toHaveLength(3);
  });

  it('omite lo que ya está en el título de la tarjeta', () => {
    const text = 'El período es el tiempo de una ida y vuelta.';
    expect(termsIn(text, { skip: 'Período (T)' }).map((t) => t.id)).toEqual(['ida-y-vuelta']);
    expect(termsIn(text).map((t) => t.id)).toEqual(['periodo', 'ida-y-vuelta']);
  });

  it('un texto sin palabras raras no devuelve nada', () => {
    expect(termsIn('Toca una marca para entender esa parte.')).toEqual([]);
  });
});

describe('glosario: cobertura de los textos reales', () => {
  const RARE = [
    'período',
    'frecuencia',
    'Hz',
    'rad/s',
    'radianes',
    'amplitud',
    'rozamiento',
    'seno',
    'coseno',
    'ecuación',
    'RK4',
    'cresta',
    'vertical',
    'aproximación',
    'tenso',
    'ida y vuelta',
    'gravedad',
    'masa',
    'φ₀',
    'ω₀',
    'modelo',
    'lineal',
    'péndulo compuesto',
  ];

  it('cada palabra rara conocida tiene su definición', () => {
    for (const word of RARE) expect(termsIn(word).length, word).toBeGreaterThan(0);
  });

  it('cada entrada del glosario se usa en algún texto de la aplicación (ninguna queda muerta)', () => {
    const corpus = [
      ...elementHelp.flatMap((h) => [h.title, h.what, h.why, h.ifNot]),
      ...resultExtras.flatMap((e) => [e.what ?? '', e.why, e.ifNot]),
      ...simplePendulumContent.paramHelp.flatMap((h) => [h.origin, h.role, h.effect]),
      ...simplePendulumContent.resultHelp.map((h) => h.explanation),
      ...Object.values(simplePendulumContent.theoryByModel).flatMap((t) => [t.title, t.validity, t.chartOrigin, t.signConvention]),
    ].join(' ');
    const used = new Set(termsIn(corpus, { max: 100 }).map((t) => t.id));
    const dead = glossary.map((g) => g.id).filter((id) => !used.has(id));
    expect(dead, `palabras del glosario que ningún texto usa: ${dead.join(', ')}`).toEqual([]);
  });

  it('cada tarjeta de explicación recibe como máximo 3 palabras', () => {
    for (const h of elementHelp) {
      const terms = termsIn(`${h.what} ${h.why} ${h.ifNot}`, { skip: h.title });
      expect(terms.length, h.title).toBeLessThanOrEqual(3);
    }
  });
});
