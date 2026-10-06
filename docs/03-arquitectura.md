# Fase 3 — Arquitectura de la iteración 2 (péndulo simple con modos, fricción y teoría)

- **Fecha:** 2026-10-06
- **Insumos:** `docs/01-prd.md` (HU-11 a HU-19), `docs/02-diseno.md` (dirección C), código actual (`src/engine`, `src/content`, `src/render`, `src/ui`, `src/App.tsx`).
- **Alcance:** solo el laboratorio MAS. Sin backend, sin base de datos, sin API: no hay `docs/03-api.md` ni `docs/03-datos.md` separados; el modelo de datos en memoria está en la sección 4 de este documento.
- **Numeración de ADR:** `M1`–`M5` (iteración 2 del MAS) para no chocar con los ADR 1–9 del spec de diseño ni con el ADR 10 del spec del péndulo compuesto.

## 1. Qué cambia y qué no

| Capa | Hoy | Cambio |
|---|---|---|
| `engine/` | `simplePendulum` integra siempre `sen θ`; teoría lineal sin fricción | Fábrica `createPendulum(model)` con dos fenómenos (lineal, no lineal); parámetro `b`; teoría lineal amortiguada |
| `engine/simulation.ts`, `integrators.ts`, `validate.ts`, `types.ts` | Genéricos | **Sin cambios** |
| `content/` | Textos de un solo modelo | Contenido por modo: ecuaciones, origen de la gráfica, signos, ayuda por parámetro en 3 textos, experimentos por modo |
| `render/` | Gráfica con ambas curvas siempre | `drawChart` recibe `showLinear`; dibuja el eje θ = 0 rotulado; `drawPendulum` dibuja la vertical de referencia y "+ / −" |
| `ui/` | `ParamControl`, `ResultsPanel`, `SimulationView`, `ExperimentPanel` | Nuevos: `ModelSelector`, `TheoryPanel`; `ParamControl` usa la ayuda de 3 textos |
| `App.tsx` | Un fenómeno fijo | Estado `model` y `showLinear`; elige el fenómeno; reinicia y ajusta φ₀ al cambiar de modo |

El péndulo compuesto (spec 2026-09-29) y su registro de laboratorios **no se tocan**: esta iteración no depende de él y no lo bloquea.

## 2. Decisiones (ADR)

### M1 — Dos fenómenos desde una fábrica, no un parámetro "modo" dentro de uno solo
- **Decisión:** `createPendulum('lineal' | 'no-lineal')` devuelve un `Phenomenon` distinto por modo (`id` `mas-pendulo-lineal` y `mas-pendulo-no-lineal`). `App` guarda el modo elegido y pasa el fenómeno correspondiente a `SimulationView`.
- **Alternativas:** (a) un `Phenomenon` con un parámetro numérico `modo`; (b) dos archivos copiados.
- **Por qué:** `Phenomenon.derivatives` es una función pura de estado y parámetros; con dos objetos cada ecuación queda a la vista, se prueba por separado y cambiar de modo es cambiar el objeto (la simulación ya se reconstruye cuando cambia `phenomenon`). El modo no es un parámetro físico que el estudiante ajusta con un deslizador, así que no pertenece a `paramSchema`. (a) mezcla ecuación y selector; (b) duplica código.
- **Consecuencia:** cambiar de modo reinicia la simulación (HU-11).
- **Regla de identidad (revisión `architect`):** `App` usa solo las constantes de módulo `pendulumModels[model]`; `createPendulum` es un detalle interno que se ejecuta una vez al cargar el módulo. Llamarla dentro del render crearía un objeto nuevo en cada render y reiniciaría la simulación (el efecto de `SimulationView` depende de la identidad de `phenomenon`).
- **Compatibilidad:** `simplePendulum` se conserva como alias exportado de `pendulumModels['no-lineal']`, para no romper los tres archivos que hoy lo importan.

