# Codemaps — Índice del Simulador de Física

**Generado el 2026-10-07** a partir del código. Si el código cambia, actualizar.

## Descripción general

Simulador web interactivo del péndulo simple para estudiantes de 10° y 11°. React 19 + TypeScript 7 estricto + Vite 8, sin backend ni base de datos. Dos modos: **Explorar** (juego libre con parámetros) y **Experimentos** (lecciones guiadas con predicción y verificación).

**Responsables actuales:**
- Julián Andrés Vargas Sepúlveda (Ing. Sistemas) — Motor y simulación
- Sebastián Baquero Álvarez (Ing. Sistemas) — Interfaz y UX
- Brayan Fernando Díaz (Físico) — Modelos e integración pedagógica
- Camilo Velasco (Ing. Sistemas) — Dirección

---

## Arquitectura en capas

```
┌────────────────────────────────────────────────────────────┐
│                         App (React)                        │
│  • Estado global (parámetros, modelo, modo)               │
│  • Enrutamiento de modos (Explorar ↔ Experimentos)       │
└──────────────────────┬─────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐  ┌──────────┐  ┌──────────────┐
   │   UI    │  │ Content  │  │  SimView     │
   │ render  │  │          │  │ (canvas)     │
   │component│  │(pedagógica│ │              │
   │         │  │)          │  │              │
   └────┬────┘  └────┬─────┘  └─────┬────────┘
        │             │              │
        └──────────────┼──────────────┘
                       │ (parámetros)
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐  ┌──────────┐  ┌──────────────┐
   │ Render  │  │  Engine  │  │   Content    │
   │(canvas) │  │ (física) │  │  (textos)    │
   └─────────┘  └──────────┘  └──────────────┘
```

---

## Flujo de datos

```
Parámetros (raw string)
    │
    ▼
[validateParams] ◄──── paramSchema (depende del modelo)
    │
    ▼
Params (números seguros)
    │
    ▼
[new Simulation(phenomenon, params)]
    │
    ├─ RK4 sobre derivatives(modelo)
    │
    ▼
Samples [{ t, values(azul), theory(punteada amortiguada) }]
    │
    ├──▶ [drawChart] ──▶ Canvas de gráfica
    │
    ├──▶ [drawPendulum] ──▶ Canvas del péndulo
    │
    ├──▶ [ResultsPanel] ──▶ Salidas numéricas (T, f, τ, etc.)
    │
    └──▶ [TheoryPanel] ──▶ Panel de teoría (solo lectura)
```

**Cambios de estado:**
- **Modelo:** reconstruye `Simulation`, ajusta φ₀, reinicia y sale del experimento activo.
- **showLinear:** solo repinta la gráfica (no reconstruye la simulación).
- **Modo (Explorar ↔ Experimentos):** cambia la UI lateral; en Experimentos no hay cajón de "Más opciones".

---

## Mapas temáticos

| Tema | Archivo | Descripción |
|------|---------|-------------|
| **Motor de física** | [`motor.md`](./motor.md) | `src/engine/**`: tipos, integrador RK4, validación, modelos (lineal y no lineal), ecuaciones amortiguadas, AGM para período exacto |
| **Interfaz y render** | [`interfaz.md`](./interfaz.md) | `src/ui/**`, `src/render/**`, `src/content/**`, `src/security/**`: componentes React, dibujo Canvas, contenido pedagógico |
| **Pruebas** | [`pruebas.md`](./pruebas.md) | Unitarias (Vitest), e2e (Playwright), cobertura, estrategia de fuzzing |

---

## Archivos de configuración (raíz)

| Archivo | Responsabilidad |
|---------|-----------------|
| `package.json` | Dependencias, scripts (dev, build, test, test:e2e, smoke) |
| `tsconfig.json` | TypeScript estricto (noImplicitAny, strict, etc.) |
| `vite.config.ts` | Build y dev server (React plugin) |
| `playwright.config.ts` | E2E solo con Chromium, en dos perfiles (escritorio y móvil Pixel 7); construye y sirve el build en el puerto 4180 |
| `vite.config.ts` (sección `test`) | Unitarias (entorno node, sin DOM); el mismo archivo inyecta la CSP en el build |
| `.gitignore` | Excluye node_modules, dist, .env, cobertura |

---

