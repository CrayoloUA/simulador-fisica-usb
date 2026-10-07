import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { injectCsp } from './src/security/csp';
import { headersFileFromHtml } from './src/security/headers';

let salida = 'dist';

export default defineConfig({
  plugins: [
    react(),
    {
      // CSP solo en el build: el servidor de desarrollo necesita scripts en línea para el refresco.
      name: 'inyectar-csp',
      apply: 'build',
      transformIndexHtml: { order: 'post', handler: injectCsp },
    },
    {
      // Cabeceras HTTP de Cloudflare Pages (`dist/_headers`), derivadas del HTML ya construido.
      name: 'generar-headers',
      apply: 'build',
      configResolved(config) {
        salida = resolve(config.root, config.build.outDir);
      },
      closeBundle() {
        const html = readFileSync(resolve(salida, 'index.html'), 'utf8');
        writeFileSync(resolve(salida, '_headers'), headersFileFromHtml(html));
      },
    },
  ],
  test: {
    environment: 'node',
    // Por omisión Vitest vacía los .css (también con ?raw): se deja pasar tokens.css para que
    // src/render/theme.test.ts compruebe el contraste de los colores reales de los tokens.
    css: { include: [/tokens\.css/] },
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts'],
      exclude: ['**/*.test.ts'],
    },
  },
});
