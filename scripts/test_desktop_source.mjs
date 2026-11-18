// Abre o Electron a partir do código-fonte (sem empacotar) numa pasta com [ ] ~ ç % # no nome
// e confere: IPC confiável, CSP ativa, sandbox, edição real, manual nativo e gravação no fechamento.
// Uso: npm run test:desktop:source (gera um build temporário; não toca em dist/ nem em release/).
// FOUX_SOURCE_ELECTRON=<pasta> testa outra cópia de electron/ (ex.: o backup anterior às correções).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();
const temporary = await mkdtemp(path.join(tmpdir(), 'foux-source-test-'));
const appDirectory = path.join(temporary, 'FOUX [teste] ~ ç %41 #1');
const profile = path.join(temporary, 'profile');
const electron = path.join(root, 'node_modules/electron/dist/electron.exe');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
let child;
let socket;
let requestId = 0;
const pending = new Map();
const consoleErrors = [];

async function eventually(check, message, attempts = 150) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { const result = await check(); if (result) return result; } catch { /* Ainda iniciando. */ }
    await delay(100);
  }
  throw new Error(message);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
    process.once('error', reject);
    process.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(command)} saiu com ${code}`))));
  });
}

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (socket.readyState !== WebSocket.OPEN) { reject(new Error('DevTools closed')); return; }
    const id = ++requestId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 5000);
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

async function connect(target) {
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') consoleErrors.push(JSON.stringify(message.params.exceptionDetails));
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') consoleErrors.push(message.params.entry.text);
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
  await command('Log.enable');
}

async function launch(port, inspectPort) {
  child = spawn(electron, [appDirectory, `--remote-debugging-port=${port}`, `--inspect=${inspectPort}`, `--user-data-dir=${profile}`], {
    env, windowsHide: true, stdio: 'ignore',
  });
  child.on('error', (error) => console.error(error));
  // A janela da migração também carrega o app, mas sem a ponte fouxDesktop.
  await eventually(async () => {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) })).json();
    for (const target of targets.filter((item) => item.type === 'page' && item.url.startsWith('file:'))) {
      await connect(target);
      if (await evaluate('!!window.fouxDesktop && !!document.querySelector("#header")').catch(() => false)) return true;
      socket.close();
    }
    return false;
  }, 'O app não abriu a partir do código-fonte (IPC rejeitado ou página em branco)');
}

async function close(expression = 'window.close()') {
  const exited = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('O Electron não salvou e fechou')), 15000);
    child.once('exit', (code) => { clearTimeout(timer); resolve(code); });
  });
  await evaluate(expression).catch((error) => {
    if (!error.message.includes('closed')) throw error;
  });
  assert.equal(await exited, 0);
  socket.close();
  child = null;
}

async function inspectMain(port, expression) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const inspector = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { inspector.onopen = resolve; inspector.onerror = reject; });
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Inspector do processo principal não respondeu')), 3000);
      inspector.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (message.id !== 1) return;
        clearTimeout(timer);
        if (message.error || message.result.exceptionDetails) reject(new Error(JSON.stringify(message)));
        else resolve(message.result.result.value);
      };
      inspector.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
    });
  } finally {
    inspector.close();
  }
}

try {
  // Build temporário: o dist/ do projeto e os pacotes em release/ ficam intactos.
  await run(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', path.join(appDirectory, 'dist'), '--emptyOutDir', '--logLevel', 'error']);
  await cp(path.resolve(root, process.env.FOUX_SOURCE_ELECTRON || 'electron'), path.join(appDirectory, 'electron'), { recursive: true });
  await cp(path.join(root, 'package.json'), path.join(appDirectory, 'package.json'));
  // Fora do pacote, o app procura os manuais em public/docs; o conteúdo não importa aqui.
  await mkdir(path.join(appDirectory, 'public/docs'), { recursive: true });
  for (const language of ['pt', 'es']) await writeFile(path.join(appDirectory, `public/docs/manual_${language}.pdf`), '%PDF-1.4');

  await launch(9361, 9362);
  assert.equal(await evaluate('typeof require + "/" + typeof process'), 'undefined/undefined');
  assert.equal(await evaluate('typeof window.fouxDesktop.storage.snapshot()'), 'object');
  assert.ok(await evaluate('!!document.querySelector(\'meta[http-equiv="Content-Security-Policy"]\')'), 'CSP ausente no build');

  const html = `<!DOCTYPE html><html><head><style>.card { padding: 12px; border: 2px solid #333; border-radius: 8px; }
    @font-face { font-family: 'Aluno'; src: url('data:font/woff2;base64,AAAA') format('woff2'); }
    .grad { background-image: linear-gradient(90deg, #ff0000, #0000ff); }</style></head>
    <body><h1 id="alvo" style="color: rgb(10, 20, 30)">Página do aluno</h1>
    <img id="foto" alt="pixel" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">
    <div class="card grad" id="cartao">Cartão</div><form action="https://example.com"><button>Enviar</button></form></body></html>`;
  await evaluate(`window.fouxDesktop.storage.setItem('foux_tutorial_completed', 'true');
    window.fouxDesktop.storage.setItem('foux_projects', JSON.stringify([{id:'source-test',name:'Projeto do aluno',folderId:null,htmlContent:${JSON.stringify(html)},createdAt:'2026-11-14',updatedAt:'2026-11-14'}]))`);
  await command('Page.reload');
  await eventually(() => evaluate('!!document.querySelector(".project-card--saved")'), 'Projeto semeado não apareceu');
  await evaluate('window.__cspViolations = []; document.addEventListener("securitypolicyviolation", (event) => window.__cspViolations.push(event.violatedDirective + " " + event.blockedURI));');
  await evaluate('document.querySelector(".project-card--saved").click()');
  await eventually(() => evaluate('document.querySelector(".editor-canvas__iframe")?.contentDocument?.readyState === "complete" && !!document.querySelector(".editor-canvas__iframe").contentDocument.getElementById("alvo")'), 'O editor não carregou o HTML do aluno');
  await evaluate(`(() => {
    const doc = document.querySelector('.editor-canvas__iframe').contentDocument;
    doc.addEventListener('securitypolicyviolation', (event) => window.__cspViolations.push('iframe ' + event.violatedDirective + ' ' + event.blockedURI));
    doc.getElementById('alvo').click();
  })()`);
  await eventually(() => evaluate('!!document.querySelector(\'input[type="color"]:not(:disabled)\')'), 'O inspector não selecionou o elemento');
  const page = await evaluate(`(async () => {
    const doc = document.querySelector('.editor-canvas__iframe').contentDocument;
    const image = doc.getElementById('foto');
    await image.decode().catch(() => {});
    const blob = await (await fetch(URL.createObjectURL(new Blob(['ok'])))).text();
    return {
      image: image.naturalWidth,
      gradient: doc.defaultView.getComputedStyle(doc.getElementById('cartao')).backgroundImage.startsWith('linear-gradient'),
      radius: doc.defaultView.getComputedStyle(doc.getElementById('cartao')).borderTopLeftRadius,
      blob,
    };
  })()`);
  assert.deepEqual(page, { image: 1, gradient: true, radius: '8px', blob: 'ok' });
  assert.deepEqual(await evaluate('window.__cspViolations'), [], 'A CSP bloqueou algo do app ou do HTML do aluno');

  // Manual com a pasta de instalação cheia de caracteres especiais.
  await inspectMain(9362, `globalThis.manualCalls = []; globalThis.originalOpenPath = process.mainModule.require('electron').shell.openPath; process.mainModule.require('electron').shell.openPath = async (file) => { manualCalls.push(file); return ''; }; 'ok'`);
  await evaluate('document.querySelector(\'[aria-label="Ajuda"]\').click()');
  await eventually(() => evaluate('!!document.querySelector(".faq-manual__button")'), 'A ajuda não abriu');
  await evaluate('document.querySelector(".faq-manual__button").click()');
  await eventually(async () => (await inspectMain(9362, 'globalThis.manualCalls.length')) === 1, 'O clique no manual não chegou ao processo principal');
  assert.equal((await inspectMain(9362, 'globalThis.manualCalls[0]')).toLowerCase(), path.join(appDirectory, 'public/docs/manual_pt.pdf').toLowerCase());
  await inspectMain(9362, `process.mainModule.require('electron').shell.openPath = globalThis.originalOpenPath; 'ok'`);
  await evaluate('document.querySelector(".faq-modal .modal-close").click()');

  // A CSP está valendo de fato. O código do próprio DevTools é isento, então o teste usa
  // o que a página executaria sozinha: script inline e setTimeout com string (eval).
  const blocked = await evaluate(`new Promise((resolve) => {
    window.__cspViolations = [];
    const script = document.createElement('script');
    script.textContent = 'window.__inline = 1';
    document.head.append(script);
    setTimeout('window.__timer = 1', 0);
    setTimeout(() => resolve({ inline: typeof window.__inline, timer: typeof window.__timer, violations: window.__cspViolations.map((item) => item.split(' ')[0]).sort() }), 200);
  })`);
  assert.equal(blocked.inline, 'undefined');
  assert.equal(blocked.timer, 'undefined');
  assert.ok(blocked.violations.some((directive) => directive.startsWith('script-src')), JSON.stringify(blocked.violations));

  // Fecha na mesma tarefa de uma edição real: o autosave de 800 ms não chega a rodar.
  await close(`(() => {
    const input = document.querySelector('input[type="color"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '#123456');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    window.close();
  })()`);
  const filename = path.join(profile, 'foux-data.json');
  const saved = JSON.parse(await readFile(filename, 'utf8')).data;
  assert.ok(JSON.parse(saved.foux_projects)[0].htmlContent.includes('rgb(18, 52, 86)'), 'A edição não foi gravada no fechamento');
  assert.equal(await readFile(`${filename}.bak`, 'utf8'), await readFile(filename, 'utf8'), 'O backup não ficou igual ao estado salvo');

  await launch(9363, 9364);
  await evaluate('document.querySelector(".project-card--saved").click()');
  await eventually(() => evaluate(`document.querySelector('.editor-canvas__iframe')?.contentDocument?.getElementById('alvo')?.style.color === 'rgb(18, 52, 86)'`), 'A edição não sobreviveu à reabertura');
  await close();
  assert.deepEqual(consoleErrors.filter((text) => /Content Security Policy|Refused to/i.test(text) && !/eval|inline/i.test(text)), []);
  console.log('PASS: Electron a partir do código numa pasta com [ ] ~ ç % #: IPC confiável, CSP ativa sem bloquear o HTML do aluno, sandbox, manual nativo e gravação no fechamento');
} finally {
  socket?.close();
  if (child) {
    child.kill();
    await delay(1000);
  }
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
