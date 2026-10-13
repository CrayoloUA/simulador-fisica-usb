import { splitEnglish } from './englishWords';

/** Un texto en español en el que las palabras en inglés (p. ej. "Play") llevan `lang="en"`. */
export function LangText({ text }: { text: string }) {
  return (
    <>
      {splitEnglish(text).map((piece, index) =>
        piece.en ? (
          <span key={index} lang="en">
            {piece.text}
          </span>
        ) : (
          piece.text
        ),
      )}
    </>
  );
}
