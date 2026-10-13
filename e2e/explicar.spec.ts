import { expect, test, type Locator, type Page } from '@playwright/test';
import { ELEMENT_ID, elementHelp } from '../src/content/elementHelp';
import { abrir, abrirMasOpciones, fijarDeslizador, sinProblemas } from './helpers';

/*
 * Modo "¿Qué es esto?": un botón enciende unas marcas junto a cada parte explicable (también las
 * que viven dentro del dibujo en canvas) y, al tocar una, se abre UNA tarjeta con tres bloques.
 */

const titulo = (id: string) => elementHelp.find((h) => h.id === id)!.title;
const TRES_BLOQUES = ['Qué es', 'Por qué es así', 'Qué pasaría si no fuera así'];
const TRES_BLOQUES_PARAMETRO = ['De dónde sale', 'Para qué sirve', 'Si la cambias u omites'];

/** Marcas que hay con el cajón cerrado, en Explorar, con la comparación apagada. */
const MARCAS_EXPLORAR = [
  { nombre: titulo(ELEMENT_ID.pendulo), bloques: TRES_BLOQUES },
  { nombre: titulo(ELEMENT_ID.salida), bloques: TRES_BLOQUES },
  { nombre: titulo(ELEMENT_ID.vertical), bloques: TRES_BLOQUES },
  { nombre: titulo(ELEMENT_ID.grafica), bloques: TRES_BLOQUES },
  { nombre: titulo(ELEMENT_ID.curvaSimulacion), bloques: TRES_BLOQUES },
  { nombre: titulo(ELEMENT_ID.play), bloques: TRES_BLOQUES },
  { nombre: titulo(ELEMENT_ID.reiniciar), bloques: TRES_BLOQUES },
  { nombre: 'Largo del hilo (L)', bloques: TRES_BLOQUES_PARAMETRO },
  { nombre: 'Ángulo de salida (φ₀)', bloques: TRES_BLOQUES_PARAMETRO },
  { nombre: 'Gravedad (g)', bloques: TRES_BLOQUES_PARAMETRO },
  { nombre: 'Período (T)', bloques: TRES_BLOQUES },
  { nombre: 'Frecuencia (f)', bloques: TRES_BLOQUES },
  { nombre: titulo(ELEMENT_ID.masOpciones), bloques: TRES_BLOQUES },
];

/** Marcas que aparecen además al abrir "Más opciones" (y la curva punteada, al comparar). */
const MARCAS_CAJON = [
  { nombre: titulo(ELEMENT_ID.calculo), bloques: TRES_BLOQUES },
  { nombre: titulo(ELEMENT_ID.comparar), bloques: TRES_BLOQUES },
  { nombre: 'Masa (m)', bloques: TRES_BLOQUES_PARAMETRO },
  { nombre: 'Rozamiento del aire (b)', bloques: TRES_BLOQUES_PARAMETRO },
  { nombre: titulo(ELEMENT_ID.velocidad), bloques: TRES_BLOQUES },
  { nombre: 'Período con ángulo pequeño (T₀)', bloques: TRES_BLOQUES },
  { nombre: 'Diferencia (T − T₀)/T₀', bloques: TRES_BLOQUES },
  { nombre: 'Rapidez angular (ω₀)', bloques: TRES_BLOQUES },
  { nombre: titulo(ELEMENT_ID.teoria), bloques: TRES_BLOQUES },
];

const boton = (page: Page) => page.getByRole('button', { name: '¿Qué es esto?', exact: true });
const marca = (page: Page, nombre: string) => page.getByRole('button', { name: `Explicar: ${nombre}`, exact: true });
const tarjeta = (page: Page) => page.locator('#explain-card');
const marcasVisibles = (page: Page) => page.locator('.mark:visible');

async function encender(page: Page): Promise<void> {
  await boton(page).click();
  await expect(boton(page)).toHaveAttribute('aria-pressed', 'true');
}

