import type { LabContent } from '../content/types';
import type { ParamSpec } from '../engine/types';
import { RESULT_LABELS, paramLabel } from './kidLabels';

export interface HelpSection {
  /** Encabezado corto; los resultados traen un solo texto y no lo llevan. */
  heading?: string;
  text: string;
}

export interface HelpEntry {
  id: string;
  /** Nombre para niños con su símbolo, p. ej. "Largo del hilo (L)". */
  title: string;
  sections: HelpSection[];
}

export const paramHelpId = (key: string) => `param-${key}`;
export const resultHelpId = (key: string) => `result-${key}`;

/**
 * Reúne los textos de ayuda del contenido en entradas uniformes para la sección "Qué es cada
 * cosa" de la hoja de Teoría. Los parámetros llevan sus tres textos (de dónde sale, para qué
 * sirve, qué pasa si se cambia); los resultados, el texto único `explanation`. Los textos son los
 * reales del contenido; solo los nombres se muestran en lenguaje para niños.
 */
export function buildHelpEntries(content: LabContent, schema: ParamSpec[]): HelpEntry[] {
  const params: HelpEntry[] = [];
  for (const spec of schema) {
    const help = content.paramHelp.find((h) => h.paramKey === spec.key);
    if (!help) continue;
    const { label, symbol } = paramLabel(spec);
    params.push({
      id: paramHelpId(spec.key),
      title: `${label} (${symbol})`,
      sections: [
        { heading: 'De dónde sale', text: help.origin },
        { heading: 'Para qué sirve', text: help.role },
        { heading: 'Si la cambias u omites', text: help.effect },
      ],
    });
  }
  const results: HelpEntry[] = content.resultHelp.map((help) => {
    const kid = RESULT_LABELS[help.resultKey];
    return {
      id: resultHelpId(help.resultKey),
      title: kid ? `${kid.label} (${kid.symbol})` : help.label,
      sections: [{ text: help.explanation }],
    };
  });
  return [...params, ...results];
}
