const path = require('node:path');
const { spawn } = require('node:child_process');
const { verifyRelease } = require('./verify-release.cjs');

async function buildRelease({ root = path.resolve(__dirname, '..'), host = process.platform,
  run = runCommand } = {}) {
  if (host !== 'win32') throw new Error('Gere a distribuição em um computador Windows.');
  await run(process.execPath, [path.join(root, 'scripts/generate-icons.cjs')], root);
  await run(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build'], root);
  await run(process.execPath, [path.join(root, 'node_modules/electron-builder/cli.js'),
    '--win', 'nsis', '--x64', '--publish', 'never'], root);
  verifyRelease(root);
  console.log('Distribuição Windows concluída em ' + path.join(root, 'release'));
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(command, args, { cwd, env, stdio: 'inherit', windowsHide: true, shell: false });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(path.basename(command) + ' falhou (' + (signal || code) + ')')));
  });
}

if (require.main === module) {
  buildRelease().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
module.exports = { buildRelease };
