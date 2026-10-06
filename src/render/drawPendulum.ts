import type { Params, State } from '../engine/types';

const PIVOT_Y = 30;
const MAX_LENGTH_M = 5;
const BOTTOM_MARGIN = 40;

export function drawPendulum(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: State,
  params: Params,
): void {
  ctx.clearRect(0, 0, width, height);
  const pivotX = width / 2;
  const rodPx = (params.L / MAX_LENGTH_M) * (height - PIVOT_Y - BOTTOM_MARGIN);
  const bobX = pivotX + rodPx * Math.sin(state.theta);
  const bobY = PIVOT_Y + rodPx * Math.cos(state.theta);
  const bobRadius = 8 + 6 * Math.sqrt(params.m);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pivotX, PIVOT_Y);
  ctx.lineTo(pivotX, PIVOT_Y + rodPx);
  ctx.stroke();
  ctx.setLineDash([]);

  // Eje de referencia: la vertical por el apoyo es θ = 0; a la derecha θ > 0, a la izquierda θ < 0.
  ctx.fillStyle = '#475569';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('θ = 0 (vertical)', pivotX, 14);
  ctx.textAlign = 'left';
  ctx.fillText('θ > 0 →', pivotX + 14, PIVOT_Y + 4);
  ctx.textAlign = 'right';
  ctx.fillText('← θ < 0', pivotX - 14, PIVOT_Y + 4);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pivotX, PIVOT_Y);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(pivotX, PIVOT_Y, 4, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(bobX, bobY, bobRadius, 0, 2 * Math.PI);
  ctx.fill();
}
