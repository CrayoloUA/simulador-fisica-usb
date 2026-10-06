import { useRef, type KeyboardEvent } from 'react';
import type { PendulumModel } from '../engine/phenomena/pendulum';

const OPTIONS: Array<{ id: PendulumModel; label: string }> = [
  { id: 'lineal', label: 'Lineal (ángulo pequeño)' },
  { id: 'no-lineal', label: 'No lineal (real)' },
];

interface Props {
  model: PendulumModel;
  onChange: (model: PendulumModel) => void;
  /** Texto del rango de ángulo del modelo activo, p. ej. "Ángulo inicial hasta 15°". */
  rangeText: string;
}

/**
 * Selección única excluyente y reversible: radiogroup (mismo patrón que el selector
 * Explorar/Experimentos). Las flechas eligen, porque cambiar de modelo no es destructivo.
 */
export function ModelSelector({ model, onChange, rangeText }: Props) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = OPTIONS.findIndex((option) => option.id === model);
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % OPTIONS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + OPTIONS.length) % OPTIONS.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = OPTIONS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(OPTIONS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <section className="model-selector" aria-label="Modelo del péndulo">
      <h2>Modelo</h2>
      <div className="mode-switch" role="radiogroup" aria-label="Modelo del péndulo" onKeyDown={handleKeyDown}>
        {OPTIONS.map((option, index) => (
          <button
            key={option.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={model === option.id}
            tabIndex={model === option.id ? 0 : -1}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="range-note">{rangeText}</p>
    </section>
  );
}
