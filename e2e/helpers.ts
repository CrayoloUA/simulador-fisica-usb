import { expect, type Page } from '@playwright/test';

export interface Problemas {
  consola: string[];
  excepciones: string[];
}

/**
 * Abre la aplicación y vigila lo que nunca debe ocurrir en un uso normal: errores de consola (la
 * CSP también los reporta ahí), excepciones sin capturar. Cada prueba comprueba al final que la
 * lista siga vacía (`sinProblemas`).
 */
export async function abrir(page: Page, ruta = '/'): Promise<Problemas> {
  const problemas: Problemas = { consola: [], excepciones: [] };
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') problemas.consola.push(mensaje.text());
  });
  page.on('pageerror', (error) => problemas.excepciones.push(error.message));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(`CSP: ${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  await page.goto(ruta);
  await expect(page.getByRole('heading', { level: 1, name: 'Péndulo simple' })).toBeVisible();
  return problemas;
}

export function sinProblemas(problemas: Problemas): void {
  expect(problemas.excepciones, 'excepciones sin capturar').toEqual([]);
  expect(problemas.consola, 'errores de consola').toEqual([]);
}

/** Texto de la lectura "En vivo": `t = 1,23 s, θ = 4,5°, ω = 0,67 rad/s`. */
export function lecturaEnVivo(page: Page) {
  return page.getByText(/^En vivo:/);
}

/** Tiempo simulado (s) leído de la lectura "En vivo". */
export async function tiempoSimulado(page: Page): Promise<number> {
  const texto = (await lecturaEnVivo(page).textContent()) ?? '';
  const coincidencia = /t = ([\d,]+) s/.exec(texto);
  if (!coincidencia) throw new Error(`No se pudo leer el tiempo de: ${texto}`);
  return Number(coincidencia[1].replace(',', '.'));
}

/** Período (s) que muestra el panel de resultados: `2,011 s`. */
export async function periodoMostrado(page: Page): Promise<number> {
  const region = page.getByRole('region', { name: 'Resultados' });
  const texto = (await region.textContent()) ?? '';
  const coincidencia = /Período \(T\).*?([\d.]+,\d+) s/s.exec(texto);
  if (!coincidencia) throw new Error(`No se pudo leer el período de: ${texto}`);
  return Number(coincidencia[1].replace('.', '').replace(',', '.'));
}

/** Pone un valor en un deslizador como lo haría el usuario (evento `input` nativo). */
export async function fijarDeslizador(page: Page, nombre: string | RegExp, valor: number): Promise<void> {
  await page.getByRole('slider', { name: nombre }).first().evaluate((el, v) => {
    const input = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, valor);
}

export async function abrirMasOpciones(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await expect(page.getByRole('heading', { name: 'Más opciones' })).toBeFocused();
}
