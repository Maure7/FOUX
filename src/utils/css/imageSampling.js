// Pixels de <img> e de background-image: url(). getComputedStyle só informa a cor por
// trás da imagem, então o conta-gotas desenha a imagem num canvas e lê o pixel.
// Imagens de outra origem sem CORS "contaminam" o canvas (o navegador proíbe a leitura):
// nesses casos a amostra devolve { blocked: true } e quem chama usa a cor de fundo.

const MAX_SIDE = 2048;
const MAX_ENTRIES = 24;
// src -> { status: 'loading' | 'ready' | 'blocked', context, scale, listeners }
const cache = new Map();

function remember(src, entry) {
  cache.delete(src);
  cache.set(src, entry);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
  return entry;
}

// Desenha reduzido (no máximo MAX_SIDE) e testa a leitura uma vez; falha = contaminado.
function rasterize(image) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) return null;
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.getImageData(0, 0, 1, 1);
    return { context, scale };
  } catch {
    return null;
  }
}

function settle(entry, raster) {
  Object.assign(entry, raster ? { status: 'ready', ...raster } : { status: 'blocked' });
  entry.listeners.forEach((listener) => listener());
  entry.listeners.clear();
}

// Uma nova requisição com CORS: servidores que permitem a leitura liberam o canvas.
function loadWithCors(src, entry) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.onload = () => settle(entry, rasterize(image));
  image.onerror = () => settle(entry, null);
  image.src = src;
}

function entryFor(src, loadedImage) {
  const cached = cache.get(src);
  if (cached) return remember(src, cached);
  const entry = remember(src, { status: 'loading', listeners: new Set() });
  // A <img> já carregada na página resolve na hora quando é da mesma origem ou data:.
  const direct = loadedImage?.complete ? rasterize(loadedImage) : null;
  if (direct) Object.assign(entry, { status: 'ready', ...direct });
  else loadWithCors(src, entry);
  return entry;
}

/**
 * Cor do pixel (u, v) — em pixels naturais da imagem `src` — ou:
 * null enquanto carrega (onReady é chamado quando terminar) e { blocked: true } quando
 * o navegador não permite ler a imagem.
 */
export function samplePixel(src, u, v, { loadedImage, onReady } = {}) {
  const entry = entryFor(src, loadedImage);
  if (entry.status === 'blocked') return { blocked: true };
  if (entry.status === 'loading') {
    if (onReady) entry.listeners.add(onReady);
    return null;
  }
  const { context, scale } = entry;
  const x = Math.min(context.canvas.width - 1, Math.max(0, Math.floor(u * scale)));
  const y = Math.min(context.canvas.height - 1, Math.max(0, Math.floor(v * scale)));
  const [r, g, b, alpha] = context.getImageData(x, y, 1, 1).data;
  return { r, g, b, a: alpha / 255 };
}

// '50%' | '12px' -> deslocamento dentro da sobra (área - tamanho).
function offset(value, free) {
  const number = parseFloat(value);
  if (!Number.isFinite(number)) return free / 2;
  return String(value).trim().endsWith('%') ? (free * number) / 100 : number;
}

// Tamanho desenhado pelo object-fit dentro da caixa de conteúdo.
function objectFitSize(fit, boxWidth, boxHeight, width, height) {
  const contain = Math.min(boxWidth / width, boxHeight / height);
  const cover = Math.max(boxWidth / width, boxHeight / height);
  if (fit === 'contain') return [width * contain, height * contain];
  if (fit === 'cover') return [width * cover, height * cover];
  if (fit === 'none') return [width, height];
  if (fit === 'scale-down') return contain < 1 ? [width * contain, height * contain] : [width, height];
  return [boxWidth, boxHeight];
}

const box = (element, style, kind) => {
  const rect = element.getBoundingClientRect();
  const side = (name) => (parseFloat(style[name]) || 0);
  const inset = (edge) => side(`border${edge}Width`) + (kind === 'content' ? side(`padding${edge}`) : 0);
  const left = rect.left + inset('Left');
  const top = rect.top + inset('Top');
  return { left, top, width: rect.right - inset('Right') - left, height: rect.bottom - inset('Bottom') - top };
};

