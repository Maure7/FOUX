import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pipette } from 'lucide-react';
import { resolveElementColor } from '../../utils/css/eyedropper.js';

const BADGE_OFFSET = 18;
const BADGE_WIDTH = 190;
const BADGE_HEIGHT = 52;
// Eventos que, fora do canvas, não podem chegar à interface do FOUX durante a amostragem.
const BLOCKED_EVENTS = ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu'];
const PICKING_CLASS = 'foux-picking-color';
// Tempo de duplo clique: o 2º clique cairia no iframe (a camada some no 1º) e trocaria a seleção.
const FOLLOW_UP_CLICK_MS = 500;
const SOURCE_LABELS = {
  text: 'colorTools.sourceText',
  border: 'colorTools.sourceBorder',
  image: 'colorTools.sourceImage',
  background: 'colorTools.sourceBackground',
};

// Engole os cliques que chegam ao canvas logo depois da captura (o resto de um duplo clique).
// Na captura da window do iframe, antes dos listeners do inspector no document.
function swallowFollowUpClicks(win) {
  if (!win) return;
  const swallow = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const types = ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick'];
  types.forEach((type) => win.addEventListener(type, swallow, true));
  setTimeout(() => types.forEach((type) => win.removeEventListener(type, swallow, true)), FOLLOW_UP_CLICK_MS);
}

// Área de conteúdo do iframe (sem a borda dele), em coordenadas da janela do editor;
// o raio acompanha os cantos arredondados do canvas. As barras de rolagem da página ficam
// de fora (clientWidth do scrollingElement), para continuarem arrastáveis durante o modo.
function viewportOf(iframe) {
  const rect = iframe.getBoundingClientRect();
  const scroller = iframe.contentDocument?.scrollingElement;
  return {
    left: rect.left + iframe.clientLeft,
    top: rect.top + iframe.clientTop,
    width: Math.min(iframe.clientWidth, scroller?.clientWidth || iframe.clientWidth),
    height: Math.min(iframe.clientHeight, scroller?.clientHeight || iframe.clientHeight),
    borderRadius: getComputedStyle(iframe).borderRadius,
  };
}

const sameViewport = (first, second) => !!first && !!second
  && ['left', 'top', 'width', 'height', 'borderRadius'].every((key) => first[key] === second[key]);

// Rola o contêiner rolável sob o cursor (ou a página): a camada cobre o iframe e
// engoliria a roda do mouse.
function forwardWheel(doc, x, y, event) {
  const win = doc.defaultView;
  for (let node = doc.elementFromPoint(x, y); node && node !== doc.body && node !== doc.documentElement; node = node.parentElement) {
    const style = win.getComputedStyle(node);
    const scrollsY = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
    const scrollsX = /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth;
    if ((scrollsY && event.deltaY) || (scrollsX && event.deltaX)) {
      node.scrollBy(event.deltaX, event.deltaY);
      return;
    }
  }
  win.scrollBy(event.deltaX, event.deltaY);
}

