import { pendulumModels } from './pendulum';

/**
 * Péndulo simple "real" (ecuación con sen θ). Se conserva como alias del modo no lineal para no
 * romper a quienes ya lo importan; los dos modos viven en `pendulum.ts`.
 */
export const simplePendulum = pendulumModels['no-lineal'];
