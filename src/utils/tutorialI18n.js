import { TUTORIAL_HTML, TUTORIAL_PROJECT_NAME } from './tutorialTemplate';
import { TUTORIAL_HTML_ES } from './tutorialTemplate_es';

export function isTutorialProject(project) {
  return project.template === 'tutorial' || project.name === TUTORIAL_PROJECT_NAME;
}

export function getTutorialHtml(language) {
  return language === 'es' ? TUTORIAL_HTML_ES : TUTORIAL_HTML;
}

const normalizeText = (text) => text.replace(/\s+/g, ' ').trim();

// Translate only authored tutorial text and identifiers. Keep styles, imported
// fonts, hover rules, inspection metadata and user edits in the saved document.
export function localizeTutorialHtml(html, language) {
  if (!html) return getTutorialHtml(language);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const targetLanguage = language === 'es' ? 'es' : 'pt';
  const sourceLanguage = doc.documentElement.lang.startsWith('es') ? 'es' : 'pt';
  if (sourceLanguage === targetLanguage) return html;

  const source = parser.parseFromString(getTutorialHtml(sourceLanguage), 'text/html');
  const target = parser.parseFromString(getTutorialHtml(targetLanguage), 'text/html');
  const ids = new Map();
  const texts = new Map();
  const sourceElements = [...source.querySelectorAll('*')];
  const targetElements = [...target.querySelectorAll('*')];
  sourceElements.forEach((element, index) => {
    const translated = targetElements[index];
    if (element.id && translated.id && element.id !== translated.id) ids.set(element.id, translated.id);
    if (element.closest('head')) return;
    [...element.childNodes].forEach((node, childIndex) => {
      if (node.nodeType !== 3 || !normalizeText(node.textContent)) return;
      texts.set(normalizeText(node.textContent), translated.childNodes[childIndex].textContent);
    });
    for (const attribute of ['alt', 'title', 'aria-label']) {
      if (element.hasAttribute(attribute)) {
        texts.set(element.getAttribute(attribute), translated.getAttribute(attribute));
      }
    }
  });

  const walker = doc.createTreeWalker(doc.body, 4 /* SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement.closest('style, script')) continue;
    const translation = texts.get(normalizeText(node.textContent));
    if (translation !== undefined) node.textContent = translation;
  }
  doc.querySelectorAll('*').forEach((element) => {
    for (const attribute of ['id', 'fx-id', 'data-fx-id', 'data-foux-id']) {
      const translated = ids.get(element.getAttribute(attribute));
      if (translated) element.setAttribute(attribute, translated);
    }
    for (const attribute of ['alt', 'title', 'aria-label']) {
      const translation = texts.get(element.getAttribute(attribute));
      if (translation !== undefined) element.setAttribute(attribute, translation);
    }
  });
  // IDs in authored selectors, legacy hover selectors and CSS url(#id) must
  // follow the same mapping. Classes remain stable in both templates.
  const replaceIds = (css) => {
    for (const [from, to] of ids) {
      css = css.replace(new RegExp(`(?<=[#"'=])${from}(?![\\w-])`, 'g'), to);
    }
    return css;
  };
  doc.querySelectorAll('style').forEach((style) => { style.textContent = replaceIds(style.textContent); });
  doc.documentElement.lang = targetLanguage === 'es' ? 'es-419' : 'pt-BR';
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}
