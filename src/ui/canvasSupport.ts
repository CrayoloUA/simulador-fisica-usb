/*
 * Soporte de canvas: decide si el navegador puede dibujar y guarda los textos del aviso que se
 * muestra cuando no puede. Es lógica pura (sin DOM) para poder probarla con Vitest en `node`.
 */

/** Lo mínimo que se le pide a un canvas para probarlo: `getContext`. */
export interface ContextProbe {
  getContext(contextId: '2d'): unknown;
}

/**
 * Dice si hay contexto 2D. Recibe una fábrica de canvas (en la app, `document.createElement`) y no
 * lanza nunca: si crear el canvas o pedir el contexto falla o devuelve `null`, no hay dibujo.
 */
export function canDrawCanvas(createCanvas: () => ContextProbe): boolean {
  try {
    return createCanvas().getContext('2d') != null;
  } catch {
    return false;
  }
}

export const CANVAS_UNAVAILABLE_TITLE = 'No podemos dibujar la simulación en este navegador';

export const CANVAS_UNAVAILABLE_TEXT =
  'Los controles y los resultados siguen funcionando. ' +
  'Para ver el péndulo y la gráfica, abre el simulador en una versión actual de Chrome, Edge o Firefox.';

/** Texto corto que ocupa el lugar de la gráfica; el aviso completo vive en el lugar del péndulo. */
export const CHART_UNAVAILABLE_TEXT = 'Aquí iría la gráfica del ángulo en el tiempo.';
