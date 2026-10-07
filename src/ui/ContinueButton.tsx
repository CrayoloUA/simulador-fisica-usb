import { Info } from '@phosphor-icons/react';
import { useId } from 'react';

interface Props {
  enabled: boolean;
  onClick: () => void;
  /** Lo que falta para poder continuar; se ve siempre que el botón está bloqueado. */
  reason?: string;
  /** Secundario cuando otra acción (p. ej. "Preparar valores") es la principal del paso. */
  secondary?: boolean;
}

/**
 * "Continuar". Bloqueado usa `aria-disabled` y no `disabled`: conserva el foco y el lector lo
 * anuncia. La razón por la que está bloqueado se ve en texto y se enlaza con aria-describedby.
 */
export function ContinueButton({ enabled, onClick, reason = 'Elige una opción', secondary = false }: Props) {
  const reasonId = useId();
  return (
    <>
      <button
        type="button"
        className={secondary ? 'btn sec' : 'btn'}
        aria-disabled={!enabled}
        aria-describedby={enabled ? undefined : reasonId}
        onClick={() => {
          if (enabled) onClick();
        }}
      >
        Continuar
      </button>
      {!enabled && (
        <p id={reasonId} className="reason">
          <Info className="ic" weight="bold" aria-hidden="true" />
          {reason}
        </p>
      )}
    </>
  );
}
