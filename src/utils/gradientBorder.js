import { cssColorToHex } from './css/color.js';
import { importantPriority } from './inspector/important.js';

// O fundo editável fica separado das duas camadas pintadas (conteúdo e borda).
// O estado mora no documento para sobreviver a salvar/reabrir e a desfazer/refazer.
const STATE_ATTR = 'data-foux-gradient-border';
const PAINT_PROPERTIES = [
  'background-image', 'background-origin', 'background-clip',
  'background-size', 'background-position', 'background-repeat',
  'border-image', 'border-color', 'border-style',
];

export function getGradientBorder(element) {
  try {
    const state = JSON.parse(element?.getAttribute(STATE_ATTR) || 'null');
    if (!state || !Number.isFinite(state.angle) || typeof state.color1 !== 'string' || typeof state.color2 !== 'string'
      || typeof state.background?.image !== 'string' || typeof state.background?.color !== 'string'
      || !state.original || typeof state.original !== 'object' || Array.isArray(state.original)
      || !state.edits || typeof state.edits !== 'object' || Array.isArray(state.edits)) return null;
    if (Object.values(state.original).some(value => !value || typeof value.value !== 'string' || typeof value.priority !== 'string')) return null;
    return state;
  } catch {
    return null;
  }
}

function saveState(element, state) {
  element.setAttribute(STATE_ATTR, JSON.stringify(state));
}

