# Sistema de diseño

Extraído del código real ya construido (`src/styles.css`, componentes de `src/ui/`), no inventado desde cero. Sirve como referencia para mantener consistencia al construir la capa pedagógica y los laboratorios siguientes.

## Paleta (tokens en `:root`)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#f8fafc` | Fondo de la página |
| `--surface` | `#ffffff` | Tarjetas y paneles |
| `--text` | `#0f172a` | Texto principal |
| `--muted` | `#475569` | Texto secundario, unidades, subtítulos |
| `--border` | `#cbd5e1` | Bordes de tarjetas y campos |
| `--accent` | `#2563eb` | Botones primarios, foco, curva simulada en la gráfica |
| `--danger` | `#b91c1c` | Errores de validación |
| `--warn-bg` / `--warn-border` | `#fef3c7` / `#f59e0b` | Avisos de límite del modelo, anillo de foco |

Contraste verificado a simple vista sobre fondo claro; pendiente una verificación automática de contraste (brecha de accesibilidad ya anotada en `docs/A-auditoria.md`).

**Colores agregados para la capa pedagógica (no implementados todavía, propuestos para mantener la misma paleta):**
- Ayuda en contexto: fondo `#eff6ff` (azul muy claro) con borde izquierdo `--accent` — mismo patrón que `.banner`, pero en tono "informativo" en vez de "aviso".
- Retroalimentación correcta: fondo `#dcfce7`, borde `#16a34a` (verde).
- Retroalimentación incorrecta: mismo patrón que `.error` / `--danger`.

## Tipografía y espaciado

- Fuente única: `system-ui, sans-serif` (sin fuente web cargada aparte, coherente con "sin dependencias externas").
- Radios: `6px` en botones y campos, `8px` en tarjetas/paneles.
- Espaciado en pasos de `4px`/`8px`/`12px`/`16px`, sin una escala formal de espaciado — sería una mejora futura si el número de componentes crece.

## Componentes base (ya construidos)

| Componente | Archivo | Estados |
|---|---|---|
| `ParamControl` | `src/ui/ParamControl.tsx` | normal, con error (`aria-invalid`), enfocado |
| `SimulationView` | `src/ui/SimulationView.tsx` | pausado, corriendo, con error de simulación |
| Banner de aviso | clase `.banner` en `App.tsx` | visible / oculto según `modelLimits` |
| Resultados teóricos | sección inline en `App.tsx` | siempre visible, `aria-live="polite"` |
| Transporte (Play/Pausa/Reiniciar/Velocidad) | `.transport` en `App.tsx` | según `running` |

## Componentes propuestos para la capa pedagógica (sección 12 del spec, sin construir)

| Componente | Qué hace | Reutiliza |
|---|---|---|
| Botón de ayuda ("?") | Toggle de una tarjeta de explicación | Mismo patrón visual que `.banner`, en azul informativo |
| Presets de gravedad | Fila de botones pequeños junto al campo de g | Mismo `button` base, tamaño reducido |
| `ResultsPanel` | Extrae y amplía la sección de resultados con ayuda | Reemplaza el bloque inline actual de `App.tsx` |
| `ExperimentPanel` | Selector de experimento + 4 etapas (predecir/pasos/comprobar/conclusión) | Nuevo, con paleta de retroalimentación (verde/rojo) descrita arriba |
| Selector de modo (Explorar/Experimentos) | Dos botones tipo pestaña en el encabezado | Mismo `button` base con estado `aria-pressed` |

## Responsivo

Un solo breakpoint (`max-width: 800px`): la rejilla de dos columnas pasa a una sola columna. Verificado manualmente a 375 px sin scroll horizontal (ver checklist de la Task 9 del plan del MVP).

## Accesibilidad ya aplicada

- `aria-live="polite"` en resultados, para que un lector de pantalla anuncie los cambios.
- `role="alert"` en errores, `role="status"` en avisos.
- Foco visible con anillo de 3px en color de aviso (`--warn-border`), no solo el foco por defecto del navegador.
- Etiquetas (`aria-label`) en los controles deslizantes y en el canvas de la animación.

Pendiente: auditoría automática (axe/Lighthouse) — no incluida en este documento, ya registrada como brecha.
