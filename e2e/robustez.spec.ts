import { expect, test } from '@playwright/test';
import { abrir, abrirMasOpciones, sinProblemas, tiempoSimulado } from './helpers';

test.describe('Robustez y seguridad (regresión de las Fases 8 y 9)', () => {
  test('la CSP del build prohíbe código en línea y eval, y bloquea scripts en línea, red externa e imágenes externas', async ({ page }) => {
    const problemas = await abrir(page);
    // `page.evaluate` va por CDP y se salta la restricción de eval/new Function del documento (ahí
    // la CSP no se puede ejercitar), así que su política se comprueba tal como llega al navegador.
    const politica = (await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')) ?? '';
    expect(politica).toContain("default-src 'none'");
    expect(politica).toContain("script-src 'self';");
    expect(politica).not.toMatch(/unsafe-(inline|eval)/);
    const resultado = await page.evaluate(async () => {
      const intento = async (accion: () => unknown) => {
        try {
          await accion();
          return 'PERMITIDO';
        } catch {
          return 'bloqueado';
        }
      };
      const script = document.createElement('script');
      script.textContent = 'window.__inyectado = true';
      document.body.appendChild(script);
      return {
        enLinea: (window as unknown as { __inyectado?: boolean }).__inyectado ? 'PERMITIDO' : 'bloqueado',
        red: await intento(() => fetch('https://example.com/', { mode: 'no-cors' })),
        imagen: await new Promise<string>((resolver) => {
          const img = new Image();
          img.onload = () => resolver('PERMITIDA');
          img.onerror = () => resolver('bloqueada');
          img.src = 'https://example.com/x.png';
        }),
      };
    });
    expect(resultado).toEqual({ enLinea: 'bloqueado', red: 'bloqueado', imagen: 'bloqueada' });
    // Esos intentos provocan violaciones esperadas: aquí se comprueba que la CSP las reporta.
    expect(problemas.consola.some((m) => m.startsWith('CSP:'))).toBe(true);
  });

  test('una carga y un uso normales no producen ninguna violación de la CSP', async ({ page }) => {
    const problemas = await abrir(page);
    await page.getByRole('button', { name: 'Play' }).click();
    await expect.poll(() => tiempoSimulado(page)).toBeGreaterThan(0.3);
    await abrirMasOpciones(page);
    await page.getByRole('button', { name: 'Teoría' }).click();
    await expect(page.getByRole('dialog', { name: 'Teoría' })).toBeVisible();
    expect(problemas.consola.filter((m) => m.startsWith('CSP:'))).toEqual([]);
    sinProblemas(problemas);
  });

  test('un deslizador con min/max alterados no deja que el estado salga del rango del modelo', async ({ page }) => {
    const problemas = await abrir(page);
    const largo = page.getByRole('slider', { name: /Largo del hilo/ });
    await largo.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.setAttribute('min', '-1e308');
      input.setAttribute('max', '1e308');
      input.setAttribute('step', 'any');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '123456789');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // El estado se recorta al máximo del modelo (5 m); no queda "123456789 m".
    await expect(page.getByText(/123\.?456\.?789/)).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Resultados' })).not.toContainText(/NaN|Infinity/);
    sinProblemas(problemas);
  });

  test('un selector de velocidad manipulado no cuelga ni congela la simulación', async ({ page }) => {
    const problemas = await abrir(page);
    await page.getByRole('button', { name: 'Play' }).click();
    await abrirMasOpciones(page);

    for (const hostil of ['20000', '1e308', 'NaN', 'abc', '-3', 'Infinity']) {
      await page
        .getByRole('radiogroup', { name: 'Velocidad de la simulación' })
        .getByRole('radio')
        .first()
        .evaluate((el, valor) => {
          const radio = el as HTMLInputElement;
          radio.value = valor;
          radio.click();
        }, hostil);
    }
    // La página sigue viva (responde a un clic) y sin pantalla de error.
    await expect(page.getByRole('alert').filter({ hasText: 'El simulador se trabó' })).toHaveCount(0);
    await page.getByRole('radiogroup', { name: 'Velocidad de la simulación' }).getByText('1×', { exact: true }).click();
    const antes = await tiempoSimulado(page);
    await expect.poll(() => tiempoSimulado(page), { timeout: 8000 }).toBeGreaterThan(antes);
    sinProblemas(problemas);
  });

  test('un fallo al dibujar muestra un mensaje fijo, sin filtrar el texto del error, y ofrece recargar', async ({ page }) => {
    await abrir(page);
    await page.evaluate(() => {
      Number.prototype.toFixed = function () {
        throw new Error('SECRETO-INTERNO-123');
      };
    });
    await page.getByRole('button', { name: /^Luna:/ }).click();

    const aviso = page.getByRole('alert').filter({ hasText: 'El simulador se trabó' });
    await expect(aviso).toBeVisible();
    await expect(aviso.getByRole('button', { name: 'Recargar la página' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('SECRETO-INTERNO');
  });
});

test.describe('Página 404', () => {
  test('se sirve con su estilo propio (fondo y tipografía), no con el del navegador', async ({ page }) => {
    // La hoja se enlaza como /404.css (ruta desde la raíz): abierta desde disco (file://) no carga y
    // la página queda sin estilo; servida por HTTP, que es como se publica, debe verse con su diseño.
    const hojas: number[] = [];
    page.on('response', (r) => r.url().endsWith('/404.css') && hojas.push(r.status()));
    await page.goto('/404.html');
    await expect(page.getByRole('heading', { level: 1, name: 'No encontramos esa página' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver al simulador del péndulo' })).toHaveAttribute('href', '/');
    const estilo = await page.evaluate(() => ({
      fondo: getComputedStyle(document.body).backgroundColor,
      fuente: getComputedStyle(document.body).fontFamily,
    }));
    expect(hojas).toEqual([200]);
    expect(estilo.fondo).toBe('rgb(249, 247, 241)');
    expect(estilo.fuente).not.toMatch(/Times/);
  });
});

test.describe('Diseño adaptable', () => {
  test('no hay desplazamiento horizontal y los controles principales caben en pantalla', async ({ page }) => {
    const problemas = await abrir(page);
    const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(desborda).toBe(false);
    await expect(page.getByRole('button', { name: 'Play' })).toBeInViewport();
    sinProblemas(problemas);
  });

  test('los controles táctiles miden al menos 24 px (WCAG 2.5.8; los deslizadores tienen campo equivalente)', async ({ page }) => {
    const problemas = await abrir(page);
    await abrirMasOpciones(page);
    const pequenos = await page.evaluate(() =>
      [...document.querySelectorAll('button, select, summary, a, label.seg')]
        .map((el) => ({ el, r: (el as HTMLElement).getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24))
        .map(({ el, r }) => `${el.tagName} "${(el.textContent ?? '').trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`),
    );
    expect(pequenos).toEqual([]);
    sinProblemas(problemas);
  });

  test('las fuentes propias se cargan sin pedir nada a terceros', async ({ page }) => {
    const externas: string[] = [];
    page.on('request', (peticion) => {
      if (!peticion.url().startsWith('http://localhost')) externas.push(peticion.url());
    });
    const problemas = await abrir(page);
    await page.evaluate(() => document.fonts.ready);
    const familias = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
    expect(familias.join(' ')).toContain('IBM Plex Sans');
    expect(externas).toEqual([]);
    sinProblemas(problemas);
  });
});
