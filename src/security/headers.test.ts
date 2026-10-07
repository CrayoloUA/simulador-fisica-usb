import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, injectCsp } from './csp';
import { headersFileFromHtml } from './headers';

const HTML = injectCsp(
  '<!doctype html><html><head><title>x</title></head><body><noscript><style>body{color:#000}</style></noscript></body></html>',
);

/** Interpreta el formato de Cloudflare Pages: una ruta sin sangría y debajo sus cabeceras con sangría. */
function interpretar(archivo: string): Record<string, Record<string, string>> {
  const reglas: Record<string, Record<string, string>> = {};
  let actual = '';
  for (const linea of archivo.split('\n')) {
    if (linea.trim() === '' || linea.startsWith('#')) continue;
    if (!linea.startsWith(' ')) {
      actual = linea.trim();
      reglas[actual] = {};
    } else {
      const corte = linea.indexOf(':');
      reglas[actual][linea.slice(0, corte).trim()] = linea.slice(corte + 1).trim();
    }
  }
  return reglas;
}

describe('headersFileFromHtml', () => {
  const archivo = headersFileFromHtml(HTML);
  const reglas = interpretar(archivo);
  const global = reglas['/*'];

  it('aplica las cabeceras de seguridad a todas las rutas', () => {
    expect(global).toBeDefined();
    expect(global['X-Content-Type-Options']).toBe('nosniff');
    expect(global['Referrer-Policy']).toBe('no-referrer');
    expect(global['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(global['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=(), payment=()');
  });

  it('HSTS dura un año y no incluye subdominios ni precarga (el dominio puede cambiar)', () => {
    expect(global['Strict-Transport-Security']).toBe('max-age=31536000');
  });

  it('la CSP de la cabecera es la de la meta más frame-ancestors (que solo vale como cabecera)', () => {
    const deMeta = contentSecurityPolicy(HTML);
    expect(global['Content-Security-Policy']).toBe(`${deMeta} frame-ancestors 'none';`);
  });

  it('no permite código en línea ni eval', () => {
    expect(global['Content-Security-Policy']).not.toMatch(/unsafe-(inline|eval)/);
  });

  it('los archivos con hash en el nombre se cachean un año; las fuentes, una semana; el HTML no se fija', () => {
    expect(reglas['/assets/*']['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(reglas['/fonts/*']['Cache-Control']).toBe('public, max-age=604800');
    expect(Object.keys(reglas)).not.toContain('/');
    expect(Object.keys(reglas)).not.toContain('/index.html');
  });

  it('respeta los límites de Cloudflare: menos de 100 reglas y líneas de menos de 2000 caracteres', () => {
    expect(Object.keys(reglas).length).toBeLessThan(100);
    for (const linea of archivo.split('\n')) expect(linea.length).toBeLessThan(2000);
  });

  it('falla de forma explícita si el HTML no trae la CSP (mejor que publicar sin ella)', () => {
    expect(() => headersFileFromHtml('<html><head></head></html>')).toThrow(/Content-Security-Policy/);
  });
});
