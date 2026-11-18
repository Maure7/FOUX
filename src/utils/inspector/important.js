import { isFouxStyleNode } from './constants.js';

// Uma regra autoral com !important vence o estilo inline comum: sem isto a
// edição some em HTML com frameworks (ex.: utilitários do Bootstrap).
// O índice vale por documento; desfazer, importar ou trocar o idioma recriam o iframe.
const indexes = new WeakMap();
const longhandCache = new Map();

function longhands(doc, property) {
  if (!longhandCache.has(property)) {
    const probe = doc.createElement('div').style;
    probe.setProperty(property, 'initial');
    longhandCache.set(property, probe.length ? [...probe] : [property]);
  }
  return longhandCache.get(property);
}

function collect(doc) {
  const win = doc.defaultView;
  const index = new Map();
  const visit = (rules, media) => {
    for (const rule of rules) {
      const scoped = rule.media?.mediaText ? [...media, win.matchMedia(rule.media.mediaText)] : media;
      if (rule.styleSheet) {
        try { visit(rule.styleSheet.cssRules, scoped); } catch { /* @import de outra origem não é legível */ }
        continue;
      }
      if (rule.selectorText !== undefined) {
        for (const property of rule.style || []) {
          if (rule.style.getPropertyPriority(property) !== 'important') continue;
          if (!index.has(property)) index.set(property, []);
          index.get(property).push({ selector: rule.selectorText, media });
        }
        continue;
      }
      if (rule.type === win.CSSRule.SUPPORTS_RULE && !win.CSS.supports(rule.conditionText)) continue;
      if (rule.cssRules) visit(rule.cssRules, scoped);
    }
  };
  for (const sheet of doc.styleSheets) {
    if (sheet.disabled || isFouxStyleNode(sheet.ownerNode)) continue;
    try { visit(sheet.cssRules, sheet.media?.mediaText ? [win.matchMedia(sheet.media.mediaText)] : []); }
    catch { /* folha de outra origem: não dá para saber, segue sem !important */ }
  }
  return index;
}

/** 'important' quando uma regra autoral ativa com !important alcança o elemento na propriedade. */
export function importantPriority(element, property) {
  const doc = element?.ownerDocument;
  if (!doc?.defaultView) return '';
  let index = indexes.get(doc);
  if (!index) indexes.set(doc, (index = collect(doc)));
  return longhands(doc, property).some((name) => index.get(name)?.some(({ selector, media }) => {
    if (!media.every((query) => query.matches)) return false;
    try { return element.matches(selector); } catch { return false; }
  })) ? 'important' : '';
}
