import { useState, useCallback, useEffect, useRef } from 'react';

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

const HOVER_STYLE_ID = 'foux-dynamic-events';
const HOVER_CLASS_PREFIX = 'foux-hover-target-';

/**
 * Lê os estilos computados relevantes de um elemento DOM.
 * Inclui width/height para imagens e fontFamily para tipografia.
 */
function extractComputedStyles(element, iframeWindow) {
  if (!element || !iframeWindow) return null;
  const cs = iframeWindow.getComputedStyle(element);

  return {
    fontSize: parsePx(cs.fontSize),
    fontFamily: cs.fontFamily || '',
    textAlign: cs.textAlign || 'left',
    color: rgbToHex(cs.color),
    backgroundColor: rgbToHex(cs.backgroundColor),
    borderRadius: parsePx(cs.borderRadius),
    borderWidth: parsePx(cs.borderWidth),
    borderColor: rgbToHex(cs.borderColor),
    padding: parsePx(cs.padding),
    margin: parsePx(cs.margin),
    width: parsePx(cs.width),
    height: parsePx(cs.height),
    /* Raw color strings for alpha extraction */
    _rawColor: cs.color || '',
    _rawBg: cs.backgroundColor || '',
    _rawBorderColor: cs.borderColor || '',
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

  /* ------ Limpar destaque de hover ------ */
  const clearHover = useCallback(() => {
    const el = hoveredRef.current;
    if (el) {
      if (!el.hasAttribute(ATTR_SELECTED)) {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
      el.removeAttribute(ATTR_HOVERED);
      hoveredRef.current = null;
    }
  }, []);

  /* ------ Limpar destaque de seleção ------ */
  const clearSelectionOutline = useCallback(() => {
    const el = selectedRef.current;
    if (el) {
      el.style.outline = '';
      el.style.outlineOffset = '';
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
    el.style[cssProperty] = value;

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

    // Remover temporariamente atributos de inspeção
    const markedHover = doc.querySelectorAll(`[${ATTR_HOVERED}]`);
    const markedSelect = doc.querySelectorAll(`[${ATTR_SELECTED}]`);

    // Guardar outlines dos selecionados antes de limpar
    const savedOutlines = [];
    markedSelect.forEach((el) => {
      savedOutlines.push({
        el,
        outline: el.style.outline,
        outlineOffset: el.style.outlineOffset,
      });
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.removeAttribute(ATTR_SELECTED);
    });
    markedHover.forEach((el) => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.removeAttribute(ATTR_HOVERED);
    });

    // Serializar
    const html = doc.documentElement.outerHTML;

    // Restaurar atributos e outlines
    savedOutlines.forEach(({ el, outline, outlineOffset }) => {
      el.style.outline = outline;
      el.style.outlineOffset = outlineOffset;
      el.setAttribute(ATTR_SELECTED, '');
    });

    return `<!DOCTYPE html>\n${html}`;
  }, [iframeRef]);

  /* ------ Injetar @font-face no iframe ------ */
  const injectFont = useCallback((fontName, blobUrl) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    const doc = iframe.contentDocument;

    // Verificar se já existe
    const existingId = `foux-font-${fontName.replace(/\s+/g, '-')}`;
    if (doc.getElementById(existingId)) return;

    const style = doc.createElement('style');
    style.id = existingId;
    style.textContent = `
      @font-face {
        font-family: '${fontName}';
        src: url('${blobUrl}') format('woff2'), url('${blobUrl}') format('woff'), url('${blobUrl}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    `;
    doc.head.appendChild(style);
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
      if (el.id && !el.id.startsWith('foux-font-') && el.id !== HOVER_STYLE_ID) {
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
    element.style.outline = SELECT_OUTLINE;
    element.style.outlineOffset = SELECT_OFFSET;
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
     HOVER STYLES — Aba Eventos (Injeção Dinâmica)
     ============================================================ */

  /** Atribui uma classe hover única ao elemento, se ainda não tiver */
  const assignHoverClass = useCallback((element) => {
    if (!element) return null;
    // Verifica se já tem uma classe foux-hover-target
    const existing = Array.from(element.classList).find((c) => c.startsWith(HOVER_CLASS_PREFIX));
    if (existing) return existing;
    // Gerar classe única
    const cls = `${HOVER_CLASS_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    element.classList.add(cls);
    return cls;
  }, []);

  /** Obtém a classe hover existente de um elemento */
  const getHoverClass = useCallback((element) => {
    if (!element) return null;
    return Array.from(element.classList).find((c) => c.startsWith(HOVER_CLASS_PREFIX)) || null;
  }, []);

  /** Injeta/atualiza regras de :hover no <style> dinâmico dentro do iframe */
  const injectHoverStyles = useCallback((selector, cssText) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    const doc = iframe.contentDocument;

    let styleEl = doc.getElementById(HOVER_STYLE_ID);
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = HOVER_STYLE_ID;
      doc.head.appendChild(styleEl);
    }

    // Parsear regras existentes e atualizar/adicionar para o seletor
    const sheet = styleEl.sheet;
    if (!sheet) {
      // Fallback: sobrescrever textContent
      styleEl.textContent = `${selector}:hover { ${cssText} }`;
      return;
    }

    // Procurar regra existente para este seletor
    const hoverSelector = `${selector}:hover`;
    let found = false;
    for (let i = 0; i < sheet.cssRules.length; i++) {
      if (sheet.cssRules[i].selectorText === hoverSelector) {
        sheet.deleteRule(i);
        sheet.insertRule(`${hoverSelector} { ${cssText} }`, i);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.insertRule(`${hoverSelector} { ${cssText} }`, sheet.cssRules.length);
    }
  }, [iframeRef]);

  /* ------ Função de setup dos listeners (extraída para reuso) ------ */
  const setupListeners = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return;

    // Limpar listeners anteriores se existirem
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Reset state
    selectedRef.current = null;
    hoveredRef.current = null;
    setSelectedElement(null);
    setSelectedTagName(null);
    setComputedStyles(null);

    function onMouseOver(e) {
      const target = e.target;
      if (!target || target === doc.documentElement) return;
      clearHover();
      if (target === selectedRef.current) return;
      target.style.outline = HOVER_OUTLINE;
      target.style.outlineOffset = HOVER_OFFSET;
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

      const target = e.target;
      if (!target) return;

      clearHover();
      clearSelectionOutline();

      const element = target;
      element.style.outline = SELECT_OUTLINE;
      element.style.outlineOffset = SELECT_OFFSET;
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
  };
}