/** Abre la tarjeta de una marca con un clic, y comprueba sus tres bloques y su accesibilidad. */
async function abrirYComprobar(page: Page, nombre: string, bloques: string[]): Promise<void> {
  const m = marca(page, nombre);
  await m.scrollIntoViewIfNeeded();
  await expect(m).toHaveAttribute('aria-expanded', 'false');
  await expect(m).not.toHaveAttribute('aria-controls', /./);
  await m.click();
  await expect(m).toHaveAttribute('aria-expanded', 'true');
  await expect(m).toHaveAttribute('aria-controls', 'explain-card');
  const t = tarjeta(page);
  await expect(t).toBeVisible();
  await expect(page.locator('#explain-card')).toHaveCount(1);
  await expect(t.getByRole('heading', { level: 2 })).toHaveText(nombre);
  // Los h3 de los bloques; "Palabras que quizás no conozcas" también es h3 (va fuera de .explain-block).
  await expect(t.locator('.explain-block').getByRole('heading', { level: 3 })).toHaveText(bloques);
  for (const parrafo of await t.locator('.explain-block p').all()) {
    expect(((await parrafo.textContent()) ?? '').trim().length).toBeGreaterThan(20);
  }
  // El foco pasa a la tarjeta (a su título) y su nombre es el de la parte.
  await expect(t.getByRole('heading', { level: 2 })).toBeFocused();
  await expect(page.getByRole('dialog', { name: nombre })).toBeVisible();
}

async function cerrarConEscape(page: Page, nombre: string): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(tarjeta(page)).toHaveCount(0);
  const m = marca(page, nombre);
  await expect(m).toBeFocused();
  await expect(m).toHaveAttribute('aria-expanded', 'false');
  await expect(m).not.toHaveAttribute('aria-controls', /./);
}

/** Píxeles cuyo color difiere de verdad (más de 8 niveles de 255 en algún canal) entre dos capturas del mismo tamaño. */
function pixelesDistintos(page: Page, a: Buffer, b: Buffer): Promise<number> {
  const url = (captura: Buffer) => 'data:image/png;base64,' + captura.toString('base64');
  return page.evaluate(
    async ([ua, ub]) => {
      const cargar = (src: string) =>
        new Promise<HTMLImageElement>((resolver) => {
          const imagen = new Image();
          imagen.onload = () => resolver(imagen);
          imagen.src = src;
        });
      const [ia, ib] = await Promise.all([cargar(ua), cargar(ub)]);
      const leer = (imagen: HTMLImageElement) => {
        const lienzo = document.createElement('canvas');
        lienzo.width = imagen.width;
        lienzo.height = imagen.height;
        const ctx = lienzo.getContext('2d')!;
        ctx.drawImage(imagen, 0, 0);
        return ctx.getImageData(0, 0, imagen.width, imagen.height);
      };
      const da = leer(ia);
      const db = leer(ib);
      if (da.width !== db.width || da.height !== db.height) return Number.MAX_SAFE_INTEGER;
      let distintos = 0;
      for (let k = 0; k < da.data.length; k += 4) {
        const dif = Math.max(Math.abs(da.data[k] - db.data[k]), Math.abs(da.data[k + 1] - db.data[k + 1]), Math.abs(da.data[k + 2] - db.data[k + 2]));
        if (dif > 8) distintos++;
      }
      return distintos;
    },
    [url(a), url(b)],
  );
}

/** Cuenta los elementos con los que se puede interactuar ahora mismo (visibles y no inert). */
function interactivos(page: Page): Promise<number> {
  return page.evaluate(() => {
    const todos = document.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
    );
    return [...todos].filter((el) => {
      if (el.closest('[inert]')) return false;
      const estilo = getComputedStyle(el);
      return el.getClientRects().length > 0 && estilo.visibility !== 'hidden' && estilo.display !== 'none';
    }).length;
  });
}

