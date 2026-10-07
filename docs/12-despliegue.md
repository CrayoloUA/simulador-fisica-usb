# Fase 12 — Publicación

- **Fecha:** 2026-10-07
- **Estado:** **preparada, NO publicada.** No se creó ninguna cuenta, no se gastó nada, no se hizo push ni se subió ningún archivo a ningún servicio. Cada acción que sale de este equipo la haces tú o la autorizas expresamente.

## Decisiones tomadas (por el usuario, 2026-10-07)

| Tema | Decisión |
|---|---|
| Hosting | **Cloudflare Pages** (plan gratuito) |
| Entorno | **Staging primero**; producción solo después de su OK explícito |
| Dominio y presupuesto | **$0**: subdominio gratuito `*.pages.dev`, HTTPS incluido |
| Repositorio | **GitHub privado** (aún por crear) |

**Por qué Cloudflare Pages:** gratis sin restricción de uso comercial (importante si se vende a colegios), permite fijar las cabeceras HTTP de seguridad que una `<meta>` no puede (archivo `_headers`), guarda los despliegues anteriores y permite revertir con un clic, y el HTTPS es automático.

## Auditoría de producción (evidencia local, sin servicios externos)

> **Production audit: 70/100, lista con reservas para *staging*; para producción pública faltan el repositorio remoto con el CI en verde y las decisiones de licencia y de aviso de privacidad.**

La puntuación está limitada a 84 porque el CI **nunca se ha ejecutado** y a 70 por no tener respaldo remoto de un trabajo sin confirmar.

**Bloqueadores antes de producción (no de staging):**
1. **Sin repositorio remoto y con unos 85 archivos sin confirmar** (45 nuevos, 39 modificados, 1 borrado; el último commit es `4a36767`). Hasta que el trabajo esté confirmado y subido no hay respaldo, no corre el CI y el flujo de despliegue no puede ejecutarse.
2. **El flujo de despliegue y el CI no se han ejecutado nunca** (no hay dónde). Se validó su sintaxis YAML, pero no su comportamiento: tratar el primer despliegue a staging como la prueba.
3. **Licencia sin definir** (no hay `LICENSE`): para vender o ceder a colegios hay que decidir con el equipo y la universidad quién tiene los derechos y bajo qué términos. Decisión legal, no técnica.

**Mejoras de alto valor:**
- **Aviso de privacidad breve en español** (qué no se recoge y qué registra Cloudflare como proveedor: IP y navegador) por tratarse de menores (Ley 1581 de 2012). Hoy no hay ninguno.
- **No hay `lint`.** El playbook pide lint en el CI; el proyecto tiene tipado estricto con `noUnusedLocals` y `noUnusedParameters`, que cubre gran parte, pero no ESLint. Añadirlo implica nuevas dependencias de desarrollo: decisión tuya.
- Decidir si se permite incrustar el simulador en aulas virtuales (F3): hoy `frame-ancestors 'none'` lo prohíbe.
- Un monitor de disponibilidad externo gratuito sobre la URL de producción.

**Lo que sí está bien (verificado):** typecheck limpio; 316 pruebas unitarias y 48 E2E en verde; `npm audit` en 0; sin secretos en el árbol; el build no incluye mapas de código; CSP sin `unsafe-*` en `<meta>` y en cabecera; compilación reproducible; restauración desde cero probada en 46 s; sin backend ni datos que migrar.

**Evidencia que falta:** una ejecución real del CI; el sitio desplegado (cabeceras reales, HTTPS, rendimiento desde una red escolar); un lector de pantalla real; navegadores distintos de Chromium; un teléfono físico.

## Lo que ya está preparado en el repositorio

| Pieza | Archivo | Qué hace |
|---|---|---|
| Cabeceras de seguridad | `src/security/headers.ts` + plugin en `vite.config.ts` | Genera `dist/_headers` en cada build: CSP (idéntica a la `<meta>` más `frame-ancestors 'none'`), HSTS, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `COOP`, y caché de un año para `/assets/*` (llevan hash) y de una semana para `/fonts/*`. 7 pruebas nuevas |
| 404 real | `public/404.html`, `public/404.css` | Sin una `404.html`, Cloudflare Pages trata el sitio como SPA y devuelve `index.html` para cualquier ruta (ocultaría errores de recursos). Con ella, las rutas inexistentes dan 404 con una página propia en español |
| CI | `.github/workflows/ci.yml` | En cada push y PR: tipos, pruebas, build, `npm audit` y E2E (permisos mínimos de solo lectura) |
| Despliegue | `.github/workflows/deploy.yml` | **Solo manual** ("Run workflow"): verifica todo de nuevo, construye, sube `dist/` con Wrangler y ejecuta `npm run smoke -- <url> --headers` sobre lo publicado. Producción exige escribir `PUBLICAR` y, si lo configuras, la aprobación de un revisor |
| Comprobador | `scripts/smoke.mjs` (`npm run smoke`) | Ahora exige además que la CSP de la cabecera incluya `frame-ancestors` |

