import { Component, type ReactNode } from 'react';

/**
 * Pantalla de último recurso. Sin un límite de error, un fallo al dibujar deja la página en blanco
 * y el estudiante no sabe qué hacer. El mensaje es fijo a propósito: no muestra `error.message`
 * ni la pila, que revelarían detalles internos. React ya deja el detalle en la consola.
 */
export function ErrorFallback() {
  return (
    <main className="app-error" role="alert">
      <h1>Algo salió mal</h1>
      <p>El simulador tuvo un problema y no pudo seguir. Recarga la página para empezar de nuevo.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Recargar la página
      </button>
    </main>
  );
}

interface Props {
  children: ReactNode;
}

export class AppErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}
