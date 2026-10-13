import { expect, test, type Locator, type Page } from '@playwright/test';
import { countEquationStructure, equationPlainText, theoryEquations, toPlainText } from '../src/content/equations';
import { abrir, abrirMasOpciones, sinProblemas } from './helpers';

/**
 * Ecuaciones de la hoja de Teoría: se dibujan con MathML (fracciones, raíces, subíndices,
 * sumatoria), caben en pantallas angostas (la serie larga se desplaza dentro de su caja) y, en
 * un navegador sin MathML, se ve el texto plano de respaldo.
 */

type Modelo = 'Real' | 'Ángulo pequeño';
const ECUACIONES: Record<Modelo, typeof theoryEquations.lineal> = {
  Real: theoryEquations.noLineal,
  'Ángulo pequeño': theoryEquations.lineal,
};

async function abrirTeoria(page: Page, modelo: Modelo): Promise<Locator> {
  await abrirMasOpciones(page);
  await page.getByRole('radiogroup', { name: 'Cómo se calcula' }).getByText(modelo, { exact: true }).click();
  await page.getByRole('button', { name: 'Teoría', exact: true }).click();
  const hoja = page.getByRole('dialog', { name: 'Teoría' });
  await expect(hoja).toBeVisible();
  return hoja;
}

/** Texto plano de cada ecuación como lo entrega el contenido (la referencia de estas pruebas). */
const textoPlano = (modelo: Modelo) => ECUACIONES[modelo].map(equationPlainText);

test.describe('Ecuaciones de la Teoría: MathML', () => {
  for (const modelo of ['Real', 'Ángulo pequeño'] as const) {
    test(`${modelo}: hay elementos math y las fracciones se dibujan apiladas, más altas que una línea`, async ({ page }) => {
      const problemas = await abrir(page);
      const hoja = await abrirTeoria(page, modelo);
      const esperado = ECUACIONES[modelo].map(countEquationStructure);

      await expect(hoja.locator('.eq')).toHaveCount(ECUACIONES[modelo].length);
      await expect(hoja.locator('.eq[data-mathml="true"]')).toHaveCount(ECUACIONES[modelo].length);
      expect(await hoja.locator('math').count()).toBeGreaterThanOrEqual(ECUACIONES[modelo].length);
      expect(await hoja.locator('mfrac').count()).toBe(esperado.reduce((s, c) => s + c.fractions, 0));
      expect(await hoja.locator('msqrt').count()).toBe(esperado.reduce((s, c) => s + c.roots, 0));
      expect(await hoja.locator('munderover').count()).toBe(esperado.reduce((s, c) => s + c.sums, 0));
      // Los subíndices son <msub> con <mi>, no caracteres Unicode: ni un ₀ dibujado.
      expect(await hoja.locator('msub, msubsup').count()).toBeGreaterThan(0);
      const dibujado = await hoja.locator('.eq math').evaluateAll((els) => els.map((el) => el.textContent ?? '').join(' '));
      expect(dibujado).not.toMatch(/[₀-₉]/);

      // Una fracción apilada mide más que su numerador y más que una línea de texto de la ecuación.
      const medidas = await hoja.locator('mfrac').first().evaluate((fraccion) => {
        const caja = fraccion.closest('.eq') as HTMLElement;
        return {
          fraccion: fraccion.getBoundingClientRect().height,
          numerador: (fraccion.firstElementChild as HTMLElement).getBoundingClientRect().height,
          linea: parseFloat(getComputedStyle(caja).lineHeight),
        };
      });
      expect(medidas.fraccion).toBeGreaterThan(medidas.numerador * 1.4);
      expect(medidas.fraccion).toBeGreaterThan(medidas.linea);
      sinProblemas(problemas);
    });

    test(`${modelo}: cada ecuación tiene nombre accesible no vacío (el texto plano)`, async ({ page }) => {
      const problemas = await abrir(page);
      const hoja = await abrirTeoria(page, modelo);
      const matematicas = hoja.getByRole('math');
      const etiquetas = await hoja.locator('.eq math').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
      expect(etiquetas.length).toBeGreaterThan(0);
      for (const etiqueta of etiquetas) expect(etiqueta.trim()).not.toBe('');
      // El nombre de cada <math> es el texto plano de su expresión, en el orden de la hoja.
      const esperadas = ECUACIONES[modelo].flatMap((e) => e.parts.flatMap((p) => (p.kind === 'math' ? [toPlainText(p.node)] : [])));
      expect(etiquetas).toEqual(esperadas);
      expect(await matematicas.count()).toBeGreaterThan(0);
      await expect(matematicas.first()).toHaveAccessibleName(/\S/);
      sinProblemas(problemas);
    });
  }
});

