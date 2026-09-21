import { formatNumber, parseDecimal } from '../engine/numbers';
import type { ParamSpec } from '../engine/types';

interface Props {
  spec: ParamSpec;
  raw: string;
  error?: string;
  onChange: (raw: string) => void;
}

export function ParamControl({ spec, raw, error, onChange }: Props) {
  const parsed = parseDecimal(raw);
  const sliderValue = parsed === null ? spec.defaultValue : Math.min(spec.max, Math.max(spec.min, parsed));
  const id = `param-${spec.key}`;
  const errorId = `${id}-error`;

  return (
    <div className="param">
      <label htmlFor={id}>
        {spec.label} <span className="symbol">{spec.symbol}</span>
      </label>
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
      {error && (
        <p id={errorId} className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
