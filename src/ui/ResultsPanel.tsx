import { useState } from 'react';
import { formatNumber } from '../engine/numbers';
import type { ResultHelp } from '../content/types';

interface Props {
  results: Record<string, number>;
  resultHelp: ResultHelp[];
  highlightedKey?: string;
}

export function ResultsPanel({ results, resultHelp, highlightedKey }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section>
      <h2>Lo que obtienes</h2>
      <dl className="results">
        {resultHelp.map((help) => {
          const helpId = `result-help-${help.resultKey}`;
          return (
            <div
              key={help.resultKey}
              className={help.resultKey === highlightedKey ? 'result-row result-highlighted' : 'result-row'}
            >
              <dt>
                {help.label}
                <button
                  type="button"
                  className="help-toggle"
                  aria-expanded={openKey === help.resultKey}
                  aria-controls={helpId}
                  aria-label={`Qué es ${help.label}`}
                  onClick={() => setOpenKey((k) => (k === help.resultKey ? null : help.resultKey))}
                >
                  ?
                </button>
              </dt>
              <dd aria-live="polite">
                {formatNumber(results[help.resultKey], help.decimals)} {help.unit}
              </dd>
              {openKey === help.resultKey && (
                <dd id={helpId} className="help-card">
                  {help.explanation}
                </dd>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
