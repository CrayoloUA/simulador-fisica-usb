import { useEffect, useState } from 'react';
import { createDebouncer } from './debounce';

/** El valor, pero solo cuando lleva `delayMs` sin cambiar. Arranca con el valor inicial. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const debouncer = createDebouncer(delayMs, setDebounced);
    debouncer.push(value);
    return debouncer.cancel;
  }, [value, delayMs]);
  return debounced;
}
