import type { PendulumModel } from '../engine/phenomena/pendulum';
import { ELEMENT_ID } from '../content/elementHelp';
import { ExplainMark } from './ExplainMark';
import { MODEL_CHANGE_WARNING, MODEL_LABELS, MODEL_ORDER, modelNote } from './kidLabels';
import { Segmented } from './Segmented';

interface Props {
  model: PendulumModel;
  onChange: (model: PendulumModel) => void;
  /** Máximo de φ₀ del modelo activo (sale del esquema del motor). */
  maxPhi0: number;
}

/**
 * "Cómo se calcula": Ángulo pequeño o Real, con una línea que explica el elegido. Es un grupo de
 * radio (selección única y reversible; las flechas eligen). Ojo: cambiar de modelo reinicia la
 * simulación y cierra el experimento en curso; por eso la nota que describe el grupo lo avisa ANTES
 * de elegir (aria-describedby) y `App` siempre lo anuncia después en la región de estado (ver
 * `describeModelChange`).
 */
export function ModelSelector({ model, onChange, maxPhi0 }: Props) {
  return (
    <>
      <div className="withmark">
        <h3 id="h-calc">Cómo se calcula</h3>
        <ExplainMark id={ELEMENT_ID.calculo} />
      </div>
      <Segmented
        name="modelo"
        className="choice"
        labelledBy="h-calc"
        describedBy="note-calc"
        value={model}
        onChange={onChange}
        options={MODEL_ORDER.map((id) => ({ value: id, label: MODEL_LABELS[id] }))}
      />
      <p id="note-calc" className="note">
        {modelNote(model, maxPhi0)} {MODEL_CHANGE_WARNING}
      </p>
    </>
  );
}
