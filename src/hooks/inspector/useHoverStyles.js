import { useCallback } from 'react';
import { HOVER_STYLE_ID, HOVER_CLASS_PREFIX } from '../../utils/inspector/constants';

const findHoverClass = (element) => Array.from(element.classList).find((name) => name.startsWith(HOVER_CLASS_PREFIX));

// :hover cannot be written inline, so each edited element gets a private class
// and its rules live in one <style> that is saved with the document.
export default function useHoverStyles(iframeRef, selectedRef) {
  const assignHoverClass = useCallback((element) => {
    if (!element) return null;
    if (!element.getAttribute('data-foux-id')) {
      element.setAttribute('data-foux-id', element.id || `foux_${Math.random().toString(36).slice(2, 8)}`);
    }
    let targetClass = findHoverClass(element);
    if (!targetClass) {
      targetClass = `${HOVER_CLASS_PREFIX}${Math.random().toString(36).slice(2, 10)}`;
      element.classList.add(targetClass);
    }
    return targetClass;
  }, []);

  // Returns false when nothing was written, e.g. for an element of a document
  // that undo/redo has already replaced.
  const injectHoverStyles = useCallback((selector, cssText, element = selectedRef.current) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || (element && element.ownerDocument !== doc)) return false;

    let styleEl = doc.getElementById(HOVER_STYLE_ID);
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = HOVER_STYLE_ID;
      (doc.head || doc.documentElement)?.appendChild(styleEl);
    }

    // CSSOM ignores comments and normalizes selectors. A regexp treated the
    // leading FOUX comment as part of the first selector, retaining stale rules.
    const ruleMap = new Map();
    for (const rule of styleEl.sheet?.cssRules || []) {
      if (rule.selectorText && rule.style) ruleMap.set(rule.selectorText, rule.style.cssText);
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

    if (cssText?.trim()) ruleMap.set(hoverSelector, cssText.trim());
    else ruleMap.delete(hoverSelector);

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
    return true;
  }, [iframeRef, selectedRef]);

  // Merges every rule that targets the element, including selectors from older versions.
  const getHoverRules = useCallback((element) => {
    const doc = iframeRef.current?.contentDocument;
    const styleEl = doc?.getElementById(HOVER_STYLE_ID);
    if (!element || !styleEl?.textContent) return null;

    const cls = findHoverClass(element);
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

  // An empty rule for the element's class also drops its legacy aliases.
  const clearHoverRules = useCallback((element) => {
    if (!getHoverRules(element)) return false;
    return injectHoverStyles(`.${findHoverClass(element) || assignHoverClass(element)}`, '', element);
  }, [getHoverRules, injectHoverStyles, assignHoverClass]);

  return { assignHoverClass, injectHoverStyles, getHoverRules, clearHoverRules };
}
