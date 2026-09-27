import { rk4Step } from './integrators';
import type { Params, Phenomenon, Sample, State } from './types';

export interface SimulationOptions {
  dt?: number;
  maxFrameTime?: number;
  sampleEvery?: number;
  maxSamples?: number;
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

  constructor(phenomenon: Phenomenon, params: Params, options: SimulationOptions = {}) {
    this.phenomenon = phenomenon;
    this.params = params;
    this.dt = options.dt ?? 0.005;
    this.maxFrameTime = options.maxFrameTime ?? 0.1;
    this.sampleEvery = options.sampleEvery ?? 2;
    this.maxSamples = options.maxSamples ?? 1000;
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
    this.accumulator += Math.min(elapsedSeconds, this.maxFrameTime) * this.timeScale;
    while (this.accumulator >= this.dt) {
      this.step();
      if (this.error) return;
      this.accumulator -= this.dt;
    }
  }

  private step(): void {
    const next = rk4Step((s) => this.phenomenon.derivatives(s, this.params), this.state, this.dt);
    if (!Object.values(next).every(Number.isFinite)) {
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
    if (!Object.values(values).every(Number.isFinite) || !Object.values(theory).every(Number.isFinite)) {
      this.error = 'La simulación se detuvo: el cálculo produjo un valor no válido.';
      return;
    }
    this.samples.push({ t: this.t, values, theory });
    if (this.samples.length > this.maxSamples) this.samples.shift();
  }
}
