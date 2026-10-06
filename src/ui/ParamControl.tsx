import { useState } from 'react';
import { formatNumber, parseDecimal } from '../engine/numbers';
import type { ParamHelp } from '../content/types';
import type { ParamSpec } from '../engine/types';

interface PresetOption {
  label: string;
  value: number;
}

interface Props {
  spec: ParamSpec;
  raw: string;
  error?: string;
  help?: ParamHelp;
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
  const unitId = `${id}-unit`;
  // La unidad se asocia al campo de texto como descripción, para que el lector de pantalla
  // anuncie el valor con su unidad (p. ej. "1,5 … m") y, si aplica, también el error.
  const describedBy = [spec.unit ? unitId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={highlighted ? 'param param-highlighted' : 'param'}>
      <div className="param-label-row">
        <label htmlFor={id}>
          {spec.label} <span className="symbol">{spec.symbol}</span>
        </label>
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
      </div>
      {help?.note && <p className="param-note">{help.note}</p>}
      {help && helpOpen && (
        <div id={helpId} className="help-card">
          <p>
            <strong>De dónde sale.</strong> {help.origin}
          </p>
          <p>
            <strong>Para qué sirve.</strong> {help.role}
          </p>
          <p>
            <strong>Si la cambias u omites.</strong> {help.effect}
          </p>
        </div>
      )}
      <div className="param-row">
        <input
          type="range"
          aria-label={`${spec.label}, control deslizante`}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={sliderValue}
          aria-valuetext={`${formatNumber(sliderValue)} ${spec.unit}`}
          onChange={(e) => onChange(formatNumber(Number(e.target.value)))}
        />
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={raw}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <span id={unitId} className="unit">
          {spec.unit}
        </span>
      </div>
      {presets && (
        <div className="presets" role="group" aria-label={`Valores predefinidos de ${spec.label}`}>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-label={`${preset.label}: ${formatNumber(preset.value)} ${spec.unit}`}
              onClick={() => onChange(formatNumber(preset.value))}
            >
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