function splitLayers(value) {
  // URLs e funções de gradiente também têm vírgulas.
  const layers = [];
  let start = 0;
  let depth = 0;
  let quote = '';
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (character === '\\') { index++; continue; }
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") quote = character;
    else if (character === '(') depth++;
    else if (character === ')') depth--;
    else if (character === ',' && !depth) {
      layers.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  layers.push(value.slice(start).trim());
  return layers;
}

// Formato estrito gravado pelo FOUX: também reconhece bordas border-image de versões antigas.
export function parseLinearGradient(value) {
  if (typeof value !== 'string') return null;
  const firstLayer = splitLayers(value)[0];
  if (!firstLayer.startsWith('linear-gradient(')) return null;
  const parts = splitLayers(firstLayer.slice('linear-gradient('.length, -1));
  if (parts.length !== 3 || !parts[0].endsWith('deg')) return null;
  return { angle: parseFloat(parts[0]), color1: cssColorToHex(parts[1]), color2: cssColorToHex(parts[2]) };
}

const ANGLE_UNITS = { deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 };
const DIRECTIONS = {
  top: 0, right: 90, bottom: 180, left: 270,
  'top right': 45, 'right top': 45, 'bottom right': 135, 'right bottom': 135,
  'bottom left': 225, 'left bottom': 225, 'top left': 315, 'left top': 315,
};

function directionAngle(text) {
  const angle = text.match(/^(-?\d*\.?\d+)(deg|grad|rad|turn)$/);
  if (angle) return Math.round(((parseFloat(angle[1]) * ANGLE_UNITS[angle[2]]) % 360 + 360) % 360);
  const side = text.match(/^to\s+(.+)$/)?.[1].replace(/\s+/g, ' ');
  return side in DIRECTIONS ? DIRECTIONS[side] : null;
}

/**
 * Gradiente de fundo que a sidebar consegue editar: uma única camada linear,
 * com direção em ângulo ou "to ..." e duas ou mais paradas (usa a primeira e a última).
 * Fundos com várias camadas (ex.: película sobre foto) ficam de fora para não apagar a foto.
 */
export function parseEditableGradient(value) {
  if (typeof value !== 'string') return null;
  const layers = splitLayers(value);
  if (layers.length !== 1 || !layers[0].startsWith('linear-gradient(')) return null;
  const parts = splitLayers(layers[0].slice('linear-gradient('.length, -1));
  const angle = directionAngle(parts[0]);
  const stops = angle === null ? parts : parts.slice(1);
  const color1 = stops.length >= 2 ? cssColorToHex(stops[0], null) : null;
  const color2 = stops.length >= 2 ? cssColorToHex(stops.at(-1), null) : null;
  return color1 && color2 ? { angle: angle ?? 180, color1, color2 } : null;
}

/** Uma camada só de gradiente (linear, radial ou cônico, repetido ou não), sem imagem. */
export function isSingleGradient(value) {
  if (typeof value !== 'string' || !value || value === 'none') return false;
  const layers = splitLayers(value);
  return layers.length === 1 && /^(repeating-)?(linear|radial|conic)-gradient\(/.test(layers[0]);
}

export function gradientBorderBackground(state, overrides = {}) {
  const image = overrides.image ?? state.background.image;
  const color = overrides.color ?? state.background.color;
  const images = image && image !== 'none' ? splitLayers(image) : [];
  const content = [...images, `linear-gradient(${color}, ${color})`];
  const border = `linear-gradient(${state.angle}deg, ${state.color1}, ${state.color2})`;
  const count = content.length;
  const sizes = splitLayers(state.background['background-size'] || 'auto');
  const repeats = splitLayers(state.background['background-repeat'] || 'repeat');
  return {
    image: [...content, border].join(', '),
    // Limita a camada da borda mesmo com preenchimento opaco: a borda serrilhada
    // não pode revelar o gradiente oposto por baixo do conteúdo.
    clip: [...Array(count).fill('padding-box'), state.borderArea ? 'border-area' : 'border-box'].join(', '),
    origin: [...Array(count).fill('padding-box'), 'border-box'].join(', '),
    // Gradientes de tamanho total não podem repetir um pixel fracionário na
    // borda oposta. Preserva a repetição de imagens autorais e de tiles com tamanho.
    repeat: [...images.map((layer, index) => layer.startsWith('linear-gradient(')
      && /^auto(?: auto)?$/.test(sizes[index % sizes.length])
      ? 'no-repeat' : repeats[index % repeats.length]), 'no-repeat', 'no-repeat'].join(', '),
  };
}

function paint(element, state) {
  const background = gradientBorderBackground(state);
  // !important só contra CSS autoral com !important: inline comum já vence as
  // regras normais e deixa o :hover (folha com !important) pintar por cima.
  const set = (property, value) => element.style.setProperty(property, value, importantPriority(element, property));
  set('border-image', 'none');
  set('border-color', 'transparent');
  set('border-style', 'solid');
  set('background-image', background.image);
  set('background-clip', background.clip);
  set('background-origin', background.origin);
  set('background-repeat', background.repeat);
  // Acrescenta as camadas de preenchimento e borda (tamanho total, sem repetir)
  // mantendo tamanho, posição e repetição das imagens autorais.
  const imageCount = state.background.image === 'none' ? 0 : splitLayers(state.background.image).length;
  for (const [property, fallback] of [
    ['background-size', 'auto'], ['background-position', '0% 0%'],
  ]) {
    const values = splitLayers(state.background[property] || fallback);
    const original = Array.from({ length: imageCount }, (_, index) => values[index % values.length]);
    const extra = property === 'background-size' ? 'auto, auto' : '0% 0%, 0% 0%';
    set(property, [...original, extra].join(', '));
  }
}

export function setGradientBorder(element, gradient, { replaceBorderImage = false } = {}) {
  let state = getGradientBorder(element);
  if (!gradient) {
    if (!state) return;
    for (const [property, { value, priority }] of Object.entries(state.original)) {
      if (value) element.style.setProperty(property, value, priority);
      else element.style.removeProperty(property);
    }
    // Reaplica as edições de fundo feitas enquanto o gradiente da borda estava ativo.
    for (const [property, value] of Object.entries(state.edits)) {
      element.style.setProperty(property, value);
    }
    element.removeAttribute(STATE_ATTR);
    return;
  }
  if (!state) {
    const cs = element.ownerDocument.defaultView.getComputedStyle(element);
    state = {
      original: Object.fromEntries(PAINT_PROPERTIES.map((property) => [property, {
        value: element.style.getPropertyValue(property), priority: element.style.getPropertyPriority(property),
      }])),
      background: {
        image: cs.backgroundImage, color: cs.backgroundColor,
        'background-size': cs.backgroundSize, 'background-position': cs.backgroundPosition,
        'background-repeat': cs.backgroundRepeat,
      },
      borderColor: cs.borderColor,
      borderArea: element.ownerDocument.defaultView.CSS.supports('background-clip', 'border-area'),
      edits: {},
    };
    if (replaceBorderImage) {
      // Projetos antigos usavam border-image; desligar o gradiente migrado não
      // pode trazer de volta o gradiente incompatível que acabou de ser trocado.
      state.original['border-image'] = { value: 'none', priority: 'important' };
    }
  }
  Object.assign(state, gradient);
  saveState(element, state);
  paint(element, state);
}

export function updateGradientBorderBackground(element, property, value) {
  const state = getGradientBorder(element);
  if (!state || !['backgroundImage', 'backgroundColor', 'borderColor'].includes(property)) return false;
  if (property === 'borderColor') {
    state.borderColor = value;
    state.edits['border-color'] = value;
  } else if (property === 'backgroundImage') {
    state.background.image = value || 'none';
    state.edits['background-image'] = value;
    if (value?.startsWith('linear-gradient(')) {
      for (const [property, setting] of [['background-repeat', 'no-repeat'], ['background-size', 'auto']]) {
        state.background[property] = setting;
        state.edits[property] = setting;
      }
    }
  } else {
    element.style.backgroundColor = value;
    state.background.color = element.ownerDocument.defaultView.getComputedStyle(element).backgroundColor;
    state.edits['background-color'] = value;
  }
  saveState(element, state);
  paint(element, state);
  return true;
}
