import { useState, useCallback, useEffect, useRef } from 'react';
import useHoverStyles from './inspector/useHoverStyles';
import { getGradientBorder, setGradientBorder, updateGradientBorderBackground } from '../utils/gradientBorder';
import { extractComputedStyles, rememberOriginalStyle, transitionsSettled } from '../utils/inspector/styles';
import {
  HOVER_OUTLINE, HOVER_OFFSET, SELECT_OUTLINE, SELECT_OFFSET, ATTR_HOVERED, ATTR_SELECTED,
  INSPECTOR_STYLE_ID, HOVER_STYLE_ID, SCROLLBAR_STYLE_ID, ORIGINAL_STYLE_ATTR,
} from '../utils/inspector/constants';

const FONT_STYLE_PREFIX = 'foux-font-';
const INTERNAL_IDS = new Set([HOVER_STYLE_ID, INSPECTOR_STYLE_ID, SCROLLBAR_STYLE_ID]);
// Imported stylesheets may declare borders with !important.
const IMPORTANT_BORDER_PROPERTIES = { borderWidth: 'border-width', borderStyle: 'border-style', borderColor: 'border-color' };

const INSPECTOR_CSS = `
  [${ATTR_HOVERED}]:not([${ATTR_SELECTED}]) {
    outline: ${HOVER_OUTLINE} !important;
    outline-offset: ${HOVER_OFFSET} !important;
  }
  [${ATTR_SELECTED}] {
    outline: ${SELECT_OUTLINE} !important;
    outline-offset: ${SELECT_OFFSET} !important;
  }
`;

function writeStyle(element, cssProperty, value) {
  if (cssProperty === 'borderGradient') {
    setGradientBorder(element, value);
    return;
  }
  // With a gradient border, the background lives in painted layers.
  if (updateGradientBorderBackground(element, cssProperty, value)) return;
  if (cssProperty === 'backgroundImage') {
    element.style.backgroundImage = value;
    if (value?.startsWith('linear-gradient(')) {
      element.style.setProperty('background-clip', 'padding-box', 'important');
      element.style.setProperty('background-repeat', 'no-repeat', 'important');
      element.style.setProperty('background-size', 'auto', 'important');
    }
    return;
  }
  if (cssProperty === 'borderRadius') {
    element.style.setProperty('border-radius', typeof value === 'number' ? `${value}px` : String(value), 'important');
    element.style.setProperty('overflow', 'hidden', 'important');
    return;
  }
  const borderProperty = IMPORTANT_BORDER_PROPERTIES[cssProperty];
  if (!borderProperty) {
    element.style[cssProperty] = value;
    return;
  }
  element.style.setProperty(borderProperty, String(value), 'important');
  if (cssProperty === 'borderWidth' && parseFloat(value) > 0) {
    // A width alone stays invisible while the live style is none/hidden. Read
    // it from the element: React state may still be a frame behind.
    const style = element.ownerDocument.defaultView.getComputedStyle(element).borderTopStyle;
    if (style === 'none' || style === 'hidden') element.style.setProperty('border-style', 'solid', 'important');
  }
}

