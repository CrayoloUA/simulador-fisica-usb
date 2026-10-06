import { CURIOUS_RESULT_KEYS, RESULT_LABELS, formatResult } from './kidLabels';

interface Props {
  results: Record<string, number>;
  /** Resultado que un paso del experimento pide mirar. */
  highlightedKey?: string;
}

/**
 * Resultados a la vista: el período T grande, con su subtítulo, y la frecuencia f al lado. El
 * resto (T₀, diferencia, ω₀) vive en "Datos para curiosos" dentro de "Más opciones".
 */
export function ResultsPanel({ results, highlightedKey }: Props) {
  const period = RESULT_LABELS.T;
  const frequency = RESULT_LABELS.f;
  return (
    <section className="results" aria-label="Resultados" aria-live="polite">
      <div className={highlightedKey === 'T' ? 'rmain hl' : 'rmain'}>
        <p className="rlabel">
          {period.label} <span className="sym">({period.symbol})</span>
        </p>
        <p className="rsub">{period.note}</p>
        <p className="rbig">
          {formatResult('T', results.T)} <span className="unit">{period.unit}</span>
        </p>
      </div>
      <p className={highlightedKey === 'f' ? 'rf hl' : 'rf'}>
        {frequency.label} <span className="sym">({frequency.symbol})</span>{' '}
        <b>
          {formatResult('f', results.f)} {frequency.unit}
        </b>
      </p>
    </section>
  );
}

/** Datos para curiosos: lo que no hace falta para entender el péndulo, pero que algunos querrán ver. */
export function CuriousData({ results, highlightedKey }: Props) {
  return (
    <dl className="curios">
      {CURIOUS_RESULT_KEYS.map((key) => {
        const label = RESULT_LABELS[key];
        return (
          <div key={key} className={highlightedKey === key ? 'hl' : undefined}>
            <dt>
              {label.label} <span className="sym">{key === 'periodError' ? label.symbol : `(${label.symbol})`}</span>
            </dt>
            <dd className="v">
              {formatResult(key, results[key])} <span className="unit">{label.unit}</span>
            </dd>
            <dd className="d">{label.note}</dd>
          </div>
        );
      })}
    </dl>
  );
}
