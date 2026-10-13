import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { explainAnnouncement, EXPLAIN_BUTTON_LABEL, EXPLAIN_HINT } from '../ui/explain';
import { modeAnnouncement, runAnnouncement } from '../ui/announcements';
import { ErrorFallback } from '../ui/AppErrorBoundary';
import { CANVAS_UNAVAILABLE_TEXT, CANVAS_UNAVAILABLE_TITLE, CHART_UNAVAILABLE_TEXT } from '../ui/canvasSupport';
import { EXPERIMENT_BLURBS, LIST_TITLE, predictionVerdict } from '../ui/lessonProgress';
import { MODEL_CHANGE_WARNING, PARAM_NOTES, RESULT_LABELS, modelNote } from '../ui/kidLabels';
import { describeModelNotice } from '../ui/modelNotice';
import { elementHelp, resultExtras } from './elementHelp';
import { glossary } from './glossary';
import { simplePendulumContent as content } from './simplePendulumContent';

/*
 * Puerta anti "cara de IA" (fase D6): lo que se puede medir del tono del texto de pantalla. La
 * universidad detectó contenido de IA por textos repetitivos que sobreexplican, y la interfaz debe
 * sonar a una persona explicándole a un niño de 11 años: claro y breve. Estas pruebas no juzgan el
 * estilo entero (eso lo hace una persona al leer); solo impiden que vuelvan los defectos medibles:
 * frases de plantilla, aperturas que se repiten, pasajes copiados entre entradas y oraciones kilométricas.
 */

/** Todo el texto de pantalla que escribimos nosotros (sin las ecuaciones, que son fórmulas). */
function everyText(): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = [];
  const add = (where: string, text: string | undefined) => {
    if (text) out.push({ where, text });
  };
  for (const h of elementHelp) for (const [k, v] of Object.entries({ title: h.title, what: h.what, why: h.why, ifNot: h.ifNot })) add(`ayuda ${h.id} ${k}`, v);
  for (const e of resultExtras) for (const [k, v] of Object.entries({ what: e.what, why: e.why, ifNot: e.ifNot })) add(`extra ${e.resultKey} ${k}`, v);
  for (const p of content.paramHelp) for (const [k, v] of Object.entries({ origin: p.origin, role: p.role, effect: p.effect, note: p.note })) add(`parámetro ${p.paramKey} ${k}`, v);
  for (const r of content.resultHelp) add(`resultado ${r.resultKey}`, r.explanation);
  for (const g of glossary) add(`glosario ${g.id}`, `${g.term}. ${g.definition}`);
  for (const [model, t] of Object.entries(content.theoryByModel)) {
    for (const [k, v] of Object.entries({ validity: t.validity, chartOrigin: t.chartOrigin, signConvention: t.signConvention })) add(`teoría ${model} ${k}`, v);
  }
  for (const x of content.experiments) {
    add(`${x.id} predicción`, x.predict.question);
    for (const o of x.predict.options) add(`${x.id} opción`, o.label);
    x.steps.forEach((s, i) => add(`${x.id} paso ${i + 1}`, s.instruction));
    for (const c of x.check) {
      add(`${x.id} pregunta`, c.question);
      for (const [id, v] of Object.entries(c.feedback)) add(`${x.id} respuesta ${id}`, v);
    }
    add(`${x.id} conclusión`, x.conclusion);
  }
  for (const [id, text] of Object.entries(EXPERIMENT_BLURBS)) add(`línea ${id}`, text);
  for (const [k, l] of Object.entries(RESULT_LABELS)) add(`etiqueta ${k}`, `${l.label}. ${l.note}`);
  for (const [k, v] of Object.entries(PARAM_NOTES)) add(`nota ${k}`, v);
  add('modelo lineal', modelNote('lineal', 15));
  add('modelo real', modelNote('no-lineal', 60));
  add('cambio de modelo', MODEL_CHANGE_WARNING);
  add('explicar botón', EXPLAIN_BUTTON_LABEL);
  add('explicar pista', EXPLAIN_HINT);
  add('explicar anuncio', explainAnnouncement(true));
  add('modo', modeAnnouncement('experimentos'));
  add('modo', modeAnnouncement('explorar'));
  for (const e of ['play', 'pause', 'reset'] as const) add(`anuncio ${e}`, runAnnouncement(e));
  add('lección', LIST_TITLE);
  add('predicción acertada', predictionVerdict(true).text);
  add('predicción fallida', predictionVerdict(false).text);
  add('sin canvas', CANVAS_UNAVAILABLE_TITLE);
  add('sin canvas', CANVAS_UNAVAILABLE_TEXT);
  add('sin gráfica', CHART_UNAVAILABLE_TEXT);
  const notice = describeModelNotice({ model: 'no-lineal', periodError: 7.3, withinSmallAngle: false, adjustedTo: null, showLinear: false });
  add('aviso del modelo', notice?.text);
  add('error', renderToStaticMarkup(createElement(ErrorFallback)).replace(/<[^>]+>/g, ' '));
  return out;
}

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).filter(Boolean);
const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean);
const firstWord = (text: string) => wordsOf(text)[0].toLowerCase().replace(/[^\p{L}]/gu, '');