### M2 — Ecuaciones y teoría
- **Lineal:** `θ'' = −(g/L)·θ − b·θ'`.
- **No lineal:** `θ'' = −(g/L)·sen θ − b·θ'`.
- **Curva punteada (teoría) en ambos modos:** solución analítica de la ecuación lineal amortiguada con θ(0) = φ₀, θ'(0) = 0:
  - β = b/2, ω₀ = √(g/L), ω_d = √(ω₀² − β²) (subamortiguado, garantizado por M3).
  - `θ(t) = φ₀·e^(−βt)·[cos(ω_d·t) + (β/ω_d)·sen(ω_d·t)]`.
  - `ω(t) = −φ₀·(ω₀²/ω_d)·e^(−βt)·sen(ω_d·t)`.
  - Con b = 0 se reduce a `φ₀·cos(ω₀t)`, que es exactamente lo que hoy dibuja la app (compatibilidad con las 83 pruebas).
- **Por qué la punteada incluye fricción:** así la comparación sigue siendo justa (PRD HU-15): la diferencia entre curvas se debe solo a `sen θ ≈ θ`, no a que una tenga fricción y la otra no.
- **En modo lineal** la azul y la punteada resuelven la misma ecuación; deben coincidir con error relativo < 1×10⁻⁶ (RK4 con dt = 0,005 s ya cumplía eso sin fricción; se re-verifica con fricción).

### M3 — Rango de la fricción
- `b` en 1/s, mínimo 0, máximo **0,4**, paso 0,01, por defecto 0.
- **Por qué:** el movimiento deja de oscilar cuando b ≥ 2ω₀. El peor caso de `paramSchema` es g = 1 m/s² y L = 5 m: ω₀ = √(1/5) ≈ 0,447 rad/s ⇒ 2ω₀ ≈ 0,894. Con b ≤ 0,4 se cumple b < 2ω₀ en todo el rango (razón b/2ω₀ ≤ 0,45), así que la fórmula subamortiguada de M2 es siempre válida y ω_d > 0.
- **Sin rama defensiva:** como la condición b < 2ω₀ está garantizada por el rango, no se programa un caso crítico/sobreamortiguado (sería código inalcanzable; devolver la solución sin amortiguar sería físicamente falso). `theory()` documenta la precondición y una prueba verifica que el peor caso del esquema (g = 1, L = 5, b = 0,4) cumple ω_d > 0.
- **Significado de b:** es el coeficiente de fricción **por unidad de masa** (b = c/m, en 1/s). Así la ecuación no contiene m y HU-12 se sostiene. Se dice así en la ayuda de `b`.
- **Fuera de rango:** lo valida `validateParams` (mensaje en español, conserva el último valor válido), sin cambios de código.

### M4 — Rango del ángulo por modo
- `phi0` máximo 15° en lineal y 60° en no lineal, mínimo 1°, paso 1°. Se logra con dos `paramSchema` (uno por fenómeno), sin tocar `validate.ts`.
- Al cambiar de modo, si el φ₀ escrito supera el máximo del modo nuevo, `App` lo ajusta al máximo y muestra un aviso (`role="status"`: "φ₀ se ajustó a 15° (máximo de ese modo)"). Si el texto del campo no es un número válido, `validateParams` falla y el efecto actual conservaría el último φ₀ válido, que podría ser mayor que el máximo del modo lineal (p. ej. 40°). Para evitarlo, al cambiar de modo `App` también recorta `params.phi0` al máximo del modo nuevo (no solo `raw`), y `validation` (`useMemo`) depende de `[raw, phenomenon]`, no solo de `raw`. Hallazgo de la revisión `architect`; se prueba en la rebanada 3.

