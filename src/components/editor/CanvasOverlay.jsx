import { memo, useEffect, useRef, useState } from 'react';

const FLASH_MS = 1600;
const TAG_HEIGHT = 17;
const SIDES = ['Top', 'Right', 'Bottom', 'Left'];

function measure(root, iframe, element) {
  const win = iframe?.contentWindow;
  if (!root || !win || !element?.isConnected || element.ownerDocument !== iframe.contentDocument) return null;
  const host = root.getBoundingClientRect();
  const frame = iframe.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const style = win.getComputedStyle(element);
  const read = (name) => SIDES.map((side) => parseFloat(style[name.replace('*', side)]) || 0);
  return {
    frame: { left: frame.left - host.left, top: frame.top - host.top, width: frame.width, height: frame.height },
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    margin: read('margin*'),
    border: read('border*Width'),
    padding: read('padding*'),
  };
}

const widths = ([top, right, bottom, left]) => `${top}px ${right}px ${bottom}px ${left}px`;

// Drawn in the editor, above the iframe, so the student's document (and its
// export) never receives helper markup. `values` only signals a style change.
function CanvasOverlay({ iframeRef, element, boxMode, flashKey, values, t }) {
  const rootRef = useRef(null);
  const [geometry, setGeometry] = useState(null);
  const [flash, setFlash] = useState({ key: flashKey, on: false });
  if (flash.key !== flashKey) setFlash({ key: flashKey, on: flashKey > 0 });
  const active = !!element && (!!boxMode || flash.on);

  useEffect(() => {
    if (!flash.on) return undefined;
    const timer = setTimeout(() => setFlash((current) => ({ ...current, on: false })), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (!active) return undefined;
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = measure(rootRef.current, iframe, element);
        setGeometry(next && { ...next, element });
      });
    };
    update();
    const observer = new ResizeObserver(update);
    if (iframe) observer.observe(iframe);
    win?.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      win?.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [active, element, iframeRef, values]);

  // A measurement taken for another element (or before deactivation) is stale.
  const shown = active && geometry?.element === element ? geometry : null;
  const { frame, rect, margin, border, padding } = shown || {};
  return (
    <div ref={rootRef} className="canvas-overlay" aria-hidden="true">
      {shown && (
        <div className="canvas-overlay__frame" style={frame}>
          {boxMode && (
            <div className={`canvas-overlay__box canvas-overlay__box--${boxMode}`}>
              <div
                className="canvas-overlay__margin"
                style={{
                  left: rect.left - margin[3], top: rect.top - margin[0],
                  width: rect.width + margin[1] + margin[3], height: rect.height + margin[0] + margin[2],
                  borderWidth: widths(margin),
                }}
              />
              <div
                className="canvas-overlay__padding"
                style={{
                  left: rect.left + border[3], top: rect.top + border[0],
                  width: Math.max(0, rect.width - border[1] - border[3]), height: Math.max(0, rect.height - border[0] - border[2]),
                  borderWidth: widths(padding),
                }}
              />
              <span
                className={`canvas-overlay__tag canvas-overlay__tag--${boxMode}`}
                style={boxMode === 'margin'
                  ? { left: rect.left - margin[3], top: Math.max(0, rect.top - margin[0] - TAG_HEIGHT) }
                  : { left: rect.left + border[3], top: rect.top + border[0] }}
              >
                {boxMode}
              </span>
            </div>
          )}
          {flash.on && (
            <div
              key={flash.key}
              className="canvas-overlay__flash"
              style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
            >
              <span className="canvas-overlay__tag canvas-overlay__tag--flash">{t('challenges.targetHere')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(CanvasOverlay);
