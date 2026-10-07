export const DEG_TO_RAD = Math.PI / 180;

const MAX_NUMBER_CHARS = 32;

export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  // Tope antes de la regex: con cadenas enormes su retroceso es cuadrático y colgaría el navegador.
  if (normalized.length > MAX_NUMBER_CHARS) return null;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatNumber(value: number, decimals?: number): string {
  const text = decimals === undefined ? String(value) : value.toFixed(decimals);
  return text.replace('.', ',');
}
