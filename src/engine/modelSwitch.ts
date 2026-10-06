import { formatNumber, parseDecimal } from './numbers';
import type { ParamSpec, Params } from './types';

interface Input {
  raw: Record<string, string>;
  params: Params;
  /** Esquema del modo al que se pasa. */
  nextSchema: ParamSpec[];
}

interface Output {
  raw: Record<string, string>;
  params: Params;
  /** Aviso para el estudiante si hubo que ajustar algún parámetro; `null` si no. */
  notice: string | null;
}

/**
 * Ajusta los parámetros al cambiar de modo: lo que supere el máximo del esquema nuevo (hoy, φ₀:
 * 15° en lineal, 60° en no lineal) se recorta al máximo.
 *
 * Se recorta también el valor ya aplicado (`params`) aunque el texto escrito sea inválido: si no,
 * el último valor válido (p. ej. 40°) seguiría vigente en el modo lineal.
 */
export function switchModel({ raw, params, nextSchema }: Input): Output {
  const nextRaw = { ...raw };
  const nextParams = { ...params };
  const notices: string[] = [];

  for (const spec of nextSchema) {
    const typed = parseDecimal(raw[spec.key] ?? '');
    const typedTooBig = typed !== null && typed > spec.max;
    const appliedTooBig = params[spec.key] > spec.max;
    if (!typedTooBig && !appliedTooBig) continue;
    if (typedTooBig) nextRaw[spec.key] = formatNumber(spec.max);
    if (appliedTooBig) nextParams[spec.key] = spec.max;
    // El grado va pegado al número ("15°"); las demás unidades, separadas ("2,5 m").
    const unit = spec.unit === '°' ? '°' : spec.unit ? ` ${spec.unit}` : '';
    notices.push(`${spec.symbol} se ajustó a ${formatNumber(spec.max)}${unit} (máximo de ese modo)`);
  }

  return { raw: nextRaw, params: nextParams, notice: notices.length > 0 ? notices.join('. ') : null };
}

/**
 * Texto para la región de estado (lectores de pantalla) al cambiar de modelo: siempre dice qué
 * modelo quedó activo y que la simulación se reinició; suma el ajuste de φ₀ y el cierre del
 * experimento en curso cuando ocurren. Así el cambio nunca es silencioso.
 */
export function describeModelChange(info: {
  adjustedNotice: string | null;
  modelName: string;
  experimentClosed: boolean;
}): string {
  return [
    info.adjustedNotice ? `${info.adjustedNotice}.` : null,
    `Modelo cambiado a «${info.modelName}»: la simulación se reinició.`,
    info.experimentClosed ? 'Se cerró el experimento en curso.' : null,
  ]
    .filter(Boolean)
    .join(' ');
}