// Conta-gotas restrito ao documento do aluno: uma camada do editor sobre o iframe lê a
// cor com getComputedStyle (window.EyeDropper amostraria a tela inteira, inclusive o FOUX).
// Os cliques nunca chegam ao iframe, então a seleção do inspector não muda.
function EyedropperOverlay({ iframeRef, onPick, onCancel, t }) {
  const layerRef = useRef(null);
  const pointer = useRef(null);
  const frame = useRef(0);
  const [viewport, setViewport] = useState(null);
  const [preview, setPreview] = useState(null);
  // Uma imagem que termina de carregar refaz a amostra (o pixel só existe depois disso).
  const resample = useRef(null);
  const onImageReady = useCallback(() => resample.current?.(), []);

  // A barra de rolagem aparece/some com o conteúdo: remedida a cada amostra.
  const measure = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const next = viewportOf(iframe);
    setViewport((current) => (sameViewport(current, next) ? current : next));
  }, [iframeRef]);

  const resolveAt = useCallback((point) => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!point || !doc?.body) return null;
    const area = viewportOf(iframe);
    const result = resolveElementColor(doc, point.x - area.left, point.y - area.top, point.shift, onImageReady);
    if (!result) return null;
    const box = result.element.getBoundingClientRect();
    return {
      ...result,
      tag: result.element.tagName.toLowerCase(),
      x: point.x,
      y: point.y,
      box: { left: box.left, top: box.top, width: box.width, height: box.height },
    };
  }, [iframeRef, onImageReady]);

  const sample = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      measure();
      setPreview(resolveAt(pointer.current));
    });
  }, [resolveAt, measure]);
  useEffect(() => { resample.current = sample; }, [sample]);

  // Acompanha posição e tamanho do iframe (redimensionar a sidebar, a janela).
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(iframe);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(frame.current);
    };
  }, [iframeRef, measure]);

  // Fora do canvas: cursor proibido e cliques ignorados; Esc cancela; Shift alterna texto/fundo.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(PICKING_CLASS);
    const block = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target && (layerRef.current?.contains(target) || target.closest('[data-eyedropper-active]'))) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const onKey = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key === 'Shift' && pointer.current && pointer.current.shift !== (event.type === 'keydown')) {
        pointer.current = { ...pointer.current, shift: event.type === 'keydown' };
        sample();
      }
    };
    BLOCKED_EVENTS.forEach((type) => window.addEventListener(type, block, true));
    window.addEventListener('keydown', onKey, true);
    // Com o foco ainda dentro do canvas, as teclas nascem no documento do iframe.
    const frameWindow = iframeRef.current?.contentWindow;
    frameWindow?.addEventListener('keydown', onKey, true);
    frameWindow?.addEventListener('keyup', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => {
      root.classList.remove(PICKING_CLASS);
      BLOCKED_EVENTS.forEach((type) => window.removeEventListener(type, block, true));
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      frameWindow?.removeEventListener('keydown', onKey, true);
      frameWindow?.removeEventListener('keyup', onKey, true);
    };
  }, [iframeRef, onCancel, sample]);

  const track = (event) => {
    pointer.current = { x: event.clientX, y: event.clientY, shift: event.shiftKey };
    sample();
  };

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    pointer.current = { x: event.clientX, y: event.clientY, shift: event.shiftKey };
    const result = resolveAt(pointer.current);
    if (!result) return;
    swallowFollowUpClicks(iframeRef.current?.contentWindow);
    onPick(result.hex);
  };

  const handleWheel = (event) => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc?.body) return;
    const area = viewportOf(iframe);
    forwardWheel(doc, event.clientX - area.left, event.clientY - area.top, event);
    sample();
  };

  if (!viewport) return null;

  const badgeX = preview && (preview.x + BADGE_OFFSET + BADGE_WIDTH > window.innerWidth ? preview.x - BADGE_OFFSET - BADGE_WIDTH : preview.x + BADGE_OFFSET);
  // O aviso de imagem protegida ocupa mais duas linhas.
  const badgeHeight = preview?.imageBlocked ? BADGE_HEIGHT + 34 : BADGE_HEIGHT;
  const badgeY = preview && (preview.y + BADGE_OFFSET + badgeHeight > window.innerHeight ? preview.y - BADGE_OFFSET - badgeHeight : preview.y + BADGE_OFFSET);
  const sourceLabel = preview && t(SOURCE_LABELS[preview.source]);
  const toggleHint = preview?.canToggle && t(preview.source === 'text' ? 'colorTools.shiftForBackground' : 'colorTools.shiftForText');

  // No body: temas com backdrop-filter no layout prenderiam o position: fixed.
  return createPortal(
    <>
      <div
        ref={layerRef}
        className="eyedropper-layer"
        style={viewport}
        role="application"
        aria-label={t('colorTools.eyedropperActive')}
        onPointerMove={track}
        onPointerLeave={() => {
          pointer.current = null;
          sample();
        }}
        onClick={handleClick}
        onWheel={handleWheel}
      >
        <div className="eyedropper-layer__hint" aria-hidden="true">
          <Pipette size={13} />
          <span>{t('colorTools.eyedropperHint')}</span>
        </div>
        {preview && (
          <div
            className="eyedropper-layer__target"
            style={{ left: preview.box.left, top: preview.box.top, width: preview.box.width, height: preview.box.height }}
          />
        )}
      </div>
      {preview && (
        <div className="eyedropper-badge" style={{ transform: `translate(${badgeX}px, ${badgeY}px)` }} aria-hidden="true">
          <span className="eyedropper-badge__swatch" style={{ background: preview.hex }} />
          <span className="eyedropper-badge__info">
            <span className="eyedropper-badge__hex">{preview.hex}</span>
            <span className="eyedropper-badge__meta">
              <code>{`<${preview.tag}>`}</code>
              <span>{sourceLabel}</span>
              {toggleHint && <span className="eyedropper-badge__toggle">{toggleHint}</span>}
              {preview.imageBlocked && <span className="eyedropper-badge__warning">{t('colorTools.imageBlocked')}</span>}
            </span>
          </span>
        </div>
      )}
    </>,
    document.body,
  );
}

export default memo(EyedropperOverlay);
