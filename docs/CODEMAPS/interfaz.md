# Interfaz de Usuario (src/ui, src/render, src/content, src/security)

**Generado el 2026-10-07** a partir del código. Si el código cambia, actualizar.

Componentes React, dibujo Canvas, contenido pedagógico, y configuración de seguridad.

---

## Estructura de módulos

```
src/
├── App.tsx                    ← Componente raíz (estado global, modos)
├── main.tsx                   ← Entry point (mount React)
├── tokens.css                 ← Variables CSS (colores, espacios)
├── styles.css                 ← Estilos globales (layout, responsive)
├── ui/
│   ├── [componentes principales]
│   ├── [módulos puros .ts]
│   └── [test files]
├── render/
│   ├── drawPendulum.ts        ← Dibuja péndulo y línea de referencia
│   ├── drawChart.ts           ← Dibuja gráfica θ(t) con dos series
│   ├── theme.ts               ← Parser CSS → temas Canvas
│   └── [test files]
├── content/
│   ├── types.ts               ← Interfaces (Experiment, LabContent, etc.)
│   ├── simplePendulumContent.ts ← Textos, ecuaciones, experimentos
│   ├── experimentFlow.ts      ← State machine de lecciones
│   └── [test files]
└── security/
    ├── csp.ts                 ← Content Security Policy (meta) y política de referencia
    └── headers.ts             ← Genera dist/_headers (cabeceras HTTP de Cloudflare Pages) a partir del HTML construido
```

---

## Componentes principales (ui/)

### Componentes de layout y contenedor

| Componente | Props | Responsabilidad |
|-----------|-------|-----------------|
| **SimulationView** | `{ phenomenon, params, running, speed, resetToken, showLinear, onError }` | Canvas del péndulo + gráfica; maneja resize y DPR |
| **LessonCard** | `{ experiments, experiment, flow, inlineItems, onSelectExperiment, onPredict, onAnswerCheck, onAdvance, onPrepare, onExit }` | Panel lateral de lecciones (Experimentos) |
| **ResultsPanel** | `{ results, highlightedKey? }` | Muestra salidas (T, f, τ, energía) |
| **MoreOptions** | `{ open, titleRef, onClose, model, onModelChange, specs, params, ... }` | Cajón "Más opciones" (solo Explorar) |
| **TheoryPanel** | `{ open, onClose, theory, results, formulaText, entries }` | Panel modal de teoría (ecuaciones, fórmulas) |

### Controles de parámetros

| Componente | Props | Responsabilidad |
|-----------|-------|-----------------|
| **ParamControl** | `{ spec, value, presets?, highlighted?, showNote?, onChange }` | Slider + input text + help icon para un parámetro |
| **ModelSelector** | `{ model, onChange, maxPhi0 }` | Radio buttons: Lineal / No lineal |
| **LinearizationToggle** | `{ showLinear, onToggle }` | Toggle: mostrar/ocultar punteada |
| **Segmented** | `{ value, onChange, options, name, ariaLabel }` | Botones de segmentación (Explorar / Experimentos) |

### Componentes de lecciones

| Componente | Props | Responsabilidad |
|-----------|-------|-----------------|
| **PredictionStep** | `{ experiment, flow, onPredict, onContinue }` | Paso 1: predicción del estudiante |
| **TestStep** | `{ step, inlineItems, onPrepare, onContinue }` | Paso 2: preparar valores y medir |
| **CheckStep** | `{ experiment, flow, onAnswer, onContinue }` | Paso 3: preguntas de verificación |
| **ConclusionStep** | `{ experiment, flow, onBack }` | Paso 4: síntesis y volver a lista |
| **ExperimentList** | `{ experiments, selected, onSelect }` | Lista de experimentos disponibles |
| **ChoiceList** | `{ options, selectedId, onSelect, labelId, locked?, verdict? }` | Opciones múltiples para predicción/verificación |
| **ContinueButton** | `{ enabled, onClick, reason?, secondary? }` | Botón de avance con validación |
| **StepIndicator** | `{ phase }` | Barra de progreso (4 fases) |

### Diálogo y errores

| Componente | Props | Responsabilidad |
|-----------|-------|-----------------|
| **AppErrorBoundary** | `{ children }` | Captura errores no manejados (fallback UI) |
| **ErrorFallback** | — | UI de error (mensaje amigable) |

---

## Módulos puros (lógica sin React)

