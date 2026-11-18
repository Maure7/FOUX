import { parseColor, visibleBackground } from './contrast.js';
import { getGradientBorder } from '../gradientBorder.js';
import { sampleBackgroundImage, sampleImgElement } from './imageSampling.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const toHex = ({ r, g, b }) => `#${[r, g, b]
  .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')).join('')}`;

// Cor semitransparente composta sobre o que aparece atrás dela: é a cor que o aluno vê.
const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
});

const inside = (rect, x, y) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

function caretNode(doc, x, y) {
  if (doc.caretPositionFromPoint) return doc.caretPositionFromPoint(x, y)?.offsetNode ?? null;
  return doc.caretRangeFromPoint?.(x, y)?.startContainer ?? null;
}

// O caret sempre cai no texto mais próximo; só conta se o ponto estiver sobre as linhas dele.
function textNodeAt(doc, element, x, y) {
  const node = caretNode(doc, x, y);
  if (node?.nodeType !== 3 || !node.textContent.trim() || !element.contains(node)) return null;
  const range = doc.createRange();
  range.selectNodeContents(node);
  return [...range.getClientRects()].some((rect) => inside(rect, x, y)) ? node : null;
}

// Formas SVG pintam com `fill`, não com background.
function svgFill(element, win) {
  if (element.namespaceURI !== SVG_NS || element.localName === 'svg') return null;
  const fill = parseColor(win.getComputedStyle(element).fill);
  return fill?.a > 0 ? fill : null;
}

const SIDES = ['Top', 'Right', 'Bottom', 'Left'];

// Lado da borda sob o ponto (fora da caixa de padding), ou null.
function borderSideAt(element, style, x, y) {
  const rect = element.getBoundingClientRect();
  const [top, right, bottom, left] = SIDES.map((side) => parseFloat(style[`border${side}Width`]) || 0);
  if (!(top || right || bottom || left)) return null;
  if (y < rect.top + top) return 'Top';
  if (y > rect.bottom - bottom) return 'Bottom';
  if (x < rect.left + left) return 'Left';
  if (x > rect.right - right) return 'Right';
  return null;
}

// Cor da borda no ponto: a borda pinta por cima do fundo do próprio elemento. Bordas em
// gradiente do FOUX guardam as cores nos metadados (a 1ª parada, como nos fundos).
function borderColorAt(element, win, x, y) {
  const style = win.getComputedStyle(element);
  const side = borderSideAt(element, style, x, y);
  if (!side) return null;
  const gradient = getGradientBorder(element);
  const raw = gradient ? gradient.color1 : style[`border${side}Color`];
  const lineStyle = style[`border${side}Style`];
  const color = parseColor(raw);
  if (!color || color.a <= 0 || (!gradient && (lineStyle === 'none' || lineStyle === 'hidden'))) return null;
  return color.a < 1 ? over(color, visibleBackground(element, win)) : color;
}

// O fundo do <body> se espalha pela tela inteira quando o <html> não tem fundo próprio
// (propagação do CSS): a margem do body e a área abaixo do conteúdo mostram a cor dele.
function paintingRoot(doc, element, win) {
  if (element !== doc.documentElement || !doc.body) return element;
  const html = win.getComputedStyle(element);
  const transparent = (parseColor(html.backgroundColor)?.a ?? 0) === 0 && (!html.backgroundImage || html.backgroundImage === 'none');
  return transparent ? doc.body : element;
}

const WHITE = Object.freeze({ r: 255, g: 255, b: 255, a: 1 });

// opacity do elemento e dos ancestrais: o grupo inteiro fica translúcido sobre o que
// está atrás do ancestral translúcido mais externo.
function withOpacity(color, element, win) {
  let opacity = 1;
  let group = null;
  for (let node = element; node?.nodeType === 1; node = node.parentElement) {
    const value = parseFloat(win.getComputedStyle(node).opacity);
    if (value < 1) {
      opacity *= value;
      group = node;
    }
  }
  if (!group) return color;
  const behind = group.parentElement ? visibleBackground(group.parentElement, win) : WHITE;
  return over({ ...color, a: opacity }, behind);
}

// Imagem sob o ponto: a própria <img> ou a camada url() de cima do fundo do elemento ou
// de um ancestral (até um fundo opaco ou gradiente, que cobriria o resto).
function imageAt(element, win, x, y, onReady) {
  if (element.tagName === 'IMG') {
    const sample = sampleImgElement(element, win.getComputedStyle(element), x, y, onReady);
    if (sample !== undefined) return { node: element, sample };
  }
  for (let node = element; node?.nodeType === 1; node = node.parentElement) {
    const style = win.getComputedStyle(node);
    const sample = sampleBackgroundImage(node, style, x, y, onReady);
    if (sample !== undefined) return { node, sample };
    if ((parseColor(style.backgroundColor)?.a ?? 0) >= 1 || style.backgroundImage.includes('gradient(')) return null;
  }
  return null;
}

/**
 * Cor visível no ponto (x, y) do documento do canvas, em coordenadas da viewport dele.
 * Sobre letras, devolve a cor do texto; no resto, o fundo efetivo (sobe pelos pais
 * transparentes, pega a primeira parada de um gradiente e cai no branco da página).
 * `preferBackground` troca texto por fundo quando o cursor está sobre letras.
 * Sobre a área da borda, devolve a cor da borda; sobre <img> ou fundo com url(), o pixel
 * da imagem (onImageReady avisa quando uma imagem termina de carregar). A opacity do
 * elemento e dos ancestrais entra na conta.
 * Retorna { hex, element, source: 'text' | 'border' | 'image' | 'background', canToggle,
 * imageBlocked } ou null; imageBlocked = a imagem não pode ser lida e veio a cor de fundo.
 */
export function resolveElementColor(doc, x, y, preferBackground = false, onImageReady) {
  const win = doc?.defaultView;
  const hit = doc?.elementFromPoint(x, y);
  if (!win || !hit) return null;
  const element = paintingRoot(doc, hit, win);

  const textNode = textNodeAt(doc, element, x, y);
  if (textNode && !preferBackground) {
    const owner = textNode.parentElement;
    const color = parseColor(win.getComputedStyle(owner).color);
    if (color?.a > 0) {
      const hex = toHex(withOpacity(color.a < 1 ? over(color, visibleBackground(owner, win)) : color, owner, win));
      return { hex, element: owner, source: 'text', canToggle: true };
    }
  }

  const border = element === hit ? borderColorAt(element, win, x, y) : null;
  if (border) return { hex: toHex(withOpacity(border, element, win)), element, source: 'border', canToggle: !!textNode };

  const image = imageAt(element, win, x, y, onImageReady);
  const pixel = image?.sample;
  // Pixel totalmente transparente: aparece o que está atrás da imagem.
  if (pixel && !pixel.blocked && pixel.a > 0) {
    const color = pixel.a < 1 ? over(pixel, visibleBackground(image.node, win)) : pixel;
    return { hex: toHex(withOpacity(color, image.node, win)), element: image.node, source: 'image', canToggle: !!textNode };
  }

  const fill = svgFill(element, win);
  const background = visibleBackground(element, win);
  const color = fill ? (fill.a < 1 ? over(fill, background) : fill) : background;
  return {
    hex: toHex(withOpacity(color, element, win)),
    element,
    source: 'background',
    canToggle: !!textNode,
    imageBlocked: !!pixel?.blocked,
  };
}
