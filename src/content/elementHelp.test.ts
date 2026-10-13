import { describe, expect, it } from 'vitest';
import { pendulumPeriodFactor } from '../engine/elliptic';
import { DEG_TO_RAD, formatNumber } from '../engine/numbers';
import { pendulumModels } from '../engine/phenomena/pendulum';
import { Simulation } from '../engine/simulation';
import { defaultParams } from '../engine/validate';
import { SPEEDS } from '../ui/kidLabels';
import { ELEMENT_ID, elementHelp, resultExtras } from './elementHelp';
import { simplePendulumContent } from './simplePendulumContent';

/*
 * Las cifras de los textos de ayuda salen del motor: si cambia el paso de cálculo, un rango de
 * ángulo o el período, estas pruebas fallan y avisan que el texto quedó viejo.
 */

const real = pendulumModels['no-lineal'];
const linear = pendulumModels.lineal;
const baseParams = defaultParams(real.paramSchema);

/** Resultados del motor en reposo para L = 1 m, g = 9,8 m/s² y el ángulo dado (modelo real). */
function outputsAt(phi0: number, overrides: Record<string, number> = {}) {
  const params = { ...baseParams, L: 1, g: 9.8, phi0, ...overrides };
  return real.outputs(real.initialState(params), params);
}

const maxPhi0 = (schema: typeof real.paramSchema) => schema.find((spec) => spec.key === 'phi0')!.max;

/** Los textos llevan espacio duro entre la cifra y su unidad (que no se parta al final de la línea): aquí se comparan con espacio normal. */
const plain = (text: string) => text.replace(/ /g, ' ');
const textOf = (id: string): string => {
  const help = elementHelp.find((h) => h.id === id)!;
  return plain(`${help.what} ${help.why} ${help.ifNot}`);
};
const curveSim = textOf(ELEMENT_ID.curvaSimulacion);
const curveLinear = textOf(ELEMENT_ID.curvaLineal);
const calc = textOf(ELEMENT_ID.calculo);
const speed = textOf(ELEMENT_ID.velocidad);

