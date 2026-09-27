# Fase 2 — Diseño

- **Fecha:** 2026-09-27
- **Entregables de esta fase:** `docs/02-flujos.md` (mapa de pantallas y flujos), `DESIGN.md` (tokens y componentes), `docs/mockups/experimento-panel.html` (mockup del panel de experimentos).

## Por qué no se hicieron 2-3 direcciones visuales desde cero

El playbook pide explorar varias direcciones de estilo para la pantalla principal. Aquí no aplica igual: la pantalla del laboratorio en modo Explorar **ya está construida, probada en el navegador (checklist de la Task 9 del plan del MVP) y en uso** — no es un boceto por decidir, es el producto real. Rehacer esa exploración sería trabajo perdido. Lo que sí seguía siendo una decisión de diseño abierta era la capa pedagógica (modo Experimentos), que solo existía en prosa (sección 12 del spec). Para esa parte sí se construyó un mockup real.

## Estilo, tono y paleta (extraídos, no nuevos)

- **Paleta y tipografía:** ya fijadas por el código existente — ver `DESIGN.md`. Azules para acción/información, ámbar para avisos, rojo para error, verde para retroalimentación correcta (nuevo, propuesto en este documento).
- **Tono de voz:** directo y en segunda persona ("tú"), frases cortas, sin tecnicismos innecesarios — ya establecido en los textos de ayuda y de los experimentos (sección 12.2 del spec). No se redefinió porque ya está en uso y es consistente.
- **Detalle memorable:** el aviso que compara la simulación con un péndulo real (por ejemplo, "un péndulo real difiere cerca de 1,7 %"), que convierte una limitación técnica del modelo en parte de la enseñanza.

## Mockup del panel de experimentos

Archivo: `docs/mockups/experimento-panel.html` (HTML/CSS autocontenido, sin JavaScript — es para revisar diseño, no comportamiento). Reutiliza exactamente los tokens de `DESIGN.md`, así que se ve como una extensión natural de la app, no como una pieza distinta. Cubre:

1. El selector de modo Explorar/Experimentos en el encabezado.
2. La lista de 5 experimentos.
3. La etapa de predicción, con una opción ya elegida y las demás deshabilitadas.
4. La etapa de pasos, con el control de un parámetro resaltado con el mismo color de aviso que ya usa la app.
5. La etapa de comprobación en sus dos resultados posibles: retroalimentación correcta (verde) e incorrecta (roja).
6. La etapa de conclusión.

**Cómo revisarlo:** ya se abrió en el panel del navegador de esta sesión. También se puede abrir manualmente con:

```bash
start docs/mockups/experimento-panel.html
```

## Decisión pendiente de aprobación

Antes de implementar `ExperimentPanel` (retomando el plan de la capa pedagógica), se necesita que el usuario apruebe o pida cambios sobre este mockup — layout, colores de retroalimentación, o el copy de las tarjetas. Mientras no haya respuesta, no se avanza a construir el componente real (regla del propio playbook: "itera hasta que Julián diga que sí").