## Archivos de contenido

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/main.tsx` | Entry React; monta App en #app |
| `src/App.tsx` | Componente raíz; estado global y enrutamiento |
| `src/tokens.css` | Variables CSS (colores, espacios, tipografía) |
| `src/styles.css` | Estilos globales (layout, responsive, accesibilidad) |
| `index.html` | Plantilla HTML; define viewport, favicon, CSP |

---

## Dependencias externas

| Paquete | Versión | Propósito |
|---------|---------|----------|
| React | 19.3.0 | Framework UI |
| React DOM | 19.3.0 | Montaje en DOM |
| @phosphor-icons/react | 2.1.10 | Iconografía (Play, Pause, Reset, etc.) |
| **Dev:** Vite | 8.3.0 | Build tool y dev server |
| **Dev:** TypeScript | 7.0.2 | Tipado estricto |
| **Dev:** Vitest | 5.0.1 | Pruebas unitarias (compatible Jest) |
| **Dev:** Playwright | 1.63.0 | Pruebas e2e cross-browser |

**Sin backend:** ni Express, ni API REST, ni base de datos. Todo corre en el navegador.

---

## Estados, parámetros y resultados

### Parámetros del esquema (Params)

| Clave | Descripción | Rango | Unidad |
|-------|-------------|-------|--------|
| `L` | Largo del péndulo | 0.1–5.0 | m |
| `phi0` | Ángulo inicial | 1–15° (lineal) o 1–60° (no lineal) | grados |
| `g` | Aceleración de gravedad | 1–15 | m/s² |
| `m` | Masa (aparece en schema, no se usa en derivadas) | 0.1–2.0 | kg |
| `b` | Fricción por unidad de masa | 0–0.4 | 1/s |

### Resultados (computed outputs)

| Clave | Descripción | Cuando se calcula |
|-------|-------------|-------------------|
| `theta` | Ángulo actual (radianes) | Integración RK4 |
| `omega` | Velocidad angular (rad/s) | Integración RK4 |
| `omega0` | Frecuencia natural sin fricción | Inicial (g/L)^0.5 |
| `T0` | Período lineal (2π/ω₀) | Inicial |
| `T` | Período exacto (via AGM) | Inicial (sin fricción) |
| `f` | Frecuencia (1/T) | Inicial |
| `tau` | Tiempo de decaimiento de amplitud (2/b) | Si b > 0 |
| `periodError` | Error de aproximación lineal (%) | Inicial |
| `energy` | Energía mecánica | RK4 |

---

## Modos y límites de validez

### Modo "lineal" (θ'' = −(g/L)·θ − b·θ')

- **Rango de φ₀:** 1° a 15°
- **Aviso de divergencia:** φ₀ > 10° (muestra error de aproximación)
- **Garantía:** azul y punteada coinciden con error < 1×10⁻⁶

### Modo "no-lineal" (θ'' = −(g/L)·sen θ − b·θ')

- **Rango de φ₀:** 1° a 60°
- **Aviso de divergencia:** φ₀ > 10° (muestra error de aproximación)
- **Teoría punteada:** amortiguada (mismo `b`), válida solo si b < 2ω₀ (garantizado por rango)

---

## Observaciones y pendientes

1. **Archivos huérfanos (no importados):** ninguno identificado en código fuente; todos los módulos son usados.
2. **Cambios desde docs/03-arquitectura.md:**
   - ADRs M1–M5 implementados (modelo como objeto, fenómenos por fábrica, fricción con teórica amortiguada)
   - Contenido ahora separado por modo (ver `content/simplePendulumContent.ts`)
   - UI: nuevos componentes `ModelSelector`, `TheoryPanel`, `LinearizationToggle`
3. **Pruebas:** el motor (`src/engine/`) tiene 100 % de líneas y 94 % de ramas (medido con `npm run test:coverage`); la interfaz se cubre con las pruebas de punta a punta. Detalle en `pruebas.md` y `docs/10-pruebas.md`.
4. **Accesibilidad (a11y):** región de estado con anuncios, navegación por teclado, diálogo con foco atrapado. Sin probar todavía con un lector de pantalla real.
5. **Rendimiento:** Canvas de alta DPI (watchDevicePixelRatio), muestreo de simulación limitable (maxSamples = 1000).

---

**Revisar también:**
- [`docs/03-arquitectura.md`](../03-arquitectura.md) — Decisiones y contratos detallados
- [`docs/07-rendimiento-a11y-seo.md`](../07-rendimiento-a11y-seo.md) — Optimizaciones y accesibilidad
- [`docs/10-pruebas.md`](../10-pruebas.md) — Estrategia de pruebas completa
