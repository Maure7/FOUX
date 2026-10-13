// Keep the editable background separate from the two painted box layers.
// The snapshot lives in the document so save/reopen and undo/redo retain it.
const STATE_ATTR = 'data-foux-gradient-border';
const PAINT_PROPERTIES = [
  'background-image', 'background-origin', 'background-clip',
  'background-size', 'background-position', 'background-repeat',
  'border-image', 'border-color', 'border-style',
];

export function getGradientBorder(element) {
  try {
    return JSON.parse(element?.getAttribute(STATE_ATTR) || 'null');
  } catch {
    return null;
  }
}

function saveState(element, state) {
  element.setAttribute(STATE_ATTR, JSON.stringify(state));
}

function splitLayers(value) {
  // Background URLs and gradient functions can contain commas.
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

export function cssColorToHex(value) {
  const match = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return match ? '#' + match.slice(1, 4).map((channel) => Number(channel).toString(16).padStart(2, '0')).join('') : value;
}

export function parseLinearGradient(value) {
  const firstLayer = splitLayers(value)[0];
  if (!firstLayer.startsWith('linear-gradient(')) return null;
  const parts = splitLayers(firstLayer.slice('linear-gradient('.length, -1));
  if (parts.length !== 3 || !parts[0].endsWith('deg')) return null;
  return { angle: parseFloat(parts[0]), color1: cssColorToHex(parts[1]), color2: cssColorToHex(parts[2]) };
}

export function gradientBorderBackground(state, overrides = {}) {
  const image = overrides.image ?? state.background.image;
  const color = overrides.color ?? state.background.color;
  const images = image && image !== 'none' ? splitLayers(image) : [];
  const content = [...images, `linear-gradient(${color}, ${color})`];
  const border = `linear-gradient(${state.angle}deg, ${state.color1}, ${state.color2})`;
  const count = content.length;
  const translucent = color === 'transparent' || color.startsWith('rgba(') || color.includes(' / ');
  return {
    image: [...content, border].join(', '),
    // When supported, border-area keeps the gradient out of transparent or
    // translucent content instead of letting it show through the fill layer.
    clip: [...Array(count).fill('padding-box'), state.borderArea && translucent ? 'border-area' : 'border-box'].join(', '),
    origin: [...Array(count).fill('padding-box'), 'border-box'].join(', '),
  };
}

function paint(element, state) {
  const background = gradientBorderBackground(state);
  element.style.setProperty('border-image', 'none', 'important');
  element.style.setProperty('border-color', 'transparent', 'important');
  element.style.setProperty('border-style', 'solid', 'important');
  element.style.setProperty('background-image', background.image, 'important');
  element.style.setProperty('background-clip', background.clip, 'important');
  element.style.setProperty('background-origin', background.origin, 'important');
  // Append full-size, non-repeating paint for the solid fill and border,
  // retaining sizing/position/repetition of any authored image layers.
  const imageCount = state.background.image === 'none' ? 0 : splitLayers(state.background.image).length;
  for (const [property, fallback] of [
    ['background-size', 'auto'], ['background-position', '0% 0%'], ['background-repeat', 'repeat'],
  ]) {
    const values = splitLayers(state.background[property] || fallback);
    const original = Array.from({ length: imageCount }, (_, index) => values[index % values.length]);
    const extra = property === 'background-size' ? 'auto, auto' : property === 'background-repeat' ? 'no-repeat, no-repeat' : '0% 0%, 0% 0%';
    element.style.setProperty(property, [...original, extra].join(', '), 'important');
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
    // Apply background edits made while the border gradient was active.
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
      // Old projects used border-image; turning the migrated gradient off
      // must not reinstate the incompatible gradient we just replaced.
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
  } else {
    element.style.backgroundColor = value;
    state.background.color = element.ownerDocument.defaultView.getComputedStyle(element).backgroundColor;
    state.edits['background-color'] = value;
  }
  saveState(element, state);
  paint(element, state);
  return true;
}
