import { useContext } from 'react';
import { resultsSummary } from './announcements';
import { ExplainContext } from './ExplainContext';
import { ExplainMark } from './ExplainMark';
import { resultHelpId } from './helpEntries';
import { CURIOUS_RESULT_KEYS, RESULT_LABELS, formatResult } from './kidLabels';
import { useDebouncedValue } from './useDebouncedValue';

/** Espera, tras el último cambio, antes de que el lector de pantalla lea el resumen de resultados. */
const SUMMARY_DEBOUNCE_MS = 600;

interface Props {
  results: Record<string, number>;
  /** Resultado que un paso del experimento pide mirar. */
  highlightedKey?: string;
}

interface CuriousProps extends Props {
  /** Qué datos mostrar; por omisión, todos. La tarjeta de lección muestra solo el que el paso pide. */
  keys?: string[];
}

/**
 * Resultados a la vista: el período T grande, con su subtítulo, y la frecuencia f al lado. El
 * resto (T₀, diferencia, ω₀) vive en "Datos para curiosos" dentro de "Más opciones".
 *
 * Las cifras sueltas no son una región viva (el lector las leería en cada paso del deslizador). En
 * su lugar hay un resumen oculto y atómico ("Período X s. Frecuencia Y Hz.") que se actualiza solo
 * cuando las cifras llevan un rato sin cambiar.
 */
export function ResultsPanel({ results, highlightedKey }: Props) {
  const period = RESULT_LABELS.T;
  const frequency = RESULT_LABELS.f;
  const summary = useDebouncedValue(resultsSummary(results), SUMMARY_DEBOUNCE_MS);
  return (
    <section className="results" aria-label="Resultados">
      <div className={highlightedKey === 'T' ? 'rmain hl' : 'rmain'}>
        <p className="rlabel">
          {period.label} <span className="sym">({period.symbol})</span>
        </p>
        <p className="rsub">{period.note}</p>
        <p className="rbig">
          {formatResult('T', results.T)} <span className="unit">{period.unit}</span>
        </p>
        <ExplainMark id={resultHelpId('T')} className="mark-result" />
      </div>
      <p className={highlightedKey === 'f' ? 'rf hl' : 'rf'}>
        <span>
          {frequency.label} <span className="sym">({frequency.symbol})</span>{' '}
          <b>
            {formatResult('f', results.f)} {frequency.unit}
          </b>
        </span>
        <ExplainMark id={resultHelpId('f')} className="mark-result" />
      </p>
      <p role="status" aria-atomic="true" className="sr-only">
        {summary}
      </p>
    </section>
  );
}

/** Datos para curiosos: lo que no hace falta para entender el péndulo, pero que algunos querrán ver. */
export function CuriousData({ results, highlightedKey, keys = CURIOUS_RESULT_KEYS }: CuriousProps) {
  const explain = useContext(ExplainContext);
  return (
    <dl className="curios">
      {keys.map((key) => {
        const label = RESULT_LABELS[key];
        const helpId = resultHelpId(key);
        return (
          <div key={key} className={highlightedKey === key ? 'hl' : undefined}>
            <dt>
              {label.label} <span className="sym">{key === 'periodError' ? label.symbol : `(${label.symbol})`}</span>
            </dt>
            <dd className="v">
              {formatResult(key, results[key])} <span className="unit">{label.unit}</span>
            </dd>
            <dd className="d">{label.note}</dd>
            {/* La marca va en su propio <dd>: dentro de <dl> solo caben <dt> y <dd>. Sin marcas no hay <dd>. */}
            {explain.active && explain.entries.has(helpId) && (
              <dd className="m">
                <ExplainMark id={helpId} className="mark-curio" />
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}
