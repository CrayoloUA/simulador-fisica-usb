interface Props {
  showLinear: boolean;
  onToggle: () => void;
}

/**
 * Interruptor "Comparar con el ángulo pequeño": muestra u oculta la curva punteada de la gráfica.
 * Es un botón de dos estados (`aria-pressed`) y la etiqueta es fija a propósito: si además
 * cambiara según el estado, el lector de pantalla diría algo contradictorio. El estado se lee
 * también con el texto Sí o No dentro de la pista, no solo por el color.
 */
export function LinearizationToggle({ showLinear, onToggle }: Props) {
  return (
    <button type="button" className="switch" aria-pressed={showLinear} onClick={onToggle}>
      <span className="swtrack" aria-hidden="true">
        <span className="swknob" />
        <span>{showLinear ? 'Sí' : 'No'}</span>
      </span>
      <span>Comparar con el ángulo pequeño</span>
    </button>
  );
}
