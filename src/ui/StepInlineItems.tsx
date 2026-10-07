import type { PresetValue } from '../content/types';
import type { ParamSpec, Params } from '../engine/types';
import { ParamControl } from './ParamControl';
import { CuriousData } from './ResultsPanel';
import type { InlineItem } from './lessonLayout';

interface Props {
  items: InlineItem[];
  specs: ParamSpec[];
  params: Params;
  presets: Record<string, PresetValue[]>;
  results: Record<string, number>;
  onParamChange: (key: string, value: number) => void;
}

/**
 * Lo que el paso pide mirar y que normalmente vive en "Más opciones" (masa, rozamiento, T₀,
 * diferencia, ω₀), dentro de la tarjeta de lección y resaltado. Son los mismos componentes que usa
 * el cajón (ParamControl y CuriousData), con el mismo estado: no hay una copia.
 */
export function StepInlineItems({ items, specs, params, presets, results, onParamChange }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="inline-items" role="group" aria-label="Lo que el paso te pide">
      {items.map((item) => {
        if (item.kind === 'result') {
          return <CuriousData key={`r-${item.key}`} results={results} keys={[item.key]} highlightedKey={item.key} />;
        }
        const spec = specs.find((candidate) => candidate.key === item.key);
        if (!spec) return null;
        return (
          <ParamControl
            key={`p-${item.key}`}
            spec={spec}
            value={params[spec.key]}
            presets={presets[spec.key]}
            highlighted
            showNote={false}
            onChange={(value) => onParamChange(spec.key, value)}
          />
        );
      })}
    </div>
  );
}
