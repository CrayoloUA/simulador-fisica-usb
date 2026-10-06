import type { PendulumModel } from '../engine/phenomena/pendulum';
import { MODEL_LABELS, MODEL_ORDER, modelNote } from './kidLabels';
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
 * simulación y cierra el experimento en curso; por eso `App` siempre lo anuncia en la región de
 * estado (ver `describeModelChange`).
 */
export function ModelSelector({ model, onChange, maxPhi0 }: Props) {
  return (
    <>
      <h3 id="h-calc">Cómo se calcula</h3>
      <Segmented
        name="modelo"
        className="choice"
        labelledBy="h-calc"
        value={model}
        onChange={onChange}
        options={MODEL_ORDER.map((id) => ({ value: id, label: MODEL_LABELS[id] }))}
      />
      <p className="note">{modelNote(model, maxPhi0)}</p>
    </>
  );
}
