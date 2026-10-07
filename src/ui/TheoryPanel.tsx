import { X } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import type { ModelTheory } from '../content/types';
import { formatNumber } from '../engine/numbers';
import type { HelpEntry } from './helpEntries';

interface Props {
  open: boolean;
  onClose: () => void;
  theory: ModelTheory;
  results: Record<string, number>;
  /** Fórmula con los números del estudiante (T₀ = 2π√(L/g) = …), ya armada por el contenido. */
  formulaText: string;
  /** "Qué es cada cosa": los textos reales de ayuda de parámetros y resultados. */
  entries: HelpEntry[];
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Hoja de Teoría: ventana modal con los textos del contenido. Al abrir, el foco pasa al título;
 * Tab y Shift+Tab giran dentro de la hoja; el fondo queda `inert` (lo hace `App`) y Escape o el
 * clic en el fondo la cierran (también lo gestiona `App`, junto con devolver el foco). Cerrada
 * no se dibuja.
 */
export function TheoryPanel({ open, onClose, theory, results, formulaText, entries }: Props) {
  const sheetRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (open) titleRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Atrapa el foco: desde el último control vuelve al primero y al revés.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const items = [...sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled'));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === titleRef.current)) {
        last.focus();
        event.preventDefault();
      } else if (!event.shiftKey && active === last) {
        first.focus();
        event.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <section ref={sheetRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet-head">
          <h2 id="sheet-title" ref={titleRef} tabIndex={-1} className="focus-target">
            Teoría
          </h2>
          <button type="button" className="btn sec" onClick={onClose}>
            <X className="ic" weight="bold" aria-hidden="true" />
            Cerrar
          </button>
        </div>
        {/* Desplazable con teclado: tabIndex 0 lo mete en el orden de Tab (y en la trampa de foco) y las
            flechas lo desplazan; la región con nombre le dice al lector qué es. */}
        <div className="sheet-body" tabIndex={0} role="region" aria-labelledby="sheet-title">
          <section>
            <h3>Qué es cada cosa</h3>
            <ul role="list">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <b>{entry.title}</b>
                  {entry.sections.map((section, index) => (
                    <p key={index}>
                      {section.heading && <span className="mut">{section.heading}: </span>}
                      {section.text}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Cómo se calcula: {theory.title}</h3>
            {theory.equations.map((equation) => (
              <p key={equation} className="eq">
                {equation}
              </p>
            ))}
            <p className="mut">{formulaText}</p>
            <p className="mut">
              T = <span className="num">{formatNumber(results.T, 3)} s</span>, T₀ ={' '}
              <span className="num">{formatNumber(results.T0, 3)} s</span>. Un péndulo real tiene un período{' '}
              <span className="num">{formatNumber(results.periodError, 1)} %</span> mayor que T₀.
            </p>
          </section>
          <section>
            <h3>Cuándo vale el modelo</h3>
            <p>{theory.validity}</p>
          </section>
          <section>
            <h3>De dónde sale la gráfica</h3>
            <p>{theory.chartOrigin}</p>
          </section>
          <section>
            <h3>Cómo se mide el ángulo</h3>
            <p>{theory.signConvention}</p>
          </section>
        </div>
      </section>
    </>
  );
}
