import { DEG_TO_RAD } from '../engine/numbers';
import type { Sample } from '../engine/types';
import type { CanvasTheme } from './theme';

const WINDOW_SECONDS = 10;
const TICK_SECONDS = 2;
const MAX_POINTS = 300;
/** El eje θ llega a este múltiplo del ángulo inicial, redondeado hacia arriba a pasos de 5°. */
const Y_HEADROOM = 1.12;
const Y_STEP_DEG = 5;
/** Por debajo de este ancho la leyenda baja a una segunda fila. */
const NARROW_PX = 560;

/** Textos del dibujo: los pone la interfaz (lenguaje para niños), el dibujo solo los coloca. */
export interface ChartLabels {
  title: string;
  simulated: string;
  linear: string;
}

type Mapper = (value: number) => number;

function drawSeries(
  ctx: CanvasRenderingContext2D,
  samples: Sample[],
  pick: (sample: Sample) => number,
  x: Mapper,
  y: Mapper,
  color: string,
  strokeW: number,
  dash: number[],
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeW;
  ctx.lineJoin = 'round';
  ctx.setLineDash(dash);
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

/** Instantes de las marcas del eje t: múltiplos de 2 s dentro de la ventana visible. */
export function timeTicks(tStart: number, tEnd: number): number[] {
  const ticks: number[] = [];
  for (let t = Math.ceil(tStart / TICK_SECONDS) * TICK_SECONDS; t <= tEnd + 1e-9; t += TICK_SECONDS) ticks.push(t);
  return ticks;
}

/** Límite del eje θ en grados: el ángulo inicial más 12 %, hacia arriba a pasos de 5°, mínimo 5°. */
export function chartYMaxDeg(amplitudeRad: number): number {
  // El redondeo evita que 10 · 1,12 / 5 con error de coma flotante cambie de escalón.
  const steps = Math.round(((amplitudeRad / DEG_TO_RAD) * Y_HEADROOM * 1e6) / Y_STEP_DEG) / 1e6;
  return Math.max(Y_STEP_DEG, Math.ceil(steps) * Y_STEP_DEG);
}

/**
 * Dibuja θ(t) en el rectángulo `width` × `height` (px CSS; quien llama aplica la escala del
 * dispositivo). La simulada (sólida, azul) va primero y la curva de comparación (punteada, naranja)
 * encima, para que ambas se vean cuando coinciden. Un punto marca el instante actual.
 */
export function drawChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  samples: Sample[],
  amplitudeRad: number,
  theme: CanvasTheme,
  options: { showLinear?: boolean; labels: ChartLabels },
): void {
  const { showLinear = false, labels } = options;
  ctx.clearRect(0, 0, width, height);
  if (samples.length === 0) return;

  const { s1, s2, s4, s5, s6, s7 } = theme.space;
  const f = theme.textSize;
  const regular = `400 ${f}px ${theme.fontSans}`;
  const semibold = `600 ${f}px ${theme.fontSans}`;
  const narrow = width < NARROW_PX;
  // En un ancho estrecho la leyenda ocupa una fila propia bajo el título.
  const pad = { left: s7 + s2, right: s4, top: s6 + s2 + (showLinear && narrow ? s5 : 0), bottom: s6 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const yMaxDeg = chartYMaxDeg(amplitudeRad);
  const yMax = yMaxDeg * DEG_TO_RAD;
  const tEnd = Math.max(WINDOW_SECONDS, samples[samples.length - 1].t);
  const tStart = tEnd - WINDOW_SECONDS;
  const x: Mapper = (t) => pad.left + ((t - tStart) / WINDOW_SECONDS) * plotW;
  const y: Mapper = (v) => pad.top + plotH / 2 - (v / yMax) * (plotH / 2);

  // Marcas de tiempo: cuadrícula suave y número bajo cada una (la unidad va en el título).
  ctx.font = regular;
  ctx.textAlign = 'center';
  ctx.lineWidth = theme.stroke.hair;
  for (const tick of timeTicks(tStart, tEnd)) {
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    ctx.moveTo(x(tick), pad.top);
    ctx.lineTo(x(tick), height - pad.bottom);
    ctx.stroke();
    ctx.fillStyle = theme.inkSoft;
    ctx.fillText(String(Math.round(tick)), x(tick), height - s2);
  }

  // Ejes: θ = 0 horizontal y escala de θ vertical.
  ctx.strokeStyle = theme.lineStrong;
  ctx.lineWidth = theme.stroke.hair;
  ctx.beginPath();
  ctx.moveTo(pad.left, y(0));
  ctx.lineTo(width - pad.right, y(0));
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, height - pad.bottom);
  ctx.stroke();

  // Título y escala de θ. Positivo = a la derecha de la vertical de reposo; negativo = a la izquierda.
  ctx.fillStyle = theme.ink;
  ctx.font = semibold;
  ctx.textAlign = 'left';
  ctx.fillText(labels.title, s4, s5 - s1);
  ctx.fillStyle = theme.inkSoft;
  ctx.font = regular;
  ctx.textAlign = 'right';
  ctx.fillText(`+${yMaxDeg}°`, pad.left - s2, pad.top + s1);
  ctx.fillText('0°', pad.left - s2, y(0) + s1);
  ctx.fillText(`−${yMaxDeg}°`, pad.left - s2, height - pad.bottom);

  // Las curvas y el punto se recortan a la zona de la gráfica.
  const last = samples[samples.length - 1];
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.left, pad.top, plotW, plotH);
  ctx.clip();
  drawSeries(ctx, samples, (s) => s.values.theta, x, y, theme.curveSim, theme.stroke.curve, []);
  if (showLinear) {
    drawSeries(ctx, samples, (s) => s.theory.theta, x, y, theme.curveLinear, theme.stroke.curveLinear, theme.dashLong);
  }
  ctx.fillStyle = theme.curveSim;
  ctx.strokeStyle = theme.surface;
  ctx.lineWidth = theme.stroke.bold;
  ctx.beginPath();
  ctx.arc(x(last.t), y(last.values.theta), theme.dotRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Leyenda (solo al comparar): muestra del trazo, sólido o punteado, y nombre.
  if (showLinear) {
    const swatch = s6 + s1;
    const entry = (originX: number, rowY: number, label: string, color: string, strokeW: number, dash: number[]) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeW;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(originX, rowY - s1);
      ctx.lineTo(originX + swatch, rowY - s1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = theme.inkSoft;
      ctx.textAlign = 'left';
      ctx.fillText(label, originX + swatch + s2, rowY);
    };
    ctx.font = regular;
    const simWidth = swatch + s2 + ctx.measureText(labels.simulated).width;
    const linWidth = swatch + s2 + ctx.measureText(labels.linear).width;
    const rowY = narrow ? s6 + s2 + s1 : s5 - s1;
    const originX = narrow ? s4 : width - pad.right - simWidth - s5 - linWidth;
    entry(originX, rowY, labels.simulated, theme.curveSim, theme.stroke.curve, []);
    entry(originX + simWidth + s5, rowY, labels.linear, theme.curveLinear, theme.stroke.curveLinear, theme.dashLong);
  }
}
