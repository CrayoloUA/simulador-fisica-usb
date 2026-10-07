#!/usr/bin/env node
/**
 * Comprobación posterior al despliegue ("health check" de un sitio estático).
 *
 * Uso:   npm run smoke -- https://mi-sitio.example
 *        npm run smoke -- http://localhost:4173 --headers   (también exige las cabeceras HTTP)
 *
 * Solo hace peticiones GET de lectura a la dirección indicada. Sale con código 0 si todo está bien
 * y 1 si algo falla, para poder usarla en un CI o a mano justo después de publicar o revertir.
 */

const argumentos = process.argv.slice(2);
const exigirCabeceras = argumentos.includes('--headers');
const direccion = argumentos.find((a) => !a.startsWith('--'));

if (!direccion) {
  console.error('Falta la dirección. Ejemplo: npm run smoke -- https://mi-sitio.example');
  process.exit(2);
}

const base = new URL(direccion.endsWith('/') ? direccion : `${direccion}/`);
const fallos = [];
const avisos = [];
let comprobaciones = 0;

function comprobar(condicion, descripcion, detalle = '') {
  comprobaciones += 1;
  if (condicion) console.log(`  ok   ${descripcion}`);
  else {
    console.log(`  FALLA ${descripcion}${detalle ? ` (${detalle})` : ''}`);
    fallos.push(descripcion);
  }
}

async function pedir(ruta) {
  const url = new URL(ruta, base);
  const inicio = performance.now();
  const respuesta = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000) });
  const cuerpo = await respuesta.text();
  return { url, respuesta, cuerpo, ms: Math.round(performance.now() - inicio) };
}

try {
  console.log(`Comprobando ${base.href}`);
  const inicio = await pedir('/');
  const { respuesta, cuerpo } = inicio;

  comprobar(respuesta.status === 200, 'la página principal responde 200', `recibió ${respuesta.status}`);
  comprobar((respuesta.headers.get('content-type') ?? '').includes('text/html'), 'la página principal es HTML');
  comprobar(/<html[^>]*lang="es"/.test(cuerpo), 'el documento declara lang="es"');
  comprobar(/<title>[^<]*(Péndulo|péndulo|Simulador)/.test(cuerpo), 'el título es el del simulador');
  comprobar(/<meta\s+http-equiv="Content-Security-Policy"/.test(cuerpo), 'la página lleva la CSP (meta)');
  comprobar(!/unsafe-(inline|eval)/.test(cuerpo.match(/Content-Security-Policy"\s+content="([^"]*)"/)?.[1] ?? ''), 'la CSP no permite unsafe-inline ni unsafe-eval');
  comprobar(inicio.ms < 5000, 'la página principal responde en menos de 5 s', `${inicio.ms} ms`);

  // Todo recurso que la página enlaza debe existir y no ser otra página HTML (error típico de una
  // publicación con rutas mal configuradas: el servidor devuelve index.html en lugar de un 404).
  const recursos = [...cuerpo.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css|woff2|svg))"/g)].map((m) => m[1]);
  comprobar(recursos.length >= 3, 'la página enlaza su script, su hoja de estilo y sus fuentes', `${recursos.length} recursos`);
  for (const ruta of [...new Set(recursos)]) {
    const { respuesta: r, cuerpo: c } = await pedir(ruta);
    const tipo = r.headers.get('content-type') ?? '';
    comprobar(r.status === 200 && c.length > 0 && !tipo.includes('text/html'), `recurso ${ruta}`, `${r.status} ${tipo}`);
  }

  const robots = await pedir('/robots.txt');
  comprobar(robots.respuesta.status === 200 && /User-agent/i.test(robots.cuerpo), 'robots.txt válido');

  const cabeceras = {
    'strict-transport-security': 'HSTS (fuerza HTTPS)',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'Referrer-Policy',
    'permissions-policy': 'Permissions-Policy',
    'content-security-policy': 'CSP como cabecera (con frame-ancestors)',
  };
  const cspCabecera = respuesta.headers.get('content-security-policy');
  if (cspCabecera) {
    comprobar(/frame-ancestors/.test(cspCabecera), 'la CSP de la cabecera incluye frame-ancestors (impide incrustar el sitio)');
    comprobar(!/unsafe-(inline|eval)/.test(cspCabecera), 'la CSP de la cabecera no permite unsafe-inline ni unsafe-eval');
  }
  console.log('Cabeceras HTTP de seguridad (las fija el hosting):');
  for (const [nombre, etiqueta] of Object.entries(cabeceras)) {
    const valor = respuesta.headers.get(nombre);
    if (valor) console.log(`  ok   ${etiqueta}`);
    else if (exigirCabeceras) comprobar(false, `cabecera ${etiqueta}`);
    else {
      console.log(`  aviso falta ${etiqueta}`);
      avisos.push(etiqueta);
    }
  }
} catch (error) {
  console.log(`  FALLA no se pudo consultar el sitio: ${error instanceof Error ? error.message : error}`);
  fallos.push('el sitio no responde');
}

console.log(`\n${comprobaciones} comprobaciones, ${fallos.length} fallos, ${avisos.length} avisos de cabeceras.`);
// Se fija el código y se deja terminar solo: llamar a process.exit() con peticiones aún cerrándose
// provoca en Windows un fallo de libuv (código 127) en lugar de salir limpiamente.
process.exitCode = fallos.length === 0 ? 0 : 1;
