# Motor de Simulación (src/engine)

**Generado el 2026-10-07** a partir del código. Si el código cambia, actualizar.

Núcleo de física: validación, integración numérica RK4, modelos de fenómenos (lineal y no lineal), y funciones especiales (AGM).

---

## Estructura de módulos

```
src/engine/
├── types.ts             ← Tipos base (Params, State, Phenomenon, Sample)
├── numbers.ts           ← Utilidades (parseDecimal, formatNumber, DEG_TO_RAD)
├── validate.ts          ← Validación y ajuste de parámetros
├── integrators.ts       ← RK4 (Runge-Kutta 4to orden)
├── elliptic.ts          ← AGM para período exacto de péndulo
├── simulation.ts        ← Clase Simulation (loop de integración)
├── modelSwitch.ts       ← Cambio de modelo con ajuste de φ₀
├── phenomena/
│   ├── pendulum.ts      ← Fábrica: crea fenómeno (lineal o no lineal)
│   ├── simplePendulum.ts ← Alias histórico de pendulum['no-lineal']
│   └── dampedLinear.ts  ← Solución analítica de ecuación amortiguada
└── [test files]         ← Pruebas unitarias paralelas
```

---

## Tipos e interfaces (types.ts)

| Tipo/Interfaz | Responsabilidad | Usado por |
|---------------|-----------------|-----------|
| `Params` | `Record<string, number>` — parámetros físicos seguros (L, g, m, phi0, b) | Simulation, phenomena, App |
| `State` | `Record<string, number>` — estado instantáneo (theta, omega, energía) | integrators, Simulation |
| `ParamSpec` | Schema de un parámetro: label, min, max, step, defaultValue | UI (ParamControl), validate.ts |
| `ModelLimit` | `{ id, evaluate(params): valid + message }` — restricción por modelo | pendulum.ts, App |
| `Phenomenon` | Interfaz contrato: initialState, derivatives, outputs, theory | Simulation, App |
| `Sample` | `{ t, values, theory }` — muestra de integración RK4 | Simulation, render |

**Garantías:**
- `Params` siempre contiene números válidos (validadas por `validateParams`)
- `State` contiene solo valores finitos (Simulation detiene en NaN/Infinity)
- `Phenomenon` es immutable durante la simulación (la identidad del objeto es lo que reinicia)

---

## Validación (validate.ts)

| Función | Parámetros | Retorna | Garantía |
|---------|-----------|---------|----------|
| `validateParams(schema, raw)` | Spec[], Record<string, string> | `{ valid, params, errors }` | Params seguro o error legible |
| `clampToSpec(spec, value)` | ParamSpec, number | number | value en [min, max] |
| `defaultParams(schema)` | ParamSpec[] | Params | Objeto Params con valores por defecto |

**Entrada:** "1,5" (texto con coma decimal, del input HTML)  
**Salida:** 1.5 (número) o `errors: "Valor inválido"`  
**Uso:** Detecta entrada vacía, no numérica, fuera de rango; mantiene último valor válido

---

## Números (numbers.ts)

| Función | Entrada | Salida | Uso |
|---------|---------|--------|-----|
| `parseDecimal(input)` | "1,5" o "1.5" | 1.5 o null | Input parsing |
| `formatNumber(value, decimals?)` | 1.234, 2 | "1,23" | Display (UI y raw output) |
| `DEG_TO_RAD` | constante | π/180 | Conversión ángulos |

**Formato:** coma decimal (español), sin separadores de miles.

---

## Integración numérica (integrators.ts)

| Función | Fórmula | Parámetros |
|---------|---------|-----------|
| `rk4Step(f, state, dt)` | Runge-Kutta 4to orden | f = derivatives, state = {theta, omega, ...}, dt = 0.005 s |

**Retorna:** state después de dt  
**Garantía:** Estable para dt ≤ 0.005 s en rango de parámetros del esquema (verificado en tests)

---

## Funciones especiales (elliptic.ts)

| Función | Entrada | Salida | Uso |
|---------|---------|--------|-----|
| `agm(a, b)` | números > 0 | Media aritmético-geométrica (número) | Cálculo del período |
| `pendulumPeriodFactor(theta0Rad)` | Ángulo inicial (rad) | Factor de corrección (número) | Período exacto: T = T0 · factor |

**Fórmula de período exacto:** T = (4/π) · √(L/g) · K(sin²(θ₀/2)), donde K es la integral elíptica completa de 1er tipo (calculada via AGM).

---

## Simulación (simulation.ts)

### Clase: Simulation

```typescript
constructor(phenomenon: Phenomenon, params: Params, options?: SimulationOptions)
```

| Propiedad | Tipo | Inicial | Mutable |
|-----------|------|---------|--------|
| `phenomenon` | Phenomenon | — | No |
| `params` | Params | — | No |
| `state` | State | phenomenon.initialState(params) | Sí (dentro de loop) |
| `t` | number | 0 | Sí |
| `samples` | Sample[] | [] | Sí |
| `error` | string \| null | null | Sí |
| `timeScale` | number | 1 | Sí |

| Método | Qué hace | Retorna |
|--------|----------|---------|
| `advance(realTimeMs)` | Integra RK4 múltiples pasos hasta llenar realTimeMs. Si NaN/Infinity → error y parada | void |
| `reset()` | Vuelve a t=0 y state inicial; vacía samples | void |
| `recordSample()` | Guarda (t, state, theory) en samples | void |

**Límites configurables:**
- `dt` = 0.005 s (paso base RK4)
- `maxFrameTime` = 0.1 s (máx integración por frame)
- `sampleEvery` = 2 (cada 2 pasos RK4 se graba muestra)
- `maxSamples` = 1000 (se descartan viejas si se alcanza)

