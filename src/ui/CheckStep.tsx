import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import { canAdvance, type FlowState } from '../content/experimentFlow';
import type { Experiment } from '../content/types';
import { ChoiceList } from './ChoiceList';
import { ContinueButton } from './ContinueButton';
import { answerVerdict, verdictText } from './lessonProgress';

interface Props {
  experiment: Experiment;
  flow: FlowState;
  onAnswer: (optionId: string) => void;
  onContinue: () => void;
}

/**
 * Etapa 3: una pregunta de comprobación. Al responder, la opción elegida se marca con un ícono y
 * debajo aparece el veredicto con la explicación: "Correcto" o, si no, "No", "Casi" o "Revisa de
 * nuevo" según cómo abra la explicación (siempre con ícono y tono ámbar, no rojo). La respuesta se
 * confirma una sola vez.
 */
export function CheckStep({ experiment, flow, onAnswer, onContinue }: Props) {
  const question = experiment.check[flow.questionIndex];
  const answer = flow.checkAnswers[flow.questionIndex];
  const verdict = answerVerdict(answer, question.correctOptionId);
  const shown = verdict && answer ? verdictText(question.feedback[answer], verdict) : null;
  const feedbackRef = useRef<HTMLDivElement>(null);

  // La explicación aparece bajo las opciones: se lleva a la vista para que no quede escondida.
  useEffect(() => {
    if (verdict) feedbackRef.current?.scrollIntoView({ block: 'nearest' });
  }, [verdict, flow.questionIndex]);

  return (
    <div className="step">
      <p id="check-question" className="question">
        {question.question}
      </p>
      <ChoiceList
        key={flow.questionIndex}
        options={question.options}
        selectedId={answer ?? null}
        onSelect={onAnswer}
        labelId="check-question"
        locked={answer !== null && answer !== undefined}
        verdict={verdict}
      />
      {/* La región de estado existe siempre; solo cambia su contenido, para que se anuncie. */}
      <div ref={feedbackRef} role="status" className="feedback-slot">
        {verdict && shown && (
          <div className="feedback" data-verdict={verdict}>
            <p className="feedback-head">
              {verdict === 'correct' ? (
                <CheckCircle className="ic" weight="fill" aria-hidden="true" />
              ) : (
                <XCircle className="ic" weight="fill" aria-hidden="true" />
              )}
              {shown.label}
            </p>
            <p className="feedback-text">{shown.body}</p>
          </div>
        )}
      </div>
      <div className="lesson-actions">
        <ContinueButton enabled={canAdvance(flow)} onClick={onContinue} />
      </div>
    </div>
  );
}
