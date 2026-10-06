import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  advance,
  answerCheck,
  initialFlowState,
  predict,
  type FlowState,
} from './content/experimentFlow';
import { simplePendulumContent } from './content/simplePendulumContent';
import { formatNumber } from './engine/numbers';
import { switchModel } from './engine/modelSwitch';
import { pendulumModels, type PendulumModel } from './engine/phenomena/pendulum';
import type { ParamSpec, Params } from './engine/types';
import { defaultParams, validateParams } from './engine/validate';
import { ExperimentPanel } from './ui/ExperimentPanel';
import { LinearizationToggle } from './ui/LinearizationToggle';
import { ModelSelector } from './ui/ModelSelector';
import { ParamControl } from './ui/ParamControl';
import { TheoryPanel } from './ui/TheoryPanel';
import { ResultsPanel } from './ui/ResultsPanel';
import { SimulationView } from './ui/SimulationView';

const DEFAULT_MODEL: PendulumModel = 'no-lineal';
const content = simplePendulumContent;
const SPEEDS = [0.25, 0.5, 1, 2];
const MODES = [
  { id: 'explorar', label: 'Explorar' },
  { id: 'experimentos', label: 'Experimentos' },
] as const;

function initialRaw(schema: ParamSpec[]): Record<string, string> {
  return Object.fromEntries(schema.map((spec) => [spec.key, formatNumber(spec.defaultValue)]));
}

export default function App() {
  const [model, setModel] = useState<PendulumModel>(DEFAULT_MODEL);
  // Instancia estable de módulo (no se crea en el render): cambiarla es lo que reinicia la simulación.
  const phenomenon = pendulumModels[model];
  const [showLinear, setShowLinear] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [raw, setRaw] = useState<Record<string, string>>(() => initialRaw(pendulumModels[DEFAULT_MODEL].paramSchema));
  const [params, setParams] = useState<Params>(() => defaultParams(pendulumModels[DEFAULT_MODEL].paramSchema));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetToken, setResetToken] = useState(0);
  const [mode, setMode] = useState<'explorar' | 'experimentos'>('explorar');
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [flowState, setFlowState] = useState<FlowState | null>(null);
  const modeRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleModeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = MODES.findIndex((option) => option.id === mode);
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % MODES.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + MODES.length) % MODES.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = MODES.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setMode(MODES[next].id);
    modeRefs.current[next]?.focus();
  };

  // Depende también del fenómeno: cada modo tiene su propio rango de φ₀.
  const validation = useMemo(() => validateParams(phenomenon.paramSchema, raw), [raw, phenomenon]);

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
    mode === 'experimentos' && flowState?.phase === 'steps' && activeExperiment
      ? activeExperiment.steps[flowState.stepIndex]
      : undefined;

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

  const handleModelChange = (next: PendulumModel) => {
    if (next === model) return;
    const adjusted = switchModel({ raw, params, nextSchema: pendulumModels[next].paramSchema });
    setRaw(adjusted.raw);
    setParams(adjusted.params);
    setNotice(adjusted.notice);
    setModel(next);
    setRunning(false);
    setResetToken((t) => t + 1);
    handleExitExperiment();
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
        {/* Selección única excluyente y reversible: radiogroup, no dos botones con aria-pressed.
            Aquí las flechas sí eligen (patrón WAI-ARIA de grupo de radio) porque cambiar de modo
            no es destructivo. */}
        <div className="mode-switch" role="radiogroup" aria-label="Modo de uso" onKeyDown={handleModeKeyDown}>
          {MODES.map((option, index) => (
            <button
              key={option.id}
              ref={(element) => {
                modeRefs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={mode === option.id}
              tabIndex={mode === option.id ? 0 : -1}
              onClick={() => setMode(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>
      <main className="layout">
        <div className="column">
          <SimulationView
            phenomenon={phenomenon}
            params={params}
            running={running}
            speed={speed}
            resetToken={resetToken}
            showLinear={showLinear}
            chartControls={<LinearizationToggle showLinear={showLinear} onToggle={() => setShowLinear((v) => !v)} />}
          />
          <TheoryPanel theory={content.theoryByModel[model]} results={results} />
        </div>
        <aside className="panel" aria-label="Panel de control">
          <ModelSelector
            model={model}
            onChange={handleModelChange}
            rangeText={`Ángulo inicial hasta ${formatNumber(
              phenomenon.paramSchema.find((spec) => spec.key === 'phi0')?.max ?? 0,
            )}°`}
          />
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
              help={content.paramHelp.find((h) => h.paramKey === spec.key)}
              presets={content.presets[spec.key]}
              highlighted={currentStep?.highlightParamKey === spec.key}
              onChange={(value) => {
                setNotice(null);
                setRaw((prev) => ({ ...prev, [spec.key]: value }));
              }}
            />
          ))}
          {/* La región de estado existe siempre; los avisos entran y salen de su interior,
              lo que permite que el lector de pantalla los anuncie. */}
          <div role="status">
            {notice && <p className="banner banner-info">{notice}</p>}
            {warnings.map((warning) => (
              <p key={warning.id} className="banner">
                <strong>Aviso:</strong> {warning.result.message}
              </p>
            ))}
          </div>
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
