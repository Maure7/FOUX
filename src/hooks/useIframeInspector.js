import { useState, useCallback, useEffect, useRef } from 'react';
import useHoverStyles from './inspector/useHoverStyles';
import { getGradientBorder, setGradientBorder, updateGradientBorderBackground } from '../utils/gradientBorder';
import { extractComputedStyles, rememberOriginalStyle, transitionsSettled } from '../utils/inspector/styles';
import { revealBorderStyle, revealBorderWidth } from '../utils/inspector/borders';
import { importantPriority } from '../utils/inspector/important';
import { extractAlpha } from '../utils/css/color.js';
import {
  HOVER_OUTLINE, HOVER_OFFSET, SELECT_OUTLINE, SELECT_OFFSET, ATTR_HOVERED, ATTR_SELECTED,
  INSPECTOR_STYLE_ID, HOVER_STYLE_ID, SCROLLBAR_STYLE_ID, ORIGINAL_STYLE_ATTR, FONT_STYLE_PREFIX, EXPORT_PARSER_ATTR,
  DARK_READER_LOCK_ATTR,
} from '../utils/inspector/constants';

const INTERNAL_IDS = new Set([HOVER_STYLE_ID, INSPECTOR_STYLE_ID, SCROLLBAR_STYLE_ID]);
// Folhas importadas podem declarar bordas com !important.
const IMPORTANT_BORDER_PROPERTIES = { borderWidth: 'border-width', borderStyle: 'border-style', borderColor: 'border-color' };
const toKebab = (property) => property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

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
    if (value) revealBorderWidth(element);
    return;
  }
  // Com borda em gradiente, o fundo vive nas camadas pintadas.
  if (updateGradientBorderBackground(element, cssProperty, value)) return;
  if (cssProperty === 'borderRadius') {
    // Sem overflow forçado: cortaria menus e sombras dos filhos, travaria a
    // rolagem em body/html e apareceria no CSS exportado sem o aluno pedir.
    element.style.setProperty('border-radius', typeof value === 'number' ? `${value}px` : String(value), 'important');
    return;
  }
  const borderProperty = IMPORTANT_BORDER_PROPERTIES[cssProperty];
  if (borderProperty) {
    element.style.setProperty(borderProperty, String(value), 'important');
    // Lê o elemento, não o estado do React, que pode estar um frame atrás.
    if (cssProperty === 'borderWidth' && parseFloat(value) > 0) revealBorderStyle(element);
    if (cssProperty === 'borderColor' && extractAlpha(String(value)) > 0) {
      revealBorderStyle(element);
      revealBorderWidth(element);
    }
    return;
  }
  const property = toKebab(cssProperty);
  element.style.setProperty(property, value, importantPriority(element, property));
  if (cssProperty === 'backgroundImage' && value?.startsWith('linear-gradient(')) {
    element.style.setProperty('background-clip', 'padding-box', 'important');
    element.style.setProperty('background-repeat', 'no-repeat', 'important');
    element.style.setProperty('background-size', 'auto', 'important');
  }
}

const elementsWithId = (doc, id) => [...doc.querySelectorAll('[id]')].filter((element) => element.id === id);

