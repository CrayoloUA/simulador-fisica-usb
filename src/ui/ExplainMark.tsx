import { Question } from '@phosphor-icons/react';
import { useContext, type CSSProperties } from 'react';
import { ExplainContext } from './ExplainContext';
import { EXPLAIN_CARD_ID, markLabel } from './explain';

interface Props {
  /** Id de la entrada de ayuda de la parte que explica esta marca. */
  id: string;
  /** Posición dentro de la caja del canvas (px CSS), para las marcas que cuelgan del dibujo. */
  at?: { left: number; top: number };
  className?: string;
}

/**
 * Marca del modo "¿Qué es esto?": un botón con objetivo de 44 px (círculo visible de 28 px) pegado
 * a la parte que explica. Solo existe con el modo encendido. Abierta, apunta a la tarjeta con
 * `aria-controls` (el id solo se pone entonces: no apunta a algo que no está en la página).
 */
export function ExplainMark({ id, at, className }: Props) {
  const { active, openId, entries, toggle } = useContext(ExplainContext);
  const entry = entries.get(id);
  if (!active || !entry) return null;
  const open = openId === id;
  const style: CSSProperties | undefined = at ? { left: at.left, top: at.top } : undefined;
  return (
    <button
      type="button"
      className={className ? `mark ${className}` : 'mark'}
      style={style}
      data-explain={id}
      aria-label={markLabel(entry.title)}
      aria-expanded={open}
      aria-controls={open ? EXPLAIN_CARD_ID : undefined}
      onClick={(event) => toggle(id, event.currentTarget)}
    >
      <span className="mark-dot" aria-hidden="true">
        <Question className="mark-ic" weight="bold" aria-hidden="true" />
      </span>
    </button>
  );
}