/**
 * Cajas de las marcas y de lo que no deben tapar (valores, textos, controles y otras marcas), en px de
 * la ventana. `cajon` limita la medición a lo que vive dentro del cajón (true) o fuera de él (false):
 * en el celular el cajón es una hoja que flota sobre la página, así que no se mezclan. En el celular
 * la ventana se alarga para medir la página entera sin que la barra fija de Play tape lo de abajo.
 */
async function solapes(page: Page, cajon?: boolean): Promise<string[]> {
  const ventana = page.viewportSize();
  if (ventana && ventana.width <= 900 && ventana.height < 3200) {
    await page.setViewportSize({ width: ventana.width, height: 3200 });
    await page.waitForTimeout(300);
  }
  return page.evaluate((cajonPedido) => {
    type Caja = { nombre: string; x: number; y: number; w: number; h: number };
    const visible = (el: Element) => {
      const estilo = getComputedStyle(el);
      if (cajonPedido !== undefined && (el.closest('.drawer') !== null) !== cajonPedido) return false;
      return !el.closest('[inert]') && el.getClientRects().length > 0 && estilo.visibility !== 'hidden' && estilo.display !== 'none';
    };
    const cajaDe = (nombre: string, r: DOMRect | DOMRectReadOnly): Caja => ({ nombre, x: r.x, y: r.y, w: r.width, h: r.height });
    const marcas: Array<Caja & { el: Element }> = [...document.querySelectorAll('.mark')]
      .filter(visible)
      .map((el) => ({ ...cajaDe(el.getAttribute('aria-label') ?? 'marca', el.getBoundingClientRect()), el }));
    // Controles: se mide su caja completa. Textos y valores: se miden sus líneas reales (no el bloque).
    const controles: Caja[] = [...document.querySelectorAll('button:not(.mark), input, select, a[href], .chip, .range')]
      .filter(visible)
      .map((el) => cajaDe(`control ${el.textContent?.trim().slice(0, 24) || el.getAttribute('aria-label') || el.tagName}`, el.getBoundingClientRect()));
    const textos: Caja[] = [];
    for (const el of document.querySelectorAll('.pval, .rbig, .rlabel, .rsub, .rf, .curios dt, .curios dd, .plabel, .note, h1, h2, h3, .explain-hint, .hint, .lesson-name, .instruction, .question')) {
      if (!visible(el) || el.closest('.explain-card')) continue;
      // Solo las líneas de texto de verdad (no las cajas de lo que el elemento contenga, como una marca).
      const recorrido = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let nodo = recorrido.nextNode(); nodo; nodo = recorrido.nextNode()) {
        if (!(nodo.textContent ?? '').trim() || nodo.parentElement?.closest('.mark')) continue;
        const rango = document.createRange();
        rango.selectNodeContents(nodo);
        for (const r of rango.getClientRects()) {
          if (r.width > 0 && r.height > 0) textos.push(cajaDe(`texto "${(nodo.textContent ?? '').trim().slice(0, 24)}"`, r));
        }
      }
    }
    const pisa = (a: Caja, b: Caja) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
    const problemas: string[] = [];
    for (const m of marcas) {
      for (const otro of [...controles, ...textos]) {
        // Un control que contiene a la marca (la marca vive dentro de su bloque) no cuenta.
        if (pisa(m, otro)) problemas.push(`${m.nombre} pisa ${otro.nombre}`);
      }
      for (const otra of marcas) if (otra !== m && m.nombre < otra.nombre && pisa(m, otra)) problemas.push(`${m.nombre} pisa ${otra.nombre}`);
    }
    return problemas;
  }, cajon);
}

