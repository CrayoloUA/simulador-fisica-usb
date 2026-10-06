export interface DampedLinearParams {
  g: number;
  L: number;
  /** Ángulo inicial en radianes. */
  phi0Rad: number;
  /** Fricción por unidad de masa, en 1/s (b = c/m). */
  b: number;
}

/**
 * Solución analítica de la ecuación linealizada con fricción viscosa
 * θ'' + b·θ' + (g/L)·θ = 0, con θ(0) = φ₀ y θ'(0) = 0.
 *
 * Es la curva punteada de la gráfica ("aproximación lineal"). Con b = 0 se reduce a φ₀·cos(ω₀t).
 *
 * Precondición: b < 2·ω₀ (movimiento subamortiguado). El rango de `b` del esquema (máximo 0,4 1/s)
 * la garantiza para todo el rango de L y g (peor caso: g = 1, L = 5 ⇒ 2ω₀ ≈ 0,894), por eso no hay
 * rama para el caso crítico o sobreamortiguado.
 */
export function dampedLinearTheory(p: DampedLinearParams, t: number): { theta: number; omega: number } {
  const omega0Sq = p.g / p.L;
  const beta = p.b / 2;
  const omegaD = Math.sqrt(omega0Sq - beta * beta);
  const decay = Math.exp(-beta * t);
  const cos = Math.cos(omegaD * t);
  const sin = Math.sin(omegaD * t);
  return {
    theta: p.phi0Rad * decay * (cos + (beta / omegaD) * sin),
    omega: -p.phi0Rad * (omega0Sq / omegaD) * decay * sin,
  };
}
