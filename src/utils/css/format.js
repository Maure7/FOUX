// CSS values can contain semicolons and commas in strings, functions and URLs.
export function splitOutsideValues(text, separator) {
  const parts = [];
  let start = 0;
  let quote = '';
  let depth = 0;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '\\') { index++; continue; }
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") quote = character;
    else if (character === '(' || character === '[' || character === '{') depth++;
    else if (character === ')' || character === ']' || character === '}') depth--;
    else if (!depth && character === separator) {
      parts.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

function readableValue(value) {
  // Preserve strings and URLs verbatim; turn opaque browser RGB colors into hex.
  return value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\([^)]*\)|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(1(?:\.0*)?))?\s*\)|(?<![\w.-])0(?:px|em|rem|vh|vw|vmin|vmax|cm|mm|in|pt|pc)\b/gi,
    (match, red, green, blue) => {
      if (red !== undefined) return `#${[red, green, blue].map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`;
      return /^0[a-z]+$/i.test(match) ? '0' : match;
    });
}

export function resolveUrls(css, baseUrl) {
  if (!baseUrl) return css;
  return css.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gi,
    (match, doubleQuoted, singleQuoted, unquoted) => {
      if (doubleQuoted === undefined && singleQuoted === undefined && unquoted === undefined) return match;
      const url = doubleQuoted ?? singleQuoted ?? unquoted.trim();
      if (!url || url.startsWith('#') || /^(data:|blob:)/i.test(url)) return match;
      try { return `url(${JSON.stringify(new URL(url, baseUrl).href)})`; }
      catch { return match; }
    });
}

export function copyStyle(doc, style, baseUrl) {
  if (style.parentRule && !style.parentRule.selectorText && !style.parentRule.keyText) {
    // Descriptors such as @font-face's src are not valid inline properties.
    return { cssText: resolveUrls(style.cssText, baseUrl), length: style.length };
  }
  const copy = doc.createElement('div').style;
  copy.cssText = resolveUrls(style.cssText, baseUrl);
  return copy;
}

function declarations(style, indent) {
  // cssText retains standard shorthands such as margin, padding and border.
  return splitOutsideValues(style.cssText, ';').map((declaration) => {
    const colon = declaration.indexOf(':');
    const property = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    return `${indent}${property}: ${property.startsWith('--') ? value : readableValue(value)};`;
  }).join('\n');
}

export function formatRule(rule, depth = 0) {
  const indent = '  '.repeat(depth);
  if (rule.statement) return `${indent}${rule.statement}`;
  const header = rule.selector ? splitOutsideValues(rule.selector, ',').join(`,\n${indent}`) : rule.header;
  const content = [
    rule.style ? declarations(rule.style, `${indent}  `) : '',
    ...(rule.children || []).map((child) => formatRule(child, depth + 1)),
  ].filter(Boolean).join(rule.children ? '\n\n' : '\n');
  return `${indent}${header} {\n${content}\n${indent}}`;
}