export default function useIframeInspector(iframeRef) {
  const [selectedElement, setSelectedElement] = useState(null);
  const [computedStyles, setComputedStyles] = useState(null);

  // Os listeners dentro do iframe leem refs, nunca o estado da renderização.
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

  // A escrita chega ao iframe na hora; reler os estilos computados (recalc +
  // layout) e renderizar a sidebar acontecem no máximo uma vez por frame.
  const scheduleRefresh = useCallback(() => {
    const run = () => {
      if (refreshFrame.current) return;
      refreshFrame.current = requestAnimationFrame(() => {
        refreshFrame.current = 0;
        const element = selectedRef.current;
        const win = iframeRef.current?.contentWindow;
        if (!element?.isConnected || element.ownerDocument !== win?.document) return;
        setComputedStyles(extractComputedStyles(element, win));
        // Lê de novo quando as transições autorais chegam ao valor recém-escrito.
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
    // O about:blank da desmontagem nunca pode sobrescrever um projeto salvo.
    if (!doc?.body || (!doc.body.innerHTML.trim() && doc.body.children.length === 0)) return null;

    const clone = doc.documentElement.cloneNode(true);
    clone.querySelector(`#${INSPECTOR_STYLE_ID}`)?.remove();
    clone.querySelector(`#${SCROLLBAR_STYLE_ID}`)?.remove();
    clone.querySelectorAll(`[${EXPORT_PARSER_ATTR}], [${DARK_READER_LOCK_ATTR}]`).forEach((node) => node.remove());
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

  // As fontes ficam embutidas no documento, então a lista sobrevive a reabrir o projeto.
  const getImportedFonts = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return [];
    return [...doc.querySelectorAll(`style[id^="${FONT_STYLE_PREFIX}"]`)]
      .map((style) => style.textContent.match(/font-family:\s*'([^']+)'/)?.[1])
      .filter(Boolean)
      .map((name) => ({ label: name, value: `'${name}'` }));
  }, [iframeRef]);

  // HTML inválido pode repetir um ID; `occurrence` diz qual das repetições é o item.
  const getElementsWithId = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return [];
    const seen = new Map();
    return [...doc.querySelectorAll('[id]')]
      .filter((element) => element.id && !element.id.startsWith(FONT_STYLE_PREFIX) && !INTERNAL_IDS.has(element.id))
      .map((element) => {
        const occurrence = seen.get(element.id) ?? 0;
        seen.set(element.id, occurrence + 1);
        return { id: element.id, tagName: element.tagName, occurrence };
      });
  }, [iframeRef]);

  const selectElementById = useCallback((elementId, occurrence = 0) => {
    const doc = iframeRef.current?.contentDocument;
    const element = doc && (occurrence ? elementsWithId(doc, elementId)[occurrence] : doc.getElementById(elementId));
    if (!element) return;
    select(element);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [iframeRef, select]);

  const { assignHoverClass, injectHoverStyles, getHoverRules, clearHoverRules } = useHoverStyles(iframeRef, selectedRef);

  // Devolve o elemento ao estilo inline da primeira abertura do documento
  // (o mesmo retrato que a exportação de CSS usa como base).
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
    // Relê agora, na mesma renderização em que o chamador incrementa a revisão,
    // para os toggles de gradiente se sincronizarem com o estilo restaurado.
    if (changed) {
      cancelRefresh();
      setComputedStyles(extractComputedStyles(element, iframeRef.current?.contentWindow));
    }
    return changed;
  }, [iframeRef, clearHoverRules, cancelRefresh]);

  // Todos os elementos voltam ao estilo inline da primeira abertura, sem regras
  // de hover nem fontes importadas: a versão de página inteira do restoreSelected.
  const restoreAll = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return false;
    let changed = false;
    doc.querySelectorAll('[data-foux-gradient-border]').forEach((element) => {
      if (!getGradientBorder(element)) return;
      setGradientBorder(element, null);
      changed = true;
    });
    doc.querySelectorAll(`[${ORIGINAL_STYLE_ATTR}]`).forEach((element) => {
      const original = element.getAttribute(ORIGINAL_STYLE_ATTR);
      if ((element.getAttribute('style') || '') === original) return;
      if (original) element.setAttribute('style', original);
      else element.removeAttribute('style');
      changed = true;
    });
    const hoverRules = doc.getElementById(HOVER_STYLE_ID);
    if (hoverRules?.textContent.trim()) {
      hoverRules.textContent = '';
      changed = true;
    }
    doc.querySelectorAll(`style[id^="${FONT_STYLE_PREFIX}"]`).forEach((style) => {
      style.remove();
      changed = true;
    });
    if (changed && selectedRef.current?.isConnected) {
      cancelRefresh();
      setComputedStyles(extractComputedStyles(selectedRef.current, iframeRef.current?.contentWindow));
    }
    return changed;
  }, [iframeRef, cancelRefresh]);

  // Roda a cada carga do iframe (arquivo inicial, importação, desfazer/refazer, troca de idioma).
  const setupListeners = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    if (!doc || !win) return;

    cleanupRef.current?.();
    cleanupRef.current = null;
    cancelRefresh();

    doc.querySelectorAll('[style]').forEach(rememberOriginalStyle);
    // Repinta as bordas em gradiente salvas com as regras atuais de recorte e repetição.
    doc.querySelectorAll('[data-foux-gradient-border]').forEach((element) => {
      const gradient = getGradientBorder(element);
      if (gradient) setGradientBorder(element, gradient);
    });

    // Uma folha separada impede que os contornos da inspeção substituam outlines autorais.
    let inspectorStyle = doc.getElementById(INSPECTOR_STYLE_ID);
    if (!inspectorStyle) {
      inspectorStyle = doc.createElement('style');
      inspectorStyle.id = INSPECTOR_STYLE_ID;
      (doc.head || doc.documentElement).appendChild(inspectorStyle);
    }
    inspectorStyle.textContent = INSPECTOR_CSS;
    // Sem `sheet` quando uma política do documento bloqueia <style>; o editor segue funcionando.
    if (inspectorStyle.sheet) inspectorStyle.sheet.disabled = previewModeRef.current;
    doc.querySelectorAll(`[${ATTR_HOVERED}], [${ATTR_SELECTED}]`).forEach((element) => {
      element.removeAttribute(ATTR_HOVERED);
      element.removeAttribute(ATTR_SELECTED);
    });

    selectedRef.current = null;
    hoveredRef.current = null;
    setSelectedElement(null);
    setComputedStyles(null);

    // A caixa única do tutorial precisa manter o recorte arredondado enquanto o
    // aluno testa bordas (os modelos PT e ES usam IDs diferentes).
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

    // Links, botões e formulários da página do aluno não podem navegar.
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
    restoreAll,
  };
}