### Verificado en local (sin Cloudflare)
Con un servidor desechable que aplica `dist/_headers` y devuelve 404 reales:
- `npm run smoke -- <url> --headers` → **14 comprobaciones, 0 fallos**.
- Una página de otro origen que incrusta el simulador queda **bloqueada** por `frame-ancestors 'none'` (el navegador lo informa).
- La app funciona con las cabeceras puestas: sin errores de consola, Play avanza el tiempo.
- Una ruta inexistente devuelve **404** con la página en español y un enlace al inicio.

**Lo que NO se pudo verificar:** que Cloudflare interprete el `_headers` exactamente igual que mi servidor de prueba (sigue el formato documentado, pero se confirma en el primer despliegue con `smoke --headers`).

## Lo que te toca hacer a ti (en este orden)

1. **Confirmar el trabajo en git** (dime `commit`; te propongo antes cómo dividirlo, sin push). Propuesta de grupos: documentación y bitácora; motor y sus pruebas (incluye los arreglos de las Fases 8 y 9); interfaz, tokens y render (el rediseño); seguridad (CSP, cabeceras, pantalla de error); pruebas E2E y Playwright; operación (README, `smoke`, CODEMAPS, flujos de CI).
2. **Crear el repositorio privado en GitHub** y añadirlo como remoto. La herramienta `gh` está instalada; si ya iniciaste sesión (`gh auth status`) basta con:
   ```bash
   gh repo create <nombre-del-repo> --private --source=. --remote=origin
   ```
   (No hace push; el push solo lo hago si me lo pides.) Al subir la rama, el CI corre solo: tiene que quedar en verde.
3. **Cloudflare (gratis):** crear la cuenta; crear el proyecto de Pages por carga directa, con producción en `main`:
   ```bash
   npx wrangler login
   npx wrangler pages project create <nombre-del-proyecto> --production-branch=main
   ```
   y crear un **token de API con el permiso mínimo** (Cloudflare Pages: Edit) y anotar el **ID de cuenta**. No lo pegues en el chat ni en ningún archivo del repositorio.
4. **GitHub, en Settings:**
   - *Environments*: crear `staging` y `produccion`. En `produccion`, añadirte como **revisor obligatorio**.
   - En cada entorno, *Secrets*: `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
   - *Variables* (a nivel de repositorio): `CLOUDFLARE_PROYECTO` = el nombre del proyecto de Pages.
5. **Publicar en staging:** Actions → Despliegue → Run workflow → `staging`. Debe terminar en verde (incluida la comprobación `smoke --headers`). Revisa a mano `https://staging.<proyecto>.pages.dev`: Play, un experimento, "Más opciones", "Teoría", en el teléfono y en el computador.
6. **Producción:** solo con tu OK explícito: Run workflow → `produccion` → escribir `PUBLICAR` → aprobar el revisor. Queda en `https://<proyecto>.pages.dev`.

## Revertir

- **Rápido (1 minuto):** Cloudflare → Workers y Pages → el proyecto → Deployments → un despliegue anterior de producción → *Rollback to this deployment*.
- **Reproducible:** Actions → Despliegue → en *Use workflow from* elegir la etiqueta o rama anterior → `produccion`. La compilación es reproducible, así que sale el mismo contenido que entonces.
- Después de cualquiera: `npm run smoke -- https://<proyecto>.pages.dev --headers` y anotarlo en `BITACORA.md`.

## Costos

| Concepto | Costo |
|---|---|
| Cloudflare Pages (plan gratuito, carga directa) | $0 |
| Subdominio `*.pages.dev` con HTTPS | $0 |
| GitHub (repositorio privado, Actions) | $0 en el plan gratuito, dentro de sus minutos mensuales |
| Dominio propio (opcional, más adelante) | ≈ 10 a 15 USD al año; **no se compra sin tu aprobación del precio exacto** |

Los límites del plan gratuito (tamaño y cantidad de archivos, solicitudes) están muy por encima de lo que necesita este sitio (≈ 30 archivos, ≈ 500 KB); verifica la página de precios vigente de Cloudflare al crear la cuenta, porque pueden cambiar.

## Privacidad al publicar

La aplicación no recoge nada, pero Cloudflare, como proveedor, registra IP y navegador de cada visita. **No actives Web Analytics ni ningún script de Cloudflare**: la CSP los bloquearía y el diseño garantiza que no se envían datos de menores. Añade el aviso de privacidad (mejora de alto valor, arriba).

## No aplica a esta aplicación

Docker y contenedores (es un sitio estático, no hay proceso que contener), migraciones de base de datos con reversión, variables de entorno de la aplicación (no tiene), pasarela de pagos, facturación y factura electrónica (no cobra), tiendas de aplicaciones móviles y su firma (es web).

## Riesgos abiertos

- El pipeline no se ha ejecutado nunca: el primer despliegue a staging es su prueba real.
- Licencia sin definir y sin aviso de privacidad antes de una publicación pública a colegios.
- El respaldo depende de crear el remoto (arriba).
- Decisión pendiente de incrustación en aulas virtuales: si se permite, se cambia `FRAME_ANCESTORS` en `src/security/headers.ts` por los orígenes autorizados.
- Sin `lint` en el CI.