**Garantía:** Si phenomenon o params cambian, crea nueva Simulation (identidad de objeto detectada por React).

---

## Fenómenos (phenomena/)

### Fábrica: pendulum.ts

```typescript
export type PendulumModel = 'lineal' | 'no-lineal';

export function createPendulum(model: PendulumModel): Phenomenon

export const pendulumModels: Record<PendulumModel, Phenomenon>
  = { lineal: {...}, 'no-lineal': {...} }
```

**Cada Phenomenon contiene:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | "mas-pendulo-lineal" o "mas-pendulo-no-lineal" |
| `name` | string | "Péndulo (aproximación lineal)" o "Péndulo (real)" |
| `paramSchema` | ParamSpec[] | Distintos rangos de φ₀ por modo |
| `modelLimits` | ModelLimit[] | Restricción: φ₀ > 10° avisa de error de aproximación |
| `initialState(params)` | función | { theta: params.phi0 \* DEG_TO_RAD, omega: 0, ... } |
| `derivatives(state, params)` | función | RHS de ODE (lineal o sen θ) |
| `outputs(state, params)` | función | Calcula T, f, τ, error, energía |
| `theory(params, t)` | función | Solución teórica en t (via AGM y amortiguamiento) |

### Lineal: θ'' = −(g/L)·θ − b·θ'

| Derivada | Fórmula |
|----------|---------|
| `dθ/dt` | ω |
| `dω/dt` | −(g/L)·θ − b·ω |

**Rango φ₀:** 1°–15°

### No lineal: θ'' = −(g/L)·sen θ − b·θ'

| Derivada | Fórmula |
|----------|---------|
| `dθ/dt` | ω |
| `dω/dt` | −(g/L)·sen(θ) − b·ω |

**Rango φ₀:** 1°–60°

### Teoría amortiguada (dampedLinear.ts)

```typescript
export function dampedLinearTheory(
  p: { g, L, phi0, b },
  t: number
): { theta, omega }
```

**Precondición:** b < 2ω₀ (subamortiguado, garantizado por rango b ≤ 0.4)

**Fórmula:** θ(t) = φ₀·e^(−βt)·[cos(ω_d·t) + (β/ω_d)·sen(ω_d·t)]

Donde:
- β = b/2
- ω₀ = √(g/L)
- ω_d = √(ω₀² − β²)

**Con b = 0:** reduce a φ₀·cos(ω₀·t) (compatibilidad histórica)

---

## Cambio de modelo (modelSwitch.ts)

| Función | Entrada | Salida | Uso |
|---------|---------|--------|-----|
| `switchModel({ raw, params, nextSchema })` | Parámetros actuales y schema nuevo | `{ params (recortado), notice (string \| null) }` | App.tsx cambio de modelo |
| `describeModelChange({ adjustedNotice, modelName, experimentClosed })` | Detalles del cambio | Texto para anuncio (ARIA live) | App.tsx anuncio |

**Lógica:**
1. Si φ₀_actual > φ₀_max_nuevo, ajusta y genera aviso
2. Recorta φ₀ en params (no solo raw), por si el input es inválido
3. Mantiene otros parámetros (L, g, m, b)

---

## Exportaciones públicas (contrato)

| Módulo | Exports |
|--------|---------|
| types.ts | Params, State, ParamSpec, ModelLimit, Phenomenon, Sample |
| numbers.ts | DEG_TO_RAD, parseDecimal, formatNumber |
| validate.ts | ValidationResult, validateParams, clampToSpec, defaultParams |
| integrators.ts | rk4Step |
| elliptic.ts | agm, pendulumPeriodFactor |
| simulation.ts | SimulationOptions, Simulation (class) |
| phenomena/pendulum.ts | PendulumModel, createPendulum, pendulumModels |
| phenomena/simplePendulum.ts | simplePendulum (alias) |
| phenomena/dampedLinear.ts | DampedLinearParams, dampedLinearTheory |
| modelSwitch.ts | switchModel, describeModelChange |

---

## Dependencias internas

```
App.tsx
├── validateParams(schema)
├── defaultParams(schema)
├── clampToSpec(spec, value)
├── formatNumber(value)
├── pendulumModels[model]
├── switchModel({ ... })
└── describeModelChange({ ... })

SimulationView.tsx
└── new Simulation(phenomenon, params)
    ├── phenomenon.initialState(params)
    ├── phenomenon.derivatives(state, params)
    ├── phenomenon.outputs(state, params)  ◄── yields T, f, energy, etc.
    ├── phenomenon.theory(params, t)       ◄── yields punteada
    └── rk4Step(derivatives, state, dt)
```

---

## Observaciones

1. **No hay tipos parametrizados complejos:** Params y State son simples Records, lo que evita errores de tipado pero requiere validación en tiempo de ejecución (solido por `validateParams`).
2. **Phenomenon es immutable:** cambiar el objeto (App state) es lo que reinicia la simulación; nunca se muta dentro.
3. **Teoría amortiguada en ambos modos:** garantiza comparación justa (HU-15 del PRD).
4. **Masa no se usa en derivatives:** pero aparece en paramSchema y energy (para enseñanza física completa, HU-12).
5. **MAX_TIME_SCALE = 4:** limite por seguridad (UI ofrece hasta 2×, buffer interno).

---

**Revisar también:**
- [`INDEX.md`](./INDEX.md) — Flujo de datos general
- [`docs/03-arquitectura.md`](../03-arquitectura.md) — ADRs M1–M5 (decisiones de diseño)
- [`docs/10-pruebas.md`](../10-pruebas.md) — Estrategia de pruebas (dampedLinear, pendulum, etc.)
