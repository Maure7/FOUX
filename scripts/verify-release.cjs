const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function verifyRelease(root, platform = 'windows') {
  if (platform !== 'windows') throw new Error('Somente a distribuição Windows é suportada');
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const filename = 'FOUX-Setup-' + version + '.exe';
  const data = fs.readFileSync(path.join(root, 'release', filename));
  if (data.length < 64) throw new Error('Artefato incompleto: ' + filename);
  if (data.subarray(0, 2).toString() !== 'MZ') throw new Error('Instalador Windows inválido');
  const checksum = crypto.createHash('sha256').update(data).digest('hex');
  fs.writeFileSync(path.join(root, 'release/SHA256SUMS-windows.txt'), checksum + '  ' + filename + '\n');
  console.log('Verificado: ' + filename + ' (' + data.length + ' bytes)');
  return [filename];
}

if (require.main === module) {
  try { verifyRelease(path.resolve(__dirname, '..'), process.argv[2]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { verifyRelease };
