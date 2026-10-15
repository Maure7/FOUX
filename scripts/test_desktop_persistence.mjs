import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { TUTORIAL_HTML, TUTORIAL_PROJECT_NAME } from '../src/utils/tutorialTemplate.js';

const root = process.cwd();
const temporary = await mkdtemp(path.join(tmpdir(), 'foux-desktop-test-'));
const profile = path.join(temporary, 'profile');
const executable = path.join(root, 'release/win-unpacked/FOUX.exe');
const appFile = path.join(root, 'release/win-unpacked/resources/app.asar/dist/index.html');
const electron = path.join(root, 'node_modules/electron/dist/electron.exe');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
let child;
let socket;
let requestId = 0;
const pending = new Map();

async function eventually(check, message) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { const result = await check(); if (result) return result; } catch { /* Wait for startup. */ }
    await delay(100);
  }
  throw new Error(message);
}
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (socket.readyState !== WebSocket.OPEN) { reject(new Error('DevTools closed')); return; }
    const id = ++requestId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 1000);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timeout); resolve(value); },
      reject: (error) => { clearTimeout(timeout); reject(error); },
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function launch(binary, args, port) {
  console.log(`Launching ${path.basename(binary)} on port ${port}`);
  child = spawn(binary, [...args, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`], {
    env, windowsHide: true, stdio: 'ignore',
  });
  child.on('error', (error) => console.error(error));
  // The one-time migration briefly opens and destroys a hidden renderer.
  await delay(1000);
  const target = await eventually(async () => {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) })).json();
    return targets.find((target) => target.type === 'page' && target.url.startsWith('file:'));
  }, 'Electron did not open the application');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') console.error(JSON.stringify(message.params.exceptionDetails));
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  };
  socket.onclose = () => {
    for (const request of pending.values()) request.reject(new Error('DevTools closed'));
    pending.clear();
  };
  await command('Runtime.enable');
  await eventually(() => evaluate('!!document.querySelector("#header")'), 'Dashboard did not render');
}
async function close(expression = 'window.close()') {
  const exited = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Electron failed to save and close')), 12000);
    child.once('exit', (code) => { clearTimeout(timer); resolve(code); });
  });
  await evaluate(expression).catch((error) => {
    if (!error.message.includes('closed')) throw error;
  });
  assert.equal(await exited, 0);
  socket.close();
  child = null;
}

// Capture the system-viewer call in the main process of the real packaged app,
// without leaving PDF viewer windows open on the user's desktop.
async function checkNativeManual(language) {
  const targets = await (await fetch('http://127.0.0.1:9351/json/list')).json();
  const inspector = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { inspector.onopen = resolve; inspector.onerror = reject; });
  let id = 0;
  const inspect = (expression) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => reject(new Error('Main-process inspector timeout')), 3000);
    inspector.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id !== requestId) return;
      clearTimeout(timer);
      if (message.error || message.result.exceptionDetails) reject(new Error(JSON.stringify(message)));
      else resolve(message.result.result.value);
    };
    inspector.send(JSON.stringify({ id: requestId, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
  });
  try {
    await inspect(`globalThis.manualCalls = []; globalThis.originalOpenPath = process.mainModule.require('electron').shell.openPath; process.mainModule.require('electron').shell.openPath = async file => { manualCalls.push(file); return ''; }; 'ready'`);
    await evaluate(`document.querySelector('[aria-label="${language === 'es' ? 'Ayuda' : 'Ajuda'}"]').click()`);
    await eventually(() => evaluate(`!!document.querySelector('.faq-manual__button')`), 'Packaged help did not open');
    await evaluate(`document.querySelector('.faq-manual__button').click()`);
    await eventually(async () => (await inspect('globalThis.manualCalls.length')) === 1, 'Manual click did not reach the native handler');
    assert.equal(await inspect('globalThis.manualCalls[0]'), path.join(root, `release/win-unpacked/resources/docs/manual_${language}.pdf`));
    await inspect(`process.mainModule.require('electron').shell.openPath = globalThis.originalOpenPath; 'restored'`);
    await evaluate(`document.querySelector('.faq-modal .modal-close').click()`);
  } finally {
    inspector.close();
  }
}

try {
  for (const language of ['pt', 'es']) {
    assert.deepEqual(await readFile(path.join(root, `release/win-unpacked/resources/docs/manual_${language}.pdf`)),
      await readFile(path.join(root, `public/docs/manual_${language}.pdf`)));
  }
  // Seed the old default Chromium session using the same packaged file URL.
  const legacyMain = path.join(temporary, 'legacy.cjs');
  await writeFile(legacyMain, `
    const {app, BrowserWindow} = require('electron');
    app.setPath('userData', ${JSON.stringify(profile)});
    app.whenReady().then(() => {
      const window = new BrowserWindow({show: false, webPreferences: {sandbox: true, contextIsolation: true}});
      window.loadFile(${JSON.stringify(appFile)});
    });
    app.on('window-all-closed', () => app.quit());
  `);
  await launch(electron, [legacyMain], 9346);
  const project = { id: 'persist-test', folderId: null, name: TUTORIAL_PROJECT_NAME,
    htmlContent: TUTORIAL_HTML.replace(/src="https:[^"]*"/g, 'src="data:,"'),
    htmlFileName: 'tutorial.html', showTutorialTips: false, createdAt: '2026-10-13', updatedAt: '2026-10-13' };
  const legacy = {
    foux_projects: JSON.stringify([project]), foux_theme: 'light', foux_language: 'es',
    foux_global_tutorial_tips: 'false', foux_tutorial_completed: 'true',
    foux_activities: JSON.stringify([{ id: 'history-test', actionKey: 'activity.open_tutorial', params: {}, timestamp: 1 }]),
    foux_folders: JSON.stringify([{ id: 'folder-test', name: 'Minha pasta' }]),
    foux_user_profile: JSON.stringify({ name: 'Perfil de teste', avatar: null, bio: 'Persistente' }),
  };
  await evaluate(`Object.entries(${JSON.stringify(legacy)}).forEach(([key, value]) => localStorage.setItem(key, value))`);
  await close();

  await launch(executable, ['--inspect=9351'], 9347);
  assert.equal(await evaluate('document.documentElement.dataset.theme'), 'light');
  assert.equal(await evaluate('document.documentElement.lang'), 'es-419');
  assert.equal(await evaluate("JSON.parse(window.fouxDesktop.storage.snapshot().foux_projects)[0].id"), 'persist-test');
  assert.equal(await evaluate('typeof require'), 'undefined');
  await checkNativeManual('es');
  await evaluate('document.querySelector(".project-card--saved").click()');
  await eventually(() => evaluate('!!document.querySelector(".editor-canvas__iframe")?.contentDocument?.getElementById("titulo-ejercicio")'), 'Spanish tutorial did not load');
  await eventually(() => evaluate('document.querySelector("iframe").contentDocument.readyState === "complete"'), 'Iframe did not finish loading');
  await evaluate(`document.querySelector('iframe').contentDocument.getElementById('titulo-ejercicio').click()`);
  await eventually(() => evaluate('!!document.querySelector(\'input[type="color"]:not(:disabled)\')'), 'Inspector did not select the element');
  await evaluate(`window.addEventListener('foux:before-close', () => {
    window.fouxDesktop.storage.setItem('foux_test_close_signal', JSON.stringify({
      html: document.querySelector('iframe')?.contentDocument?.documentElement?.outerHTML,
    }));
  })`);
  // Close in the SAME task as a real sidebar edit: the 800 ms debounce cannot run.
  await close(`(() => {
    const input = document.querySelector('input[type="color"]');
    if (!input) throw new Error('Missing inspector color input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '#123456');
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
    if (document.querySelector('iframe').contentDocument.getElementById('titulo-ejercicio').style.color !== 'rgb(18, 52, 86)') {
      throw new Error('The real inspector edit did not apply');
    }
    window.close();
  })()`);
  let saved = JSON.parse(await readFile(path.join(profile, 'foux-data.json'), 'utf8')).data;
  assert.ok(saved.foux_test_close_signal?.includes('rgb(18, 52, 86)'), 'Close handshake did not flush the live document');
  assert.ok(JSON.parse(saved.foux_projects)[0].htmlContent.includes('rgb(18, 52, 86)'), 'Immediate edit was not saved to disk');
  assert.equal(saved.foux_theme, 'light');
  assert.equal(saved.foux_language, 'es');
  assert.ok(JSON.parse(saved.foux_activities).some((activity) => activity.id === 'history-test'));
  assert.equal(JSON.parse(saved.foux_folders)[0].id, 'folder-test');
  assert.equal(JSON.parse(saved.foux_user_profile).name, 'Perfil de teste');

  await launch(executable, [], 9348);
  await evaluate('document.querySelector(".project-card--saved").click()');
  await eventually(() => evaluate(`document.querySelector('iframe')?.contentDocument?.getElementById('titulo-ejercicio')?.style.color === 'rgb(18, 52, 86)'`), 'Edited Spanish styles did not survive reopening');
  await close();
  // A further restart must also retain the same data.
  await launch(executable, [], 9349);
  assert.equal(await evaluate('document.documentElement.dataset.theme'), 'light');
  await evaluate('document.querySelector(".header__icon-btn").click()');
  await eventually(() => evaluate('!!document.getElementById("theme-select")'), 'Settings did not open');
  await close(`(() => {
    const theme = document.getElementById('theme-select');
    theme.value = 'dark';
    theme.dispatchEvent(new Event('change', {bubbles: true}));
    const language = document.getElementById('language-select');
    language.value = 'pt';
    language.dispatchEvent(new Event('change', {bubbles: true}));
    window.close();
  })()`);
  await launch(executable, ['--inspect=9351'], 9350);
  assert.equal(await evaluate('document.documentElement.dataset.theme'), 'dark');
  assert.equal(await evaluate('document.documentElement.lang'), 'pt-BR');
  await checkNativeManual('pt');
  await evaluate('document.querySelector(".project-card--saved").click()');
  await eventually(() => evaluate(`document.querySelector('iframe')?.contentDocument?.getElementById('titulo-exercicio')?.style.color === 'rgb(18, 52, 86)'`), 'Portuguese tutorial did not preserve the Spanish edit');
  await close();
  console.log('PASS: packaged app opens both localized manuals through the native handler, migrates tutorials and preserves edits, history and preferences across restarts and languages');
} finally {
  socket?.close();
  if (child) {
    child.kill();
    await delay(1000);
  }
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
