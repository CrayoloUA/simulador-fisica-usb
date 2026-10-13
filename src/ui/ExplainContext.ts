import { createContext } from 'react';
import type { HelpEntry } from './helpEntries';

export interface ExplainContextValue {
  /** El modo "¿Qué es esto?" está encendido: se ven las marcas. */
  active: boolean;
  /** Id de la parte cuya tarjeta está abierta (una sola a la vez), o null. */
  openId: string | null;
  /** Entradas de ayuda por id: de ahí salen el título de cada marca y el texto de la tarjeta. */
  entries: ReadonlyMap<string, HelpEntry>;
  /** Abre la tarjeta de esa parte (o la cierra si ya era la abierta). Recibe la marca tocada. */
  toggle: (id: string, mark: HTMLElement) => void;
}

/** Sin proveedor (p. ej. en pruebas) el modo está apagado y las marcas no se dibujan. */
export const ExplainContext = createContext<ExplainContextValue>({
  active: false,
  openId: null,
  entries: new Map(),
  toggle: () => undefined,
});
