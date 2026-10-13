import { useEffect, useState, type RefObject } from 'react';
import { finishClosing, longestTransitionMs, nextPresence, type Presence } from './presence';

/**
 * Mantiene un elemento puesto mientras dura su salida. `open` es lo que pide el padre; devuelve la
 * fase (`closed` no se dibuja, `closing` se dibuja con `data-state="closing"` y su transición de
 * salida). El tiempo de espera se lee de la transición calculada del elemento (`ref`), así sale del
 * CSS y no del código; con una duración de 0 se quita de inmediato. Si se reabre a mitad de la
 * salida, la fase vuelve a `open` sin recrear el elemento y la transición retoma desde donde iba.
 */
export function usePresence(open: boolean, ref: RefObject<HTMLElement | null>): Presence {
  const [phase, setPhase] = useState<Presence>(open ? 'open' : 'closed');

  // La fase se deriva de `open` durante el render (patrón de React para estado derivado): así el
  // elemento nunca se pinta un cuadro con una fase equivocada.
  const wanted = nextPresence(phase, open);
  if (wanted !== phase) setPhase(wanted);

  useEffect(() => {
    if (phase !== 'closing') return;
    const element = ref.current;
    const style = element ? getComputedStyle(element) : null;
    const wait = style ? longestTransitionMs(style.transitionDuration, style.transitionDelay) : 0;
    const timer = window.setTimeout(() => setPhase(finishClosing), wait);
    return () => window.clearTimeout(timer);
  }, [phase, ref]);

  return wanted;
}