test.describe('Ecuaciones de la Teoría: pantallas angostas', () => {
  for (const ancho of [375, 320]) {
    test(`a ${ancho} px la página no se desborda y la serie larga se desplaza dentro de su caja`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      const problemas = await abrir(page);
      const hoja = await abrirTeoria(page, 'Real');
      await page.waitForTimeout(400);

      const medidas = await page.evaluate(() => {
        const cuerpo = document.querySelector('.sheet-body') as HTMLElement;
        return {
          pagina: document.documentElement.scrollWidth - window.innerWidth,
          hoja: (document.querySelector('.sheet') as HTMLElement).scrollWidth - (document.querySelector('.sheet') as HTMLElement).clientWidth,
          cuerpo: cuerpo.scrollWidth - cuerpo.clientWidth,
        };
      });
      expect(medidas.pagina).toBeLessThanOrEqual(0);
      expect(medidas.hoja).toBeLessThanOrEqual(0);
      expect(medidas.cuerpo, 'el cuerpo de la hoja no se desplaza de lado').toBeLessThanOrEqual(0);

      // La serie (la segunda ecuación del modelo real) es más ancha que la caja: se desplaza ahí dentro.
      const serie = hoja.locator('.eq').nth(1);
      await expect(serie).toHaveAttribute('role', 'region');
      await expect(serie).toHaveAttribute('tabindex', '0');
      await expect(serie).toHaveAccessibleName('Ecuación 2 de 5');
      expect(await serie.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(1);
      await expect(hoja.getByText('Esta ecuación es larga', { exact: false }).first()).toBeVisible();

      await serie.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => serie.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      sinProblemas(problemas);
    });
  }

  test('una ecuación corta no es un punto de Tab ni tiene rol de región (solo las que se desbordan)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    const problemas = await abrir(page);
    const hoja = await abrirTeoria(page, 'Real');
    await page.waitForTimeout(300);
    const primera = hoja.locator('.eq').first();
    await expect(primera).not.toHaveAttribute('tabindex', /.*/);
    await expect(primera).not.toHaveAttribute('role', /.*/);
    sinProblemas(problemas);
  });
});

test.describe('Ecuaciones de la Teoría: navegador sin MathML', () => {
  test('si la fracción no se apila, muestra el texto plano de cada ecuación y ningún <math>', async ({ page }) => {
    // Simula un Chrome sin MathML: la sonda mide la fracción con altura 0 (como si fuera texto corrido).
    await page.addInitScript(() => {
      const MATHML = 'http://www.w3.org/1998/Math/MathML';
      const medir = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function () {
        const r = medir.call(this);
        return this.namespaceURI === MATHML ? new DOMRect(r.x, r.y, r.width, 0) : r;
      };
    });
    const problemas = await abrir(page);
    for (const modelo of ['Real', 'Ángulo pequeño'] as const) {
      if (modelo === 'Ángulo pequeño') {
        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1, name: 'Péndulo simple' })).toBeVisible();
      }
      const hoja = await abrirTeoria(page, modelo);
      await expect(hoja.locator('math')).toHaveCount(0);
      await expect(hoja.locator('.eq[data-mathml="false"]')).toHaveCount(ECUACIONES[modelo].length);
      expect(await hoja.locator('.eq .eq-plain').allTextContents()).toEqual(textoPlano(modelo));
    }
    sinProblemas(problemas);
  });
});

test.describe('Ecuaciones de la Teoría: la hoja sigue funcionando', () => {
  test('Escape cierra y devuelve el foco; el foco gira dentro de la hoja; las flechas y End desplazan el cuerpo', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    const problemas = await abrir(page);
    const hoja = await abrirTeoria(page, 'Real');
    await expect(hoja.getByRole('heading', { level: 2, name: 'Teoría' })).toBeFocused();

    // Trampa de foco: con las cajas de ecuación en el orden de Tab, 15 Tab seguidos nunca salen de la hoja.
    for (let i = 0; i < 15; i += 1) {
      await page.keyboard.press('Tab');
      expect(await hoja.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await hoja.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    // Desplazamiento por teclado del cuerpo.
    const cuerpo = hoja.locator('.sheet-body');
    await cuerpo.focus();
    await page.keyboard.press('End');
    await expect.poll(() => cuerpo.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);

    await page.keyboard.press('Escape');
    await expect(hoja).toBeHidden();
    await expect(page.getByRole('button', { name: 'Teoría', exact: true })).toBeFocused();
    sinProblemas(problemas);
  });

  test('el texto de las ecuaciones se lee a 16 px o más', async ({ page }) => {
    const problemas = await abrir(page);
    const hoja = await abrirTeoria(page, 'Real');
    const tamanos = await hoja.locator('.eq math').evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
    expect(tamanos.length).toBeGreaterThan(0);
    for (const tamano of tamanos) expect(tamano).toBeGreaterThanOrEqual(16);
    sinProblemas(problemas);
  });
});
