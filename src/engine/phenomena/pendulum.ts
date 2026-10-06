import { pendulumPeriodFactor } from '../elliptic';
import { DEG_TO_RAD, formatNumber } from '../numbers';
import type { ParamSpec, Params, Phenomenon } from '../types';
import { dampedLinearTheory } from './dampedLinear';

export type PendulumModel = 'lineal' | 'no-lineal';

/** Por encima de este ángulo, sen θ ≈ θ deja de ser una buena aproximación (aviso del modelo). */
const SMALL_ANGLE_LIMIT_DEG = 10;

const MAX_PHI0_DEG: Record<PendulumModel, number> = { lineal: 15, 'no-lineal': 60 };

const angularFrequency = (p: Params) => Math.sqrt(p.g / p.L);

function paramSchema(model: PendulumModel): ParamSpec[] {
  return [
    { key: 'L', label: 'Longitud', symbol: 'L', unit: 'm', min: 0.1, max: 5, step: 0.1, defaultValue: 1 },
    { key: 'phi0', label: 'Ángulo inicial', symbol: 'φ₀', unit: '°', min: 1, max: MAX_PHI0_DEG[model], step: 1, defaultValue: 10 },
    { key: 'g', label: 'Gravedad', symbol: 'g', unit: 'm/s²', min: 1, max: 25, step: 0.1, defaultValue: 9.8 },
    { key: 'm', label: 'Masa', symbol: 'm', unit: 'kg', min: 0.05, max: 5, step: 0.05, defaultValue: 0.5 },
    // b = c/m (fricción por unidad de masa): así la masa se sigue cancelando de la ecuación.
    // El máximo 0,4 garantiza b < 2ω₀ en todo el esquema (ver docs/03-arquitectura.md, M3).
    { key: 'b', label: 'Fricción del aire', symbol: 'b', unit: '1/s', min: 0, max: 0.4, step: 0.01, defaultValue: 0 },
  ];
}

/** Aumento porcentual del período real respecto de T₀, con la ecuación no lineal (en ambos modos). */
const periodErrorPercent = (phi0Deg: number) => (pendulumPeriodFactor(phi0Deg * DEG_TO_RAD) - 1) * 100;

export function createPendulum(model: PendulumModel): Phenomenon {
  const linear = model === 'lineal';
  return {
    id: linear ? 'mas-pendulo-lineal' : 'mas-pendulo-no-lineal',
    name: linear ? 'Péndulo simple (aproximación lineal)' : 'Péndulo simple',
    paramSchema: paramSchema(model),
    modelLimits: [
      {
        id: 'angulo-pequeno',
        evaluate(p) {
          if (p.phi0 <= SMALL_ANGLE_LIMIT_DEG) return { valid: true, message: '' };
          const increase = formatNumber(periodErrorPercent(p.phi0), 1);
          return {
            valid: false,
            message: linear
              ? `Con φ₀ = ${formatNumber(p.phi0)}° el modelo lineal ya no es una buena aproximación: ` +
                `un péndulo real tendría un período ${increase} % mayor que T₀.`
              : `Con φ₀ = ${formatNumber(p.phi0)}° la aproximación de ángulo pequeño (T₀ y la curva punteada) deja de ser válida: ` +
                `el período real es ${increase} % mayor que T₀.`,
          };
        },
      },
    ],
    initialState: (p) => ({ theta: p.phi0 * DEG_TO_RAD, omega: 0 }),
    derivatives: (s, p) => ({
      theta: s.omega,
      omega: -(p.g / p.L) * (linear ? s.theta : Math.sin(s.theta)) - p.b * s.omega,
    }),
    outputs: (s, p) => {
      const omega0 = angularFrequency(p);
      const T0 = (2 * Math.PI) / omega0;
      const T = linear ? T0 : T0 * pendulumPeriodFactor(p.phi0 * DEG_TO_RAD);
      const potential = linear ? 0.5 * p.m * p.g * p.L * s.theta * s.theta : p.m * p.g * p.L * (1 - Math.cos(s.theta));
      return {
        theta: s.theta,
        omega: s.omega,
        omega0,
        T0,
        T,
        f: 1 / T,
        periodError: periodErrorPercent(p.phi0),
        energy: 0.5 * p.m * p.L * p.L * s.omega * s.omega + potential,
        // tau solo con fricción: con b = 0 sería Infinity y la guarda de la simulación la detendría.
        ...(p.b > 0 ? { tau: 2 / p.b } : {}),
      };
    },
    // Curva punteada: solución analítica de la ecuación linealizada (con la misma fricción).
    theory: (p, t) => dampedLinearTheory({ g: p.g, L: p.L, phi0Rad: p.phi0 * DEG_TO_RAD, b: p.b }, t),
  };
}

/** Instancias únicas de módulo: la identidad estable evita reiniciar la simulación en cada render. */
export const pendulumModels: Record<PendulumModel, Phenomenon> = {
  lineal: createPendulum('lineal'),
  'no-lineal': createPendulum('no-lineal'),
};
