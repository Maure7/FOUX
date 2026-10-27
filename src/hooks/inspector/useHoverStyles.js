import { useCallback } from 'react';
import { HOVER_STYLE_ID, HOVER_CLASS_PREFIX } from '../../utils/inspector/constants';

export default function useHoverStyles(iframeRef, selectedRef) {
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
  }, [iframeRef, selectedRef]);

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

  return { assignHoverClass, getHoverClass, injectHoverStyles, getHoverRules };
}