describe('puerta anti cara de IA: frases de plantilla', () => {
  // Frases que delatan texto escrito en piloto automático. Se buscan sin importar mayúsculas.
  const BANNED = [
    /algo salió mal/i,
    /ha ocurrido un error/i,
    /lo sentimos/i,
    /bienvenid[oa]/i,
    /potencia tu/i,
    /descubre/i,
    /sumérgete/i,
    /increíble/i,
    /experiencia (única|inmersiva|interactiva)/i,
    /todo lo que necesitas/i,
    /aprende jugando/i,
    /de manera (fácil|sencilla|intuitiva)/i,
    /es importante (notar|destacar|recordar)/i,
    /cabe (destacar|mencionar)/i,
    /en el (fascinante )?mundo de/i,
    /eso también es parte de aprender/i,
  ];

  it('ningún texto de pantalla usa frases de plantilla ni exclamaciones vacías', () => {
    for (const { where, text } of everyText()) {
      for (const pattern of BANNED) expect(text, `${where}: ${pattern}`).not.toMatch(pattern);
      expect(text, `${where}: exclamación`).not.toMatch(/[¡!]/);
    }
  });

  it('ningún texto usa guiones largos, emojis ni listas de tres adjetivos seguidos', () => {
    for (const { where, text } of everyText()) {
      expect(text, where).not.toMatch(/—|–/);
      expect(text, where).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(text, `${where}: tres adjetivos`).not.toMatch(/\b(rápido|fácil|simple|sencillo|claro|potente|divertido), (rápido|fácil|simple|sencillo|claro|potente|divertido),? y (rápido|fácil|simple|sencillo|claro|potente|divertido)\b/i);
    }
  });
});

