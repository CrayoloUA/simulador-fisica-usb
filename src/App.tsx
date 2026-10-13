import { ArrowCounterClockwise, Pause, Play, Question, SlidersHorizontal, Warning, XCircle } from '@phosphor-icons/react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { advance, answerCheck, initialFlowState, predict, type FlowState } from './content/experimentFlow';
import { ELEMENT_ID } from './content/elementHelp';
import { simplePendulumContent } from './content/simplePendulumContent';
import { describeModelChange, switchModel } from './engine/modelSwitch';
import { formatNumber } from './engine/numbers';
import { pendulumModels, type PendulumModel } from './engine/phenomena/pendulum';
import type { Params } from './engine/types';
import { clampToSpec, defaultParams } from './engine/validate';
import { modeAnnouncement, runAnnouncement } from './ui/announcements';
import { escapeClosesDrawer } from './ui/escapeScope';
import { ExplainCard, type CloseReason } from './ui/ExplainCard';
import { ExplainContext, type ExplainContextValue } from './ui/ExplainContext';
import { ExplainMark } from './ui/ExplainMark';
import { EXPLAIN_BUTTON_LABEL, EXPLAIN_HINT, explainAnnouncement, nextOpenId } from './ui/explain';
import { EXPERIMENT_START_SPEED, paramsForExperimentStart } from './ui/experimentEntry';
import { buildHelpEntries } from './ui/helpEntries';
import { LAB_TITLE, MAIN_PARAM_KEYS, MODEL_LABELS, MODES, type Mode } from './ui/kidLabels';
import { LessonCard } from './ui/LessonCard';
import { lessonInlineItems, presetsVisible } from './ui/lessonLayout';
import { describeModelNotice } from './ui/modelNotice';
import { MoreOptions } from './ui/MoreOptions';
import { ParamControl } from './ui/ParamControl';
import { asideReadingOrder, type AsidePart } from './ui/readingOrder';
import { ResultsPanel } from './ui/ResultsPanel';
import { Segmented } from './ui/Segmented';
import { SimulationView } from './ui/SimulationView';
import { StepInlineItems } from './ui/StepInlineItems';
import { TheoryPanel } from './ui/TheoryPanel';
import { useMediaQuery } from './ui/useMediaQuery';

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
  // El `id` cambia en cada anuncio: así el lector repite uno aunque el texto sea igual al anterior
  // (p. ej. Reiniciar dos veces seguidas).
  const [announcement, setAnnouncement] = useState<{ text: string; id: number } | null>(null);
  const announceSeq = useRef(0);
  const announce = (text: string | null) => setAnnouncement(text === null ? null : { text, id: ++announceSeq.current });
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
  // Modo "¿Qué es esto?": encendido, hay marcas junto a cada parte explicable y, de la que se toca,
  // una sola tarjeta abierta. Se guarda también la marca tocada: de ella cuelga la tarjeta y a ella
  // vuelve el foco.
  const [explaining, setExplaining] = useState(false);
  const [explainOpen, setExplainOpen] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const explainOpenRef = useRef(explainOpen);
  const moreButton = useRef<HTMLButtonElement>(null);
  const drawerTitle = useRef<HTMLHeadingElement>(null);
  const noticeText = useRef<HTMLParagraphElement>(null);
  // El foco pasa al cajón solo si lo abrió el estudiante con el botón.
  const focusDrawerOnOpen = useRef(false);
  const theoryOpener = useRef<HTMLElement | null>(null);
  const isNarrow = useMediaQuery(NARROW_QUERY);

  const mainSpecs = phenomenon.paramSchema.filter((spec) => MAIN_PARAM_KEYS.includes(spec.key));
  const drawerSpecs = phenomenon.paramSchema.filter((spec) => !MAIN_PARAM_KEYS.includes(spec.key));
  const maxPhi0 = phenomenon.paramSchema.find((spec) => spec.key === 'phi0')?.max ?? 0;
  const helpEntries = useMemo(() => buildHelpEntries(content, phenomenon.paramSchema), [phenomenon]);
  const helpById = useMemo(() => new Map(helpEntries.map((entry) => [entry.id, entry])), [helpEntries]);
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

  const inExperiments = mode === 'experimentos';
  // En Experimentos no hay cajón: lo que el paso pide mirar y vive en él va dentro de la lección.
  const inlineItems = lessonInlineItems(currentStep);

  /** Al pasar a Experimentos el cajón se cierra: ahí no existe, y no debe quedar abierto al volver. */
  const handleModeChange = (next: Mode) => {
    if (next === 'experimentos') setDrawerOpen(false);
    setMode(next);
    announce(modeAnnouncement(next));
  };

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

  // Se guarda el botón que abrió la hoja (no `document.activeElement`: en Safari y Firefox de macOS,
  // tras un clic con ratón el foco queda en <body>).
  const openTheory = (opener: HTMLElement) => {
    theoryOpener.current = opener;
    setTheoryOpen(true);
  };

  // Al cerrar la teoría el foco vuelve al botón que la abrió (cuando el fondo ya no es inert).
  const wasTheoryOpen = useRef(false);
  useEffect(() => {
    if (wasTheoryOpen.current && !theoryOpen) theoryOpener.current?.focus();
    wasTheoryOpen.current = theoryOpen;
  }, [theoryOpen]);

  useEffect(() => {
    explainOpenRef.current = explainOpen;
  }, [explainOpen]);

  /** Cierra la tarjeta de explicación. Con Escape o el botón el foco vuelve a la marca; con un toque fuera, solo si no quedó en ningún otro control. */
  const closeExplainCard = useCallback((reason: CloseReason) => {
    const current = explainOpenRef.current;
    if (!current) return;
    setExplainOpen(null);
    if (reason === 'escape' || reason === 'button') {
      current.anchor.focus({ preventScroll: true });
    } else if (reason === 'outside') {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if ((!active || active === document.body) && current.anchor.isConnected) current.anchor.focus({ preventScroll: true });
      });
    }
  }, []);

  const toggleExplain = useCallback((id: string, mark: HTMLElement) => {
    setExplainOpen((current) => (nextOpenId(current?.id ?? null, id) === null ? null : { id, anchor: mark }));
  }, []);

  const handleExplainToggle = () => {
    const next = !explaining;
    setExplaining(next);
    if (!next) setExplainOpen(null);
    announce(explainAnnouncement(next));
  };

  // Con la hoja de Teoría abierta el fondo queda inert: la tarjeta de explicación se cierra.
  useEffect(() => {
    if (theoryOpen) setExplainOpen(null);
  }, [theoryOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (theoryOpen) {
        setTheoryOpen(false);
        event.preventDefault();
      } else if (explainOpenRef.current) {
        closeExplainCard('escape');
        event.preventDefault();
      } else if (drawerOpen && escapeClosesDrawer(document.activeElement, document.getElementById('drawer'), moreButton.current)) {
        closeDrawer();
        event.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [theoryOpen, drawerOpen, closeExplainCard]);

  /** Cambia de modelo: ajusta φ₀, detiene y reinicia la simulación y lo anuncia siempre. */
  const changeModel = (next: PendulumModel, closeExperiment: boolean) => {
    const nextSchema = pendulumModels[next].paramSchema;
    const adjusted = switchModel({ raw: paramsToRaw(params), params, nextSchema });
    setParams(adjusted.params);
    announce(
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
    // Empieza limpio: sin simulación en marcha y sin rozamiento, masa ni velocidad heredados de
    // Explorar, que en Experimentos el niño no ve ni puede cambiar.
    setRunning(false);
    setResetToken((t) => t + 1);
    setSpeed(EXPERIMENT_START_SPEED);
    setParams((prev) => paramsForExperimentStart(prev, phenomenon.paramSchema));
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
    announce(null);
    setAdjustedTo(null);
    // El estado no se fía del control: sus min/max se pueden alterar desde el navegador.
    const spec = phenomenon.paramSchema.find((s) => s.key === key);
    const safe = spec ? clampToSpec(spec, value) : value;
    setParams((prev) => ({ ...prev, [key]: safe }));
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
    announce(runAnnouncement(running ? 'pause' : 'play'));
    setRunning(!running);
  };

  const handleReset = () => {
    setRunning(false);
    setResetToken((t) => t + 1);
    announce(runAnnouncement('reset'));
  };

  // El botón del aviso desaparece al activar la comparación: el foco pasa al texto del aviso.
  const handleShowComparison = () => {
    setShowLinear(true);
    announce('Comparación activada: la curva punteada muestra el ángulo pequeño.');
    requestAnimationFrame(() => noticeText.current?.focus());
  };

  // Play y Reiniciar. En escritorio van arriba de la columna y primero en el DOM; en el celular son
  // una barra fija abajo y van al final del DOM: así el orden de Tab es el orden visual en los dos.
  const actionsBar = (
    <div className="actions">
      <ExplainMark id={ELEMENT_ID.play} />
      {/* aria-disabled y no disabled: el botón conserva el foco y el lector lo anuncia. */}
      <button type="button" className="btn play" aria-disabled={simError !== null} onClick={handlePlay}>
        {running ? <Pause className="ic" weight="fill" aria-hidden="true" /> : <Play className="ic" weight="fill" aria-hidden="true" />}
        {running ? 'Pausa' : <span lang="en">Play</span>}
      </button>
      <ExplainMark id={ELEMENT_ID.reiniciar} />
      <button type="button" className="btn sec" onClick={handleReset}>
        <ArrowCounterClockwise className="ic" weight="bold" aria-hidden="true" />
        Reiniciar
      </button>
    </div>
  );

  // La lección del modo Experimentos. En escritorio vive en la columna de controles; en el celular se
  // ve arriba del péndulo, así que va antes de él en el DOM (el orden de Tab es el orden visual).
  const lessonCard = inExperiments ? (
    <LessonCard
      experiments={content.experiments}
      experiment={activeExperiment}
      flow={flowState}
      inlineItems={
        <StepInlineItems
          items={inlineItems}
          specs={phenomenon.paramSchema}
          params={params}
          presets={content.presets}
          results={results}
          onParamChange={handleParamChange}
        />
      }
      onSelectExperiment={handleSelectExperiment}
      onPredict={(optionId) => setFlowState((state) => (state ? predict(state, optionId) : state))}
      onAnswerCheck={(optionId) => setFlowState((state) => (state ? answerCheck(state, optionId) : state))}
      onAdvance={handleAdvanceFlow}
      onPrepare={handlePrepare}
      onExit={handleExitExperiment}
    />
  ) : null;

  // Las partes de la columna de controles. Se colocan en el DOM en el orden en que se ven (ver
  // `asideReadingOrder`), así Tab y el lector de pantalla las recorren como el estudiante las ve.
  const asideParts: Record<AsidePart, ReactNode> = {
    alert: simError && (
      <div className="alert" role="alert">
        <XCircle className="ic" weight="bold" aria-hidden="true" />
        <p>{simError} Presiona Reiniciar para volver a empezar.</p>
      </div>
    ),
    params: (
      <div className="params">
        {mainSpecs.map((spec) => (
          <ParamControl
            key={spec.key}
            spec={spec}
            value={params[spec.key]}
            presets={presetsVisible(inExperiments, currentStep) ? content.presets[spec.key] : undefined}
            highlighted={currentStep?.highlightParamKey === spec.key}
            showNote={!inExperiments}
            onChange={(value) => handleParamChange(spec.key, value)}
          />
        ))}
      </div>
    ),
    results: <ResultsPanel results={results} highlightedKey={currentStep?.highlightResultKey} />,
    // El aviso visible no es región viva: lleva el porcentaje exacto, que cambia con el
    // deslizador y se leería en cada paso.
    status: (
      <div className="status">
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
      </div>
    ),
    more: !inExperiments && (
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
        <ExplainMark id={ELEMENT_ID.masOpciones} />
      </div>
    ),
  };

  const explainValue = useMemo<ExplainContextValue>(
    () => ({ active: explaining, openId: explainOpen?.id ?? null, entries: helpById, toggle: toggleExplain }),
    [explaining, explainOpen, helpById, toggleExplain],
  );
  const openEntry = explaining && explainOpen ? helpById.get(explainOpen.id) : undefined;

  return (
    <ExplainContext.Provider value={explainValue}>
      {/* Con la hoja de Teoría abierta, el fondo queda inert: ni foco ni lector de pantalla. */}
      <main
        className="app"
        data-modo={mode}
        data-drawer={drawerOpen && !inExperiments ? 'open' : 'closed'}
        data-explicar={explaining ? 'si' : undefined}
        inert={theoryOpen}
      >
        <header className="top">
          <h1>{LAB_TITLE}</h1>
          {/* Un solo botón enciende las marcas de ayuda; la pantalla normal no cambia. */}
          <button type="button" className="btn sec explain-toggle" aria-pressed={explaining} onClick={handleExplainToggle}>
            <Question className="ic" weight={explaining ? 'fill' : 'bold'} aria-hidden="true" />
            {EXPLAIN_BUTTON_LABEL}
          </button>
          {/* No es región viva: el anuncio de lectores de pantalla ya lleva esta misma frase (explainAnnouncement). */}
          <p className="explain-hint">{explaining ? EXPLAIN_HINT : ''}</p>
          <Segmented
            name="modo"
            className="modes"
            ariaLabel="Modo de uso"
            value={mode}
            onChange={handleModeChange}
            options={MODES.map((option) => ({ value: option.id, label: option.label }))}
          />
        </header>

        {isNarrow && lessonCard}

        <SimulationView
          phenomenon={phenomenon}
          params={params}
          running={running}
          speed={speed}
          resetToken={resetToken}
          showLinear={showLinear}
          explaining={explaining}
          onError={handleSimError}
        />

        <aside className="aside" aria-label="Controles y resultados">
          {!isNarrow && lessonCard}
          {!isNarrow && actionsBar}
          <div className="aside-scroll">
            {asideReadingOrder({ narrow: isNarrow, experiments: inExperiments }).map((part) => (
              <Fragment key={part}>{asideParts[part]}</Fragment>
            ))}
            {/* La región de estado existe siempre y solo cambia su texto. Lleva un texto estable (el
                aviso de ángulo grande sin cifras, o el anuncio de la última acción): así el lector no
                repite nada en cada paso del deslizador. */}
            <div role="status" className="sr-only">
              <span key={announcement?.id ?? 'aviso'}>{announcement?.text ?? modelNotice?.spoken ?? ''}</span>
            </div>
          </div>
          {isNarrow && actionsBar}
        </aside>

        {!inExperiments && (
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
            onParamChange={handleParamChange}
            speed={speed}
            onSpeedChange={setSpeed}
            results={results}
            onOpenTheory={openTheory}
          />
        )}
        {/* Con la hoja de explicación abierta la página gana espacio al final (dentro de <main>, para que la
            barra fija de Play siga pegada abajo): así cualquier marca se puede subir por encima de la hoja. */}
        {isNarrow && openEntry && <div className="sheet-spacer" aria-hidden="true" />}
      </main>

      <TheoryPanel
        open={theoryOpen}
        onClose={() => setTheoryOpen(false)}
        theory={content.theoryByModel[model]}
        results={results}
        formulaText={content.formula.describe(params, results)}
        entries={helpEntries}
      />

      {/* Una sola tarjeta a la vez, fuera del <main> (que queda inert con la Teoría abierta). */}
      {openEntry && explainOpen && (
        <ExplainCard entry={openEntry} anchor={explainOpen.anchor} sheet={isNarrow} onClose={closeExplainCard} />
      )}
    </ExplainContext.Provider>
  );
}
