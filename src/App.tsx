import { useEffect, useMemo, useState } from 'react';
import {
  advance,
  answerCheck,
  initialFlowState,
  predict,
  type FlowState,
} from './content/experimentFlow';
import { simplePendulumContent } from './content/simplePendulumContent';
import { formatNumber } from './engine/numbers';
import { simplePendulum } from './engine/phenomena/simplePendulum';
import type { Params } from './engine/types';
import { defaultParams, validateParams } from './engine/validate';
import { ExperimentPanel } from './ui/ExperimentPanel';
import { ParamControl } from './ui/ParamControl';
import { ResultsPanel } from './ui/ResultsPanel';
import { SimulationView } from './ui/SimulationView';

const phenomenon = simplePendulum;
const content = simplePendulumContent;
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
  const [mode, setMode] = useState<'explorar' | 'experimentos'>('explorar');
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [flowState, setFlowState] = useState<FlowState | null>(null);

  const validation = useMemo(() => validateParams(phenomenon.paramSchema, raw), [raw]);

  useEffect(() => {
    setParams((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(validation.params)) {
        if (value !== undefined) next[key] = value;
      }
      return phenomenon.paramSchema.every((spec) => next[spec.key] === prev[spec.key]) ? prev : next;
    });
  }, [validation]);

  const warnings = phenomenon.modelLimits
    .map((limit) => ({ id: limit.id, result: limit.evaluate(params) }))
    .filter((warning) => !warning.result.valid);
  const results = phenomenon.outputs(phenomenon.initialState(params), params);
  const activeExperiment = experimentId ? content.experiments.find((e) => e.id === experimentId) ?? null : null;
  const currentStep =
    flowState?.phase === 'steps' && activeExperiment ? activeExperiment.steps[flowState.stepIndex] : undefined;

  const handleSelectExperiment = (id: string) => {
    const experiment = content.experiments.find((e) => e.id === id);
    if (!experiment) return;
    setExperimentId(id);
    setFlowState(initialFlowState(experiment));
  };

  const handleExitExperiment = () => {
    setExperimentId(null);
    setFlowState(null);
  };

  const handlePredict = (optionId: string) => {
    setFlowState((state) => (state ? predict(state, optionId) : state));
  };

  const handleAnswerCheck = (optionId: string) => {
    setFlowState((state) => (state ? answerCheck(state, optionId) : state));
  };

  const handleAdvanceFlow = () => {
    if (!activeExperiment) return;
    setFlowState((state) => (state ? advance(state, activeExperiment) : state));
  };

  const handlePrepare = (values: Partial<Params>) => {
    setRaw((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(values)) {
        if (value === undefined) continue;
        next[key] = formatNumber(value);
      }
      return next;
    });
    setRunning(false);
    setResetToken((t) => t + 1);
  };

  return (
    <div className="app">
      <header>
        <h1>Simulador de Fenómenos Físicos</h1>
        <p>{phenomenon.name}</p>
        <div className="mode-switch">
          <button type="button" aria-pressed={mode === 'explorar'} onClick={() => setMode('explorar')}>
            Explorar
          </button>
          <button type="button" aria-pressed={mode === 'experimentos'} onClick={() => setMode('experimentos')}>
            Experimentos
          </button>
        </div>
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
          {mode === 'experimentos' && (
            <ExperimentPanel
              content={content}
              activeExperiment={activeExperiment}
              flowState={flowState}
              onSelectExperiment={handleSelectExperiment}
              onPredict={handlePredict}
              onAnswerCheck={handleAnswerCheck}
              onAdvance={handleAdvanceFlow}
              onPrepare={handlePrepare}
              onExit={handleExitExperiment}
            />
          )}
          <h2>Parámetros</h2>
          {phenomenon.paramSchema.map((spec) => (
            <ParamControl
              key={spec.key}
              spec={spec}
              raw={raw[spec.key]}
              error={validation.errors[spec.key]}
              help={content.paramHelp.find((h) => h.paramKey === spec.key)?.explanation}
              presets={content.presets[spec.key]}
              highlighted={currentStep?.highlightParamKey === spec.key}
              onChange={(value) => setRaw((prev) => ({ ...prev, [spec.key]: value }))}
            />
          ))}
          {warnings.map((warning) => (
            <p key={warning.id} className="banner" role="status">
              <strong>Aviso:</strong> {warning.result.message}
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
          <ResultsPanel results={results} resultHelp={content.resultHelp} highlightedKey={currentStep?.highlightResultKey} />
          <p className="formula">{content.formula.describe(params, results)}</p>
        </aside>
      </main>
    </div>
  );
}
