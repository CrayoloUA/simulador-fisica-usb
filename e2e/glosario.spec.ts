import { expect, test, type Page } from '@playwright/test';
import { ELEMENT_ID, elementHelp } from '../src/content/elementHelp';
import { glossary } from '../src/content/glossary';
import { simplePendulumContent } from '../src/content/simplePendulumContent';
import { pendulumModels } from '../src/engine/phenomena/pendulum';
import { cardTerms } from '../src/ui/explain';
import { buildHelpEntries, type HelpEntry } from '../src/ui/helpEntries';
import { abrir, abrirMasOpciones, sinProblemas } from './helpers';

/*
 * Glosario dentro de la interfaz: la tarjeta del modo "¿Qué es esto?" explica, debajo de sus tres
 * bloques, las palabras poco conocidas de SU texto, y la hoja de Teoría lista todas.
 */

const titulo = (id: string) => elementHelp.find((h) => h.id === id)!.title;
const ENCABEZADO_TARJETA = 'Palabras que quizás no conozcas';
const ENCABEZADO_HOJA = 'Palabras que conviene conocer';
const entradas = buildHelpEntries(simplePendulumContent, pendulumModels['no-lineal'].paramSchema);

const boton = (page: Page) => page.getByRole('button', { name: '¿Qué es esto?', exact: true });
const marca = (page: Page, nombre: string) => page.getByRole('button', { name: `Explicar: ${nombre}`, exact: true });
const tarjeta = (page: Page) => page.locator('#explain-card');
const palabras = (page: Page) => tarjeta(page).locator('dl.glossary dt');

async function encender(page: Page): Promise<void> {
  await boton(page).click();
  await expect(boton(page)).toHaveAttribute('aria-pressed', 'true');
}

/** Abre la tarjeta de una marca que ya está a la vista. */
async function abrirTarjeta(page: Page, nombre: string): Promise<void> {
  const m = marca(page, nombre);
  await m.scrollIntoViewIfNeeded();
  await m.click();
  await expect(tarjeta(page)).toBeVisible();
  await expect(tarjeta(page).getByRole('heading', { level: 2 })).toHaveText(nombre);
  await expect(tarjeta(page).getByRole('heading', { level: 2 })).toBeFocused();
}

/** Marcas que solo existen con "Más opciones" abierto (la teoría no tiene tarjeta propia que interese aquí). */
const DEL_CAJON = new Set([
  titulo(ELEMENT_ID.calculo),
  titulo(ELEMENT_ID.comparar),
  titulo(ELEMENT_ID.velocidad),
  'Masa (m)',
  'Rozamiento del aire (b)',
  'Período con ángulo pequeño (T₀)',
  'Diferencia (T − T₀)/T₀',
  'Rapidez angular (ω₀)',
]);

/**
 * Abre, comprueba y cierra con Escape la tarjeta de TODAS las marcas, en tres pasadas: la pantalla
 * con el cajón cerrado, el cajón abierto (donde viven sus marcas) y la curva punteada (que solo
 * existe al comparar, con el cajón ya cerrado).
 */
