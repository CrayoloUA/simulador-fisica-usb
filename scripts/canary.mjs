#!/usr/bin/env node
/**
 * Vigilancia posterior al despliegue ("canary"): repite una comprobación sobre una URL ya publicada
 * durante un tiempo y avisa de regresiones. Solo LEE: peticiones GET y una visita con navegador.
 *
 * Uso:
 *   npm run canary -- https://staging.mi-proyecto.pages.dev                      (una pasada)
 *   npm run canary -- https://mi-sitio --interval 5m --duration 2h --headers     (vigilancia sostenida)
 *
 * En cada vuelta ejecuta dos cosas:
 *   1. `scripts/smoke.mjs`: página, recursos, CSP y (con --headers) cabeceras HTTP.
 *   2. Una visita real con Chromium: errores de consola, peticiones fallidas, LCP, CLS y que Play
 *      haga avanzar la simulación.
 * La primera vuelta fija la línea base; las siguientes se comparan con ella.
 *
 * Umbrales (ver docs/13-lanzamiento.md):
 *   CRÍTICO: smoke con fallos, cualquier error de consola, petición con 4xx/5xx, LCP > 4 s,
 *            Play no avanza la simulación.
 *   AVISO:   LCP 500 ms o más por encima de la línea base, CLS > 0,1.
 * Sale con 1 si hubo algún crítico; el registro queda en test-results/canary-<fecha>.log.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, appendFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const argumentos = process.argv.slice(2);
const valor = (nombre) => {
  const i = argumentos.indexOf(nombre);
  return i >= 0 ? argumentos[i + 1] : undefined;
};
const direccion = argumentos.find((a, i) => !a.startsWith('--') && !['--interval', '--duration'].includes(argumentos[i - 1]));
const conCabeceras = argumentos.includes('--headers');

function aMilisegundos(texto, porDefecto) {
  if (!texto) return porDefecto;
  const m = /^(\d+(?:\.\d+)?)(s|m|h)$/.exec(texto);
  if (!m) {
    console.error(`Duración no válida: "${texto}". Usa, por ejemplo, 30s, 5m o 2h.`);
    process.exit(2);
  }
  return Number(m[1]) * { s: 1000, m: 60_000, h: 3_600_000 }[m[2]];
}

if (!direccion) {
  console.error('Falta la dirección. Ejemplo: npm run canary -- https://mi-sitio --interval 5m --duration 2h');
  process.exit(2);
}
const intervalo = aMilisegundos(valor('--interval'), 5 * 60_000);
const duracion = aMilisegundos(valor('--duration'), 0); // 0 = una sola pasada
const base = new URL(direccion.endsWith('/') ? direccion : `${direccion}/`);

mkdirSync('test-results', { recursive: true });
const registro = `test-results/canary-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
const escribir = (linea) => {
  console.log(linea);
  appendFileSync(registro, `${linea}\n`);
};

async function visita(navegador) {
  const contexto = await navegador.newContext({ viewport: { width: 1366, height: 800 }, locale: 'es-CO' });
  const pagina = await contexto.newPage();
  const errores = [];
  const fallidas = [];
  pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text().slice(0, 140)));
  pagina.on('pageerror', (e) => errores.push(`excepción: ${e.message.slice(0, 140)}`));
  pagina.on('response', (r) => r.status() >= 400 && fallidas.push(`${r.status()} ${new URL(r.url()).pathname}`));
  pagina.on('requestfailed', (r) => fallidas.push(`fallo ${new URL(r.url()).pathname}`));
  let estadoPagina = 0; // se conserva aunque la visita falle más tarde: HTTP 200 con la página rota no es "HTTP 0"
  try {
    const inicio = performance.now();
    const respuesta = await pagina.goto(base.href, { waitUntil: 'load', timeout: 30_000 });
    estadoPagina = respuesta?.status() ?? 0;
    const medidas = await pagina.evaluate(
      () =>
        new Promise((resolver) => {
          let lcp = 0;
          let cls = 0;
          new PerformanceObserver((l) => l.getEntries().forEach((e) => (lcp = e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (cls += e.value))).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => resolver({ lcp: Math.round(lcp), cls: Number(cls.toFixed(3)) }), 1200);
        }),
    );
    // La prueba funcional mínima: Play debe hacer avanzar el tiempo simulado.
    await pagina.getByRole('button', { name: 'Play' }).click({ timeout: 10_000 });
    await pagina.waitForTimeout(1500);
    const lectura = (await pagina.getByText(/^En vivo:/).textContent({ timeout: 5000 })) ?? '';
    const t = Number((/t = ([\d,]+) s/.exec(lectura)?.[1] ?? '0').replace(',', '.'));
    return { estado: respuesta?.status() ?? 0, ms: Math.round(performance.now() - inicio), ...medidas, avanza: t > 0.3, errores, fallidas };
  } catch (error) {
    return { estado: estadoPagina, ms: 0, lcp: 0, cls: 0, avanza: false, errores: [`la visita falló: ${error.message.split('\n')[0]}`], fallidas };
  } finally {
    await contexto.close();
  }
}

function vuelta(numero, v, humo, linea) {
  const criticos = [];
  const avisos = [];
  if (humo.status !== 0) criticos.push('smoke con fallos');
  if (v.estado !== 200) criticos.push(`estado HTTP ${v.estado}`);
  if (v.errores.length) criticos.push(`${v.errores.length} error(es) de consola: ${v.errores[0]}`);
  if (v.fallidas.length) criticos.push(`peticiones fallidas: ${v.fallidas.slice(0, 3).join(', ')}`);
  if (v.lcp > 4000) criticos.push(`LCP ${v.lcp} ms (> 4000)`);
  if (!v.avanza) criticos.push('Play no hace avanzar la simulación');
  if (linea && v.lcp - linea.lcp >= 500) avisos.push(`LCP +${v.lcp - linea.lcp} ms sobre la línea base`);
  if (v.cls > 0.1) avisos.push(`CLS ${v.cls} (> 0,1)`);
  const marca = new Date().toLocaleTimeString('es-CO', { hour12: false });
  const estado = criticos.length ? 'CRÍTICO' : avisos.length ? 'AVISO ' : 'SANO   ';
  escribir(`[${marca}] vuelta ${numero} ${estado} | HTTP ${v.estado} | LCP ${v.lcp} ms | CLS ${v.cls} | consola ${v.errores.length} | Play ${v.avanza ? 'ok' : 'NO'}${[...criticos, ...avisos].map((x) => `\n           - ${x}`).join('')}`);
  return { criticos, avisos };
}

escribir(`Vigilando ${base.href} | ${duracion ? `cada ${intervalo / 1000} s durante ${duracion / 1000} s` : 'una pasada'} | registro: ${registro}`);
const navegador = await chromium.launch();
const limite = Date.now() + duracion;
let numero = 0;
let linea = null;
let totalCriticos = 0;
let totalAvisos = 0;
try {
  do {
    numero += 1;
    const humo = spawnSync(process.execPath, ['scripts/smoke.mjs', base.href, ...(conCabeceras ? ['--headers'] : [])], { encoding: 'utf8' });
    if (humo.status !== 0) escribir(`  smoke:\n${(humo.stdout || humo.stderr).split('\n').filter((l) => /FALLA|falla/.test(l)).map((l) => `    ${l.trim()}`).join('\n')}`);
    const v = await visita(navegador);
    if (!linea && v.estado === 200) linea = v;
    const { criticos, avisos } = vuelta(numero, v, humo, linea);
    totalCriticos += criticos.length;
    totalAvisos += avisos.length;
    if (Date.now() + intervalo > limite) break;
    await new Promise((r) => setTimeout(r, intervalo));
  } while (Date.now() < limite);
} finally {
  await navegador.close();
}
escribir(`\nResumen: ${numero} vuelta(s), ${totalCriticos} crítico(s), ${totalAvisos} aviso(s). ${totalCriticos ? 'HAY REGRESIONES.' : 'Sin regresiones.'}`);
process.exitCode = totalCriticos ? 1 : 0;
