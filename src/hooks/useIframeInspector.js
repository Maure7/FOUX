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
      if (el.id && !el.id.startsWith('foux-font-')) {
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

  /* ------ Configurar listeners no contentDocument ------ */
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function setup() {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) return;

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
    }

    function onLoad() {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      selectedRef.current = null;
      hoveredRef.current = null;
      setSelectedElement(null);
      setSelectedTagName(null);
      setComputedStyles(null);

      setup();
    }

    iframe.addEventListener('load', onLoad);

    if (iframe.contentDocument?.readyState === 'complete') {
      setup();
    }

    return () => {
      iframe.removeEventListener('load', onLoad);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [iframeRef, clearHover, clearSelectionOutline]);

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
  };
}
