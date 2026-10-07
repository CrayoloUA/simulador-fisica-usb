import { rk4Step } from './integrators';
import type { Params, Phenomenon, Sample, State } from './types';

export interface SimulationOptions {
  dt?: number;
  maxFrameTime?: number;
  sampleEvery?: number;
  maxSamples?: number;
}

/** Mayor velocidad que acepta el motor (la interfaz ofrece hasta 2×). */
const MAX_TIME_SCALE = 4;

function allFinite(record: Record<string, number>): boolean {
  for (const key in record) if (!Number.isFinite(record[key])) return false;
  return true;
}

export class Simulation {
  readonly phenomenon: Phenomenon;
  readonly params: Params;
  readonly dt: number;
  t = 0;
  state: State;
  samples: Sample[] = [];
  error: string | null = null;
  timeScale = 1;

  private accumulator = 0;
  private stepCount = 0;
  private readonly maxFrameTime: number;
  private readonly sampleEvery: number;
  private readonly maxSamples: number;
  private readonly deriv: (s: State) => State;

  constructor(phenomenon: Phenomenon, params: Params, options: SimulationOptions = {}) {
    this.phenomenon = phenomenon;
    this.params = params;
    this.dt = options.dt ?? 0.005;
    this.maxFrameTime = options.maxFrameTime ?? 0.1;
    this.sampleEvery = options.sampleEvery ?? 2;
    this.maxSamples = options.maxSamples ?? 1000;
    this.deriv = (s) => phenomenon.derivatives(s, params);
    this.state = phenomenon.initialState(params);
    this.recordSample();
  }

  reset(): void {
    this.t = 0;
    this.state = this.phenomenon.initialState(this.params);
    this.samples = [];
    this.accumulator = 0;
    this.stepCount = 0;
    this.error = null;
    this.recordSample();
  }

  advance(elapsedSeconds: number): void {
    if (this.error) return;
    // Ni el reloj ni la escala se pueden fiar: la escala viene de un control del HTML (que se puede
    // manipular) y un NaN en el acumulador lo congelaría para siempre. El tope de escala acota
    // además los pasos por cuadro (un cuelgue por bucle larguísimo).
    const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    const scale = Number.isFinite(this.timeScale) ? Math.min(Math.max(0, this.timeScale), MAX_TIME_SCALE) : 1;
    this.accumulator += Math.min(elapsed, this.maxFrameTime) * scale;
    while (this.accumulator >= this.dt) {
      this.step();
      if (this.error) return;
      this.accumulator -= this.dt;
    }
  }

  private step(): void {
    const next = rk4Step(this.deriv, this.state, this.dt);
    if (!allFinite(next)) {
      this.error = 'La simulación se detuvo: el cálculo produjo un valor no válido.';
      return;
    }
    this.state = next;
    this.t += this.dt;
    this.stepCount += 1;
    if (this.stepCount % this.sampleEvery === 0) this.recordSample();
  }

  private recordSample(): void {
    const values = this.phenomenon.outputs(this.state, this.params);
    const theory = this.phenomenon.theory(this.params, this.t);
    if (!allFinite(values) || !allFinite(theory)) {
      this.error = 'La simulación se detuvo: el cálculo produjo un valor no válido.';
      return;
    }
    this.samples.push({ t: this.t, values, theory });
    if (this.samples.length > this.maxSamples) this.samples.shift();
  }
}
