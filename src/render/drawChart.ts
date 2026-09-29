import { DEG_TO_RAD } from '../engine/numbers';
import type { Sample } from '../engine/types';

const WINDOW_SECONDS = 10;
const PAD = { left: 44, right: 12, top: 18, bottom: 24 };
const COLOR_SIMULATED = '#2563eb';
const COLOR_THEORY = '#ea580c';
const MAX_POINTS = 300;

type Mapper = (value: number) => number;

function drawSeries(
  ctx: CanvasRenderingContext2D,
  samples: Sample[],
  pick: (sample: Sample) => number,
  x: Mapper,
  y: Mapper,
  color: string,
  dashed: boolean,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash(dashed ? [6, 4] : []);
  ctx.beginPath();
  // Diezma desde el final para conservar siempre la muestra más reciente.
  const stride = Math.max(1, Math.ceil(samples.length / MAX_POINTS));
  const first = (samples.length - 1) % stride;
  for (let i = first; i < samples.length; i += stride) {
    const sample = samples[i];
    const px = x(sample.t);
    const py = y(pick(sample));
    if (i === first) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: Sample[],
  amplitudeRad: number,
): void {
  ctx.clearRect(0, 0, width, height);
  if (samples.length === 0) return;

  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const tEnd = Math.max(WINDOW_SECONDS, samples[samples.length - 1].t);
  const tStart = tEnd - WINDOW_SECONDS;
  const yMax = amplitudeRad * 1.15;
  const x: Mapper = (t) => PAD.left + ((t - tStart) / WINDOW_SECONDS) * plotW;
  const y: Mapper = (v) => PAD.top + plotH / 2 - (v / yMax) * (plotH / 2);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, y(0));
  ctx.lineTo(width - PAD.right, y(0));
  ctx.moveTo(PAD.left, PAD.top);
  ctx.lineTo(PAD.left, height - PAD.bottom);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '11px system-ui, sans-serif';
  const yLabel = (yMax / DEG_TO_RAD).toFixed(0);
  ctx.textAlign = 'right';
  ctx.fillText(`${yLabel}°`, PAD.left - 6, PAD.top + 4);
  ctx.fillText(`-${yLabel}°`, PAD.left - 6, height - PAD.bottom);
  ctx.textAlign = 'center';
  ctx.fillText(`θ(t)   t: ${tStart.toFixed(0)} a ${tEnd.toFixed(0)} s`, PAD.left + plotW / 2, height - 6);

  drawSeries(ctx, samples, (s) => s.theory.theta, x, y, COLOR_THEORY, true);
  drawSeries(ctx, samples, (s) => s.values.theta, x, y, COLOR_SIMULATED, false);

  ctx.textAlign = 'left';
  ctx.fillStyle = COLOR_SIMULATED;
  ctx.fillText('Simulada', PAD.left + 8, 12);
  ctx.fillStyle = COLOR_THEORY;
  ctx.fillText('Teórica', PAD.left + 78, 12);
}
