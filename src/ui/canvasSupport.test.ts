import { describe, expect, it } from 'vitest';
import {
  CANVAS_UNAVAILABLE_TEXT,
  CANVAS_UNAVAILABLE_TITLE,
  CHART_UNAVAILABLE_TEXT,
  canDrawCanvas,
} from './canvasSupport';

describe('canDrawCanvas', () => {
  it('hay dibujo cuando el canvas entrega un contexto 2D', () => {
    expect(canDrawCanvas(() => ({ getContext: () => ({}) }))).toBe(true);
  });

  it('no hay dibujo cuando getContext devuelve null', () => {
    expect(canDrawCanvas(() => ({ getContext: () => null }))).toBe(false);
  });

  it('no hay dibujo cuando getContext devuelve undefined', () => {
    expect(canDrawCanvas(() => ({ getContext: () => undefined }))).toBe(false);
  });

  it('pide un contexto 2D, no otro', () => {
    const asked: string[] = [];
    canDrawCanvas(() => ({
      getContext: (id) => {
        asked.push(id);
        return {};
      },
    }));
    expect(asked).toEqual(['2d']);
  });

  it('no lanza: si getContext o la creación del canvas fallan, no hay dibujo', () => {
    expect(
      canDrawCanvas(() => ({
        getContext: () => {
          throw new Error('bloqueado');
        },
      })),
    ).toBe(false);
    expect(
      canDrawCanvas(() => {
        throw new Error('sin DOM');
      }),
    ).toBe(false);
  });
});

describe('textos del aviso de canvas no disponible', () => {
  it('dicen lo aprobado: título, qué sigue funcionando y qué navegadores usar', () => {
    expect(CANVAS_UNAVAILABLE_TITLE).toBe('No podemos dibujar la simulación en este navegador');
    expect(CANVAS_UNAVAILABLE_TEXT).toBe(
      'Los controles y los resultados siguen funcionando. ' +
        'Para ver el péndulo y la gráfica, abre el simulador en una versión actual de Chrome, Edge o Firefox.',
    );
  });

  it('no llevan rayas largas ni cortas', () => {
    for (const text of [CANVAS_UNAVAILABLE_TITLE, CANVAS_UNAVAILABLE_TEXT, CHART_UNAVAILABLE_TEXT]) {
      expect(text).not.toMatch(/—|–/);
    }
  });

  it('el texto de la gráfica es corto y no repite el aviso completo', () => {
    expect(CHART_UNAVAILABLE_TEXT.length).toBeLessThan(CANVAS_UNAVAILABLE_TEXT.length / 2);
  });
});
