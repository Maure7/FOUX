// Funções puras do motor de edição, sem navegador: gradientes, bordas, cores e o
// depósito de fontes do histórico. O que depende do CSSOM (ex.: important.js) fica
// com as suítes do Chromium.
import assert from 'node:assert/strict';
import test from 'node:test';
import { gradientBorderBackground, isSingleGradient, parseEditableGradient, parseLinearGradient } from '../src/utils/gradientBorder.js';
import { borderSide, revealBorderStyle, revealBorderWidth, VISIBLE_BORDER_WIDTH } from '../src/utils/inspector/borders.js';
import { cssColorToHex, extractAlpha, hexAlphaToRgba, normalizeHex, sameColor } from '../src/utils/css/color.js';
import { contrastRatio, hoverShade, parseColor, wcagLevel } from '../src/utils/css/contrast.js';
import { createFontPool } from '../src/hooks/useEditorHistory.js';

const RED = 'rgb(255, 0, 0)';
const BLUE = 'rgb(0, 0, 255)';

test('parseEditableGradient lê o gradiente linear de uma camada como o getComputedStyle informa', () => {
  assert.deepEqual(parseEditableGradient(`linear-gradient(90deg, ${RED}, ${BLUE})`), { angle: 90, color1: '#ff0000', color2: '#0000ff' });
  assert.deepEqual(parseEditableGradient(`linear-gradient(to right, ${RED}, ${BLUE})`), { angle: 90, color1: '#ff0000', color2: '#0000ff' });
  assert.equal(parseEditableGradient(`linear-gradient(to top left, ${RED}, ${BLUE})`).angle, 315);
  assert.equal(parseEditableGradient(`linear-gradient(${RED}, ${BLUE})`).angle, 180, 'sem direção vale o padrão do CSS');
  assert.equal(parseEditableGradient(`linear-gradient(-45deg, ${RED}, ${BLUE})`).angle, 315);
  assert.equal(parseEditableGradient(`linear-gradient(0.25turn, ${RED}, ${BLUE})`).angle, 90);
  // Com três ou mais paradas, a sidebar edita a primeira e a última.
  assert.deepEqual(parseEditableGradient(`linear-gradient(45deg, ${RED} 10%, rgb(0, 255, 0) 50%, ${BLUE})`), { angle: 45, color1: '#ff0000', color2: '#0000ff' });
});

test('parseEditableGradient recusa o que a sidebar apagaria ou não sabe editar', () => {
  assert.equal(parseEditableGradient(`linear-gradient(90deg, ${RED}, ${BLUE}), url("foto.png")`), null, 'película sobre foto');
  assert.equal(parseEditableGradient(`radial-gradient(circle, ${RED}, ${BLUE})`), null);
  assert.equal(parseEditableGradient(`linear-gradient(90deg, ${RED})`), null, 'uma parada só');
  assert.equal(parseEditableGradient('none'), null);
  assert.equal(parseEditableGradient(undefined), null);
});

test('parseLinearGradient só aceita o formato gravado pelo FOUX', () => {
  assert.deepEqual(parseLinearGradient(`linear-gradient(45deg, ${RED}, ${BLUE})`), { angle: 45, color1: '#ff0000', color2: '#0000ff' });
  assert.equal(parseLinearGradient(`linear-gradient(to right, ${RED}, ${BLUE})`), null);
  assert.equal(parseLinearGradient(`linear-gradient(45deg, ${RED}, ${RED}, ${BLUE})`), null);
  assert.equal(parseLinearGradient(null), null);
});

test('isSingleGradient reconhece uma camada só de gradiente, de qualquer tipo', () => {
  assert.equal(isSingleGradient(`radial-gradient(circle, ${RED}, ${BLUE})`), true);
  assert.equal(isSingleGradient(`repeating-conic-gradient(${RED}, ${BLUE})`), true);
  assert.equal(isSingleGradient(`linear-gradient(${RED}, ${BLUE}), url("a.png")`), false);
  assert.equal(isSingleGradient('url("a.png")'), false);
  assert.equal(isSingleGradient('none'), false);
  assert.equal(isSingleGradient(''), false);
});

test('gradientBorderBackground monta conteúdo, borda e repetição sem tocar nas imagens autorais', () => {
  const state = { angle: 90, color1: '#ff0000', color2: '#0000ff', background: { image: 'none', color: 'rgb(255, 255, 255)' } };
  assert.deepEqual(gradientBorderBackground(state), {
    image: 'linear-gradient(rgb(255, 255, 255), rgb(255, 255, 255)), linear-gradient(90deg, #ff0000, #0000ff)',
    clip: 'padding-box, border-box',
    origin: 'padding-box, border-box',
    repeat: 'no-repeat, no-repeat',
  });
  const authored = gradientBorderBackground({
    ...state,
    borderArea: true,
    background: { image: `url("tile.png"), linear-gradient(${RED}, ${BLUE})`, color: 'rgb(0, 0, 0)', 'background-repeat': 'repeat-x', 'background-size': 'auto' },
  });
  assert.equal(authored.repeat, 'repeat-x, no-repeat, no-repeat, no-repeat');
  assert.equal(authored.clip, 'padding-box, padding-box, padding-box, border-area');
  assert.match(gradientBorderBackground(state, { color: 'rgb(0, 255, 0)' }).image, /^linear-gradient\(rgb\(0, 255, 0\), rgb\(0, 255, 0\)\)/);
});

