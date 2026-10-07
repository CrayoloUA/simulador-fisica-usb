# Fase 8 — Seguridad defensiva

- **Fecha:** 2026-10-07
- **Alcance real:** frontend estático (React 19 + Vite 8 + Canvas). No hay backend, base de datos, cuentas, sesiones, pagos, webhooks, subida de archivos, cookies ni almacenamiento local. Por eso la mayor parte del checklist de la fase (autenticación, autorización por objeto/rol, inquilinos, RLS, CSRF, límites de tasa, copias de seguridad de datos) **no aplica**: no hay nada que proteger en esas capas. Se deja constancia en lugar de inventar controles.
- **Método:** reconocimiento propio con búsquedas sobre el código y el historial de git; revisión independiente de solo lectura (agente `security-reviewer`); verificación de cada afirmación contra el código; arreglos con prueba que falla primero; verificación de la CSP en un navegador real con ataques de prueba.
- **Qué NO es:** no es la Fase 9 (ofensiva). Aquí no se atacó nada; solo se revisó y se endureció.

## Resultado en una línea

Sin hallazgos críticos, altos ni medios. Un hallazgo bajo resultó ser **explotable de verdad** (cuelgue del navegador por la regex de `parseDecimal`) y se corrigió; se añadió una CSP estricta, un límite de errores de render y permisos mínimos en el CI.

## Hallazgos y qué se hizo

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | `parseDecimal` (`src/engine/numbers.ts`): regex con retroceso cuadrático. Una cadena de 200 000 dígitos con un carácter inválido al final tardaba **25,7 s** en rechazarse. Hoy no hay campo de texto numérico (solo deslizadores), así que no es alcanzable desde la interfaz, pero quedaba como trampa para cualquier campo futuro | baja (latente) | **Corregido:** tope de 32 caracteres antes de la regex. 3 pruebas nuevas (fallaban antes: 25 682 ms y una cadena de 33 dígitos aceptada) |
| 2 | Sin límite de error de render: un fallo al dibujar dejaba la pantalla en blanco | baja | **Corregido:** `AppErrorBoundary` con mensaje fijo en español y botón "Recargar la página"; no muestra `error.message` ni la pila. Verificado en el navegador forzando un fallo real (el texto interno inyectado no aparece en la página) |
| 3 | CI sin bloque `permissions`: el `GITHUB_TOKEN` heredaba los permisos por defecto del repositorio | baja | **Corregido:** `permissions: contents: read` |
| 4 | Sin Content-Security-Policy ni política de referencia | media-baja (defensa en profundidad) | **Corregido en el build** (ver abajo); las cabeceras HTTP quedan para el hosting |
| 5 | Acciones de CI fijadas por etiqueta (`@v4`), no por SHA | baja | **Aceptado:** son acciones oficiales de `actions/*`; fijarlas exige consultar los SHA reales y mantener Dependabot. Recomendado al elegir el hosting |
| 6 | El canvas no tiene tope máximo de tamaño (`width × dpr`) | info | **Aceptado:** lo fija el diseño (layout), no el usuario |
| 7 | `npm audit --audit-level=high` en el CI puede romper la integración por un aviso nuevo sin que cambie el código | info | **Aceptado:** es intencional; avisa pronto |

## CSP y política de referencia (`src/security/csp.ts`)

Se inyectan como `<meta>` solo en `vite build` (en desarrollo Vite necesita scripts en línea para el refresco en caliente):

```
default-src 'none'; script-src 'self'; style-src 'self' 'sha256-<hash del <style> del noscript>';
font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none';
```

- `Referrer-Policy: no-referrer` (meta), para que ninguna salida filtre la dirección.
- El hash del `<style>` del `<noscript>` se **calcula del propio HTML** en cada build, así que no puede quedar desincronizado.
- **Sin** `'unsafe-inline'` ni `'unsafe-eval'`. La app no usa estilos en línea en el marcado (React fija `--pct` por CSSOM, que la CSP permite) ni scripts en línea (el JSON-LD es un bloque de datos, no se ejecuta).
- **10 pruebas** nuevas (`csp.test.ts`): directivas, ausencia de `unsafe-*`, hash exacto, idempotencia, posición antes de cualquier script.

### Verificación en el navegador (build de producción)

| Comprobación | Resultado |
|---|---|
| Violaciones de CSP al cargar y usar la app | **0** |
| Canvas del péndulo y de la gráfica pintados con Play | sí (ambos) |
| Fuentes IBM Plex y Literata cargadas | sí |
| `eval('1+1')` y `new Function(...)` | **bloqueados** (`EvalError`) |
| `<script>` en línea inyectado | **bloqueado** |
| `fetch` a `https://example.com` | **bloqueado** |
| Imagen desde `https://example.com` | **bloqueada** |

