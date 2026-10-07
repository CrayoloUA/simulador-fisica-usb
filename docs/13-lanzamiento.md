# Fase 13 — Lanzamiento controlado y feedback

- **Fecha:** 2026-10-07
- **Estado:** **plan y herramientas listos; el lanzamiento NO se ha ejecutado.** Esta fase vive sobre una URL publicada y todavía no existe ninguna: faltan el repositorio remoto y la cuenta de Cloudflare (ver `docs/12-despliegue.md`). Nada de lo que sigue se ha hecho en la realidad salvo lo marcado como "probado".

## Decisiones tomadas (por el usuario, 2026-10-07)

| Tema | Decisión |
|---|---|
| Quién prueba primero | **Equipo y directores**: Julián y Sebastián, luego los directores (Brayan Fernando Díaz y Camilo Velasco). **Sin menores en esta ronda.** |
| Canal de reportes | **Un correo del equipo**, sin formularios ni cuentas de terceros. **La dirección está por definir:** aparece como `<correo-del-equipo>` y debe reemplazarse antes de enviar nada a nadie |

## 1. Despliegue gradual

Cada etapa se abre solo si la anterior cumple su criterio. Nada pasa a la etapa siguiente sin tu OK explícito.

| Etapa | Quién | Dónde | Criterio para pasar a la siguiente |
|---|---|---|---|
| 0. Local | Julián y Sebastián | Sus equipos | Todo en verde (tipos, 316 pruebas unitarias, 48 E2E, `npm audit`) |
| 1. Staging, equipo | Julián y Sebastián | `https://staging.<proyecto>.pages.dev` | Despliegue en verde (incluido `smoke --headers`); vigilancia de 1 o 2 h sin críticos; revisión a mano en un computador **y** un teléfono reales |
| 2. Staging, directores | Brayan Fernando Díaz (física) y Camilo Velasco (sistemas) | La misma dirección de staging | Sus comentarios atendidos o registrados como pendientes aceptados; visto bueno del director de física a las ecuaciones y los textos |
| 3. Producción restringida | Los mismos directores | `https://<proyecto>.pages.dev` (solo se comparte con ellos) | Lista de salida completa (sección 2) y orden explícita de publicar |
| 4. Grupo de 10° y 11° | *No está en esta ronda* | — | Requiere permiso del colegio y de los acudientes (menores, Ley 1581), el aviso de privacidad y una decisión nueva |

## 2. Lista de verificación de salida (go / no-go para producción)

**Técnica**
- [ ] Trabajo confirmado en git y subido al repositorio privado; **CI en verde** (hoy nunca se ha ejecutado).
- [ ] Despliegue a staging ejecutado con éxito; `npm run smoke -- <staging> --headers`: 0 fallos.
- [ ] Vigilancia con `npm run canary` de 1 a 2 h sobre staging: 0 críticos.
- [ ] **Reversión ensayada:** se hizo un rollback de prueba en staging y se comprobó con `smoke` (no se confía en un procedimiento que nunca se ha probado).
- [ ] Revisión a mano: Play, un experimento completo, "Más opciones", "Teoría", modelo lineal y real; en computador y teléfono.

**Contenido y accesibilidad**
- [ ] Visto bueno del director de física, **Brayan Fernando Díaz, que es también el profesor autor de las correcciones** registradas en `BITACORA.md` (B-055), a ecuaciones, rangos (15° y 60°) y textos de ayuda. Revisar con él punto por punto las 10 correcciones de B-055 frente a lo construido.
- [ ] Prueba con un lector de pantalla real (NVDA o VoiceOver): **pendiente desde la Fase 7**.
- [ ] Prueba en otro navegador distinto de Chromium (Firefox o Safari): **no se ha hecho**.

**Legal y de privacidad**
- [ ] Aviso de privacidad breve en español publicado en el sitio (qué no se recoge; qué registra el proveedor).
- [ ] Licencia o condiciones de uso definidas con el equipo y la universidad.
- [ ] Decisión sobre incrustación en aulas virtuales (hoy `frame-ancestors 'none'`).

**Operación**
- [ ] `<correo-del-equipo>` creado, con al menos dos personas que lo lean.
- [ ] Monitor de disponibilidad externo configurado (sección 3).
- [ ] Respaldo fuera de este equipo: el repositorio remoto existe y está al día.

> Hoy **ninguna casilla de "Legal y de privacidad" ni de "Operación" está cumplida**, y de la parte técnica solo la etapa local lo está.

## 3. Monitoreo activo

### Vigilancia inmediata (1 o 2 horas): `npm run canary`
Una sesión de trabajo no puede vigilar 48 horas seguidas; por eso la vigilancia activa dura 1 o 2 horas tras cada publicación y luego la releva un monitor externo.

```bash
# Una pasada
npm run canary -- https://staging.<proyecto>.pages.dev --headers

# Vigilancia sostenida: cada 5 minutos durante 2 horas
npm run canary -- https://staging.<proyecto>.pages.dev --interval 5m --duration 2h --headers
```

