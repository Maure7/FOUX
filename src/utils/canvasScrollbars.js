import scrollbarCss from '../styles/scrollbars.css?inline';
import { SCROLLBAR_STYLE_ID } from './inspector/constants';

export function syncCanvasScrollbars(doc, theme) {
  if (!doc?.head) return;
  let style = doc.getElementById(SCROLLBAR_STYLE_ID);
  if (!style) {
    style = doc.createElement('style');
    style.id = SCROLLBAR_STYLE_ID;
    doc.head.appendChild(style);
  }
  // Scope the selected palette to the canvas root without modifying authored attributes.
  style.textContent = scrollbarCss.replace(/\[data-theme="([^"]+)"\]/g,
    (_, name) => name === theme ? ':root' : ':root:not(*)');
}
