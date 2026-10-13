import { describe, expect, it } from 'vitest';
import { glossary, termsIn } from '../content/glossary';
import { simplePendulumContent } from '../content/simplePendulumContent';
import { pendulumModels } from '../engine/phenomena/pendulum';
import { intersects, type Rect } from '../render/geometry';
import { buildHelpEntries, type HelpEntry } from './helpEntries';
import {
  CARD_GLOSSARY_MAX,
  EXPLAIN_BUTTON_LABEL,
  EXPLAIN_HINT,
  explainAnnouncement,
  markLabel,
  cardGlossaryText,
  cardOrigin,
  cardTerms,
  nextOpenId,
  placeCard,
  sheetEdge,
  tabLeavesCard,
} from './explain';

const VIEW = { w: 1366, h: 768 };
const CARD = { w: 352, h: 300 };
const mark = (x: number, y: number): Rect => ({ x, y, w: 44, h: 44 });

describe('textos fijos', () => {
  it('el botón y el aviso son los acordados', () => {
    expect(EXPLAIN_BUTTON_LABEL).toBe('¿Qué es esto?');
    expect(EXPLAIN_HINT).toBe('Toca una marca para entender esa parte.');
    expect(EXPLAIN_HINT).not.toMatch(/—|–/);
  });

  it('el nombre de una marca es "Explicar: <título>"', () => {
    expect(markLabel('Largo del hilo (L)')).toBe('Explicar: Largo del hilo (L)');
  });

  it('el anuncio dice qué se encendió o se apagó', () => {
    expect(explainAnnouncement(true)).toContain('activadas');
    expect(explainAnnouncement(false)).toContain('desactivadas');
  });

  it('al encender, el anuncio lleva también la instrucción (el aviso visible ya no es región viva)', () => {
    expect(explainAnnouncement(true)).toBe('Marcas de ayuda activadas. Toca una marca para entender esa parte.');
  });
});

describe('sheetEdge', () => {
  it('en escritorio no hay hoja', () => {
    expect(sheetEdge(false, false)).toBeNull();
    expect(sheetEdge(false, true)).toBeNull();
  });

  it('en el celular la hoja va abajo, salvo si la marca vive en el cajón: ahí va arriba', () => {
    expect(sheetEdge(true, false)).toBe('bottom');
    expect(sheetEdge(true, true)).toBe('top');
  });
});

describe('tabLeavesCard', () => {
  it('Tab sale por el último control; Shift+Tab, por el título o el primer control', () => {
    expect(tabLeavesCard({ shift: false, onTitle: false, onFirst: false, onLast: true })).toBe(true);
    expect(tabLeavesCard({ shift: false, onTitle: true, onFirst: false, onLast: false })).toBe(false);
    expect(tabLeavesCard({ shift: true, onTitle: true, onFirst: false, onLast: false })).toBe(true);
    expect(tabLeavesCard({ shift: true, onTitle: false, onFirst: true, onLast: false })).toBe(true);
    expect(tabLeavesCard({ shift: true, onTitle: false, onFirst: false, onLast: true })).toBe(false);
  });
});

describe('nextOpenId', () => {
  it('tocar otra marca reemplaza la tarjeta; tocar la misma la cierra; sin tarjeta abre', () => {
    expect(nextOpenId(null, 'a')).toBe('a');
    expect(nextOpenId('a', 'b')).toBe('b');
    expect(nextOpenId('a', 'a')).toBeNull();
  });
});

describe('placeCard', () => {
  it('prefiere debajo de la marca, centrada en ella', () => {
    const anchor = mark(600, 100);
    const p = placeCard(anchor, CARD, VIEW, 8, 8);
    expect(p.side).toBe('below');
    expect(p.top).toBe(100 + 44 + 8);
    expect(p.left).toBe(600 + 22 - CARD.w / 2);
  });

  it('si no cabe debajo, va encima', () => {
    const p = placeCard(mark(600, 700), CARD, VIEW, 8, 8);
    expect(p.side).toBe('above');
    expect(p.top).toBe(700 - 8 - CARD.h);
  });

  it('cerca del borde derecho se corre de lado y sigue entera dentro de la ventana', () => {
    const p = placeCard(mark(1300, 100), CARD, VIEW, 8, 8);
    expect(p.left + CARD.w).toBeLessThanOrEqual(VIEW.w - 8);
    expect(p.left).toBeGreaterThanOrEqual(8);
  });

  it('nunca tapa la marca ni se sale, en una cuadrícula de posiciones', () => {
    for (let x = 0; x <= VIEW.w - 44; x += 111) {
      for (let y = 0; y <= VIEW.h - 44; y += 97) {
        const anchor = mark(x, y);
        const p = placeCard(anchor, CARD, VIEW, 8, 8);
        const rect = { x: p.left, y: p.top, w: CARD.w, h: CARD.h };
        expect(rect.x).toBeGreaterThanOrEqual(8 - 1e-9);
        expect(rect.y).toBeGreaterThanOrEqual(8 - 1e-9);
        expect(rect.x + rect.w).toBeLessThanOrEqual(VIEW.w - 8 + 1e-9);
        expect(rect.y + rect.h).toBeLessThanOrEqual(VIEW.h - 8 + 1e-9);
        expect(intersects(rect, anchor), `tapa la marca en (${x}, ${y}) por ${p.side}`).toBe(false);
      }
    }
  });

  it('en una ventana demasiado pequeña se acomoda dentro, sin salirse por arriba ni por la izquierda', () => {
    const p = placeCard(mark(10, 10), { w: 352, h: 300 }, { w: 320, h: 260 }, 8, 8);
    expect(p.side).toBe('clamped');
    expect(p.left).toBeGreaterThanOrEqual(8);
    expect(p.top).toBeGreaterThanOrEqual(8);
  });
});

