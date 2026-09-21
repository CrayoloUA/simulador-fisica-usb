import type { State } from './types';

type Derivatives = (state: State) => State;

function advance(state: State, slope: State, factor: number): State {
  const out: State = {};
  for (const key in state) out[key] = state[key] + factor * slope[key];
  return out;
}

export function rk4Step(f: Derivatives, state: State, dt: number): State {
  const k1 = f(state);
  const k2 = f(advance(state, k1, dt / 2));
  const k3 = f(advance(state, k2, dt / 2));
  const k4 = f(advance(state, k3, dt));
  const out: State = {};
  for (const key in state) {
    out[key] = state[key] + (dt / 6) * (k1[key] + 2 * k2[key] + 2 * k3[key] + k4[key]);
  }
  return out;
}
