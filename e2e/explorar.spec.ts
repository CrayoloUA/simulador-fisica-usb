import { expect, test } from '@playwright/test';
import { abrir, fijarDeslizador, periodoMostrado, sinProblemas, tiempoSimulado } from './helpers';

test.describe('Explorar: flujo básico', () => {
  test('carga limpia con los controles y los resultados iniciales', async ({ page }) => {
    const problemas = await abrir(page);
    await expect(page.getByRole('radio', { name: 'Explorar' })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reiniciar' })).toBeVisible();
    await expect(page.getByRole('slider', { name: /Largo del hilo/ })).toHaveValue('1');
    await expect(page.getByRole('slider', { name: /Ángulo de salida/ })).toHaveValue('10');
    await expect(page.getByRole('slider', { name: /Gravedad/ })).toHaveValue('9.8');
    expect(await periodoMostrado(page)).toBeCloseTo(2.011, 3);
    sinProblemas(problemas);
  });

  test('Play hace avanzar el tiempo, Pausa lo detiene y Reiniciar lo vuelve a cero', async ({ page }) => {
    const problemas = await abrir(page);
    expect(await tiempoSimulado(page)).toBe(0);

    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('button', { name: 'Pausa' })).toBeVisible();
    await expect.poll(() => tiempoSimulado(page), { timeout: 5000 }).toBeGreaterThan(0.5);

    await page.getByRole('button', { name: 'Pausa' }).click();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    // La lectura se refresca cada 200 ms: se espera a que se asiente antes de comparar.
    await page.waitForTimeout(500);
    const congelado = await tiempoSimulado(page);
    await page.waitForTimeout(700);
    expect(await tiempoSimulado(page)).toBe(congelado);

    await page.getByRole('button', { name: 'Reiniciar' }).click();
    await expect.poll(() => tiempoSimulado(page)).toBe(0);
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    sinProblemas(problemas);
  });

  test('cuadruplicar el largo del hilo duplica el período (T ∝ √L)', async ({ page }) => {
    const problemas = await abrir(page);
    const corto = await periodoMostrado(page);
    await fijarDeslizador(page, /Largo del hilo/, 4);
    await expect.poll(() => periodoMostrado(page)).toBeGreaterThan(corto * 1.9);
    const largo = await periodoMostrado(page);
    expect(largo / corto).toBeCloseTo(2, 1);
    sinProblemas(problemas);
  });

  test('la gravedad de la Luna alarga el período y el botón queda marcado', async ({ page }) => {
    const problemas = await abrir(page);
    const tierra = await periodoMostrado(page);
    const luna = page.getByRole('button', { name: /^Luna:/ });
    await luna.click();
    await expect(luna).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /^Tierra:/ })).toHaveAttribute('aria-pressed', 'false');
    // T ∝ 1/√g: √(9,8 / 1,62) ≈ 2,46 veces más largo.
    expect(await periodoMostrado(page)).toBeCloseTo(tierra * Math.sqrt(9.8 / 1.62), 1);
    sinProblemas(problemas);
  });

  test('con teclado: Espacio activa Play y las flechas mueven el deslizador', async ({ page }) => {
    const problemas = await abrir(page);
    const play = page.getByRole('button', { name: 'Play' });
    await play.focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Pausa' })).toBeVisible();

    const largo = page.getByRole('slider', { name: /Largo del hilo/ });
    await largo.focus();
    const antes = Number(await largo.inputValue());
    await page.keyboard.press('ArrowRight');
    expect(Number(await largo.inputValue())).toBeGreaterThan(antes);
    sinProblemas(problemas);
  });

  test('una vez cargada, funciona sin conexión (no pide nada a ningún servidor)', async ({ page, context }) => {
    const problemas = await abrir(page);
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Play' }).click();
    await expect.poll(() => tiempoSimulado(page), { timeout: 5000 }).toBeGreaterThan(0.5);
    await fijarDeslizador(page, /Largo del hilo/, 2);
    await expect.poll(() => periodoMostrado(page)).toBeGreaterThan(2.5);
    sinProblemas(problemas);
  });

  test('la lectura "En vivo" describe el estado para lectores de pantalla', async ({ page }) => {
    const problemas = await abrir(page);
    await expect(page.getByRole('img', { name: /Péndulo: una bola colgada/ })).toBeVisible();
    await expect(page.getByRole('img', { name: /Gráfica del ángulo/ })).toBeVisible();
    await expect(page.getByText(/^En vivo: t = 0,00 s, θ = 10,0°/)).toBeAttached();
    sinProblemas(problemas);
  });
});
