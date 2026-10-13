import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Guardia estática del movimiento (fase D5). Lee el texto de `styles.css` y `tokens.css` y comprueba
 * las reglas del playbook sin abrir un navegador: duraciones y curvas solo desde los tokens, nada de
 * `transition: all`, ninguna propiedad de layout animada, ningún `:hover` fuera de la media query de
 * ratón, y un `prefers-reduced-motion` suave (no apagarlo todo). Lo que no se puede ver en el CSS
 * (estilos calculados, interrupción) lo cubre `e2e/movimiento.spec.ts`.
 */

const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

/** Propiedades que mueven o redimensionan el diseño: nunca se animan (solo transform y opacity). */
const LAYOUT = [
  /^width$/,
  /^height$/,
  /^(min|max)-(width|height)$/,
  /^margin(-.+)?$/,
  /^padding(-.+)?$/,
  /^(top|left|right|bottom)$/,
  /^inset(-.+)?$/,
  /^grid-template(-.+)?$/,
  /^flex(-basis)?$/,
  /^font-size$/,
  /^gap$/,
  /^border(-.*)?-width$/,
];
const isLayout = (name: string) => LAYOUT.some((re) => re.test(name));

const EASING_WORDS = new Set(['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end']);
const TIME = /^-?(\d+\.?\d*|\.\d+)m?s$/;

interface Rule {
  /** Selector, o el encabezado de la at-regla que contiene declaraciones (`@font-face`, `@keyframes x`). */
  header: string;
  /** Encabezados de las at-reglas que la envuelven, de fuera hacia dentro. */
  context: string[];
  decls: Array<{ name: string; value: string }>;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Parte `text` por `sep` fuera de paréntesis y comillas. */
function splitTop(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let current = '';
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === sep && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

function parseDecls(body: string): Rule['decls'] {
  return splitTop(body, ';')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      const at = chunk.indexOf(':');
      return { name: chunk.slice(0, at).trim().toLowerCase(), value: chunk.slice(at + 1).replace(/!important/i, '').trim() };
    })
    .filter((d) => d.name.length > 0);
}

/** Aplana el CSS en reglas con su contexto (@media, @starting-style…). Soporta anidar at-reglas. */
function parseCss(css: string): Rule[] {
  const text = stripComments(css);
  const rules: Rule[] = [];
  const stack: Array<{ header: string; container: boolean; start: number }> = [];
  let start = 0;
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '{') {
      const header = text.slice(start, i).trim();
      // Contenedores de reglas: @media, @supports, @starting-style, @layer. Los demás llevan declaraciones.
      const container = /^@(media|supports|starting-style|layer|container)\b/.test(header);
      stack.push({ header, container, start: i + 1 });
      start = i + 1;
    } else if (ch === ';' && !stack.at(-1)?.container) {
      // la declaración se recoge al cerrar
    } else if (ch === '}') {
      const top = stack.pop();
      if (top && !top.container) {
        const inner = text.slice(top.start, i);
        // Un @keyframes lleva reglas dentro (from, to, 50%): se recorren como reglas con su encabezado.
        if (/^@keyframes\b/.test(top.header)) {
          for (const frame of inner.split('}')) {
            const brace = frame.indexOf('{');
            if (brace < 0) continue;
            rules.push({
              header: `${top.header} ${frame.slice(0, brace).trim()}`,
              context: stack.map((s) => s.header),
              decls: parseDecls(frame.slice(brace + 1)),
            });
          }
        } else {
          rules.push({ header: top.header, context: stack.map((s) => s.header), decls: parseDecls(inner) });
        }
      }
      start = i + 1;
    }
  }
  return rules;
}

const rules = parseCss(styles);

describe('el analizador de CSS de esta prueba', () => {
  it('encuentra reglas dentro de @media y @starting-style', () => {
    const sample = parseCss('@media (a) { .x:hover { color: red; transition: opacity 1s; } } @starting-style { .y { opacity: 0 } } .z { top: 0 }');
    expect(sample).toHaveLength(3);
    expect(sample[0]).toMatchObject({ header: '.x:hover', context: ['@media (a)'] });
    expect(sample[0].decls.map((d) => d.name)).toEqual(['color', 'transition']);
    expect(sample[1].context).toEqual(['@starting-style']);
    expect(sample[2]).toMatchObject({ header: '.z', context: [] });
  });

  it('lee todo styles.css (hay reglas y hay transiciones)', () => {
    expect(rules.length).toBeGreaterThan(100);
    expect(rules.some((r) => r.decls.some((d) => d.name === 'transition'))).toBe(true);
  });
});

/** Los elementos de una lista de transiciones o animaciones, con sus palabras. */
function items(value: string): string[][] {
  return splitTop(value, ',').map((item) => item.trim().split(/\s+(?![^(]*\))/).filter(Boolean));
}

const MOTION_DECLS = ['transition', 'transition-property', 'transition-duration', 'transition-delay', 'transition-timing-function', 'animation', 'animation-name', 'animation-duration', 'animation-delay', 'animation-timing-function'];
const motionDecls = rules.flatMap((rule) =>
  rule.decls.filter((d) => MOTION_DECLS.includes(d.name)).map((d) => ({ ...d, header: rule.header })),
);