/** Pixel de uma <img> no ponto (x, y) da viewport do documento dela; undefined se fora da imagem desenhada. */
export function sampleImgElement(image, style, x, y, onReady) {
  const src = image.currentSrc || image.src;
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!src || !width || !height) return undefined;
  const area = box(image, style, 'content');
  const [drawnWidth, drawnHeight] = objectFitSize(style.objectFit, area.width, area.height, width, height);
  const [positionX = '50%', positionY = '50%'] = style.objectPosition.split(/\s+/);
  const left = area.left + offset(positionX, area.width - drawnWidth);
  const top = area.top + offset(positionY, area.height - drawnHeight);
  const u = ((x - left) / drawnWidth) * width;
  const v = ((y - top) / drawnHeight) * height;
  if (!(u >= 0 && v >= 0 && u < width && v < height)) return undefined;
  return samplePixel(src, u, v, { loadedImage: image, onReady });
}

// Separa camadas por vírgula fora de parênteses (url() e gradientes têm vírgulas).
function layers(value) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '(') depth++;
    else if (value[index] === ')') depth--;
    else if (value[index] === ',' && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

const URL_LAYER = /^url\(\s*(['"]?)(.*?)\1\s*\)$/;
const imageSizes = new Map();

// Tamanho natural da imagem de fundo (carregada à parte; null até carregar).
function naturalSize(src, onReady) {
  if (imageSizes.has(src)) return imageSizes.get(src);
  imageSizes.set(src, null);
  const image = new Image();
  image.onload = () => {
    imageSizes.set(src, image.naturalWidth && image.naturalHeight ? [image.naturalWidth, image.naturalHeight] : false);
    onReady?.();
  };
  image.onerror = () => imageSizes.set(src, false);
  image.src = src;
  return null;
}

function backgroundTileSize(size, area, width, height) {
  if (size === 'cover' || size === 'contain') {
    const scale = (size === 'cover' ? Math.max : Math.min)(area.width / width, area.height / height);
    return [width * scale, height * scale];
  }
  const [first = 'auto', second = 'auto'] = size.split(/\s+/);
  const length = (value, total) => (value.endsWith('%') ? (total * parseFloat(value)) / 100 : parseFloat(value));
  let tileWidth = first === 'auto' ? null : length(first, area.width);
  let tileHeight = second === 'auto' ? null : length(second, area.height);
  if (tileWidth === null && tileHeight === null) return [width, height];
  if (tileWidth === null) tileWidth = (tileHeight * width) / height;
  if (tileHeight === null) tileHeight = (tileWidth * height) / width;
  return [tileWidth, tileHeight];
}

/**
 * Pixel da camada de fundo de cima quando ela é uma url(), no ponto (x, y);
 * undefined quando a camada de cima não é imagem ou o ponto fica fora dela.
 */
export function sampleBackgroundImage(element, style, x, y, onReady) {
  const image = style.backgroundImage;
  if (!image || image === 'none' || !image.includes('url(')) return undefined;
  const top = layers(image)[0].match(URL_LAYER);
  if (!top) return undefined;
  const src = new URL(top[2], element.ownerDocument.baseURI).href;
  const size = naturalSize(src, onReady);
  if (size === false) return { blocked: true };
  if (!size) return null;
  const [width, height] = size;
  const pick = (value) => layers(value || '')[0] || '';
  const area = box(element, style, pick(style.backgroundOrigin) === 'content-box' ? 'content' : 'padding');
  const [tileWidth, tileHeight] = backgroundTileSize(pick(style.backgroundSize) || 'auto', area, width, height);
  if (!(tileWidth > 0 && tileHeight > 0)) return undefined;
  const left = area.left + offset(pick(style.backgroundPositionX) || '0%', area.width - tileWidth);
  const topEdge = area.top + offset(pick(style.backgroundPositionY) || '0%', area.height - tileHeight);
  const repeat = pick(style.backgroundRepeat) || 'repeat';
  const repeatX = /^(repeat|round|space)( |$)/.test(repeat) || repeat === 'repeat-x';
  const repeatY = /(^| )(repeat|round|space)$/.test(repeat) || repeat === 'repeat-y';
  let dx = x - left;
  let dy = y - topEdge;
  if (repeatX) dx = ((dx % tileWidth) + tileWidth) % tileWidth;
  if (repeatY) dy = ((dy % tileHeight) + tileHeight) % tileHeight;
  if (!(dx >= 0 && dy >= 0 && dx < tileWidth && dy < tileHeight)) return undefined;
  return samplePixel(src, (dx / tileWidth) * width, (dy / tileHeight) * height, { onReady });
}
