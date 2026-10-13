import { ChartLine, Monitor } from '@phosphor-icons/react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ELEMENT_ID } from '../content/elementHelp';
import { DEG_TO_RAD } from '../engine/numbers';
import { Simulation } from '../engine/simulation';
import type { Params, Phenomenon } from '../engine/types';
import { chartLayout, type MeasureText } from '../render/chartLayout';
import { drawChart } from '../render/drawChart';
import { drawPendulum } from '../render/drawPendulum';
import { pendulumRegions } from '../render/pendulumRegions';
import { readCanvasTheme, type CanvasTheme } from '../render/theme';
import {
  CANVAS_UNAVAILABLE_TEXT,
  CANVAS_UNAVAILABLE_TITLE,
  CHART_UNAVAILABLE_TEXT,
  canDrawCanvas,
} from './canvasSupport';
import { watchDevicePixelRatio } from './dprWatch';
import { ExplainMark } from './ExplainMark';
import { CHART_LABELS } from './kidLabels';
import { describeLive, liveDue } from './liveDescription';

interface Props {
  phenomenon: Phenomenon;
  params: Params;
  running: boolean;
  speed: number;
  resetToken: number;
  /** Muestra u oculta la curva punteada de comparación. No reinicia la simulación. */
  showLinear?: boolean;
  /** Modo "¿Qué es esto?": con él encendido el dibujo deja sitio a las marcas y se dibujan junto a cada parte. */
  explaining?: boolean;
  /** Avisa a `App` cuando la simulación se detiene por un error (o con `null` al reiniciarse). */
  onError: (message: string | null) => void;
}

/** Tamaño de una caja del escenario en px CSS. */
interface Dims {
  w: number;
  h: number;
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
 * vista (solo para lectores de pantalla) y se actualiza una vez por segundo mientras corre, y de
 * inmediato al pausar o reiniciar.
 * Si el navegador no da contexto 2D, en vez de los canvas se muestra una caja explicativa; la
 * simulación y el motor siguen corriendo, así que los controles y los resultados no se afectan.
 */
export function SimulationView({
  phenomenon,
  params,
  running,
  speed,
  resetToken,
  showLinear = false,
  explaining = false,
  onError,
}: Props) {
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
  const explainingRef = useRef(explaining);
  // Tamaño de cada caja y tema: con ellos se calculan, con las mismas funciones del dibujo, las zonas
  // donde cuelgan las marcas (solo hace falta cuando el modo está encendido).
  const [pendDims, setPendDims] = useState<Dims | null>(null);
  const [chartDims, setChartDims] = useState<Dims | null>(null);
  const [theme, setTheme] = useState<CanvasTheme | null>(null);
  const measureCtx = useRef<CanvasRenderingContext2D | null>(null);
  const onErrorRef = useRef(onError);
  // La caja "Presiona Play" se ve mientras la simulación no ha empezado ni ha fallado.
  const [started, setStarted] = useState(false);
  // Se prueba una vez al montar, con un canvas suelto. Si no hay contexto 2D, no se montan los canvas.
  const [canDraw] = useState(() => canDrawCanvas(() => document.createElement('canvas')));

  const paintedT = useRef(-1);
  const liveStale = useRef(false);
  const liveAt = useRef(0);

  // Los colores, la fuente y las medidas salen de los tokens CSS. Se leen al montar y al cambiar
  // de tamaño o de fuentes, no en cada fotograma.
  const refreshTheme = useCallback(() => {
    const styles = getComputedStyle(document.documentElement);
    const next = readCanvasTheme(styles, Number.parseFloat(styles.fontSize) || 16);
    themeRef.current = next;
    setTheme(next);
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
      drawPendulum(pendCtx, pend.width, pend.height, sim.state, sim.params, theme, explainingRef.current ? theme.markSize : 0);
    }
    if (chart && chartCtx) {
      chartCtx.setTransform(chart.dpr, 0, 0, chart.dpr, 0, 0);
      drawChart(chartCtx, chart.width, chart.height, sim.samples, sim.params.phi0 * DEG_TO_RAD, theme, {
        showLinear: showLinearRef.current,
        labels: CHART_LABELS,
        markSize: explainingRef.current ? theme.markSize : 0,
      });
    }
    paintedT.current = sim.t;
    liveStale.current = true;
  }, []);

  const paintLive = useCallback((sim: Simulation, now: number) => {
    if (liveRef.current) {
      liveRef.current.textContent = describeLive(sim.t, sim.state.theta, sim.state.omega);
    }
    liveStale.current = false;
    liveAt.current = now;
  }, []);

  useEffect(() => {
    runningRef.current = running;
    speedRef.current = speed;
    onErrorRef.current = onError;
  }, [running, speed, onError]);

  // Al pausar, la descripción se actualiza de inmediato (no espera el intervalo de cuando corre).
  useEffect(() => {
    if (!running && simRef.current) paintLive(simRef.current, performance.now());
  }, [running, paintLive]);

  // Con la simulación en pausa el bucle no repinta (sim.t no cambia): se repinta aquí, con las
  // mismas muestras. No depende de la creación de la Simulation, así que no la reinicia.
  useEffect(() => {
    showLinearRef.current = showLinear;
    if (simRef.current) paintCanvases(simRef.current);
  }, [showLinear, paintCanvases]);

