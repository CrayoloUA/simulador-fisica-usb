import { createHash } from 'node:crypto';

/**
 * Política de seguridad de contenido (CSP) del sitio. Solo se usa en el build (ver `vite.config.ts`):
 * en desarrollo Vite necesita scripts en línea para el refresco en caliente.
 *
 * La aplicación no habla con ningún servidor, no usa recursos de terceros y no necesita código en
 * línea, así que la política es la más estricta que funciona: todo bloqueado salvo lo propio.
 * El único estilo en línea del HTML es el del `<noscript>`; se autoriza por su hash exacto.
 */
export function contentSecurityPolicy(html: string): string {
  const inlineStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
    (match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`,
  );
  return [
    "default-src 'none'",
    "script-src 'self'",
    ['style-src', "'self'", ...inlineStyles].join(' '),
    "font-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ') + ';';
}

/**
 * Pone la CSP y la política de referencia como primeros hijos del `<head>` (antes de cualquier
 * script o recurso). Es idempotente. Ojo: `frame-ancestors`, HSTS y `nosniff` no funcionan en una
 * `<meta>`; van como cabeceras HTTP del servidor (ver docs/08-seguridad-defensiva.md).
 */
export function injectCsp(html: string): string {
  if (html.includes('http-equiv="Content-Security-Policy"')) return html;
  const tags =
    `\n    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(html)}" />` +
    '\n    <meta name="referrer" content="no-referrer" />';
  return html.replace(/<head>/, `<head>${tags}`);
}
