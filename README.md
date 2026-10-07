# Simulador de Fenómenos Físicos

Simulador web interactivo para que estudiantes de 10° y 11° exploren la física con las manos: hoy incluye el **péndulo simple** (modelo de ángulo pequeño y modelo real no lineal, con rozamiento del aire, teoría y experimentos guiados). Proyecto de grado de Ingeniería de Sistemas, Universidad de San Buenaventura, Cali.

- **Equipo:** Julián Andrés Vargas Sepúlveda y Sebastián Baquero Álvarez.
- **Directores:** Brayan Fernando Díaz (Físico) y Camilo Velasco (Ing. de Sistemas).
- **Es una aplicación estática:** corre entera en el navegador. No tiene servidor, base de datos, cuentas, cookies ni analítica, y no envía ningún dato a nadie.

## Requisitos

- **Node.js 22 o superior** (se probó con 24) y npm. Nada más.
- Un navegador moderno. Las pruebas automáticas usan Chromium.

## Cómo ejecutarlo

```bash
npm install        # una sola vez
npm run dev        # servidor de desarrollo en http://localhost:5173
```

En Windows basta con hacer doble clic en `iniciar.bat`: instala lo necesario la primera vez y abre el simulador en el navegador.

Para ver el **build de producción** (el que se publica, con su política de seguridad CSP):

```bash
npm run build      # comprueba tipos y genera la carpeta dist/
npx vite preview --port 4173
```

## Variables de entorno

**Ninguna.** La aplicación no lee variables de entorno ni archivos de configuración secretos. El archivo `.gitignore` excluye `.env*` por precaución; si algún día se añade una, solo se documentará su nombre aquí (nunca su valor) y se creará un `.env.example`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Revisa los tipos y construye `dist/` (inyecta la CSP en el HTML) |
| `npm run typecheck` | Solo revisa los tipos (incluye `src/`, `e2e/` y las configuraciones) |
| `npm test` | Pruebas unitarias (Vitest, ≈ 310 pruebas) |
| `npm run test:watch` | Pruebas unitarias en modo vigilancia |
| `npm run test:coverage` | Pruebas unitarias con cobertura del motor (`src/engine/`) |
| `npm run test:e2e` | Pruebas de punta a punta (Playwright, Chromium; construye y sirve el build en el puerto 4180) |
| `npm run smoke -- <url>` | Comprobación posterior a un despliegue (ver `docs/11-operacion.md`) |
| `npm run canary -- <url> [--interval 5m --duration 2h]` | Vigilancia de una URL publicada: `smoke` más una visita real (consola, LCP, CLS, Play). Ver `docs/13-lanzamiento.md` |

La primera vez que se usen las pruebas de punta a punta hay que descargar el navegador: `npx playwright install chromium`.

## Cómo comprobar que todo está bien

```bash
npm run typecheck && npm test && npm run test:e2e && npm audit --audit-level=high
```

El mismo conjunto corre en el CI (`.github/workflows/ci.yml`).

## Estructura

```
src/
  engine/       motor de física: integrador RK4, modelos del péndulo, validación (sin React)
  render/       dibujo en canvas (péndulo, gráfica) y lectura del tema desde los tokens CSS
  content/      textos pedagógicos, ayuda por parámetro y flujo de experimentos
  ui/           componentes React y su lógica pura (cada .ts tiene su prueba)
  security/     política de seguridad de contenido (CSP) que se inyecta en el build
  App.tsx       ensambla todo; main.tsx es el punto de entrada
  tokens.css    colores, tipografía y medidas (fuente única del diseño)
  styles.css    estilos de los componentes
e2e/            pruebas de punta a punta (Playwright)
scripts/        herramientas de operación (smoke.mjs)
public/         favicon, robots.txt y fuentes propias (WOFF2)
docs/           documentación del proyecto (ver abajo)
```

Los mapas detallados del código están en [`docs/CODEMAPS/`](docs/CODEMAPS/INDEX.md).

## Documentación

| Documento | Para qué sirve | Vigencia |
|---|---|---|
| [`BITACORA.md`](BITACORA.md) | Registro cronológico de todo lo hecho y por qué (solo se añade, nunca se reescribe) | Viva |
| [`docs/11-operacion.md`](docs/11-operacion.md) | Despliegue, reversión, qué hacer si algo falla, respaldo y restauración | Vigente |
| [`docs/12-despliegue.md`](docs/12-despliegue.md) | Publicación en Cloudflare Pages: auditoría de producción, pipeline, pasos que te tocan, costos | Vigente (preparada, aún no publicada) |
| [`docs/13-lanzamiento.md`](docs/13-lanzamiento.md) | Lanzamiento gradual, lista de salida, vigilancia, canal de reportes y reversión | Vigente (plan; aún no ejecutado) |
| [`docs/growth-log/`](docs/growth-log/2026-10-07.md) | Patrones aprendidos (qué falló, causa de fondo, qué hacer distinto) | Viva |
| [`docs/08-seguridad-defensiva.md`](docs/08-seguridad-defensiva.md) y [`09-seguridad-ofensiva.md`](docs/09-seguridad-ofensiva.md) | Revisión y ataque de seguridad, hallazgos y arreglos | Vigente |
| [`docs/10-pruebas.md`](docs/10-pruebas.md) | Qué cubren las pruebas de punta a punta y sus límites | Vigente |
| [`docs/07-rendimiento-a11y-seo.md`](docs/07-rendimiento-a11y-seo.md) | Mediciones de rendimiento, accesibilidad y SEO | Vigente |
| [`docs/03-arquitectura.md`](docs/03-arquitectura.md) | Decisiones de arquitectura (ADR) | Vigente en decisiones; los nombres de componentes de la interfaz cambiaron con el rediseño: ver `docs/CODEMAPS/` |
| [`docs/01-prd.md`](docs/01-prd.md), [`02-diseno.md`](docs/02-diseno.md), [`04-plan.md`](docs/04-plan.md), [`06-revision.md`](docs/06-revision.md) | Requisitos, diseño, plan y revisión de la iteración 2 | Histórico (explican el porqué) |
| [`DESIGN.md`](DESIGN.md) | Sistema de diseño | Colores y tipografía vigentes; componentes en revisión |

## Reglas de trabajo

- Todo cambio se registra en `BITACORA.md` (qué y por qué).
- No se hacen commits ni push sin que el responsable del proyecto lo pida.
- No se guardan secretos en el repositorio.

## Licencia

Sin definir todavía. Hasta que el equipo y la universidad decidan, todos los derechos quedan reservados.
