import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, injectCsp } from './csp';

const STYLE = 'body{color:#141a29}';
const HTML = `<!doctype html><html><head><title>x</title></head><body><noscript><style>${STYLE}</style><p>sin js</p></noscript></body></html>`;
const hash = `'sha256-${createHash('sha256').update(STYLE).digest('base64')}'`;

describe('contentSecurityPolicy', () => {
  const policy = contentSecurityPolicy(HTML);
  const directives = Object.fromEntries(
    policy.split(';').map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values];
    }),
  );

  it('bloquea todo por omisión y solo permite scripts propios', () => {
    expect(directives['default-src']).toEqual(["'none'"]);
    expect(directives['script-src']).toEqual(["'self'"]);
  });

  it('nunca permite código en línea ni eval', () => {
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it('autoriza el <style> del noscript por su hash exacto', () => {
    expect(directives['style-src']).toEqual(["'self'", hash]);
  });

  it('sin <style> en línea no agrega hashes', () => {
    const plain = contentSecurityPolicy('<html><body></body></html>');
    expect(plain).toContain("style-src 'self';");
  });

  it('prohíbe red hacia terceros, plugins, base y formularios', () => {
    expect(directives['connect-src']).toEqual(["'self'"]);
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['base-uri']).toEqual(["'none'"]);
    expect(directives['form-action']).toEqual(["'none'"]);
  });

  it('permite fuentes e imágenes solo del mismo origen (y data: en imágenes)', () => {
    expect(directives['font-src']).toEqual(["'self'"]);
    expect(directives['img-src']).toEqual(["'self'", 'data:']);
  });
});

describe('injectCsp', () => {
  it('inserta la meta CSP como primer hijo del head, antes de cualquier script', () => {
    const out = injectCsp('<html><head><meta charset="UTF-8" /><script src="/a.js"></script></head></html>');
    const csp = out.indexOf('http-equiv="Content-Security-Policy"');
    expect(csp).toBeGreaterThan(-1);
    expect(csp).toBeLessThan(out.indexOf('<meta charset'));
    expect(csp).toBeLessThan(out.indexOf('<script'));
  });

  it('agrega la política de referencia sin enviar el origen', () => {
    expect(injectCsp('<html><head></head></html>')).toContain('<meta name="referrer" content="no-referrer" />');
  });

  it('no duplica la meta si ya existe', () => {
    const once = injectCsp('<html><head></head></html>');
    expect(injectCsp(once).match(/Content-Security-Policy/g)).toHaveLength(1);
  });

  it('el hash del style del HTML real coincide con el de la política inyectada', () => {
    expect(injectCsp(HTML)).toContain(hash);
  });
});
