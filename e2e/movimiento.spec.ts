import { expect, test, type Page } from '@playwright/test';
import { abrir, abrirMasOpciones, fijarDeslizador, sinProblemas } from './helpers';

/*
 * Movimiento con propósito (fase D5). Aquí no se mira "cómo se ve" sino lo que el navegador calcula de
 * verdad: las transiciones y animaciones de cada elemento en los estados principales de la pantalla.
 *
 *   (a) Nada anima propiedades de layout y ninguna duración pasa de 300 ms.
 *   (b) Con "reducir movimiento" no queda nada que use transform (ni translate, scale, rotate) y todo dura
 *       120 ms o menos.
 *   (c) Ningún :hover queda fuera de la media query de ratón.
 *   (d) Abrir y cerrar rápido es interrumpible: el estado final es el esperado y la consola, limpia.
 * Más: cada animación nueva cumple su contrato (propiedades, duración, curva) y al cargar nada se mueve.
 */

/** Curva de salida fuerte de tokens.css (`--ease`), tal como la devuelve el navegador. */
const EASE = 'cubic-bezier(0.25, 1, 0.5, 1)';
/** Lo único que se anima: transform y opacity (con sus propiedades sueltas) y el color de fondo de los botones. */
const PERMITIDAS = ['opacity', 'transform', 'translate', 'scale', 'rotate', 'background-color', 'visibility'];
/** Las propiedades que mueven o escalan: con "reducir movimiento" no deben animarse. */
const DE_MOVIMIENTO = ['transform', 'translate', 'scale', 'rotate'];

interface Fila {
  elemento: string;
  prop: string;
  dur: number;
  delay: number;
  origen: 'transicion' | 'animacion';
}

interface Viva {
  elemento: string;
  tipo: string;
  prop: string;
  dur: number;
  delay: number;
  easing: string;
}

const esMovil = (info: { project: { name: string } }) => info.project.name === 'movil';

/**
 * Lee, en la página, las transiciones y animaciones declaradas de todos los elementos (y de sus
 * ::before y ::after): lo que el CSS promete, ya resuelto por el navegador. Descarta el valor por
 * omisión (`all 0s`), que no anima nada.
 */
function auditar(page: Page): Promise<Fila[]> {
  return page.evaluate(() => {
    const tiempo = (texto: string) => {
      const m = /^(-?\d*\.?\d+)(ms|s)$/.exec(texto.trim());
      return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : 0;
    };
    const lista = (texto: string) => texto.split(',').map((parte) => parte.trim());
    const nombre = (el: Element, pseudo: string | null) =>
      `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''}${pseudo ?? ''}`;
    const filas: Array<{ elemento: string; prop: string; dur: number; delay: number; origen: 'transicion' | 'animacion' }> = [];
    for (const el of document.querySelectorAll('*')) {
      for (const pseudo of [null, '::before', '::after']) {
        const estilo = getComputedStyle(el, pseudo);
        const props = lista(estilo.transitionProperty);
        const durs = lista(estilo.transitionDuration).map(tiempo);
        const retrasos = lista(estilo.transitionDelay).map(tiempo);
        props.forEach((prop, i) => {
          const dur = durs[i % durs.length];
          const delay = retrasos[i % retrasos.length];
          if (dur === 0 && delay === 0) return;
          filas.push({ elemento: nombre(el, pseudo), prop, dur, delay, origen: 'transicion' });
        });
        const nombres = lista(estilo.animationName);
        const duracionesAnim = lista(estilo.animationDuration).map(tiempo);
        nombres.forEach((animacion, i) => {
          if (animacion === 'none') return;
          filas.push({ elemento: nombre(el, pseudo), prop: `@keyframes ${animacion}`, dur: duracionesAnim[i % duracionesAnim.length], delay: 0, origen: 'animacion' });
        });
      }
    }
    return filas;
  });
}

/**
 * Las animaciones (CSSTransition y CSSAnimation) que aparecen en la página durante `ventanaMs`: se
 * muestrea cada cuadro y se junta todo lo visto, así una transición corta se ve aunque React tarde un
 * cuadro en pintar. Con 0 es una sola muestra de lo que está vivo ahora.
 */