### Ayuda y etiquetas (kidLabels.ts, helpEntries.ts, modelNotice.ts)

| Función/Const | Retorna | Uso |
|-----------------|---------|-----|
| `LAB_TITLE` | "Péndulo simple" | Encabezado App |
| `MODES` | Array `{id, label}` | Segmented selector |
| `MODEL_LABELS` | Record: modelo → nombre legible | ModelSelector |
| `MAIN_PARAM_KEYS` | ["L", "phi0", "g"] | Parámetros principales (lado izq.) |
| `MAIN_RESULT_KEYS` | ["T", "f"] | Resultados principales |
| `CURIOUS_RESULT_KEYS` | ["T0", "periodError", "omega0"] | Sección "Curioso" |
| `paramLabel(spec)` | `{ label, symbol, unit }` | ParamControl |
| `formatParamValue(key, value)` | String con formato | Display de valor |
| `formatResult(key, value?)` | String con formato + unidad | ResultsPanel |
| `PARAM_NOTES` | Record: clave → texto de ayuda | ParamControl |
| `buildHelpEntries(content, schema)` | Array de `HelpEntry` | TheoryPanel (3 textos por parámetro) |
| `describeModelNotice({ model, periodError, withinSmallAngle, ... })` | `ModelNotice \| null` | Aviso de divergencia |

### Gestión de experimentos (experimentEntry.ts, lessonLayout.ts, lessonProgress.ts)

| Función | Entrada | Salida | Uso |
|---------|---------|--------|-----|
| `paramsForExperimentStart(current, schema)` | Params actuales + schema | Params sin `b`, con defaults de experimento | Al iniciar experimento |
| `lessonInlineItems(step?)` | StepHighlight \| undefined | InlineItem[] (qué param/result mostrar inline) | LessonCard renderiza |
| `presetsVisible(inExperiment, step?)` | boolean, step | boolean | Mostrar preset buttons |
| `stageIndex(phase)` | FlowPhase | 0–3 | StepIndicator |
| `stageStatus(index, phase)` | number, FlowPhase | 'done' \| 'current' \| 'pending' | StepIndicator |
| `lessonTitle(flow, experiment)` | FlowState, Experiment | string (titulo del paso actual) | LessonCard header |
| `answerVerdict(answerId, correctOptionId)` | strings | 'correct' \| 'wrong' \| null | ChoiceList |
| `predictionVerdict(correct)` | boolean | `{icon, color, label}` | PredictionStep feedback |

### Validaciones y detalle UX (canvasSupport.ts, debounce.ts, escapeScope.ts, dprWatch.ts)

| Función | Responsabilidad |
|---------|-----------------|
| `canDrawCanvas(createCanvas)` | Detecta si el navegador soporta Canvas 2D |
| `watchDevicePixelRatio(win, onChange)` | Monitorea cambios de DPR (high-DPI) |
| `createDebouncer(delayMs, onValue, timers)` | Retrasa callback hasta dejar de cambiar valor |
| `useDebouncedValue(value, delayMs)` | Hook: valor con delay |
| `escapeClosesDrawer(activeEl, drawer, button)` | Lógica Escape: cierra cajón solo si apropriado |

### Anuncios para lectores de pantalla (announcements.ts)

| Función | Entrada | Salida | Uso |
|---------|---------|--------|-----|
| `modeAnnouncement(mode)` | 'explorar' \| 'experimentos' | Texto anuncio (ARIA live) | App |
| `runAnnouncement(event)` | 'play' \| 'pause' \| 'reset' | Texto anuncio | App |
| `resultsSummary(results)` | Results object | Resumen para lector | Posible futura integración |

### Descripción de canvas en tiempo vivo (liveDescription.ts)

| Función | Responsabilidad |
|---------|-----------------|
| `liveDue(stale, running, now, lastAt)` | ¿Debe actualizar descripción? (no más de 1 vez/s) |
| `describeLive(t, theta, omega)` | Texto: "t = 2s, θ = 12°, ω = 0.5 rad/s" (para lector) |

---

## Render Canvas (render/)

### drawPendulum.ts

| Función | Entrada | Salida | Garantía |
|---------|---------|--------|----------|
| `lengthFraction(lengthM)` | Largo en metros | Fracción de altura de canvas | 0 < f < 0.8 |
| `pendulumLayout(width, height, params, theme)` | Canvas dims, params, tema CSS → Colors | `{ pivotX, pivotY, length, ... }` | Geom. consistente |
| `drawPendulum(ctx, layout, state, theme, options?)` | Canvas context, layout, state, tema, `{showLinear?}` | void (dibuja directamente) | Péndulo + línea ref. + signos |