### M5 — Lo que se calcula y se muestra (salidas)
- Se mantienen `theta`, `omega`, `omega0`, `T0`, `T`, `f`, `energy`. `T` (real, sin fricción) usa el cociente por media aritmético-geométrica (`engine/elliptic.ts`, ya existente). En modo lineal `T = T0`.
- Nuevas salidas: `tau = 2/b` (tiempo de decaimiento de la amplitud) solo si b > 0, y `periodError` = error de la aproximación lineal **calculado siempre con `pendulumPeriodFactor(φ₀) − 1`** (el período real de la ecuación no lineal), no a partir de `T`/`T0` del modo. Así, en modo lineal el aviso dice cuánto se equivocaría el modelo respecto de un péndulo real y no "0 %".
- **Aviso de divergencia (HU-14):** `modelLimits` con `valid: false` cuando φ₀ > 10° (texto con `periodError` y por qué se separan las curvas). En lineal el mismo umbral avisa que ya no es buena aproximación (el máximo de 15° se mantiene por pedido del profesor). **Migración de prueba:** hoy el umbral de aviso es 15° (`simplePendulum.test.ts`); pasa a 10° por la corrección del profesor ("menores a 10°").
- **Energía:** en modo no lineal `½mL²ω² + mgL(1 − cos θ)`; en modo lineal `½mL²ω² + ½mgLθ²`, que es la energía conservada de ese modelo. Se aclara en la ayuda del resultado.
- **Independencia de la masa (HU-12):** `m` queda en `paramSchema`, pero ninguna función de `derivatives` ni `theory` la lee; solo `energy` la usa. Se prueba explícitamente.
- **Fricción y período:** `T` es el período sin fricción; con b > 0 el período amortiguado real `2π/ω_d` no se muestra como resultado (queda en el texto de ayuda de b) para no confundir. Decisión documentada por si se cuestiona en la sustentación.

## 3. Interfaces (contratos)

```ts
// engine/phenomena/pendulum.ts
export type PendulumModel = 'lineal' | 'no-lineal';
export function createPendulum(model: PendulumModel): Phenomenon;
export const pendulumModels: Record<PendulumModel, Phenomenon>;

// engine/phenomena/dampedLinear.ts   (puro, sin React)
export function dampedLinearTheory(p: { g: number; L: number; phi0: number; b: number }, t: number): { theta: number; omega: number };

// render/drawChart.ts
export function drawChart(ctx, width, height, samples, amplitudeRad, options?: { showLinear?: boolean }): void; // por defecto true

// content/types.ts
export interface ParamHelp { paramKey: string; origin: string; role: string; effect: string; } // 3 textos de HU-18
export interface ModelTheory { title: string; equations: string[]; validity: string; chartOrigin: string; signConvention: string; }
export interface LabContent { /* actual */ theoryByModel: Record<PendulumModel, ModelTheory>; experimentsByModel: Record<PendulumModel, Experiment[]>; }
```

`explanation` actual de `ParamHelp` se reemplaza por `origin`/`role`/`effect`; `ResultHelp` se mantiene. Es un cambio de tipo: `tsc` obliga a migrar todos los textos y `simplePendulumContent.test.ts` valida que cada parámetro tenga los tres textos no vacíos.

## 4. Modelo de datos en memoria (no hay persistencia)

| Estado | Dónde vive | Valores |
|---|---|---|
| `model` | `App` (`useState`) | `'lineal' \| 'no-lineal'`, inicial `'no-lineal'` (la "real" que sugirió el profesor) |
| `showLinear` | `App` | `boolean`, inicial `true`; se pasa a `SimulationView` y **no** reinicia la simulación |
| `raw` / `params` | `App` | Igual que hoy, más la clave `b` |
| `notice` | `App` | Mensaje de ajuste de φ₀ o `null` |
| Muestras de la gráfica | `Simulation.samples` | Igual que hoy (máximo 1000) |

Nada se guarda en `localStorage` ni se envía a ningún servidor (privacidad sin cambios).

## 5. Flujo de datos

```
raw (texto) ──validateParams(schema del modo)──▶ params ──▶ new Simulation(pendulumModels[model], params)
                                                              │ RK4 sobre derivatives(modo)
                                                              ▼
                                         samples[{ t, values(azul), theory(punteada, amortiguada) }]
                                                              ▼
                                      drawChart(showLinear) · drawPendulum · ResultsPanel · TheoryPanel
```

Cambiar `model`: reconstruye `Simulation`, ajusta φ₀ si hace falta, sale del experimento activo y lo anuncia con `aria-live`. Cambiar `showLinear`: solo repinta la gráfica con las mismas muestras.

**Detalle de implementación de `showLinear` (revisión `architect`):** `SimulationView` guarda `showLinear` en una `ref` (igual que ya hace con `running` y `speed`) y **no** lo agrega a las dependencias del efecto que crea la `Simulation` (eso la reiniciaría). Un efecto aparte con dependencia `[showLinear]` llama a `paintCanvases(simRef.current)`, porque con la simulación en pausa el bucle no repinta mientras `sim.t` no cambie.