test.describe('Modo "¿Qué es esto?": encendido y apagado', () => {
  test('al cargar está apagado: sin marcas, sin tarjeta, sin aviso y con el presupuesto de 13 elementos interactivos', async ({ page }, info) => {
    const problemas = await abrir(page);
    await expect(boton(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(marcasVisibles(page)).toHaveCount(0);
    await expect(tarjeta(page)).toHaveCount(0);
    await expect(page.getByText('Toca una marca para entender esa parte.', { exact: true })).toHaveCount(0);
    expect(await interactivos(page)).toBe(13);

    if (info.project.name === 'escritorio') {
      // Sin desplazamiento de la página a 1366 × 768.
      await page.setViewportSize({ width: 1366, height: 768 });
      const alto = await page.evaluate(() => ({ contenido: document.documentElement.scrollHeight, ventana: window.innerHeight }));
      expect(alto.contenido).toBeLessThanOrEqual(alto.ventana);
    }
    sinProblemas(problemas);
  });

  test('encendido muestra el aviso fijo y una marca con nombre "Explicar: …" junto a cada parte de Explorar', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await expect(page.getByText('Toca una marca para entender esa parte.', { exact: true })).toBeVisible();
    // El aviso visible ya no es región viva; el anuncio para lectores de pantalla lleva la misma frase.
    await expect(page.locator('.explain-hint')).not.toHaveAttribute('role', /./);
    await expect(page.getByRole('status').filter({ hasText: 'Marcas de ayuda activadas. Toca una marca para entender esa parte.' })).toHaveCount(1);
    await expect(marcasVisibles(page)).toHaveCount(MARCAS_EXPLORAR.length);
    for (const { nombre } of MARCAS_EXPLORAR) await expect(marca(page, nombre)).toBeVisible();
    sinProblemas(problemas);
  });

  test('cada marca mide al menos 44 px y el aviso y los textos de la interfaz, al menos 16 px', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    const medidas = await page.evaluate(() =>
      [...document.querySelectorAll('.mark')]
        .filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden')
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { nombre: el.getAttribute('aria-label'), w: r.width, h: r.height };
        }),
    );
    expect(medidas.length).toBeGreaterThan(10);
    for (const m of medidas) {
      expect(m.w, `${m.nombre} ancho`).toBeGreaterThanOrEqual(44);
      expect(m.h, `${m.nombre} alto`).toBeGreaterThanOrEqual(44);
    }
    const letra = await page.evaluate(() => {
      const nombres = ['.explain-hint', '.explain-toggle'];
      return nombres.map((s) => Number.parseFloat(getComputedStyle(document.querySelector(s)!).fontSize));
    });
    for (const px of letra) expect(px).toBeGreaterThanOrEqual(16);
    sinProblemas(problemas);
  });

  test('apagarlo quita las marcas y el aviso, y cierra la tarjeta abierta', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirYComprobar(page, 'Reiniciar', TRES_BLOQUES);
    await boton(page).click();
    await expect(boton(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(marcasVisibles(page)).toHaveCount(0);
    await expect(tarjeta(page)).toHaveCount(0);
    await expect(page.getByText('Toca una marca para entender esa parte.', { exact: true })).toHaveCount(0);
    sinProblemas(problemas);
  });

  test('con el modo apagado después de usarlo la pantalla queda idéntica a como estaba', async ({ page }) => {
    const problemas = await abrir(page);
    await page.mouse.move(0, 0);
    await expect(page.getByText('Presiona')).toBeVisible();
    // Con las tipografías ya cargadas (si llegan después del primer dibujo, la pantalla cambia sola).
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const antes = await page.screenshot();
    await encender(page);
    await abrirYComprobar(page, 'Largo del hilo (L)', TRES_BLOQUES_PARAMETRO);
    await page.keyboard.press('Escape');
    await boton(page).click();
    await expect(marcasVisibles(page)).toHaveCount(0);
    await page.mouse.move(0, 0);
    await boton(page).evaluate((el) => (el as HTMLElement).blur());
    // Se reintenta unos segundos (la transición de color del botón al quitar el puntero dura 120 ms y
    // en una máquina ocupada puede tardar más). Se tolera el ruido de rasterizado de los bordes
    // redondeados (1 o 2 niveles de 255 en unos pocos píxeles); cualquier otra diferencia falla.
    await expect(async () => {
      expect(await pixelesDistintos(page, antes, await page.screenshot())).toBe(0);
    }).toPass({ timeout: 5000 });
    sinProblemas(problemas);
  });
});

