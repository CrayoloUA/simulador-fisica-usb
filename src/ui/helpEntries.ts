import type { LabContent } from '../content/types';
import type { ParamSpec } from '../engine/types';
import { RESULT_LABELS, paramLabel } from './kidLabels';

export interface HelpSection {
  /** Encabezado corto del bloque. */
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

/** Encabezados de los tres bloques de las partes de la pantalla y de los resultados. */
export const HEADING_WHAT = 'Qué es';
export const HEADING_WHY = 'Por qué es así';
export const HEADING_IF_NOT = 'Qué pasaría si no fuera así';

/** Título de un resultado: nombre para niños con su símbolo (la diferencia ya trae sus paréntesis). */
function resultTitle(key: string, fallback: string): string {
  const kid = RESULT_LABELS[key];
  if (!kid) return fallback;
  return kid.symbol.startsWith('(') ? `${kid.label} ${kid.symbol}` : `${kid.label} (${kid.symbol})`;
}

/**
 * Reúne los textos de ayuda del contenido en entradas uniformes. Son la fuente única de las
 * marcas del modo "¿Qué es esto?" y de la sección "Qué es cada cosa" de la hoja de Teoría.
 * Los parámetros llevan sus tres textos de siempre (de dónde sale, para qué sirve, qué pasa si se
 * cambia u omite); los resultados y las demás partes de la pantalla, "Qué es", "Por qué es así" y
 * "Qué pasaría si no fuera así". Los textos son los reales del contenido; solo los nombres se
 * muestran en lenguaje para niños.
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

  // En el orden de la pantalla: primero los principales y después los datos para curiosos.
  const results: HelpEntry[] = [];
  for (const key of Object.keys(RESULT_LABELS)) {
    const help = content.resultHelp.find((h) => h.resultKey === key);
    const extra = content.resultExtras.find((e) => e.resultKey === key);
    const what = help?.explanation ?? extra?.what;
    if (what === undefined) continue;
    const sections: HelpSection[] = [{ heading: HEADING_WHAT, text: what }];
    if (extra) {
      sections.push({ heading: HEADING_WHY, text: extra.why }, { heading: HEADING_IF_NOT, text: extra.ifNot });
    }
    results.push({ id: resultHelpId(key), title: resultTitle(key, help?.label ?? key), sections });
  }

  const elements: HelpEntry[] = content.elementHelp.map((help) => ({
    id: help.id,
    title: help.title,
    sections: [
      { heading: HEADING_WHAT, text: help.what },
      { heading: HEADING_WHY, text: help.why },
      { heading: HEADING_IF_NOT, text: help.ifNot },
    ],
  }));

  return [...params, ...results, ...elements];
}
