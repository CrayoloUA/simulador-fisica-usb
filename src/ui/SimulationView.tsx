import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { DEG_TO_RAD, formatNumber } from '../engine/numbers';
import { Simulation } from '../engine/simulation';
import type { Params, Phenomenon } from '../engine/types';
import { drawChart } from '../render/drawChart';
import { drawPendulum } from '../render/drawPendulum';

const SIM_W = 560;
const SIM_H = 420;
const CHART_W = 560;
const CHART_H = 220;
const LIVE_INTERVAL_MS = 200;

interface Props {
  phenomenon: Phenomenon;
  params: Params;
  running: boolean;
  speed: number;
  resetToken: number;
  /** Muestra u oculta la curva punteada (aproximación lineal). No reinicia la simulación. */
  showLinear?: boolean;
  /** Controles que van junto a la gráfica (p. ej. el botón de la aproximación lineal). */
  chartControls?: ReactNode;
}

export function SimulationView({
  phenomenon,
  params,
  running,
  speed,
  resetToken,
  showLinear = true,
  chartControls,
}: Props) {
  const simCanvas = useRef<HTMLCanvasElement>(null);
  const chartCanvas = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const simRef = useRef<Simulation | null>(null);
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  // Como running y speed: va en una ref para que alternarla no recree la Simulation.
  const showLinearRef = useRef(showLinear);
  const [error, setError] = useState<string | null>(null);

  const liveId = useId();
  const paintedT = useRef(-1);
  const liveStale = useRef(false);
  const liveAt = useRef(0);

  const paintCanvases = useCallback((sim: Simulation) => {
    const simCtx = simCanvas.current?.getContext('2d');
    const chartCtx = chartCanvas.current?.getContext('2d');
    if (simCtx) drawPendulum(simCtx, SIM_W, SIM_H, sim.state, sim.params);
    if (chartCtx) {
      drawChart(chartCtx, CHART_W, CHART_H, sim.samples, sim.params.phi0 * DEG_TO_RAD, {
        showLinear: showLinearRef.current,
      });
    }
    paintedT.current = sim.t;
    liveStale.current = true;
  }, []);

  const paintLive = useCallback((sim: Simulation, now: number) => {
    if (liveRef.current) {
      liveRef.current.textContent =
        `t = ${formatNumber(sim.t, 2)} s · θ = ${formatNumber(sim.state.theta / DEG_TO_RAD, 1)}° · ` +
        `ω = ${formatNumber(sim.state.omega, 2)} rad/s`;
    }
    liveStale.current = false;
    liveAt.current = now;
  }, []);

  useEffect(() => {
    runningRef.current = running;
    speedRef.current = speed;
  }, [running, speed]);

  // Con la simulación en pausa el bucle no repinta (sim.t no cambia): se repinta aquí, con las
  // mismas muestras. No depende de la creación de la Simulation, así que no la reinicia.
  useEffect(() => {
    showLinearRef.current = showLinear;
    if (simRef.current) paintCanvases(simRef.current);
  }, [showLinear, paintCanvases]);

  useEffect(() => {
    const sim = new Simulation(phenomenon, params);
    sim.timeScale = speedRef.current;
    simRef.current = sim;
    setError(null);
    paintCanvases(sim);
    paintLive(sim, performance.now());
  }, [phenomenon, params, resetToken, paintCanvases, paintLive]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const sim = simRef.current;
      if (sim) {
        if (runningRef.current) {
          sim.timeScale = speedRef.current;
          sim.advance((now - last) / 1000);
          if (sim.error) setError(sim.error);
        }
        if (sim.t !== paintedT.current) paintCanvases(sim);
        if (liveStale.current && now - liveAt.current >= LIVE_INTERVAL_MS) paintLive(sim, now);
      }
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [paintCanvases, paintLive]);

  return (
    <section className="view" aria-label="Simulación">
      <canvas
        ref={simCanvas}
        width={SIM_W}
        height={SIM_H}
        role="img"
        aria-label="Animación del péndulo simple"
        aria-describedby={liveId}
      />
      <p ref={liveRef} id={liveId} className="live" />
      {error && (
        <p className="error" role="alert">
          {error} Presiona Reiniciar para volver a empezar.
        </p>
      )}
      {chartControls && <div className="chart-controls">{chartControls}</div>}
      <canvas
        ref={chartCanvas}
        width={CHART_W}
        height={CHART_H}
        role="img"
        aria-label="Gráfica del ángulo en función del tiempo: simulado y aproximación lineal"
      />
    </section>
  );
}
