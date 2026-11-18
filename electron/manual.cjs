const path = require('node:path');
const { filePathFromUrl, isFileUrlFor } = require('./app-url.cjs');

const MANUALS = ['manual_pt.pdf', 'manual_es.pdf'];

// Só os dois manuais linkados pelo app abrem no visualizador do sistema, sempre a
// partir da pasta de recursos, qualquer que seja o caminho de instalação.
function resolveManualPath(url, appUrl, resourceDirectory) {
  const appFile = filePathFromUrl(appUrl);
  if (!appFile) return null;
  for (const filename of MANUALS) {
    if (isFileUrlFor(url, path.join(path.dirname(appFile), 'docs', filename))) {
      return path.join(resourceDirectory, 'docs', filename);
    }
  }
  return null;
}

module.exports = { resolveManualPath };
