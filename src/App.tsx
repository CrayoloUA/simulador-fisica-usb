import { ArrowCounterClockwise, Pause, Play, SlidersHorizontal, Warning, XCircle } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { advance, answerCheck, initialFlowState, predict, type FlowState } from './content/experimentFlow';
import { simplePendulumContent } from './content/simplePendulumContent';
import { describeModelChange, switchModel } from './engine/modelSwitch';
import { formatNumber } from './engine/numbers';
import { pendulumModels, type PendulumModel } from './engine/phenomena/pendulum';
import type { Params } from './engine/types';
import { defaultParams } from './engine/validate';
import { ExperimentPanel } from './ui/ExperimentPanel';
import { buildHelpEntries } from './ui/helpEntries';
import { LAB_TITLE, MAIN_PARAM_KEYS, MODEL_LABELS, MODES, type Mode } from './ui/kidLabels';
import { stepNeedsDrawer } from './ui/lessonLayout';
import { describeModelNotice } from './ui/modelNotice';
import { MoreOptions } from './ui/MoreOptions';
import { ParamControl } from './ui/ParamControl';
import { ResultsPanel } from './ui/ResultsPanel';
import { Segmented } from './ui/Segmented';
import { SimulationView } from './ui/SimulationView';
import { TheoryPanel } from './ui/TheoryPanel';

const DEFAULT_MODEL: PendulumModel = 'no-lineal';
const content = simplePendulumContent;
/** Por debajo de este ancho el cajón es una hoja inferior y la página se desplaza (ver styles.css). */
const NARROW_QUERY = '(max-width: 900px)';

/** Los valores como texto con coma decimal, que es lo que espera `switchModel` del motor. */
function paramsToRaw(params: Params): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, formatNumber(value)]));
}

