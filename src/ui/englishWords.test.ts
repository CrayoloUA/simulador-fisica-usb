import { describe, expect, it } from 'vitest';
import { splitEnglish } from './englishWords';

describe('splitEnglish', () => {
  it('un texto sin palabras en inglés queda en una sola pieza', () => {
    expect(splitEnglish('El período no depende de la masa.')).toEqual([{ text: 'El período no depende de la masa.', en: false }]);
  });

  it('marca "Play" y conserva el resto', () => {
    expect(splitEnglish('Presiona Play y mira.')).toEqual([
      { text: 'Presiona ', en: false },
      { text: 'Play', en: true },
      { text: ' y mira.', en: false },
    ]);
  });

  it('varias apariciones, al principio y al final; unidas dan el texto original', () => {
    const text = 'Play pone a andar el reloj. Con Play';
    const pieces = splitEnglish(text);
    expect(pieces.filter((p) => p.en)).toHaveLength(2);
    expect(pieces.map((p) => p.text).join('')).toBe(text);
  });

  it('no parte palabras que solo contienen "Play" ni cambia mayúsculas', () => {
    expect(splitEnglish('Playa y play')).toEqual([{ text: 'Playa y play', en: false }]);
  });

  it('texto vacío no da piezas', () => {
    expect(splitEnglish('')).toEqual([]);
  });
});
