import { formatNumber } from '../engine/numbers';
import type { LabContent } from './types';

export const simplePendulumContent: LabContent = {
  paramHelp: [
    {
      paramKey: 'L',
      explanation:
        'Qué tan largo es el hilo, desde donde cuelga hasta el centro de la bolita. Un péndulo de reloj de pared mide cerca de 1 m.',
    },
    {
      paramKey: 'phi0',
      explanation: 'Cuánto separas la bolita de la vertical antes de soltarla.',
    },
    {
      paramKey: 'g',
      explanation:
        'Qué tan fuerte atrae el planeta o astro donde está el péndulo. En la Tierra es 9,8 m/s².',
    },
    {
      paramKey: 'm',
      explanation:
        'Qué tan pesada es la bolita. Fíjate en el experimento "¿Depende de la masa?": no cambia cuánto tarda en oscilar.',
    },
  ],
  presets: {
    g: [
      { label: 'Tierra', value: 9.8 },
      { label: 'Luna', value: 1.62 },
      { label: 'Marte', value: 3.71 },
      { label: 'Júpiter', value: 24.79 },
    ],
  },
  resultHelp: [
    {
      resultKey: 'T',
      label: 'Período T',
      unit: 's',
      decimals: 3,
      explanation: 'El tiempo que tarda el péndulo en completar una oscilación completa (ida y vuelta).',
    },
    {
      resultKey: 'f',
      label: 'Frecuencia f',
      unit: 'Hz',
      decimals: 3,
      explanation: 'Cuántas oscilaciones completas hace en un segundo. Es 1 dividido entre el período.',
    },
    {
      resultKey: 'omega0',
      label: 'Frecuencia angular ω₀',
      unit: 'rad/s',
      decimals: 3,
      explanation:
        'Qué tan rápido gira la fase del movimiento, en radianes por segundo. Se relaciona con la frecuencia por ω₀ = 2π·f.',
    },
  ],
  formula: {
    template: 'T = 2π√(L/g)',
    describe: (params, results) =>
      `T = 2π√(L/g) = 2π√(${formatNumber(params.L)}/${formatNumber(params.g)}) = ${formatNumber(results.T, 3)} s`,
  },
  experiments: [
    {
      id: 'conoce-el-pendulo',
      title: 'Conoce el péndulo',
      predict: {
        question: 'Antes de empezar: ¿qué crees que hace un péndulo cuando lo sueltas desde un ángulo?',
        options: [
          { id: 'a', label: 'Oscila de un lado a otro y vuelve a pasar por el mismo punto' },
          { id: 'b', label: 'Se mueve en círculos sin parar' },
          { id: 'c', label: 'Se queda quieto en el punto donde lo soltaste' },
        ],
        correctOptionId: 'a',
      },
      steps: [
        {
          instruction:
            "Presiona 'Preparar valores' para dejar el péndulo en su configuración inicial (L = 1 m, φ₀ = 10°).",
          prepareParams: { L: 1, phi0: 10, g: 9.8, m: 0.5 },
          highlightParamKey: 'L',
        },
        {
          instruction: "Presiona Play y observa el péndulo oscilar. Fíjate en el Período T en 'Lo que obtienes'.",
          highlightResultKey: 'T',
        },
      ],
      check: [
        {
          question: '¿Qué es el Período T que ves en los resultados?',
          options: [
            { id: 'a', label: 'El tiempo de una oscilación completa' },
            { id: 'b', label: 'La altura máxima que alcanza la bolita' },
            { id: 'c', label: 'La masa de la bolita' },
          ],
          correctOptionId: 'a',
          feedback: {
            a: 'Correcto: T es el tiempo que tarda el péndulo en ir y volver una vez.',
            b: 'No: la altura no es lo que mide T. T es el tiempo de una oscilación completa.',
            c: 'No: la masa es un parámetro que tú eliges (m), no un resultado. T es el tiempo de una oscilación completa.',
          },
        },
      ],
      conclusion:
        'El péndulo oscila de un lado a otro pasando por el mismo punto, tal como predijiste. El Período T es el tiempo de una oscilación completa: con L = 1 m y g = 9,8 m/s², T ≈ 2,007 s.',
    },
    {
      id: 'depende-de-la-masa',
      title: '¿Depende de la masa?',
      predict: {
        question: '¿Crees que un péndulo con una bolita más pesada oscila más rápido, más lento o igual?',
        options: [
          { id: 'mas-rapido', label: 'Más rápido (T menor)' },
          { id: 'mas-lento', label: 'Más lento (T mayor)' },
          { id: 'igual', label: 'Igual (T no cambia)' },
        ],
        correctOptionId: 'igual',
      },
      steps: [
        {
          instruction:
            "Presiona 'Preparar valores': L = 1 m, φ₀ = 10°, m = 0,5 kg. Presiona Play y anota el Período T.",
          prepareParams: { L: 1, phi0: 10, g: 9.8, m: 0.5 },
          highlightResultKey: 'T',
        },
        {
          instruction: 'Sin cambiar nada más, cambia la Masa m a 5 kg.',
          highlightParamKey: 'm',
        },
        {
          instruction: 'Mira de nuevo el Período T. ¿Cambió?',
          highlightResultKey: 'T',
        },
      ],
      check: [
        {
          question: '¿Qué le pasó al Período T al aumentar la masa de 0,5 kg a 5 kg?',
          options: [
            { id: 'aumento', label: 'Aumentó' },
            { id: 'disminuyo', label: 'Disminuyó' },
            { id: 'igual', label: 'No cambió' },
          ],
          correctOptionId: 'igual',
          feedback: {
            aumento: 'Revisa de nuevo: T = 2π√(L/g) no incluye la masa, así que no debería haber aumentado.',
            disminuyo: 'Revisa de nuevo: T = 2π√(L/g) no incluye la masa, así que no debería haber disminuido.',
            igual:
              'Correcto: la fórmula T = 2π√(L/g) no incluye la masa. Galileo lo notó observando lámparas de una catedral que oscilaban con distinto peso.',
          },
        },
      ],
      conclusion: 'El Período no depende de la masa: T = 2π√(L/g) solo depende de la longitud L y de la gravedad g.',
    },
    {
      id: 'depende-de-la-longitud',
      title: '¿Depende de la longitud?',
      predict: {
        question: 'Si el hilo es 4 veces más largo, ¿qué crees que pasa con el Período?',
        options: [
          { id: 'igual', label: 'No cambia' },
          { id: 'dobla', label: 'Se duplica' },
          { id: 'cuadruplica', label: 'Se cuadruplica' },
        ],
        correctOptionId: 'dobla',
      },
      steps: [
        {
          instruction: "Presiona 'Preparar valores': L = 1 m, φ₀ = 10°. Anota el Período T.",
          prepareParams: { L: 1, phi0: 10, g: 9.8, m: 0.5 },
          highlightResultKey: 'T',
        },
        {
          instruction: 'Cambia la Longitud L a 4 m (cuatro veces más larga).',
          highlightParamKey: 'L',
        },
        {
          instruction: 'Compara el nuevo Período T con el que anotaste.',
          highlightResultKey: 'T',
        },
      ],
      check: [
        {
          question: 'Con L cuatro veces mayor (de 1 m a 4 m), ¿qué le pasó a T?',
          options: [
            { id: 'igual', label: 'No cambió' },
            { id: 'doble', label: 'Se hizo el doble' },
            { id: 'cuadruple', label: 'Se hizo cuatro veces mayor' },
          ],
          correctOptionId: 'doble',
          feedback: {
            igual: 'Revisa de nuevo: T = 2π√(L/g) sí depende de L, a través de una raíz cuadrada.',
            doble:
              'Correcto: como T depende de la raíz cuadrada de L, multiplicar L por 4 multiplica T por √4 = 2.',
            cuadruple:
              'Casi: T depende de la RAÍZ CUADRADA de L, no de L directamente. Por eso L×4 da T×2, no T×4.',
          },
        },
      ],
      conclusion:
        'El Período sí depende de la longitud, pero no en proporción directa: como T = 2π√(L/g), multiplicar L por 4 multiplica T por √4 = 2.',
    },
    {
      id: 'depende-de-la-gravedad',
      title: '¿Depende de la gravedad?',
      predict: {
        question:
          'En la Luna, la gravedad es mucho menor que en la Tierra. ¿El péndulo oscilará más rápido o más lento que en la Tierra?',
        options: [
          { id: 'rapido', label: 'Más rápido (T menor)' },
          { id: 'lento', label: 'Más lento (T mayor)' },
          { id: 'igual', label: 'Igual' },
        ],
        correctOptionId: 'lento',
      },
      steps: [
        {
          instruction: "Presiona 'Preparar valores' para la Tierra (g = 9,8 m/s²) y anota el Período T.",
          prepareParams: { L: 1, phi0: 10, g: 9.8, m: 0.5 },
          highlightResultKey: 'T',
        },
        {
          instruction: "Presiona el botón 'Luna' junto a la Gravedad para cambiar g a 1,62 m/s².",
          highlightParamKey: 'g',
        },
        {
          instruction: 'Compara el nuevo Período T con el de la Tierra.',
          highlightResultKey: 'T',
        },
      ],
      check: [
        {
          question: 'En la Luna (g menor), ¿qué le pasó al Período T comparado con la Tierra?',
          options: [
            { id: 'menor', label: 'Es menor' },
            { id: 'mayor', label: 'Es mayor' },
            { id: 'igual', label: 'Es igual' },
          ],
          correctOptionId: 'mayor',
          feedback: {
            menor:
              'Revisa de nuevo: con menos gravedad, la fuerza que regresa el péndulo al centro es más débil, así que tarda MÁS, no menos.',
            mayor:
              'Correcto: T = 2π√(L/g) tiene la gravedad en el denominador dentro de la raíz, así que con menos g, T es mayor.',
            igual: 'Revisa de nuevo: T sí depende de g. Compara los dos valores de T que anotaste.',
          },
        },
      ],
      conclusion:
        'El Período sí depende de la gravedad: a menor g, mayor T. En la Luna (g = 1,62 m/s²) el mismo péndulo tarda cerca de 4,937 s, frente a 2,007 s en la Tierra.',
    },
    {
      id: 'depende-del-angulo',
      title: '¿Y del ángulo?',
      predict: {
        question: '¿Crees que soltar el péndulo desde un ángulo más grande cambia el Período?',
        options: [
          { id: 'si', label: 'Sí, cambia bastante' },
          { id: 'no', label: 'No, no cambia' },
          { id: 'poco', label: 'Cambia solo un poco, y solo con ángulos grandes' },
        ],
        correctOptionId: 'poco',
      },
      steps: [
        {
          instruction: "Presiona 'Preparar valores': φ₀ = 10°. Anota el Período T.",
          prepareParams: { L: 1, phi0: 10, g: 9.8, m: 0.5 },
          highlightResultKey: 'T',
        },
        {
          instruction: 'Cambia el Ángulo inicial φ₀ a 30°.',
          highlightParamKey: 'phi0',
        },
        {
          instruction: 'Mira el Período T y el aviso que aparece sobre el modelo.',
          highlightResultKey: 'T',
        },
      ],
      check: [
        {
          question: 'En esta simulación, ¿cambió el Período T al pasar de φ₀ = 10° a φ₀ = 30°?',
          options: [
            { id: 'si', label: 'Sí, cambió' },
            { id: 'no', label: 'No, el número no cambió' },
          ],
          correctOptionId: 'no',
          feedback: {
            si: 'Revisa de nuevo el número de T: en esta simulación no cambia con el ángulo, porque usa el modelo simplificado de ángulo pequeño.',
            no: 'Correcto: en este modelo T no depende del ángulo. Pero el aviso te dice que un péndulo REAL con φ₀ = 30° tardaría cerca de un 1,7 % más — por eso el modelo deja de ser exacto por encima de 15°.',
          },
        },
      ],
      conclusion:
        'En el modelo de ángulo pequeño que usa esta simulación, el Período no cambia con φ₀. El aviso que aparece con φ₀ > 15° te recuerda que un péndulo real sí cambiaría un poco (cerca de 1,7 % a 30°), porque ya no se cumple la aproximación.',
    },
  ],
};
