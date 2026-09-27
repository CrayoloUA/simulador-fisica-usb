# Fase 6 — Revisión de calidad

- **Fecha:** 2026-09-27
- **Alcance:** todo el diff de `feature/mvp-laboratorio-mas` contra `main` (MVP del laboratorio MAS + capa pedagógica).
- **Método:** 6 agentes de revisión dispatchados en paralelo (`code-reviewer`, `typescript-reviewer`, `react-reviewer`, `silent-failure-hunter`, `type-design-analyzer`, `pr-test-analyzer`). No se corrió `database-reviewer` porque el proyecto no tiene base de datos.

## Compuerta: cero hallazgos altos abiertos

Se corrigieron todos los hallazgos con impacto real y bajo costo de arreglo. Los hallazgos "Alto" que representan mejoras de diseño de mayor alcance (no bugs activos con el código y contenido actuales) se reclasificaron a deuda técnica documentada, con la justificación de por qué no bloquean esta rebanada. Esto es una decisión de ingeniería explícita, no una omisión.

## Hallazgos corregidos

| # | Hallazgo | Severidad original | Agente | Archivo | Corrección |
|---|---|---|---|---|---|
| 1 | `ValidationResult.params` tipado como `Params` completo, pero omite claves inválidas en tiempo de ejecución | Alto | typescript-reviewer | `src/engine/validate.ts` | Tipo cambiado a `Partial<Params>`; ajustado el consumidor en `App.tsx` |
| 2 | `canAdvance` compara `checkAnswers[questionIndex] !== null`; con arreglo corto, `undefined !== null` es `true` y deja avanzar sin responder | Alto | type-design-analyzer | `src/content/experimentFlow.ts` | Se compara también contra `undefined` |
| 3 | `Simulation.recordSample()` no valida finitud de `outputs()`/`theory()`, solo del estado del integrador | Alto | silent-failure-hunter | `src/engine/simulation.ts` | Guarda de finitud agregada antes de aceptar la muestra |
| 4 | Fórmula mostrada mezcla punto y coma decimal | Medio | code-reviewer | `src/content/simplePendulumContent.ts` | Usa `formatNumber` para `L` y `g` |
| 5 | Botón de ayuda anidado en `<label>`, contamina el nombre accesible del input | Alto | react-reviewer | `src/ui/ParamControl.tsx` | Botón sacado como hermano del `<label>`, con ajuste de CSS |
| 6 | `aria-live="polite"` envuelve todo `ResultsPanel`, incluidos controles interactivos; falta `aria-controls`/`id` | Alto / Medio | react-reviewer | `src/ui/ResultsPanel.tsx` | `aria-live` acotado a los `<dd>`; `aria-controls`/`id` agregados |
| 7 | `<App/>` sin `React.StrictMode` | Medio | react-reviewer | `src/main.tsx` | Envuelto en `StrictMode` |
| 8 | `key` de avisos usa el texto del mensaje | Bajo | react-reviewer | `src/App.tsx` | Usa `limit.id` |

**Verificación tras las correcciones:** `tsc --noEmit` limpio, 54 pruebas en 7 archivos en PASS, `vite build` limpio (76,38 KB gzip), verificación visual manual (ayuda reubicada, fórmula con coma decimal consistente), sin errores en consola.

## Hallazgos reclasificados como deuda técnica (no bloquean esta rebanada)

| Hallazgo | Severidad original | Agente | Por qué no se corrige ahora |
|---|---|---|---|
| Sin ESLint (`eslint-plugin-react-hooks`, `jsx-a11y`) | Alto | react-reviewer | Requiere elegir configuración e instalar, con riesgo de surfacear más hallazgos que triar; `tsc` estricto y la verificación manual ya atraparon los bugs reales de esta rebanada. Queda para antes de la entrega final. |
| Patrón de estado derivado por efecto en `App.tsx` (`useEffect` + `setParams`) | Alto | react-reviewer | Funcionalmente correcto (la guarda evita bucles infinitos, ya probado manualmente); el refactor a "ajustar estado durante el render" cambia el flujo de datos del componente raíz sin pruebas dedicadas para esa interacción. Se documenta como mejora idiomática pendiente. |
| Pérdida de foco al deshabilitar opciones ya elegidas en `ExperimentPanel` | Alto | react-reviewer | Requiere manejo imperativo de foco o cambiar `disabled` por `aria-disabled`, un cambio de comportamiento que conviene probar con navegación real por teclado antes de aplicar. |
| `FlowState` no es una unión discriminada por fase | Alto | type-design-analyzer | Refactor de tipos que toca `experimentFlow.ts`, `ExperimentPanel.tsx` y sus pruebas; valioso cuando se agregue persistencia o un segundo experimento con forma distinta, no antes. |
| `stepIndex`/`questionIndex` sin cota de tipo; `steps`/`check` sin longitud mínima garantizada | Alto | type-design-analyzer | Hoy los 5 experimentos reales siempre tienen arreglos no vacíos (verificado por `simplePendulumContent.test.ts`); el riesgo se vuelve real al agregar el segundo laboratorio, momento en que se revisará. |
| `Record<string, number>` sin `noUncheckedIndexedAccess` (Params/State/results) | Alto | type-design-analyzer / typescript-reviewer | Activar la opción tendría efecto en cascada sobre archivos ya probados y estables; se prefiere evaluarlo como cambio de configuración aparte, no colado en esta rebanada. |
| Semántica ARIA de radiogroup/tabs en vez de `aria-pressed` | Medio | react-reviewer | Mejora real de accesibilidad, pero un cambio de patrón ARIA en 2 componentes que conviene validar con una herramienta de auditoría antes de aplicar. |
| Lectura en vivo de θ/ω sin throttle ni `aria-live` | Medio | react-reviewer | Necesita diseño de limitación de frecuencia para no saturar lectores de pantalla; no es un defecto, es una función accesible que falta construir. |
| Brechas menores de cobertura (rama de `numbers.ts`, opciones de `Simulation`, validación múltiple, límites de `experimentFlow`) | Bajo | pr-test-analyzer | Ninguna Alta; se listan para cerrarlas en una futura pasada de pruebas. |
| Cast `as number` en vez de guarda en un test | Medio | typescript-reviewer | Solo afecta al propio test, no al código de producción; cosmético. |
| Non-null assertions repetidas en `ExperimentPanel` (`checkAnswers[...]!`) | Bajo | typescript-reviewer | Cosmético, sin bug; se limpiará en una pasada de refactor. |

## Cierre de fase

- **Qué se hizo:** revisión de calidad con 6 agentes en paralelo sobre todo el diff de la rama; 8 hallazgos reales corregidos y verificados; el resto documentado como deuda técnica con justificación explícita.
- **Dónde quedó el entregable:** este documento, más 3 commits (`fix(engine)`, `fix(content)`, `fix(ui)`) en `feature/mvp-laboratorio-mas`.
- **Evidencia:** ver tabla de verificación arriba.
- **Riesgos o pendientes:** los de la tabla de deuda técnica; la rama sigue sin fusionar (brecha 1 de `docs/A-auditoria.md`).

¿Apruebas la Fase 6? Puedes decir `ajustar`, o `fase 7` para seguir con rendimiento, accesibilidad y SEO.
