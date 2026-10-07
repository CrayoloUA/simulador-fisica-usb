import { CheckCircle, Lightbulb } from '@phosphor-icons/react';
import { isPredictionCorrect, type FlowState } from '../content/experimentFlow';
import type { Experiment } from '../content/types';
import { predictionVerdict } from './lessonProgress';

interface Props {
  experiment: Experiment;
  flow: FlowState;
  onBack: () => void;
}

/**
 * Etapa 4: la conclusión. Si la predicción no acertó, el aviso es informativo y sereno (no rojo):
 * equivocarse al predecir es parte de aprender. Lleva ícono además del color.
 */
export function ConclusionStep({ experiment, flow, onBack }: Props) {
  const verdict = predictionVerdict(isPredictionCorrect(flow, experiment));
  const Icon = verdict.tone === 'ok' ? CheckCircle : Lightbulb;
  return (
    <div className="step">
      <p className="verdict" data-tone={verdict.tone}>
        <Icon className="ic" weight="fill" aria-hidden="true" />
        {verdict.text}
      </p>
      <p className="instruction">{experiment.conclusion}</p>
      <div className="lesson-actions">
        <button type="button" className="btn" onClick={onBack}>
          Volver a la lista
        </button>
      </div>
    </div>
  );
}