test.describe('Modo "¿Qué es esto?": tarjeta de explicación', () => {
  test('cada marca de Explorar abre su tarjeta con tres bloques; Escape la cierra y el foco vuelve a la marca', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    for (const { nombre, bloques } of MARCAS_EXPLORAR) {
      await abrirYComprobar(page, nombre, bloques);
      await cerrarConEscape(page, nombre);
    }
    sinProblemas(problemas);
  });

  test('las marcas del cajón y la curva punteada también explican, cada una con sus tres bloques', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirMasOpciones(page);
    await expect(marcasVisibles(page)).toHaveCount(MARCAS_EXPLORAR.length + MARCAS_CAJON.length);
    for (const { nombre, bloques } of MARCAS_CAJON.filter((m) => m.nombre !== titulo(ELEMENT_ID.teoria))) {
      await abrirYComprobar(page, nombre, bloques);
      await cerrarConEscape(page, nombre);
    }
    // La curva punteada solo existe al comparar: ahí aparece su marca (y la tarjeta de la azul sigue).
    await expect(marca(page, titulo(ELEMENT_ID.curvaLineal))).toHaveCount(0);
    await page.getByRole('button', { name: 'Comparar con el ángulo pequeño', exact: true }).click();
    await expect(marca(page, titulo(ELEMENT_ID.curvaLineal))).toBeVisible();
    await abrirYComprobar(page, titulo(ELEMENT_ID.curvaLineal), TRES_BLOQUES);
    await cerrarConEscape(page, titulo(ELEMENT_ID.curvaLineal));
    await abrirYComprobar(page, titulo(ELEMENT_ID.curvaSimulacion), TRES_BLOQUES);
    sinProblemas(problemas);
  });

  test('solo hay una tarjeta abierta: tocar otra marca reemplaza la anterior y tocar la misma la cierra', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirYComprobar(page, 'Gravedad (g)', TRES_BLOQUES_PARAMETRO);
    // La tarjeta puede tapar otras marcas: se llega a la otra con el teclado, como haría quien no usa ratón.
    await marca(page, 'Frecuencia (f)').focus();
    await page.keyboard.press('Enter');
    await expect(tarjeta(page)).toHaveCount(1);
    await expect(tarjeta(page).getByRole('heading', { level: 2 })).toHaveText('Frecuencia (f)');
    await expect(marca(page, 'Gravedad (g)')).toHaveAttribute('aria-expanded', 'false');
    await expect(marca(page, 'Frecuencia (f)')).toHaveAttribute('aria-expanded', 'true');
    await marca(page, 'Frecuencia (f)').focus();
    await page.keyboard.press('Enter');
    await expect(tarjeta(page)).toHaveCount(0);
    sinProblemas(problemas);
  });

  test('un clic fuera de la tarjeta la cierra; dentro de ella no', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirYComprobar(page, 'Período (T)', TRES_BLOQUES);
    await tarjeta(page).getByRole('heading', { level: 3 }).first().click();
    await expect(tarjeta(page)).toHaveCount(1);
    await page.getByRole('heading', { level: 1, name: 'Péndulo simple' }).click();
    await expect(tarjeta(page)).toHaveCount(0);
    sinProblemas(problemas);
  });

  test('el botón de cerrar de la tarjeta la cierra y devuelve el foco a la marca', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirYComprobar(page, 'Reiniciar', TRES_BLOQUES);
    await tarjeta(page).getByRole('button', { name: 'Cerrar explicación' }).click();
    await expect(tarjeta(page)).toHaveCount(0);
    await expect(marca(page, 'Reiniciar')).toBeFocused();
    sinProblemas(problemas);
  });

  test('con teclado: Enter abre la tarjeta de una marca y Escape la cierra devolviendo el foco', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    const m = marca(page, 'Play y Pausa');
    await m.focus();
    await page.keyboard.press('Enter');
    await expect(tarjeta(page)).toBeVisible();
    await expect(tarjeta(page).getByRole('heading', { level: 2 })).toHaveText('Play y Pausa');
    await cerrarConEscape(page, 'Play y Pausa');
    sinProblemas(problemas);
  });

  test('Escape cierra primero la tarjeta y no el cajón; otro Escape cierra el cajón', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirMasOpciones(page);
    await abrirYComprobar(page, titulo(ELEMENT_ID.calculo), TRES_BLOQUES);
    await cerrarConEscape(page, titulo(ELEMENT_ID.calculo));
    await expect(page.getByRole('heading', { name: 'Más opciones', level: 2 })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Más opciones', exact: true })).toHaveAttribute('aria-expanded', 'false');
    sinProblemas(problemas);
  });

  test('si el cajón se cierra con una tarjeta suya abierta, la tarjeta se cierra sola', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirMasOpciones(page);
    await abrirYComprobar(page, 'Masa (m)', TRES_BLOQUES_PARAMETRO);
    // Con teclado (sin pulsar con el puntero): la tarjeta se cierra porque su marca desaparece, no por el toque fuera.
    const cerrarCajon = page.getByRole('button', { name: 'Cerrar', exact: true });
    await cerrarCajon.first().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Más opciones', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await expect(tarjeta(page)).toHaveCount(0);
    sinProblemas(problemas);
  });

  test('la tarjeta cabe en la ventana y no tapa su marca', async ({ page }, info) => {
    const problemas = await abrir(page);
    await encender(page);
    for (const { nombre } of MARCAS_EXPLORAR) {
      await abrirYComprobar(page, nombre, nombre.includes('(L)') || nombre.includes('(φ₀)') || nombre.includes('(g)') ? TRES_BLOQUES_PARAMETRO : TRES_BLOQUES);
      const cajas = await page.evaluate((n) => {
        const t = document.getElementById('explain-card')!.getBoundingClientRect();
        const m = document.querySelector(`[aria-label="Explicar: ${n}"]`)!.getBoundingClientRect();
        return { t, m, w: window.innerWidth, h: window.innerHeight, hoja: document.getElementById('explain-card')!.dataset.sheet };
      }, nombre);
      expect(cajas.t.left).toBeGreaterThanOrEqual(-0.5);
      expect(cajas.t.right).toBeLessThanOrEqual(cajas.w + 0.5);
      expect(cajas.t.top).toBeGreaterThanOrEqual(-0.5);
      expect(cajas.t.bottom).toBeLessThanOrEqual(cajas.h + 0.5);
      const pisa = cajas.m.left < cajas.t.right && cajas.t.left < cajas.m.right && cajas.m.top < cajas.t.bottom && cajas.t.top < cajas.m.bottom;
      expect(pisa, `la tarjeta tapa la marca "${nombre}"`).toBe(false);
      expect(cajas.hoja === 'si').toBe(info.project.name === 'movil');
      if (cajas.hoja === 'si') {
        // La hoja se apoya sobre la barra de Play (que sigue pegada abajo y a la vista) y no la tapa.
        const barra = await page.evaluate(() => {
          const b = document.querySelector('.actions')!.getBoundingClientRect();
          return { top: b.top, bottom: b.bottom, alto: window.innerHeight };
        });
        expect(barra.bottom).toBeCloseTo(barra.alto, 0);
        expect(cajas.t.bottom).toBeLessThanOrEqual(barra.top + 0.5);
      }
      await page.keyboard.press('Escape');
    }
    sinProblemas(problemas);
  });

  test('las explicaciones salen de la misma fuente que "Qué es cada cosa" de la hoja de Teoría', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirYComprobar(page, titulo(ELEMENT_ID.curvaSimulacion), TRES_BLOQUES);
    const bloques = await tarjeta(page).locator('.explain-block p').allTextContents();
    await page.keyboard.press('Escape');
    await abrirMasOpciones(page);
    await page.getByRole('button', { name: 'Teoría', exact: true }).click();
    const hoja = page.getByRole('dialog', { name: 'Teoría' });
    await expect(hoja).toBeVisible();
    const entrada = hoja.locator('li').filter({ has: page.locator('h4', { hasText: titulo(ELEMENT_ID.curvaSimulacion) }) });
    await expect(entrada).toHaveCount(1);
    for (const texto of bloques) await expect(entrada).toContainText(texto);
    for (const encabezado of TRES_BLOQUES) await expect(entrada).toContainText(encabezado);
    // Y la hoja explica también el propio botón.
    await expect(hoja.locator('li').filter({ has: page.locator('h4', { hasText: '¿Qué es esto?' }) })).toHaveCount(1);
    sinProblemas(problemas);
  });
});

