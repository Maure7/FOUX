const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

// Fonte oficial do ícone do aplicativo (arte original em build/icon.svg).
const ICON_SOURCE = 'build/icon.svg';
// Recorte em torno do quadrado arredondado (x 12.25, y 13.57, 78.56 de lado)
// com ~3,5% de respiro: a arte original tem ~12% de margem vazia, o que
// deixaria o ícone pequeno na área de trabalho, no menu Iniciar e na busca.
const ICON_VIEWBOX = '9.25 10.57 84.56 84.56';
// Inclui 24 px (barra de tarefas do Windows 11 a 100%) além dos tamanhos padrão.
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512];

function iconSvg(root) {
  return fs.readFileSync(path.join(root, ICON_SOURCE), 'utf8')
    .replace(/<\?xml[^>]*\?>\s*/, '')
    .replace(/<svg\b[^>]*>/, (tag) => tag
      .replace(/\sviewBox="[^"]*"/, ` viewBox="${ICON_VIEWBOX}"`)
      .replace('<svg', '<svg width="512" height="512"'));
}

function generateIcons(root = path.resolve(__dirname, '..')) {
  const source = iconSvg(root);
  const iconDirectory = path.join(root, 'build/icons');
  fs.mkdirSync(iconDirectory, { recursive: true });
  const pngs = SIZES.map((size) => {
    const rendered = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render();
    if (size === 512) {
      const pixels = rendered.pixels;
      if (!pixels.some((value, index) => index % 4 !== 3 && value > 0 && pixels[index - index % 4 + 3] > 0)) {
        throw new Error('O ícone não contém pixels coloridos visíveis.');
      }
    }
    const image = rendered.asPng();
    fs.writeFileSync(path.join(iconDirectory, `${size}x${size}.png`), image);
    return { size, image };
  });
  // O ICO aceita quadros PNG; todos os tamanhos do Windows saem do mesmo SVG.
  const frames = pngs.filter(({ size }) => size <= 256);
  const header = Buffer.alloc(6 + 16 * frames.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, image }, index) => {
    const position = 6 + 16 * index;
    header[position] = size === 256 ? 0 : size;
    header[position + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, position + 4);
    header.writeUInt16LE(32, position + 6);
    header.writeUInt32LE(image.length, position + 8);
    header.writeUInt32LE(offset, position + 12);
    offset += image.length;
  });
  fs.writeFileSync(path.join(root, 'build/icon.ico'), Buffer.concat([header, ...frames.map(({ image }) => image)]));
  console.log(`Ícones PNG e ICO gerados a partir de ${ICON_SOURCE}.`);
}

if (require.main === module) generateIcons();
module.exports = { generateIcons, iconSvg, ICON_SOURCE };
