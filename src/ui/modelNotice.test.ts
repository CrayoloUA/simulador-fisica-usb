import { describe, expect, it } from 'vitest';
import { describeModelNotice } from './modelNotice';

const base = {
  model: 'no-lineal' as const,
  periodError: 0.2,
  withinSmallAngle: true,
  adjustedTo: null,
  showLinear: false,
};

describe('describeModelNotice', () => {
  it('Real con ángulo de hasta 10°: ningún aviso a la vista', () => {
    expect(describeModelNotice(base)).toBeNull();
  });

  it('Ángulo pequeño sin ajuste: ningún aviso, aunque el ángulo sea grande', () => {
    expect(describeModelNotice({ ...base, model: 'lineal', withinSmallAngle: false, periodError: 1.7 })).toBeNull();
  });

  it('Real con ángulo grande: advertencia con el porcentaje exacto del motor y oferta de comparar', () => {
    expect(describeModelNotice({ ...base, withinSmallAngle: false, periodError: 7.3126 })).toEqual({
      kind: 'warn',
      text: 'Ángulo grande: el período es 7,3 % más largo que con ángulo pequeño.',
      offerComparison: true,
    });
  });

  it('con la comparación ya visible, el aviso sigue pero ya no ofrece el botón', () => {
    const notice = describeModelNotice({ ...base, withinSmallAngle: false, periodError: 7.3, showLinear: true });
    expect(notice?.offerComparison).toBe(false);
    expect(notice?.text).toContain('7,3 %');
  });

  it('tras ajustar φ₀ al pasar a Ángulo pequeño: aviso corto con el máximo, sin botón', () => {
    expect(describeModelNotice({ ...base, model: 'lineal', adjustedTo: 15 })).toEqual({
      kind: 'warn',
      text: 'El ángulo pequeño solo sirve hasta 15°. Bajamos el ángulo de salida a 15°.',
      offerComparison: false,
    });
  });

  it('el ajuste manda sobre el aviso de ángulo grande', () => {
    const notice = describeModelNotice({ ...base, withinSmallAngle: false, adjustedTo: 15 });
    expect(notice?.text).toContain('Bajamos');
  });

  it('ningún texto lleva guion largo', () => {
    const texts = [
      describeModelNotice({ ...base, withinSmallAngle: false }),
      describeModelNotice({ ...base, model: 'lineal', adjustedTo: 15 }),
    ].map((notice) => notice?.text ?? '');
    for (const text of texts) expect(text).not.toContain('—');
  });
});
