/** Rectángulo en px CSS, con el origen en la esquina superior izquierda de la caja del canvas. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const rectRight = (r: Rect) => r.x + r.w;
export const rectBottom = (r: Rect) => r.y + r.h;

/** Si dos rectángulos se pisan (compartir solo un borde no cuenta). */
export function intersects(a: Rect, b: Rect): boolean {
  return a.x < rectRight(b) && b.x < rectRight(a) && a.y < rectBottom(b) && b.y < rectBottom(a);
}

/** Si `inner` cabe entera dentro de `outer`. */
export function containsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x - 1e-9 &&
    inner.y >= outer.y - 1e-9 &&
    rectRight(inner) <= rectRight(outer) + 1e-9 &&
    rectBottom(inner) <= rectBottom(outer) + 1e-9
  );
}

/** Mueve `rect` lo mínimo para que entre en `bounds` (si es más grande que `bounds`, se alinea arriba a la izquierda). */
export function clampInto(rect: Rect, bounds: Rect): Rect {
  const x = Math.min(Math.max(rect.x, bounds.x), Math.max(bounds.x, rectRight(bounds) - rect.w));
  const y = Math.min(Math.max(rect.y, bounds.y), Math.max(bounds.y, rectBottom(bounds) - rect.h));
  return { x, y, w: rect.w, h: rect.h };
}

/** Rectángulo de `size` × `size` con su centro en (cx, cy). */
export function squareAt(cx: number, cy: number, size: number): Rect {
  return { x: cx - size / 2, y: cy - size / 2, w: size, h: size };
}
