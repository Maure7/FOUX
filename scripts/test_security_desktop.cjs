const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { isFileUrlFor, filePathFromUrl } = require('../electron/app-url.cjs');
const { resolveManualPath } = require('../electron/manual.cjs');

// URLs copiadas do Chromium do Electron 44 (mainFrame.url) para pastas com caracteres especiais.
const INSTALL = 'C:\\Users\\Aluno\\Apps\\FOUX [2026] ~ ç ^ ; & !\\resources\\app.asar\\dist\\index.html';
const CHROMIUM_URL = 'file:///C:/Users/Aluno/Apps/FOUX%20[2026]%20~%20%C3%A7%20%5E%20;%20&%20!/resources/app.asar/dist/index.html';
const onWindows = process.platform === 'win32';

test('app origin is recognized by path, whatever encoding Chromium uses for the install folder', { skip: !onWindows }, () => {
  const nodeUrl = pathToFileURL(INSTALL).href;
  assert.notEqual(nodeUrl, CHROMIUM_URL, 'as duas codificações diferem: comparar strings rejeitava o próprio app');
  assert.equal(isFileUrlFor(CHROMIUM_URL, INSTALL), true);
  assert.equal(isFileUrlFor(nodeUrl, INSTALL), true);
  assert.equal(isFileUrlFor(`${CHROMIUM_URL}#editor`, INSTALL), true);
  assert.equal(isFileUrlFor(CHROMIUM_URL.toLowerCase().replace('file:///c:', 'file:///C:'), INSTALL), true);
  for (const percent of ['C:\\FOUX %41 #1\\dist\\index.html', 'C:\\Programas (x86)\\FOUX\\dist\\index.html']) {
    assert.equal(isFileUrlFor(pathToFileURL(percent).href, percent), true);
  }
  assert.equal(isFileUrlFor(CHROMIUM_URL.replace('index.html', 'outro.html'), INSTALL), false);
  assert.equal(isFileUrlFor('https://example.com/dist/index.html', INSTALL), false);
  assert.equal(isFileUrlFor('file:///C:/Users/Aluno/Apps/FOUX%2Fdist/index.html', INSTALL), false);
  assert.equal(isFileUrlFor('not a url', INSTALL), false);
  assert.equal(filePathFromUrl('about:blank'), null);
});

test('manual links resolve to the packaged resources from special install folders', { skip: !onWindows }, () => {
  const resources = 'C:\\Users\\Aluno\\Apps\\FOUX [2026] ~ ç ^ ; & !\\resources';
  for (const language of ['pt', 'es']) {
    const link = new URL(`docs/manual_${language}.pdf`, CHROMIUM_URL).href;
    const expected = path.join(resources, 'docs', `manual_${language}.pdf`);
    assert.equal(resolveManualPath(link, pathToFileURL(INSTALL).href, resources), expected);
    assert.equal(resolveManualPath(`${link}#page=2`, pathToFileURL(INSTALL).href, resources), expected);
    assert.equal(resolveManualPath(new URL(`../docs/manual_${language}.pdf`, CHROMIUM_URL).href, pathToFileURL(INSTALL).href, resources), null);
  }
  assert.equal(resolveManualPath(new URL('docs/../../evil.pdf', CHROMIUM_URL).href, pathToFileURL(INSTALL).href, resources), null);
  assert.equal(resolveManualPath('docs/manual_pt.pdf', 'invalid', resources), null);
});

const main = fs.readFileSync(path.join(__dirname, '../electron/main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(__dirname, '../electron/preload.cjs'), 'utf8');

test('every window is isolated, sandboxed and cannot navigate or open popups', () => {
  assert.match(main, /app\.enableSandbox\(\)/);
  const windows = [...main.matchAll(/new BrowserWindow\(\{([\s\S]*?)\n {2}\}\);/g)].map((match) => match[1]);
  assert.equal(windows.length, 2);
  for (const options of windows) {
    assert.match(options, /nodeIntegration: false/);
    assert.match(options, /contextIsolation: true/);
    assert.match(options, /sandbox: true/);
  }
  assert.doesNotMatch(main, /webSecurity:\s*false|allowRunningInsecureContent|nodeIntegrationInSubFrames|webviewTag:\s*true|enableBlinkFeatures|experimentalFeatures/);
  assert.doesNotMatch(main, /openExternal|loadFile\(/);
  assert.match(main, /'will-navigate', \(event\) => event\.preventDefault\(\)/);
  assert.match(main, /setWindowOpenHandler\([\s\S]*?return \{ action: 'deny' \}/);
  assert.match(main, /callback\(false\)/);
  assert.equal((main.match(/lockNavigation\(/g) || []).length, 3);
});

test('IPC accepts only the trusted main frame and the preload exposes a minimal API', () => {
  for (const channel of ['foux:storage', 'foux:close-ready', 'foux:close-error', 'foux:request-close', 'foux:legacy-storage']) {
    assert.ok(main.includes(`'${channel}'`), channel);
  }
  // Um uso por canal: armazenamento, migração e os três do fechamento.
  assert.equal((main.match(/(?<!function )isTrustedSender\(event\)/g) || []).length, 5);
  assert.match(main, /frame === event\.sender\.mainFrame && isFileUrlFor\(frame\.url, appFile\)/);
  assert.equal((preload.match(/exposeInMainWorld/g) || []).length, 1);
  const exposed = preload.slice(preload.indexOf("contextBridge.exposeInMainWorld('fouxDesktop'"));
  assert.ok(exposed.length < preload.length);
  // Dentro da ponte o ipcRenderer só aparece chamado por uma função própria, nunca entregue à página.
  assert.doesNotMatch(exposed, /\bipcRenderer\b(?!\.(?:send|sendSync|on|removeListener)\()/);
  assert.doesNotMatch(preload, /require\(['"](?!electron['"])/);
});

test('installer ships no runtime npm packages and no duplicate manuals', () => {
  const metadata = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  // O renderer vai empacotado pelo Vite em dist/: dependências de produção só inchariam o app.asar.
  assert.deepEqual(Object.keys(metadata.dependencies || {}), []);
  for (const name of ['react', 'react-dom', 'lucide-react']) assert.ok(metadata.devDependencies[name], name);
  assert.ok(metadata.build.files.includes('!dist/docs/**'));
  assert.notEqual(metadata.build.asar, false);
  assert.deepEqual(metadata.build.extraResources.map((entry) => entry.to), ['docs']);
});

test('production pages carry a restrictive script policy that still renders the student HTML', async () => {
  const { CONTENT_SECURITY_POLICY, contentSecurityPolicy } = await import(pathToFileURL(path.join(__dirname, '../vite.config.js')).href);
  const directives = Object.fromEntries(CONTENT_SECURITY_POLICY.split(';').map((part) => {
    const [name, ...values] = part.trim().split(/\s+/);
    return [name, values];
  }));
  assert.deepEqual(directives['script-src'], ["'self'"]);
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['form-action'], ["'none'"]);
  for (const name of ['style-src', 'img-src', 'font-src', 'media-src', 'connect-src', 'frame-src']) {
    for (const source of ['https:', 'data:', 'blob:']) assert.ok(directives[name].includes(source), `${name} ${source}`);
  }
  assert.ok(directives['style-src'].includes("'unsafe-inline'"));
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /unsafe-eval/);
  const plugin = contentSecurityPolicy();
  assert.equal(plugin.apply, 'build');
  const [tag] = plugin.transformIndexHtml();
  assert.equal(tag.injectTo, 'head-prepend');
  assert.equal(tag.attrs['http-equiv'], 'Content-Security-Policy');
});
