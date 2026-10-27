import { getGradientBorder, parseLinearGradient, setGradientBorder } from '../gradientBorder';
import { ORIGINAL_STYLE_ATTR } from './constants';

function rgbToHex(rgb) {
  if (!rgb || rgb.startsWith('#')) return rgb || '#000000';
  const match = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return '#000000';
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function parsePx(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function rememberOriginalStyle(element) {
  if (!element.hasAttribute(ORIGINAL_STYLE_ATTR)) {
    element.setAttribute(ORIGINAL_STYLE_ATTR, element.getAttribute('style') || '');
  }
}

/**
 * Lê os estilos computados relevantes de um elemento DOM.
 * Inclui width/height para imagens e fontFamily para tipografia.
 */
export function extractComputedStyles(element, iframeWindow) {
  if (!element || !iframeWindow) return null;
  const cs = iframeWindow.getComputedStyle(element);
  let gradientBorder = getGradientBorder(element);
  if (!gradientBorder) {
    const legacyGradient = parseLinearGradient(cs.borderImageSource);
    if (legacyGradient) {
      rememberOriginalStyle(element);
      setGradientBorder(element, legacyGradient, { replaceBorderImage: true });
      gradientBorder = getGradientBorder(element);
    }
  }
  const borderColor = gradientBorder?.borderColor || cs.borderColor;

  return {
    fontSize: parsePx(cs.fontSize),
    fontFamily: cs.fontFamily || '',
    textAlign: cs.textAlign || 'left',
    color: rgbToHex(cs.color),
    backgroundColor: rgbToHex(cs.backgroundColor),
    backgroundGradient: parseLinearGradient(gradientBorder?.background.image || cs.backgroundImage),
    borderRadius: parsePx(cs.borderRadius),
    borderWidth: parsePx(cs.borderWidth),
    borderStyle: cs.borderTopStyle,
    borderColor: rgbToHex(borderColor),
    borderGradient: gradientBorder ? {
      color1: gradientBorder.color1, color2: gradientBorder.color2, angle: gradientBorder.angle,
    } : null,
    padding: parsePx(cs.padding),
    margin: parsePx(cs.margin),
    width: parsePx(cs.width),
    height: parsePx(cs.height),
    /* Raw color strings for alpha extraction */
    _rawColor: cs.color || '',
    _rawBg: cs.backgroundColor || '',
    _rawBorderColor: borderColor || '',
  };
}

