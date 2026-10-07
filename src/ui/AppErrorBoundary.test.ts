import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppErrorBoundary, ErrorFallback } from './AppErrorBoundary';

describe('AppErrorBoundary', () => {
  it('pasa a estado de fallo cuando un hijo lanza, sea cual sea el error', () => {
    expect(AppErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true });
  });

  it('muestra a los hijos mientras no haya fallo', () => {
    const html = renderToStaticMarkup(createElement(AppErrorBoundary, null, createElement('p', null, 'contenido')));
    expect(html).toContain('contenido');
  });

  it('el mensaje de error es fijo, en español, con rol alert y botón para recargar', () => {
    const html = renderToStaticMarkup(createElement(ErrorFallback));
    expect(html).toContain('role="alert"');
    expect(html).toContain('Recargar');
    expect(html).toMatch(/Algo salió mal/);
  });

  it('no filtra detalles internos: el texto no depende del error', () => {
    // El componente de respaldo no recibe el error como propiedad: no puede mostrarlo.
    expect(ErrorFallback.length).toBe(0);
  });
});
