import { termsIn, type GlossaryTerm } from '../content/glossary';
import { containsRect, intersects, clampInto, type Rect } from '../render/geometry';
import type { HelpEntry } from './helpEntries';

/*
 * Lógica pura del modo "¿Qué es esto?": textos fijos, nombres de las marcas y dónde cae la tarjeta.
 * Los componentes (ExplainMark, ExplainCard) solo la usan.
 */

/** Texto del botón que enciende y apaga las marcas. */
export const EXPLAIN_BUTTON_LABEL = '¿Qué es esto?';

/** Aviso fijo mientras el modo está activo. */
export const EXPLAIN_HINT = 'Toca una marca para entender esa parte.';

/** Id de la tarjeta: las marcas abiertas apuntan a ella con aria-controls. */
export const EXPLAIN_CARD_ID = 'explain-card';

/** Nombre accesible de la marca de una parte, p. ej. "Explicar: Curva azul: Simulación". */
export function markLabel(title: string): string {
  return `Explicar: ${title}`;
}

/** Anuncio para lectores de pantalla al encender o apagar el modo. */
export function explainAnnouncement(active: boolean): string {
  return active
    ? `Marcas de ayuda activadas. ${EXPLAIN_HINT}`
    : 'Marcas de ayuda desactivadas.';
}

/**
 * Dónde se apoya la hoja de explicación del celular. Abajo, salvo si la marca vive en el cajón
 * "Más opciones" (que ocupa la mitad de abajo): ahí la hoja va arriba para no tapar la marca.
 * `null`: no es una hoja (escritorio), la tarjeta cuelga de su marca.
 */
export function sheetEdge(sheet: boolean, anchorInDrawer: boolean): 'top' | 'bottom' | null {
  if (!sheet) return null;
  return anchorInDrawer ? 'top' : 'bottom';
}

/**
 * Si un Tab (o Shift+Tab) se sale de la tarjeta: la tarjeta está al final de la página, así que
 * salir hacia delante desde su último control, o hacia atrás desde el título o el primer control,
 * la cierra y devuelve el foco a su marca (de ahí el siguiente Tab sigue donde estaba el niño).
 */
export function tabLeavesCard(opts: { shift: boolean; onTitle: boolean; onFirst: boolean; onLast: boolean }): boolean {
  return opts.shift ? opts.onTitle || opts.onFirst : opts.onLast;
}

/** Qué tarjeta queda abierta al tocar una marca: la misma la cierra, otra reemplaza a la que había. */
export function nextOpenId(current: string | null, tapped: string): string | null {
  return current === tapped ? null : tapped;
}

/** Máximo de palabras del glosario que explica una tarjeta (para que no crezca sin límite). */
export const CARD_GLOSSARY_MAX = 3;

/** El texto que se revisa para hallar palabras raras: solo los bloques, sin título ni encabezados. */
export function cardGlossaryText(entry: HelpEntry): string {
  return entry.sections.map((section) => section.text).join(' ');
}

/**
 * Palabras del glosario que la tarjeta de `entry` explica debajo de sus bloques: las que aparecen
 * en su texto, en orden de aparición, hasta `CARD_GLOSSARY_MAX`, sin la palabra de su propio título
 * (la tarjeta "Período (T)" no explica "Período"). Lista vacía: la tarjeta no muestra la sección.
 */
export function cardTerms(entry: HelpEntry): GlossaryTerm[] {
  return termsIn(cardGlossaryText(entry), { max: CARD_GLOSSARY_MAX, skip: entry.title });
}

export interface Size {
  w: number;
  h: number;
}

export interface CardPlacement {
  left: number;
  top: number;
  side: 'below' | 'above' | 'right' | 'left' | 'clamped';
}

/**
 * Dónde cuelga la tarjeta de la marca (`anchor`, en px de la ventana). Prefiere debajo, luego
 * encima, a la derecha y a la izquierda: la primera donde cabe entera dentro de la ventana (con
 * `margin` de aire) y sin tapar la marca. Alineada con la marca, y movida lo justo para no salirse.
 * Si en ningún lado cabe (ventana muy pequeña), se acomoda dentro de la ventana.
 */
export function placeCard(anchor: Rect, card: Size, view: Size, gap: number, margin: number): CardPlacement {
  const area: Rect = { x: margin, y: margin, w: Math.max(0, view.w - 2 * margin), h: Math.max(0, view.h - 2 * margin) };
  const cx = anchor.x + anchor.w / 2;
  const cy = anchor.y + anchor.h / 2;
  const tries: Array<{ side: CardPlacement['side']; rect: Rect }> = [
    { side: 'below', rect: { x: cx - card.w / 2, y: anchor.y + anchor.h + gap, w: card.w, h: card.h } },
    { side: 'above', rect: { x: cx - card.w / 2, y: anchor.y - gap - card.h, w: card.w, h: card.h } },
    { side: 'right', rect: { x: anchor.x + anchor.w + gap, y: cy - card.h / 2, w: card.w, h: card.h } },
    { side: 'left', rect: { x: anchor.x - gap - card.w, y: cy - card.h / 2, w: card.w, h: card.h } },
  ];
  for (const { side, rect } of tries) {
    // Hacia arriba y abajo se permite correrla de lado (se alinea con la marca lo mejor posible).
    const shifted = side === 'below' || side === 'above' ? { ...rect, x: clampInto(rect, area).x } : rect;
    const candidate = side === 'right' || side === 'left' ? { ...shifted, y: clampInto(shifted, area).y } : shifted;
    if (containsRect(area, candidate) && !intersects(candidate, anchor)) {
      return { left: candidate.x, top: candidate.y, side };
    }
  }
  const fallback = clampInto(tries[0].rect, area);
  return { left: fallback.x, top: fallback.y, side: 'clamped' };
}

/**
 * Punto de la tarjeta (en px, desde su esquina de arriba a la izquierda) desde el que "nace" al
 * aparecer: el centro de la marca, recortado a la caja de la tarjeta. Es el `transform-origin`
 * de la animación de entrada: la tarjeta crece desde el lado que mira a su marca.
 */
export function cardOrigin(anchor: Rect, card: { left: number; top: number }, size: Size): { x: number; y: number } {
  const x = anchor.x + anchor.w / 2 - card.left;
  const y = anchor.y + anchor.h / 2 - card.top;
  return { x: Math.min(Math.max(x, 0), size.w), y: Math.min(Math.max(y, 0), size.h) };
}
