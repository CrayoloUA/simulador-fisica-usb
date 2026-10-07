import { describe, expect, it } from 'vitest';
import { modeAnnouncement, resultsSummary, runAnnouncement } from './announcements';

describe('modeAnnouncement', () => {
  it('dice a dónde se pasó y qué hacer', () => {
    expect(modeAnnouncement('experimentos')).toBe('Modo Experimentos: elige un experimento en la lección.');
    expect(modeAnnouncement('explorar')).toBe('Modo Explorar: mueve los controles y mira el péndulo.');
  });
});

describe('runAnnouncement', () => {
  it('un texto distinto para Play, Pausa y Reiniciar', () => {
    const texts = [runAnnouncement('play'), runAnnouncement('pause'), runAnnouncement('reset')];
    expect(texts).toEqual(['Simulación en marcha.', 'Simulación en pausa.', 'Simulación reiniciada.']);
    expect(new Set(texts).size).toBe(3);
  });
});

describe('resultsSummary', () => {
  it('resume período y frecuencia con coma decimal y unidades', () => {
    expect(resultsSummary({ T: 2.0107, f: 0.4973 })).toBe('Período 2,011 s. Frecuencia 0,497 Hz.');
  });

  it('ningún texto lleva guion largo', () => {
    const all = [
      modeAnnouncement('explorar'),
      modeAnnouncement('experimentos'),
      runAnnouncement('play'),
      resultsSummary({ T: 1, f: 1 }),
    ];
    for (const text of all) expect(text).not.toContain('—');
  });
});
