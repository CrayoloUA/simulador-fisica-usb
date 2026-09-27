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

function OptionList({
  options,
  selectedId,
  onSelect,
}: {
  options: ChoiceOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="predict-options">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="option-button"
          aria-pressed={selectedId === option.id}
          disabled={selectedId !== null}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </button>
      ))}
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
  if (!activeExperiment || !flowState) {
    return (
      <section className="experiment-panel" aria-label="Experimentos guiados">
        <h2>Elige un experimento</h2>
        <div className="experiment-list">
          {content.experiments.map((experiment) => (
            <button key={experiment.id} type="button" onClick={() => onSelectExperiment(experiment.id)}>
              {experiment.title}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const experiment = activeExperiment;

  return (
    <section className="experiment-panel" aria-label={experiment.title}>
      <h2>{experiment.title}</h2>
      <button type="button" onClick={onExit}>
        Volver a la lista
      </button>

      {flowState.phase === 'predict' && (
        <div>
          <p>{experiment.predict.question}</p>
          <OptionList
            options={experiment.predict.options}
            selectedId={flowState.predictedOptionId}
            onSelect={onPredict}
          />
          <button type="button" disabled={!canAdvance(flowState)} onClick={onAdvance}>
            Continuar
          </button>
        </div>
      )}

      {flowState.phase === 'steps' && (
        <div>
          <p className="progress">
            Paso {flowState.stepIndex + 1} de {experiment.steps.length}
          </p>
          <p>{experiment.steps[flowState.stepIndex].instruction}</p>
          {experiment.steps[flowState.stepIndex].prepareParams && (
            <button type="button" onClick={() => onPrepare(experiment.steps[flowState.stepIndex].prepareParams!)}>
              Preparar valores
            </button>
          )}
          <button type="button" onClick={onAdvance}>
            Continuar
          </button>
        </div>
      )}

      {flowState.phase === 'check' && (
        <div>
          <p className="progress">
            Pregunta {flowState.questionIndex + 1} de {experiment.check.length}
          </p>
          <p>{experiment.check[flowState.questionIndex].question}</p>
          <OptionList
            options={experiment.check[flowState.questionIndex].options}
            selectedId={flowState.checkAnswers[flowState.questionIndex]}
            onSelect={onAnswerCheck}
          />
          {flowState.checkAnswers[flowState.questionIndex] && (
            <p
              className={
                flowState.checkAnswers[flowState.questionIndex] ===
                experiment.check[flowState.questionIndex].correctOptionId
                  ? 'feedback feedback-correct'
                  : 'feedback feedback-incorrect'
              }
              role="status"
            >
              {experiment.check[flowState.questionIndex].feedback[flowState.checkAnswers[flowState.questionIndex]!]}
            </p>
          )}
          <button type="button" disabled={!canAdvance(flowState)} onClick={onAdvance}>
            Continuar
          </button>
        </div>
      )}

      {flowState.phase === 'conclusion' && (
        <div>
          <p>
            {isPredictionCorrect(flowState, experiment)
              ? 'Tu predicción inicial fue correcta.'
              : 'Tu predicción inicial no coincidió con lo observado, y eso también es parte de aprender.'}
          </p>
          <p>{experiment.conclusion}</p>
          <button type="button" onClick={onExit}>
            Volver a la lista
          </button>
        </div>
      )}
    </section>
  );
}
