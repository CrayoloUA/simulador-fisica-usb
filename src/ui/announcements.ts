import { formatResult, type Mode } from './kidLabels';

/*
 * Textos que se anuncian con lector de pantalla en la región de estado de App (role="status").
 * Son frases cortas y estables: el lector solo las repite si el texto cambia.
 */

/** Anuncio al cambiar de modo: dice dónde está el niño y qué hacer ahí. */
export function modeAnnouncement(mode: Mode): string {
  return mode === 'experimentos'
    ? 'Modo Experimentos: elige un experimento en la lección.'
    : 'Modo Explorar: mueve los controles y mira el péndulo.';
}

export type RunEvent = 'play' | 'pause' | 'reset';

/** Anuncio de lo que pasó con la simulación: Play, Pausa o Reiniciar. */
export function runAnnouncement(event: RunEvent): string {
  switch (event) {
    case 'play':
      return 'Simulación en marcha.';
    case 'pause':
      return 'Simulación en pausa.';
    case 'reset':
      return 'Simulación reiniciada.';
  }
}

/**
 * Resumen de los resultados principales para el lector de pantalla. Es un solo texto atómico: así
 * no se leen cifras sueltas en cada paso del deslizador (quien lo usa lo retrasa con un debounce).
 */
export function resultsSummary(results: Record<string, number>): string {
  return `Período ${formatResult('T', results.T)} s. Frecuencia ${formatResult('f', results.f)} Hz.`;
}