Cada vuelta ejecuta el comprobador `smoke` y una visita real con Chromium; la primera vuelta fija la línea base. Deja un registro en `test-results/canary-<fecha>.log` y sale con código 1 si hubo algún crítico.

| Nivel | Condición |
|---|---|
| **Crítico** | `smoke` con fallos · página distinta de HTTP 200 · **cualquier** error de consola (la línea base de esta app es cero) · petición con 4xx/5xx · LCP > 4 s · Play no hace avanzar la simulación |
| **Aviso** | LCP 500 ms o más por encima de la línea base · CLS > 0,1 |

**Probado (en local, sin Cloudflare):** sitio sano → 0 críticos, salida 0 · sitio caído → críticos, salida 1 · hoja de estilos con 404 → crítico "peticiones fallidas" y `smoke` con fallos · un script que emite un error de consola → crítico · argumentos erróneos → salida 2. Un fallo propio que se corrigió durante la prueba: ante una visita fallida informaba "HTTP 0" aunque la página hubiera respondido 200.
**No probado:** contra Cloudflare real, ni durante horas seguidas.
**Límite:** el canary mide la **disponibilidad y el funcionamiento**, no el uso: la aplicación no tiene telemetría (a propósito, ver `docs/11-operacion.md`), así que no se puede saber cuánta gente la abre ni qué hace.

### Después de las primeras horas: monitor externo
Un servicio gratuito de disponibilidad que consulte la página principal cada pocos minutos y avise al correo del equipo. Condición: que solo **consulte** desde fuera, sin poner ningún script en la página (la CSP lo bloquearía). Cloudflare ofrece comprobaciones de salud y existen otros servicios gratuitos; verifica las condiciones del plan gratuito vigente al elegir. Se configura con el sitio ya publicado.

## 4. Canal de reporte de errores y comentarios

La app **no envía nada** (garantía de privacidad para menores), así que los reportes llegan solo por correo, escritos por una persona.

- **Dirección:** `<correo-del-equipo>` (por definir).
- **Plantilla para quien reporte** (corta, para que nadie se pierda):
  1. ¿Qué estabas haciendo? (por ejemplo, "en Experimentos, ¿Depende de la longitud?, paso 2")
  2. ¿Qué esperabas que pasara y qué pasó?
  3. ¿En qué aparato y navegador? (por ejemplo, "teléfono Android, Chrome")
  4. Si puedes, una captura de pantalla.
  5. **No escribas datos personales de estudiantes** (nombres, documentos).
- **Mensaje sugerido para los directores** (texto de uso interno, no de venta; reemplazar los marcadores antes de enviarlo):

  > Hola, les comparto una versión de prueba del simulador del péndulo: `<dirección de staging>`. Todavía no es la versión final. Les pedimos que la prueben en computador y, si pueden, en el teléfono, y que nos cuenten qué se entiende, qué falla y qué cambiarían, sobre todo en las ecuaciones y los textos de ayuda. Pueden escribirnos a `<correo-del-equipo>` contando qué estaban haciendo, qué esperaban y en qué aparato lo probaron. No hace falta crear ninguna cuenta y la página no guarda ni envía datos.

- **Triaje:** cada reporte se registra en `BITACORA.md` (tipo Hallazgo), se clasifica (error, mejora, duda de contenido) y, si es un error, se arregla con una prueba que lo reproduzca primero. Las dudas de física las resuelve el director de física antes de tocar el contenido.

## 5. Plan de reversión

Ya definido en `docs/11-operacion.md` (sección 4) y `docs/12-despliegue.md`: rollback desde el panel de Cloudflare (≈ 1 minuto) o nuevo despliegue desde una etiqueta anterior (compilación reproducible), siempre seguido de `npm run smoke -- <url> --headers`. **Criterio para revertir:** cualquier crítico del canary que no se resuelva en 15 minutos, o un error de contenido físico que un director confirme.

## 6. Registro de métricas y aprendizajes

Se lleva con la skill `growth-log` en [`docs/growth-log/`](growth-log/2026-10-07.md): se registran **patrones**, no diarios (qué falló, la causa de fondo y qué se hará distinto). Ya hay cuatro entradas de esta sesión. Las "métricas" de esta app son de **construcción y funcionamiento**, no de uso: pruebas, tamaño del build, LCP, CLS y resultado de cada vigilancia.

## 7. Riesgos

- **Nada de esta fase se ha ejecutado contra un sitio real.** El primer despliegue a staging y la primera vigilancia son la prueba verdadera de los flujos y del `_headers`.
- Sin telemetría no hay forma objetiva de saber cómo se usa; todo el aprendizaje de esta ronda será cualitativo (lo que cuenten los directores).
- El correo de reportes depende de que el equipo lo cree y lo lea.
- Las ecuaciones y textos de la iteración 2 se escribieron a partir de las correcciones del profesor, que es el director de física (Brayan Fernando Díaz), pero su versión final **aún no ha sido validada por él**. Él es quien da el visto bueno de contenido: sin ese visto bueno no se pasa a producción.
- Siguen abiertos: lector de pantalla real, otros navegadores, aviso de privacidad, licencia, `lint`.
