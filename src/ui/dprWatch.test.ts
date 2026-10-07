import { describe, expect, it } from 'vitest';
import { watchDevicePixelRatio, type DprWindow } from './dprWatch';

/** Ventana falsa: cada consulta recuerda sus oyentes, y `fire` dispara `change` en la última. */
function fakeWindow(dpr: number) {
  const queries: Array<{ query: string; listeners: Set<() => void> }> = [];
  const win: DprWindow = {
    devicePixelRatio: dpr,
    matchMedia: (query) => {
      const entry = { query, listeners: new Set<() => void>() };
      queries.push(entry);
      return {
        addEventListener: (_type, listener) => entry.listeners.add(listener),
        removeEventListener: (_type, listener) => entry.listeners.delete(listener),
      };
    },
  };
  const fire = () => [...queries[queries.length - 1].listeners].forEach((listener) => listener());
  const active = () => queries.reduce((n, q) => n + q.listeners.size, 0);
  return { win, queries, fire, active };
}

describe('watchDevicePixelRatio', () => {
  it('pide la consulta de la densidad actual', () => {
    const { win, queries } = fakeWindow(1.25);
    watchDevicePixelRatio(win, () => {});
    expect(queries[0].query).toBe('(resolution: 1.25dppx)');
  });

  it('al cambiar la densidad avisa y se vuelve a armar con la nueva', () => {
    const fake = fakeWindow(1);
    let calls = 0;
    watchDevicePixelRatio(fake.win, () => calls++);
    fake.win.devicePixelRatio = 2;
    fake.fire();
    expect(calls).toBe(1);
    expect(fake.queries[1].query).toBe('(resolution: 2dppx)');
    fake.fire();
    expect(calls).toBe(2);
  });

  it('nunca deja más de un oyente activo', () => {
    const fake = fakeWindow(1);
    watchDevicePixelRatio(fake.win, () => {});
    fake.fire();
    fake.fire();
    expect(fake.active()).toBe(1);
  });

  it('al desactivarlo quita el oyente y ya no avisa', () => {
    const fake = fakeWindow(1);
    let calls = 0;
    const stop = watchDevicePixelRatio(fake.win, () => calls++);
    stop();
    expect(fake.active()).toBe(0);
    fake.fire();
    expect(calls).toBe(0);
  });
});