export default function App() {
  const [model, setModel] = useState<PendulumModel>(DEFAULT_MODEL);
  // Instancia estable de módulo (no se crea en el render): cambiarla es lo que reinicia la simulación.
  const phenomenon = pendulumModels[model];
  const [showLinear, setShowLinear] = useState(false);
  // Anuncio completo del cambio de modelo (solo lectores de pantalla) y, aparte, el máximo de φ₀
  // al que se ajustó el ángulo: ese dato sí se ve, en el aviso.
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [adjustedTo, setAdjustedTo] = useState<number | null>(null);
  const [params, setParams] = useState<Params>(() => defaultParams(pendulumModels[DEFAULT_MODEL].paramSchema));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetToken, setResetToken] = useState(0);
  const [simError, setSimError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('explorar');
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [flowState, setFlowState] = useState<FlowState | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
  const drawerTitle = useRef<HTMLHeadingElement>(null);
  const noticeText = useRef<HTMLParagraphElement>(null);
  // El foco pasa al cajón solo si lo abrió el estudiante; si se abrió solo (un paso del
  // experimento), el foco se queda donde estaba.
  const focusDrawerOnOpen = useRef(false);
  const theoryOpener = useRef<HTMLElement | null>(null);

  const mainSpecs = phenomenon.paramSchema.filter((spec) => MAIN_PARAM_KEYS.includes(spec.key));
  const drawerSpecs = phenomenon.paramSchema.filter((spec) => !MAIN_PARAM_KEYS.includes(spec.key));
  const maxPhi0 = phenomenon.paramSchema.find((spec) => spec.key === 'phi0')?.max ?? 0;
  const helpEntries = useMemo(() => buildHelpEntries(content, phenomenon.paramSchema), [phenomenon]);
  const withinSmallAngle = phenomenon.modelLimits.every((limit) => limit.evaluate(params).valid);
  const results = phenomenon.outputs(phenomenon.initialState(params), params);
  const modelNotice = describeModelNotice({
    model,
    periodError: results.periodError,
    withinSmallAngle,
    adjustedTo,
    showLinear,
  });
  const activeExperiment = experimentId ? (content.experiments.find((e) => e.id === experimentId) ?? null) : null;
  const currentStep =
    mode === 'experimentos' && flowState?.phase === 'steps' && activeExperiment
      ? activeExperiment.steps[flowState.stepIndex]
      : undefined;

  // Si el paso resalta algo que vive en "Más opciones", el cajón se abre solo para que se vea.
  useEffect(() => {
    if (stepNeedsDrawer(currentStep)) setDrawerOpen(true);
  }, [currentStep]);

  const openDrawer = () => {
    focusDrawerOnOpen.current = true;
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    moreButton.current?.focus();
  };

  useEffect(() => {
    if (!drawerOpen || !focusDrawerOnOpen.current) return;
    focusDrawerOnOpen.current = false;
    drawerTitle.current?.focus({ preventScroll: true });
    // En el celular el cajón es una hoja inferior: se lleva el péndulo arriba para que siga visible.
    if (window.matchMedia(NARROW_QUERY).matches) {
      requestAnimationFrame(() => {
        const stage = document.querySelector('.stage');
        if (stage) window.scrollTo(0, Math.max(0, stage.getBoundingClientRect().top + window.scrollY - 8));
      });
    }
  }, [drawerOpen]);

  const openTheory = () => {
    theoryOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setTheoryOpen(true);
  };

  // Al cerrar la teoría el foco vuelve al botón que la abrió (cuando el fondo ya no es inert).
  const wasTheoryOpen = useRef(false);
  useEffect(() => {
    if (wasTheoryOpen.current && !theoryOpen) theoryOpener.current?.focus();
    wasTheoryOpen.current = theoryOpen;
  }, [theoryOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (theoryOpen) {
        setTheoryOpen(false);
        event.preventDefault();
      } else if (drawerOpen) {
        closeDrawer();
        event.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [theoryOpen, drawerOpen]);

  /** Cambia de modelo: ajusta φ₀, detiene y reinicia la simulación y lo anuncia siempre. */
  const changeModel = (next: PendulumModel, closeExperiment: boolean) => {
    const nextSchema = pendulumModels[next].paramSchema;
    const adjusted = switchModel({ raw: paramsToRaw(params), params, nextSchema });
    setParams(adjusted.params);
    setAnnouncement(
      describeModelChange({
        adjustedNotice: adjusted.notice,
        modelName: MODEL_LABELS[next],
        experimentClosed: closeExperiment && experimentId !== null,
      }),
    );
    setAdjustedTo(adjusted.notice === null ? null : (nextSchema.find((spec) => spec.key === 'phi0')?.max ?? null));
    setModel(next);
    setRunning(false);
    setResetToken((t) => t + 1);
    if (closeExperiment) handleExitExperiment();
  };

  const handleModelChange = (next: PendulumModel) => {
    if (next !== model) changeModel(next, true);
  };

  const handleSelectExperiment = (id: string) => {
    const experiment = content.experiments.find((e) => e.id === id);
    if (!experiment) return;
    // Los experimentos están escritos para un modelo (valores y cifras): se pasa a él.
    if (model !== content.experimentModel) changeModel(content.experimentModel, false);
    // Las lecciones hablan de la curva punteada: se deja a la vista desde el principio.
    setShowLinear(true);
    setExperimentId(id);
    setFlowState(initialFlowState(experiment));
  };

  function handleExitExperiment() {
    setExperimentId(null);
    setFlowState(null);
  }

  const handleAdvanceFlow = () => {
    if (!activeExperiment) return;
    setFlowState((state) => (state ? advance(state, activeExperiment) : state));
  };

  const handleParamChange = (key: string, value: number) => {
    setAnnouncement(null);
    setAdjustedTo(null);
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrepare = (values: Partial<Params>) => {
    setParams((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(values)) if (value !== undefined) next[key] = value;
      return next;
    });
    setRunning(false);
    setResetToken((t) => t + 1);
  };

  // Si la simulación se detiene por un error, Play queda deshabilitado hasta Reiniciar.
  const handleSimError = useCallback((message: string | null) => {
    setSimError(message);
    if (message) setRunning(false);
  }, []);

  const handlePlay = () => {
    if (simError) return;
    setRunning((r) => !r);
  };

  const handleReset = () => {
    setRunning(false);
    setResetToken((t) => t + 1);
  };

  // El botón del aviso desaparece al activar la comparación: el foco pasa al texto del aviso.
  const handleShowComparison = () => {
    setShowLinear(true);
    setAnnouncement('Comparación activada: la curva punteada muestra el ángulo pequeño.');
    requestAnimationFrame(() => noticeText.current?.focus());
  };

  return (
    <>
      {/* Con la hoja de Teoría abierta, el fondo queda inert: ni foco ni lector de pantalla. */}
      <main className="app" data-modo={mode} data-drawer={drawerOpen ? 'open' : 'closed'} inert={theoryOpen}>
        <header className="top">
          <h1>{LAB_TITLE}</h1>
          <Segmented
            name="modo"
            className="modes"
            ariaLabel="Modo de uso"
            value={mode}
            onChange={setMode}
            options={MODES.map((option) => ({ value: option.id, label: option.label }))}
          />
        </header>

        <SimulationView
          phenomenon={phenomenon}
          params={params}
          running={running}
          speed={speed}
          resetToken={resetToken}
          showLinear={showLinear}
          onError={handleSimError}
        />

        <aside className="aside" aria-label="Controles y resultados">
          <div className="actions">
            {/* aria-disabled y no disabled: el botón conserva el foco y el lector lo anuncia. */}
            <button type="button" className="btn play" aria-disabled={simError !== null} onClick={handlePlay}>
              {running ? <Pause className="ic" weight="fill" aria-hidden="true" /> : <Play className="ic" weight="fill" aria-hidden="true" />}
              {running ? 'Pausa' : 'Play'}
            </button>
            <button type="button" className="btn sec" onClick={handleReset}>
              <ArrowCounterClockwise className="ic" weight="bold" aria-hidden="true" />
              Reiniciar
            </button>
          </div>
          <div className="aside-scroll">
            {simError && (
              <div className="alert" role="alert">
                <XCircle className="ic" weight="bold" aria-hidden="true" />
                <p>{simError} Presiona Reiniciar para volver a empezar.</p>
              </div>
            )}
            {mode === 'experimentos' && (
              <div className="lesson">
                <ExperimentPanel
                  content={content}
                  activeExperiment={activeExperiment}
                  flowState={flowState}
                  onSelectExperiment={handleSelectExperiment}
                  onPredict={(optionId) => setFlowState((state) => (state ? predict(state, optionId) : state))}
                  onAnswerCheck={(optionId) => setFlowState((state) => (state ? answerCheck(state, optionId) : state))}
                  onAdvance={handleAdvanceFlow}
                  onPrepare={handlePrepare}
                  onExit={handleExitExperiment}
                />
              </div>
            )}
            <div className="params">
              {mainSpecs.map((spec) => (
                <ParamControl
                  key={spec.key}
                  spec={spec}
                  value={params[spec.key]}
                  presets={content.presets[spec.key]}
                  highlighted={currentStep?.highlightParamKey === spec.key}
                  onChange={(value) => handleParamChange(spec.key, value)}
                />
              ))}
            </div>
            <ResultsPanel results={results} highlightedKey={currentStep?.highlightResultKey} />
            {/* La región de estado existe siempre; los avisos entran y salen de su interior, lo que
                permite que el lector de pantalla los anuncie. */}
            <div className="status" role="status">
              {modelNotice && (
                <div className="notice" data-kind={modelNotice.kind}>
                  <Warning className="ic" weight="bold" aria-hidden="true" />
                  <div className="nbody">
                    <p ref={noticeText} tabIndex={-1} className="focus-target">
                      {modelNotice.text}
                    </p>
                    {modelNotice.offerComparison && (
                      <button type="button" className="btn sec" onClick={handleShowComparison}>
                        Ver la comparación
                      </button>
                    )}
                  </div>
                </div>
              )}
              {announcement && <span className="sr-only">{announcement}</span>}
            </div>
            <div className="more">
              <button
                ref={moreButton}
                type="button"
                className="btn sec"
                aria-expanded={drawerOpen}
                aria-controls="drawer"
                onClick={() => (drawerOpen ? closeDrawer() : openDrawer())}
              >
                <SlidersHorizontal className="ic" weight="bold" aria-hidden="true" />
                Más opciones
              </button>
            </div>
          </div>
        </aside>

        <MoreOptions
          open={drawerOpen}
          titleRef={drawerTitle}
          onClose={closeDrawer}
          model={model}
          onModelChange={handleModelChange}
          maxPhi0={maxPhi0}
          showLinear={showLinear}
          onToggleLinear={() => setShowLinear((v) => !v)}
          specs={drawerSpecs}
          params={params}
          presets={content.presets}
          highlightedParamKey={currentStep?.highlightParamKey}
          onParamChange={handleParamChange}
          speed={speed}
          onSpeedChange={setSpeed}
          results={results}
          highlightedResultKey={currentStep?.highlightResultKey}
          onOpenTheory={openTheory}
        />
      </main>

      <TheoryPanel
        open={theoryOpen}
        onClose={() => setTheoryOpen(false)}
        theory={content.theoryByModel[model]}
        results={results}
        formulaText={content.formula.describe(params, results)}
        entries={helpEntries}
      />
    </>
  );
}