describe('cardOrigin (de dónde nace la tarjeta)', () => {
  it('debajo de la marca: el punto es el borde de arriba de la tarjeta, bajo el centro de la marca', () => {
    const anchor = mark(600, 100);
    const p = placeCard(anchor, CARD, VIEW, 8, 8);
    const o = cardOrigin(anchor, { left: p.left, top: p.top }, CARD);
    expect(o.x).toBe(CARD.w / 2);
    expect(o.y).toBe(0);
  });

  it('encima de la marca: el punto es el borde de abajo de la tarjeta', () => {
    const anchor = mark(600, 700);
    const p = placeCard(anchor, CARD, VIEW, 8, 8);
    expect(p.side).toBe('above');
    const o = cardOrigin(anchor, { left: p.left, top: p.top }, CARD);
    expect(o.y).toBe(CARD.h);
  });

  it('nunca cae fuera de la caja de la tarjeta (se recorta a sus bordes)', () => {
    for (let x = 0; x <= VIEW.w - 44; x += 111) {
      for (let y = 0; y <= VIEW.h - 44; y += 97) {
        const anchor = mark(x, y);
        const p = placeCard(anchor, CARD, VIEW, 8, 8);
        const o = cardOrigin(anchor, { left: p.left, top: p.top }, CARD);
        expect(o.x).toBeGreaterThanOrEqual(0);
        expect(o.x).toBeLessThanOrEqual(CARD.w);
        expect(o.y).toBeGreaterThanOrEqual(0);
        expect(o.y).toBeLessThanOrEqual(CARD.h);
      }
    }
  });

  it('si la marca está dentro de la caja (tarjeta apretada), el punto es el centro de la marca', () => {
    const o = cardOrigin({ x: 100, y: 100, w: 44, h: 44 }, { left: 50, top: 50 }, { w: 300, h: 300 });
    expect(o).toEqual({ x: 72, y: 72 });
  });
});

const entry = (title: string, ...texts: string[]): HelpEntry => ({
  id: 'x',
  title,
  sections: texts.map((text, i) => ({ heading: `Bloque ${i + 1}`, text })),
});

describe('cardGlossaryText (qué texto se analiza)', () => {
  it('junta el texto de los bloques y no incluye el título ni los encabezados', () => {
    const text = cardGlossaryText(entry('Frecuencia (f)', 'uno', 'dos', 'tres'));
    expect(text).toContain('uno');
    expect(text).toContain('dos');
    expect(text).toContain('tres');
    expect(text).not.toContain('Frecuencia');
    expect(text).not.toContain('Bloque');
  });
});

describe('cardTerms (palabras que explica cada tarjeta)', () => {
  it('encuentra las palabras del texto de los bloques', () => {
    const terms = cardTerms(entry('Curva', 'Se calcula con RK4.', 'Nada.', 'Nada.'));
    expect(terms.map((t) => t.id)).toEqual(['paso-a-paso']);
  });

  it('omite la palabra del título de la tarjeta', () => {
    const terms = cardTerms(entry('Período (T)', 'Es el tiempo de una ida y vuelta.', 'El período importa.', 'Sin período no hay reloj.'));
    expect(terms.map((t) => t.id)).toEqual(['ida-y-vuelta']);
  });

  it('no analiza el título como si fuera texto: una palabra solo en el título no aparece', () => {
    expect(cardTerms(entry('Rozamiento del aire (b)', 'Frena.', 'Frena.', 'Frena.'))).toEqual([]);
  });

  it('devuelve como máximo 3, en el orden de aparición', () => {
    const terms = cardTerms(entry('Algo', 'La amplitud, el rozamiento, la gravedad y la masa.', '', ''));
    expect(CARD_GLOSSARY_MAX).toBe(3);
    expect(terms.map((t) => t.id)).toEqual(['amplitud', 'rozamiento', 'gravedad']);
  });

  it('una tarjeta sin palabras raras devuelve una lista vacía', () => {
    expect(cardTerms(entry('Reiniciar', 'Vuelve al inicio.', 'Para repetir.', 'Habría que recargar.'))).toEqual([]);
  });

  it('para CADA entrada real (partes, parámetros y resultados): de 0 a 3 palabras, sin repetir y sin la del título', () => {
    const entries = buildHelpEntries(simplePendulumContent, pendulumModels['no-lineal'].paramSchema);
    expect(entries.length).toBeGreaterThan(20);
    const termIds = new Set(glossary.map((g) => g.id));
    for (const e of entries) {
      const terms = cardTerms(e);
      const ids = terms.map((t) => t.id);
      expect(terms.length, e.title).toBeLessThanOrEqual(3);
      expect(new Set(ids).size, `${e.title} repite palabras`).toBe(ids.length);
      for (const id of ids) expect(termIds.has(id), id).toBe(true);
      // Ninguna de las palabras explicadas aparece en el título de su propia tarjeta.
      const inTitle = termsIn(e.title, { max: 100 }).map((t) => t.id);
      for (const id of ids) expect(inTitle, `${e.title} explica ${id}`).not.toContain(id);
    }
  });
});
