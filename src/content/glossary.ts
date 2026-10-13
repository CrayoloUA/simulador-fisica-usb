/*
 * Glosario de palabras que un estudiante de 10° u 11° puede no conocer. Cada tarjeta de explicación
 * muestra, debajo de su texto, las palabras del glosario que aparecen en él, y la hoja de Teoría
 * lista todo el glosario. Son BORRADOR para que los revise el profesor de física.
 *
 * Las definiciones usan palabras de todos los días y, si citan una cifra, esa cifra se comprueba
 * en glossary.test.ts.
 */

export interface GlossaryTerm {
  id: string;
  /** Cómo se muestra la palabra (con su explicación corta entre paréntesis si ayuda). */
  term: string;
  /** Qué significa, en una o dos oraciones y sin jerga. */
  definition: string;
  /** Formas en que aparece en los textos (sin importar mayúsculas); se busca la palabra entera. */
  words: string[];
}

export const glossary: GlossaryTerm[] = [
  {
    id: 'ida-y-vuelta',
    term: 'Ida y vuelta (oscilación)',
    definition:
      'Cuando el péndulo va hasta un lado, llega al otro y regresa al punto de donde salió. También se le dice oscilación o vaivén.',
    words: ['ida y vuelta', 'idas y vueltas', 'oscilación', 'oscilaciones', 'oscila', 'vaivén', 'vaivenes'],
  },
  {
    id: 'periodo',
    term: 'Período',
    definition: 'Lo que tarda una ida y vuelta completa, en segundos. Si el período es 2 s, el péndulo hace una ida y vuelta cada 2 segundos.',
    words: ['período', 'períodos', 'periodo'],
  },
  {
    id: 'frecuencia',
    term: 'Frecuencia',
    definition: 'Cuántas idas y vueltas hace en un segundo. Mientras más rápido va el péndulo, mayor es su frecuencia.',
    words: ['frecuencia'],
  },
  {
    id: 'hercio',
    term: 'Hercio (Hz)',
    definition: 'La unidad de la frecuencia: 1 Hz es una ida y vuelta por segundo.',
    words: ['Hz', 'hercio', 'hercios'],
  },
  {
    id: 'angulo-de-salida',
    term: 'Ángulo de salida (φ₀)',
    definition: 'El ángulo desde el que sueltas el péndulo, medido desde la línea vertical. Se escribe φ₀ y se lee "fi cero".',
    words: ['ángulo de salida', 'φ₀'],
  },
  {
    id: 'vertical',
    term: 'Vertical',
    definition: 'La línea recta de arriba hacia abajo, como la de una plomada. Ahí cuelga el péndulo cuando está quieto.',
    words: ['vertical'],
  },
  {
    id: 'cresta',
    term: 'Cresta',
    definition: 'Cada punto más alto de la curva de la gráfica. La distancia entre dos crestas seguidas es el período.',
    words: ['cresta', 'crestas'],
  },
  {
    id: 'amplitud',
    term: 'Amplitud',
    definition: 'Qué tanto se separa el péndulo de la vertical en su punto más lejano. Al empezar es igual al ángulo de salida.',
    words: ['amplitud'],
  },
  {
    id: 'rozamiento',
    term: 'Rozamiento',
    definition: 'Es lo que frena al péndulo, como el aire o el roce del apoyo. Con rozamiento cada ida y vuelta llega un poco menos lejos, hasta que se detiene.',
    words: ['rozamiento', 'fricción'],
  },
  {
    id: 'gravedad',
    term: 'Gravedad (g)',
    definition: 'Es la fuerza con la que un planeta jala las cosas hacia su centro. En la Tierra vale 9,8 m/s², y en la Luna es mucho menor.',
    words: ['gravedad'],
  },
  {
    id: 'masa',
    term: 'Masa',
    definition: 'Es cuánta materia tiene la bolita, y se mide en kilogramos (kg). En el péndulo ideal, cambiarla no cambia su movimiento.',
    words: ['masa'],
  },
  {
    id: 'seno-coseno',
    term: 'Seno y coseno',
    definition: 'Son funciones de matemáticas que describen una ola: suben, bajan y se repiten. El coseno da la forma de la curva punteada; el seno aparece en la fuerza que devuelve el péndulo.',
    words: ['seno', 'coseno', 'sen θ'],
  },
  {
    id: 'ecuacion',
    term: 'Ecuación',
    definition: 'Es una igualdad de matemáticas que describe cómo cambia algo. La ecuación del péndulo dice cómo cambia su ángulo en cada instante.',
    words: ['ecuación', 'ecuaciones'],
  },
  {
    id: 'aproximacion',
    term: 'Aproximación (fórmula sencilla)',
    definition: 'Es una fórmula que no es exacta, pero se parece mucho a la verdadera en ciertos casos y es más fácil de usar.',
    words: ['aproximación', 'fórmula sencilla'],
  },
  {
    id: 'paso-a-paso',
    term: 'Cálculo paso a paso (RK4)',
    definition:
      'Calcular el péndulo en muchísimos pasitos de tiempo muy chicos, sumando cuánto cambió en cada uno. RK4 es el nombre del método que lo hace con buena precisión.',
    words: ['RK4', 'paso a paso', 'simulación numérica', 'integración numérica'],
  },
  {
    id: 'radian',
    term: 'Radián (rad)',
    definition: 'Es otra forma de medir ángulos: una vuelta completa son 2π radianes, unos 6,28. Por eso rad/s dice cuántos radianes gira algo en cada segundo.',
    words: ['radián', 'radianes', 'rad/s'],
  },
  {
    id: 'rapidez-angular',
    term: 'Rapidez angular (ω₀)',
    definition: 'Qué tan rápido "gira" el péndulo en su ida y vuelta, en radianes por segundo. Se calcula como la raíz de g dividida entre L.',
    words: ['rapidez angular', 'ω₀'],
  },
  {
    id: 'modelo',
    term: 'Modelo (lineal y no lineal)',
    definition:
      'Un modelo es una manera simplificada de describir algo real para poder calcularlo. El modelo "lineal" es el atajo del ángulo pequeño; el "no lineal" es la cuenta completa.',
    words: ['modelo', 'modelos', 'lineal', 'no lineal'],
  },
  {
    id: 'tenso',
    term: 'Hilo tenso',
    definition: 'Un hilo está tenso cuando está estirado y jala la bolita. Si se afloja, deja de sostenerla y la bolita cae.',
    words: ['tenso', 'tensión', 'afloja', 'se afloja'],
  },
  {
    id: 'pendulo-compuesto',
    term: 'Péndulo compuesto',
    definition: 'Un péndulo cuyo cuerpo es grande y no un solo punto, así que tiene su propia fórmula. Se estudia en otro laboratorio.',
    words: ['péndulo compuesto', 'compuesto'],
  },
];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** Una palabra entera: ni letras ni dígitos pegados antes o después (así "seno" no se encuentra dentro de otra palabra). */
const compiled = glossary.map((entry) => ({
  entry,
  regex: new RegExp(`(?<![\\p{L}\\d])(?:${entry.words.map(escapeRegExp).join('|')})(?![\\p{L}\\d])`, 'iu'),
}));

export interface TermsInOptions {
  /** Máximo de palabras a devolver (la tarjeta no debe crecer sin límite). */
  max?: number;
  /** Texto cuya propia palabra no hace falta explicar (p. ej. el título de la tarjeta). */
  skip?: string;
}

/**
 * Palabras del glosario que aparecen en `text`, en el orden en que aparecen por primera vez.
 * Se omiten las que ya están en `skip`: en la tarjeta "Período" no tiene sentido explicar "período".
 */
export function termsIn(text: string, { max = 3, skip = '' }: TermsInOptions = {}): GlossaryTerm[] {
  const found: Array<{ index: number; entry: GlossaryTerm }> = [];
  for (const { entry, regex } of compiled) {
    if (skip && regex.test(skip)) continue;
    const match = regex.exec(text);
    if (match) found.push({ index: match.index, entry });
  }
  return found
    .sort((a, b) => a.index - b.index)
    .slice(0, max)
    .map((item) => item.entry);
}