test.describe('Modo "¿Qué es esto?": las marcas no tapan nada', () => {
  test('en Explorar, con el cajón cerrado, ninguna marca pisa valores, textos, controles ni otra marca', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await expect.poll(() => solapes(page)).toEqual([]);
    sinProblemas(problemas);
  });

  test('comparando y con el cajón abierto, ninguna marca pisa valores, textos, controles ni otra marca', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await abrirMasOpciones(page);
    await page.getByRole('button', { name: 'Comparar con el ángulo pequeño', exact: true }).click();
    await expect(marca(page, titulo(ELEMENT_ID.curvaLineal))).toBeVisible();
    // En escritorio el cajón empuja la página (todo se mide junto); en el celular es una hoja que flota
    // encima, así que se miden por separado la página y el cajón.
    if ((page.viewportSize()?.width ?? 0) > 900) await expect.poll(() => solapes(page)).toEqual([]);
    await expect.poll(() => solapes(page, false)).toEqual([]);
    await expect.poll(() => solapes(page, true)).toEqual([]);
    sinProblemas(problemas);
  });

  test('con ángulos y largos extremos las marcas del dibujo siguen dentro de su caja y sin pisarse', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    for (const [largo, angulo] of [[0.1, 60], [5, 60], [5, 1], [0.1, 1]]) {
      await fijarDeslizador(page, /Largo del hilo/, largo);
      await fijarDeslizador(page, /Ángulo de salida/, angulo);
      const cajas = await page.evaluate(() => {
        const caja = (el: Element) => el.getBoundingClientRect();
        const escenario = caja(document.querySelector('.stage')!);
        const marcas = [...document.querySelectorAll('.stage .mark')].map((el) => ({ n: el.getAttribute('aria-label')!, r: caja(el) }));
        return { escenario, marcas };
      });
      expect(cajas.marcas).toHaveLength(3);
      for (const { n, r } of cajas.marcas) {
        expect(r.left, n).toBeGreaterThanOrEqual(cajas.escenario.left - 0.5);
        expect(r.right, n).toBeLessThanOrEqual(cajas.escenario.right + 0.5);
        expect(r.top, n).toBeGreaterThanOrEqual(cajas.escenario.top - 0.5);
        expect(r.bottom, n).toBeLessThanOrEqual(cajas.escenario.bottom + 0.5);
      }
      await expect.poll(() => solapes(page), { message: `L = ${largo}, φ₀ = ${angulo}` }).toEqual([]);
    }
    sinProblemas(problemas);
  });

  test('el dibujo se repinta con el tamaño: al girar o redimensionar las marcas siguen su sitio', async ({ page }, info) => {
    test.skip(info.project.name === 'movil', 'el redimensionado se ejercita en la ventana de escritorio');
    const problemas = await abrir(page);
    await encender(page);
    for (const [w, h] of [[1100, 700], [960, 640], [1366, 768]]) {
      await page.setViewportSize({ width: w, height: h });
      await expect.poll(() => solapes(page)).toEqual([]);
      const dentro = await page.evaluate(() => {
        const e = document.querySelector('.stage')!.getBoundingClientRect();
        const c = document.querySelector('.chartbox')!.getBoundingClientRect();
        return [...document.querySelectorAll('.stage .mark, .chartbox .mark')].every((m) => {
          const r = m.getBoundingClientRect();
          const caja = m.closest('.stage') ? e : c;
          return r.left >= caja.left - 0.5 && r.right <= caja.right + 0.5 && r.top >= caja.top - 0.5 && r.bottom <= caja.bottom + 0.5;
        });
      });
      expect(dentro, `${w} × ${h}`).toBe(true);
    }
    sinProblemas(problemas);
  });
});