describe('textos de ayuda: cifras contra el motor', () => {
  it('"200 pasos por cada segundo" es 1 / dt del motor', () => {
    const sim = new Simulation(real, baseParams);
    expect(1 / sim.dt).toBeCloseTo(200, 9);
    expect(curveSim).toContain(`${formatNumber(Math.round(1 / sim.dt))} pasos por cada segundo`);
  });

  it('a 60° con L = 1 m y g = 9,8 m/s², T₀ y T son los del texto y la diferencia es 7,3 %', () => {
    const out = outputsAt(60);
    expect(formatNumber(out.T0, 3)).toBe('2,007');
    expect(formatNumber(out.T, 3)).toBe('2,154');
    expect(formatNumber(out.periodError, 1)).toBe('7,3');
    expect(((out.T - out.T0) / out.T0) * 100).toBeCloseTo(out.periodError, 6);
    expect(curveSim).toContain('L = 1 m y g = 9,8 m/s²');
    expect(curveSim).toContain('60°');
    expect(curveSim).toContain(`un período de ${formatNumber(out.T0, 3)} s`);
    expect(curveSim).toContain(`el real es ${formatNumber(out.T, 3)} s, un ${formatNumber(out.periodError, 1)} % más largo`);
  });

  it('el texto de T₀ y el de la diferencia citan las mismas cifras', () => {
    const out = outputsAt(60);
    const t0 = resultExtras.find((e) => e.resultKey === 'T0')!;
    const diff = resultExtras.find((e) => e.resultKey === 'periodError')!;
    expect(plain(t0.why)).toContain(`da ${formatNumber(out.T0, 3)} s`);
    expect(plain(diff.what ?? '')).toContain(`φ₀ = 60° es ${formatNumber(out.periodError, 1)} %`);
  });

  it('la diferencia en % depende solo del ángulo, no del largo ni de la gravedad (lo que dice el texto)', () => {
    const base = outputsAt(60).periodError;
    expect(outputsAt(60, { L: 3.7, g: 1.62 }).periodError).toBeCloseTo(base, 9);
    expect(outputsAt(60, { L: 0.2, g: 24.79 }).periodError).toBeCloseTo(base, 9);
    expect(outputsAt(30).periodError).not.toBeCloseTo(base, 3);
  });

  it('los rangos de ángulo citados (15° y 60°) son los máximos de φ₀ de cada modelo', () => {
    expect(maxPhi0(linear.paramSchema)).toBe(15);
    expect(maxPhi0(real.paramSchema)).toBe(60);
    expect(curveLinear).toContain(`hasta ${maxPhi0(linear.paramSchema)}°`);
    expect(calc).toContain(`"Real" usa la ecuación completa y sirve hasta ${maxPhi0(real.paramSchema)}°`);
    expect(calc).toContain(`"Ángulo pequeño" usa la fórmula sencilla y sirve hasta ${maxPhi0(linear.paramSchema)}°`);
  });

  it('las velocidades citadas son las que ofrece la interfaz', () => {
    expect(SPEEDS).toEqual([0.25, 0.5, 1, 2]);
    expect(speed).toContain('0,25×, 0,5×, 1× o 2×');
  });

  it('el ejemplo de la frecuencia (T = 2 s da 0,5 Hz) es 1 / T', () => {
    const f = resultExtras.find((e) => e.resultKey === 'f')!;
    expect(1 / 2).toBe(0.5);
    expect(plain(f.why)).toContain('dura 2 s, hace 0,5 idas y vueltas por segundo, o sea 0,5 Hz');
  });

  describe('ejemplos de "qué pasaría si no fuera así": cada número sale del motor', () => {
    const factorPct = (deg: number) => (pendulumPeriodFactor(deg * DEG_TO_RAD) - 1) * 100;
    const ifNotOf = (id: string) => plain(elementHelp.find((h) => h.id === id)!.ifNot);
    const extraIfNot = (key: string) => plain(resultExtras.find((e) => e.resultKey === key)!.ifNot);

    it('a 90° y a 120° el período real es 18 % y 37 % más largo (y un hilo de verdad ya no aguanta pasar de 90°)', () => {
      expect(formatNumber(factorPct(90), 0)).toBe('18');
      expect(formatNumber(factorPct(120), 0)).toBe('37');
      expect(ifNotOf(ELEMENT_ID.calculo)).toContain('18 % más largo a 90° y 37 % a 120°');
      // Un hilo no puede empujar: soltado por encima de la horizontal (cos φ₀ < 0) la tensión inicial m·g·cos φ₀ es negativa.
      expect(Math.cos(90.0001 * DEG_TO_RAD)).toBeLessThan(0);
      expect(Math.cos(maxPhi0(real.paramSchema) * DEG_TO_RAD)).toBeGreaterThan(0);
    });

    it('a 15° la diferencia es 0,4 % y a 10° es 0,2 %', () => {
      expect(formatNumber(outputsAt(15).periodError, 1)).toBe('0,4');
      expect(formatNumber(outputsAt(10).periodError, 1)).toBe('0,2');
      expect(ifNotOf(ELEMENT_ID.curvaLineal)).toContain('A 15° el período real solo se diferencia 0,4 %');
      expect(ifNotOf(ELEMENT_ID.comparar)).toContain('de 10°, la diferencia entre las dos curvas es de solo 0,2 %');
      expect(extraIfNot('periodError')).toContain('a 15° es 0,4 %');
    });

    it('con rozamiento b = 0,2 la amplitud se reduce a la mitad cada 6,9 s (envolvente e^(−b·t/2) y la simulación)', () => {
      const b = 0.2;
      const half = (2 * Math.LN2) / b;
      expect(formatNumber(half, 1)).toBe('6,9');
      expect(Math.exp((-b * half) / 2)).toBeCloseTo(0.5, 9);
      const params = { ...defaultParams(linear.paramSchema), L: 1, g: 9.8, phi0: 10, b };
      const sim = new Simulation(linear, params);
      while (sim.t < half + 1.2) sim.advance(0.05);
      const phi0Rad = params.phi0 * DEG_TO_RAD;
      const peak = Math.max(
        ...sim.samples.filter((s) => Math.abs(s.t - half) <= 1).map((s) => Math.abs(s.values.theta) / phi0Rad),
      );
      expect(peak).toBeGreaterThan(0.42);
      expect(peak).toBeLessThan(0.58);
      expect(ifNotOf(ELEMENT_ID.salida)).toContain('rozamiento b = 0,2');
      expect(ifNotOf(ELEMENT_ID.salida)).toContain('cada 6,9 s');
    });

    it('soltada a 60° la bolita pasa por abajo a 3,1 m/s (más de 11 km/h)', () => {
      const params = { ...baseParams, L: 1, g: 9.8, phi0: 60 };
      const out = real.outputs(real.initialState(params), params);
      const sim = new Simulation(real, params);
      while (sim.t < out.T / 4) sim.advance(0.05);
      const speedMs = Math.abs(sim.state.omega) * params.L;
      expect(formatNumber(speedMs, 1)).toBe('3,1');
      expect(speedMs * 3.6).toBeGreaterThan(11);
      expect(Math.floor(speedMs * 3.6)).toBe(11);
      expect(ifNotOf(ELEMENT_ID.play)).toContain('a unos 3,1 m/s, más de 11 km/h');
    });

    it('con un hilo de 0,1 m una ida y vuelta dura unos 0,6 s y a 0,25× unos 2,5 s', () => {
      const t0 = outputsAt(5, { L: 0.1 }).T0;
      expect(formatNumber(t0, 1)).toBe('0,6');
      expect(formatNumber(t0 / 0.25, 1)).toBe('2,5');
      expect(ifNotOf(ELEMENT_ID.velocidad)).toContain('hilo de 0,1 m, una ida y vuelta dura unos 0,6 s');
      expect(ifNotOf(ELEMENT_ID.velocidad)).toContain('A 0,25× dura unos 2,5 s');
    });

    it('con L = 4 m el período es el doble: 4,014 s contra 2,007 s', () => {
      const one = outputsAt(5, { L: 1 }).T0;
      const four = outputsAt(5, { L: 4 }).T0;
      expect(four / one).toBeCloseTo(2, 9);
      expect(formatNumber(four, 3)).toBe('4,014');
      expect(extraIfNot('T')).toContain('4,014 s en vez de 2,007 s');
    });

    it('la nota La (440 Hz) tiene un período de 0,0023 s', () => {
      expect(formatNumber(1 / 440, 4)).toBe('0,0023');
      expect(extraIfNot('f')).toContain('440 veces por segundo');
      expect(extraIfNot('f')).toContain('0,0023 s');
    });

    it('en 100 idas y vueltas a 60° la fórmula sencilla se equivoca unos 15 s', () => {
      const out = outputsAt(60);
      expect(Math.round(100 * (out.T - out.T0))).toBe(15);
      expect(extraIfNot('periodError')).toContain('100 idas y vueltas');
      expect(extraIfNot('periodError')).toContain('unos 15 s');
    });

    it('con L = 1 m y g = 9,8 m/s², ω₀ vale 3,13 rad/s', () => {
      expect(formatNumber(outputsAt(10).omega0, 2)).toBe('3,13');
      expect(extraIfNot('omega0')).toContain('gira a 3,13 rad/s');
    });
  });

  it('toda cifra de los textos está registrada y comprobada arriba', () => {
    const out = outputsAt(60);
    const allowed = new Set<string>([
      '0', // θ = 0 y 0°
      formatNumber(1 / new Simulation(real, baseParams).dt), // 200
      formatNumber(maxPhi0(linear.paramSchema)),
      formatNumber(maxPhi0(real.paramSchema)),
      formatNumber(out.T0, 3),
      formatNumber(out.T, 3),
      formatNumber(out.periodError, 1),
      formatNumber(9.8), // g de la Tierra, igual a su valor por defecto
      formatNumber(1), // L = 1 m
      ...SPEEDS.map((s) => formatNumber(s)), // 0,25 · 0,5 · 1 · 2 (también el ejemplo de f)
      // Ejemplos de "qué pasaría si no fuera así", comprobados en el bloque de arriba:
      '90', // 90°: horizontal; 18 % más largo y límite del hilo tenso
      '120', // 120°: 37 % más largo
      '18',
      '37',
      '0,4', // diferencia a 15°
      '0,2', // diferencia a 10° y rozamiento b = 0,2
      '10', // ángulo de salida de 10°
      '6,9', // mitad de la amplitud con b = 0,2
      '3,1', // m/s abajo, soltada a 60°
      '11', // km/h
      '0,1', // hilo de 0,1 m
      '0,6', // ida y vuelta de un hilo de 0,1 m
      '2,5', // a 0,25×
      '4', // hilo 4 veces más largo, 4 m
      '4,014',
      '440',
      '0,0023',
      '100', // idas y vueltas
      '15', // segundos de error en 100 idas y vueltas (y máximo del ángulo pequeño)
      '3,13', // ω₀
    ]);
    expect(baseParams.g).toBe(9.8);
    expect(baseParams.L).toBe(1);
    const all = plain(
      [
        ...elementHelp.flatMap((h) => [h.what, h.why, h.ifNot]),
        ...resultExtras.flatMap((e) => [e.what ?? '', e.why, e.ifNot]),
      ].join(' '),
    );
    // Números sueltos, no pegados a letras (RK4) ni a subíndices (θ₀).
    const found = [...all.matchAll(/(?<![\p{L}\d])\d+(?:,\d+)?/gu)].map((m) => m[0]);
    expect(found.length).toBeGreaterThan(10);
    const unknown = found.filter((n) => !allowed.has(n));
    expect(unknown, `cifras sin comprobar en el motor: ${unknown.join(', ')}`).toEqual([]);
  });
});

