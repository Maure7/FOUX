import useHoverStyles from './inspector/useHoverStyles';
import { SCROLLBAR_STYLE_ID } from '../utils/inspector/constants';
import { useState, useCallback, useEffect, useRef } from 'react';
import { setGradientBorder, updateGradientBorderBackground } from '../utils/gradientBorder';
import { extractComputedStyles, rememberOriginalStyle } from '../utils/inspector/styles';
import { HOVER_OUTLINE, HOVER_OFFSET, SELECT_OUTLINE, SELECT_OFFSET, ATTR_HOVERED, ATTR_SELECTED, INSPECTOR_STYLE_ID, HOVER_STYLE_ID } from '../utils/inspector/constants';

export default function useIframeInspector(iframeRef) {
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedTagName, setSelectedTagName] = useState(null);
  const [computedStyles, setComputedStyles] = useState(null);

  // Refs mutáveis para uso nos listeners (evita stale closures)
  const hoveredRef = useRef(null);
  const selectedRef = useRef(null);
  const cleanupRef = useRef(null);
  const previewModeRef = useRef(false);

  const clearHover = useCallback(() => {
    const el = hoveredRef.current;
    if (el) {
      el.removeAttribute(ATTR_HOVERED);
      hoveredRef.current = null;
    }
  }, []);

  const clearSelectionOutline = useCallback(() => {
    const el = selectedRef.current;
    if (el) {
      el.removeAttribute(ATTR_SELECTED);
    }
  }, []);

  const clearSelection = useCallback(() => {
    clearSelectionOutline();
    selectedRef.current = null;
    setSelectedElement(null);
    setSelectedTagName(null);
    setComputedStyles(null);
  }, [clearSelectionOutline]);

  const applyStyle = useCallback((cssProperty, value) => {
    const el = selectedRef.current;
    if (!el?.isConnected) return;
    rememberOriginalStyle(el);

    if (cssProperty === 'borderGradient') {
      setGradientBorder(el, value);
    } else if (updateGradientBorderBackground(el, cssProperty, value)) {
      // The helper updates the logical background without losing the border layer.
    } else if (cssProperty === 'borderRadius') {
      const valStr = typeof value === 'number' ? `${value}px` : String(value);
      el.style.setProperty('border-radius', valStr, 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
    } else if (['borderWidth', 'borderStyle', 'borderColor'].includes(cssProperty)) {
      // Imported stylesheets may declare borders with !important.
      const property = cssProperty.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      el.style.setProperty(property, String(value), 'important');
    } else {
      el.style[cssProperty] = value;
    }

    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      const updated = extractComputedStyles(el, iframe.contentWindow);
      if (updated) setComputedStyles(updated);
    }
  }, [iframeRef]);

  const serializeDocument = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return null;
    const doc = iframe.contentDocument;

    // Blindagem: se o documento ou body estiver vazio (ex: about:blank durante desmontagem), não serializa
    if (!doc.body || (!doc.body.innerHTML.trim() && doc.body.children.length === 0)) {
      return null;
    }

    const clone = doc.documentElement.cloneNode(true);
    clone.removeAttribute(ATTR_HOVERED);
    clone.removeAttribute(ATTR_SELECTED);
    clone.querySelector(`#${INSPECTOR_STYLE_ID}`)?.remove();
    clone.querySelector(`#${SCROLLBAR_STYLE_ID}`)?.remove();
    clone.querySelectorAll(`[${ATTR_HOVERED}], [${ATTR_SELECTED}]`).forEach((el) => {
      el.removeAttribute(ATTR_HOVERED);
      el.removeAttribute(ATTR_SELECTED);
    });
    return `<!DOCTYPE html>\n${clone.outerHTML}`;
  }, [iframeRef]);

  const setPreviewMode = useCallback((enabled) => {
    previewModeRef.current = enabled;
    clearHover();
    const style = iframeRef.current?.contentDocument?.getElementById(INSPECTOR_STYLE_ID);
    if (style?.sheet) style.sheet.disabled = enabled;
  }, [iframeRef, clearHover]);

  const injectFont = useCallback((fontName, fontUrl) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    const doc = iframe.contentDocument;

    // Verificar se já existe
    const existingId = `foux-font-${fontName.replace(/\s+/g, '-')}`;
    const existingStyle = doc.getElementById(existingId);
    const style = existingStyle || doc.createElement('style');
    style.id = existingId;
    style.textContent = `
      @font-face {
        font-family: '${fontName}';
        src: url('${fontUrl}') format('woff2'), url('${fontUrl}') format('woff'), url('${fontUrl}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    `;
    if (!existingStyle) doc.head.appendChild(style);
  }, [iframeRef]);

  const getElementsWithId = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return [];
    const doc = iframe.contentDocument;
    const elements = doc.querySelectorAll('[id]');
    const result = [];
    elements.forEach((el) => {
      // Filtrar ids de inspeção e internos
      if (el.id && !el.id.startsWith('foux-font-') && el.id !== HOVER_STYLE_ID && el.id !== INSPECTOR_STYLE_ID && el.id !== SCROLLBAR_STYLE_ID) {
        result.push({
          id: el.id,
          tagName: el.tagName,
          label: `#${el.id} <${el.tagName.toLowerCase()}>`,
        });
      }
    });
    return result;
  }, [iframeRef]);

  const selectElementById = useCallback((elementId) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument || !iframe?.contentWindow) return;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    const element = doc.getElementById(elementId);
    if (!element) return;

    // Limpar hover e seleção anterior
    clearHover();
    clearSelectionOutline();

    // Selecionar
    element.setAttribute(ATTR_SELECTED, '');
    selectedRef.current = element;

    const tagName = element.tagName || 'ELEMENT';
    const styles = extractComputedStyles(element, win);

    setSelectedElement(element);
    setSelectedTagName(tagName);
    setComputedStyles(styles);

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [iframeRef, clearHover, clearSelectionOutline]);


  const { assignHoverClass, getHoverClass, injectHoverStyles, getHoverRules } = useHoverStyles(iframeRef, selectedRef);

  const setupListeners = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return;
    doc.querySelectorAll('[style]').forEach(rememberOriginalStyle);

    // Limpar listeners anteriores se existirem
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Inspection markers use a separate stylesheet, preserving authored outlines.
    let inspectorStyle = doc.getElementById(INSPECTOR_STYLE_ID);
    if (!inspectorStyle) {
      inspectorStyle = doc.createElement('style');
      inspectorStyle.id = INSPECTOR_STYLE_ID;
      doc.head.appendChild(inspectorStyle);
    }
    inspectorStyle.textContent = `
      [${ATTR_HOVERED}]:not([${ATTR_SELECTED}]) {
        outline: ${HOVER_OUTLINE} !important;
        outline-offset: ${HOVER_OFFSET} !important;
      }
      [${ATTR_SELECTED}] {
        outline: ${SELECT_OUTLINE} !important;
        outline-offset: ${SELECT_OFFSET} !important;
      }
    `;
    inspectorStyle.sheet.disabled = previewModeRef.current;
    doc.querySelectorAll(`[${ATTR_HOVERED}], [${ATTR_SELECTED}]`).forEach((el) => {
      el.removeAttribute(ATTR_HOVERED);
      el.removeAttribute(ATTR_SELECTED);
    });

    // Reset state
    selectedRef.current = null;
    hoveredRef.current = null;
    setSelectedElement(null);
    setSelectedTagName(null);
    setComputedStyles(null);

    // Blindagem de renderização para o componente #box-unica no tutorial (Design System: rounded-2xl / 16px)
    try {
      const boxUnica = doc.getElementById('caja-unica') || doc.getElementById('box-unica');
      if (boxUnica) {
        rememberOriginalStyle(boxUnica);
        boxUnica.style.setProperty('overflow', 'hidden', 'important');
        boxUnica.style.setProperty('box-sizing', 'border-box', 'important');
        const computed = win.getComputedStyle(boxUnica);
        if (!computed.borderRadius || computed.borderRadius === '0px' || computed.borderRadius === '10px') {
          boxUnica.style.setProperty('border-radius', '16px', 'important');
        }
      }
    } catch {
      // safe fallback
    }

    function onMouseOver(e) {
      if (previewModeRef.current) return;
      const target = e.target;
      if (!target?.style || target === doc.documentElement) return;
      clearHover();
      if (target === selectedRef.current) return;
      target.setAttribute(ATTR_HOVERED, '');
      hoveredRef.current = target;
    }

    function onMouseOut(e) {
      const target = e.target;
      if (target === hoveredRef.current) {
        clearHover();
      }
    }

    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      if (previewModeRef.current) return;

      const target = e.target;
      if (!target?.style) return;

      clearHover();
      clearSelectionOutline();

      const element = target;
      element.setAttribute(ATTR_SELECTED, '');
      selectedRef.current = element;

      const tagName = element.tagName || 'ELEMENT';
      const styles = extractComputedStyles(element, win);

      setSelectedElement(element);
      setSelectedTagName(tagName);
      setComputedStyles(styles);
    }

    function onSubmit(e) {
      e.preventDefault();
      e.stopPropagation();
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
      clearSelectionOutline();
    };
  }, [iframeRef, clearHover, clearSelectionOutline]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function onLoad() {
      setupListeners();
    }

    iframe.addEventListener('load', onLoad);

    if (iframe.contentDocument?.readyState === 'complete') {
      setupListeners();
    }

    return () => {
      iframe.removeEventListener('load', onLoad);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [iframeRef, setupListeners]);

  return {
    selectedElement,
    selectedTagName,
    computedStyles,
    applyStyle,
    clearSelection,
    setPreviewMode,
    serializeDocument,
    injectFont,
    getElementsWithId,
    selectElementById,
    /* FIX #1: Editabilidade imediata */
    setupIframeListeners: setupListeners,
    /* FIX #6: Hover events */
    assignHoverClass,
    getHoverClass,
    injectHoverStyles,
    getHoverRules,
  };
}
