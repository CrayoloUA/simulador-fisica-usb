const AGM_TOLERANCE = 1e-15;
const AGM_MAX_ITERATIONS = 50;

/** Media aritmético-geométrica de a y b (a, b > 0). */
export function agm(a: number, b: number): number {
  let x = a;
  let y = b;
  for (let i = 0; i < AGM_MAX_ITERATIONS && Math.abs(x - y) >= AGM_TOLERANCE; i++) {
    const next = (x + y) / 2;
    y = Math.sqrt(x * y);
    x = next;
  }
  return (x + y) / 2;
}

/**
 * Cociente T/T₀ del período real de un péndulo simple soltado desde el reposo con amplitud θ₀,
 * respecto al período de ángulo pequeño T₀ = 2π√(L/g). Igual a 2K(sen(θ₀/2))/π = 1/AGM(1, cos(θ₀/2)).
 * Válido para 0 ≤ θ₀ < π.
 */
export function pendulumPeriodFactor(theta0Rad: number): number {
  return 1 / agm(1, Math.cos(theta0Rad / 2));
}
