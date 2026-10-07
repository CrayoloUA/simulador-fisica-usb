/**
 * Escape cierra el cajón solo cuando el foco está dentro de él o en el botón "Más opciones": desde
 * cualquier otro sitio (un deslizador, la lección) Escape no debe mover el foco ni cerrar nada.
 * Es genérica en el tipo de nodo para poder probarla sin navegador.
 */
export function escapeClosesDrawer<N extends object>(
  active: N | null,
  drawer: { contains(other: N | null): boolean } | null,
  moreButton: N | null,
): boolean {
  if (active === null) return false;
  if (moreButton !== null && active === moreButton) return true;
  return drawer !== null && drawer.contains(active);
}
