import { CheckCircle, Circle, XCircle } from '@phosphor-icons/react';
import { useRef, useState, type KeyboardEvent } from 'react';
import type { ChoiceOption } from '../content/types';
import type { Verdict } from './lessonProgress';

interface Props {
  options: ChoiceOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Id del elemento visible con la pregunta: da nombre al grupo. */
  labelId: string;
  /** Tras responder, la opción elegida ya no se cambia (comprobación). En la predicción sí se puede. */
  locked?: boolean;
  /** Veredicto de la opción elegida: cambia su ícono, además del color. */
  verdict?: Verdict | null;
}

/**
 * Grupo de selección única (radiogroup) con opciones grandes: predicción y comprobación.
 *
 * Decisiones de accesibilidad:
 * - Las flechas mueven solo el foco (activación manual: Espacio o Enter eligen). Si eligieran, un
 *   usuario de teclado o lector de pantalla enviaría respuestas sin querer.
 * - Al quedar bloqueado el grupo NO se usa `disabled` (sacaría el botón del orden de foco y el
 *   foco caería al <body>); se usa `aria-disabled` en las opciones no elegidas y se ignora el clic.
 * - Foco itinerante (roving tabindex): una sola parada de tabulación en el grupo.
 * - El estado nunca depende solo del color: cada opción lleva un ícono (círculo vacío, marca o
 *   cruz) y el aro del elegido es más grueso.
 */
export function ChoiceList({ options, selectedId, onSelect, labelId, locked = false, verdict = null }: Props) {
  const [focusIndex, setFocusIndex] = useState(0);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((option) => option.id === selectedId);
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : focusIndex;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = buttonRefs.current.findIndex((button) => button === event.target);
    if (current < 0) return;
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = (current + 1) % options.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        next = (current - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    buttonRefs.current[next]?.focus();
  };

  return (
    <div className="choices" role="radiogroup" aria-labelledby={labelId} onKeyDown={handleKeyDown}>
      {options.map((option, index) => {
        const checked = selectedId === option.id;
        const Mark = checked ? (verdict === 'wrong' ? XCircle : CheckCircle) : Circle;
        return (
          <button
            key={option.id}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            className="opt"
            data-verdict={checked && verdict ? verdict : undefined}
            aria-checked={checked}
            aria-disabled={locked && !checked ? true : undefined}
            tabIndex={index === tabbableIndex ? 0 : -1}
            onFocus={() => setFocusIndex(index)}
            onClick={() => {
              if (!locked && !checked) onSelect(option.id);
            }}
          >
            <Mark className="ic" weight={checked ? 'fill' : 'regular'} aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
