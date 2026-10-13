import { expect, test, type Page } from '@playwright/test';
import { abrir, abrirMasOpciones, periodoMostrado, sinProblemas } from './helpers';

/** Abre un experimento de la lista (modo Experimentos) y devuelve la región de la lección. */
async function empezar(page: Page, titulo: RegExp) {
  await page.getByText('Experimentos', { exact: true }).click();
  await page.getByRole('button', { name: titulo }).click();
  return page.getByRole('region', { name: 'Experimentos guiados' });
}

test.describe('Experimentos guiados', () => {
  test('"¿Depende de la longitud?" de principio a fin: predecir, probar, comprobar y concluir', async ({ page }) => {
    const problemas = await abrir(page);
    const leccion = await empezar(page, /¿Depende de la longitud\?/);

    // 1. Predecir: sin elegir, no se puede continuar.
    await expect(leccion.getByRole('heading', { name: 'Tu predicción' })).toBeVisible();
    await expect(leccion.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    await leccion.getByText('Se duplica', { exact: true }).click();
    await leccion.getByRole('button', { name: 'Continuar' }).click();

    // 2. Probar, paso 1: "Preparar valores" deja L = 1 m y φ₀ = 10°.
    await expect(leccion.getByRole('heading', { name: 'Paso 1 de 3' })).toBeVisible();
    await leccion.getByRole('button', { name: 'Preparar valores' }).click();
    await expect(page.getByRole('slider', { name: /Largo del hilo/ }).first()).toHaveValue('1');
    await expect(page.getByRole('slider', { name: /Ángulo de salida/ }).first()).toHaveValue('10');
    const corto = await periodoMostrado(page);
    await leccion.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2: cambiar L a 4 m y ver que T se duplica.
    await expect(leccion.getByRole('heading', { name: 'Paso 2 de 3' })).toBeVisible();
    await page.getByRole('slider', { name: /Largo del hilo/ }).first().evaluate((el) => {
      const input = el as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '4');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect.poll(() => periodoMostrado(page)).toBeGreaterThan(corto * 1.9);
    await leccion.getByRole('button', { name: 'Continuar' }).click();

    // Paso 3: comparar.
    await expect(leccion.getByRole('heading', { name: 'Paso 3 de 3' })).toBeVisible();
    await leccion.getByRole('button', { name: 'Continuar' }).click();

    // 3. Comprobar.
    await expect(leccion.getByRole('heading', { name: 'Comprueba lo que viste' })).toBeVisible();
    await expect(leccion.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    await leccion.getByText('Se hizo el doble', { exact: true }).click();
    await leccion.getByRole('button', { name: 'Continuar' }).click();

    // 4. Concluir.
    await expect(leccion.getByRole('heading', { name: 'Lo que aprendiste' })).toBeVisible();
    await expect(leccion.getByText(/Tu predicción salió bien/)).toBeVisible();
    await expect(leccion.getByText(/T por √4 = 2/)).toBeVisible();
    sinProblemas(problemas);
  });

  test('una predicción equivocada no se felicita al concluir', async ({ page }) => {
    const problemas = await abrir(page);
    const leccion = await empezar(page, /¿Depende de la longitud\?/);
    await leccion.getByText('No cambia', { exact: true }).click();
    await leccion.getByRole('button', { name: 'Continuar' }).click();
    for (let paso = 1; paso <= 3; paso++) {
      const preparar = leccion.getByRole('button', { name: 'Preparar valores' });
      if (await preparar.count()) await preparar.click();
      await leccion.getByRole('button', { name: 'Continuar' }).click();
    }
    await leccion.getByText('Se hizo el doble', { exact: true }).click();
    await leccion.getByRole('button', { name: 'Continuar' }).click();

    await expect(leccion.getByRole('heading', { name: 'Lo que aprendiste' })).toBeVisible();
    await expect(leccion.getByText(/no coincidió con lo que viste/)).toBeVisible();
    await expect(leccion).not.toContainText('salió bien');
    sinProblemas(problemas);
  });

  test('"Volver a la lista" abandona el experimento y Explorar recupera los controles completos', async ({ page }) => {
    const problemas = await abrir(page);
    const leccion = await empezar(page, /¿Depende de la masa\?/);
    await expect(leccion.getByRole('list', { name: 'Etapas del experimento' })).toBeVisible();
    await leccion.getByRole('button', { name: 'Volver a la lista' }).click();
    await expect(page.getByRole('heading', { name: 'Elige un experimento' })).toBeVisible();

    await page.getByText('Explorar', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Más opciones' })).toBeVisible();
    sinProblemas(problemas);
  });

  test('"¿Y del ángulo?" pasa al modelo Real aunque se hubiera elegido "Ángulo pequeño"', async ({ page }) => {
    const problemas = await abrir(page);
    await abrirMasOpciones(page);
    await page.getByRole('radiogroup', { name: 'Cómo se calcula' }).getByText('Ángulo pequeño', { exact: true }).click();
    await expect(page.getByRole('slider', { name: /Ángulo de salida/ })).toHaveAttribute('max', '15');

    await empezar(page, /¿Y del ángulo\?/);
    await page.getByText('Explorar', { exact: true }).click();
    await expect(page.getByRole('slider', { name: /Ángulo de salida/ })).toHaveAttribute('max', '60');
    sinProblemas(problemas);
  });
});
