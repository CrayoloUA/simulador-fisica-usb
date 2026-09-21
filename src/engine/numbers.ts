export const DEG_TO_RAD = Math.PI / 180;

export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatNumber(value: number, decimals?: number): string {
  const text = decimals === undefined ? String(value) : value.toFixed(decimals);
  return text.replace('.', ',');
}
