# Sistema de diseño (v2)

> **Fuente única de los valores: [`src/tokens.css`](src/tokens.css).** Este documento explica los roles y las reglas; no copia los valores, para que no se desfase cuando cambien. El CSS (`src/styles.css`) y el dibujo en canvas (`src/render/theme.ts`) solo usan esas variables: nada de colores, tamaños ni espacios sueltos.
>
> La versión anterior (v1, paleta azul/gris de utilidades y fuente del sistema) quedó reemplazada por el rediseño "simple por defecto"; se conserva en el historial de git y su contexto en `docs/02-diseno.md`.

## Principio

El público son estudiantes de 10° y 11° y el simulador también se proyecta en el aula. La pantalla muestra **lo mínimo para jugar** (péndulo, gráfica, Play/Reiniciar, largo, ángulo, gravedad y el período) y todo lo demás vive detrás de "Más opciones" y "Teoría". Cada cosa se explica a petición, no de golpe.

## Color (roles, no valores)

| Rol | Tokens | Uso |
|---|---|---|
| Papel y superficies | `--paper`, `--paper-sunken`, `--surface` | Fondo de la página, paneles hundidos y tarjetas |
| Tinta | `--ink`, `--ink-soft`, `--ink-faint` | Texto principal, secundario y de apoyo (unidades, subtítulos) |
| Líneas | `--line`, `--line-strong` | Divisores decorativos y bordes de controles (los de controles cumplen 3:1) |
| Acento | `--accent`, `--accent-hover`, `--accent-active`, `--accent-soft`, `--accent-line`, `--on-accent` | Botón principal, opción elegida, curva simulada |
| Curvas | `--curve-sim` (sólida), `--curve-linear` (punteada) | Gráfica: lo simulado frente a la aproximación de ángulo pequeño. Además se diferencian por trazo (sólido/punteado), no solo por color |
| Foco | `--focus` | Anillo de foco y resaltado guiado de los experimentos |
| Estados | `--warn-*`, `--ok-*`, `--bad-*` (fondo, línea y texto) | Avisos del modelo, retroalimentación correcta e incorrecta, errores |

Los tokens tienen un valor de respaldo en hexadecimal y, donde el navegador lo admite (`@supports (color: oklch(0 0 0))`), el valor equivalente en OKLCH.

**Reglas de contraste:** texto normal ≥ 4,5:1; texto grande, bordes de controles, curvas y anillo de foco ≥ 3:1 (WCAG 1.4.3 y 1.4.11). `src/render/theme.test.ts` comprueba el contraste de la curva punteada sobre el papel; la Fase 7 midió los pares principales (texto ≥ 5,2:1; borde de controles 4,3:1). **No usar color como única señal.**

## Tipografía

- **Texto e interfaz:** IBM Plex Sans (400 y 600), con la pila `--font-sans`.
- **Títulos y texto de lectura:** Literata (`--font-serif`).
- Las fuentes son **propias** (`public/fonts/*.woff2`, con sus licencias): no se pide nada a terceros. Las dos de la interfaz se precargan; Literata se carga bajo demanda (`font-display: swap`).
- **Escala de 1,25 desde 18 px** (pensada para proyector): `--text-small` 16 px (mínimo absoluto), `--text-body`, `--text-lead`, `--text-3`, `--text-2` y `--text-display`. Todo el texto del canvas usa `--text-small`.

## Espaciado, forma y movimiento

- Espaciado: `--s1` a `--s8` (4, 8, 12, 16, 24, 32, 48 y 64 px).
- Radios: `--r-sm`, `--r-md`, `--r-lg`, `--r-round`.
- Bordes y foco: `--bw`, `--bw-sel`, `--ring` (3 px) y `--ring-offset`.
- Movimiento: `--motion-fast`, `--motion-base`, `--ease`. Con `prefers-reduced-motion: reduce` se anulan las transiciones.

## Tamaños de objetivo

El mínimo absoluto es **24 px** (WCAG 2.5.8); los controles usan `--control`, `--control-sm`, `--chip`, `--help` y `--thumb`, todos por encima. Una prueba E2E recorre los botones, selectores y etiquetas de opción y falla si alguno mide menos de 24 px. Los deslizadores quedan cubiertos por la excepción de "control equivalente": su valor se muestra y también se cambia con las flechas del teclado.

## Componentes (estado real)

| Componente | Archivo | Para qué sirve |
|---|---|---|
| Simulación y gráfica | `src/ui/SimulationView.tsx` | El péndulo y θ(t) en canvas, con descripción para lectores de pantalla ("En vivo") |
| Control de parámetro | `src/ui/ParamControl.tsx` | Etiqueta, deslizador, valor con unidad, nota y valores predefinidos |
| Opciones excluyentes | `src/ui/Segmented.tsx` | Grupo de radios con aspecto de botones (modo, modelo, velocidad) |
| Resultados | `src/ui/ResultsPanel.tsx` | Período (grande) y frecuencia |
| Más opciones | `src/ui/MoreOptions.tsx` | Panel lateral: modelo, comparación, masa, rozamiento, velocidad y datos para curiosos |
| Teoría | `src/ui/TheoryPanel.tsx` | Diálogo con ecuaciones y "qué es cada cosa"; atrapa el foco, deja el fondo `inert` y devuelve el foco al cerrar |
| Lección guiada | `src/ui/LessonCard.tsx` y los pasos (`PredictionStep`, `TestStep`, `CheckStep`, `ConclusionStep`) | Experimentos de cuatro etapas |
| Pantalla de error | `src/ui/AppErrorBoundary.tsx` | Mensaje fijo y botón de recarga si algo falla al dibujar |

El mapa completo de archivos está en `docs/CODEMAPS/`.

## Responsivo

Dos cortes: `max-width: 1100px` (estrecha el panel de opciones y el lateral, y compacta las opciones segmentadas) y `max-width: 900px` (una sola columna; la barra de acciones pasa al final). Las pruebas E2E con un perfil de teléfono comprueban que no hay desplazamiento horizontal y que Play queda a la vista.

## Accesibilidad aplicada

- Grupos de opciones como `radiogroup`; botones de alternancia con `aria-pressed`; el diálogo de teoría con `role="dialog"`, foco atrapado y devuelto, y fondo `inert`.
- Una región de estado persistente (`role="status"`) anuncia cada acción; el aviso visible con cifras no es región viva para no leer cada paso del deslizador.
- Errores con `role="alert"`; el canvas es `role="img"` con descripción y lectura "En vivo" enlazada.
- Foco visible de 3 px en `--focus` en todos los controles.

Pendiente: prueba manual con un lector de pantalla real (NVDA o VoiceOver); ver `docs/07-rendimiento-a11y-seo.md`.
