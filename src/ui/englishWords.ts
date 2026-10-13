/*
 * Palabras en inglés que aparecen dentro de textos en español (hoy solo "Play", el nombre del
 * botón). El lector de pantalla las debe leer con voz inglesa: se envuelven con lang="en".
 */

/** Palabras (completas, con esa grafía) que se leen en inglés. */
const ENGLISH_WORDS = ['Play'];

const PATTERN = new RegExp(String.raw`\b(${ENGLISH_WORDS.join('|')})\b`, 'g');

export interface TextPiece {
  text: string;
  /** La pieza es una palabra en inglés. */
  en: boolean;
}

/** Parte un texto en trozos, marcando los que son palabras en inglés. Unidos dan el texto original. */
export function splitEnglish(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];
  let last = 0;
  for (const match of text.matchAll(PATTERN)) {
    const start = match.index ?? 0;
    if (start > last) pieces.push({ text: text.slice(last, start), en: false });
    pieces.push({ text: match[0], en: true });
    last = start + match[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last), en: false });
  return pieces;
}
