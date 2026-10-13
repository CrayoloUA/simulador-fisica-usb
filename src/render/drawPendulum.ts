import { DEG_TO_RAD } from '../engine/numbers';
import type { Params, State } from '../engine/types';
import type { CanvasTheme } from './theme';

/** Límites de L en m: el largo dibujado crece de 62 % a 100 % del máximo que cabe en pantalla. */
const L_MIN = 0.1;
const L_MAX = 5;
const FRACTION_MIN = 0.62;
/** Ángulo mínimo con el que se calcula el ancho necesario: con ángulos casi nulos la escala no se dispara. */
const MIN_SWING_RAD = Math.PI / 6;

/** Fracción del largo máximo que se dibuja para un hilo de `lengthM` metros (crece como √L). */
export function lengthFraction(lengthM: number): number {
  const t = Math.min(1, Math.max(0, (lengthM - L_MIN) / (L_MAX - L_MIN)));
  return FRACTION_MIN + (1 - FRACTION_MIN) * Math.sqrt(t);
}

export interface PendulumLayout {
  /** Apoyo (px). */
  pivotX: number;
  pivotY: number;
  /** Largo del hilo dibujado (px). No es una escala fiel: un hilo de 5 m no se ve 50 veces más largo. */
  lengthPx: number;
  bobRadius: number;
}

/**
 * Escala el péndulo al área disponible: el hilo mide lo que cabe en alto y lo que deja caber la
 * oscilación completa en el ancho, y se acorta un poco con hilos cortos. Depende del ángulo inicial
 * y no del instante, para que la escala no vibre mientras oscila.
 * `reserveBottom` deja libre una franja abajo (px): con las marcas de ayuda encendidas, ahí va la
 * marca de la línea vertical, fuera de todo lo que se mueve. En la pantalla normal es 0.
 */
export function pendulumLayout(
  width: number,
  height: number,
  params: Params,
  theme: CanvasTheme,
  reserveBottom = 0,
): PendulumLayout {
  const { s2, s4, s6, s8 } = theme.space;
  const bobRadius = theme.ballRadius + theme.ballPerSqrtKg * Math.sqrt(params.m);
  const pivotY = s6 + s2;
  const byHeight = height - pivotY - bobRadius - s4 - reserveBottom;
  const swing = Math.max(params.phi0 * DEG_TO_RAD, MIN_SWING_RAD);
  const byWidth = (width / 2 - bobRadius - s4) / Math.sin(swing);
  const lengthMax = Math.max(s8, Math.min(byHeight, byWidth));
  return { pivotX: width / 2, pivotY, lengthPx: lengthMax * lengthFraction(params.L), bobRadius };
}

/**
 * Dibuja el péndulo en el rectángulo `width` × `height` (px CSS; quien llama aplica la escala del
 * dispositivo para que sea nítido). Los colores y medidas salen del tema. `reserveBottom`: ver
 * `pendulumLayout`.
 */
export function drawPendulum(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: State,
  params: Params,
  theme: CanvasTheme,
  reserveBottom = 0,
): void {
  ctx.clearRect(0, 0, width, height);
  const { pivotX, pivotY, lengthPx, bobRadius } = pendulumLayout(width, height, params, theme, reserveBottom);
  const { s2, s6 } = theme.space;
  const phi0 = params.phi0 * DEG_TO_RAD;
  const bobX = pivotX + lengthPx * Math.sin(state.theta);
  const bobY = pivotY + lengthPx * Math.cos(state.theta);
  const startX = pivotX + lengthPx * Math.sin(phi0);
  const startY = pivotY + lengthPx * Math.cos(phi0);
  const supportY = pivotY - s2;

  // Vertical de reposo (θ = 0), punteada.
  ctx.strokeStyle = theme.lineStrong;
  ctx.lineWidth = theme.stroke.thin;
  ctx.setLineDash(theme.dash);
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(pivotX, pivotY + lengthPx);
  ctx.stroke();

  // Círculo punteado donde se soltó la bolita: muestra el ángulo de salida aunque ya se haya movido.
  ctx.beginPath();
  ctx.arc(startX, startY, bobRadius, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.setLineDash([]);

  // Soporte fijo.
  ctx.strokeStyle = theme.inkSoft;
  ctx.lineWidth = theme.stroke.support;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pivotX - s6, supportY);
  ctx.lineTo(pivotX + s6, supportY);
  ctx.stroke();

  // Hilo, apoyo y bolita (la bolita crece con la masa).
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = theme.stroke.rod;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = theme.ink;
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, theme.pivotRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = theme.accent;
  ctx.strokeStyle = theme.surface;
  ctx.lineWidth = theme.stroke.bold;
  ctx.beginPath();
  ctx.arc(bobX, bobY, bobRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}
