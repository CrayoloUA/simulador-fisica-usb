/** Lo único que se necesita de los temporizadores: así se puede probar con relojes falsos. */
export interface Timers {
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}

const realTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface Debouncer<T> {
  /** Programa `onValue(value)`; si llega otro valor antes de `delayMs`, el anterior se descarta. */
  push: (value: T) => void;
  /** Descarta el valor pendiente (p. ej. al desmontar). */
  cancel: () => void;
}

/** Entrega solo el último valor, `delayMs` después de que dejó de cambiar. */
export function createDebouncer<T>(delayMs: number, onValue: (value: T) => void, timers: Timers = realTimers): Debouncer<T> {
  let handle: unknown = null;
  const cancel = () => {
    if (handle !== null) timers.clear(handle);
    handle = null;
  };
  return {
    push: (value) => {
      cancel();
      handle = timers.set(() => {
        handle = null;
        onValue(value);
      }, delayMs);
    },
    cancel,
  };
}
