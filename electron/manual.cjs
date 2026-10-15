const path = require('node:path');

// Only the two manuals linked by this renderer may open in the system viewer.
function resolveManualPath(url, appUrl, resourceDirectory) {
  for (const filename of ['manual_pt.pdf', 'manual_es.pdf']) {
    if (url === new URL(`docs/${filename}`, appUrl).href) {
      return path.join(resourceDirectory, 'docs', filename);
    }
  }
  return null;
}

module.exports = { resolveManualPath };
