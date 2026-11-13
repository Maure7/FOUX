const RGB = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/;
const ALPHA = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)/;
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

// getComputedStyle always reports rgb()/rgba(); <input type="color"> only accepts #rrggbb.
export function cssColorToHex(value, fallback = value) {
  const match = typeof value === 'string' ? value.match(RGB) : null;
  if (!match) return fallback;
  return `#${match.slice(1, 4).map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`;
}

export function extractAlpha(value) {
  if (!value) return 1;
  if (value === 'transparent') return 0;
  const match = value.match(ALPHA);
  return match ? parseFloat(match[1]) : 1;
}

export function hexAlphaToRgba(hex, alpha) {
  const a = parseFloat(alpha);
  if (!(a < 1)) return hex;
  const clean = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((start) => parseInt(clean.substring(start, start + 2), 16) || 0);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

/** Returns '#rrggbb' for complete typed values (with or without '#'), otherwise null. */
export function normalizeHex(text) {
  const match = String(text).trim().match(HEX);
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join('') : match[1];
  return `#${digits.toLowerCase()}`;
}

export const DEFAULT_GRADIENT = Object.freeze({ enabled: false, color1: '#e59843', color2: '#9333ea', angle: 135 });

export const gradientCss = ({ angle, color1, color2 }) => `linear-gradient(${angle}deg, ${color1}, ${color2})`;

export function sameColor(first, second) {
  return !!first && !!second && first.replace(/\s+/g, '').toLowerCase() === second.replace(/\s+/g, '').toLowerCase();
}
