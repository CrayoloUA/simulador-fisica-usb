import type { GlossaryTerm } from '../content/glossary';

interface Props {
  terms: GlossaryTerm[];
}

/**
 * Lista de definiciones del glosario: cada palabra en negrita y su explicación debajo. La usan la
 * tarjeta de explicación (las palabras de ese texto) y la hoja de Teoría (todo el glosario).
 */
export function GlossaryList({ terms }: Props) {
  return (
    <dl className="glossary">
      {terms.map((item) => (
        <div key={item.id} className="glossary-item">
          <dt>{item.term}</dt>
          <dd>{item.definition}</dd>
        </div>
      ))}
    </dl>
  );
}