describe('duraciones y curvas solo desde los tokens', () => {
  it('hay transiciones que revisar', () => {
    expect(motionDecls.length).toBeGreaterThan(5);
  });

  it('ninguna duración, retraso ni curva está escrita a mano (solo var(--...), 0s o la palabra de una propiedad)', () => {
    const sueltos: string[] = [];
    for (const decl of motionDecls) {
      if (decl.name === 'transition-property' || decl.name === 'animation-name') continue;
      for (const words of items(decl.value)) {
        for (const word of words) {
          if (TIME.test(word) && !/^0m?s$/.test(word)) sueltos.push(`${decl.header} { ${decl.name}: ${decl.value} } -> tiempo suelto "${word}"`);
          if (EASING_WORDS.has(word) || /^(cubic-bezier|steps|linear)\(/.test(word)) sueltos.push(`${decl.header} { ${decl.name}: ${decl.value} } -> curva suelta "${word}"`);
        }
      }
    }
    expect(sueltos).toEqual([]);
  });

  it('cada token de tiempo o de curva que usa styles.css está definido en tokens.css', () => {
    const usados = new Set([...styles.matchAll(/var\((--(?:t|ease)[\w-]*)\)/g)].map((m) => m[1]));
    expect(usados.size).toBeGreaterThan(2);
    for (const name of usados) expect(tokens, `falta ${name} en tokens.css`).toMatch(new RegExp(`${name}:\\s*[^;]+;`));
  });

  it('las duraciones de tokens.css son de menos de 300 ms', () => {
    const tiempos = [...tokens.matchAll(/--(t-[\w-]+):\s*(\d+)ms;/g)].map((m) => ({ nombre: m[1], ms: Number(m[2]) }));
    expect(tiempos.length).toBeGreaterThanOrEqual(5);
    for (const { nombre, ms } of tiempos) expect(ms, nombre).toBeLessThan(300);
  });
});

describe('solo se anima transform y opacity (y el color de fondo en los botones)', () => {
  it('ninguna transición usa "all"', () => {
    const todas = motionDecls.filter((d) => (d.name === 'transition' || d.name === 'transition-property') && items(d.value).some((words) => words.includes('all')));
    expect(todas.map((d) => `${d.header} { ${d.name}: ${d.value} }`)).toEqual([]);
  });

  it('ninguna propiedad de layout aparece en una transición', () => {
    const malas: string[] = [];
    for (const decl of motionDecls) {
      if (decl.name !== 'transition' && decl.name !== 'transition-property') continue;
      for (const words of items(decl.value)) {
        const property = words[0];
        if (property && isLayout(property)) malas.push(`${decl.header} { ${decl.name}: ${decl.value} } -> ${property}`);
      }
    }
    expect(malas).toEqual([]);
  });

  it('los @keyframes (si los hay) tampoco tocan el layout', () => {
    const malas = rules
      .filter((r) => r.header.startsWith('@keyframes'))
      .flatMap((r) => r.decls.filter((d) => isLayout(d.name)).map((d) => `${r.header} -> ${d.name}`));
    expect(malas).toEqual([]);
  });

  it('el analizador de layout reconoce lo que debe', () => {
    for (const name of ['width', 'height', 'margin-left', 'padding', 'top', 'left', 'grid-template-columns', 'flex-basis', 'font-size', 'inset']) {
      expect(isLayout(name), name).toBe(true);
    }
    for (const name of ['opacity', 'transform', 'translate', 'scale', 'background-color', 'visibility', 'color']) {
      expect(isLayout(name), name).toBe(false);
    }
  });
});

describe(':hover solo para ratón', () => {
  const HOVER_MEDIA = /\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/;

  it('ningún :hover queda fuera de @media (hover: hover) and (pointer: fine)', () => {
    const sueltos = rules
      .filter((r) => /:hover/.test(r.header) && !r.context.some((c) => HOVER_MEDIA.test(c)))
      .map((r) => r.header);
    expect(sueltos).toEqual([]);
  });

  it('sigue habiendo reglas :hover (no se borraron, se protegieron)', () => {
    expect(rules.filter((r) => /:hover/.test(r.header)).length).toBeGreaterThanOrEqual(9);
  });
});

describe('prefers-reduced-motion es más suave, no cero', () => {
  const reducido = rules.filter((r) => r.context.some((c) => /prefers-reduced-motion:\s*reduce/.test(c)));

  it('existe y no apaga todas las transiciones', () => {
    expect(reducido.length).toBeGreaterThan(0);
    const apagan = reducido.filter((r) => r.decls.some((d) => d.name === 'transition' && /^none$/.test(d.value)));
    expect(apagan.map((r) => r.header)).toEqual([]);
  });

  it('conserva fundidos de opacidad', () => {
    const conOpacidad = reducido.filter((r) => r.decls.some((d) => /^transition(-property)?$/.test(d.name) && /opacity/.test(d.value)));
    expect(conOpacidad.length).toBeGreaterThan(0);
  });

  it('ninguna regla del bloque reducido anima transform, translate ni scale', () => {
    const mueven = reducido
      .flatMap((r) => r.decls.filter((d) => /^transition(-property)?$/.test(d.name) && /\b(transform|translate|scale|rotate)\b/.test(d.value)).map((d) => `${r.header} ${d.value}`));
    expect(mueven).toEqual([]);
  });
});

describe('guarda contra lo que ya se corrigió', () => {
  it('el diseño de la pantalla no anima columnas ni el cajón empuja con una transición de layout', () => {
    expect(motionDecls.filter((d) => /grid-template/.test(d.value)).map((d) => d.header)).toEqual([]);
  });

  it('el pomo del interruptor se mueve con transform, no con left', () => {
    const knob = motionDecls.filter((d) => d.header.includes('swknob') && d.name === 'transition');
    expect(knob.length).toBeGreaterThan(0);
    for (const d of knob) expect(d.value).not.toMatch(/\bleft\b/);
  });
});
