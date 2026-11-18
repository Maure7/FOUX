import { parseColor } from '../utils/css/contrast.js';

// Os enunciados ficam aqui, e não nos locales, para só carregarem junto com o editor.
// Cada alvo lista os IDs do tutorial em PT e ES, porque o tutorial traduz os IDs
// quando o idioma da interface muda.
const TARGET = {
  title: ['titulo-exercicio', 'titulo-ejercicio'],
  paragraph: ['paragrafo-exercicio', 'parrafo-ejercicio'],
  banner: ['tutorial-banner'],
  boxSingle: ['box-unica', 'caja-unica'],
  boxA: ['box-a', 'caja-a'],
  boxB: ['box-b', 'caja-b'],
  boxC: ['box-c', 'caja-c'],
  primary: ['btn-primario', 'boton-primario'],
  secondary: ['btn-secundario', 'boton-secundario'],
  link: ['link-demo-1', 'enlace-demo-1'],
  image: ['img-demo', 'imagen-demo'],
  card1: ['card-1', 'tarjeta-1'],
  card2: ['card-2', 'tarjeta-2'],
  card3: ['card-3', 'tarjeta-3'],
  footer: ['tutorial-footer'],
};

export const CATEGORIES = ['color', 'gradient', 'typography', 'boxModel', 'borders', 'shadow', 'hover', 'layout'];

// As faixas de matiz são largas de propósito: "um tom de azul" aceita marinho e celeste.
const HUES = { red: [[340, 360], [0, 18]], green: [[75, 170]], blue: [[185, 255]], purple: [[255, 300]] };