## 6. Manejo de errores

| Caso | Tratamiento |
|---|---|
| Parámetro inválido o fuera de rango (incl. `b`) | `validateParams`, mensaje en español, último valor válido conservado |
| φ₀ mayor que el máximo del modo nuevo | Se ajusta al máximo y se avisa |
| Valor no finito en el cálculo | Guarda existente en `Simulation` (se detiene y pide Reiniciar) |
| ω₀² ≤ β² en la teoría amortiguada | Cae a la solución sin amortiguar (no lanza) |

## 7. Estrategia de pruebas (TDD, Vitest)

1. `dampedLinear.test.ts`: con b = 0 coincide con `φ₀·cos(ω₀t)`; la amplitud decae como `e^(−βt)`; coincide con la integración RK4 de la ecuación lineal amortiguada. **Tolerancia:** error **absoluto** sobre θ normalizado por φ₀ (no relativo punto a punto, que explota cerca de θ = 0); ≤ 1×10⁻⁶ en el caso típico (L = 1) y ≤ 1×10⁻⁵ en el extremo (L = 0,1, ω₀ ≈ 9,9 a 15,8 rad/s, 10 s); peor caso del esquema cumple ω_d > 0.
2. `pendulum.test.ts`: modo lineal: azul y punteada coinciden; modo no lineal con b = 0 y φ₀ = 40°: período medido ≈ `T` de la AGM (error relativo < 1×10⁻³); **dos masas distintas dan θ(t), T y f idénticos (tolerancia 1×10⁻¹²)** y energía distinta (HU-12); rangos de φ₀ por modo; `b` fuera de 0–0,4 rechazado.
3. Regresión: las 83 pruebas actuales siguen en verde salvo estas **migraciones previstas** (identificadas en la revisión):
   - `simplePendulum.test.ts`: la comparación de parámetros por defecto con `toEqual({L, phi0, g, m})` pasa a incluir `b: 0`; el umbral del aviso de ángulo pasa de 15° a 10°.
   - `drawChart.test.ts`: la leyenda "Aprox. lineal" se conserva; se añade la prueba de `showLinear`.
   - Los tres archivos que importan `simplePendulum` siguen funcionando por el alias (M1).
   - **Experimentos:** cada `prepareParams` incluye `b: 0` para que "Preparar valores" no herede una fricción dejada por el estudiante y los períodos de los experimentos sigan siendo los publicados.
4. `drawChart.test.ts`: con `showLinear = false` no dibuja la serie punteada; el eje θ = 0 se rotula.
5. `simplePendulumContent.test.ts`: tres textos no vacíos por parámetro; teoría y experimentos para ambos modos.
6. E2E (Fase 10): cambiar de modo, ocultar/mostrar la punteada con teclado, error de `b`, ajuste de φ₀.

## 8. Orden de construcción (rebanadas, alineado con la prioridad del PRD)

1. Motor: `dampedLinear`, `createPendulum`, parámetro `b`, salidas nuevas (HU-11, 12, 15 en el motor).
2. Gráfica y dibujo: `showLinear`, eje θ = 0, signos (HU-13, HU-16).
3. UI: `ModelSelector`, botón de linealización, aviso de ajuste de φ₀ (HU-11, 13).
4. Contenido y `TheoryPanel`: ecuaciones, origen, signos, divergencia (HU-14, 16, 17).
5. Ayuda de parámetros en 3 textos y aviso de masa (HU-12, 18).
6. Experimentos por modo (HU-19). **Opcional dentro de la semana:** se reutilizan los experimentos actuales en el modo no lineal y se añade solo uno nuevo para el lineal; `ModelTheory` se limita a los campos que las rebanadas 4 y 5 realmente muestran.

## 9. Riesgos de arquitectura

- El cambio de tipo en `ParamHelp` toca todo el contenido: se mitiga con `tsc` y el test de contenido.
- No mostrar el período amortiguado puede cuestionarse en la sustentación; queda documentado en M5.
- Ecuaciones del profesor aún no recibidas (R-2): `ModelTheory.equations` es texto, reemplazarlas no cambia código.
