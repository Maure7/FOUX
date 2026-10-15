const fs = require('node:fs');
const path = require('node:path');

module.exports = (context) => {
  if (context.electronPlatformName !== 'win32') {
    throw new Error('O FOUX distribui somente executáveis Windows. Use npm run dist:win.');
  }
  const required = [
    'dist/index.html', 'electron/main.cjs', 'electron/preload.cjs',
    'electron/data-store.cjs', 'electron/manual.cjs',
    'public/docs/manual_pt.pdf', 'public/docs/manual_es.pdf',
    'build/icon.ico', 'build/icons/512x512.png',
  ];
  for (const filename of required) {
    if (!fs.existsSync(path.join(context.packager.projectDir, filename))) {
      throw new Error(`Recurso ausente: ${filename}. Execute npm run build:desktop antes de empacotar.`);
    }
  }
};