export function isHue(value, family) {
  const color = parseColor(value);
  if (!color || color.a < 0.5) return false;
  const [r, g, b] = [color.r / 255, color.g / 255, color.b / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (!delta) return false;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  if (saturation < 0.3 || lightness < 0.12 || lightness > 0.88) return false;
  let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return HUES[family].some(([from, to]) => hue >= from && hue <= to);
}

const px = (value) => parseFloat(value) || 0;
const sides = (style, property) => ['Top', 'Right', 'Bottom', 'Left'].map((side) => px(style[`${property}${side}`]));
const firstFamily = (style) => style.fontFamily.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();

// Cada check recebe { style, background, gradient, borderGradient, hover } (ver
// engine.js) e só pode ser verdadeiro depois que o aluno fez a alteração.
export const CHALLENGES = [
  {
    id: 'color-card-blue', category: 'color', target: TARGET.card1,
    text: { pt: 'Pinte o fundo do Card 1 com um tom de azul.', es: 'Pinta el fondo de la Tarjeta 1 con un tono de azul.' },
    check: ({ background }) => isHue(background, 'blue'),
  },
  {
    id: 'color-title-red', category: 'color', target: TARGET.title,
    text: { pt: 'Deixe o texto do título do exercício vermelho.', es: 'Haz que el texto del título del ejercicio sea rojo.' },
    check: ({ style }) => isHue(style.color, 'red'),
  },
  {
    id: 'color-box-green', category: 'color', target: TARGET.boxB,
    text: { pt: 'Mude o fundo da Box B para um tom de verde.', es: 'Cambia el fondo de la Caja B a un tono de verde.' },
    check: ({ background }) => isHue(background, 'green'),
  },
  {
    id: 'gradient-box-c', category: 'gradient', target: TARGET.boxC,
    text: { pt: 'Aplique um degradê (gradiente) no fundo da Box C.', es: 'Aplica un degradado en el fondo de la Caja C.' },
    check: ({ gradient }) => !!gradient,
  },
  {
    id: 'gradient-border-card', category: 'gradient', target: TARGET.card2,
    text: { pt: 'Crie uma borda em degradê no Card 2.', es: 'Crea un borde con degradado en la Tarjeta 2.' },
    check: ({ borderGradient }) => !!borderGradient,
  },
  {
    id: 'gradient-banner-angle', category: 'gradient', target: TARGET.banner,
    text: { pt: 'Gire o degradê do banner para 90° e deixe-o horizontal.', es: 'Gira el degradado del banner a 90° para dejarlo horizontal.' },
    check: ({ gradient }) => !!gradient && Math.abs(gradient.angle - 90) <= 5,
  },
  {
    id: 'type-title-size', category: 'typography', target: TARGET.title,
    text: { pt: 'Aumente a fonte do título do exercício para 32px ou mais.', es: 'Aumenta la fuente del título del ejercicio a 32px o más.' },
    check: ({ style }) => px(style.fontSize) >= 32,
  },
  {
    id: 'type-paragraph-serif', category: 'typography', target: TARGET.paragraph,
    text: { pt: 'Troque a fonte do parágrafo do exercício para Georgia (serifada).', es: 'Cambia la fuente del párrafo del ejercicio a Georgia (con serifa).' },
    check: ({ style }) => firstFamily(style) === 'georgia',
  },
  {
    id: 'type-footer-size', category: 'typography', target: TARGET.footer,
    text: { pt: 'Aumente o texto do rodapé para 18px ou mais.', es: 'Aumenta el texto del pie de página a 18px o más.' },
    check: ({ style }) => px(style.fontSize) >= 18,
  },
  {
    id: 'box-card-padding', category: 'boxModel', target: TARGET.card3,
    text: { pt: 'Dê ao Card 3 um padding de 40px ou mais em todos os lados.', es: 'Dale a la Tarjeta 3 un padding de 40px o más en todos los lados.' },
    check: ({ style }) => sides(style, 'padding').every((value) => value >= 40),
  },
  {
    id: 'box-single-margin', category: 'boxModel', target: TARGET.boxSingle,
    text: { pt: 'Afaste a primeira caixa da seção 2 com margin-bottom de 40px ou mais.', es: 'Separa la primera caja de la sección 2 con margin-bottom de 40px o más.' },
    check: ({ style }) => px(style.marginBottom) >= 40,
  },
  {
    id: 'box-footer-top', category: 'boxModel', target: TARGET.footer,
    text: { pt: 'Use só o lado de cima: padding-top de 40px ou mais no rodapé.', es: 'Usa solo el lado superior: padding-top de 40px o más en el pie de página.' },
    check: ({ style }) => px(style.paddingTop) >= 40,
  },
  {
    id: 'border-primary-radius', category: 'borders', target: TARGET.primary,
    text: { pt: 'Arredonde os cantos do Botão Primário com 20px ou mais.', es: 'Redondea las esquinas del Botón Primario con 20px o más.' },
    check: ({ style }) => px(style.borderTopLeftRadius) >= 20,
  },
  {
    id: 'border-box-width', category: 'borders', target: TARGET.boxA,
    text: { pt: 'Dê à Box A uma borda de 4px ou mais de espessura.', es: 'Dale a la Caja A un borde de 4px o más de grosor.' },
    check: ({ style }) => px(style.borderTopWidth) >= 4 && !['none', 'hidden'].includes(style.borderTopStyle),
  },
  {
    id: 'border-image-round', category: 'borders', target: TARGET.image,
    text: { pt: 'Arredonde a imagem com border-radius de 40px ou mais.', es: 'Redondea la imagen con border-radius de 40px o más.' },
    check: ({ style }) => px(style.borderTopLeftRadius) >= 40,
  },
  {
    id: 'shadow-primary', category: 'shadow', target: TARGET.primary,
    text: { pt: 'Adicione uma sombra no hover do Botão Primário.', es: 'Agrega una sombra al hover del Botón Primario.' },
    check: ({ hover }) => hover.shadow,
  },
  {
    id: 'shadow-card-blur', category: 'shadow', target: TARGET.card1,
    text: { pt: 'Crie uma sombra no hover do Card 1 com desfoque de 30px ou mais.', es: 'Crea una sombra en el hover de la Tarjeta 1 con desenfoque de 30px o más.' },
    check: ({ hover }) => hover.shadow && hover.shadowBlur >= 30,
  },
  {
    id: 'shadow-box-drop', category: 'shadow', target: TARGET.boxA,
    text: { pt: 'Faça a sombra do hover da Box A cair para baixo: Y de 10px ou mais.', es: 'Haz que la sombra del hover de la Caja A caiga hacia abajo: Y de 10px o más.' },
    check: ({ hover }) => hover.shadow && hover.shadowY >= 10,
  },
  {
    id: 'hover-secondary-scale', category: 'hover', target: TARGET.secondary,
    text: { pt: 'Faça o Botão Secundário crescer no hover (escala maior que 1).', es: 'Haz que el Botón Secundario crezca en el hover (escala mayor que 1).' },
    check: ({ hover }) => hover.scale && hover.scaleValue > 1,
  },
  {
    id: 'hover-card-background', category: 'hover', target: TARGET.card2,
    text: { pt: 'Mude a cor de fundo do Card 2 no hover.', es: 'Cambia el color de fondo de la Tarjeta 2 en el hover.' },
    check: ({ hover }) => hover.bg,
  },
  {
    id: 'hover-link-color', category: 'hover', target: TARGET.link,
    text: { pt: 'Mude a cor do texto do Link de exemplo 1 no hover.', es: 'Cambia el color del texto del Enlace de ejemplo 1 en el hover.' },
    check: ({ hover }) => hover.text,
  },
  {
    id: 'layout-image-center', category: 'layout', target: TARGET.image,
    text: { pt: 'Centralize a imagem com o botão de disposição "Centralizar".', es: 'Centra la imagen con el botón de disposición "Centrar".' },
    check: ({ style }) => style.display === 'block' && style.float === 'none'
      && px(style.marginLeft) > 0 && Math.abs(px(style.marginLeft) - px(style.marginRight)) <= 1,
  },
  {
    id: 'layout-image-float', category: 'layout', target: TARGET.image,
    text: { pt: 'Faça a imagem flutuar à direita do texto (float: right).', es: 'Haz que la imagen flote a la derecha del texto (float: right).' },
    check: ({ style }) => style.float === 'right',
  },
  {
    id: 'layout-card-align', category: 'layout', target: TARGET.card2,
    text: { pt: 'Alinhe à direita o texto do Card 2.', es: 'Alinea a la derecha el texto de la Tarjeta 2.' },
    check: ({ style }) => ['right', 'end'].includes(style.textAlign),
  },
];
