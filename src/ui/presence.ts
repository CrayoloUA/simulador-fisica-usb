/*
 * Presencia de un elemento con salida animada (la hoja de Teoría): lógica pura. Sin esto, cerrar la
 * hoja la quita del DOM de golpe y la salida no se vería. Con tres fases, "cerrándose" deja el
 * elemento puesto el tiempo que dura su transición y luego se quita.
 */

export type Presence = 'closed' | 'open' | 'closing';

/** La fase que corresponde a lo que pide el padre. Reabrir a mitad de la salida retoma la hoja, no la recrea. */
export function nextPresence(current: Presence, open: boolean): Presence {
  if (open) return 'open';
  return current === 'open' || current === 'closing' ? 'closing' : 'closed';
}

/** Fin de la salida: solo cierra lo que seguía cerrándose (si se reabrió, sigue abierto). */
export function finishClosing(current: Presence): Presence {
  return current === 'closing' ? 'closed' : current;
}

/** `0.12s` o `120ms` a milisegundos. Lo que no entiende (o es negativo) vale 0: no se espera nada. */
export function parseCssTimeMs(value: string): number {
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(value.trim());
  if (!match) return 0;
  return Number(match[1]) * (match[2] === 's' ? 1000 : 1);
}

/**
 * Cuánto tarda en terminar la última transición de un elemento, leído de su `transition-duration` y
 * `transition-delay` calculados (listas separadas por comas; la más corta se repite, como en CSS).
 * Así el tiempo de espera sale del CSS y no hay que repetir la cifra en el código.
 */
export function longestTransitionMs(durations: string, delays: string): number {
  const split = (text: string) => text.split(',').map((part) => parseCssTimeMs(part));
  const d = split(durations);
  const l = split(delays);
  const count = Math.max(d.length, l.length);
  let longest = 0;
  for (let i = 0; i < count; i++) longest = Math.max(longest, d[i % d.length] + l[i % l.length]);
  return longest;
}
