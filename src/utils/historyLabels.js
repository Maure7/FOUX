import { cssColorToHex, extractAlpha } from './css/color.js';
import { parseLinearGradient } from './gradientBorder';

const MAX_TEXT = 26;
const clip = (text) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text);

export function describeElement(element) {
  if (!element?.tagName) return '';
  const tag = element.tagName.toLowerCase();
  if (element.id) return clip(`${tag}#${element.id}`);
  const name = [...element.classList].find((className) => !className.startsWith('foux-'));
  return clip(name ? `${tag}.${name}` : tag);
}

// Texto CSS curto e neutro em idioma para as dicas de desfazer/refazer.
export function formatCssValue(value) {
  if (value === null || value === undefined || value === '') return 'none';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') return Number.isFinite(value.angle) ? `linear-gradient(${value.angle}deg)` : 'none';
  const text = String(value).trim();
  const gradient = parseLinearGradient(text);
  if (gradient) return `linear-gradient(${gradient.angle}deg)`;
  if (/^rgba?\(/.test(text)) {
    const alpha = extractAlpha(text);
    const hex = cssColorToHex(text);
    return alpha < 1 ? `${hex} ${Math.round(alpha * 100)}%` : hex;
  }
  return clip(text.split(',')[0].replace(/['"]/g, '').trim());
}

const PX_PROPERTIES = new Set(['width', 'height', 'fontSize', 'borderRadius', 'borderWidth', 'padding', 'margin']);
const RAW_COLORS = { color: '_rawColor', backgroundColor: '_rawBg', borderColor: '_rawBorderColor' };
const SIDE_INDEX = { Top: 0, Right: 1, Bottom: 2, Left: 3 };

/** Valor que a propriedade tinha antes da edição, lido de extractComputedStyles(). */
export function currentCssValue(property, styles) {
  if (!styles) return undefined;
  const side = property.match(/^(padding|margin)(Top|Right|Bottom|Left)$/);
  if (side) return `${styles[`${side[1]}Sides`][SIDE_INDEX[side[2]]]}px`;
  if (PX_PROPERTIES.has(property)) return `${styles[property]}px`;
  if (RAW_COLORS[property]) return styles[RAW_COLORS[property]];
  if (property === 'backgroundImage') return styles.backgroundGradient ?? 'none';
  return styles[property];
}

/** Metadados do histórico: { labelKey, target, from?, to? }. */
export function changeMeta(labelKey, element, from, to) {
  return {
    labelKey,
    target: describeElement(element),
    ...(from !== undefined && { from: formatCssValue(from) }),
    ...(to !== undefined && { to: formatCssValue(to) }),
  };
}

export function historyActionLabel(kind, meta, t) {
  if (!meta) return t(kind === 'undo' ? 'editor.undo' : 'editor.redo');
  const change = meta.from !== undefined && meta.to !== undefined && meta.from !== meta.to
    ? ` (${meta.from} → ${meta.to})`
    : meta.to !== undefined ? ` (${meta.to})` : '';
  const target = meta.target ? ` — ${meta.target}` : '';
  return `${t(`history.${kind}`)}: ${t(meta.labelKey)}${change}${target}`;
}
