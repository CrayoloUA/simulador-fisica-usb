# Fase 7 — Rendimiento, accesibilidad y SEO

- **Fecha:** 2026-09-29
- **Método:** mediciones reales en Chrome sobre el build de producción (`vite preview`), antes y después de los cambios. Rendimiento: Lighthouse, traza de rendimiento y medición de fps con `requestAnimationFrame` bajo CPU 4x más lenta, red Slow 4G y viewport móvil de 375 px (aproxima un equipo escolar de gama baja). Accesibilidad y SEO: Lighthouse, árbol de accesibilidad y prueba real de teclado.
- **Ejecución:** tres agentes en paralelo con archivos asignados sin solape (`performance-optimizer`, `a11y-architect`, `seo-specialist`); yo verifiqué después tipos, pruebas, build y medí de nuevo en el navegador.

## Resultados

| Métrica | Antes | Después |
|---|---|---|
| fps en pausa (CPU 4x) | 30,5 | **60,2** |
| fps simulando (CPU 4x) | 38,7 | **58,2** |
| Cuadro p95 simulando | 50,2 ms | **16,8 ms** |
| Tareas largas (>50 ms) en 5 s | 12 (máx. 316 ms) | **1 (64 ms)** |
| LCP sin estrangular / con CPU 4x + Slow 4G | 475 ms / 2 844 ms | sin cambio relevante (el cuello era el renderizado de React, no la red) |
| CLS | 0,00 | 0,00 |
| Lighthouse accesibilidad | 100 | 100 |
| Lighthouse buenas prácticas | 100 | 100 |
| Lighthouse SEO | 82 | **100** |
| Bundle (gzip) | 76,4 KB | 77,2 KB |

El escenario de calidad del diseño (≥ 30 fps sostenidos en un PC de colegio de gama baja) se cumple con margen: 58 fps con la CPU emulada 4x más lenta.

## Rendimiento

- **Causa raíz medida:** `SimulationView` repintaba los dos canvas y reescribía el texto de la lectura en vivo en cada cuadro aunque la simulación estuviera en pausa. Los 30 fps en pausa eran trabajo desperdiciado.
- **Cambios:** repintado condicionado a que la simulación haya avanzado (o a un cambio de parámetros o reinicio); la gráfica dibuja como máximo ~300 puntos por serie decimando desde el final (la muestra más reciente siempre se conserva); la lectura en vivo se actualiza como máximo cada 200 ms; guarda de finitud sin arreglos temporales por paso y un único cierre de derivadas.
- **Decidido no hacer:** no se cambió `samples.shift()` (medido: ~0,8 µs por operación con buffer de 1 000, un anillo obligaría a reconstruir un arreglo por cuadro); no se reutilizaron objetos temporales en RK4 (riesgo de cambiar el resultado numérico a cambio de nada medible); no se tocó `vite.config.ts` (el bundle es casi todo React).
- **Sin regresión numérica:** las pruebas de precisión física siguen igual (error < 1e-6, deriva de energía < 1e-7), sin relajar ningún umbral.

## Accesibilidad (WCAG 2.2 AA)

Lighthouse ya daba 100, pero solo cubre lo automatizable. El agente auditó lo demás y se verificó en el navegador:

- **Foco perdido al elegir una opción** (deuda de la Fase 6): resuelto. Las opciones usan `aria-disabled` en vez de `disabled`; tras elegir, el foco sigue en la opción, y al pulsar Continuar, Volver o elegir un experimento pasa al contenido nuevo (grupo con nombre "Predicción", "Paso 1 de 3"…). Verificado con teclado real: Enter → Tab → flechas → Espacio → Tab → Enter.
- **Semántica:** opciones de predicción y comprobación como `radiogroup`/`radio` con foco itinerante; las flechas mueven el foco y Espacio o Enter eligen (desviación consciente del patrón estricto de WAI-ARIA, para que un lector de pantalla no envíe una respuesta por accidente). El interruptor Explorar/Experimentos es un `radiogroup` donde las flechas sí eligen (cambiar de modo es reversible).
- **Tamaño de objetivo (2.5.8):** botón "?" de 20 a 24 px; presets con mínimo de 24 px.
- **Contraste (1.4.11):** el anillo de foco y los resaltados usaban un ámbar de 2,15:1 y los bordes de componentes 1,49:1. Se agregaron `--focus` (5,02:1) y `--border-strong` (4,76:1); el resto de la paleta ya cumplía (texto ≥ 5,17:1). Razones calculadas a mano por el agente (error estimado ±0,03); conviene confirmarlas con una herramienta.
- **Nombres accesibles:** el slider anuncia valor con unidad, los presets se llaman "Tierra: 9,8 m/s²", el canvas se describe con la lectura en vivo (`aria-describedby`, sin `aria-live` para no saturar), los avisos y la retroalimentación viven en regiones `status` persistentes, y la ayuda de resultados pasó a `<dd>` (antes era un `<p>` dentro de una lista de definiciones: HTML inválido).
- **Pendiente:** cada `<dd aria-live>` de resultados anuncia solo el valor, sin la etiqueta, y hay cuatro que se actualizan a la vez al mover un deslizador. Es ruidoso; la solución razonable es una sola región con "Período T: 2,01 s, …" y un pequeño retardo. Cambia el comportamiento del panel, así que queda como deuda documentada. Tampoco se probó con un lector de pantalla real (NVDA), solo con el árbol de accesibilidad y el teclado.

## SEO

Lighthouse SEO 82 → 100. Se corrigieron los fallos reales: meta description, `robots.txt` válido (no existía carpeta `public/`, así que el servidor devolvía HTML) y favicon. Además título específico, Open Graph, Twitter Card, JSON-LD (`WebApplication` + `LearningResource`, en español, sin campos inventados), `theme-color` y `<noscript>`.

- **No se agregó `llms.txt`:** es el único fallo que queda en Lighthouse (categoría "Agentic Browsing", 67). Ningún buscador importante confirma que lo use y la especificación pide URLs absolutas que aún no existen.
- **Pendiente hasta tener dominio:** `canonical`, `og:url`, `og:image` (con imagen real) y el campo `url` del JSON-LD. Si el sitio se publica en GitHub Pages bajo una subruta, hay que fijar `base` en `vite.config.ts`.
- **Para que estudiantes y docentes lo encuentren de verdad:** registrar el sitio en Google Search Console y enlazarlo desde páginas que ya existan (repositorio, página de la universidad).

## Riesgos o pendientes abiertos

- Reducir el ruido de las regiones `aria-live` de los resultados (arriba).
- Probar con un lector de pantalla real y confirmar los contrastes con una herramienta.
- Espaciado entre "Preparar valores" y "Continuar": los botones quedan pegados (defecto cosmético ya existente).
- La rama `feature/mvp-laboratorio-mas` sigue sin fusionar.

## Cierre de fase

- **Qué se hizo:** medición real, corrección del desperdicio de renderizado, auditoría y corrección de accesibilidad más allá de Lighthouse, y SEO técnico.
- **Entregable:** este documento y 4 commits pequeños (`perf`, `fix(a11y)`, `feat(seo)`, `chore`).
- **Evidencia:** tabla de mediciones arriba; `tsc` limpio, 56 pruebas en 8 archivos, build de 77,2 KB gzip.

¿Apruebas la Fase 7? Puedes decir `ajustar`, o `fase 8` para seguir con seguridad defensiva.
