# Fase 11 — Observabilidad, operación y documentación

- **Fecha:** 2026-10-07
- **Qué se opera:** una aplicación **estática** (los archivos de `dist/`). No hay servidores propios, base de datos, colas, cuentas ni variables de entorno. Por eso gran parte de la "operación" clásica (logs de servidor, métricas de base de datos, copias de datos) **no aplica**, y este documento lo dice con claridad en lugar de inventar controles.
- **Hosting:** aún sin decidir (se decide en la Fase 12). Los procedimientos están escritos para cualquier alojamiento de archivos estáticos; donde cambia según el proveedor se indica.

## 1. Observabilidad: qué sí, qué no y por qué

El público son menores de edad y el diseño garantiza que la aplicación **no recoge ni envía datos** (Fase 8). La CSP lo hace cumplir: `connect-src 'self'` impide que el navegador hable con cualquier otro servidor. Poner telemetría dentro de la aplicación (Sentry, analítica, etc.) rompería esa garantía y la política de seguridad, así que **no se añadió**.

| Pieza pedida | Decisión | Qué la reemplaza |
|---|---|---|
| Logging estructurado sin datos sensibles | **No aplica**: no hay servidor ni registros propios. En uso normal la aplicación no escribe nada en la consola (lo comprueba cada prueba E2E: cero errores y cero violaciones de CSP) | Los registros de acceso del hosting (ver "Privacidad y registros") |
| Monitoreo de errores | **No se instala telemetría en el cliente.** Los fallos de dibujo muestran una pantalla fija en español con un botón para recargar y dejan el detalle solo en la consola del propio navegador (Fase 8) | Las pruebas E2E en el CI detectan roturas antes de publicar; el estudiante o docente reporta lo que vea |
| Métricas básicas | **De construcción, no de uso.** Peso del build (JS ≈ 96 KB gzip, CSS ≈ 6 KB), rendimiento medido en la Fase 7 (≈ 60 fps con CPU 4x más lenta, LCP ≈ 2,3 s en red lenta) | Se repiten las mediciones de la Fase 7 antes de cada publicación importante |
| Health check | **`npm run smoke -- <url>`** (`scripts/smoke.mjs`): comprueba que la página y todos sus recursos respondan, que la CSP esté y que no permita código en línea, y revisa las cabeceras HTTP de seguridad | Se ejecuta justo después de publicar o revertir (secciones 3 y 4) |
| Alertas mínimas | Un monitor de disponibilidad **externo y gratuito** que consulte la página principal cada pocos minutos y avise por correo | **Pendiente de elegir en la Fase 12** junto con el hosting (muchos proveedores lo incluyen). Además, el CI avisa por correo de GitHub si las pruebas fallan |
| Plan de respaldo y restauración probado | Ver sección 5: el repositorio es la única fuente, y la restauración **se probó de verdad** | Sección 5 |

**Si en el futuro se quisiera medir uso** (por ejemplo cuántos estudiantes abren cada experimento), la decisión es del equipo y de la universidad por tratarse de menores: lo mínimo aceptable sería un contador agregado sin identificadores, sin cookies y alojado en el mismo origen, y exigiría revisar la CSP (`connect-src`), Habeas Data (Ley 1581 de 2012) y un aviso de privacidad. No se hace nada de esto sin esa decisión.

### Privacidad y registros del hosting
La aplicación no guarda nada, pero **el servidor que la entregue sí registra** la dirección IP y el navegador de cada visita. Al elegir hosting: no activar la analítica del proveedor sin decisión expresa, acortar la retención de registros y no usar CDN ni fuentes externas (las fuentes ya son propias).

## 2. Antes de publicar (lista de comprobación)

```bash
npm run typecheck && npm test && npm run test:e2e && npm audit --audit-level=high
npm run build
```

- [ ] Todo en verde (el CI debe estar verde en la rama que se publica).
- [ ] `BITACORA.md` al día y los cambios confirmados en git con un mensaje claro.
- [ ] Se puso una etiqueta de versión en git para poder volver: `git tag -a v0.1.0 -m "Descripción"` (solo cuando el responsable lo pida).
- [ ] `npx vite preview --port 4173` y una vuelta rápida a mano: Play, un experimento, "Más opciones", "Teoría".

