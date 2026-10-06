import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { DEG_TO_RAD, formatNumber } from '../engine/numbers';
import { Simulation } from '../engine/simulation';
import type { Params, Phenomenon } from '../engine/types';
import { drawChart } from '../render/drawChart';
import { drawPendulum } from '../render/drawPendulum';
import { readCanvasTheme, type CanvasTheme } from '../render/theme';
import { CHART_LABELS } from './kidLabels';

const LIVE_INTERVAL_MS = 200;

interface Props {
  phenomenon: Phenomenon;
  params: Params;
  running: boolean;
  speed: number;
  resetToken: number;
  /** Muestra u oculta la curva punteada de comparación. No reinicia la simulación. */
  showLinear?: boolean;
  /** Avisa a `App` cuando la simulación se detiene por un error (o con `null` al reiniciarse). */
  onError: (message: string | null) => void;
}

/** Tamaño de un canvas en px CSS y densidad de la pantalla con que se ajustó. */
interface Fitted {
  width: number;
  height: number;
  dpr: number;
}

/**
 * Ajusta el canvas a su contenedor (en px CSS) y a la densidad de la pantalla: el búfer de dibujo
 * mide `ancho × dpr`, y el dibujo se hace en px CSS aplicando esa escala. Cambiar el tamaño de un
 * canvas lo borra, así que quien llama debe repintar enseguida.
 */
function fit(canvas: HTMLCanvasElement, width: number, height: number): Fitted {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  return { width, height, dpr };
}

/**
 * Columna izquierda: el péndulo grande y, debajo, la gráfica θ(t). Cada caja manda sobre su
 * canvas: al cambiar su tamaño se reajusta y se repinta. La descripción "En vivo" va oculta a la
 * vista (solo para lectores de pantalla) y la actualiza la simulación unas 5 veces por segundo.
 */
