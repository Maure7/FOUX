import { useCallback } from 'react';
import { HOVER_STYLE_ID, HOVER_CLASS_PREFIX } from '../../utils/inspector/constants';

const findHoverClass = (element) => Array.from(element.classList).find((name) => name.startsWith(HOVER_CLASS_PREFIX));

// :hover não existe em estilo inline, então cada elemento editado ganha uma classe
// própria e as regras ficam num único <style> salvo junto com o documento.
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

  // Devolve false quando nada foi escrito, ex.: elemento de um documento que
  // desfazer/refazer já substituiu.
  const injectHoverStyles = useCallback((selector, cssText, element = selectedRef.current) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || (element && element.ownerDocument !== doc)) return false;

    let styleEl = doc.getElementById(HOVER_STYLE_ID);
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = HOVER_STYLE_ID;
      (doc.head || doc.documentElement)?.appendChild(styleEl);
    }

    // O CSSOM ignora comentários e normaliza seletores. Uma regexp tratava o
    // comentário do FOUX como parte do primeiro seletor e mantinha regras velhas.
    const ruleMap = new Map();
    for (const rule of styleEl.sheet?.cssRules || []) {
      if (rule.selectorText && rule.style) ruleMap.set(rule.selectorText, rule.style.cssText);
    }

    const hoverSelector = selector.includes(':hover') ? selector.trim() : `${selector.trim()}:hover`;

    // Migra seletores antigos (ID/data) para a classe atual; senão um transform
    // antigo ainda venceria depois de a regra da classe ser removida.
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

  // Junta todas as regras que miram o elemento, inclusive seletores de versões antigas.
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

  // Uma regra vazia para a classe do elemento também descarta os aliases antigos.
  const clearHoverRules = useCallback((element) => {
    if (!getHoverRules(element)) return false;
    return injectHoverStyles(`.${findHoverClass(element) || assignHoverClass(element)}`, '', element);
  }, [getHoverRules, injectHoverStyles, assignHoverClass]);

  return { assignHoverClass, injectHoverStyles, getHoverRules, clearHoverRules };
}
