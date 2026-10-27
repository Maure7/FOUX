import { INSPECTOR_STYLE_ID, HOVER_STYLE_ID, ORIGINAL_STYLE_ATTR } from './inspector/constants';
import { SCROLLBAR_STYLE_ID } from './inspector/constants';
import { splitOutsideValues, resolveUrls, copyStyle, formatRule } from './css/format';

export function getElementSelector(element) {
  const doc = element.ownerDocument;
  const escape = (doc.defaultView || window).CSS.escape;
  const isUnique = (selector) => {
    const matches = doc.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  };
  if (element.id && isUnique(`#${escape(element.id)}`)) return `#${escape(element.id)}`;
  const tag = escape(element.localName);
  const classes = [...element.classList].filter((name) => !name.startsWith('foux-'));
  for (const name of classes) {
    if (isUnique(`.${escape(name)}`)) return `.${escape(name)}`;
  }
  for (const name of classes) {
    if (isUnique(`${tag}.${escape(name)}`)) return `${tag}.${escape(name)}`;
  }
  if (isUnique(tag)) return tag;
  // Only repeated, unnamed elements need a position or a parent selector.
  if (!element.parentElement) return tag;
  const siblings = [...element.parentElement.children].filter((node) => node.localName === element.localName);
  const local = `${tag}${siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(element) + 1})` : ''}`;
  if (isUnique(local)) return local;
  return `${getElementSelector(element.parentElement)} > ${local}`;
}

function allStyleRules(rules) {
  return rules.flatMap((rule) => [
    ...(rule.selector ? [rule] : []),
    ...allStyleRules(rule.children || []),
  ]);
}

async function readRules(doc, sheet, baseUrl, visited = new Set(), active = true) {
  let cssRules;
  try { cssRules = [...sheet.cssRules]; }
  catch {
    // Some public stylesheets allow CORS fetches even when CSSOM access is denied.
    let parser;
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Unable to read stylesheet');
      parser = doc.createElement('style');
      parser.media = 'not all';
      parser.textContent = resolveUrls(await response.text(), baseUrl)
        .replace(/@import\s+(?:"([^"]*)"|'([^']*)')|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\//gi,
          (match, doubleQuoted, singleQuoted) => doubleQuoted === undefined && singleQuoted === undefined
            ? match : `@import ${JSON.stringify(new URL(doubleQuoted ?? singleQuoted, baseUrl).href)}`);
      doc.head.appendChild(parser);
      return await readRules(doc, parser.sheet, baseUrl, visited, active);
    } catch {
      return [{ externalImport: true, statement: `@import url(${JSON.stringify(baseUrl)});` }];
    } finally { parser?.remove(); }
  }
  const result = [];
  for (const rule of cssRules) {
    let ruleActive = active;
    if (rule.media?.mediaText) ruleActive &&= doc.defaultView.matchMedia(rule.media.mediaText).matches;
    if (rule.type === doc.defaultView.CSSRule.SUPPORTS_RULE) ruleActive &&= doc.defaultView.CSS.supports(rule.conditionText);
    if (rule.type === doc.defaultView.CSSRule.IMPORT_RULE) {
      if (visited.has(rule.href)) continue;
      const nextVisited = new Set([...visited, rule.href]);
      if (rule.supportsText) ruleActive &&= doc.defaultView.CSS.supports(`(${rule.supportsText})`);
      let imported = rule.styleSheet ? await readRules(doc, rule.styleSheet, rule.href, nextVisited, ruleActive) : [{ statement: rule.cssText }];
      if (imported.length === 1 && (imported[0].externalImport || !rule.styleSheet)) {
        result.push({ externalImport: true, statement: rule.cssText });
        continue;
      }
      if (rule.media.mediaText) imported = [{ header: `@media ${rule.media.mediaText}`, children: imported }];
      if (rule.supportsText) imported = [{ header: `@supports (${rule.supportsText})`, children: imported }];
      if (rule.layerName !== null && rule.layerName !== undefined) {
        imported = [{ header: `@layer${rule.layerName ? ` ${rule.layerName}` : ''}`, children: imported }];
      }
      result.push(...imported);
      continue;
    }
    const entry = { active: ruleActive };
    if (rule.selectorText) entry.selector = rule.selectorText;
    else entry.header = rule.keyText || rule.cssText.slice(0, rule.cssText.indexOf('{')).trim();
    if (rule.style) entry.style = copyStyle(doc, rule.style, baseUrl);
    if (rule.cssRules?.length) entry.children = await readRules(doc, rule, baseUrl, visited, ruleActive);
    if (!entry.style && !entry.children) entry.statement = rule.cssText;
    if (entry.style?.length || entry.children?.length || entry.statement) result.push(entry);
  }
  return result;
}

function matches(element, selector, includeHover = false) {
  try { return element.matches(includeHover ? selector.replace(/:hover\b/g, '') : selector); }
  catch { return false; }
}

// A conservative comparison keeps !important only for actual cascade conflicts.
function specificity(selector) {
  const withoutStrings = selector.replace(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/g, '');
  return [
    (withoutStrings.match(/#[\w-]/g) || []).length,
    (withoutStrings.match(/\.[\w-]|\[|:(?!:)[\w-]/g) || []).length,
    (withoutStrings.match(/(^|[\s>+~])([a-z][\w-]*)/gi) || []).length,
  ];
}

function isMoreSpecific(left, right) {
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return false;
}

async function embedBlobUrls(css) {
  for (const url of new Set(css.match(/blob:[^\s"'()]+/g) || [])) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Unable to export a local asset');
    const blob = await response.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    css = css.replaceAll(url, dataUrl);
  }
  return css;
}

export async function generateProjectCss(doc) {
  const rules = [];
  const hoverRules = [];
  for (const node of doc.querySelectorAll('style, link[rel~="stylesheet"]')) {
    if (node.id === INSPECTOR_STYLE_ID || node.id === SCROLLBAR_STYLE_ID || node.disabled || node.sheet?.disabled) continue;
    if (!node.sheet) {
      if (node.localName === 'link') rules.push({ externalImport: true, statement: `@import url(${JSON.stringify(node.href)})${node.media ? ` ${node.media}` : ''};` });
      continue;
    }
    const active = !node.media || doc.defaultView.matchMedia(node.media).matches;
    const parsed = await readRules(doc, node.sheet, node.localName === 'link' ? node.href : null, new Set(), active);
    const wrapped = node.media && node.media !== 'all' ? [
      ...parsed.filter((rule) => rule.externalImport).map((rule) => ({ ...rule, statement: rule.statement.replace(/;$/, ` ${node.media};`) })),
      ...(parsed.some((rule) => !rule.externalImport)
        ? [{ header: `@media ${node.media}`, children: parsed.filter((rule) => !rule.externalImport) }] : []),
    ] : parsed;
    (node.id === HOVER_STYLE_ID ? hoverRules : rules).push(...wrapped);
  }
  const sourceRules = allStyleRules(rules);
  const edits = [];
  for (const element of doc.querySelectorAll('[style]')) {
    let selector = getElementSelector(element);
    const original = doc.createElement('div').style;
    const hasOriginal = element.hasAttribute(ORIGINAL_STYLE_ATTR);
    original.cssText = element.getAttribute(ORIGINAL_STYLE_ATTR) || '';
    const style = copyStyle(doc, element.style);
    const matchingRules = sourceRules.filter((rule) => matches(element, rule.selector, true));
    // Reuse a more specific authored selector only if needed to beat !important.
    for (const rule of matchingRules) {
      for (const candidate of splitOutsideValues(rule.selector, ',')) {
        if (candidate.includes(':') || !matches(element, candidate)) continue;
        const affectsImportant = [...style].some((property) => style.getPropertyPriority(property) && rule.style.getPropertyPriority(property));
        if (affectsImportant && doc.querySelectorAll(candidate).length === 1 && isMoreSpecific(specificity(candidate), specificity(selector))) selector = candidate;
      }
    }
    for (const property of [...style]) {
      const conflicts = matchingRules.filter((rule) => rule.style.getPropertyValue(property));
      const authoredImportant = conflicts.some((rule) => rule.active && rule.style.getPropertyPriority(property) === 'important' && matches(element, rule.selector));
      if (!style.getPropertyPriority(property) && authoredImportant) {
        style.removeProperty(property);
        continue;
      }
      const inlineConflict = original.getPropertyValue(property) && original.getPropertyValue(property) !== style.getPropertyValue(property);
      const selectorConflict = conflicts.some((rule) => splitOutsideValues(rule.selector, ',').some((candidate) =>
        matches(element, candidate, true) && (candidate.includes(':') || isMoreSpecific(specificity(candidate), specificity(selector)))));
      const important = !hasOriginal || inlineConflict || authoredImportant || selectorConflict || original.getPropertyPriority(property);
      style.setProperty(property, style.getPropertyValue(property), important ? 'important' : '');
    }
    if (!style.length) continue;
    const existingIndex = rules.findLastIndex((rule) => {
      if (rule.selector === selector) return true;
      if (!rule.selector) return false;
      const selectors = splitOutsideValues(rule.selector, ',');
      return selectors.includes(selector) && selectors.every((candidate) => {
        const targets = doc.querySelectorAll(candidate);
        return targets.length === 1 && targets[0] === element;
      });
    });
    const existing = rules[existingIndex];
    const laterRules = allStyleRules(rules.slice(existingIndex + 1));
    const canMerge = existing && !existing.children && !laterRules.some((rule) =>
      matches(element, rule.selector, true) && [...style].some((property) => rule.style.getPropertyValue(property)));
    if (canMerge) {
      for (const property of style) existing.style.setProperty(property, style.getPropertyValue(property), style.getPropertyPriority(property));
    } else edits.push({ selector, style });
  }
  for (const rule of allStyleRules(hoverRules)) {
    for (const element of doc.querySelectorAll('[class]')) {
      for (const name of element.classList) {
        if (!name.startsWith('foux-hover-target-') || !rule.selector.includes(`.${name}:hover`)) continue;
        const selector = getElementSelector(element);
        rule.selector = rule.selector.replaceAll(`.${name}:hover`, `${selector}:hover`);
        for (const property of rule.style) {
          const conflict = [...allStyleRules(rules), ...edits].some((base) =>
            matches(element, base.selector, true) && base.style.getPropertyValue(property) &&
            (base.style.getPropertyPriority(property) || splitOutsideValues(base.selector, ',').some((candidate) =>
              matches(element, candidate, true) && isMoreSpecific(specificity(candidate), specificity(`${selector}:hover`)))));
          rule.style.setProperty(property, rule.style.getPropertyValue(property), conflict ? 'important' : '');
        }
      }
    }
  }
  const ordered = [...rules.filter((rule) => rule.externalImport), ...rules.filter((rule) => !rule.externalImport), ...edits, ...hoverRules];
  const formatted = ordered.map((rule) => formatRule(rule)).join('\n\n');
  return `${await embedBlobUrls(formatted)}\n`;
}

export function getCssFileName(projectName) {
  const name = [...String(projectName ?? '').trim()]
    .map((character) => character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? '_' : character)
    .join('').replace(/[. ]+$/, '');
  const safe = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ? `_${name}` : name;
  return `${safe || 'Projeto'}.css`;
}

export function downloadCss(css, fileName) {
  const url = URL.createObjectURL(new Blob([css], { type: 'text/css;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