**Dibuja:**
- Eje de referencia (vertical) con marcas ±θ
- Barra del péndulo (color sólido)
- Masa (bolita en extremo)
- Signos + / − para ángulos
- Grid y rótulos si `showLinear = true`

### drawChart.ts

| Función | Entrada | Salida |
|---------|---------|--------|
| `timeTicks(tStart, tEnd)` | Rango de tiempo | Array de ticks "bonitos" |
| `chartYMaxDeg(amplitudeRad)` | Amplitud en rad | Max Y (deg) para escala |
| `drawChart(ctx, width, height, samples, amplitudeRad, options?)` | Canvas ctx, dims, samples, amplitud, `{showLinear?}` | void |

**Dibuja:**
- Ejes (X = tiempo, Y = ángulo en grados)
- Series: azul (numérica RK4), punteada (teórica amortiguada, solo si `showLinear`)
- Grid, ticks, rótulos
- Eje θ = 0 rotulado

### theme.ts

| Función | Entrada | Salida | Uso |
|---------|---------|--------|-----|
| `readCanvasTheme(styles, rootFontPx?)` | Lector de CSS | `CanvasTheme` (colores, grosor, fuentes) | drawPendulum, drawChart |
| `cssLengthToPx(value, rootFontPx, fallback)` | "1.5rem" o "24px" | número en px | Conversión CSS |
| `parseDashArray(value)` | "2,4" (string CSS) | [2, 4] (números) | Patrones de línea punteada |

**CanvasTheme contiene:**
```typescript
{
  pendulumColor: string,        // color barra
  massColor: string,             // color masa
  theoryColor: string,           // color punteada
  axisColor: string,
  gridColor: string,
  textColor: string,
  fontFamily: string,
  fontSize: number,
  lineWidth: number,
  dashArray: number[]
}
```

---

## Contenido pedagógico (content/)

### types.ts — Definición de estructura

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `ParamHelp` | `paramKey, origin, role, effect` | 3 textos por parámetro (HU-18) |
| `ResultHelp` | `resultKey, explanation` | Texto de ayuda para resultado |
| `ChoiceOption` | `id, text` | Opción múltiple en lección |
| `PredictStage` | `text, options, correct` | Paso 1: predicción |
| `ExperimentStep` | `title, text, highlightParamKey?, ... hints` | Cada paso de lección |
| `Experiment` | `id, title, steps, relatedParams, setup` | Definición de lección completa |
| `ModelTheory` | `title, equations[], validity, chartOrigin, signConvention` | Teoría por modelo |
| `LabContent` | `experiments, presets, theoryByModel, formulaDisplay, help` | Todo el contenido (singleton) |

### simplePendulumContent.ts — Datos pedagógicos

```typescript
export const simplePendulumContent: LabContent = {
  experiments: [
    { id: "..." , title: "...", steps: [...], ... },
    // ... más experimentos
  ],
  presets: {
    L: [{label: "1m", value: 1}, ...],
    g: [{label: "Tierra", value: 9.8}, ...],
    // ... más presets
  },
  theoryByModel: {
    'lineal': {
      title: "Péndulo lineal",
      equations: ["θ'' = −(g/L)·θ − b·θ'"],
      validity: "Válido para θ < 10°",
      // ...
    },
    'no-lineal': {
      title: "Péndulo real",
      equations: ["θ'' = −(g/L)·sen θ − b·θ'"],
      // ...
    }
  },
  formula: {
    describe(params, results): string  // p.ej. "T = 2π√(L/g) = 2.01 s"
  },
  help: {
    params: { L: {...}, g: {...}, ... },
    results: { T: {...}, f: {...}, ... }
  }
}
```

### experimentFlow.ts — State machine

| Función | Entrada | Salida | Semántica |
|---------|---------|--------|-----------|
| `initialFlowState(experiment)` | Experiment | `FlowState{phase:'predict', prediction:null, ...}` | Inicio lección |
| `predict(state, optionId)` | FlowState, selección | `{...state, prediction: optionId}` | Estudiante elige predicción |
| `answerCheck(state, optionId)` | FlowState, respuesta | `{...state, checkAnswer: optionId}` | Responde pregunta de verificación |
| `canAdvance(state)` | FlowState | boolean | ¿Puede ir al siguiente paso? |
| `advance(state, experiment)` | FlowState, Experiment | `FlowState{phase: next, stepIndex: i+1}` | Pasar a siguiente fase |
| `isPredictionCorrect(state, experiment)` | FlowState, Experiment | boolean | Verificar predicción (lógica) |

