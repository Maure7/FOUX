import { getGradientBorder } from '../gradientBorder.js';
import { normalizeHex } from './color.js';

const RGB_FUNCTION = /rgba?\(([^)]+)\)/;
const RGB_FUNCTIONS = /rgba?\([^)]+\)/g;
const WHITE = Object.freeze({ r: 255, g: 255, b: 255, a: 1 });
const BLACK = Object.freeze({ r: 0, g: 0, b: 0, a: 1 });

/** Lê rgb()/rgba() (como o getComputedStyle informa) e cores em hex. */
export function parseColor(value) {
  if (typeof value !== 'string' || !value || value === 'transparent') return null;
  const match = value.match(RGB_FUNCTION);
  if (match) {
    const [r, g, b, a = 1] = match[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return [r, g, b, a].every(Number.isFinite) ? { r, g, b, a } : null;
  }
  const hex = normalizeHex(value);
  if (!hex) return null;
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return { r, g, b, a: 1 };
}

const linear = (channel) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

// Luminância relativa e razão de contraste do WCAG 2.x.
const luminance = ({ r, g, b }) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

export function contrastRatio(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});

// Bordas em gradiente guardam o preenchimento real nos metadados; as camadas
// pintadas seriam confundidas com o fundo atrás do texto.
function paintLayers(element, style) {
  const border = getGradientBorder(element);
  const image = border ? border.background.image : style.backgroundImage;
  const stops = image?.includes('gradient(') ? (image.match(RGB_FUNCTIONS) || []).map(parseColor).filter(Boolean) : [];
  const fill = parseColor(border ? border.background.color : style.backgroundColor);
  return { stops, fill };
}

// Toda cor opaca sobre a qual o texto pode ficar. Gradientes entram com cada
// parada, então a razão informada é o pior caso ao longo do gradiente.
function backgroundCandidates(element, win) {
  const layers = [];
  for (let node = element; node?.nodeType === 1; node = node.parentElement) {
    const { stops, fill } = paintLayers(node, win.getComputedStyle(node));
    if (stops.length) {
      layers.push(stops);
      if (stops.every((stop) => stop.a >= 1)) break;
    }
    if (fill?.a > 0) {
      layers.push([fill]);
      if (fill.a >= 1) break;
    }
  }
  return layers.reduceRight((below, stops) => stops.flatMap((stop) => below.map((color) => over(stop, color))), [WHITE]);
}

/** Cor opaca que aparece atrás do conteúdo do elemento (num gradiente, a primeira parada). */
export function visibleBackground(element, win) {
  return backgroundCandidates(element, win)[0];
}

/** '#rrggbb' 15% mais perto do preto, ou do branco num fundo escuro: diferente o bastante para notar, sem destoar. */
export function hoverShade(color) {
  const target = contrastRatio(color, BLACK) >= contrastRatio(color, WHITE) ? BLACK : WHITE;
  return `#${['r', 'g', 'b'].map((channel) => Math.round(color[channel] + (target[channel] - color[channel]) * 0.15)
    .toString(16).padStart(2, '0')).join('')}`;
}

function hasVisibleText(element) {
  const walker = element.ownerDocument.createTreeWalker(element, 4 /* SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent.trim() && !node.parentElement?.closest('style, script')) return true;
  }
  return false;
}

/** { ratio, large } da cor do texto sobre o fundo visível; null quando não há texto. */
export function textContrast(element, win, style = win.getComputedStyle(element)) {
  if (!hasVisibleText(element)) return null;
  const text = parseColor(style.color);
  if (!text) return null;
  const ratio = Math.min(...backgroundCandidates(element, win)
    .map((background) => contrastRatio(text.a < 1 ? over(text, background) : text, background)));
  const size = parseFloat(style.fontSize);
  const bold = (parseInt(style.fontWeight, 10) || 400) >= 700;
  // "Texto grande" do WCAG: 18pt (24px), ou 14pt (18,66px) em negrito.
  return { ratio, large: size >= 24 || (bold && size >= 18.66) };
}

/** 'AAA' | 'AA' | 'large' (só passa como texto grande) | 'fail' */
export function wcagLevel({ ratio, large }) {
  const [aa, aaa] = large ? [3, 4.5] : [4.5, 7];
  if (ratio >= aaa) return 'AAA';
  if (ratio >= aa) return 'AA';
  return !large && ratio >= 3 ? 'large' : 'fail';
}
