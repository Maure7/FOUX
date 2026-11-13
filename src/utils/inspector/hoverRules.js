import { cssColorToHex, extractAlpha, gradientCss, DEFAULT_GRADIENT } from '../css/color.js';
import { gradientBorderBackground, parseLinearGradient } from '../gradientBorder';

export const DEFAULT_HOVER = Object.freeze({
  bg: false, bgColor: '#000000', bgGradient: DEFAULT_GRADIENT,
  text: false, textColor: '#ffffff',
  scale: false, scaleValue: 1.05,
  shadow: false, shadowX: 0, shadowY: 8, shadowBlur: 20, shadowOpacity: 35,
});

export const shadowCss = ({ shadowX, shadowY, shadowBlur, shadowOpacity }, separator = ', ') =>
  `${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0${separator}0${separator}0${separator}${(shadowOpacity / 100).toFixed(2)})`;

// `css` is the merged declaration text returned by getHoverRules(); CSSOM has
// already normalized it (rgb() colors, shadow color possibly before offsets).
export function readHoverState(css, doc) {
  if (!css) return DEFAULT_HOVER;
  const style = doc.createElement('span').style;
  style.cssText = css;
  const state = { ...DEFAULT_HOVER };

  // With a gradient border, a solid hover fill is also painted as an image layer.
  const hasBgGradient = css.includes('linear-gradient') && !css.includes('background-color');
  state.bg = hasBgGradient || css.includes('background-color');
  if (hasBgGradient) {
    state.bgGradient = { ...DEFAULT_GRADIENT, ...parseLinearGradient(style.backgroundImage), enabled: true };
  } else if (state.bg) {
    state.bgColor = cssColorToHex(style.backgroundColor, state.bgColor);
  }

  state.text = /(?:^|;)\s*color:/.test(css);
  if (state.text) state.textColor = cssColorToHex(style.color, state.textColor);

  const scale = css.match(/scale\(([\d.]+)\)/);
  state.scale = !!scale;
  if (scale) state.scaleValue = parseFloat(scale[1]);

  state.shadow = css.includes('box-shadow:');
  const offsets = style.boxShadow.replace(/rgba?\([^)]*\)/g, '').match(/-?\d+(?:\.\d+)?px/g);
  if (state.shadow && offsets?.length >= 3) {
    state.shadowX = parseFloat(offsets[0]);
    state.shadowY = parseFloat(offsets[1]);
    state.shadowBlur = parseFloat(offsets[2]);
    state.shadowOpacity = Math.round(extractAlpha(style.boxShadow.match(/rgba?\([^)]*\)/)?.[0]) * 100);
  }
  return state;
}

// !important lets the preview win over the student's own selectors.
export function buildHoverDeclarations(state, borderGradient) {
  const rules = [];
  if (state.bg) {
    const image = state.bgGradient.enabled ? gradientCss(state.bgGradient) : null;
    if (borderGradient) {
      const background = gradientBorderBackground(borderGradient, image ? { image } : { color: state.bgColor });
      rules.push(`background-image: ${background.image} !important`);
      if (!image) rules.push(`background-color: ${state.bgColor} !important`);
      rules.push(
        `background-clip: ${background.clip} !important`,
        `background-origin: ${background.origin} !important`,
        `background-repeat: ${background.repeat} !important`,
      );
    } else if (image) {
      rules.push(
        `background-image: ${image} !important`,
        'background-clip: padding-box !important',
        'background-repeat: no-repeat !important',
        'background-size: auto !important',
      );
    } else {
      rules.push(`background-color: ${state.bgColor} !important`);
    }
  }
  if (state.text) rules.push(`color: ${state.textColor} !important`);
  if (state.scale) rules.push(`transform: scale(${state.scaleValue}) !important`);
  if (state.shadow) rules.push(`box-shadow: ${shadowCss(state)} !important`);
  if (rules.length) rules.push('transition: all 0.25s ease !important');
  return rules.join('; ');
}
