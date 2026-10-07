# Fase 10 — Pruebas de punta a punta e integración

- **Fecha:** 2026-10-07
- **Herramienta:** Playwright 1.63 con Chromium (instalada con autorización del usuario: `@playwright/test` como dependencia de desarrollo y el navegador en la caché del usuario, fuera del repositorio).
- **Qué se prueba:** el **build de producción** (el que se publica, con su CSP), servido por `vite preview` en el puerto 4180 que Playwright levanta solo; en dos perfiles: **escritorio** (1366×800) y **móvil** (Pixel 7).
- **Cómo se ejecuta:** `npm run test:e2e` (construye, sirve y prueba). También corre en el CI tras el build y sube el informe si algo falla.

## Resultado

| Qué | Resultado |
|---|---|
| Pruebas E2E | **24 pruebas × 2 perfiles = 48 en verde** |
| Estabilidad | `--repeat-each=3`: **144 ejecuciones en verde**, ninguna inestable |
| Pruebas unitarias | **309 en verde** (29 archivos) |
| Typecheck | limpio (ahora incluye `e2e/` y `playwright.config.ts`) |
| `npm audit` | 0 vulnerabilidades |
| Duración de la suite E2E | ≈ 29 s (una pasada), ≈ 1,3 min (tres) |

Las pruebas E2E **no encontraron ningún error de producto**: los fallos que aparecieron al escribirlas fueron de la propia prueba (ver "Lo que salió mal al escribirlas").

## Qué cubren (24 pruebas por perfil)

| Archivo | Pruebas | Flujos |
|---|---|---|
| `e2e/explorar.spec.ts` | 7 | Carga limpia (sin errores de consola ni excepciones) · Play avanza el tiempo, Pausa lo detiene, Reiniciar vuelve a cero · cuadruplicar L duplica T (T ∝ √L) · la Luna alarga T y el botón queda marcado (`aria-pressed`) · teclado: Espacio activa Play y las flechas mueven el deslizador · **funciona sin conexión** una vez cargada · la gráfica y el péndulo tienen descripción accesible y la lectura "En vivo" |
| `e2e/modelos.spec.ts` | 5 | "Ángulo pequeño" limita φ₀ a 15°, lo anuncia y reinicia; "Real" devuelve 60° · aviso de ángulo grande · comparar con el ángulo pequeño (cambia la descripción de la gráfica y se revierte) · la masa no cambia el período · la teoría es un diálogo: fondo `inert`, Escape lo cierra y el foco vuelve al botón |
| `e2e/experimentos.spec.ts` | 4 | "¿Depende de la longitud?" completo (Predecir → Probar ×3 → Comprobar → Concluir, con "Continuar" deshabilitado hasta elegir y T duplicándose en el paso 2) · predicción equivocada no se felicita · "Volver a la lista" y regreso a Explorar · "¿Y del ángulo?" fuerza el modelo Real |
| `e2e/robustez.spec.ts` | 8 | Regresión de las Fases 8 y 9 y diseño adaptable (abajo) |

**Regresión de seguridad como pruebas permanentes** (`robustez.spec.ts`): la política CSP llega al navegador sin `unsafe-inline` ni `unsafe-eval`; un `<script>` inyectado, `fetch` externo e imagen externa quedan bloqueados; un uso normal no produce ninguna violación de CSP; un deslizador con `min`/`max` alterados no deja el estado fuera del rango (F1 de la Fase 9); un selector de velocidad manipulado con `20000`, `1e308`, `NaN`, `abc`, `-3` e `Infinity` no cuelga la simulación (F2); un fallo forzado al dibujar muestra el mensaje fijo y no filtra el texto del error.

**Diseño adaptable y accesibilidad práctica:** sin desplazamiento horizontal y con Play a la vista (escritorio y móvil) · ningún botón, selector ni etiqueta de opción mide menos de 24 px (WCAG 2.5.8) · las fuentes propias cargan y **no se pide nada a terceros**.

## Comprobación de que las pruebas pueden fallar (mutaciones)

Una prueba que nunca falla no demuestra nada. Se rompió el código a propósito en dos puntos, se vio fallar la prueba correspondiente y se restauró el archivo (idéntico byte a byte a la copia previa):

