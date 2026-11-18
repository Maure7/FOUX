const path = require('node:path');
const { fileURLToPath } = require('node:url');

// Node e Chromium codificam a mesma pasta de jeitos diferentes: "[", "]" e "~" ficam
// literais na URL do Chromium e escapados no pathToFileURL. Por isso a origem do app é
// conferida pelo caminho decodificado, nunca pela string da URL.
function filePathFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'file:' ? fileURLToPath(parsed) : null;
  } catch {
    // URL inválida ou com "/" e "\" escapados, que o fileURLToPath recusa.
    return null;
  }
}

function samePath(first, second) {
  const a = path.resolve(first);
  const b = path.resolve(second);
  // O NTFS não diferencia maiúsculas de minúsculas.
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

// Hash e query não mudam o arquivo carregado.
function isFileUrlFor(url, filename) {
  const file = filePathFromUrl(url);
  return file !== null && samePath(file, filename);
}

module.exports = { filePathFromUrl, isFileUrlFor, samePath };
