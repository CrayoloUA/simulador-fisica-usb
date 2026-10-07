import { CaretRight } from '@phosphor-icons/react';
import type { Experiment } from '../content/types';
import { EXPERIMENT_BLURBS } from './lessonProgress';

/** Lista de experimentos: un botón grande por experimento, con su título y una línea corta. */
export function ExperimentList({
  experiments,
  onSelect,
}: {
  experiments: Experiment[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="exp-list">
      {experiments.map((experiment) => (
        <button key={experiment.id} type="button" className="exp-item" onClick={() => onSelect(experiment.id)}>
          <span className="exp-text">
            <span className="exp-title">{experiment.title}</span>
            {EXPERIMENT_BLURBS[experiment.id] && <span className="exp-blurb">{EXPERIMENT_BLURBS[experiment.id]}</span>}
          </span>
          <CaretRight className="ic" weight="bold" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