const sides = (styles) => Object.fromEntries(['Top', 'Right', 'Bottom', 'Left'].flatMap((side) => [
  [`border${side}Style`, styles[side]?.[0] ?? 'none'], [`border${side}Width`, styles[side]?.[1] ?? '0px'],
]));

test('borderSide escolhe o lado visível que a sidebar mostra', () => {
  assert.equal(borderSide(sides({ Left: ['solid', '6px'] })), 'Left');
  assert.equal(borderSide(sides({ Right: ['dashed', '2px'], Left: ['solid', '6px'] })), 'Right');
  assert.equal(borderSide(sides({ Bottom: ['solid', '0px'] })), 'Bottom', 'estilo visível sem espessura ainda é o lado da borda');
  assert.equal(borderSide(sides({ Top: ['hidden', '4px'] })), 'Top');
  assert.equal(borderSide(sides({})), 'Top');
});

function fakeElement(styles) {
  const writes = [];
  const computed = sides(styles);
  return {
    writes,
    ownerDocument: { defaultView: { getComputedStyle: () => computed } },
    style: { setProperty: (...args) => writes.push(args) },
  };
}

test('revealBorderStyle/revealBorderWidth só escrevem quando a borda está invisível', () => {
  const none = fakeElement({});
  revealBorderStyle(none);
  assert.deepEqual(none.writes, [['border-style', 'solid', 'important']]);
  const reset = fakeElement({ Top: ['solid', '0px'] });
  revealBorderStyle(reset);
  revealBorderWidth(reset);
  assert.deepEqual(reset.writes, [['border-width', VISIBLE_BORDER_WIDTH, 'important']], 'border: 0 ganha espessura, não estilo');
  const visible = fakeElement({ Left: ['solid', '6px'] });
  revealBorderStyle(visible);
  revealBorderWidth(visible);
  assert.deepEqual(visible.writes, []);
});

test('cores: conversões usadas pelos controles da sidebar', () => {
  assert.equal(cssColorToHex('rgba(18, 52, 86, 0.5)'), '#123456');
  assert.equal(cssColorToHex('transparent', null), null);
  assert.equal(extractAlpha('rgba(0, 0, 0, 0.25)'), 0.25);
  assert.equal(extractAlpha('transparent'), 0);
  assert.equal(extractAlpha('rgb(1, 2, 3)'), 1);
  assert.equal(hexAlphaToRgba('#123456', 0.5), 'rgba(18, 52, 86, 0.50)');
  assert.equal(hexAlphaToRgba('#123456', 1), '#123456');
  assert.equal(normalizeHex('ABC'), '#aabbcc');
  assert.equal(normalizeHex('#12345'), null);
  assert.equal(sameColor('rgb(1, 2, 3)', 'RGB(1,2,3)'), true);
});

test('contraste WCAG e o tom de partida do hover', () => {
  assert.deepEqual(parseColor('rgba(1, 2, 3, 0.5)'), { r: 1, g: 2, b: 3, a: 0.5 });
  assert.deepEqual(parseColor('#abc'), { r: 170, g: 187, b: 204, a: 1 });
  assert.equal(parseColor('transparent'), null);
  assert.equal(Math.round(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })), 21);
  assert.equal(wcagLevel({ ratio: 4.6, large: false }), 'AA');
  assert.equal(wcagLevel({ ratio: 3.2, large: false }), 'large');
  assert.equal(wcagLevel({ ratio: 3.2, large: true }), 'AA');
  // Fundo claro escurece, fundo escuro clareia: o hover nunca some nem apaga o texto.
  assert.equal(hoverShade({ r: 255, g: 255, b: 255 }), '#d9d9d9');
  assert.equal(hoverShade({ r: 0, g: 0, b: 0 }), '#262626');
  assert.equal(hoverShade({ r: 51, g: 51, b: 51 }), '#525252');
  // Azul de botão (#2563eb) com texto branco: o hover clareia, como o texto pede.
  assert.equal(hoverShade({ r: 37, g: 99, b: 235 }), '#467aee');
  // Composições com alfa chegam fracionárias; o hex sai arredondado.
  assert.equal(hoverShade({ r: 37.5, g: 99.2, b: 235 }), '#467bee');
});

test('o histórico guarda cada fonte importada uma vez e devolve o HTML idêntico', () => {
  const font = (name, data) => `<style id="foux-font-${name}">\n      @font-face {\n        font-family: '${name}';\n        src: url('data:font/woff2;base64,${data}');\n      }\n    </style>`;
  const big = 'QUJD'.repeat(64 * 1024);
  const html = (color) => `<!DOCTYPE html>\n<html><head>${font('Um', big)}${font('Dois', `${big}x`)}<style>p { color: ${color}; }</style></head>`
    + '<body><p>$& $1 $$ texto com padrões de replace</p></body></html>';
  const pool = createFontPool();
  const first = pool.pack(html('red'));
  const second = pool.pack(html('blue'));
  assert.ok(first.length < 400 && second.length < 400, `retratos ainda carregam a fonte: ${first.length} caracteres`);
  assert.equal(pool.unpack(first), html('red'));
  assert.equal(pool.unpack(second), html('blue'));
  assert.equal(pool.pack(html('red')), first, 'o mesmo documento vira sempre o mesmo retrato');
  assert.notEqual(first, second);
  assert.equal(pool.pack(null), null);
  const plain = '<!DOCTYPE html>\n<html><head><style id="outra">a {}</style></head><body></body></html>';
  assert.equal(pool.unpack(pool.pack(plain)), plain);
});
