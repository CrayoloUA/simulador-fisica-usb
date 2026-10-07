# Fase 9 — Ataque al propio proyecto (ofensiva controlada)

- **Fecha:** 2026-10-07
- **Autorización y alcance (confirmados por el usuario antes de empezar):** el objetivo es el proyecto del propio usuario; solo se atacó código local y el build servido en `localhost:4173`, más una página atacante local en `127.0.0.1:5055` (ya detenida). Nada contra producción ni contra terceros. Enfoque elegido: cliente (XSS, CSP, entradas, denegación de servicio).
- **Por qué este enfoque:** la app no tiene backend, cuentas ni datos. Los ataques del playbook que necesitan servidor (IDOR, sesiones, SSRF, subida de archivos, precios, carreras, abuso de API) **no tienen superficie** y se dejan constatados como "no aplica". Lo que sí existe es un cliente en el navegador del usuario, así que el atacante realista es alguien que manipula el HTML/estado desde las herramientas del navegador, o una página ajena que incrusta el sitio.
- **Método:** ataques reales en un navegador sobre el build de producción, fuzzing con semilla del motor, y lectura del bundle compilado. Cada hallazgo se corrigió con prueba que falla primero y se repitió el ataque.

## Resultado en una línea

Sin hallazgos críticos ni altos. Cuatro hallazgos de severidad baja (dos corregidos con TDD, uno que depende del hosting y uno informativo). El ataque más serio demostrado fue un **cuelgue del navegador por una escala de tiempo enorme** (autoinfligido, sin persistencia ni efecto sobre otros usuarios).

## Hallazgos

| # | Ataque y evidencia | Severidad | Estado |
|---|---|---|---|
| F1 | **Estado sin validar por rango.** Alterando `min`/`max`/`step` de los deslizadores desde las herramientas del navegador y enviando `123456789`, `1e308`, `-1e308`, la app aceptó cualquier valor: L = 123 456 789 m, φ₀ = 123 456 789°, g = m = b = 123 456 789, y mostró "θ = 123456789,0°" y "el período es 150,6 % más largo". Rompe el límite de validez del modelo (60°/15°) | baja | **Corregido:** `clampToSpec` (`src/engine/validate.ts`) usada en `handleParamChange` (`App.tsx`). El ataque repetido deja L 5 m, φ₀ 60°, g 25, m 5 kg, b 0,4 (los máximos). 3 pruebas nuevas, fallaban antes |
| F2 | **Cuelgue por escala de tiempo.** `Simulation.advance` multiplicaba el tiempo del cuadro por `timeScale` (que sale de un `<input type=radio value=…>` del selector de velocidad, manipulable) y ejecutaba un bucle de pasos sin tope: con escala 20 000 un solo cuadro tardó **624 ms** (con valores mayores, minutos: bloqueo del navegador). Además, `NaN`/`Infinity` en `timeScale` o en el tiempo transcurrido dejaban el acumulador en `NaN` y la simulación **congelada para siempre** | baja | **Corregido:** `advance` sanea el tiempo (finito y no negativo) y la escala (finita, entre 0 y `MAX_TIME_SCALE = 4`; la interfaz ofrece hasta 2×). 3 pruebas nuevas, fallaban antes. Ataque repetido en el navegador con `1e308`, `20000`, `NaN`, `abc`, `-3`, `Infinity`: sin cuelgue, sin pantalla de error, 60,5 fps |
| F3 | **Clickjacking / incrustación.** Una página en otro origen (`127.0.0.1:5055`) incrustó el simulador en un `<iframe>` y quedó completo e interactivo | baja | **Pendiente de decisión para la Fase 12:** `frame-ancestors` no funciona en `<meta>`, solo como cabecera HTTP. Decisión de producto: ¿se permite que docentes lo incrusten en un aula virtual (Moodle, Classroom)? Si sí, permitir solo esos orígenes; si no, `frame-ancestors 'none'`. Sin acciones sensibles en la app, el impacto es mínimo |
| F4 | **Aviso de configuración de Vite** (introducido en la Fase 8): `import "./src/security/csp"` sin extensión en `vite.config.ts` funciona hoy, pero Vite avisa que dejará de resolverlo en una versión mayor futura | info | **Pendiente (menor):** añadir la extensión `.ts` y activar `allowImportingTsExtensions` cuando se actualice Vite |

## Ataques que NO encontraron nada

