# Fase 5 — Construcción: capa pedagógica del laboratorio MAS

- **Fecha:** 2026-09-27
- **Rebanada:** una sola, de punta a punta — ayuda en contexto + 5 experimentos guiados sobre el laboratorio MAS ya existente. Mockup aprobado en la Fase 2: `docs/mockups/experimento-panel.html`.
- **Plan ejecutado:** `docs/superpowers/plans/2026-09-27-capa-pedagogica-mas.md` (10 tareas).
- **Ejecución:** un subagente implementador por tarea (TDD cuando aplicaba), con verificación real del orquestador (tipos, pruebas, build) antes de aceptar cada entrega y antes de comitear.

## Qué se construyó

| Tarea | Entregable | Pruebas |
|---|---|---|
| 1 | `src/content/types.ts` (tipos del contenido pedagógico) | — (solo tipos) |
| 2 | `src/content/experimentFlow.ts` (máquina de estados pura del flujo) | 12 |
| 3 | `src/content/simplePendulumContent.ts` (5 experimentos, verificados contra el motor) | 11 |
| 4 | `src/ui/ParamControl.tsx` (ayuda, presets, resaltado) | — |
| 5 | `src/ui/ResultsPanel.tsx` (nuevo) | — |
| 6 | `src/ui/ExperimentPanel.tsx` (nuevo, 4 etapas) | — |
| 7 | `src/App.tsx` (modo Explorar/Experimentos, wiring completo) | — |
| 8 | `src/styles.css` (estilos nuevos) | — |
| 9 | Verificación automatizada + checklist manual de 15 puntos en el navegador | — |
| 10 | Cierre y registro en `BITACORA.md` | — |

## Evidencia real (Fase 5, regla 5 del playbook: verificar, no afirmar)

```
> tsc --noEmit
(sin salida — sin errores)

> vitest run
 Test Files  7 passed (7)
      Tests  54 passed (54)

> vitest run --coverage
 src/engine: 100% líneas, 100% sentencias, 100% funciones, 97,14% ramas

> vite build
dist/assets/index-*.css   3.53 kB │ gzip:  1.15 kB
dist/assets/index-*.js  242.67 kB │ gzip: 76.32 kB
✓ built in ~200ms
```

Checklist manual (15/15 puntos, ver detalle en `BITACORA.md` B-047): ayuda en contexto por parámetro y resultado, 4 gravedades predefinidas, fórmula con números reales actualizándose, selección de experimento, predicción con bloqueo de opciones, "Preparar valores" (pausa + reinicia + aplica parámetros), resaltado de parámetro y de resultado por paso, retroalimentación correcta/incorrecta, conclusión con detección de acierto/error de la predicción, volver a la lista, cambio de modo conservando valores. Sin errores en consola del navegador en ningún punto.

## Comparación contra el mockup aprobado

Se comparó visualmente contra `docs/mockups/experimento-panel.html` y se encontró una desviación real: los botones de opción y "Volver a la lista" se veían en azul sólido en vez del contorno aprobado (faltaba la regla CSS base `.option-button`, y ningún botón usaba la clase `secondary`). Corregido antes de cerrar la fase — ver `BITACORA.md` B-046.

## Commits (rama `feature/mvp-laboratorio-mas`)

17 commits pequeños desde el inicio de esta fase: 8 de código (uno por tarea 1-8, más 2 de corrección de errores reales: B-040 tipos, B-046 estilo), 9 de bitácora/documentación. Ninguno mezcla entregables no relacionados (se corrigió un commit inicial que sí los mezcló — ver `BITACORA.md`, entrada previa a B-037).

## Riesgos o pendientes abiertos

- La rama `feature/mvp-laboratorio-mas` sigue sin fusionar, sin PR y sin decisión (brecha 1 de `docs/A-auditoria.md`, arrastrada desde antes de esta fase).
- Los textos de los experimentos siguen sin validar con el director físico ni con un docente (contenido de dominio, no de ingeniería).
- Fuera de esta rebanada, según lo declarado en el plan: los otros dos laboratorios, tabla de datos/CSV, informe de laboratorio completo.

## Cierre de fase (formato del playbook)

- **Qué se hizo:** capa pedagógica completa del laboratorio MAS — ayuda en contexto y 5 experimentos guiados — implementada, probada (54 pruebas) y verificada visualmente contra el mockup aprobado.
- **Dónde quedó el entregable:** código en `src/content/` y `src/ui/`; commits en `feature/mvp-laboratorio-mas`; este documento en `docs/05-progreso.md`.
- **Evidencia:** ver arriba (tipos, pruebas, cobertura, build, checklist de 15 puntos).
- **Riesgos o pendientes:** ver arriba.

¿Apruebas la Fase 5? Puedes decir `ajustar`, o `fase 6` para seguir con la revisión de calidad.