export default function useIframeInspector(iframeRef) {
  const [selectedElement, setSelectedElement] = useState(null);
  const [computedStyles, setComputedStyles] = useState(null);

  // Listeners inside the iframe read refs, never render-time state.
  const hoveredRef = useRef(null);
  const selectedRef = useRef(null);
  const cleanupRef = useRef(null);
  const previewModeRef = useRef(false);
  const refreshFrame = useRef(0);
  const settling = useRef(null);

  const clearHover = useCallback(() => {
    hoveredRef.current?.removeAttribute(ATTR_HOVERED);
    hoveredRef.current = null;
  }, []);

  const cancelRefresh = useCallback(() => {
    cancelAnimationFrame(refreshFrame.current);
    refreshFrame.current = 0;
  }, []);

  // Style writes reach the iframe immediately; reading computed styles back
  // (style recalc + layout) and re-rendering the sidebar happen once per frame.
  const scheduleRefresh = useCallback(() => {
    const run = () => {
      if (refreshFrame.current) return;
      refreshFrame.current = requestAnimationFrame(() => {
        refreshFrame.current = 0;
        const element = selectedRef.current;
        const win = iframeRef.current?.contentWindow;
        if (!element?.isConnected || element.ownerDocument !== win?.document) return;
        setComputedStyles(extractComputedStyles(element, win));
        // Read again once authored transitions reach the value just written.
        const settled = settling.current === element ? null : transitionsSettled(element);
        if (settled) {
          settling.current = element;
          settled.then(() => {
            settling.current = null;
            run();
          });
        }
      });
    };
    run();
  }, [iframeRef]);

  const select = useCallback((element) => {
    cancelRefresh();
    clearHover();
    selectedRef.current?.removeAttribute(ATTR_SELECTED);
    selectedRef.current = element;
    element?.setAttribute(ATTR_SELECTED, '');
    setSelectedElement(element);
    setComputedStyles(element ? extractComputedStyles(element, iframeRef.current?.contentWindow) : null);
  }, [iframeRef, cancelRefresh, clearHover]);

  const applyStyle = useCallback((cssProperty, value) => {
    const element = selectedRef.current;
    if (!element?.isConnected) return;
    rememberOriginalStyle(element);
    writeStyle(element, cssProperty, value);
    scheduleRefresh();
  }, [scheduleRefresh]);

  const serializeDocument = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    // about:blank during unmount must never overwrite a saved project.
    if (!doc?.body || (!doc.body.innerHTML.trim() && doc.body.children.length === 0)) return null;

    const clone = doc.documentElement.cloneNode(true);
    clone.querySelector(`#${INSPECTOR_STYLE_ID}`)?.remove();
    clone.querySelector(`#${SCROLLBAR_STYLE_ID}`)?.remove();
    for (const element of [clone, ...clone.querySelectorAll(`[${ATTR_HOVERED}], [${ATTR_SELECTED}]`)]) {
      element.removeAttribute(ATTR_HOVERED);
      element.removeAttribute(ATTR_SELECTED);
    }
    return `<!DOCTYPE html>\n${clone.outerHTML}`;
  }, [iframeRef]);

  const setPreviewMode = useCallback((enabled) => {
    previewModeRef.current = enabled;
    clearHover();
    const style = iframeRef.current?.contentDocument?.getElementById(INSPECTOR_STYLE_ID);
    if (style?.sheet) style.sheet.disabled = enabled;
  }, [iframeRef, clearHover]);

  const injectFont = useCallback((fontName, fontUrl) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.head) return;
    const id = `${FONT_STYLE_PREFIX}${fontName.replace(/\s+/g, '-')}`;
    const style = doc.getElementById(id) || doc.head.appendChild(doc.createElement('style'));
    style.id = id;
    style.textContent = `
      @font-face {
        font-family: '${fontName}';
        src: url('${fontUrl}') format('woff2'), url('${fontUrl}') format('woff'), url('${fontUrl}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    `;
  }, [iframeRef]);

  // Fonts are embedded in the document, so the list survives reopening the project.
  const getImportedFonts = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return [];
    return [...doc.querySelectorAll(`style[id^="${FONT_STYLE_PREFIX}"]`)]
      .map((style) => style.textContent.match(/font-family:\s*'([^']+)'/)?.[1])
      .filter(Boolean)
      .map((name) => ({ label: name, value: `'${name}'` }));
  }, [iframeRef]);

  const getElementsWithId = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return [];
    return [...doc.querySelectorAll('[id]')]
      .filter((element) => element.id && !element.id.startsWith(FONT_STYLE_PREFIX) && !INTERNAL_IDS.has(element.id))
      .map((element) => ({ id: element.id, tagName: element.tagName }));
  }, [iframeRef]);

  const selectElementById = useCallback((elementId) => {
    const element = iframeRef.current?.contentDocument?.getElementById(elementId);
    if (!element) return;
    select(element);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [iframeRef, select]);

  const { assignHoverClass, injectHoverStyles, getHoverRules, clearHoverRules } = useHoverStyles(iframeRef, selectedRef);

  // Returns the selected element to the inline style it had when the document
  // was first opened (the snapshot the CSS export also compares against).
  const restoreSelected = useCallback(() => {
    const element = selectedRef.current;
    if (!element?.isConnected) return false;
    let changed = false;
    if (getGradientBorder(element)) {
      setGradientBorder(element, null);
      changed = true;
    }
    const original = element.getAttribute(ORIGINAL_STYLE_ATTR);
    if (original !== null && (element.getAttribute('style') || '') !== original) {
      if (original) element.setAttribute('style', original);
      else element.removeAttribute('style');
      changed = true;
    }
    if (clearHoverRules(element)) changed = true;
    // Read back now, in the same render as the caller's revision bump, so the
    // gradient toggles resync from the restored styles.
    if (changed) {
      cancelRefresh();
      setComputedStyles(extractComputedStyles(element, iframeRef.current?.contentWindow));
    }
    return changed;
  }, [iframeRef, clearHoverRules, cancelRefresh]);

  // Called on every iframe load (initial file, import, undo/redo, language switch).
  const setupListeners = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    if (!doc || !win) return;

    cleanupRef.current?.();
    cleanupRef.current = null;
    cancelRefresh();

    doc.querySelectorAll('[style]').forEach(rememberOriginalStyle);
    // Repaint saved gradient borders with the current clipping and tiling rules.
    doc.querySelectorAll('[data-foux-gradient-border]').forEach((element) => {
      const gradient = getGradientBorder(element);
      if (gradient) setGradientBorder(element, gradient);
    });

    // A separate stylesheet keeps the inspection outlines from replacing authored outlines.
    let inspectorStyle = doc.getElementById(INSPECTOR_STYLE_ID);
    if (!inspectorStyle) {
      inspectorStyle = doc.createElement('style');
      inspectorStyle.id = INSPECTOR_STYLE_ID;
      doc.head.appendChild(inspectorStyle);
    }
    inspectorStyle.textContent = INSPECTOR_CSS;
    inspectorStyle.sheet.disabled = previewModeRef.current;
    doc.querySelectorAll(`[${ATTR_HOVERED}], [${ATTR_SELECTED}]`).forEach((element) => {
      element.removeAttribute(ATTR_HOVERED);
      element.removeAttribute(ATTR_SELECTED);
    });

    selectedRef.current = null;
    hoveredRef.current = null;
    setSelectedElement(null);
    setComputedStyles(null);

    // The tutorial's single box must keep its rounded clipping while students
    // experiment with borders (PT and ES templates use different IDs).
    const tutorialBox = doc.getElementById('caja-unica') || doc.getElementById('box-unica');
    if (tutorialBox) {
      rememberOriginalStyle(tutorialBox);
      tutorialBox.style.setProperty('overflow', 'hidden', 'important');
      tutorialBox.style.setProperty('box-sizing', 'border-box', 'important');
      const radius = win.getComputedStyle(tutorialBox).borderRadius;
      if (!radius || radius === '0px' || radius === '10px') {
        tutorialBox.style.setProperty('border-radius', '16px', 'important');
      }
    }

    function onMouseOver(event) {
      const target = event.target;
      if (previewModeRef.current || !target?.style || target === doc.documentElement) return;
      clearHover();
      if (target === selectedRef.current) return;
      target.setAttribute(ATTR_HOVERED, '');
      hoveredRef.current = target;
    }

    function onMouseOut(event) {
      if (event.target === hoveredRef.current) clearHover();
    }

    // Links, buttons and forms inside the student's page must not navigate.
    function onClick(event) {
      event.preventDefault();
      event.stopPropagation();
      if (!previewModeRef.current && event.target?.style) select(event.target);
    }

    function onSubmit(event) {
      event.preventDefault();
      event.stopPropagation();
    }

    doc.addEventListener('mouseover', onMouseOver, true);
    doc.addEventListener('mouseout', onMouseOut, true);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('submit', onSubmit, true);

    cleanupRef.current = () => {
      doc.removeEventListener('mouseover', onMouseOver, true);
      doc.removeEventListener('mouseout', onMouseOut, true);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('submit', onSubmit, true);
      clearHover();
      selectedRef.current?.removeAttribute(ATTR_SELECTED);
    };
  }, [iframeRef, cancelRefresh, clearHover, select]);

  useEffect(() => () => {
    cleanupRef.current?.();
    cancelAnimationFrame(refreshFrame.current);
  }, []);

  return {
    selectedElement,
    computedStyles,
    applyStyle,
    setPreviewMode,
    serializeDocument,
    injectFont,
    getImportedFonts,
    getElementsWithId,
    selectElementById,
    setupIframeListeners: setupListeners,
    assignHoverClass,
    injectHoverStyles,
    getHoverRules,
    restoreSelected,
  };
}
