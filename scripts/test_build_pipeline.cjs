const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { buildRelease } = require('./build-release.cjs');
const { verifyRelease } = require('./verify-release.cjs');
const { generateIcons } = require('./generate-icons.cjs');

test('Windows configuration follows builder schema and all CI jobs use Windows', async () => {
  const metadata = require('../package.json');
  const { validateConfiguration } = require('app-builder-lib/out/util/config/config');
  await validateConfiguration(metadata.build, { isEnabled: false });
  assert.deepEqual(metadata.build.win.target, [{ target: 'nsis', arch: ['x64'] }]);
  assert.match(metadata.scripts['electron:pack'], /--win --x64 --dir/);
  const workflow = require('js-yaml').load(fs.readFileSync('.github/workflows/desktop-build.yml', 'utf8'));
  for (const job of Object.values(workflow.jobs)) assert.equal(job['runs-on'], 'windows-2022');
  assert.equal(workflow.jobs.package.needs, 'renderer');
  assert.equal(workflow.jobs['draft-release'].needs, 'package');
  assert.ok(workflow.jobs.package.steps.some(step => step.run === 'npm run package:win'));
});

function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'foux-build-test-'));
  context.after(() => {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith('foux-build-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  for (const directory of ['release', 'public']) fs.mkdirSync(path.join(root, directory));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.2.3' }));
  fs.copyFileSync(path.resolve('public/favicon.svg'), path.join(root, 'public/favicon.svg'));
  return root;
}
function installer(root) {
  const data = Buffer.alloc(100); data.write('MZ');
  fs.writeFileSync(path.join(root, 'release/FOUX-Setup-1.2.3.exe'), data);
  return data;
}

test('release compiles once, packages explicit NSIS x64 and verifies the installer', async context => {
  const root = fixture(context);
  const calls = [];
  await buildRelease({ root, host: 'win32', run: async (command, args) => {
    calls.push({ command, args });
    if (calls.length === 3) installer(root);
  }});
  assert.equal(calls.length, 3);
  assert.match(calls[0].args[0], /generate-icons.cjs$/);
  assert.equal(calls[1].args.at(-1), 'build');
  assert.deepEqual(calls[2].args.slice(1), ['--win', 'nsis', '--x64', '--publish', 'never']);
  assert.ok(calls.every(call => call.command === process.execPath));
  assert.deepEqual(verifyRelease(root), ['FOUX-Setup-1.2.3.exe']);
  const digest = crypto.createHash('sha256').update(installer(root)).digest('hex');
  assert.equal(fs.readFileSync(path.join(root, 'release/SHA256SUMS-windows.txt'), 'utf8'), digest + '  FOUX-Setup-1.2.3.exe\n');
});

test('unsupported hosts fail before compiling and packaging failure cannot validate old artifacts', async context => {
  const root = fixture(context);
  let calls = 0;
  await assert.rejects(buildRelease({ root, host: 'unsupported', run() { calls++; } }), /Windows/);
  assert.equal(calls, 0);
  installer(root);
  await assert.rejects(buildRelease({ root, host: 'win32', run: async () => {
    if (++calls === 3) throw new Error('Packaging failed');
  }}), /Packaging failed/);
  assert.equal(fs.existsSync(path.join(root, 'release/SHA256SUMS-windows.txt')), false);
});

test('missing, truncated and invalid installers fail verification', context => {
  const root = fixture(context);
  assert.throws(() => verifyRelease(root), /ENOENT/);
  const filename = path.join(root, 'release/FOUX-Setup-1.2.3.exe');
  fs.writeFileSync(filename, 'MZ');
  assert.throws(() => verifyRelease(root), /incompleto/);
  fs.writeFileSync(filename, Buffer.alloc(100));
  assert.throws(() => verifyRelease(root), /Instalador Windows/);
});

test('SVG-derived icon contains valid Windows ICO frames', context => {
  const root = fixture(context);
  generateIcons(root);
  const ico = fs.readFileSync(path.join(root, 'build/icon.ico'));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 6);
  assert.equal(ico[6 + 5 * 16], 0);
  for (let index = 0; index < 6; index++) {
    const offset = ico.readUInt32LE(6 + index * 16 + 12);
    assert.equal(ico.subarray(offset + 1, offset + 4).toString(), 'PNG');
  }
});
