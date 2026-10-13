import { clampInto, containsRect, intersects, rectBottom, rectRight, squareAt, type Rect } from './geometry';

/**
 * Posiciones posibles de una marca de `size` px junto a `target`, en orden de preferencia: a la
 * derecha, a la izquierda, debajo, encima y después las cuatro esquinas. `gap` es el aire entre la
 * marca y la parte que explica. Cada candidata queda centrada en el eje del lado que ocupa.
 */
export function ringCandidates(target: Rect, size: number, gap: number): Rect[] {
  const midX = target.x + target.w / 2;
  const midY = target.y + target.h / 2;
  const right = rectRight(target) + gap + size / 2;
  const left = target.x - gap - size / 2;
  const below = rectBottom(target) + gap + size / 2;
  const above = target.y - gap - size / 2;
  return [
    squareAt(right, midY, size),
    squareAt(left, midY, size),
    squareAt(midX, below, size),
    squareAt(midX, above, size),
    squareAt(right, below, size),
    squareAt(left, below, size),
    squareAt(right, above, size),
    squareAt(left, above, size),
  ];
}

export interface PlacementRules {
  /** La marca debe caber entera aquí. */
  bounds: Rect;
  /** Marcas ya colocadas: no se pisan. */
  taken: Rect[];
  /** Zonas que la marca no debe cubrir (texto, valores, la parte que se mueve del dibujo). */
  blocked: Array<(rect: Rect) => boolean>;
  /**
   * Cuánto estorba una caja (0 = nada). Si ninguna candidata queda libre del todo, gana la que
   * menos estorba en vez de la primera.
   */
  cost?: (rect: Rect) => number;
}

/**
 * Elige la primera candidata que cabe en `bounds`, no pisa a otra marca y no cae en una zona
 * prohibida. Si ninguna cumple todo, prefiere la que no pise otra marca y menos estorbe (`cost`)
 * y, en último caso, la primera, acomodada dentro de `bounds`: una marca siempre se ve y se puede
 * tocar.
 */
export function pickMark(candidates: Rect[], rules: PlacementRules): Rect {
  const { bounds, taken, blocked } = rules;
  const free = (c: Rect) => !taken.some((t) => intersects(t, c));
  const clear = (c: Rect) => !blocked.some((isBlocked) => isBlocked(c));
  const inside = candidates.filter((c) => containsRect(bounds, c));
  const best = inside.find((c) => free(c) && clear(c));
  if (best) return best;
  const noOverlap = inside.filter(free);
  if (noOverlap.length > 0) {
    const cost = rules.cost ?? (() => 0);
    return noOverlap.reduce((bestSoFar, c) => (cost(c) < cost(bestSoFar) ? c : bestSoFar));
  }
  return clampInto(candidates[0], bounds);
}
