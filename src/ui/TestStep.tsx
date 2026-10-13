import { CheckCircle } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import type { ExperimentStep } from '../content/types';
import type { Params } from '../engine/types';
import { ContinueButton } from './ContinueButton';
import { LangText } from './LangText';

interface Props {
  step: ExperimentStep;
  /** Control o resultado del cajón que el paso pide mirar, ya resaltado (ver StepInlineItems). */
  inlineItems: ReactNode;
  onPrepare: (values: Partial<Params>) => void;
  onContinue: () => void;
}

/**
 * Etapa 2: un paso de la prueba. Si el paso trae valores para preparar, "Preparar valores" es
 * el botón principal; al pulsarlo aparece, y se anuncia, "Valores preparados", y "Continuar"
 * pasa a ser el principal. Quien lo usa le pone `key` con el índice del paso para reiniciarlo.
 */
export function TestStep({ step, inlineItems, onPrepare, onContinue }: Props) {
  const [prepared, setPrepared] = useState(false);
  const prepareParams = step.prepareParams;

  return (
    <div className="step">
      <p className="instruction">
        <LangText text={step.instruction} />
      </p>
      {inlineItems}
      <div className="lesson-actions">
        {prepareParams && (
          <button
            type="button"
            className={prepared ? 'btn sec' : 'btn'}
            onClick={() => {
              onPrepare(prepareParams);
              setPrepared(true);
            }}
          >
            Preparar valores
          </button>
        )}
        <ContinueButton enabled onClick={onContinue} secondary={prepareParams !== undefined && !prepared} />
      </div>
      {/* La región existe siempre y solo cambia su contenido: así el lector de pantalla lo anuncia. */}
      {prepareParams && (
        <p role="status" className="prepared">
          {/* El mensaje es lo que aparece (con un fundido corto): la región de arriba no se mueve. */}
          {prepared && (
            <span className="prepared-msg">
              <CheckCircle className="ic" weight="fill" aria-hidden="true" />
              Valores preparados
            </span>
          )}
        </p>
      )}
    </div>
  );
}