  // Con el modo "¿Qué es esto?" el dibujo cambia (leyenda siempre, franja libre abajo): se repinta.
  useEffect(() => {
    explainingRef.current = explaining;
    if (simRef.current) paintCanvases(simRef.current);
  }, [explaining, paintCanvases]);

  // Cada contenedor manda: al cambiar su tamaño se reajusta su canvas y se repinta enseguida.
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      refreshTheme();
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (entry.target === pendBox.current && pendCanvas.current) {
          pendSize.current = fit(pendCanvas.current, width, height);
          setPendDims((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
        }
        if (entry.target === chartBox.current && chartCanvas.current) {
          chartSize.current = fit(chartCanvas.current, width, height);
          setChartDims((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
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
    // Si cambia la densidad de pantalla (zoom, otra pantalla) sin cambiar el tamaño CSS, el
    // ResizeObserver no avisa: se reajusta cada canvas con su mismo tamaño y la densidad nueva.
    const stopWatchingDpr = watchDevicePixelRatio(window, () => {
      if (pendCanvas.current && pendSize.current) {
        pendSize.current = fit(pendCanvas.current, pendSize.current.width, pendSize.current.height);
      }
      if (chartCanvas.current && chartSize.current) {
        chartSize.current = fit(chartCanvas.current, chartSize.current.width, chartSize.current.height);
      }
      repaint();
    });
    document.fonts?.ready.then(repaint);
    document.fonts?.addEventListener('loadingdone', repaint);
    return () => {
      observer.disconnect();
      stopWatchingDpr();
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
        if (liveDue(liveStale.current, runningRef.current, now, liveAt.current)) paintLive(sim, now);
      }
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [paintCanvases, paintLive]);

  // Dónde cuelga cada marca: salen de las mismas funciones de disposición que el dibujo.
  const marks = useMemo(() => {
    if (!explaining || !canDraw || !theme) return null;
    if (!measureCtx.current) measureCtx.current = document.createElement('canvas').getContext('2d');
    const ctx = measureCtx.current;
    const measure: MeasureText = (text, weight) => {
      if (!ctx) return text.length * theme.textSize * 0.6;
      ctx.font = `${weight === 'regular' ? 400 : 600} ${theme.textSize}px ${theme.fontSans}`;
      return ctx.measureText(text).width;
    };
    return {
      pend: pendDims ? pendulumRegions(pendDims.w, pendDims.h, params, theme).marks : null,
      chart: chartDims
        ? chartLayout(chartDims.w, chartDims.h, theme, CHART_LABELS, { showLinear, markSize: theme.markSize }, measure)
        : null,
    };
  }, [explaining, canDraw, theme, pendDims, chartDims, params, showLinear]);

  return (
    <div className="left">
      <section ref={pendBox} className="stage" aria-label="Simulación del péndulo">
        {canDraw ? (
          <canvas
            ref={pendCanvas}
            role="img"
            aria-label="Péndulo: una bola colgada de un hilo que oscila, con θ = 0 en la vertical"
            aria-describedby={liveId}
          />
        ) : (
          <div role="status" className="canvas-off">
            <Monitor className="ic canvas-off-ic" weight="regular" aria-hidden="true" />
            <p className="canvas-off-title">{CANVAS_UNAVAILABLE_TITLE}</p>
            <p className="canvas-off-text">{CANVAS_UNAVAILABLE_TEXT}</p>
          </div>
        )}
        {marks?.pend && (
          <>
            <ExplainMark id={ELEMENT_ID.pendulo} className="mark-abs" at={{ left: marks.pend.pendulo.x, top: marks.pend.pendulo.y }} />
            <ExplainMark id={ELEMENT_ID.salida} className="mark-abs" at={{ left: marks.pend.salida.x, top: marks.pend.salida.y }} />
            <ExplainMark id={ELEMENT_ID.vertical} className="mark-abs" at={{ left: marks.pend.vertical.x, top: marks.pend.vertical.y }} />
          </>
        )}
      </section>
      <section ref={chartBox} className="chartbox" aria-label="Gráfica del ángulo en el tiempo">
        {canDraw ? (
          <canvas
            ref={chartCanvas}
            role="img"
            aria-label={
              showLinear
                ? 'Gráfica del ángulo del péndulo en función del tiempo: curva simulada y curva punteada del ángulo pequeño'
                : 'Gráfica del ángulo del péndulo en función del tiempo: curva simulada'
            }
          />
        ) : (
          <div className="canvas-off canvas-off-chart">
            <ChartLine className="ic" weight="regular" aria-hidden="true" />
            <p className="canvas-off-text">{CHART_UNAVAILABLE_TEXT}</p>
          </div>
        )}
        {canDraw && !started && !running && <p className="hint">
            Presiona <span lang="en">Play</span> para empezar
          </p>}
        {marks?.chart && (
          <>
            {marks.chart.titleMark && (
              <ExplainMark id={ELEMENT_ID.grafica} className="mark-abs" at={{ left: marks.chart.titleMark.x, top: marks.chart.titleMark.y }} />
            )}
            {marks.chart.legend.map(
              (item) =>
                item.mark && (
                  <ExplainMark
                    key={item.key}
                    id={item.key === 'simulated' ? ELEMENT_ID.curvaSimulacion : ELEMENT_ID.curvaLineal}
                    className="mark-abs"
                    at={{ left: item.mark.x, top: item.mark.y }}
                  />
                ),
            )}
          </>
        )}
      </section>
      <p ref={liveRef} id={liveId} className="sr-only" />
    </div>
  );
}