**Fases:** 'predict' → 'steps' → 'check' → 'conclusion'

---

## Seguridad (security/)

### csp.ts

| Función | Entrada | Salida | Uso |
|---------|---------|--------|-----|
| `contentSecurityPolicy(html)` | HTML string | CSP header meta-equiv | Inyecta en index.html |
| `injectCsp(html)` | HTML string | HTML con CSP dentro | Build process |

**Política:**
- Script: `'self'` + Vite dev server (`ws://localhost:*`)
- Style: `'self'` + `'unsafe-inline'` (CSS en tokens.css)
- Img/Font/Media: `'self'` + data URIs
- Frame: `'none'` (no iframes)
- Connect: `'self'` (no API, solo local)

---

## Estilos (CSS)

### tokens.css

```css
:root {
  --color-primary: #0066cc;
  --color-danger: #cc0000;
  --space-s1: 0.25rem;  /* 4px */
  --space-s2: 0.5rem;   /* 8px */
  /* ... más variables */
}
```

**Estructura:** 8 niveles de espaciado, 6+ colores semánticos, tipografía escalada.

### styles.css

| Selector | Responsabilidad |
|----------|-----------------|
| `.app` | Layout principal (grid) |
| `.stage` | Canvas container |
| `.aside` | Panel lateral (sticky en desktop, fixed en mobile) |
| `.drawer` | Cajón "Más opciones" (modal en mobile) |
| `.params` | Grid de ParamControl |
| `.btn` | Botones base |
| `.btn.play` | Botón Play (estilo especial) |
| `.notice` | Aviso de divergencia |
| `.sr-only` | Screen reader only (aria-live) |
| `@media (max-width: 900px)` | Responsive (móvil) |

---

## Dependencias internas

```
App.tsx
├── ui/kidLabels → LAB_TITLE, MODES, MODEL_LABELS, MAIN_PARAM_KEYS
├── ui/SimulationView
│   ├── render/drawPendulum
│   ├── render/drawChart
│   ├── render/theme
│   ├── ui/canvasSupport
│   ├── ui/dprWatch
│   └── ui/useDebouncedValue
├── ui/ParamControl
│   ├── ui/kidLabels → paramLabel, PARAM_NOTES
│   └── ui/helpEntries → buildHelpEntries
├── ui/ResultsPanel
│   ├── ui/kidLabels → formatResult, MAIN_RESULT_KEYS
│   └── content/simplePendulumContent → results help
├── ui/ModelSelector
├── ui/MoreOptions
├── ui/TheoryPanel
│   └── content/simplePendulumContent → theory
└── ui/LessonCard
    ├── content/experimentFlow → advance, predict, answerCheck
    ├── ui/lessonLayout, lessonProgress
    └── ui/[PredictionStep, TestStep, CheckStep, ConclusionStep]
```

---

## Observaciones

1. **Componentes sin estado:** ParamControl, ResultsPanel, ChoiceList, etc. reciben props (controlled components); el estado vive en App.tsx.
2. **Modales accesibles:** TheoryPanel usa `inert` + focus trap; Escape cierra.
3. **Contenido data-driven:** todo en `simplePendulumContent.ts`, no hardcodeado en JSX.
4. **Responsivo:** dos cortes en `styles.css`: hasta 1100 px se estrechan los paneles y hasta 900 px pasa a una sola columna con la barra de acciones al final (`isNarrow` en `App.tsx`).
5. **Canvas DPR-aware:** watchDevicePixelRatio detecta zoom/rotación y repinta con pixeles reales.
6. **Anuncios para a11y:** ARIA live regions anuncian cambios sin recargar (`modeAnnouncement`, `runAnnouncement`, `resultsSummary`).
7. **Privacidad:** no localStorage, no tracking, no envíos a servidor.

---

**Revisar también:**
- [`INDEX.md`](./INDEX.md) — Flujo de datos general
- [`docs/07-rendimiento-a11y-seo.md`](../07-rendimiento-a11y-seo.md) — A11y y optimizaciones
- [`docs/02-diseno.md`](../02-diseno.md) — Wireframes y decisiones de UX
