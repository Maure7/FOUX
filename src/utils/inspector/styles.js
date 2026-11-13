import { getGradientBorder, parseLinearGradient, setGradientBorder } from '../gradientBorder';
import { cssColorToHex } from '../css/color.js';
import { textContrast } from '../css/contrast.js';
import { ORIGINAL_STYLE_ATTR } from './constants';

const toHex = (value) => (value?.startsWith('#') ? value : cssColorToHex(value, '#000000'));

function parsePx(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
const sides = (cs, property) => SIDES.map((side) => parsePx(cs[`${property}${side}`]));

// The export compares against this snapshot to emit only what the student changed.
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
    // Projects saved by older versions painted gradient borders with border-image.
    const legacyGradient = parseLinearGradient(cs.borderImageSource);
    if (legacyGradient) {
      rememberOriginalStyle(element);
      setGradientBorder(element, legacyGradient, { replaceBorderImage: true });
      gradientBorder = getGradientBorder(element);
    }
  }
  const borderColor = gradientBorder?.borderColor || cs.borderColor;
  const paddingSides = sides(cs, 'padding');
  const borderSides = SIDES.map((side) => parseFloat(cs[`border${side}Width`]) || 0);
  const rect = element.getBoundingClientRect();

  return {
    fontSize: parsePx(cs.fontSize),
    fontFamily: cs.fontFamily || '',
    textAlign: cs.textAlign || 'left',
    color: toHex(cs.color),
    backgroundColor: toHex(cs.backgroundColor),
    backgroundGradient: parseLinearGradient(gradientBorder?.background.image || cs.backgroundImage),
    borderRadius: parsePx(cs.borderRadius),
    borderWidth: parsePx(cs.borderWidth),
    borderStyle: cs.borderTopStyle,
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
    // Hex values drop the alpha channel; opacity controls read it from these.
    _rawColor: cs.color || '',
    _rawBg: cs.backgroundColor || '',
    _rawBorderColor: borderColor || '',
  };
}

// Pages that declare `transition` report in-between values right after an
// edit. Resolves once the element's running transitions end (null if none).
export function transitionsSettled(element) {
  const running = element?.getAnimations?.().filter((animation) => 'transitionProperty' in animation) ?? [];
  return running.length ? Promise.allSettled(running.map((animation) => animation.finished)) : null;
}
