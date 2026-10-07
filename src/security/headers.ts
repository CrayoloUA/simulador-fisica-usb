/**
 * Archivo `_headers` de Cloudflare Pages. Una `<meta>` no puede expresar `frame-ancestors`, HSTS ni
 * `nosniff`: esas cabeceras tienen que ir en la respuesta HTTP, y en Cloudflare Pages se declaran en
 * un archivo `_headers` dentro de `dist/`.
 *
 * Se genera en cada build a partir del HTML ya construido, así la CSP de la cabecera es siempre la
 * misma que la de la `<meta>` (incluido el hash del `<style>` del `<noscript>`), más `frame-ancestors`.
 */

/** Política de seguridad por defecto: nadie puede incrustar el sitio. Decisión pendiente (ver docs/12). */
const FRAME_ANCESTORS = "frame-ancestors 'none';";

export function headersFileFromHtml(html: string): string {
  const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]*)"/.exec(html)?.[1];
  if (!csp) {
    throw new Error('El HTML no contiene la meta Content-Security-Policy: no se genera _headers sin ella.');
  }
  return [
    '# Generado en cada build por src/security/headers.ts. No editar a mano: se pierde al reconstruir.',
    '/*',
    `  Content-Security-Policy: ${csp} ${FRAME_ANCESTORS}`,
    '  Strict-Transport-Security: max-age=31536000',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: no-referrer',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '',
    '# Los archivos de assets llevan un hash en el nombre: cada versión es otro archivo, así que',
    '# se pueden guardar un año sin riesgo de servir uno viejo.',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '# Las fuentes tienen nombre fijo: una semana, para poder cambiarlas sin esperar un año.',
    '/fonts/*',
    '  Cache-Control: public, max-age=604800',
    '',
  ].join('\n');
}
