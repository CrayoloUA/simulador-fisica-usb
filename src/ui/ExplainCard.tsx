import { X } from '@phosphor-icons/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { EXPLAIN_CARD_ID, cardOrigin, cardTerms, placeCard, sheetEdge, tabLeavesCard, type CardPlacement } from './explain';
import { GlossaryList } from './GlossaryList';
import { LangText } from './LangText';
import type { HelpEntry } from './helpEntries';

/** Por qué se cierra la tarjeta: de eso depende si el foco vuelve a la marca. */
export type CloseReason = 'button' | 'escape' | 'outside' | 'gone';

interface Props {
  entry: HelpEntry;
  /** La marca tocada: de ella cuelga la tarjeta y a ella vuelve el foco. */
  anchor: HTMLElement;
  /** En el celular la tarjeta es una hoja inferior y no se posiciona desde aquí. */
  sheet: boolean;
  onClose: (reason: CloseReason) => void;
}

/** Aire (px) entre la marca y la tarjeta, y entre la tarjeta y el borde de la ventana. */
const GAP = 8;

/** Lo que mide un token de espacio en px, leído una vez al abrir (para no escribir cifras sueltas). */
function spacePx(name: string, fallback: number): number {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

/** Lo que recibe el foco con Tab dentro de la tarjeta. */
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Tarjeta de una explicación: el título y los bloques de la entrada. Es una sola a la vez (la
 * abre `App`). En escritorio cuelga de la marca (debajo, encima o al lado, donde quepa); en el
 * celular es una hoja inferior (arriba, si la marca vive en el cajón "Más opciones", que ocupa la
 * mitad de abajo). Al abrirse recibe el foco (en el título); Escape, el botón de
 * cerrar o un toque fuera la cierran. Si la marca desaparece (se cierra el cajón, se cambia de
 * modo) la tarjeta se cierra sola.
 */
export function ExplainCard({ entry, anchor, sheet, onClose }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Dónde cuelga la tarjeta y el punto desde el que nace (la marca): lo usa la animación de entrada.
  const bodyRef = useRef<HTMLDivElement>(null);
  // Si el contenido no cabe y se desplaza por dentro, el cuerpo entra en el orden de Tab (para poder bajar con las flechas).
  const [scrollable, setScrollable] = useState(false);
  const [placement, setPlacement] = useState<(CardPlacement & { origin: { x: number; y: number } }) | null>(null);
  // Palabras del glosario que aparecen en el texto de esta tarjeta (sin la de su propio título).
  const terms = useMemo(() => cardTerms(entry), [entry]);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // El foco pasa al título en cuanto la tarjeta está a la vista (oculta, el navegador no acepta el foco).
  const ready = sheet || placement !== null;
  useEffect(() => {
    if (ready) titleRef.current?.focus({ preventScroll: true });
  }, [entry.id, ready]);

  // Hoja del celular: abajo, o arriba si la marca vive en el cajón (así nunca la tapa).
  const edge = sheetEdge(sheet, anchor.closest('.drawer') !== null);

  // En el celular la hoja inferior no debe tapar la marca tocada: la página se desplaza lo justo
  // para dejarla encima de la hoja (App deja espacio al final de la página mientras hay tarjeta).
  // Si la hoja va arriba (marca del cajón) no hace falta mover nada.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (edge !== 'bottom' || !card) return;
    const mark = anchor.getBoundingClientRect();
    const hoja = card.getBoundingClientRect();
    // Solo si la marca queda bajo la hoja (las de la barra de Play quedan debajo de ella, a la vista).
    if (mark.bottom > hoja.top && mark.top < hoja.bottom) {
      window.scrollBy({ top: mark.bottom + spacePx('--s2', GAP) - hoja.top, behavior: 'instant' });
    }
  }, [anchor, edge, entry.id]);

  // La tarjeta sigue a su marca (que se mueve al hacer scroll, al redimensionar o al abrir el cajón)
  // y se cierra si la marca deja de estar a la vista. Sin sondeo: se recalcula cuando algo cambia
  // (tamaño de la tarjeta, de la marca o de las cajas del dibujo; scroll; ventana; atributos de la
  // pantalla; fuentes que terminan de cargar), no en cada cuadro.
  useLayoutEffect(() => {
    const gap = spacePx('--s2', GAP);
    let last = '';
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const gone = !anchor.isConnected || anchor.closest('[inert]') !== null || (rect.width === 0 && rect.height === 0);
      if (gone) {
        onCloseRef.current('gone');
        return;
      }
      const card = cardRef.current;
      const body = bodyRef.current;
      if (body) setScrollable(body.scrollHeight > body.clientHeight + 1);
      if (!sheet && card) {
        const key = [rect.x, rect.y, card.offsetWidth, card.offsetHeight, window.innerWidth, window.innerHeight].join(',');
        if (key !== last) {
          last = key;
          const anchorRect = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
          const size = { w: card.offsetWidth, h: card.offsetHeight };
          const placed = placeCard(anchorRect, size, { w: window.innerWidth, h: window.innerHeight }, gap, gap);
          setPlacement({ ...placed, origin: cardOrigin(anchorRect, placed, size) });
        }
      }
    };
    update();

    const resize = new ResizeObserver(update);
    if (cardRef.current) resize.observe(cardRef.current);
    if (bodyRef.current) resize.observe(bodyRef.current);
    resize.observe(anchor);
    // Las cajas del dibujo y de la gráfica cambian de tamaño al abrir o cerrar el cajón.
    document.querySelectorAll('.stage, .chartbox').forEach((box) => resize.observe(box));

    const mutations = new MutationObserver(update);
    // Las marcas del dibujo cambian de sitio (style) sin cambiar de tamaño; las del cajón se apagan (inert).
    mutations.observe(anchor, { attributes: true, attributeFilter: ['style', 'inert', 'hidden'] });
    if (anchor.parentElement) mutations.observe(anchor.parentElement, { childList: true });
    const app = document.querySelector('.app');
    if (app) mutations.observe(app, { attributes: true, attributeFilter: ['data-drawer', 'data-modo', 'data-explicar'] });
    const drawer = anchor.closest('.drawer');
    if (drawer) mutations.observe(drawer, { attributes: true, attributeFilter: ['inert'] });

    // Con captura: también cuentan los desplazamientos de cajas internas (la columna de controles, el cajón).
    window.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', update, { passive: true });
    window.visualViewport?.addEventListener('resize', update, { passive: true });
    window.visualViewport?.addEventListener('scroll', update, { passive: true });
    document.fonts?.addEventListener('loadingdone', update);
    return () => {
      resize.disconnect();
      mutations.disconnect();
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      document.fonts?.removeEventListener('loadingdone', update);
    };
  }, [anchor, sheet, entry.id]);

  // Un toque o clic fuera de la tarjeta y de las marcas la cierra (el toque sigue su camino).
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (cardRef.current?.contains(target) || target.closest('.mark')) return;
      onCloseRef.current('outside');
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  // La tarjeta está al final de la página: sin esto, Tab saldría del documento. Salir de ella con Tab
  // (o hacia atrás desde el título) la cierra y deja el foco en su marca, de donde el niño sigue.
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    const card = cardRef.current;
    if (!card) return;
    const items = [...card.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled'));
    const active = document.activeElement;
    const leaves = tabLeavesCard({
      shift: event.shiftKey,
      onTitle: active === titleRef.current,
      onFirst: items.length > 0 && active === items[0],
      onLast: items.length === 0 || active === items[items.length - 1],
    });
    if (!leaves) return;
    event.preventDefault();
    onClose('button');
  };

  const style = sheet
    ? undefined
    : {
        left: placement?.left ?? 0,
        top: placement?.top ?? 0,
        visibility: placement ? ('visible' as const) : ('hidden' as const),
        // La tarjeta crece desde el lado que mira a su marca (ver .explain-card en styles.css).
        transformOrigin: placement ? `${placement.origin.x}px ${placement.origin.y}px` : undefined,
      };

  return (
    <section
      ref={cardRef}
      id={EXPLAIN_CARD_ID}
      className="explain-card"
      data-sheet={sheet ? 'si' : undefined}
      data-edge={edge ?? undefined}
      role="dialog"
      aria-labelledby="explain-card-title"
      style={style}
      onKeyDown={onKeyDown}
    >
      <div className="explain-head">
        <h2 id="explain-card-title" ref={titleRef} tabIndex={-1} className="focus-target">
          {entry.title}
        </h2>
        <button type="button" className="btn sec icon-only" aria-label="Cerrar explicación" onClick={() => onClose('button')}>
          <X className="ic" weight="bold" aria-hidden="true" />
        </button>
      </div>
      {/* Sin role ni nombre propio: el diálogo ya se llama como la tarjeta y repetirlo como región sobraba. */}
      <div ref={bodyRef} className="explain-body" tabIndex={scrollable ? 0 : undefined}>
        {entry.sections.map((section, index) => (
          <div key={index} className="explain-block">
            {section.heading && <h3>{section.heading}</h3>}
            <p>
              <LangText text={section.text} />
            </p>
          </div>
        ))}
        {terms.length > 0 && (
          <div className="explain-words">
            <h3>Palabras que quizás no conozcas</h3>
            <GlossaryList terms={terms} />
          </div>
        )}
      </div>
    </section>
  );
}