| Mutación | Prueba que la detectó |
|---|---|
| Quitar el recorte de parámetros (`clampToSpec`) en `App.tsx` | "un deslizador con min/max alterados…": quedaba `123456789` en pantalla (esperado 0 coincidencias, recibió 1) |
| Quitar `AppErrorBoundary` de `main.tsx` | "un fallo al dibujar muestra un mensaje fijo…": el aviso no aparece |

Efecto colateral útil: un primer intento de mutación (borrando el uso de un import) no llegó a las pruebas porque el **build, que ejecuta `tsc` con `noUnusedLocals`, lo rechazó** y Playwright no pudo arrancar el servidor. Es decir, el tipado también protege.

## Lo que salió mal al escribirlas (y cómo se resolvió)

1. **Selector de modelo:** `radio.check()` fallaba porque el `<input type=radio>` real está oculto bajo su etiqueta con estilo. Un estudiante hace clic en el texto; la prueba ahora también.
2. **Prueba de CSP:** `page.evaluate` va por el protocolo de depuración (CDP) y **se salta** la restricción de `eval`/`new Function` del documento, así que la prueba daba "PERMITIDO" aunque la CSP era correcta (en la Fase 8 sí se bloquearon al probar con las herramientas de desarrollo). Para no dar falsa seguridad, la prueba comprueba la política tal como llega al navegador y mantiene solo los ataques que atraviesan la CSP (script en línea, red e imagen externas).
3. **Mi explorador previo** se atascó en un bucle al elegir mal el botón; se rehízo con el flujo real.

## No aplica a esta aplicación

Integración de API con base de datos real, roles y permisos, "un usuario no ve datos de otro", caminos de error de servidor: no hay backend, usuarios ni datos. Si se añade un backend, esta fase se repite sobre él.

## Capturas (estado real del build)

| Archivo | Muestra |
|---|---|
| `docs/capturas/fase10-escritorio-inicio.png` | Pantalla inicial (modo Explorar) |
| `docs/capturas/fase10-escritorio-simulando.png` | Simulación en marcha con la gráfica dibujándose |
| `docs/capturas/fase10-escritorio-mas-opciones.png` | Panel "Más opciones" (modelo, comparación, masa, rozamiento, velocidad, datos para curiosos) |
| `docs/capturas/fase10-escritorio-teoria.png` | Teoría como diálogo |
| `docs/capturas/fase10-escritorio-experimento.png` | Experimento guiado, paso 1 de 3 con "Valores preparados" |
| `docs/capturas/fase10-movil-simulando.png` | Móvil (Pixel 7), simulando |

## Riesgos y límites

- **Solo Chromium.** No se instaló Firefox ni WebKit (Safari); el comportamiento en esos motores no está probado automáticamente.
- **Sin lector de pantalla real.** Las pruebas verifican roles, nombres, foco, `aria-pressed`/`inert` y regiones de estado, pero no sustituyen una prueba manual con NVDA o VoiceOver (pendiente desde la Fase 7).
- **El CI no se ha ejecutado todavía:** se añadió el paso a `.github/workflows/ci.yml` (instala Chromium con sus dependencias, corre las pruebas y sube el informe si fallan), pero GitHub Actions solo se puede comprobar al subir la rama.
- **Sin pruebas visuales de regresión** (comparación de imágenes): las capturas son evidencia, no una comparación automática.
- **Sin pruebas con dispositivos táctiles reales:** el perfil móvil es una emulación (tamaño, agente y táctil), no un teléfono.
- Persisten dos pendientes menores de fases anteriores: el aviso de Vite por el import sin extensión en `vite.config.ts` (F4, Fase 9) y la decisión sobre incrustación en aulas virtuales (F3).

## Archivos de esta fase

`playwright.config.ts`, `e2e/helpers.ts`, `e2e/explorar.spec.ts`, `e2e/modelos.spec.ts`, `e2e/experimentos.spec.ts`, `e2e/robustez.spec.ts`, `docs/capturas/fase10-*.png` (6), y los cambios en `package.json` / `package-lock.json` (`@playwright/test` y el script `test:e2e`), `tsconfig.json` (incluye `e2e` y la configuración), `.gitignore` (`test-results`, `playwright-report`) y `.github/workflows/ci.yml`.
