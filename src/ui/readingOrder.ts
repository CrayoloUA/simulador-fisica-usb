/*
 * Orden de lectura (y de Tab) de la columna de controles. Tiene que coincidir con el orden en que
 * se ve cada parte en pantalla, que depende del ancho y del modo (ver las reglas `order` de
 * styles.css): por eso App coloca sus partes en el DOM con esta lista y no con un orden fijo.
 */

export type AsidePart = 'alert' | 'results' | 'params' | 'status' | 'more';

/**
 * - Celular: el error, los resultados, los controles, el aviso del modelo y "Más opciones".
 * - Escritorio en Explorar: los controles van antes que los resultados.
 * - Escritorio en Experimentos: resultados y aviso antes de los controles (para que el dato que el
 *   paso pide mirar quede cerca de Play).
 */
export function asideReadingOrder(view: { narrow: boolean; experiments: boolean }): AsidePart[] {
  if (view.narrow) return ['alert', 'results', 'params', 'status', 'more'];
  if (view.experiments) return ['alert', 'results', 'status', 'params', 'more'];
  return ['alert', 'params', 'results', 'status', 'more'];
}
