import { useEffect, useMemo, useState } from 'react';
import { formatNumber } from './engine/numbers';
import { simplePendulum } from './engine/phenomena/simplePendulum';
import type { Params } from './engine/types';
import { defaultParams, validateParams } from './engine/validate';
import { ParamControl } from './ui/ParamControl';
import { SimulationView } from './ui/SimulationView';

const phenomenon = simplePendulum;
const SPEEDS = [0.25, 0.5, 1, 2];

function initialRaw(): Record<string, string> {
  return Object.fromEntries(phenomenon.paramSchema.map((spec) => [spec.key, formatNumber(spec.defaultValue)]));
}

export default function App() {
  const [raw, setRaw] = useState<Record<string, string>>(initialRaw);
  const [params, setParams] = useState<Params>(() => defaultParams(phenomenon.paramSchema));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetToken, setResetToken] = useState(0);

  const validation = useMemo(() => validateParams(phenomenon.paramSchema, raw), [raw]);

  useEffect(() => {
    setParams((prev) => {
      const next = { ...prev, ...validation.params };
      return phenomenon.paramSchema.every((spec) => next[spec.key] === prev[spec.key]) ? prev : next;
    });
  }, [validation]);

  const warnings = phenomenon.modelLimits.map((limit) => limit.evaluate(params)).filter((r) => !r.valid);
  const results = phenomenon.outputs(phenomenon.initialState(params), params);

  return (
    <div className="app">
      <header>
        <h1>Simulador de Fenómenos Físicos</h1>
        <p>{phenomenon.name}</p>
      </header>
      <main className="layout">
        <SimulationView
          phenomenon={phenomenon}
          params={params}
          running={running}
          speed={speed}
          resetToken={resetToken}
        />
        <aside className="panel">
          <h2>Parámetros</h2>
          {phenomenon.paramSchema.map((spec) => (
            <ParamControl
              key={spec.key}
              spec={spec}
              raw={raw[spec.key]}
              error={validation.errors[spec.key]}
              onChange={(value) => setRaw((prev) => ({ ...prev, [spec.key]: value }))}
            />
          ))}
          {warnings.map((warning) => (
            <p key={warning.message} className="banner" role="status">
              <strong>Aviso:</strong> {warning.message}
            </p>
          ))}
          <div className="transport">
            <button type="button" onClick={() => setRunning((r) => !r)}>
              {running ? 'Pausa' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRunning(false);
                setResetToken((t) => t + 1);
              }}
            >
              Reiniciar
            </button>
            <label>
              Velocidad{' '}
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {formatNumber(s)}×
                  </option>
                ))}
              </select>
            </label>
          </div>
          <section aria-live="polite">
            <h2>Resultados teóricos</h2>
            <dl className="results">
              <dt>Período T</dt>
              <dd>{formatNumber(results.T, 3)} s</dd>
              <dt>Frecuencia f</dt>
              <dd>{formatNumber(results.f, 3)} Hz</dd>
              <dt>Frecuencia angular ω₀</dt>
              <dd>{formatNumber(results.omega0, 3)} rad/s</dd>
            </dl>
          </section>
        </aside>
      </main>
    </div>
  );
}
