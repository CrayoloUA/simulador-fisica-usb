import { ArrowLeft } from '@phosphor-icons/react';
import { useEffect, useRef, type ReactNode } from 'react';
import type { FlowState } from '../content/experimentFlow';
import type { Experiment } from '../content/types';
import type { Params } from '../engine/types';
import { CheckStep } from './CheckStep';
import { ConclusionStep } from './ConclusionStep';
import { ExperimentList } from './ExperimentList';
import { LIST_TITLE, lessonAnnouncement, lessonTitle, positionKey } from './lessonProgress';
import { PredictionStep } from './PredictionStep';
import { StepIndicator } from './StepIndicator';
import { TestStep } from './TestStep';

interface Props {
  experiments: Experiment[];
  experiment: Experiment | null;
  flow: FlowState | null;
  /** Control o resultado del cajón que el paso actual pide mirar (ya armado por App). */
  inlineItems: ReactNode;
  onSelectExperiment: (id: string) => void;
  onPredict: (optionId: string) => void;
  onAnswerCheck: (optionId: string) => void;
  onAdvance: () => void;
  onPrepare: (values: Partial<Params>) => void;
  onExit: () => void;
}

/**
 * Lección del modo Experimentos, en la columna derecha sobre los controles. No es una tarjeta
 * dentro de otra: la columna ya es el panel, así que esto es un bloque con título y filetes.
 * Muestra una sola cosa a la vez: la lista, o la etapa en que va el estudiante.
 *
 * Al cambiar de etapa o de paso el foco pasa al título nuevo, una región `role="status"` lo
 * anuncia y lo que el paso resalta se lleva a la vista. No se mueve el foco al montarse (p. ej. al volver desde Explorar).
 */
export function LessonCard({
  experiments,
  experiment,
  flow,
  inlineItems,
  onSelectExperiment,
  onPredict,
  onAnswerCheck,
  onAdvance,
  onPrepare,
  onExit,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const key = positionKey(experiment, flow);
  const lastKey = useRef(key);

  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    headingRef.current?.focus();
    // Si el paso resalta algo fuera de la tarjeta (un control o T), se lleva a la vista con el
    // mínimo desplazamiento: la columna derecha puede ser más alta que la pantalla.
    document.querySelector('.params .hl, .results .hl')?.scrollIntoView({ block: 'nearest' });
  }, [key]);

  const active = experiment && flow ? { experiment, flow } : null;

  return (
    <section className="lesson" aria-label="Experimentos guiados" data-phase={flow?.phase ?? 'lista'}>
      <div role="status" className="sr-only">
        {lessonAnnouncement(flow, experiment)}
      </div>

      {active && (
        <>
          <div className="lesson-head">
            <button type="button" className="btn sec icon-only" aria-label="Volver a la lista" title="Volver a la lista" onClick={onExit}>
              <ArrowLeft className="ic" weight="bold" aria-hidden="true" />
            </button>
            <p className="lesson-name">{active.experiment.title}</p>
          </div>
          <StepIndicator phase={active.flow.phase} />
        </>
      )}

      {/* El cuerpo (título, instrucción y botones) es lo que en el celular queda pegado arriba. */}
      <div className="lesson-body">
        <h2 ref={headingRef} tabIndex={-1} className="lesson-title focus-target">
          {active ? lessonTitle(active.flow, active.experiment) : LIST_TITLE}
        </h2>

        {!active && <ExperimentList experiments={experiments} onSelect={onSelectExperiment} />}

        {active?.flow.phase === 'predict' && (
          <PredictionStep experiment={active.experiment} flow={active.flow} onPredict={onPredict} onContinue={onAdvance} />
        )}
        {active?.flow.phase === 'steps' && (
          <TestStep
            key={active.flow.stepIndex}
            step={active.experiment.steps[active.flow.stepIndex]}
            inlineItems={inlineItems}
            onPrepare={onPrepare}
            onContinue={onAdvance}
          />
        )}
        {active?.flow.phase === 'check' && (
          <CheckStep experiment={active.experiment} flow={active.flow} onAnswer={onAnswerCheck} onContinue={onAdvance} />
        )}
        {active?.flow.phase === 'conclusion' && (
          <ConclusionStep experiment={active.experiment} flow={active.flow} onBack={onExit} />
        )}
      </div>
    </section>
  );
}
