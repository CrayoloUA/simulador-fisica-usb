import { Check } from '@phosphor-icons/react';
import type { FlowPhase } from '../content/experimentFlow';
import { STAGES, stageStatus, type StageStatus } from './lessonProgress';

const STATUS_WORDS: Record<StageStatus, string> = { done: 'hecha', current: 'actual', pending: 'pendiente' };

/**
 * Las cuatro etapas del experimento (Predecir, Probar, Comprobar, Concluir) como círculos
 * numerados: la hecha lleva una marca, la actual un aro grueso y el nombre en negrita, y la
 * pendiente solo su número. Un filete une los círculos. El estado se dice además con texto para el
 * lector de pantalla.
 */
export function StepIndicator({ phase }: { phase: FlowPhase }) {
  return (
    <ol className="stages" role="list" aria-label="Etapas del experimento">
      {STAGES.map((stage, index) => {
        const status = stageStatus(index, phase);
        return (
          <li key={stage.phase} className="stage-item" data-status={status} aria-current={status === 'current' ? 'step' : undefined}>
            <span className="stage-dot" aria-hidden="true">
              {status === 'done' ? <Check className="ic-sm" weight="bold" /> : index + 1}
            </span>
            <span className="stage-name">
              {stage.label}
              <span className="sr-only"> ({STATUS_WORDS[status]})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
