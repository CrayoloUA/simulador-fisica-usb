import { describe, expect, it } from 'vitest';
import { escapeClosesDrawer } from './escapeScope';

const inside = {};
const outside = {};
const drawer = { contains: (node: unknown) => node === inside };
const moreButton = {};

describe('escapeClosesDrawer', () => {
  it('cierra si el foco está dentro del cajón', () => {
    expect(escapeClosesDrawer(inside, drawer, moreButton)).toBe(true);
  });

  it('cierra si el foco está en el botón "Más opciones"', () => {
    expect(escapeClosesDrawer(moreButton, drawer, moreButton)).toBe(true);
  });

  it('no cierra con el foco en cualquier otro sitio', () => {
    expect(escapeClosesDrawer(outside, drawer, moreButton)).toBe(false);
  });

  it('no cierra sin foco o sin cajón', () => {
    expect(escapeClosesDrawer(null, drawer, moreButton)).toBe(false);
    expect(escapeClosesDrawer(outside, null, null)).toBe(false);
  });
});
