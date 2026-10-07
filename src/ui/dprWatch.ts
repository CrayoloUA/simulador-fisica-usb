/** Lo único que se necesita de `window`: así se puede probar sin navegador. */
export interface DprWindow {
  devicePixelRatio: number;
  matchMedia: (query: string) => {
    addEventListener: (type: 'change', listener: () => void) => void;
    removeEventListener: (type: 'change', listener: () => void) => void;
  };
}

/**
 * Avisa cuando cambia `devicePixelRatio` sin que cambie el tamaño CSS (zoom del navegador, mover la
 * ventana a otra pantalla): ni ResizeObserver ni `resize` lo notan siempre. La consulta
 * `(resolution: Ndppx)` deja de cumplirse justo cuando cambia la densidad; entonces se avisa y se
 * vuelve a armar con la densidad nueva. Devuelve la función que lo desactiva.
 */
export function watchDevicePixelRatio(win: DprWindow, onChange: () => void): () => void {
  let stop = () => {};
  let disposed = false;
  const arm = () => {
    const list = win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`);
    const listener = () => {
      stop();
      if (disposed) return;
      onChange();
      arm();
    };
    list.addEventListener('change', listener);
    stop = () => list.removeEventListener('change', listener);
  };
  arm();
  return () => {
    disposed = true;
    stop();
  };
}