export function SimulationView({ phenomenon, params, running, speed, resetToken, showLinear = false, onError }: Props) {
  const pendBox = useRef<HTMLElement>(null);
  const chartBox = useRef<HTMLElement>(null);
  const pendCanvas = useRef<HTMLCanvasElement>(null);
  const chartCanvas = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const liveId = useId();
  const pendSize = useRef<Fitted | null>(null);
  const chartSize = useRef<Fitted | null>(null);
  const themeRef = useRef<CanvasTheme | null>(null);
  const simRef = useRef<Simulation | null>(null);
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  // Como running y speed: va en una ref para que alternarla no recree la Simulation.
  const showLinearRef = useRef(showLinear);
  const onErrorRef = useRef(onError);
  // La caja "Presiona Play" se ve mientras la simulación no ha empezado ni ha fallado.
  const [started, setStarted] = useState(false);

  const paintedT = useRef(-1);
  const liveStale = useRef(false);
  const liveAt = useRef(0);

  // Los colores, la fuente y las medidas salen de los tokens CSS. Se leen al montar y al cambiar
  // de tamaño o de fuentes, no en cada fotograma.
  const refreshTheme = useCallback(() => {
    const styles = getComputedStyle(document.documentElement);
    themeRef.current = readCanvasTheme(styles, Number.parseFloat(styles.fontSize) || 16);
  }, []);

  const paintCanvases = useCallback((sim: Simulation) => {
    const theme = themeRef.current;
    if (!theme) return;
    const pend = pendSize.current;
    const chart = chartSize.current;
    const pendCtx = pendCanvas.current?.getContext('2d');
    const chartCtx = chartCanvas.current?.getContext('2d');
    if (pend && pendCtx) {
      pendCtx.setTransform(pend.dpr, 0, 0, pend.dpr, 0, 0);
      drawPendulum(pendCtx, pend.width, pend.height, sim.state, sim.params, theme);
    }
    if (chart && chartCtx) {
      chartCtx.setTransform(chart.dpr, 0, 0, chart.dpr, 0, 0);
      drawChart(chartCtx, chart.width, chart.height, sim.samples, sim.params.phi0 * DEG_TO_RAD, theme, {
        showLinear: showLinearRef.current,
        labels: CHART_LABELS,
      });
    }
    paintedT.current = sim.t;
    liveStale.current = true;
  }, []);

  const paintLive = useCallback((sim: Simulation, now: number) => {
    if (liveRef.current) {
      liveRef.current.textContent =
        `En vivo: t = ${formatNumber(sim.t, 2)} s, θ = ${formatNumber(sim.state.theta / DEG_TO_RAD, 1)}°, ` +
        `ω = ${formatNumber(sim.state.omega, 2)} rad/s`;
    }
    liveStale.current = false;
    liveAt.current = now;
  }, []);

  useEffect(() => {
    runningRef.current = running;
    speedRef.current = speed;
    onErrorRef.current = onError;
  }, [running, speed, onError]);

  // Con la simulación en pausa el bucle no repinta (sim.t no cambia): se repinta aquí, con las
  // mismas muestras. No depende de la creación de la Simulation, así que no la reinicia.
  useEffect(() => {
    showLinearRef.current = showLinear;
    if (simRef.current) paintCanvases(simRef.current);
  }, [showLinear, paintCanvases]);

  // Cada contenedor manda: al cambiar su tamaño se reajusta su canvas y se repinta enseguida.
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      refreshTheme();
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (entry.target === pendBox.current && pendCanvas.current) {
          pendSize.current = fit(pendCanvas.current, width, height);
        }
        if (entry.target === chartBox.current && chartCanvas.current) {
          chartSize.current = fit(chartCanvas.current, width, height);
        }
      }
      if (simRef.current) paintCanvases(simRef.current);
    });
    if (pendBox.current) observer.observe(pendBox.current);
    if (chartBox.current) observer.observe(chartBox.current);
    // Las fuentes pueden llegar después del primer dibujo (font-display: swap): se repinta con ellas.
    const repaint = () => {
      refreshTheme();
      if (simRef.current) paintCanvases(simRef.current);
    };
    document.fonts?.ready.then(repaint);
    document.fonts?.addEventListener('loadingdone', repaint);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', repaint);
    };
  }, [paintCanvases, refreshTheme]);

  useEffect(() => {
    const sim = new Simulation(phenomenon, params);
    sim.timeScale = speedRef.current;
    simRef.current = sim;
    onErrorRef.current(null);
    setStarted(false);
    if (!themeRef.current) refreshTheme();
    paintCanvases(sim);
    paintLive(sim, performance.now());
  }, [phenomenon, params, resetToken, paintCanvases, paintLive, refreshTheme]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const sim = simRef.current;
      if (sim) {
        if (runningRef.current) {
          sim.timeScale = speedRef.current;
          sim.advance((now - last) / 1000);
          if (sim.error) onErrorRef.current(sim.error);
          // "Presiona Play" deja de tener sentido en cuanto la simulación arrancó o se detuvo con error.
          if (sim.t > 0 || sim.error) setStarted(true);
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
    <div className="left">
      <section ref={pendBox} className="stage" aria-label="Simulación del péndulo">
        <canvas
          ref={pendCanvas}
          role="img"
          aria-label="Péndulo: una bola colgada de un hilo que oscila, con θ = 0 en la vertical"
          aria-describedby={liveId}
        />
      </section>
      <section ref={chartBox} className="chartbox" aria-label="Gráfica del ángulo en el tiempo">
        <canvas
          ref={chartCanvas}
          role="img"
          aria-label={
            showLinear
              ? 'Gráfica del ángulo del péndulo en función del tiempo: curva simulada y curva punteada del ángulo pequeño'
              : 'Gráfica del ángulo del péndulo en función del tiempo: curva simulada'
          }
        />
        {!started && !running && <p className="hint">Presiona Play para empezar</p>}
      </section>
      <p ref={liveRef} id={liveId} className="sr-only" />
    </div>
  );
}
