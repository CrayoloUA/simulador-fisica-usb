import { DEG_TO_RAD } from '../engine/numbers';
import type { Params } from '../engine/types';
import { pendulumLayout, type PendulumLayout } from './drawPendulum';
import { squareAt, type Rect } from './geometry';
import { pickMark, ringCandidates } from './markPlacement';
import type { CanvasTheme } from './theme';

/** Márgen extra (px) que se deja alrededor de lo que se mueve al elegir dónde va una marca. */
const SWEEP_MARGIN = 2;

export interface PendulumRegions {
  /** La misma disposición con que se dibuja el péndulo con las marcas encendidas. */
  layout: PendulumLayout;
  /** Zona de cada parte del dibujo que se explica. */
  zones: { pendulo: Rect; vertical: Rect; salida: Rect };
  /** Dónde va la marca de cada parte (caja de `theme.markSize` px). */
  marks: { pendulo: Rect; vertical: Rect; salida: Rect };
}

/** Qué ocupa el dibujo mientras oscila: el hilo barre un sector y la bolita, una franja alrededor del arco. */
export function sweptByPendulum(layout: PendulumLayout, phi0Rad: number, point: { x: number; y: number }): boolean {
  const dx = point.x - layout.pivotX;
  const dy = point.y - layout.pivotY;
  const r = Math.hypot(dx, dy);
  const angle = Math.atan2(dx, dy); // 0 = justo debajo del apoyo; positivo, a la derecha
  const inAngle = Math.abs(angle) <= phi0Rad;
  if (inAngle && r <= layout.lengthPx + SWEEP_MARGIN) return true;
  // Distancia al arco que recorre el centro de la bolita.
  let distance: number;
  if (inAngle) {
    distance = Math.abs(r - layout.lengthPx);
  } else {
    const end = (sign: number) => ({
      x: layout.pivotX + layout.lengthPx * Math.sin(sign * phi0Rad),
      y: layout.pivotY + layout.lengthPx * Math.cos(phi0Rad),
    });
    distance = Math.min(
      Math.hypot(point.x - end(1).x, point.y - end(1).y),
      Math.hypot(point.x - end(-1).x, point.y - end(-1).y),
    );
  }
  return distance <= layout.bobRadius + SWEEP_MARGIN;
}

/** Puntos de una caja (rejilla de 5 × 5, bordes incluidos) para probar si pisa algo. */
function samplePoints(rect: Rect): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 4; i++) {
    for (let j = 0; j <= 4; j++) points.push({ x: rect.x + (rect.w * i) / 4, y: rect.y + (rect.h * j) / 4 });
  }
  return points;
}

/**
 * Zonas del dibujo del péndulo y dónde cuelga la marca de cada una (px CSS, dentro de la caja del
 * canvas). Comparte `pendulumLayout` con el dibujo: las marcas caen donde está lo que explican.
 * Con las marcas encendidas se reserva una franja abajo (del alto de una marca) para la de la línea
 * vertical, que así queda fuera de todo lo que se mueve. Las demás se colocan fuera del barrido del
 * hilo y de la bolita siempre que haya sitio; si no lo hay, se prefiere no pisar otra marca.
 */
export function pendulumRegions(width: number, height: number, params: Params, theme: CanvasTheme): PendulumRegions {
  const M = theme.markSize;
  const { s1, s2, s6 } = theme.space;
  const layout = pendulumLayout(width, height, params, theme, M);
  const { pivotX, pivotY, lengthPx, bobRadius } = layout;
  const phi0 = params.phi0 * DEG_TO_RAD;
  const supportY = pivotY - s2;
  const startX = pivotX + lengthPx * Math.sin(phi0);
  const startY = pivotY + lengthPx * Math.cos(phi0);

  const zones = {
    pendulo: { x: pivotX - s6, y: supportY - s1, w: 2 * s6, h: s2 + s1 + theme.pivotRadius },
    vertical: { x: pivotX - s1, y: pivotY, w: 2 * s1, h: lengthPx },
    salida: { x: startX - bobRadius, y: startY - bobRadius, w: 2 * bobRadius, h: 2 * bobRadius },
  };

  const bounds: Rect = { x: s1, y: s1, w: width - 2 * s1, h: height - 2 * s1 };
  const swept = (rect: Rect) => samplePoints(rect).filter((p) => sweptByPendulum(layout, phi0, p)).length;
  const blocked = [(rect: Rect) => swept(rect) > 0];
  const taken: Rect[] = [];
  const place = (candidates: Rect[]) => {
    const mark = pickMark(candidates, { bounds, taken, blocked, cost: swept });
    taken.push(mark);
    return mark;
  };

  // La marca del péndulo va junto al apoyo, a la altura del soporte, del lado contrario a donde se
  // suelta la bolita (que es siempre la derecha): ahí el hilo nunca pasa y la derecha queda libre
  // para la marca del círculo de salida.
  const [right, left, ...others] = ringCandidates(zones.pendulo, M, s2);
  const pendulo = place([left, right, ...others]);
  // La de la vertical, bajo la bolita en reposo; si no cupiera, junto a la línea.
  const below = squareAt(pivotX, pivotY + lengthPx + bobRadius + s1 + M / 2, M);
  const vertical = place([below, ...ringCandidates(zones.vertical, M, s2)]);
  // La del círculo de salida, hacia afuera de donde se soltó.
  const salida = place(ringCandidates(zones.salida, M, s1));

  return { layout, zones, marks: { pendulo, vertical, salida } };
}
