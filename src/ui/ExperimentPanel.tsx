import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { canAdvance, isPredictionCorrect, type FlowState } from '../content/experimentFlow';
import type { ChoiceOption, Experiment, LabContent } from '../content/types';
import type { Params } from '../engine/types';

interface Props {
  content: LabContent;
  activeExperiment: Experiment | null;
  flowState: FlowState | null;
  onSelectExperiment: (id: string) => void;
  onPredict: (optionId: string) => void;
  onAnswerCheck: (optionId: string) => void;
  onAdvance: () => void;
  onPrepare: (values: Partial<Params>) => void;
  onExit: () => void;
}

/**
 * Grupo de selección única (radiogroup) para las opciones de predicción y comprobación.
 *
 * Decisiones de accesibilidad:
 * - La respuesta se confirma una sola vez y da retroalimentación inmediata, así que las flechas
 *   mueven solo el foco (activación manual: Espacio o Enter eligen). Si las flechas eligieran,
 *   un usuario de teclado o lector de pantalla enviaría respuestas sin querer.
 * - Al quedar bloqueado el grupo NO se usa `disabled` (sacaría el botón del orden de foco y el
 *   foco caería al <body>); se usa `aria-disabled` en las opciones no elegidas y se ignora el clic.
 * - Foco itinerante (roving tabindex): una sola parada de tabulación en el grupo.
 */
function OptionList({
  options,
  selectedId,
  onSelect,
  labelId,
}: {
  options: ChoiceOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  labelId: string;
}) {
  const [focusIndex, setFocusIndex] = useState(0);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const locked = selectedId !== null;
  const selectedIndex = options.findIndex((option) => option.id === selectedId);
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : focusIndex;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = buttonRefs.current.findIndex((button) => button === event.target);
    if (current < 0) return;
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = (current + 1) % options.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        next = (current - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    buttonRefs.current[next]?.focus();
  };

  return (
    <div className="predict-options" role="radiogroup" aria-labelledby={labelId} onKeyDown={handleKeyDown}>
      {options.map((option, index) => {
        const checked = selectedId === option.id;
        return (
          <button
            key={option.id}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            className="option-button"
            aria-checked={checked}
            aria-disabled={locked && !checked ? true : undefined}
            tabIndex={index === tabbableIndex ? 0 : -1}
            onFocus={() => setFocusIndex(index)}
            onClick={() => {
              if (!locked) onSelect(option.id);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ExperimentPanel({
  content,
  activeExperiment,
  flowState,
  onSelectExperiment,
  onPredict,
  onAnswerCheck,
  onAdvance,
  onPrepare,
  onExit,
}: Props) {
  // Cuando un control que se acaba de pulsar desaparece (elegir experimento, Continuar, Volver),
  // el foco caería al <body>. Estos manejadores lo devuelven al inicio del contenido nuevo.
  // Solo se mueve el foco tras una acción dentro del panel: no al volver desde el modo Explorar.
  const moveFocusRef = useRef(false);
  const focusTargetRef = useRef<HTMLElement | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (moveFocusRef.current) {
      moveFocusRef.current = false;
      focusTargetRef.current?.focus();
    }
  });

  const setFocusTarget = (element: HTMLElement | null) => {
    focusTargetRef.current = element;
  };

  const withFocusMove = (action: () => void) => {
    moveFocusRef.current = true;
    setNotice('');
    action();
  };

  if (!activeExperiment || !flowState) {
    return (
      <section className="experiment-panel" aria-label="Experimentos guiados">
        <h2 ref={setFocusTarget} tabIndex={-1} className="focus-target">
          Elige un experimento
        </h2>
        <div className="experiment-list">
          {content.experiments.map((experiment) => (
            <button
              key={experiment.id}
              type="button"
              className="secondary"
              onClick={() => withFocusMove(() => onSelectExperiment(experiment.id))}
            >
              {experiment.title}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const experiment = activeExperiment;
  const continueEnabled = canAdvance(flowState);
  const handleContinue = () => {
    if (continueEnabled) withFocusMove(onAdvance);
  };
  const continueButton = (
    <button type="button" aria-disabled={!continueEnabled} onClick={handleContinue}>
      Continuar
    </button>
  );

  return (
    <section className="experiment-panel" aria-label={experiment.title}>
      <h2>{experiment.title}</h2>
      <button type="button" className="secondary" onClick={() => withFocusMove(onExit)}>
        Volver a la lista
      </button>
      <div role="status" className="sr-only">
        {notice}
      </div>

      {flowState.phase === 'predict' && (
        <div ref={setFocusTarget} tabIndex={-1} role="group" aria-label="Predicción" className="focus-target">
          <p id="predict-question">{experiment.predict.question}</p>
          <OptionList
            key="predict"
            options={experiment.predict.options}
            selectedId={flowState.predictedOptionId}
            onSelect={onPredict}
            labelId="predict-question"
          />
          {continueButton}
        </div>
      )}

      {flowState.phase === 'steps' && (
        <div
          ref={setFocusTarget}
          tabIndex={-1}
          role="group"
          aria-label={`Paso ${flowState.stepIndex + 1} de ${experiment.steps.length}`}
          className="focus-target"
        >
          <p className="progress">
            Paso {flowState.stepIndex + 1} de {experiment.steps.length}
          </p>
          <p>{experiment.steps[flowState.stepIndex].instruction}</p>
          {experiment.steps[flowState.stepIndex].prepareParams && (
            <button
              type="button"
              onClick={() => {
                onPrepare(experiment.steps[flowState.stepIndex].prepareParams!);
                setNotice('Valores preparados en los controles de parámetros.');
              }}
            >
              Preparar valores
            </button>
          )}
          {continueButton}
        </div>
      )}

      {flowState.phase === 'check' && (
        <div
          ref={setFocusTarget}
          tabIndex={-1}
          role="group"
          aria-label={`Pregunta ${flowState.questionIndex + 1} de ${experiment.check.length}`}
          className="focus-target"
        >
          <p className="progress">
            Pregunta {flowState.questionIndex + 1} de {experiment.check.length}
          </p>
          <p id="check-question">{experiment.check[flowState.questionIndex].question}</p>
          <OptionList
            key={`check-${flowState.questionIndex}`}
            options={experiment.check[flowState.questionIndex].options}
            selectedId={flowState.checkAnswers[flowState.questionIndex]}
            onSelect={onAnswerCheck}
            labelId="check-question"
          />
          {/* La región de estado existe siempre; solo cambia su contenido, para que se anuncie. */}
          <div role="status">
            {flowState.checkAnswers[flowState.questionIndex] && (
              <p
                className={
                  flowState.checkAnswers[flowState.questionIndex] ===
                  experiment.check[flowState.questionIndex].correctOptionId
                    ? 'feedback feedback-correct'
                    : 'feedback feedback-incorrect'
                }
              >
                {experiment.check[flowState.questionIndex].feedback[flowState.checkAnswers[flowState.questionIndex]!]}
              </p>
            )}
          </div>
          {continueButton}
        </div>
      )}

      {flowState.phase === 'conclusion' && (
        <div ref={setFocusTarget} tabIndex={-1} role="group" aria-label="Conclusión" className="focus-target">
          <p>
            {isPredictionCorrect(flowState, experiment)
              ? 'Tu predicción inicial fue correcta.'
              : 'Tu predicción inicial no coincidió con lo observado, y eso también es parte de aprender.'}
          </p>
          <p>{experiment.conclusion}</p>
          <button type="button" className="secondary" onClick={() => withFocusMove(onExit)}>
            Volver a la lista
          </button>
        </div>
      )}
    </section>
  );
}