async function recorrerTarjetas(page: Page, comprobar: (e: HelpEntry) => Promise<void>): Promise<void> {
  // "¿Qué es esto?" se explica solo en la hoja de Teoría (no tiene marca) y la marca de Teoría no abre tarjeta aquí.
  const sinTeoria = entradas.filter((e) => e.id !== ELEMENT_ID.teoria && e.id !== ELEMENT_ID.queEsEsto);
  const cerrar = async (nombre: string) => {
    await page.keyboard.press('Escape');
    await expect(tarjeta(page)).toHaveCount(0);
    await expect(marca(page, nombre)).toBeFocused();
  };
  for (const e of sinTeoria.filter((x) => !DEL_CAJON.has(x.title) && x.id !== ELEMENT_ID.curvaLineal)) {
    await abrirTarjeta(page, e.title);
    await comprobar(e);
    await cerrar(e.title);
  }
  await abrirMasOpciones(page);
  for (const e of sinTeoria.filter((x) => DEL_CAJON.has(x.title))) {
    await abrirTarjeta(page, e.title);
    await comprobar(e);
    await cerrar(e.title);
  }
  await page.getByRole('button', { name: 'Comparar con el ángulo pequeño', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).first().click();
  const lineal = entradas.find((x) => x.id === ELEMENT_ID.curvaLineal)!;
  await abrirTarjeta(page, lineal.title);
  await comprobar(lineal);
  await cerrar(lineal.title);
}

test.describe('Glosario en la tarjeta de explicación', () => {
  test('la tarjeta de la curva azul explica "Cálculo paso a paso (RK4)" bajo sus tres bloques', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirTarjeta(page, titulo(ELEMENT_ID.curvaSimulacion));
    const t = tarjeta(page);
    await expect(t.getByRole('heading', { level: 3, name: ENCABEZADO_TARJETA })).toBeVisible();
    await expect(palabras(page).filter({ hasText: 'Cálculo paso a paso (RK4)' })).toHaveCount(1);
    // Cada palabra es una lista de definiciones: el término y su explicación debajo.
    const definicion = t.locator('dl.glossary .glossary-item').filter({ hasText: 'Cálculo paso a paso (RK4)' }).locator('dd');
    await expect(definicion).toContainText('RK4 es el nombre del método');
    expect(await palabras(page).count()).toBeLessThanOrEqual(3);
    // Va después de los tres bloques, no antes.
    const orden = await t.evaluate((el) => {
      const bloques = [...el.querySelectorAll('.explain-block')];
      const glosario = el.querySelector('.explain-words')!;
      return bloques.length === 3 && bloques.every((b) => b.compareDocumentPosition(glosario) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(orden).toBe(true);
    sinProblemas(problemas);
  });

  test('la tarjeta de "Período (T)" no explica "Período" pero sí "Ida y vuelta (oscilación)"', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirTarjeta(page, 'Período (T)');
    await expect(palabras(page).filter({ hasText: 'Ida y vuelta (oscilación)' })).toHaveCount(1);
    const terminos = (await palabras(page).allTextContents()).map((t) => t.trim());
    expect(terminos).not.toContain('Período');
    sinProblemas(problemas);
  });

  test('una tarjeta sin palabras raras no muestra ni el encabezado ni la lista', async ({ page }) => {
    const problemas = await abrir(page);
    // Se comprueba contra la función pura que "Play y Pausa" no trae palabras.
    const play = entradas.find((e) => e.id === ELEMENT_ID.play)!;
    expect(cardTerms(play)).toEqual([]);
    await encender(page);
    await abrirTarjeta(page, play.title);
    await expect(tarjeta(page).getByText(ENCABEZADO_TARJETA)).toHaveCount(0);
    await expect(tarjeta(page).locator('.explain-words')).toHaveCount(0);
    await expect(tarjeta(page).locator('dl')).toHaveCount(0);
    sinProblemas(problemas);
  });

  test('cada tarjeta muestra exactamente las palabras que calcula la función pura, en su orden', async ({ page }) => {
    test.setTimeout(90_000);
    const problemas = await abrir(page);
    await encender(page);
    await recorrerTarjetas(page, async (e) => {
      const esperadas = cardTerms(e).map((t) => t.term);
      expect(await palabras(page).allTextContents(), e.title).toEqual(esperadas);
      await expect(tarjeta(page).getByText(ENCABEZADO_TARJETA)).toHaveCount(esperadas.length > 0 ? 1 : 0);
    });
    sinProblemas(problemas);
  });

  test('las palabras de la tarjeta se leen a 16 px o más y no tienen animación propia', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirTarjeta(page, titulo(ELEMENT_ID.curvaSimulacion));
    const medidas = await tarjeta(page).evaluate((el) => {
      const px = (s: string) => Number.parseFloat(getComputedStyle(el.querySelector(s)!).fontSize);
      const animado = [...el.querySelectorAll('.explain-words, .explain-words *')].some((n) => {
        const e = getComputedStyle(n);
        return e.animationName !== 'none' || !/^(0s)(, 0s)*$/.test(e.transitionDuration);
      });
      return { h3: px('.explain-words h3'), dt: px('dl.glossary dt'), dd: px('dl.glossary dd'), animado };
    });
    expect(medidas.h3).toBeGreaterThanOrEqual(16);
    expect(medidas.dt).toBeGreaterThanOrEqual(16);
    expect(medidas.dd).toBeGreaterThanOrEqual(16);
    expect(medidas.animado).toBe(false);
    sinProblemas(problemas);
  });
});

test.describe('Glosario en la hoja de Teoría', () => {
  async function abrirTeoria(page: Page) {
    await abrirMasOpciones(page);
    await page.getByRole('button', { name: 'Teoría', exact: true }).click();
    const hoja = page.getByRole('dialog', { name: 'Teoría' });
    await expect(hoja).toBeVisible();
    return hoja;
  }

  test('lista las 20 palabras del glosario, en el orden del archivo, al final de la hoja', async ({ page }) => {
    const problemas = await abrir(page);
    const hoja = await abrirTeoria(page);
    expect(glossary).toHaveLength(20);
    await expect(hoja.getByRole('heading', { level: 3, name: ENCABEZADO_HOJA })).toHaveCount(1);
    const dl = hoja.locator('dl.glossary');
    await expect(dl).toHaveCount(1);
    await expect(dl.locator('dt')).toHaveCount(20);
    await expect(dl.locator('dd')).toHaveCount(20);
    expect(await dl.locator('dt').allTextContents()).toEqual(glossary.map((g) => g.term));
    expect(await dl.locator('dd').allTextContents()).toEqual(glossary.map((g) => g.definition));
    // Es la última sección de la hoja.
    const ultima = await hoja.locator('.sheet-body > section').last().locator('h3').textContent();
    expect(ultima).toBe(ENCABEZADO_HOJA);
    sinProblemas(problemas);
  });

  test('el foco, la región desplazable y sus nombres siguen intactos; se llega al final con el teclado', async ({ page }) => {
    const problemas = await abrir(page);
    const hoja = await abrirTeoria(page);
    await expect(hoja.getByRole('heading', { level: 2, name: 'Teoría' })).toBeFocused();
    const cuerpo = hoja.locator('.sheet-body');
    await expect(cuerpo).toHaveAttribute('tabindex', '0');
    await expect(cuerpo).toHaveAttribute('role', 'region');
    await expect(cuerpo).toHaveAttribute('aria-labelledby', 'sheet-title');
    await expect(hoja).toHaveAttribute('aria-labelledby', 'sheet-title');
    await expect(hoja).toHaveAttribute('aria-modal', 'true');
    // Tab desde el título llega al botón de cerrar y luego al cuerpo desplazable; End baja hasta el final.
    await page.keyboard.press('Tab');
    await expect(hoja.getByRole('button', { name: 'Cerrar' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cuerpo).toBeFocused();
    await page.keyboard.press('End');
    const ultimaPalabra = hoja.locator('dl.glossary dt').last();
    await expect(ultimaPalabra).toBeInViewport();
    expect((await ultimaPalabra.textContent())!.trim()).toBe(glossary[glossary.length - 1].term);
    // La hoja sigue siendo modal: el fondo inerte y Escape devuelve el foco.
    await expect(page.locator('main.app')).toHaveAttribute('inert', '');
    await page.keyboard.press('Escape');
    await expect(hoja).toBeHidden();
    await expect(page.getByRole('button', { name: 'Teoría', exact: true })).toBeFocused();
    sinProblemas(problemas);
  });

  test('las definiciones de la hoja se leen a 16 px o más', async ({ page }) => {
    const problemas = await abrir(page);
    const hoja = await abrirTeoria(page);
    const medidas = await hoja.evaluate((el) => {
      const px = (s: string) => Number.parseFloat(getComputedStyle(el.querySelector(s)!).fontSize);
      return { dt: px('dl.glossary dt'), dd: px('dl.glossary dd') };
    });
    expect(medidas.dt).toBeGreaterThanOrEqual(16);
    expect(medidas.dd).toBeGreaterThanOrEqual(16);
    sinProblemas(problemas);
  });
});

test.describe('La tarjeta con glosario cabe en la ventana', () => {
  async function comprobarQueCabe(page: Page, nombre: string): Promise<void> {
    const medidas = await page.evaluate((n) => {
      const t = document.getElementById('explain-card')!;
      const r = t.getBoundingClientRect();
      const m = document.querySelector(`[aria-label="Explicar: ${n}"]`)!.getBoundingClientRect();
      const cuerpo = t.querySelector<HTMLElement>('.explain-body')!;
      return {
        r: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
        m: { left: m.left, right: m.right, top: m.top, bottom: m.bottom },
        ventana: { w: window.innerWidth, h: window.innerHeight },
        desbordaPagina: document.documentElement.scrollWidth > window.innerWidth,
        desbordaTarjeta: t.scrollWidth > t.clientWidth,
        enCajon: document.querySelector(`[aria-label="Explicar: ${n}"]`)!.closest('.drawer') !== null,
        hoja: t.dataset.sheet === 'si',
        seDesplaza: cuerpo.scrollHeight > cuerpo.clientHeight + 1,
        tabindex: cuerpo.getAttribute('tabindex'),
      };
    }, nombre);
    const { r, m, ventana } = medidas;
    expect(r.left, `${nombre} izquierda`).toBeGreaterThanOrEqual(-0.5);
    expect(r.right, `${nombre} derecha`).toBeLessThanOrEqual(ventana.w + 0.5);
    expect(r.top, `${nombre} arriba`).toBeGreaterThanOrEqual(-0.5);
    expect(r.bottom, `${nombre} abajo`).toBeLessThanOrEqual(ventana.h + 0.5);
    expect(medidas.desbordaPagina, `${nombre} desborda la página a lo ancho`).toBe(false);
    expect(medidas.desbordaTarjeta, `${nombre} desborda a lo ancho`).toBe(false);
    // La marca tocada sigue a la vista y la tarjeta no la tapa.
    expect(m.top, `${nombre}: marca a la vista`).toBeGreaterThanOrEqual(-0.5);
    expect(m.bottom, `${nombre}: marca a la vista`).toBeLessThanOrEqual(ventana.h + 0.5);
    const pisa = m.left < r.right && r.left < m.right && m.top < r.bottom && r.top < m.bottom;
    // En el celular el cajón y la tarjeta son hojas inferiores: la tarjeta cubre las marcas del cajón
    // (así era antes del glosario). Fuera del cajón, la marca debe quedar libre.
    if (!(medidas.hoja && medidas.enCajon)) expect(pisa, `la tarjeta tapa la marca "${nombre}"`).toBe(false);
    // Si el contenido no cabe se desplaza por dentro, y entonces el cuerpo se puede alcanzar con Tab.
    expect(medidas.tabindex === '0', `${nombre}: desplazable con teclado`).toBe(medidas.seDesplaza);
    if (medidas.seDesplaza) {
      // Se baja por dentro y el último párrafo o definición queda dentro de la tarjeta.
      await tarjeta(page).locator('.explain-words dl dd, .explain-block p').last().scrollIntoViewIfNeeded();
      const cajas = await page.evaluate(() => {
        const t = document.getElementById('explain-card')!.getBoundingClientRect();
        const items = document.querySelectorAll('#explain-card .explain-words dl dd, #explain-card .explain-block p');
        const u = items[items.length - 1].getBoundingClientRect();
        return { t: { top: t.top, bottom: t.bottom }, u: { top: u.top, bottom: u.bottom } };
      });
      expect(cajas.u.bottom, `${nombre}: el final queda dentro de la tarjeta`).toBeLessThanOrEqual(cajas.t.bottom + 0.5);
      expect(cajas.u.top, `${nombre}: el final queda dentro de la tarjeta`).toBeGreaterThanOrEqual(cajas.t.top - 0.5);
    }
    // Una sola tarjeta abierta.
    await expect(page.locator('#explain-card')).toHaveCount(1);
  }

  for (const [ancho, alto] of [
    [1366, 768],
    [375, 667],
  ]) {
    test(`con las marcas encendidas, la tarjeta más larga y todas las demás caben en ${ancho} × ${alto}`, async ({ page }, info) => {
      test.skip(info.project.name === 'movil', 'los tamaños se fijan a mano en la ventana de escritorio');
      test.setTimeout(90_000);
      const problemas = await abrir(page);
      await page.setViewportSize({ width: ancho, height: alto });
      await encender(page);
      await recorrerTarjetas(page, (e) => comprobarQueCabe(page, e.title));
      sinProblemas(problemas);
    });
  }

  test('en el celular de verdad (Pixel 7) todas las tarjetas caben y el contenido largo se desplaza por dentro', async ({ page }, info) => {
    test.skip(info.project.name !== 'movil', 'solo en el proyecto móvil');
    test.setTimeout(90_000);
    const problemas = await abrir(page);
    await encender(page);
    await recorrerTarjetas(page, (e) => comprobarQueCabe(page, e.title));
    sinProblemas(problemas);
  });
});

test.describe('Glosario: una sola tarjeta y cierre con Escape', () => {
  test('tocar otra marca reemplaza la tarjeta y su glosario; Escape la cierra y devuelve el foco', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirTarjeta(page, 'Período (T)');
    const primeras = await palabras(page).allTextContents();
    await marca(page, 'Frecuencia (f)').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#explain-card')).toHaveCount(1);
    await expect(tarjeta(page).getByRole('heading', { level: 2 })).toHaveText('Frecuencia (f)');
    const segundas = (await palabras(page).allTextContents()).map((t) => t.trim());
    expect(segundas).not.toEqual(primeras);
    expect(segundas).toContain('Período');
    await page.keyboard.press('Escape');
    await expect(tarjeta(page)).toHaveCount(0);
    await expect(marca(page, 'Frecuencia (f)')).toBeFocused();
    sinProblemas(problemas);
  });
});
