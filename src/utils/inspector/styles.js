import { getGradientBorder, parseEditableGradient, parseLinearGradient, setGradientBorder } from '../gradientBorder';
import { cssColorToHex } from '../css/color.js';
import { textContrast } from '../css/contrast.js';
import { borderSide } from './borders.js';
import { ORIGINAL_STYLE_ATTR } from './constants';

const toHex = (value) => (value?.startsWith('#') ? value : cssColorToHex(value, '#000000'));

function parsePx(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
const sides = (cs, property) => SIDES.map((side) => parsePx(cs[`${property}${side}`]));

// A exportação compara com este retrato para emitir só o que o aluno mudou.
export function rememberOriginalStyle(element) {
  if (!element.hasAttribute(ORIGINAL_STYLE_ATTR)) {
    element.setAttribute(ORIGINAL_STYLE_ATTR, element.getAttribute('style') || '');
  }
}

export function extractComputedStyles(element, iframeWindow) {
  if (!element || !iframeWindow) return null;
  const cs = iframeWindow.getComputedStyle(element);
  let gradientBorder = getGradientBorder(element);
  if (!gradientBorder) {
    // Versões antigas pintavam a borda em gradiente com border-image inline. Um
    // border-image da folha do aluno não pode ser convertido só por selecionar.
    const legacyGradient = parseLinearGradient(element.style.borderImageSource);
    if (legacyGradient) {
      rememberOriginalStyle(element);
      setGradientBorder(element, legacyGradient, { replaceBorderImage: true });
      gradientBorder = getGradientBorder(element);
    }
  }
  // Numa borda de um lado só (ex.: border-left), os controles mostram esse lado, não o topo invisível.
  const side = borderSide(cs);
  const borderColor = gradientBorder?.borderColor || cs[`border${side}Color`];
  const backgroundImage = gradientBorder ? gradientBorder.background.image : cs.backgroundImage;
  const paddingSides = sides(cs, 'padding');
  const borderSides = SIDES.map((name) => parseFloat(cs[`border${name}Width`]) || 0);
  const rect = element.getBoundingClientRect();

  return {
    fontSize: parsePx(cs.fontSize),
    fontFamily: cs.fontFamily || '',
    textAlign: cs.textAlign || 'left',
    color: toHex(cs.color),
    backgroundColor: toHex(cs.backgroundColor),
    backgroundGradient: parseEditableGradient(backgroundImage),
    borderRadius: parsePx(cs.borderRadius),
    borderWidth: parsePx(cs[`border${side}Width`]),
    borderStyle: cs[`border${side}Style`],
    borderColor: toHex(borderColor),
    borderGradient: gradientBorder ? {
      color1: gradientBorder.color1, color2: gradientBorder.color2, angle: gradientBorder.angle,
    } : null,
    padding: parsePx(cs.padding),
    margin: parsePx(cs.margin),
    paddingSides,
    marginSides: sides(cs, 'margin'),
    contentSize: [
      Math.max(0, Math.round(rect.width - paddingSides[1] - paddingSides[3] - borderSides[1] - borderSides[3])),
      Math.max(0, Math.round(rect.height - paddingSides[0] - paddingSides[2] - borderSides[0] - borderSides[2])),
    ],
    contrast: textContrast(element, iframeWindow, cs),
    width: parsePx(cs.width),
    height: parsePx(cs.height),
    // O hex perde o canal alfa; os controles de opacidade leem estes valores brutos.
    _rawColor: cs.color || '',
    _rawBg: cs.backgroundColor || '',
    _rawBgImage: backgroundImage || 'none',
    _rawBorderColor: borderColor || '',
  };
}

// Páginas com `transition` informam valores intermediários logo após a edição.
// Resolve quando as transições em andamento terminam (null se não houver).
export function transitionsSettled(element) {
  const running = element?.getAnimations?.().filter((animation) => 'transitionProperty' in animation) ?? [];
  return running.length ? Promise.allSettled(running.map((animation) => animation.finished)) : null;
}
