import type { CSSProperties } from 'react';
import type { PresetValue } from '../content/types';
import type { ParamSpec } from '../engine/types';
import { ExplainMark } from './ExplainMark';
import { paramHelpId } from './helpEntries';
import { PARAM_NOTES, formatParamValue, paramLabel } from './kidLabels';

interface Props {
  spec: ParamSpec;
  value: number;
  presets?: PresetValue[];
  /** Un paso del experimento pide mirar este control. */
  highlighted?: boolean;
  /** Muestra la nota bajo el control. En un experimento se oculta: la de la masa adelanta la respuesta. */
  showNote?: boolean;
  onChange: (value: number) => void;
}

/**
 * Un parámetro: etiqueta, deslizador y, a la derecha, su valor con unidad. El deslizador es el
 * único campo: no deja salir del rango, así que no hay valores inválidos que corregir. El valor
 * mostrado va oculto para el lector de pantalla porque el deslizador ya lo dice (aria-valuetext).
 */
export function ParamControl({ spec, value, presets, highlighted, showNote = true, onChange }: Props) {
  const { label, symbol } = paramLabel(spec);
  const text = formatParamValue(spec.key, value);
  const id = `param-${spec.key}`;
  const note = showNote ? PARAM_NOTES[spec.key] : undefined;
  // Porcentaje recorrido del deslizador: pinta la parte "llena" de la pista.
  const fill = ((value - spec.min) / (spec.max - spec.min)) * 100;

  return (
    <div className={highlighted ? 'param hl' : 'param'} data-param={spec.key}>
      <label className="plabel" htmlFor={id}>
        {label} <span className="sym">({symbol})</span>
      </label>
      <ExplainMark id={paramHelpId(spec.key)} className="mark-param" />
      <div className="prow">
        <input
          id={id}
          type="range"
          className="range"
          style={{ '--pct': `${fill}%` } as CSSProperties}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={value}
          aria-valuetext={text.spoken}
          aria-describedby={note ? `${id}-note` : undefined}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="pval" aria-hidden="true">
          {text.number}
          <span className="unit">{text.unit}</span>
        </span>
      </div>
      {presets && (
        <div className="chips" role="group" aria-label={`${label}: valores de algunos planetas`}>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="chip"
              aria-pressed={Math.abs(preset.value - value) < 1e-9}
              aria-label={`${preset.label}: ${formatParamValue(spec.key, preset.value).spoken}`}
              onClick={() => onChange(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      {note && (
        <p id={`${id}-note`} className="note">
          {note}
        </p>
      )}
    </div>
  );
}
