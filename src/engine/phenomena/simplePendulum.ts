import { DEG_TO_RAD, formatNumber } from '../numbers';
import type { Params, Phenomenon } from '../types';

const SMALL_ANGLE_LIMIT_DEG = 15;

const angularFrequency = (p: Params) => Math.sqrt(p.g / p.L);

export const simplePendulum: Phenomenon = {
  id: 'mas-pendulo-simple',
  name: 'Movimiento Armónico Simple (péndulo simple)',
  paramSchema: [
    { key: 'L', label: 'Longitud', symbol: 'L', unit: 'm', min: 0.1, max: 5, step: 0.1, defaultValue: 1 },
    { key: 'phi0', label: 'Ángulo inicial', symbol: 'φ₀', unit: '°', min: 1, max: 60, step: 1, defaultValue: 10 },
    { key: 'g', label: 'Gravedad', symbol: 'g', unit: 'm/s²', min: 1, max: 25, step: 0.1, defaultValue: 9.8 },
    { key: 'm', label: 'Masa', symbol: 'm', unit: 'kg', min: 0.05, max: 5, step: 0.05, defaultValue: 0.5 },
  ],
  modelLimits: [
    {
      id: 'angulo-pequeno',
      evaluate(p) {
        if (p.phi0 <= SMALL_ANGLE_LIMIT_DEG) return { valid: true, message: '' };
        const rad = p.phi0 * DEG_TO_RAD;
        const deviation = ((rad * rad) / 16) * 100;
        return {
          valid: false,
          message:
            `Con φ₀ = ${formatNumber(p.phi0)}° la aproximación de ángulo pequeño deja de ser válida: ` +
            `el período de un péndulo real difiere cerca de ${formatNumber(deviation, 1)} % del calculado.`,
        };
      },
    },
  ],
  initialState: (p) => ({ theta: p.phi0 * DEG_TO_RAD, omega: 0 }),
  derivatives: (s, p) => ({ theta: s.omega, omega: -(p.g / p.L) * s.theta }),
  outputs: (s, p) => {
    const omega0 = angularFrequency(p);
    const T = (2 * Math.PI) / omega0;
    return {
      theta: s.theta,
      omega: s.omega,
      omega0,
      T,
      f: 1 / T,
      energy: 0.5 * p.m * p.L * p.L * s.omega * s.omega + 0.5 * p.m * p.g * p.L * s.theta * s.theta,
    };
  },
  theory: (p, t) => {
    const omega0 = angularFrequency(p);
    const amplitude = p.phi0 * DEG_TO_RAD;
    return {
      theta: amplitude * Math.cos(omega0 * t),
      omega: -amplitude * omega0 * Math.sin(omega0 * t),
    };
  },
};
