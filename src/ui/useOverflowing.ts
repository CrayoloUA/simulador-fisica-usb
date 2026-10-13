import { useEffect, useState, type RefObject } from 'react';

/** `true` si el contenido es más ancho que la caja (con 1 px de tolerancia por redondeos). */
export function isOverflowing(scrollWidth: number, clientWidth: number): boolean {
  return scrollWidth - clientWidth > 1;
}

/**
 * Dice si el contenido de una caja se sale por los lados (una ecuación larga en un celular). Se
 * recalcula cuando cambia el tamaño de la caja o de lo que lleva dentro y cuando terminan de cargar
 * las fuentes, que cambian el ancho de las fórmulas.
 */
export function useOverflowing(ref: RefObject<HTMLElement | null>): boolean {
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => setOverflowing(isOverflowing(box.scrollWidth, box.clientWidth));
    measure();
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    if (typeof ResizeObserver === 'undefined') return () => void (cancelled = true);
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    box.querySelectorAll('math').forEach((math) => observer.observe(math));
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [ref]);

  return overflowing;
}
