import type { FlowState } from '../content/experimentFlow';
import { canAdvance } from '../content/experimentFlow';
import type { Experiment } from '../content/types';
import { ChoiceList } from './ChoiceList';
import { ContinueButton } from './ContinueButton';

interface Props {
  experiment: Experiment;
  flow: FlowState;
  onPredict: (optionId: string) => void;
  onContinue: () => void;
}

/** Etapa 1: el estudiante apuesta antes de probar. Se puede cambiar la opción hasta continuar. */
export function PredictionStep({ experiment, flow, onPredict, onContinue }: Props) {
  return (
    <div className="step">
      <p id="predict-question" className="question">
        {experiment.predict.question}
      </p>
      <ChoiceList
        options={experiment.predict.options}
        selectedId={flow.predictedOptionId}
        onSelect={onPredict}
        labelId="predict-question"
      />
      <div className="lesson-actions">
        <ContinueButton enabled={canAdvance(flow)} onClick={onContinue} />
      </div>
    </div>
  );
}
