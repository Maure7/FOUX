const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

function generateIcons(root = path.resolve(__dirname, '..')) {
  // resvg uses sRGB; retain the authored hexadecimal fallback for P3 fills.
  const logo = fs.readFileSync(path.join(root, 'public/favicon.svg'), 'utf8')
    .replace(/fill:color\(display-p3[^)]*\);?/g, '');
  const insetLogo = logo.replace(/<svg\b[^>]*>/, (tag) => tag
    .replace(/width="[^"]*"/, 'width="384"')
    .replace(/height="[^"]*"/, 'height="368"')
    .replace('<svg', '<svg x="64" y="72"'));
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${insetLogo}</svg>`;
  const iconDirectory = path.join(root, 'build/icons');
  fs.mkdirSync(iconDirectory, { recursive: true });
  const sizes = [16, 32, 48, 64, 128, 256, 512];
  const pngs = sizes.map((size) => {
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
  // ICO supports PNG frames; generate all Windows sizes from the same SVG.
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
  console.log('Ícones PNG e ICO gerados a partir de public/favicon.svg.');
}

if (require.main === module) generateIcons();
module.exports = { generateIcons };