describe('puerta anti cara de IA: repetición', () => {
  it('el glosario no empieza todas las definiciones igual: ninguna palabra abre más de una de cada tres', () => {
    const count = new Map<string, number>();
    for (const g of glossary) count.set(firstWord(g.definition), (count.get(firstWord(g.definition)) ?? 0) + 1);
    const [word, times] = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
    expect(times / glossary.length, `"${word}" abre ${times} de ${glossary.length} definiciones`).toBeLessThanOrEqual(1 / 3);
  });

  it('"Qué pasaría si no fuera así" no abre casi siempre con "Sin" ni con "Si"', () => {
    const blocks = [...elementHelp.map((h) => h.ifNot), ...resultExtras.map((e) => e.ifNot)];
    const sin = blocks.filter((b) => firstWord(b) === 'sin').length;
    const si = blocks.filter((b) => firstWord(b) === 'si').length;
    expect(sin, 'aperturas con "Sin"').toBeLessThanOrEqual(3);
    expect(si, 'aperturas con "Si"').toBeLessThanOrEqual(Math.ceil(blocks.length / 3));
  });

  it('las respuestas equivocadas no abren todas con el mismo reproche', () => {
    const wrong: string[] = [];
    for (const x of content.experiments) {
      for (const c of x.check) for (const [id, v] of Object.entries(c.feedback)) if (id !== c.correctOptionId) wrong.push(v);
    }
    const openers = wrong.map((v) => v.split(':')[0]);
    const revisa = openers.filter((o) => o === 'Revisa de nuevo').length;
    expect(revisa, 'respuestas que abren con "Revisa de nuevo"').toBeLessThanOrEqual(Math.floor(wrong.length / 3));
  });

  it('ningún pasaje de 8 palabras seguidas se copia entre dos entradas de ayuda distintas', () => {
    const N = 8;
    const owners = new Map<string, Set<string>>();
    const entries = everyText().filter(({ where }) => /^(ayuda|extra|parámetro|resultado|teoría)/.test(where));
    for (const { where, text } of entries) {
      // Las dos teorías (lineal y no lineal) nunca se ven juntas: se cuentan como una sola.
      const owner = where.startsWith('teoría') ? 'teoría' : where.split(' ').slice(0, 2).join(' ');
      const w = wordsOf(text.toLowerCase().replace(/[.,;:¿?¡!()"]/g, ''));
      for (let i = 0; i + N <= w.length; i++) {
        const gram = w.slice(i, i + N).join(' ');
        // Las frases con cifras ("con L = 1 m y g = 9,8 m/s²") se repiten a propósito: es el mismo caso de referencia.
        if (/[\d=]/.test(gram)) continue;
        if (!owners.has(gram)) owners.set(gram, new Set());
        owners.get(gram)!.add(owner);
      }
    }
    const copied = [...owners.entries()].filter(([, who]) => who.size > 1).map(([gram, who]) => `${[...who].join(' y ')}: "${gram}"`);
    expect(copied).toEqual([]);
  });
});

describe('puerta anti cara de IA: brevedad', () => {
  it('ninguna oración de la ayuda, el glosario o la interfaz pasa de 45 palabras', () => {
    // La ayuda de los parámetros trae textos del profesor: se mide aparte y aquí solo se vigila lo demás.
    const mine = everyText().filter(({ where }) => /^(ayuda|extra|glosario|error|sin |aviso|modelo|explicar|anuncio|lección|predicción)/.test(where));
    for (const { where, text } of mine) {
      for (const s of sentences(text)) expect(wordsOf(s).length, `${where}: ${s}`).toBeLessThanOrEqual(45);
    }
  });

  it('cada tarjeta de ayuda de una parte de la pantalla cabe en 150 palabras', () => {
    for (const h of elementHelp) {
      expect(wordsOf(`${h.what} ${h.why} ${h.ifNot}`).length, h.title).toBeLessThanOrEqual(150);
    }
  });

  it('las tres partes de una tarjeta no repiten la misma idea con las mismas palabras', () => {
    // Si "por qué" y "qué pasaría" comparten 3 o más palabras de contenido seguidas, uno de los dos sobra.
    const STOP = new Set(['de', 'la', 'el', 'en', 'y', 'a', 'que', 'los', 'las', 'un', 'una', 'se', 'te', 'tu', 'con', 'no', 'es', 'lo', 'al', 'del', 'por', 'para', 'si', 'más', 'su']);
    const grams = (text: string) => {
      const w = wordsOf(text.toLowerCase().replace(/[.,;:¿?¡!()"]/g, '')).filter((x) => !STOP.has(x));
      const set = new Set<string>();
      for (let i = 0; i + 3 <= w.length; i++) set.add(w.slice(i, i + 3).join(' '));
      return set;
    };
    for (const h of elementHelp) {
      const why = grams(h.why);
      const shared = [...grams(h.ifNot)].filter((g) => why.has(g) && !/[\d=]/.test(g));
      expect(shared, `${h.title}: "por qué" y "qué pasaría" repiten ${shared.join(' | ')}`).toEqual([]);
    }
  });
});