test.describe('Modo "¿Qué es esto?": Experimentos', () => {
  async function entrarEnExperimento(page: Page, titulo: RegExp): Promise<Locator> {
    await page.getByText('Experimentos', { exact: true }).click();
    await page.getByRole('button', { name: titulo }).click();
    return page.getByRole('region', { name: 'Experimentos guiados' });
  }

  test('el modo sigue encendido al pasar a Experimentos y explica el dibujo, la gráfica y los controles de ahí', async ({ page }) => {
    const problemas = await abrir(page);
    await encender(page);
    await page.getByText('Experimentos', { exact: true }).click();
    await expect(boton(page)).toHaveAttribute('aria-pressed', 'true');
    // Sin cajón: no hay marca de "Más opciones" ni de lo que vive en él.
    await expect(marca(page, titulo(ELEMENT_ID.masOpciones))).toHaveCount(0);
    for (const { nombre, bloques } of MARCAS_EXPLORAR.filter((m) => m.nombre !== titulo(ELEMENT_ID.masOpciones))) {
      await abrirYComprobar(page, nombre, bloques);
      await cerrarConEscape(page, nombre);
    }
    sinProblemas(problemas);
  });

  test('con un paso que resalta un control, la marca convive con el resaltado y no tapa nada', async ({ page }) => {
    const problemas = await abrir(page);
    const leccion = await entrarEnExperimento(page, /¿Depende de la longitud\?/);
    await leccion.getByText('Se duplica', { exact: true }).click();
    await leccion.getByRole('button', { name: 'Continuar' }).click();
    await leccion.getByRole('button', { name: 'Preparar valores' }).click();
    await leccion.getByRole('button', { name: 'Continuar' }).click();
    await expect(leccion.getByRole('heading', { name: 'Paso 2 de 3' })).toBeVisible();
    await expect(page.locator('.param.hl')).toHaveCount(1);
    await encender(page);
    // La marca de L está dentro del bloque resaltado y se puede abrir.
    await expect(page.locator('.param.hl').locator('.mark')).toHaveCount(1);
    await abrirYComprobar(page, 'Largo del hilo (L)', TRES_BLOQUES_PARAMETRO);
    await page.keyboard.press('Escape');
    await expect.poll(() => solapes(page)).toEqual([]);
    // El paso sigue funcionando con las marcas encendidas.
    await fijarDeslizador(page, /Largo del hilo/, 4);
    await expect(page.getByRole('slider', { name: /Largo del hilo/ }).first()).toHaveValue('4');
    sinProblemas(problemas);
  });

  test('con un paso que pide mirar T, su marca no tapa el valor', async ({ page }) => {
    const problemas = await abrir(page);
    const leccion = await entrarEnExperimento(page, /Conoce el péndulo/);
    await leccion.getByText('Oscila de un lado a otro y vuelve a pasar por el mismo punto', { exact: true }).click();
    await leccion.getByRole('button', { name: 'Continuar' }).click();
    await leccion.getByRole('button', { name: 'Preparar valores' }).click();
    await leccion.getByRole('button', { name: 'Continuar' }).click();
    await expect(leccion.getByRole('heading', { name: 'Paso 2 de 2' })).toBeVisible();
    await expect(page.locator('.results .hl')).toHaveCount(1);
    await encender(page);
    await expect.poll(() => solapes(page)).toEqual([]);
    sinProblemas(problemas);
  });
});