function muestrear(page: Page, ventanaMs: number, esperar?: string): Promise<Viva[]> {
  return page.evaluate(async ([ms, esperado]) => {
    const describir = (a: Animation) => {
      const efecto = a.effect as KeyframeEffect;
      const t = efecto.getTiming();
      const el = efecto.target;
      return {
        elemento: el ? `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''}` : '?',
        tipo: a.constructor.name,
        prop: (a as CSSTransition).transitionProperty ?? (a as CSSAnimation).animationName,
        dur: Number(t.duration),
        delay: Number(t.delay),
        easing: String(t.easing),
      };
    };
    const vistas = new Map<Animation, ReturnType<typeof describir>>();
    const inicio = performance.now();
    // Con `esperado` no se rinde antes de ver una animación de ese elemento (hasta 2 s): con la máquina cargada React puede tardar.
    const visto = () => esperado === undefined || [...vistas.values()].some((v) => v.elemento.includes(esperado));
    do {
      for (const a of document.getAnimations()) if (!vistas.has(a)) vistas.set(a, describir(a));
      await new Promise((resolver) => requestAnimationFrame(resolver));
    } while (performance.now() - inicio < ms || (!visto() && performance.now() - inicio < 2000));
    return [...vistas.values()];
  }, [ventanaMs, esperar] as const);
}

/** Lo que está animándose ahora mismo. */
const vivas = (page: Page): Promise<Viva[]> => muestrear(page, 0);

/**
 * Hace algo (que dispara una transición) y devuelve las animaciones que aparecen en los 150 ms
 * siguientes. `esperar` es parte del nombre del elemento que tiene que animarse: se sigue mirando
 * hasta verlo (con la máquina cargada React puede tardar). Sin `esperar` solo se miran los 150 ms (para
 * comprobar que NO aparece nada).
 */
async function vivasTras(page: Page, accion: () => Promise<unknown>, esperar?: string): Promise<Viva[]> {
  await accion();
  return muestrear(page, 150, esperar);
}

/** Espera a que el navegador no tenga nada animándose. */
async function enReposo(page: Page): Promise<void> {
  await expect.poll(async () => (await vivas(page)).length, { message: 'transiciones aún en marcha' }).toBe(0);
}

const de = (animaciones: Viva[], elemento: string) => animaciones.filter((a) => a.elemento.includes(elemento));
const propsDe = (animaciones: Viva[], elemento: string) => de(animaciones, elemento).map((a) => a.prop).sort();

