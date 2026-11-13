// Official CSS names shown beside each friendly label, so students can map the
// visual control to the property they will write by hand. Hints live in the
// locales under `glossary.<key>`.
const TOKENS = {
  width: 'width',
  height: 'height',
  float: 'float',
  fontFamily: 'font-family',
  fontSize: 'font-size',
  textAlign: 'text-align',
  color: 'color',
  borderRadius: 'border-radius',
  borderWidth: 'border-width',
  borderColor: 'border-color',
  padding: 'padding',
  margin: 'margin',
  backgroundColor: 'background-color',
  gradient: 'linear-gradient()',
  gradientAngle: 'deg',
  hoverBackground: 'background-color',
  hoverColor: 'color',
  scale: 'transform: scale()',
  boxShadow: 'box-shadow',
  shadowOffset: 'offset-x offset-y',
  shadowBlur: 'blur-radius',
  shadowOpacity: 'rgba() alpha',
  contrast: 'WCAG',
};

export const cssInfo = (t, key) => ({ token: TOKENS[key], hint: t(`glossary.${key}`) });
