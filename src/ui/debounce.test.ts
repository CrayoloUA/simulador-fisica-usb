import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebouncer } from './debounce';

describe('createDebouncer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('entrega el valor solo después del retraso', () => {
    const seen: number[] = [];
    const debouncer = createDebouncer<number>(600, (v) => seen.push(v));
    debouncer.push(1);
    vi.advanceTimersByTime(599);
    expect(seen).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual([1]);
  });

  it('si llegan varios valores seguidos (deslizador), entrega solo el último', () => {
    const seen: number[] = [];
    const debouncer = createDebouncer<number>(600, (v) => seen.push(v));
    for (let i = 1; i <= 10; i++) {
      debouncer.push(i);
      vi.advanceTimersByTime(100);
    }
    expect(seen).toEqual([]);
    vi.advanceTimersByTime(600);
    expect(seen).toEqual([10]);
  });

  it('cancelar descarta el valor pendiente', () => {
    const seen: number[] = [];
    const debouncer = createDebouncer<number>(600, (v) => seen.push(v));
    debouncer.push(1);
    debouncer.cancel();
    vi.advanceTimersByTime(2000);
    expect(seen).toEqual([]);
  });

  it('cancelar sin nada pendiente no falla', () => {
    expect(() => createDebouncer<number>(600, () => {}).cancel()).not.toThrow();
  });
});
