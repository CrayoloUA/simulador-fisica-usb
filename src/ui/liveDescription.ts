import { DEG_TO_RAD, formatNumber } from '../engine/numbers';

/** Cada cuánto se actualiza la descripción "En vivo" mientras corre la simulación. */
export const LIVE_INTERVAL_MS = 1000;

/**
 * Si toca actualizar la descripción: hay algo nuevo que decir (`stale`) y, o ya pasó el intervalo,
 * o la simulación no corre (en pausa o reiniciada se actualiza de inmediato).
 */
export function liveDue(stale: boolean, running: boolean, now: number, lastAt: number): boolean {
  if (!stale) return false;
  return !running || now - lastAt >= LIVE_INTERVAL_MS;
}

/** Texto de la descripción "En vivo": tiempo, ángulo y rapidez angular de la simulación. */
export function describeLive(t: number, theta: number, omega: number): string {
  return `En vivo: t = ${formatNumber(t, 2)} s, θ = ${formatNumber(theta / DEG_TO_RAD, 1)}°, ω = ${formatNumber(omega, 2)} rad/s`;
}