/** Prepara cada uno de los estados principales de la pantalla. */
const ESTADOS: Array<{ nombre: string; preparar: (page: Page) => Promise<void> }> = [
  { nombre: 'pantalla inicial', preparar: async () => {} },
  {
    nombre: 'aviso del modelo (ángulo grande)',
    preparar: async (page) => {
      await fijarDeslizador(page, /Ángulo de salida/, 45);
      await expect(page.locator('.notice')).toBeVisible();
    },
  },
  { nombre: 'cajón "Más opciones" abierto', preparar: abrirMasOpciones },
  {
    nombre: 'hoja de Teoría abierta',
    preparar: async (page) => {
      await abrirMasOpciones(page);
      await page.getByRole('button', { name: 'Teoría', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Teoría' })).toBeVisible();
    },
  },
  {
    nombre: 'modo "¿Qué es esto?" con una tarjeta abierta',
    preparar: async (page) => {
      await page.getByRole('button', { name: '¿Qué es esto?', exact: true }).click();
      await page.getByRole('button', { name: 'Explicar: Gravedad (g)', exact: true }).click();
      await expect(page.locator('#explain-card')).toBeVisible();
    },
  },
  { nombre: 'experimento con la comprobación respondida', preparar: irAComprobacionRespondida },
];

async function irAComprobacionRespondida(page: Page): Promise<void> {
  const leccion = page.getByRole('region', { name: 'Experimentos guiados' });
  await page.getByText('Experimentos', { exact: true }).click();
  await page.getByRole('button', { name: /¿Depende de la longitud\?/ }).click();
  await leccion.getByText('Se duplica', { exact: true }).click();
  await leccion.getByRole('button', { name: 'Continuar' }).click();
  for (let paso = 1; paso <= 3; paso++) {
    const preparar = leccion.getByRole('button', { name: 'Preparar valores' });
    if (await preparar.count()) await preparar.click();
    await leccion.getByRole('button', { name: 'Continuar' }).click();
  }
  await leccion.getByText('Se hizo el doble', { exact: true }).click();
  await expect(leccion.locator('.feedback')).toBeVisible();
}

test.describe('(a) Solo transform y opacity, y menos de 300 ms', () => {
  for (const estado of ESTADOS) {
    test(`${estado.nombre}: ninguna propiedad de layout ni "all", todo dura 300 ms o menos`, async ({ page }) => {
      const problemas = await abrir(page);
      await estado.preparar(page);
      const filas = await auditar(page);
      expect(filas.length, 'debe haber transiciones declaradas que revisar').toBeGreaterThan(3);

      const LAYOUT = [/^width$/, /^height$/, /^(min|max)-(width|height)$/, /^margin/, /^padding/, /^(top|left|right|bottom)$/, /^inset/, /^grid-template/, /^flex/, /^font-size$/, /^gap$/, /^border.*-width$/, /^all$/];
      const malas = filas.filter((f) => f.origen === 'transicion' && LAYOUT.some((re) => re.test(f.prop)));
      expect(malas, 'transiciones de layout o "all"').toEqual([]);

      const ajenas = filas.filter((f) => f.origen === 'transicion' && !PERMITIDAS.includes(f.prop));
      expect(ajenas, 'propiedades fuera de la lista permitida').toEqual([]);

      const largas = filas.filter((f) => f.dur > 300 || f.dur + f.delay > 300);
      expect(largas, 'duraciones de más de 300 ms').toEqual([]);

      const animaciones = filas.filter((f) => f.origen === 'animacion');
      expect(animaciones, 'no se usan @keyframes en la interfaz').toEqual([]);
      sinProblemas(problemas);
    });
  }
});

test.describe('(b) Con "reducir movimiento" solo queda opacidad y color, y dura 120 ms o menos', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const estado of ESTADOS) {
    test(`${estado.nombre}: nada usa transform y todo dura 120 ms o menos`, async ({ page }) => {
      const problemas = await abrir(page);
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      await estado.preparar(page);
      const filas = await auditar(page);
      expect(filas.length, 'se conservan transiciones suaves (no es cero)').toBeGreaterThan(3);
      expect(filas.filter((f) => DE_MOVIMIENTO.includes(f.prop)), 'transiciones de movimiento').toEqual([]);
      expect(filas.filter((f) => f.origen === 'animacion'), 'animaciones').toEqual([]);
      expect(filas.filter((f) => f.dur > 120 || f.dur + f.delay > 120), 'duraciones de más de 120 ms').toEqual([]);
      sinProblemas(problemas);
    });
  }

  test('se conserva el fundido: la hoja de Teoría aparece con opacidad, sin subir', async ({ page }) => {
    await abrir(page);
    await abrirMasOpciones(page);
    await enReposo(page);
    const animaciones = await vivasTras(page, () => page.getByRole('button', { name: 'Teoría', exact: true }).click(), 'section.sheet');
    expect(propsDe(animaciones, 'section.sheet')).toEqual(['opacity']);
    expect(propsDe(animaciones, 'div.scrim')).toEqual(['opacity']);
    for (const a of de(animaciones, 'sheet')) expect(a.dur).toBeLessThanOrEqual(120);
    await enReposo(page);
    expect(await page.locator('.sheet').evaluate((el) => getComputedStyle(el).translate)).toBe('none');
  });

  test('el cajón de abajo del celular no se desliza: aparece y desaparece con un fundido', async ({ page }, info) => {
    test.skip(!esMovil(info), 'solo aplica a la hoja inferior del celular');
    await abrir(page);
    await enReposo(page);
    const abrirAnim = await vivasTras(page, () => page.getByRole('button', { name: 'Más opciones', exact: true }).click(), 'aside.drawer');
    expect(propsDe(abrirAnim, 'aside.drawer')).toEqual(['opacity']);
    await enReposo(page);
    expect(await page.locator('#drawer').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    const cerrarAnim = await vivasTras(page, () => page.getByRole('button', { name: 'Cerrar', exact: true }).first().click(), 'aside.drawer');
    expect(propsDe(cerrarAnim, 'aside.drawer').filter((p) => p !== 'visibility')).toEqual(['opacity']);
  });

  test('la pulsación de un botón no cambia su tamaño', async ({ page }) => {
    await abrir(page);
    const boton = page.getByRole('button', { name: 'Reiniciar', exact: true });
    const caja = (await boton.boundingBox())!;
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(150);
    expect(await boton.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    await page.mouse.up();
  });
});

test.describe('(c) :hover solo para ratón', () => {
  test('ningún :hover queda fuera de @media (hover: hover) and (pointer: fine)', async ({ page }) => {
    const problemas = await abrir(page);
    const resultado = await page.evaluate(() => {
      const sueltas: string[] = [];
      let protegidas = 0;
      const mediaDeRaton = (regla: CSSRule | null): boolean => {
        for (let r: CSSRule | null = regla; r; r = r.parentRule) {
          if (r instanceof CSSMediaRule && /hover:\s*hover/.test(r.conditionText) && /pointer:\s*fine/.test(r.conditionText)) return true;
        }
        return false;
      };
      const recorrer = (reglas: CSSRuleList) => {
        for (const regla of reglas) {
          if (regla instanceof CSSStyleRule && regla.selectorText.includes(':hover')) {
            if (mediaDeRaton(regla)) protegidas++;
            else sueltas.push(regla.selectorText);
          }
          // Reglas con reglas dentro: @media, @supports, @starting-style y las anidadas.
          const dentro = (regla as CSSGroupingRule).cssRules;
          if (dentro) recorrer(dentro);
        }
      };
      for (const hoja of document.styleSheets) recorrer(hoja.cssRules);
      return { sueltas, protegidas };
    });
    expect(resultado.sueltas, ':hover fuera de la media query').toEqual([]);
    expect(resultado.protegidas, 'las reglas :hover siguen existiendo (protegidas)').toBeGreaterThanOrEqual(9);
    sinProblemas(problemas);
  });

  test('con ratón el botón cambia de color al pasar por encima; en pantalla táctil, no', async ({ page }) => {
    await abrir(page);
    const boton = page.getByRole('button', { name: 'Reiniciar', exact: true });
    const fondo = () => boton.evaluate((el) => getComputedStyle(el).backgroundColor);
    const antes = await fondo();
    await boton.hover();
    await page.waitForTimeout(250);
    const despues = await fondo();
    const tactil = await page.evaluate(() => matchMedia('(hover: none)').matches);
    if (tactil) expect(despues, 'en táctil el :hover no debe aplicarse').toBe(antes);
    else expect(despues, 'con ratón el :hover sí se aplica').not.toBe(antes);
  });
});

test.describe('Pulsación de los botones táctiles', () => {
  async function fondoYEscala(page: Page, nombre: string | RegExp) {
    const boton = page.getByRole('button', { name: nombre, exact: typeof nombre === 'string' });
    const caja = (await boton.boundingBox())!;
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(160);
    const transformMientras = await boton.evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(160);
    const transformDespues = await boton.evaluate((el) => getComputedStyle(el).transform);
    return { transformMientras, transformDespues };
  }

  test('"Reiniciar" se achica a 0,98 mientras se pulsa y vuelve al soltar', async ({ page }) => {
    await abrir(page);
    const { transformMientras, transformDespues } = await fondoYEscala(page, 'Reiniciar');
    expect(transformMientras).toBe('matrix(0.98, 0, 0, 0.98, 0, 0)');
    expect(transformDespues).toBe('none');
  });

  test('la pulsación dura 80 ms o menos', async ({ page }) => {
    await abrir(page);
    const boton = page.getByRole('button', { name: 'Reiniciar', exact: true });
    const caja = (await boton.boundingBox())!;
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await page.mouse.down();
    const animaciones = await muestrear(page, 50);
    await page.mouse.up();
    const escala = animaciones.filter((a) => a.prop === 'transform');
    expect(escala.length).toBeGreaterThan(0);
    for (const a of escala) {
      expect(a.dur).toBe(80);
      expect(a.easing).toBe(EASE);
    }
  });

  test('Play no lleva animación de pulsación (se usa mucho y con teclado)', async ({ page }) => {
    await abrir(page);
    const { transformMientras } = await fondoYEscala(page, /^(Play|Pausa)$/);
    expect(transformMientras).toBe('none');
  });

  test('un botón bloqueado ("Continuar" sin elegir) no se achica', async ({ page }) => {
    await abrir(page);
    await page.getByText('Experimentos', { exact: true }).click();
    await page.getByRole('button', { name: /¿Depende de la longitud\?/ }).click();
    const { transformMientras } = await fondoYEscala(page, 'Continuar');
    expect(transformMientras).toBe('none');
  });
});

test.describe('Cada animación cumple su contrato', () => {
  test('al cargar la página no se mueve nada', async ({ page }) => {
    const problemas = await abrir(page);
    expect(await vivas(page)).toEqual([]);
    sinProblemas(problemas);
  });

  test('el cajón "Más opciones" no anima columnas ni medidas', async ({ page }, info) => {
    await abrir(page);
    const animaciones = await vivasTras(page, () => page.getByRole('button', { name: 'Más opciones', exact: true }).click(), 'drawer');
    expect(animaciones.filter((a) => /grid|width|height|margin|padding|left|top/.test(a.prop))).toEqual([]);
    for (const a of animaciones) expect(PERMITIDAS, `${a.elemento} anima ${a.prop}`).toContain(a.prop);
    if (esMovil(info)) {
      // Hoja inferior: sube con transform, 180 ms.
      expect(de(animaciones, 'aside.drawer').map((a) => [a.prop, a.dur])).toEqual([['transform', 180]]);
    } else {
      // Escritorio: las columnas cambian de golpe; solo hace fundido el contenido.
      expect(de(animaciones, 'drawer-in').map((a) => [a.prop, a.dur])).toEqual([['opacity', 180]]);
    }
    await enReposo(page);
    const colocado = await page.locator('#drawer').evaluate((el) => ({ visibilidad: getComputedStyle(el).visibility, transform: getComputedStyle(el).transform }));
    expect(colocado.visibilidad).toBe('visible');
    expect(colocado.transform).toBe('none');
  });

  test('en el celular el cajón también se desliza al cerrarse (transform, 180 ms)', async ({ page }, info) => {
    test.skip(!esMovil(info), 'solo aplica a la hoja inferior del celular');
    await abrir(page);
    await abrirMasOpciones(page);
    await enReposo(page);
    const animaciones = await vivasTras(page, () => page.getByRole('button', { name: 'Cerrar', exact: true }).first().click(), 'aside.drawer');
    expect(de(animaciones, 'aside.drawer').filter((a) => a.prop === 'transform').map((a) => a.dur)).toEqual([180]);
    await enReposo(page);
    expect(await page.locator('#drawer').evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden');
  });

  test('la hoja de Teoría entra en 200 ms con fundido y subida, y sale en 120 ms por el mismo camino', async ({ page }) => {
    const problemas = await abrir(page);
    await abrirMasOpciones(page);
    await enReposo(page);
    const entrada = await vivasTras(page, () => page.getByRole('button', { name: 'Teoría', exact: true }).click(), 'section.sheet');
    for (const elemento of ['section.sheet', 'div.scrim']) {
      for (const a of de(entrada, elemento)) {
        expect(a.dur, `${elemento} ${a.prop}`).toBe(200);
        expect(a.easing).toBe(EASE);
        expect(a.delay).toBe(0);
      }
    }
    expect(propsDe(entrada, 'section.sheet')).toEqual(['opacity', 'translate']);
    expect(propsDe(entrada, 'div.scrim')).toEqual(['opacity']);
    await enReposo(page);

    const salida = await vivasTras(page, () => page.keyboard.press('Escape'), 'section.sheet');
    for (const a of [...de(salida, 'section.sheet'), ...de(salida, 'div.scrim')]) {
      expect(a.dur).toBe(120);
      expect(a.easing).toBe(EASE);
    }
    expect(propsDe(salida, 'section.sheet')).toEqual(['opacity', 'translate']);
    // La hoja sigue puesta mientras sale y después desaparece del DOM; el foco ya volvió al botón.
    await expect(page.getByRole('button', { name: 'Teoría', exact: true })).toBeFocused();
    await expect(page.locator('.sheet')).toHaveCount(0);
    await expect(page.locator('.scrim')).toHaveCount(0);
    sinProblemas(problemas);
  });

  test('mientras sale, la hoja de Teoría ya no recibe foco ni se lee', async ({ page }) => {
    await abrir(page);
    await abrirMasOpciones(page);
    await page.getByRole('button', { name: 'Teoría', exact: true }).click();
    await expect(page.locator('.sheet')).toBeVisible();
    await enReposo(page);
    await page.keyboard.press('Escape');
    const estado = await page.evaluate(() => {
      const hoja = document.querySelector('.sheet');
      return hoja ? { cerrandose: hoja.getAttribute('data-state'), inert: hoja.hasAttribute('inert') } : null;
    });
    // Si el navegador ya la quitó (pantallas muy rápidas) no hay nada que comprobar; si sigue, es inerte.
    if (estado) expect(estado).toEqual({ cerrandose: 'closing', inert: true });
    await expect(page.locator('.sheet')).toHaveCount(0);
  });

  test('la tarjeta de explicación nace desde su marca: escala 0,96 a 1 y opacidad, 150 ms (en el celular, solo opacidad)', async ({ page }, info) => {
    await abrir(page);
    await page.getByRole('button', { name: '¿Qué es esto?', exact: true }).click();
    await enReposo(page);
    const marca = page.getByRole('button', { name: 'Explicar: Gravedad (g)', exact: true });
    const animaciones = await vivasTras(page, () => marca.click(), 'section.explain-card');
    const tarjeta = de(animaciones, 'section.explain-card');
    for (const a of tarjeta) {
      expect(a.dur).toBe(150);
      expect(a.easing).toBe(EASE);
    }
    expect(propsDe(animaciones, 'section.explain-card')).toEqual(esMovil(info) ? ['opacity'] : ['opacity', 'scale']);
    await enReposo(page);

    if (!esMovil(info)) {
      // El punto de partida de la escala es el de la marca, recortado a la caja de la tarjeta.
      const medida = await page.evaluate(() => {
        const card = document.querySelector('#explain-card') as HTMLElement;
        const mark = document.querySelector('.mark[aria-expanded="true"]') as HTMLElement;
        const c = card.getBoundingClientRect();
        const m = mark.getBoundingClientRect();
        const [ox, oy] = getComputedStyle(card).transformOrigin.split(' ').map(parseFloat);
        const esperado = {
          x: Math.min(Math.max(m.x + m.width / 2 - c.x, 0), c.width),
          y: Math.min(Math.max(m.y + m.height / 2 - c.y, 0), c.height),
        };
        return { ox, oy, esperado, escala: getComputedStyle(card).scale };
      });
      expect(medida.ox).toBeCloseTo(medida.esperado.x, 0);
      expect(medida.oy).toBeCloseTo(medida.esperado.y, 0);
      expect(medida.escala).toBe('none');
    }
  });

  test('las marcas aparecen con un fundido de 120 ms, todas a la vez (sin escalonado)', async ({ page }) => {
    await abrir(page);
    const animaciones = await vivasTras(page, () => page.getByRole('button', { name: '¿Qué es esto?', exact: true }).click(), 'button.mark');
    const marcas = animaciones.filter((a) => a.elemento.startsWith('button.mark'));
    expect(marcas.length).toBeGreaterThan(8);
    for (const a of marcas) {
      expect(a.prop).toBe('opacity');
      expect(a.dur).toBe(120);
      expect(a.delay).toBe(0);
    }
    // Apagar el modo no lleva animación de salida: las marcas se quitan de golpe.
    await enReposo(page);
    const apagar = await vivasTras(page, () => page.getByRole('button', { name: '¿Qué es esto?', exact: true }).click());
    expect(apagar.filter((a) => a.elemento.startsWith('button.mark'))).toEqual([]);
    await expect(page.locator('.mark')).toHaveCount(0);
  });

  test('el aviso del modelo entra en 180 ms (opacidad y 4 px) y no se repite al mover el deslizador', async ({ page }) => {
    await abrir(page);
    const entrada = await vivasTras(page, () => fijarDeslizador(page, /Ángulo de salida/, 45), 'div.notice');
    expect(propsDe(entrada, 'div.notice')).toEqual(['opacity', 'translate']);
    for (const a of de(entrada, 'div.notice')) {
      expect(a.dur).toBe(180);
      expect(a.easing).toBe(EASE);
    }
    await enReposo(page);
    const texto1 = await page.locator('.notice').innerText();
    const mover = await vivasTras(page, () => fijarDeslizador(page, /Ángulo de salida/, 52));
    expect(await page.locator('.notice').innerText(), 'el texto sí cambió').not.toBe(texto1);
    expect(de(mover, 'div.notice'), 'cambiar el porcentaje no vuelve a animar el aviso').toEqual([]);
  });

  test('la retroalimentación de la comprobación y "Valores preparados" entran en 180 ms', async ({ page }) => {
    await abrir(page);
    const leccion = page.getByRole('region', { name: 'Experimentos guiados' });
    await page.getByText('Experimentos', { exact: true }).click();
    await page.getByRole('button', { name: /¿Depende de la longitud\?/ }).click();
    await leccion.getByText('Se duplica', { exact: true }).click();
    await leccion.getByRole('button', { name: 'Continuar' }).click();
    await enReposo(page);

    const preparado = await vivasTras(page, () => leccion.getByRole('button', { name: 'Preparar valores' }).click(), 'prepared-msg');
    expect(propsDe(preparado, 'span.prepared-msg')).toEqual(['opacity', 'translate']);
    for (const a of de(preparado, 'prepared-msg')) expect(a.dur).toBe(180);
    await expect(leccion.getByText('Valores preparados')).toBeVisible();

    for (let paso = 1; paso <= 3; paso++) {
      await enReposo(page);
      const prep = leccion.getByRole('button', { name: 'Preparar valores' });
      if (await prep.count()) await prep.click();
      await leccion.getByRole('button', { name: 'Continuar' }).click();
    }
    await enReposo(page);
    const respuesta = await vivasTras(page, () => leccion.getByText('Se hizo el doble', { exact: true }).click(), 'div.feedback');
    expect(propsDe(respuesta, 'div.feedback')).toEqual(['opacity', 'translate']);
    for (const a of de(respuesta, 'div.feedback')) {
      expect(a.dur).toBe(180);
      expect(a.easing).toBe(EASE);
    }
    // El ícono no rebota: ninguna animación sobre el ícono del veredicto.
    expect(respuesta.filter((a) => a.elemento.startsWith('svg'))).toEqual([]);
  });

  test('cada cambio de etapa o de paso de la lección es un fundido de 150 ms, sin desplazamiento', async ({ page }) => {
    await abrir(page);
    const leccion = page.getByRole('region', { name: 'Experimentos guiados' });
    const lista = await vivasTras(page, () => page.getByText('Experimentos', { exact: true }).click(), 'div.exp-list');
    expect(propsDe(lista, 'div.exp-list')).toEqual(['opacity']);
    await enReposo(page);
    const etapa1 = await vivasTras(page, () => page.getByRole('button', { name: /¿Depende de la longitud\?/ }).click(), 'div.step');
    expect(propsDe(etapa1, 'div.step')).toEqual(['opacity']);
    for (const a of de(etapa1, 'div.step')) expect(a.dur).toBe(150);
    await leccion.getByText('Se duplica', { exact: true }).click();
    await enReposo(page);
    const etapa2 = await vivasTras(page, () => leccion.getByRole('button', { name: 'Continuar' }).click(), 'div.step');
    expect(propsDe(etapa2, 'div.step')).toEqual(['opacity']);
    // El foco pasó al título nuevo y el fundido no lo movió.
    await expect(leccion.getByRole('heading', { name: 'Paso 1 de 3' })).toBeFocused();
  });
});

test.describe('(d) Interrumpir una animación no deja nada a medias', () => {
  /** Pulsa un botón varias veces con 40 ms entre pulsaciones (a mitad de cada transición). Devuelve el máximo de animaciones vivas. */
  async function pulsar(page: Page, nombre: string, veces: number): Promise<number> {
    return page.getByRole('button', { name: nombre, exact: true }).evaluate(async (el, n) => {
      let maximo = 0;
      for (let i = 0; i < n; i++) {
        (el as HTMLElement).click();
        await new Promise((resolver) => setTimeout(resolver, 40));
        maximo = Math.max(maximo, document.getAnimations().length);
      }
      return maximo;
    }, veces);
  }

  test('el cajón: abrir y cerrar 5 veces seguidas termina cerrado, sin errores', async ({ page }) => {
    const problemas = await abrir(page);
    const maximo = await pulsar(page, 'Más opciones', 10);
    expect(maximo, 'la prueba sí interrumpió transiciones en marcha').toBeGreaterThan(0);
    const boton = page.getByRole('button', { name: 'Más opciones', exact: true });
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await enReposo(page);
    await expect(page.locator('#drawer')).toHaveAttribute('inert', '');
    expect(await page.locator('#drawer').evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden');
    sinProblemas(problemas);
  });

  test('el cajón: 5 aperturas y 4 cierres seguidos termina abierto y asentado en su sitio', async ({ page }) => {
    const problemas = await abrir(page);
    await pulsar(page, 'Más opciones', 9);
    await expect(page.getByRole('button', { name: 'Más opciones', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await enReposo(page);
    await expect(page.locator('#drawer')).not.toHaveAttribute('inert', /.*/);
    const asentado = await page.locator('#drawer').evaluate((el) => {
      const dentro = el.querySelector('.drawer-in') as HTMLElement;
      return { visibilidad: getComputedStyle(el).visibility, transform: getComputedStyle(el).transform, opacidad: getComputedStyle(dentro).opacity };
    });
    expect(asentado).toEqual({ visibilidad: 'visible', transform: 'none', opacidad: '1' });
    sinProblemas(problemas);
  });

  /** Abre la Teoría con su botón y la cierra con Escape, `veces` veces, sin esperar a que acabe la transición. */
  async function teoriaRapido(page: Page, veces: number, terminaAbierta: boolean): Promise<void> {
    await page.getByRole('button', { name: 'Teoría', exact: true }).evaluate(async (opener, datos) => {
      const espera = () => new Promise((resolver) => setTimeout(resolver, 40));
      for (let i = 0; i < datos.veces; i++) {
        (opener as HTMLElement).click();
        await espera();
        if (i < datos.veces - 1 || !datos.terminaAbierta) {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          await espera();
        }
      }
    }, { veces, terminaAbierta });
  }

  test('la hoja de Teoría: abrir y cerrar 5 veces seguidas termina cerrada, con el foco en su botón', async ({ page }) => {
    const problemas = await abrir(page);
    await abrirMasOpciones(page);
    await teoriaRapido(page, 5, false);
    await expect(page.locator('.sheet')).toHaveCount(0);
    await expect(page.locator('.scrim')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Teoría', exact: true })).toBeFocused();
    expect(await page.locator('main').evaluate((el) => el.hasAttribute('inert')), 'el fondo vuelve a ser operable').toBe(false);
    sinProblemas(problemas);
  });

  test('la hoja de Teoría: 5 aperturas y 4 cierres terminan con la hoja abierta, nítida y en su sitio', async ({ page }) => {
    const problemas = await abrir(page);
    await abrirMasOpciones(page);
    await teoriaRapido(page, 5, true);
    const hoja = page.getByRole('dialog', { name: 'Teoría' });
    await expect(hoja).toBeVisible();
    await enReposo(page);
    const estado = await page.locator('.sheet').evaluate((el) => ({
      estado: el.getAttribute('data-state'),
      inert: el.hasAttribute('inert'),
      opacidad: getComputedStyle(el).opacity,
      subida: getComputedStyle(el).translate,
    }));
    expect(estado).toEqual({ estado: null, inert: false, opacidad: '1', subida: 'none' });
    await expect(page.getByRole('heading', { name: 'Teoría', level: 2 })).toBeFocused();
    expect(await page.locator('main').evaluate((el) => el.hasAttribute('inert'))).toBe(true);
    // Y se cierra con normalidad.
    await page.keyboard.press('Escape');
    await expect(page.locator('.sheet')).toHaveCount(0);
    sinProblemas(problemas);
  });

  test('el modo "¿Qué es esto?": encender y apagar 5 veces seguidas termina apagado, sin marcas ni tarjeta', async ({ page }) => {
    const problemas = await abrir(page);
    await pulsar(page, '¿Qué es esto?', 10);
    await expect(page.getByRole('button', { name: '¿Qué es esto?', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.mark')).toHaveCount(0);
    await expect(page.locator('#explain-card')).toHaveCount(0);
    await enReposo(page);
    sinProblemas(problemas);
  });

  test('la tarjeta: abrir y cerrar la misma marca 5 veces seguidas termina cerrada y sin errores', async ({ page }) => {
    const problemas = await abrir(page);
    await page.getByRole('button', { name: '¿Qué es esto?', exact: true }).click();
    await pulsar(page, 'Explicar: Gravedad (g)', 10);
    await expect(page.locator('#explain-card')).toHaveCount(0);
    await enReposo(page);
    sinProblemas(problemas);
  });
});

test.describe('Estados de reposo', () => {
  test('las marcas de explicación y los avisos terminan con opacidad 1 y sin desplazamiento (nada queda a medias)', async ({ page }) => {
    const problemas = await abrir(page);
    await fijarDeslizador(page, /Ángulo de salida/, 45);
    await page.getByRole('button', { name: '¿Qué es esto?', exact: true }).click();
    await page.getByRole('button', { name: 'Explicar: Gravedad (g)', exact: true }).click();
    await enReposo(page);
    const medidas = await page.evaluate(() =>
      ['.notice', '.mark', '#explain-card'].map((sel) => {
        const el = document.querySelector(sel) as HTMLElement;
        const e = getComputedStyle(el);
        return { sel, opacidad: e.opacity, subida: e.translate, escala: e.scale };
      }),
    );
    for (const m of medidas) expect(m, m.sel).toMatchObject({ opacidad: '1', subida: 'none', escala: 'none' });
    sinProblemas(problemas);
  });
});
