import { formatNumber } from '../engine/numbers';
import { elementHelp, resultExtras } from './elementHelp';
import { theoryEquations } from './equations';
import type { LabContent } from './types';

const SIGN_CONVENTION =
  'El eje de referencia es la vertical que pasa por el punto de apoyo (θ = 0, el péndulo en reposo). ' +
  'El ángulo se mide como positivo hacia la derecha de esa vertical y negativo hacia la izquierda; ' +
  'por eso θ(t) toma valores positivos y negativos del mismo tamaño mientras oscila.';

export const simplePendulumContent: LabContent = {
  // Los experimentos usan φ₀ hasta 60° y cifras del modelo real: no caben en el lineal (máx. 15°).
  experimentModel: 'no-lineal',
  theoryByModel: {
    lineal: {
      title: 'Ángulo pequeño (modelo lineal)',
      equations: theoryEquations.lineal,
      validity:
        'Parte de la aproximación sen θ ≈ θ, que solo vale para ángulos muy pequeños: por debajo de 10°, ' +
        'idealmente tendiendo a 0. Con ángulos mayores el período real es más largo que T₀ y el modelo se equivoca.',
      chartOrigin:
        'La curva azul (Simulación) sale de una integración numérica: el programa resuelve paso a paso, con el ' +
        'método RK4, la ecuación diferencial del modelo y dibuja cada valor que calcula; no es una fórmula ' +
        'escrita a mano ni una captura del dibujo del péndulo. La curva punteada (Ángulo pequeño) sí es una ' +
        'fórmula: la solución analítica de la ecuación linealizada. En este modelo las dos resuelven la misma ' +
        'ecuación, por eso coinciden.',
      signConvention: SIGN_CONVENTION,
    },
    'no-lineal': {
      title: 'Real (modelo no lineal)',
      equations: theoryEquations.noLineal,
      validity:
        'No supone sen θ ≈ θ, así que sirve también para ángulos grandes (hasta 60°). El período deja de ser ' +
        '2π√(L/g): crece con φ₀. Por debajo de 10° coincide con el modelo lineal; por encima, la diferencia ' +
        'con T₀ ya se nota.',
      chartOrigin:
        'La curva azul (Simulación) sale de una integración numérica: el programa resuelve paso a paso, con el ' +
        'método RK4, la ecuación con sen θ y dibuja cada valor que calcula; no es una fórmula escrita a mano ' +
        'ni una captura del dibujo. La curva punteada (Ángulo pequeño) es la solución analítica de la ecuación ' +
        'linealizada. Las dos curvas se separan desde el primer ciclo porque resuelven ecuaciones distintas: ' +
        'la azul usa sen θ y la punteada usa θ. Como el período real es mayor que T₀, la diferencia se ' +
        'acumula y crece con φ₀.',
      signConvention: SIGN_CONVENTION,
    },
  },
  paramHelp: [
    {
      paramKey: 'L',
      origin:
        'Qué tan largo es el hilo, desde donde cuelga hasta el centro de la bolita. El péndulo de un reloj de pie mide cerca de 1 m. En un montaje real se mide con una cinta métrica.',
      role: 'Fija el período: T₀ = 2π√(L/g). Un hilo más largo hace oscilaciones más lentas.',
      effect:
        'Si la cambias, el período varía con la raíz cuadrada de L: con una longitud cuatro veces mayor, T se duplica. No se puede omitir: sin longitud no hay péndulo.',
    },
    {
      paramKey: 'phi0',
      origin: 'La eliges tú: cuánto separas la bolita de la vertical antes de soltarla.',
      role:
        'Es la amplitud inicial. En el modelo lineal (hasta 15°) el período no depende de ella; en el modelo no lineal (hasta 60°) sí: a mayor ángulo, mayor período.',
      effect:
        'En el modelo no lineal, si la aumentas el período crece y la curva punteada se separa de la azul; en el lineal solo cambia la altura de las ondas. Si fuera 0°, el péndulo quedaría quieto. ' +
        '¿Y por qué no más de 60°? La cuenta seguiría valiendo (a 90° el período es 18 % más largo), pero con un hilo de verdad, pasando de 90° la bolita cae en vez de balancearse porque el hilo no puede empujar; el límite de 60° es una decisión del simulador para que el hilo siempre quede tenso.',
    },
    {
      paramKey: 'g',
      origin:
        'Depende del planeta o astro donde está el péndulo. En la Tierra es 9,8 m/s²; puedes probar con los valores predefinidos.',
      role: 'Es la fuerza, por unidad de masa, que devuelve el péndulo hacia la vertical: aparece en ω₀ = √(g/L).',
      effect:
        'Con menos gravedad el péndulo es más lento: en la Luna (1,62 m/s²) el período es cerca de 2,5 veces el de la Tierra. Sin gravedad no habría fuerza que lo devuelva y no oscilaría.',
    },
    {
      paramKey: 'm',
      origin: 'Se mide con una balanza (en kg): es la masa de la bolita.',
      role: "Solo entra en la energía del péndulo. En la ecuación del movimiento la masa se cancela: m·g·sen θ = m·L·θ''.",
      effect:
        'Si la cambias, θ(t), el período y la frecuencia no cambian: una bolita liviana y una pesada oscilan igual porque la masa se cancela. Lo único que cambia es la energía, que es proporcional a m. Fíjate en el experimento "¿Depende de la masa?".',
      note: 'La masa se cancela: θ(t) y T no cambian.',
    },
    {
      paramKey: 'b',
      origin:
        'La eliges tú: representa el frenado del aire. Es la fricción por unidad de masa (b = c/m), en 1/s; en un péndulo real se estimaría viendo cuánto baja la amplitud en cada oscilación.',
      role:
        'Agrega el término −b·θ\' a la ecuación y frena el movimiento: la amplitud decae como e^(−bt/2) y el período amortiguado es 2π/√(ω₀² − b²/4), un poco mayor que T₀.',
      effect:
        'Con b = 0 el péndulo oscila sin perder amplitud, como si no hubiera aire. Con más b la amplitud baja más rápido; el máximo es 0,4 1/s, porque con valores mayores el péndulo dejaría de oscilar.',
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
      explanation:
        'El período real para el ángulo que elegiste: el tiempo que tarda el péndulo en completar una oscilación completa (ida y vuelta). Con ángulos grandes es algo mayor que T₀. Es el período sin fricción: con fricción (b > 0) cada oscilación tarda un poco más.',
    },
    {
      resultKey: 'T0',
      label: 'Período T₀ (ángulo pequeño)',
      unit: 's',
      decimals: 3,
      explanation:
        'El valor de la fórmula 2π√(L/g), que solo es válido para ángulos pequeños. Es lo que predice la curva punteada; con ángulos grandes el período real T es mayor.',
    },
    {
      resultKey: 'f',
      label: 'Frecuencia f',
      unit: 'Hz',
      decimals: 3,
      explanation:
        'Cuántas oscilaciones completas hace en un segundo, con el período real sin fricción. Es 1 dividido entre T.',
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
  resultExtras,
  elementHelp,
  formula: {
    template: 'T₀ = 2π√(L/g)',
    describe: (params, results) =>
      `T₀ = 2π√(L/g) = 2π√(${formatNumber(params.L)}/${formatNumber(params.g)}) = ${formatNumber(results.T0, 3)} s. ` +
      `Con φ₀ = ${formatNumber(params.phi0)}°, el período real es T = ${formatNumber(results.T, 3)} s.`,
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
          prepareParams: { L: 1, phi0: 10, g: 9.8, m: 0.5, b: 0 },
          highlightParamKey: 'L',
        },
        {
          instruction: "Presiona Play y observa el péndulo oscilar. Fíjate en el Período T, el número grande de los resultados.",
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
        'El péndulo oscila de un lado a otro pasando por el mismo punto. El Período T es el tiempo de una oscilación completa: con L = 1 m, φ₀ = 10° y g = 9,8 m/s², T ≈ 2,011 s.',
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
          prepareParams: { L: 1, phi0: 10, g: 9.8, m: 0.5, b: 0 },
          highlightResultKey: 'T',
        },
        {
          instruction: 'Sin cambiar nada más, cambia la Masa (m) a 5 kg.',
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
            aumento: 'Revisa de nuevo: el período no depende de la masa (solo de L, g y el ángulo), así que no debería haber aumentado.',
            disminuyo: 'Mira otra vez: el período no depende de la masa (solo de L, g y el ángulo), así que no debería haber disminuido.',
            igual: 'Correcto: el período no depende de la masa; solo depende de L, de g y del ángulo inicial.',
          },
        },
      ],
      conclusion:
        'El Período no depende de la masa: solo depende de la longitud L, de la gravedad g y del ángulo inicial φ₀ (con φ₀ fijo, T = 2π√(L/g) multiplicado por un factor que solo depende del ángulo).',
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
          prepareParams: { L: 1, phi0: 10, g: 9.8, m: 0.5, b: 0 },
          highlightResultKey: 'T',
        },
        {
          instruction: 'Cambia el Largo del hilo (L) a 4 m (cuatro veces más largo).',
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
            igual: 'Revisa de nuevo: T sí depende de L, a través de una raíz cuadrada (T₀ = 2π√(L/g)).',
            doble:
              'Correcto: como T depende de la raíz cuadrada de L, multiplicar L por 4 multiplica T por √4 = 2 (de 2,011 s a 4,022 s con φ₀ = 10°).',
            cuadruple:
              'Casi: T depende de la RAÍZ CUADRADA de L, no de L directamente. Por eso L×4 da T×2, no T×4.',
          },
        },
      ],
      conclusion:
        'El Período sí depende de la longitud, pero no en proporción directa: como T es proporcional a √L (con el mismo ángulo), multiplicar L por 4 multiplica T por √4 = 2.',
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
          prepareParams: { L: 1, phi0: 10, g: 9.8, m: 0.5, b: 0 },
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
              'Correcto: T es proporcional a 1/√g (la gravedad está en el denominador, dentro de la raíz), así que con menos g, T es mayor.',
            igual: 'Fíjate: T sí depende de g. Compara los dos valores de T que anotaste.',
          },
        },
      ],
      conclusion:
        'El Período sí depende de la gravedad: a menor g, mayor T. En la Luna (g = 1,62 m/s²) el mismo péndulo tarda cerca de 4,946 s, frente a 2,011 s en la Tierra (con L = 1 m y φ₀ = 10°).',
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
          instruction: "Presiona 'Preparar valores': φ₀ = 10°, L = 1 m, g = 9,8 m/s². Anota el Período T.",
          prepareParams: { L: 1, phi0: 10, g: 9.8, m: 0.5, b: 0 },
          highlightResultKey: 'T',
        },
        {
          instruction: 'Cambia el Ángulo de salida (φ₀) a 60°, sin tocar L ni g.',
          highlightParamKey: 'phi0',
        },
        {
          instruction:
            'Compara el nuevo Período T con el que anotaste. Luego mira la gráfica: la curva punteada (Ángulo pequeño) se va separando de la curva azul (Simulación). Lee también el aviso sobre el modelo.',
          highlightResultKey: 'T',
        },
      ],
      check: [
        {
          question: 'Al pasar de φ₀ = 10° a φ₀ = 60° (con L y g iguales), ¿qué le pasó al Período T?',
          options: [
            { id: 'igual', label: 'No cambió' },
            { id: 'poco', label: 'Aumentó un poco (menos de un 10 %)' },
            { id: 'mucho', label: 'Aumentó mucho (se duplicó o más)' },
          ],
          correctOptionId: 'poco',
          feedback: {
            igual:
              'Revisa de nuevo el número de T: pasó de 2,011 s a 2,154 s. Con ángulos grandes el período real sí aumenta, y por eso la curva punteada se separa de la simulación.',
            poco: 'Correcto: T aumentó cerca de un 7 % (de 2,011 s a 2,154 s). Es un cambio pequeño, pero suficiente para que la curva punteada de ángulo pequeño se separe de la simulada.',
            mucho:
              'No tanto: T pasó de 2,011 s a 2,154 s, cerca de un 7 % más. Cambia, pero solo un poco, incluso con 60°.',
          },
        },
      ],
      conclusion:
        'El Período cambia solo un poco con el ángulo: con L = 1 m y g = 9,8 m/s², T pasa de 2,011 s (10°) a 2,154 s (60°), cerca de un 7 % más. Por eso la fórmula T₀ = 2π√(L/g) y la curva punteada solo valen para ángulos pequeños: con φ₀ = 60° el período real es 7,3 % mayor que T₀.',
    },
  ],
};