## 3. Desplegar

1. Construir: `npm run build`. Genera `dist/` (≈ 490 KB, de ellos 144 KB de fuentes), con nombres de archivo con hash (`assets/index-<hash>.js`): cada versión tiene archivos distintos y no hay problemas de caché vieja.
2. Subir **todo el contenido** de `dist/` a la raíz del sitio (según el proveedor: arrastrar la carpeta, `rsync`, comando propio, o conexión con el repositorio).
3. El sitio debe servir `index.html` en `/` y devolver 404 real (no `index.html`) para rutas de archivo que no existen: `scripts/smoke.mjs` lo detecta.
4. Configurar las **cabeceras HTTP de seguridad** (se fijan en el hosting; una `<meta>` no puede): `Content-Security-Policy` (la misma política de `index.html` más `frame-ancestors`), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`. Los valores exactos están en `docs/08-seguridad-defensiva.md`. **En Cloudflare Pages no hay que configurarlas a mano:** cada build genera `dist/_headers` con todas ellas (ver `docs/12-despliegue.md`); en otro hosting hay que trasladarlas a su formato.
5. **Verificar:**
   ```bash
   npm run smoke -- https://<el-sitio> --headers
   ```
   Debe terminar con `0 fallos`. Sin `--headers` las cabeceras faltantes solo dan aviso; con él, fallan.
6. Anotar en `BITACORA.md` qué versión se publicó, dónde y cuándo.

## 4. Revertir (volver a la versión anterior)

Como el sitio es estático y los archivos llevan hash, revertir es volver a subir el build anterior:

1. Opción A, **desde el proveedor:** la mayoría guarda los despliegues previos y permite "restaurar" uno con un clic (confirmar al elegir hosting).
2. Opción B, **desde git:** `git checkout <etiqueta-anterior>`, luego `npm ci && npm run build` y subir `dist/`. La compilación es **reproducible** (probado: la misma fuente genera los mismos archivos con el mismo hash), así que se obtiene exactamente lo que se publicó entonces.
3. Verificar con `npm run smoke -- https://<el-sitio>` y anotar la reversión y su motivo en la bitácora.

Tiempo estimado: 5 a 10 minutos con la opción B; menos de 2 con la A.

## 5. Respaldo y restauración

**Qué hay que respaldar:** solo el código fuente y la documentación, es decir, el **repositorio de git**. No hay datos de usuarios ni bases de datos que copiar. `dist/`, `node_modules/`, `coverage/` y los resultados de pruebas se regeneran y están excluidos por `.gitignore`.

**Estado actual (riesgo alto, hay que corregirlo):**
- El repositorio **no tiene ningún remoto configurado** (`git remote -v` está vacío): todo el historial vive solo en este equipo.
- Hay **unos 76 archivos con cambios sin confirmar** desde la Fase 5 (el trabajo de las iteraciones 2 y siguientes, las fases 7 a 11 y el rediseño). Un fallo de disco, un borrado accidental o un robo del equipo los perdería: **un respaldo en git solo protege lo que está confirmado y subido**.
- Recomendación: (1) crear un repositorio **privado** (GitHub u otro), (2) añadirlo como remoto, (3) confirmar el trabajo en commits pequeños y (4) subirlo. Mientras tanto, copiar la carpeta del proyecto (sin `node_modules`) a un disco externo o nube privada. Nada de esto se hizo sin que el responsable lo pida.

**Prueba de restauración (hecha el 2026-10-07):** se copiaron a una carpeta nueva solo los archivos versionables (los de `git ls-files` más los nuevos no ignorados: 138 archivos, sin `node_modules`, `dist`, `coverage` ni resultados), y desde cero:

| Paso | Resultado |
|---|---|
| `npm ci` | 24 s, 0 vulnerabilidades |
| `npm run typecheck` | limpio |
| `npm test` | 309 pruebas en verde |
| `npm run build` | correcto; **mismos archivos con el mismo hash** que el build original (`index-Bpem0BWd.js`, `index-zJMbYcRs.css`) |
| `npm audit` | 0 vulnerabilidades |
| **Total** | **46 s** |