| Ataque | Resultado |
|---|---|
| Fuzzing del motor: 300 combinaciones aleatorias por modelo (semilla fija) con `0`, `-0`, `1e-300`, `1e308`, `±Infinity`, `NaN`, negativos y órdenes de magnitud aleatorios | Ninguna excepción, ningún cuelgue (< 5 s en total); cuando el cálculo no es posible, la simulación se detiene con un mensaje **fijo** y todas las muestras guardadas son finitas |
| Mismo fuzzing, pero pasando antes por `clampToSpec` | 0 errores en 600 casos: con el recorte, ningún valor hostil rompe la simulación |
| XSS por entradas: no hay campo de texto libre; los valores numéricos se formatean y se escriben con React o con `textContent` | Sin sumideros (`innerHTML`, `eval`, `dangerouslySetInnerHTML`, `document.write`, `postMessage`, `window.open`) |
| Inyección de código con la CSP activa: `eval`, `new Function`, `<script>` en línea, `fetch` y `<img>` a otro dominio | Bloqueados (verificado en la Fase 8) |
| Parámetros por URL, `location.search/hash`, `JSON.parse`, `localStorage`, cookies | La app no lee ninguno: no hay entrada indirecta |
| Contaminación de prototipo / claves dinámicas | No hay `Object.assign` con datos externos ni `__proto__`; las claves de los parámetros salen del esquema del modelo |
| Pantalla de error ante fallo de render forzado | Mensaje fijo, sin filtrar el texto interno (Fase 8) |
| Bundle de producción: URLs, secretos, rutas locales, mapas de código | Solo espacios de nombres XML de React y `react.dev/errors/`; sin claves, sin `localhost`, sin rutas locales y sin `.map` (las dos coincidencias de patrones sensibles eran tipos de `<input>` de React y el nombre de una prop propia, `resetToken`) |
| Regex con retroceso (`parseDecimal`) | Corregido en la Fase 8 (25,7 s → inmediato) |

## No aplica (sin superficie en esta aplicación)

IDOR y control de acceso roto, fallos de sesión o de autenticación, SSRF, subida de archivos, lógica de precios y de negocio, condiciones de carrera con estado compartido, exposición de datos de otros usuarios y abuso de API. No hay servidor, usuarios ni datos. Si en el futuro se añade un backend (por ejemplo para guardar resultados o cuentas de docentes), esta fase se repite sobre él.

## Reproducción de los ataques

1. `npm run build` y servir `dist/` con `npx vite preview --port 4173`.
2. **F1:** en la consola del navegador, para cada `input[type=range]`, hacer `setAttribute('min','-1e308')`, `setAttribute('max','1e308')`, `setAttribute('step','any')`, asignar `123456789` con el *setter* nativo de `HTMLInputElement.prototype.value` y disparar `input`. Antes del arreglo la interfaz muestra θ = 123456789,0°.
3. **F2:** abrir "Más opciones", pulsar Play, cambiar el `value` de un radio de velocidad a `20000` (o `1e308`, `NaN`) y hacer clic. Antes del arreglo, el cuadro se bloquea o la simulación queda congelada.
4. **F3:** servir una página en otro puerto con `<iframe src="http://localhost:4173/">` y abrirla.
5. Motor: `npx vitest run src/engine/fuzz.test.ts src/engine/simulation.test.ts`.

## Evidencia

- Typecheck limpio; **309 pruebas en verde** (29 archivos; antes 299); build correcto (JS 96,2 KB gzip); `npm audit`: 0 vulnerabilidades.
- Pruebas que fallaron antes de cada arreglo: `clampToSpec` (3) y `Simulation` con entradas hostiles (3: 624 ms y `t = 0` congelado). El fuzzing (4 pruebas) pasó desde el inicio y queda como red de seguridad permanente.
- Archivos tocados: `src/engine/validate.ts` y su prueba, `src/engine/simulation.ts` y su prueba, `src/engine/fuzz.test.ts` (nuevo), `src/App.tsx`.

## Riesgos abiertos

- F3 depende de la decisión sobre incrustación y del hosting (Fase 12).
- Los ataques de navegador se hicieron a mano con scripts en la consola; no hay prueba automatizada de extremo a extremo (llega con la Fase 10).
- No se atacó la cadena de suministro (typosquatting, scripts de instalación, flujos de GitHub Actions más allá de la revisión de la Fase 8): el usuario eligió el enfoque de cliente.
