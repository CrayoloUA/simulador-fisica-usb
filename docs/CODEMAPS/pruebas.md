# Mapa de pruebas

Generado el 2026-10-07 a partir del código y de la ejecución real de las pruebas; si el código cambia, actualizar. (El borrador automático anterior se reescribió a mano: contenía descripciones inexactas. Ver B-077 en la bitácora.)

El análisis de lo que cubren las pruebas de punta a punta y sus límites está en [`docs/10-pruebas.md`](../10-pruebas.md); la estrategia de seguridad en [`docs/08`](../08-seguridad-defensiva.md) y [`docs/09`](../09-seguridad-ofensiva.md).

## Cómo se ejecutan

| Comando | Qué corre | Cuándo |
|---|---|---|
| `npm test` | Unitarias (Vitest, entorno `node`, solo `src/**/*.test.ts`) | En cada cambio |
| `npm run test:watch` | Lo mismo en modo vigilancia | Mientras se desarrolla |
| `npm run test:coverage` | Unitarias con cobertura v8 **solo de `src/engine/`** | Antes de cerrar una fase |
| `npm run test:e2e` | Playwright: construye el build, lo sirve en el puerto 4180 y recorre la aplicación en **Chromium**, en dos perfiles (escritorio y móvil Pixel 7) | Antes de publicar y en el CI |
| `npm run typecheck` | `tsc --noEmit` sobre `src/`, `e2e/` y las configuraciones | En cada cambio |
| `npm run smoke -- <url> [--headers]` | **No es una prueba del código**: consulta un sitio ya desplegado (página, recursos, CSP, cabeceras) | Justo después de publicar o revertir |

Configuración: la de Vitest está en la sección `test` de `vite.config.ts` (deja pasar `tokens.css` para comprobar el contraste de los colores reales); la de Playwright en `playwright.config.ts`.

## Pruebas unitarias (309, 29 archivos)

| Carpeta | Archivos | Pruebas | Qué garantizan |
|---|---|---|---|
| `src/engine/` | 10 | 110 | Física y validación: precisión del integrador (error < 1e-6, deriva de energía < 1e-7), período exacto por media aritmético-geométrica y su serie, modelos lineal y no lineal, independencia de la masa, rozamiento, cambio de modelo, `parseDecimal`, `clampToSpec`, `Simulation` con tiempos y escalas hostiles |
| `src/content/` | 2 | 64 | Textos pedagógicos por modo y por parámetro, experimentos, y la máquina de estados del flujo guiado (`experimentFlow`) |
| `src/render/` | 3 | 33 | Dibujo del péndulo y de la gráfica con un contexto simulado, y lectura del tema desde los tokens CSS |
| `src/ui/` | 13 | 92 | La lógica pura de la interfaz (anuncios, etiquetas, ayuda, anuncios del modelo, diseño y progreso de la lección, cambios de densidad de píxeles, lectura "En vivo", alcance de Escape, etc.) y `AppErrorBoundary` |
| `src/security/` | 1 | 10 | Política CSP: directivas, ausencia de `unsafe-*`, hash del `<style>` del `noscript`, idempotencia |

Cobertura medida del motor (`src/engine/`): **100 % de líneas y 94 % de ramas**. La interfaz no se mide con cobertura: los componentes no se prueban con DOM en Vitest; los cubre Playwright.

**Fuzzing:** `src/engine/fuzz.test.ts` (4 pruebas) lanza 300 combinaciones hostiles por modelo con semilla fija (`0`, `1e308`, `±Infinity`, `NaN`, negativos…) y comprueba que el motor no lanza, no se cuelga y falla con un mensaje fijo; y que con `clampToSpec` ningún valor hostil produce error.

## Pruebas de punta a punta (`e2e/`, 24 por perfil, 48 en total)

| Archivo | Pruebas | Flujos |
|---|---|---|
| `explorar.spec.ts` | 7 | Carga limpia, Play/Pausa/Reiniciar, T ∝ √L, gravedad de la Luna, teclado, funcionamiento sin conexión, descripciones accesibles |
| `modelos.spec.ts` | 5 | Cambio de modelo y límite de φ₀, aviso de ángulo grande, comparación con el ángulo pequeño, la masa no cambia T, diálogo de teoría |
| `experimentos.spec.ts` | 4 | Experimento completo de punta a punta, predicción equivocada, "Volver a la lista", experimento de ángulo fuerza el modelo real |
| `robustez.spec.ts` | 8 | CSP del build, uso normal sin violaciones, deslizador manipulado, selector de velocidad manipulado, pantalla de error sin filtrar detalles, sin desplazamiento horizontal, objetivos de al menos 24 px, fuentes propias sin terceros |
| `helpers.ts` | — | Utilidades (`abrir`, `sinProblemas`, `tiempoSimulado`, `periodoMostrado`, `fijarDeslizador`, `abrirMasOpciones`); no contiene pruebas |

## Convenciones

- **TDD:** la prueba se escribe primero y se ve fallar antes de escribir el código.
- Las pruebas E2E usan roles y nombres accesibles (`getByRole`), nunca clases CSS; así también vigilan la accesibilidad.
- Cada prueba E2E termina comprobando que no hubo excepciones ni errores de consola (las violaciones de CSP se reportan ahí).
- Una prueba que nunca falla no demuestra nada: se comprobó con mutaciones deliberadas (ver `docs/10-pruebas.md`).

## Límites

Solo Chromium; sin lector de pantalla real; perfil móvil emulado; sin comparación visual automática; el CI aún no se ha ejecutado.