describe('textos de ayuda: estructura y estilo', () => {
  it('cada id explicable tiene su entrada, sin repetir', () => {
    const ids = elementHelp.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of Object.values(ELEMENT_ID)) expect(ids).toContain(id);
    expect(ids).toHaveLength(Object.keys(ELEMENT_ID).length);
  });

  it('el contenido enlaza las entradas y los resultados extra', () => {
    expect(simplePendulumContent.elementHelp).toBe(elementHelp);
    expect(simplePendulumContent.resultExtras).toBe(resultExtras);
  });

  it('cada resultado con "Qué es" propio o en resultExtras tiene su por qué y su qué pasaría', () => {
    const keys = ['T', 'f', 'T0', 'periodError', 'omega0'];
    expect(resultExtras.map((e) => e.resultKey).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      const hasHelp = simplePendulumContent.resultHelp.some((h) => h.resultKey === key);
      const extra = resultExtras.find((e) => e.resultKey === key)!;
      expect(hasHelp || extra.what !== undefined, `${key} sin "qué es"`).toBe(true);
    }
  });

  it('cada bloque tiene entre 1 y 4 oraciones', () => {
    // El tercer bloque responde una pregunta real con un caso concreto: a veces necesita 4 oraciones cortas.
    const blocks = [
      ...elementHelp.flatMap((h) => [h.what, h.why, h.ifNot]),
      ...resultExtras.flatMap((e) => [e.why, e.ifNot, ...(e.what ? [e.what] : [])]),
    ];
    for (const block of blocks) {
      const sentences = block.match(/[.!?](?=\s|$)/g)?.length ?? 0;
      expect(sentences, block).toBeGreaterThanOrEqual(1);
      expect(sentences, block).toBeLessThanOrEqual(4);
    }
  });

  it('ningún "qué pasaría si no fuera así" se queda en "tendrías que hacerlo tú"', () => {
    // Ese tipo de respuesta no enseña nada: el bloque debe contar una consecuencia real.
    const lazy = /tendrías que (dividir|restar|calcular|hacer)|lo tendrías que/i;
    const blocks = [...elementHelp.map((h) => h.ifNot), ...resultExtras.map((e) => e.ifNot)];
    for (const block of blocks) expect(block, block).not.toMatch(lazy);
  });

  it('no usa guiones largos ni emojis', () => {
    const all = [
      ...elementHelp.flatMap((h) => [h.title, h.what, h.why, h.ifNot]),
      ...resultExtras.flatMap((e) => [e.what ?? '', e.why, e.ifNot]),
    ].join(' ');
    expect(all).not.toMatch(/—|–/);
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
