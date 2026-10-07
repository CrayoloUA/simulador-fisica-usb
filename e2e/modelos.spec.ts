import { expect, test } from '@playwright/test';
import { abrir, abrirMasOpciones, fijarDeslizador, periodoMostrado, sinProblemas } from './helpers';

test.describe('Modelos, comparación y teoría', () => {
  test('pasar a "Ángulo pequeño" limita φ₀ a 15°, lo avisa y reinicia; volver a "Real" devuelve el rango de 60°', async ({ page }) => {
    const problemas = await abrir(page);
    const angulo = page.getByRole('slider', { name: /Ángulo de salida/ });
    await expect(angulo).toHaveAttribute('max', '60');

    await fijarDeslizador(page, /Ángulo de salida/, 40);
    await expect(angulo).toHaveValue('40');

    await abrirMasOpciones(page);
    // El radio real está oculto bajo su etiqueta: se hace clic en el texto, como el estudiante.
    const modelos = page.getByRole('radiogroup', { name: 'Cómo se calcula' });
    await modelos.getByText('Ángulo pequeño', { exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Ángulo pequeño' })).toBeChecked();
    await expect(angulo).toHaveAttribute('max', '15');
    await expect(angulo).toHaveValue('15');
    // El cambio nunca es silencioso: el lector de pantalla recibe un anuncio.
    await expect(page.getByRole('status').filter({ hasText: /./ }).first()).toBeAttached();

    await modelos.getByText('Real', { exact: true }).click();
    await expect(angulo).toHaveAttribute('max', '60');
    sinProblemas(problemas);
  });

  test('un ángulo grande avisa que la cuenta fácil ya no sirve', async ({ page }) => {
    const problemas = await abrir(page);
    await fijarDeslizador(page, /Ángulo de salida/, 50);
    await expect(page.getByText(/Ángulo grande/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver la comparación' })).toBeVisible();
    sinProblemas(problemas);
  });

  test('"Comparar con el ángulo pequeño" muestra y oculta la curva punteada (cambia la descripción de la gráfica)', async ({ page }) => {
    const problemas = await abrir(page);
    const grafica = page.getByRole('img', { name: /Gráfica del ángulo/ });
    const sola = await grafica.getAttribute('aria-label');

    await abrirMasOpciones(page);
    const boton = page.getByRole('button', { name: /Comparar con el ángulo pequeño|Ocultar/ });
    await boton.click();
    await expect.poll(() => grafica.getAttribute('aria-label')).not.toBe(sola);
    const conComparacion = await grafica.getAttribute('aria-label');
    expect(conComparacion).toMatch(/aproximación|ángulo pequeño|lineal/i);

    await boton.click();
    await expect.poll(() => grafica.getAttribute('aria-label')).toBe(sola);
    sinProblemas(problemas);
  });

  test('la masa no cambia el período (la masa se cancela)', async ({ page }) => {
    const problemas = await abrir(page);
    const antes = await periodoMostrado(page);
    await abrirMasOpciones(page);
    await fijarDeslizador(page, /Masa/, 5);
    await expect(page.getByRole('slider', { name: /Masa/ })).toHaveValue('5');
    expect(await periodoMostrado(page)).toBe(antes);
    sinProblemas(problemas);
  });

  test('la teoría se abre como diálogo, deja el fondo inerte, se cierra con Escape y devuelve el foco', async ({ page }) => {
    const problemas = await abrir(page);
    await abrirMasOpciones(page);
    const abrirTeoria = page.getByRole('button', { name: 'Teoría' });
    await abrirTeoria.click();

    const dialogo = page.getByRole('dialog', { name: 'Teoría' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByText('Largo del hilo (L)')).toBeVisible();
    await expect(page.locator('main.app')).toHaveAttribute('inert', '');

    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
    await expect(page.locator('main.app')).not.toHaveAttribute('inert', '');
    await expect(abrirTeoria).toBeFocused();
    sinProblemas(problemas);
  });
});