**Procedimiento para restaurar en otro equipo:** instalar Node 22 o superior; clonar el repositorio (o copiar la carpeta); `npm ci`; `npm run typecheck && npm test && npm run build`; opcionalmente `npx playwright install chromium && npm run test:e2e`. No se necesita ninguna variable, clave ni servicio externo.

## 6. Qué hacer si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Página en blanco y sin mensaje | Falló la carga del script (404, ruta mal configurada, caché) | `npm run smoke -- <url>`: indica qué recurso falla. Si todos los recursos devuelven HTML, el servidor reescribe rutas inexistentes a `index.html`: corregir esa regla. Revertir (sección 4) si no se resuelve en minutos |
| Pantalla "Algo salió mal" con botón de recargar | Un fallo al dibujar (la red de seguridad funcionó) | Recargar; si se repite, reproducir con el mismo navegador y abrir la consola (el detalle está ahí), registrarlo en la bitácora y arreglar con una prueba que lo reproduzca primero |
| Aparece la aplicación sin estilos o sin fuentes | El servidor no entrega los `.css`/`.woff2` o la CSP del hosting es más estricta que la del HTML | Revisar la pestaña de red y la consola (las violaciones de CSP se ven como errores `Refused to …`); comparar con las cabeceras de `docs/08-seguridad-defensiva.md` |
| Funciona con la CSP de la `<meta>` pero se rompe tras añadir la cabecera `Content-Security-Policy` | La cabecera elimina algo que la meta permitía (p. ej. omitió el hash del `<noscript>` o `font-src`) | Copiar la política exacta de `dist/index.html` a la cabecera |
| El sitio se puede incrustar en otra página | Falta `frame-ancestors` (no existe en `<meta>`) | Añadirlo como cabecera: decisión pendiente sobre si se permite en aulas virtuales (F3, `docs/09-seguridad-ofensiva.md`) |
| El CI falla en `npm audit` sin que haya cambiado el código | Apareció una vulnerabilidad nueva en una dependencia | Es intencional (avisa pronto). `npm audit` para ver cuál, actualizar con `npm update <paquete>` o `npm audit fix`, repetir pruebas y registrar |
| El CI falla en `test:e2e` pero pasa en local | Diferencia de entorno (tiempos, navegador) | Descargar el artefacto `informe-e2e` del CI (capturas y traza de Playwright) y abrir la traza con `npx playwright show-trace <archivo>` |
| `npm run dev` dice que el puerto está ocupado | Otro servidor local abierto | Cerrar el otro o usar `npm run dev -- --port 5180` |
| Aviso de Vite sobre `import "./src/security/csp"` sin extensión | Pendiente menor conocido (F4) | Inofensivo hoy; arreglar al actualizar Vite (añadir `.ts`) |

## 7. Mantenimiento periódico

- **Dependencias:** revisar cada mes con `npm outdated` y `npm audit`. Actualizar de a una familia (React; Vite y su plugin; Vitest; Playwright), correr la lista de la sección 2 y registrar. No actualizar justo antes de una presentación.
- **Navegadores de prueba:** al actualizar Playwright, ejecutar `npx playwright install chromium`.
- **Node:** el proyecto exige Node 22 o superior (`engines` en `package.json`); el CI usa 22.
- **Lo que se vence solo:** certificado HTTPS y dominio los gestiona el hosting; anotar sus fechas de renovación cuando existan (Fase 12).

## 8. Documentación de API

**No aplica:** la aplicación no expone ni consume ninguna API. Si se añadiera un servidor, habría que documentarlo con OpenAPI y repetir las Fases 8 a 10 sobre él.

## 9. Riesgos y pendientes

- **Respaldo fuera de este equipo: sin resolver** (sección 5). Es el riesgo más importante de todo el proyecto ahora mismo.
- Alertas de disponibilidad y cabeceras HTTP: dependen del hosting (Fase 12).
- Decisión de incrustación en aulas virtuales (F3).
- Sin prueba de carga: no tiene sentido para archivos estáticos, pero el rendimiento percibido depende del CDN/hosting elegido; se medirá de nuevo tras publicar.
