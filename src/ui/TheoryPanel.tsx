import type { ModelTheory } from '../content/types';
import { formatNumber } from '../engine/numbers';

interface Props {
  theory: ModelTheory;
  results: Record<string, number>;
}

/**
 * Teoría del modelo activo, siempre a la vista: ecuaciones, de dónde sale cada curva de la gráfica,
 * por qué θ es positivo y negativo y cuándo vale el modelo. Los tres textos van en bloques que se
 * pueden plegar (útil en pantallas angostas), abiertos por defecto.
 */
export function TheoryPanel({ theory, results }: Props) {
  return (
    <section className="theory" aria-label="Teoría del modelo">
      <h2>Teoría · {theory.title}</h2>
      {theory.equations.map((equation) => (
        <p key={equation} className="equation">
          {equation}
        </p>
      ))}
      <p className="theory-numbers">
        T = {formatNumber(results.T, 3)} s · T₀ = {formatNumber(results.T0, 3)} s · un péndulo real, sin aproximar,
        tiene un período {formatNumber(results.periodError, 1)} % mayor que T₀
      </p>
      <details open>
        <summary>De dónde sale la gráfica</summary>
        <p>{theory.chartOrigin}</p>
      </details>
      <details open>
        <summary>Por qué θ es positivo y negativo</summary>
        <p>{theory.signConvention}</p>
      </details>
      <details open>
        <summary>Cuándo vale el modelo</summary>
        <p>{theory.validity}</p>
      </details>
    </section>
  );
}
