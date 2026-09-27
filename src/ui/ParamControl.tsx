import { useState } from 'react';
import { formatNumber, parseDecimal } from '../engine/numbers';
import type { ParamSpec } from '../engine/types';

interface PresetOption {
  label: string;
  value: number;
}

interface Props {
  spec: ParamSpec;
  raw: string;
  error?: string;
  help?: string;
  presets?: PresetOption[];
  highlighted?: boolean;
  onChange: (raw: string) => void;
}

export function ParamControl({ spec, raw, error, help, presets, highlighted, onChange }: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const parsed = parseDecimal(raw);
  const sliderValue = parsed === null ? spec.defaultValue : Math.min(spec.max, Math.max(spec.min, parsed));
  const id = `param-${spec.key}`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <div className={highlighted ? 'param param-highlighted' : 'param'}>
      <label htmlFor={id}>
        {spec.label} <span className="symbol">{spec.symbol}</span>
        {help && (
          <button
            type="button"
            className="help-toggle"
            aria-expanded={helpOpen}
            aria-controls={helpId}
            aria-label={`Qué es ${spec.label}`}
            onClick={() => setHelpOpen((open) => !open)}
          >
            ?
          </button>
        )}
      </label>
      {help && helpOpen && (
        <p id={helpId} className="help-card">
          {help}
        </p>
      )}
      <div className="param-row">
        <input
          type="range"
          aria-label={`${spec.label}, control deslizante`}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={sliderValue}
          onChange={(e) => onChange(formatNumber(Number(e.target.value)))}
        />
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={raw}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="unit">{spec.unit}</span>
      </div>
      {presets && (
        <div className="presets">
          {presets.map((preset) => (
            <button key={preset.label} type="button" onClick={() => onChange(formatNumber(preset.value))}>
              {preset.label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p id={errorId} className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
