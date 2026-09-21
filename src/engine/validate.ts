import { formatNumber, parseDecimal } from './numbers';
import type { ParamSpec, Params } from './types';

export interface ValidationResult {
  ok: boolean;
  params: Params;
  errors: Record<string, string>;
}

export function validateParams(schema: ParamSpec[], raw: Record<string, string>): ValidationResult {
  const params: Params = {};
  const errors: Record<string, string> = {};
  for (const spec of schema) {
    const value = parseDecimal(raw[spec.key] ?? '');
    if (value === null) {
      errors[spec.key] = `${spec.symbol} debe ser un número`;
    } else if (value < spec.min || value > spec.max) {
      errors[spec.key] =
        `${spec.symbol} debe estar entre ${formatNumber(spec.min)} y ${formatNumber(spec.max)} ${spec.unit}`.trim();
    } else {
      params[spec.key] = value;
    }
  }
  return { ok: Object.keys(errors).length === 0, params, errors };
}

export function defaultParams(schema: ParamSpec[]): Params {
  return Object.fromEntries(schema.map((spec) => [spec.key, spec.defaultValue]));
}
