import { useCallback, useEffect, useRef, useState } from 'react';
import { DEG_TO_RAD, formatNumber } from '../engine/numbers';
import { Simulation } from '../engine/simulation';
import type { Params, Phenomenon } from '../engine/types';
import { drawChart } from '../render/drawChart';
import { drawPendulum } from '../render/drawPendulum';

const SIM_W = 560;
const SIM_H = 420;
const CHART_W = 560;
const CHART_H = 220;

interface Props {
  phenomenon: Phenomenon;
  params: Params;
  running: boolean;
  speed: number;
  resetToken: number;
}

export function SimulationView({ phenomenon, params, running, speed, resetToken }: Props) {
  const simCanvas = useRef<HTMLCanvasElement>(null);
  const chartCanvas = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const simRef = useRef<Simulation | null>(null);
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const [error, setError] = useState<string | null>(null);

  const paint = useCallback((sim: Simulation) => {
    const simCtx = simCanvas.current?.getContext('2d');
    const chartCtx = chartCanvas.current?.getContext('2d');
    if (simCtx) drawPendulum(simCtx, SIM_W, SIM_H, sim.state, sim.params);
    if (chartCtx) drawChart(chartCtx, CHART_W, CHART_H, sim.samples, sim.params.phi0 * DEG_TO_RAD);
    if (liveRef.current) {
      liveRef.current.textContent =
        `t = ${formatNumber(sim.t, 2)} s · θ = ${formatNumber(sim.state.theta / DEG_TO_RAD, 1)}° · ` +
        `ω = ${formatNumber(sim.state.omega, 2)} rad/s`;
    }
  }, []);

  useEffect(() => {
    runningRef.current = running;
    speedRef.current = speed;
  }, [running, speed]);

  useEffect(() => {
    const sim = new Simulation(phenomenon, params);
    sim.timeScale = speedRef.current;
    simRef.current = sim;
    setError(null);
    paint(sim);
  }, [phenomenon, params, resetToken, paint]);

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
        paint(sim);
      }
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [paint]);

  return (
    <section className="view" aria-label="Simulación">
      <canvas
        ref={simCanvas}
        width={SIM_W}
        height={SIM_H}
        role="img"
        aria-label="Animación del péndulo simple"
      />
      <p ref={liveRef} className="live" />
      {error && (
        <p className="error" role="alert">
          {error} Presiona Reiniciar para volver a empezar.
        </p>
      )}
      <canvas
        ref={chartCanvas}
        width={CHART_W}
        height={CHART_H}
        role="img"
        aria-label="Gráfica del ángulo en función del tiempo: simulado y teórico"
      />
    </section>
  );
}
