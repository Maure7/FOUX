// Nome oficial do CSS ao lado de cada rótulo amigável, para o aluno ligar o
// controle visual à propriedade que vai escrever à mão. As dicas ficam nos
// locales em `glossary.<chave>`.
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