## Lo que sí se verificó sin hallazgos

- **Entradas:** la interfaz solo tiene deslizadores (`min/max/step` los impone el navegador). `parseDecimal` rechaza `1e999`, `Infinity`, `NaN`, `0x10` y cadenas con signos repetidos; con 400 dígitos da `Infinity` y se descarta. El motor limita el tiempo por fotograma (`Math.min(elapsed, 0.1)`), las muestras (1 000) y las iteraciones de la media aritmético-geométrica (50), y detiene la simulación con un mensaje fijo si aparece un valor no finito.
- **Renderizado:** sin `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `document.write`, `postMessage`, `window.open` ni `target=_blank`. React escapa el texto; la lectura "En vivo" usa `textContent`.
- **Dependencias:** `npm audit` = 0 vulnerabilidades; 3 dependencias de ejecución (`react`, `react-dom`, `@phosphor-icons/react`); todos los `resolved` apuntan a `registry.npmjs.org`; el único script de instalación es `fsevents` (opcional, solo macOS). Se añadió `@types/node` como dependencia **de desarrollo** (solo tipos; hace falta para calcular el hash SHA-256 de la CSP en el build).
- **Secretos:** ninguno en el árbol ni en el historial de git (50 commits, todas las ramas; sin `.env`, `.pem`, `.key` ni patrones de claves). `.gitignore` excluye `.env*`.
- **Errores:** mensajes del motor fijos y en español; sin pila ni datos internos en la interfaz.
- **Terceros:** ninguno. Fuentes locales (`public/fonts/`, con sus licencias), sin analítica, sin CDN, sin `fetch`.

## Privacidad y Habeas Data (Ley 1581 de 2012)

La aplicación **no recoge, envía ni guarda datos personales**: ni cookies, ni `localStorage`, ni formularios, ni analítica. El público son menores de 10° y 11°, así que esto es una garantía fuerte del diseño y conviene conservarla.

El único punto de riesgo es el **hosting** (aún sin decidir): sus registros de acceso guardan IP y navegador de los estudiantes. Al elegirlo:
1. No activar analítica ni "Web Analytics" del proveedor sin decisión explícita.
2. Revisar y acortar la retención de registros.
3. No usar CDN de fuentes ni scripts de terceros.
4. Valorar una nota de privacidad breve en español (qué no se recoge y qué registra el servidor).

GDPR: sin usuarios identificados ni datos personales propios, no hay tratamiento que regular; aplica solo lo anterior sobre los registros del servidor.

## Pendiente para la Fase 12 (publicación): cabeceras HTTP del servidor

Una `<meta>` no puede expresar estas; deben ir como cabeceras de la respuesta HTTP (la forma depende del hosting elegido):

| Cabecera | Valor recomendado | Por qué |
|---|---|---|
| `Content-Security-Policy` | la misma política de arriba **más** `frame-ancestors 'none'` | `frame-ancestors` no funciona en `<meta>`; evita incrustar el sitio en otro (clickjacking) |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | fuerza HTTPS (solo con HTTPS ya operativo) |
| `X-Content-Type-Options` | `nosniff` | evita que el navegador adivine tipos de archivo |
| `Referrer-Policy` | `no-referrer` | refuerza la `<meta>` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | la app no usa ninguno |
| `Cross-Origin-Opener-Policy` | `same-origin` | aísla la ventana |

Además: fijar las acciones de CI por SHA y activar Dependabot; al elegir hosting, decidir los registros y la retención.

## Evidencia

- `tsc --noEmit` limpio; **299 pruebas en verde** (28 archivos; antes 282); build correcto; `npm audit`: **0 vulnerabilidades**.
- Pruebas que fallaron antes del arreglo: `parseDecimal` (25 682 ms y 33 dígitos aceptados) y las de `csp.ts` (módulo inexistente).
- Verificación de la CSP y del `ErrorBoundary` en el navegador: tablas de arriba.
- Archivos tocados: `src/engine/numbers.ts` y su prueba, `src/security/csp.ts` y su prueba, `src/ui/AppErrorBoundary.tsx` y su prueba, `src/main.tsx`, `src/styles.css` (estilo del mensaje), `vite.config.ts`, `tsconfig.json`, `package.json` y `package-lock.json` (`@types/node`), `.github/workflows/ci.yml`.

## Riesgos abiertos

- La CSP por `<meta>` protege contra scripts, red y recursos externos, pero **no** contra incrustación del sitio ni fuerza HTTPS: eso depende de las cabeceras del hosting (tabla anterior).
- El `ErrorBoundary` se verificó provocando un fallo de render; no hay prueba automatizada de extremo a extremo (los tests corren en Node, sin DOM).
- Los hallazgos 5 a 7 se aceptaron conscientemente (arriba).
