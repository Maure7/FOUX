import { useState, useCallback, useEffect, useRef } from 'react';
import { getGradientBorder, parseLinearGradient, setGradientBorder, updateGradientBorderBackground } from '../utils/gradientBorder';

/* ===================================================================
   useIframeInspector — Hook de inspeção e estilização de elementos
   dentro de um <iframe> isolado (sandbox="allow-same-origin").

   Responsabilidades:
   1. Hover highlight (outline dashed) ao passar o mouse
   2. Click-to-select com outline persistente
   3. Extração de estilos computados via getComputedStyle()
   4. Aplicação de estilos inline no nó selecionado
   5. Prevenção de navegação em <a> e submit em <form>
   6. Serialização limpa do documento para persistência
   7. Injeção de fontes locais (@font-face)
   8. Listagem de elementos com id para aba Layout
   9. Injeção de estilos dinâmicos de hover (aba Eventos)
   =================================================================== */

/* ---------- Utilities ---------- */

function rgbToHex(rgb) {
  if (!rgb || rgb.startsWith('#')) return rgb || '#000000';
  const match = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return '#000000';
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function parsePx(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/* ---------- Constantes de estilo de inspeção ---------- */
const HOVER_OUTLINE = '1.5px dashed #f0a85d';
const HOVER_OFFSET = '1px';
const SELECT_OUTLINE = '2px solid #e59843';
const SELECT_OFFSET = '1px';

const ATTR_HOVERED = 'data-foux-hovered';
const ATTR_SELECTED = 'data-foux-selected';
const INSPECTOR_STYLE_ID = 'foux-inspector-styles';

const HOVER_STYLE_ID = 'foux-user-hover-rules';
const HOVER_CLASS_PREFIX = 'foux-hover-target-';
const ORIGINAL_STYLE_ATTR = 'data-foux-original-style';

function rememberOriginalStyle(element) {
  if (!element.hasAttribute(ORIGINAL_STYLE_ATTR)) {
    element.setAttribute(ORIGINAL_STYLE_ATTR, element.getAttribute('style') || '');
  }
}

/**
 * Lê os estilos computados relevantes de um elemento DOM.
 * Inclui width/height para imagens e fontFamily para tipografia.
 */
function extractComputedStyles(element, iframeWindow) {
  if (!element || !iframeWindow) return null;
  const cs = iframeWindow.getComputedStyle(element);
  let gradientBorder = getGradientBorder(element);
  if (!gradientBorder) {
    const legacyGradient = parseLinearGradient(cs.borderImageSource);
    if (legacyGradient) {
      rememberOriginalStyle(element);
      setGradientBorder(element, legacyGradient, { replaceBorderImage: true });
      gradientBorder = getGradientBorder(element);
    }
  }
  const borderColor = gradientBorder?.borderColor || cs.borderColor;

  return {
    fontSize: parsePx(cs.fontSize),
    fontFamily: cs.fontFamily || '',
    textAlign: cs.textAlign || 'left',
    color: rgbToHex(cs.color),
    backgroundColor: rgbToHex(cs.backgroundColor),
    borderRadius: parsePx(cs.borderRadius),
    borderWidth: parsePx(cs.borderWidth),
    borderStyle: cs.borderTopStyle,
    borderColor: rgbToHex(borderColor),
    borderGradient: gradientBorder ? {
      color1: gradientBorder.color1, color2: gradientBorder.color2, angle: gradientBorder.angle,
    } : null,
    padding: parsePx(cs.padding),
    margin: parsePx(cs.margin),
    width: parsePx(cs.width),
    height: parsePx(cs.height),
    /* Raw color strings for alpha extraction */
    _rawColor: cs.color || '',
    _rawBg: cs.backgroundColor || '',
    _rawBorderColor: borderColor || '',
  };
}

/* ===================================================================
   HOOK PRINCIPAL
   =================================================================== */
export default function useIframeInspector(iframeRef) {
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedTagName, setSelectedTagName] = useState(null);
  const [computedStyles, setComputedStyles] = useState(null);

  // Refs mutáveis para uso nos listeners (evita stale closures)
  const hoveredRef = useRef(null);
  const selectedRef = useRef(null);
  const cleanupRef = useRef(null);
  const previewModeRef = useRef(false);

  /* ------ Limpar destaque de hover ------ */
  const clearHover = useCallback(() => {
    const el = hoveredRef.current;
    if (el) {
      el.removeAttribute(ATTR_HOVERED);
      hoveredRef.current = null;
    }
  }, []);

  /* ------ Limpar destaque de seleção ------ */
  const clearSelectionOutline = useCallback(() => {
    const el = selectedRef.current;
    if (el) {
      el.removeAttribute(ATTR_SELECTED);
    }
  }, []);

  /* ------ Limpar toda a seleção (público) ------ */
  const clearSelection = useCallback(() => {
    clearSelectionOutline();
    selectedRef.current = null;
    setSelectedElement(null);
    setSelectedTagName(null);
    setComputedStyles(null);
  }, [clearSelectionOutline]);

  /* ------ Aplicar estilo ao elemento selecionado ------ */
  const applyStyle = useCallback((cssProperty, value) => {
    const el = selectedRef.current;
    if (!el) return;
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

  /* ------ Serializar documento limpo (sem atributos de inspeção) ------ */
  const serializeDocument = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return null;
    const doc = iframe.contentDocument;

    // Blindagem: se o documento ou body estiver vazio (ex: about:blank durante desmontagem), não serializa
    if (!doc.body || (!doc.body.innerHTML.trim() && doc.body.children.length === 0)) {
      return null;
    }

    const clone = doc.documentElement.cloneNode(true);
    clone.querySelector(`#${INSPECTOR_STYLE_ID}`)?.remove();
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

  /* ------ Injetar @font-face no iframe ------ */
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

  /* ------ Listar elementos com id no documento ------ */
  const getElementsWithId = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return [];
    const doc = iframe.contentDocument;
    const elements = doc.querySelectorAll('[id]');
    const result = [];
    elements.forEach((el) => {
      // Filtrar ids de inspeção e internos
      if (el.id && !el.id.startsWith('foux-font-') && el.id !== HOVER_STYLE_ID && el.id !== INSPECTOR_STYLE_ID) {
        result.push({
          id: el.id,
          tagName: el.tagName,
          label: `#${el.id} <${el.tagName.toLowerCase()}>`,
        });
      }
    });
    return result;
  }, [iframeRef]);

  /* ------ Selecionar elemento por ID (programático) ------ */
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

  /* ============================================================
     HOVER STYLES — Aba Eventos (Injeção e Persistência Definitiva)
     Centralizado em <style id="foux-user-hover-rules"> no <head>
     ============================================================ */

  /** Atribui uma classe hover única e data-foux-id ao elemento, se ainda não tiver */
  const assignHoverClass = useCallback((element) => {
    if (!element) return null;
    let targetClass = Array.from(element.classList).find((c) => c.startsWith(HOVER_CLASS_PREFIX));
    let fouxId = element.getAttribute('data-foux-id');

    if (!fouxId) {
      fouxId = element.id || `foux_${Math.random().toString(36).slice(2, 8)}`;
      element.setAttribute('data-foux-id', fouxId);
    }

    if (!targetClass) {
      targetClass = `${HOVER_CLASS_PREFIX}${Math.random().toString(36).slice(2, 10)}`;
      element.classList.add(targetClass);
    }
    return targetClass;
  }, []);

  /** Obtém a classe hover existente de um elemento */
  const getHoverClass = useCallback((element) => {
    if (!element) return null;
    return Array.from(element.classList).find((c) => c.startsWith(HOVER_CLASS_PREFIX)) || null;
  }, []);

  /** Injeta/atualiza regras de :hover diretamente no textContent de <style id="foux-user-hover-rules"> */
  const injectHoverStyles = useCallback((selector, cssText, element = selectedRef.current) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    const doc = iframe.contentDocument;

    let styleEl = doc.getElementById(HOVER_STYLE_ID);
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = HOVER_STYLE_ID;
      if (doc.head) {
        doc.head.appendChild(styleEl);
      } else if (doc.documentElement) {
        doc.documentElement.appendChild(styleEl);
      }
    }

    // CSSOM ignores comments and normalizes selectors. A regexp treated the
    // leading FOUX comment as part of the first selector, retaining stale rules.
    const ruleMap = new Map();
    for (const rule of styleEl.sheet?.cssRules || []) {
      if (rule.selectorText && rule.style) {
        ruleMap.set(rule.selectorText, rule.style.cssText);
      }
    }

    const hoverSelector = selector.includes(':hover') ? selector.trim() : `${selector.trim()}:hover`;

    // Migrate legacy ID/data selectors to the current target class. Otherwise
    // an old transform could still win after the new class rule is removed.
    if (element) {
      const escape = doc.defaultView.CSS.escape;
      const id = element.getAttribute('data-foux-id');
      const aliases = [
        element.id ? `#${escape(element.id)}:hover` : null,
        id ? `[data-foux-id="${escape(id)}"]:hover` : null,
        ...Array.from(element.classList).filter((name) => name.startsWith(HOVER_CLASS_PREFIX)).map((name) => `.${escape(name)}:hover`),
      ].filter(Boolean);
      for (const alias of aliases) ruleMap.delete(alias);
    }

    if (cssText && cssText.trim()) {
      ruleMap.set(hoverSelector, cssText.trim());
    } else {
      ruleMap.delete(hoverSelector);
    }

    // Reconstruir regras em texto puro serializável
    const lines = [];
    ruleMap.forEach((decls, sel) => {
      const declarations = doc.createElement('span').style;
      declarations.cssText = decls;
      const formatted = Array.from(declarations, (property) => {
        const priority = declarations.getPropertyPriority(property) ? ' !important' : '';
        return `${property}: ${declarations.getPropertyValue(property)}${priority}`;
      }).join(';\n  ');
      lines.push(`${sel} {\n  ${formatted};\n}`);
    });

    styleEl.textContent = lines.length > 0 ? `\n/* FOUX User Hover Rules */\n${lines.join('\n\n')}\n` : '';
  }, [iframeRef]);

  /** Obtém regras de hover ativas para um elemento a partir de <style id="foux-user-hover-rules"> */
  const getHoverRules = useCallback((element) => {
    if (!element) return null;
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return null;
    const doc = iframe.contentDocument;

    const styleEl = doc.getElementById(HOVER_STYLE_ID);
    if (!styleEl || !styleEl.textContent) return null;

    const cls = Array.from(element.classList).find((c) => c.startsWith(HOVER_CLASS_PREFIX));
    const fouxId = element.getAttribute('data-foux-id');
    const escape = doc.defaultView.CSS.escape;

    const possibleSelectors = [
      cls ? `.${escape(cls)}:hover` : null,
      fouxId ? `[data-foux-id="${escape(fouxId)}"]:hover` : null,
      element.id ? `#${escape(element.id)}:hover` : null,
    ].filter(Boolean);

    const declarations = doc.createElement('span').style;
    for (const rule of styleEl.sheet?.cssRules || []) {
      if (!possibleSelectors.includes(rule.selectorText) || !rule.style) continue;
      for (const property of rule.style) {
        declarations.setProperty(property, rule.style.getPropertyValue(property), rule.style.getPropertyPriority(property));
      }
    }
    return declarations.cssText || null;
  }, [iframeRef]);

  /* ------ Função de setup dos listeners (extraída para reuso) ------ */
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
      if (!target || target === doc.documentElement) return;
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
      if (!target) return;

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

    function onAnchorClick(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    doc.addEventListener('mouseover', onMouseOver, true);
    doc.addEventListener('mouseout', onMouseOut, true);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('submit', onSubmit, true);

    const anchors = doc.querySelectorAll('a');
    anchors.forEach((a) => {
      a.addEventListener('click', onAnchorClick, true);
    });

    cleanupRef.current = () => {
      doc.removeEventListener('mouseover', onMouseOver, true);
      doc.removeEventListener('mouseout', onMouseOut, true);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('submit', onSubmit, true);
      anchors.forEach((a) => {
        a.removeEventListener('click', onAnchorClick, true);
      });
      clearHover();
      clearSelectionOutline();
    };
  }, [iframeRef, clearHover, clearSelectionOutline]);

  /* ------ Configurar listeners no contentDocument ------ */
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
