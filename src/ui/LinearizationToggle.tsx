interface Props {
  showLinear: boolean;
  onToggle: () => void;
}

/**
 * Muestra u oculta la curva punteada (aproximación lineal) de la gráfica. Es un botón de dos
 * estados (`aria-pressed`): "presionado" significa "la curva está visible". La etiqueta es fija a
 * propósito: si además cambiara según el estado, el lector de pantalla diría algo contradictorio
 * ("Ocultar aproximación lineal, presionado").
 */
export function LinearizationToggle({ showLinear, onToggle }: Props) {
  return (
    <button type="button" className="linear-toggle" aria-pressed={showLinear} onClick={onToggle}>
      Mostrar aproximación lineal
    </button>
  );
}
