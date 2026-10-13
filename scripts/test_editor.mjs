import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Uses an installed Chromium browser and its DevTools protocol; no test dependencies.
const browserPath = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
assert.ok(browserPath, 'Set CHROME_PATH to an installed Chromium browser');
const temporaryDir = await mkdtemp(path.join(tmpdir(), 'foux-editor-test-'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { windowsHide: true, stdio: 'ignore' });
let browser;
let socket;
const pending = new Map();
let requestId = 0;

async function eventually(check, message) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { const result = await check(); if (result) return result; } catch { /* Wait for readiness. */ }
    await delay(100);
  }
  throw new Error(message);
}

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const timer = setTimeout(() => reject(new Error(`DevTools timeout: ${method}`)), 10000);
    pending.set(id, {
      resolve: (result) => { clearTimeout(timer); resolve(result); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}

try {
  await eventually(async () => (await fetch('http://127.0.0.1:4175', {signal: AbortSignal.timeout(1000)})).ok, 'Vite did not start');
  console.log('Vite ready; starting Chromium');
  browser = spawn(browserPath, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=9224', `--user-data-dir=${path.join(temporaryDir, 'profile')}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  const target = await eventually(async () => {
    const targets = await (await fetch('http://127.0.0.1:9224/json/list', {signal: AbortSignal.timeout(1000)})).json();
    return targets.find((item) => item.type === 'page');
  }, 'Browser did not start');
  console.log('Chromium ready; testing editor');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  };
  await command('Page.enable');
  await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: temporaryDir });
  await command('Page.navigate', { url: 'http://127.0.0.1:4175' });
  await eventually(() => evaluate('!!document.querySelector(".dashboard") || !!document.querySelector(".project-card")'), 'App did not load');
  if (process.env.FOUX_UI_ONLY === '1') {
    await (await import('./test_ui_refinements.mjs')).runUiRefinements({ evaluate, command, eventually, temporaryDir });
  } else {
  const originalHtml = `<!doctype html><html><head><style>
    body { margin: 0; background: #fafafa; }
    .shared { color: #333; }
    /* This comment should not appear in the educational export. */
    .learn-title { font-size: 20px; margin: 10px; }
    .learn-title::before { content: "A; B, rgb(1, 2, 3) /* texto */"; }
    #priority { color: blue !important; }
    @media (min-width: 300px) { p { padding: 7px; } }
    @keyframes pulse { from { opacity: 0.5; } to { opacity: 1; } }
    </style></head><body>
    <h1 id="title:main" style="color: red; outline: 3px dotted blue">Título</h1>
    <p class="shared">Primeiro</p><p class="shared">Segundo</p>
    <div id="duplicate">A</div><div id="duplicate">B</div>
    <section id="secao-titulos" style="width: 240px; height: 140px; background-color: white; border: 8px solid #333;">Escala e borda</section>
    <button>Hover sem ID</button><footer style="margin-top: 1800px">Fim</footer>
    <span id="priority" style="color: red">Prioridade</span>
    <h2 class="learn-title">Título para aprender</h2>
    </body></html>`;
  await evaluate(`localStorage.clear(); localStorage.setItem('foux_projects', JSON.stringify([{id:'test',name:'Projeto1',folderId:null,htmlContent:${JSON.stringify(originalHtml)},createdAt:Date.now(),updatedAt:Date.now()}]));`);
  await command('Page.reload');
  await eventually(() => evaluate('!!document.querySelector(".project-card--saved")'), 'Project did not appear');
  await evaluate('document.querySelector(".project-card--saved").click()');
  await eventually(() => evaluate('!!document.querySelector(".editor-canvas__iframe")?.contentDocument?.getElementById("title:main")'), 'Editor did not load');
  assert.equal(await evaluate('document.body.innerText.includes("Importar CSS")'), false);

  await (await import('./test_style_regressions.mjs')).runStyleRegressions({ evaluate, command, eventually });

  // Exercise the real inspector and sidebar rather than only manipulating CSS.
  await evaluate(`document.querySelector('iframe').contentDocument.getElementById('title:main').click()`);
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.getElementById('title:main').style.outline`), 'blue dotted 3px');
  await evaluate(`(() => {
    const input = document.querySelector('.sidebar-styles input[type="color"]') || document.querySelector('input[type="color"]');
    if (!input) throw new Error('Missing color control');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '#123456');
    input.dispatchEvent(new Event('input', {bubbles:true}));
    input.dispatchEvent(new Event('change', {bubbles:true}));
  })()`);
  await eventually(() => evaluate(`document.querySelector('iframe').contentDocument.getElementById('title:main').style.color === 'rgb(18, 52, 86)'`), 'Sidebar edit was not applied');

  // Export must use the live DOM, including undo/redo, before autosave finishes.
  await evaluate(`document.querySelector('[aria-label="Desfazer alteração (Ctrl+Z)"]').click()`);
  await eventually(() => evaluate(`document.querySelector('iframe').contentDocument.getElementById('title:main')?.style.color === 'red'`), 'Undo did not restore the original color');
  assert.match(await evaluate(`(async () => {const {generateProjectCss} = await import('/src/utils/exportCss.js'); return generateProjectCss(document.querySelector('iframe').contentDocument);})()`), /color: red;/);
  await evaluate(`document.querySelector('[aria-label="Refazer alteração (Ctrl+Y)"]').click()`);
  await eventually(() => evaluate(`document.querySelector('iframe').contentDocument.getElementById('title:main')?.style.color === 'rgb(18, 52, 86)'`), 'Redo did not restore the edit');
  await evaluate(`document.querySelector('iframe').contentDocument.getElementById('title:main').click()`);

  await evaluate(`document.querySelector('iframe').contentDocument.querySelector('.learn-title').click()`);
  await evaluate(`(() => {
    const input = document.querySelector('input[type="color"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'#654321');
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await eventually(() => evaluate(`document.querySelector('iframe').contentDocument.querySelector('.learn-title').style.color === 'rgb(101, 67, 33)'`), 'Edit on a class selector failed');
  await evaluate(`document.querySelector('iframe').contentDocument.getElementById('title:main').click()`);

  const generated = await evaluate(`(async () => {
    const {generateProjectCss, getElementSelector} = await import('/src/utils/exportCss.js');
    const doc = document.querySelector('iframe').contentDocument;
    doc.querySelectorAll('p')[1].style.backgroundImage = 'linear-gradient(45deg, red, blue)';
    doc.querySelectorAll('[id="duplicate"]')[1].style.borderRadius = '19px';
    const button = doc.querySelector('button');
    button.classList.add('foux-hover-target-test');
    button.style.color = 'green';
    const hover = doc.createElement('style');
    hover.id = 'foux-user-hover-rules';
    hover.textContent = '.foux-hover-target-test:hover {color: orange !important; transform: scale(1.2) !important;}';
    doc.head.append(hover);
    const font = doc.createElement('style');
    font.textContent = '@font-face {font-family: Test; src: url("' + URL.createObjectURL(new Blob(['font-bytes'])) + '");}';
    doc.head.append(font);
    window.exportedCss = await generateProjectCss(doc);
    return { css: window.exportedCss, selectors: [...doc.querySelectorAll('p, [id="duplicate"]')].map(getElementSelector) };
  })()`);
  assert.match(generated.css, /#title\\:main/);
  assert.match(generated.css, /linear-gradient/);
  assert.match(generated.css, /@media/);
  assert.match(generated.css, /@keyframes/);
  assert.match(generated.css, /data:/);
  assert.match(generated.css, /\.learn-title \{\n  font-size: 20px;\n  margin: 10px;\n  color: #654321;\n\}/);
  assert.equal(generated.css.match(/\.learn-title \{/g).length, 1);
  assert.match(generated.css, /content: "A; B, rgb\(1, 2, 3\) \/\* texto \*\/";/);
  assert.doesNotMatch(generated.css, /This comment|CSS exportado|data:text\/css/);
  assert.doesNotMatch(generated.css, /blob:|data-foux-selected|data-foux-hovered|foux-inspector-styles|foux-hover-target-/);
  assert.equal(new Set(generated.selectors).size, 4);

  // Reapply to the untouched HTML, with no FOUX classes or attributes.
  await evaluate(`new Promise(resolve => {
    const iframe = document.createElement('iframe'); iframe.id = 'export-test';
    iframe.srcdoc = ${JSON.stringify(originalHtml)};
    iframe.onload = () => { const style = iframe.contentDocument.createElement('style'); style.textContent = window.exportedCss; iframe.contentDocument.head.append(style); resolve(true); };
    document.body.append(iframe);
  })`);
  const reapplied = await evaluate(`(() => {
    const doc = document.getElementById('export-test').contentDocument;
    const styles = el => doc.defaultView.getComputedStyle(el);
    return {
      color: styles(doc.getElementById('title:main')).color,
      outline: styles(doc.getElementById('title:main')).outlineStyle,
      gradient: styles(doc.querySelectorAll('p')[1]).backgroundImage,
      unchanged: styles(doc.querySelectorAll('p')[0]).backgroundImage,
      radius: styles(doc.querySelectorAll('[id="duplicate"]')[1]).borderRadius,
      button: styles(doc.querySelector('button')).color,
      learnTitle: styles(doc.querySelector('.learn-title')).color,
    };
  })()`);
  assert.equal(reapplied.color, 'rgb(18, 52, 86)');
  assert.equal(reapplied.outline, 'dotted');
  assert.match(reapplied.gradient, /linear-gradient/);
  assert.equal(reapplied.unchanged, 'none');
  assert.equal(reapplied.radius, '19px');
  assert.equal(reapplied.button, 'rgb(0, 128, 0)');
  assert.equal(reapplied.learnTitle, 'rgb(101, 67, 33)');
  assert.equal(await evaluate(`(() => {const iframe = document.getElementById('export-test'); return iframe.contentWindow.getComputedStyle(iframe.contentDocument.getElementById('priority')).color;})()`), 'rgb(0, 0, 255)');
  // Move the pointer over the external HTML to verify a real :hover match.
  const hoverPoint = await evaluate(`(() => {
    const iframe = document.getElementById('export-test');
    Object.assign(iframe.style, {position:'fixed',top:'0',left:'0',width:'500px',height:'500px',zIndex:'20000'});
    const rect = iframe.contentDocument.querySelector('button').getBoundingClientRect();
    return {x: rect.x + rect.width / 2 + 2, y: rect.y + rect.height / 2 + 2};
  })()`);
  await command('Input.dispatchMouseEvent', {type:'mouseMoved', ...hoverPoint});
  await eventually(() => evaluate(`(() => {const iframe = document.getElementById('export-test'); return iframe.contentWindow.getComputedStyle(iframe.contentDocument.querySelector('button')).color === 'rgb(255, 165, 0)';})()`), 'Exported hover did not apply');
  await evaluate('document.getElementById("export-test").remove()');
  await evaluate(`document.querySelector('[aria-label="Exportar CSS"]').click()`);
  const downloaded = await eventually(() => readFile(path.join(temporaryDir, 'Projeto1.css'), 'utf8'), 'CSS was not downloaded');
  assert.equal(downloaded, generated.css);
  // Interleaved style blocks and linked/imported CSS must retain cascade order.
  await evaluate(`new Promise(resolve => {
    const iframe = document.createElement('iframe'); iframe.id = 'cascade-test';
    const linkedUrl = URL.createObjectURL(new Blob(['#linked {color: blue}'], {type:'text/css'}));
    const importedUrl = URL.createObjectURL(new Blob(['#imported {color: purple}'], {type:'text/css'}));
    iframe.srcdoc = '<style>#linked, #imported {color:red}</style><link rel="stylesheet" href="' + linkedUrl + '"><style>@import url("' + importedUrl + '"); #linked {background:yellow}</style><p id="linked">Link</p><p id="imported">Import</p>';
    iframe.onload = resolve;
    document.body.append(iframe);
  })`);
  const cascadeCss = await evaluate(`(async () => { const {generateProjectCss} = await import('/src/utils/exportCss.js'); return generateProjectCss(document.getElementById('cascade-test').contentDocument); })()`);
  assert.doesNotMatch(decodeURIComponent(cascadeCss), /blob:/);
  assert.doesNotMatch(cascadeCss, /data:text\/css|@import/);
  assert.match(cascadeCss, /#linked \{\n  color: blue;\n\}/);
  await evaluate(`new Promise(resolve => {
    const iframe = document.getElementById('cascade-test');
    iframe.onload = () => {const doc = iframe.contentDocument; window.cascadeColors = ['linked','imported'].map(id => doc.defaultView.getComputedStyle(doc.getElementById(id)).color); resolve(true);};
    iframe.srcdoc = '<style>' + ${JSON.stringify(cascadeCss)} + '</style><p id="linked">Link</p><p id="imported">Import</p>';
  })`);
  assert.deepEqual(await evaluate('window.cascadeColors'), ['rgb(0, 0, 255)', 'rgb(128, 0, 128)']);
  await evaluate('document.getElementById("cascade-test").remove()');
  const educationalHtml = `<style>
    /* Comments are omitted from the student's CSS. */
    body { margin: 0; }
    #demo { color: #333; padding: 8px; border: 1px solid #999; }
    @media (max-width: 500px) { #demo { font-size: 14px; } }
    .unique { --length: 0px; background-color: #fff; }
    </style><button id="demo">Botão</button><p class="unique">Texto</p>`;
  const educationalCss = await evaluate(`(async () => {
    const iframe = document.createElement('iframe'); iframe.id = 'educational-test';
    await new Promise(resolve => {iframe.onload = resolve; iframe.srcdoc = ${JSON.stringify(educationalHtml)}; document.body.append(iframe);});
    const doc = iframe.contentDocument;
    const button = doc.getElementById('demo');
    button.setAttribute('data-foux-original-style','');
    button.style.color = '#654321';
    button.style.padding = '12px 20px';
    button.style.border = '2px solid #123456';
    button.style.borderRadius = '8px';
    button.classList.add('foux-hover-target-simple');
    const hover = doc.createElement('style'); hover.id = 'foux-user-hover-rules';
    hover.textContent = '.foux-hover-target-simple:hover { color: #ff8800 !important; transform: scale(1.1) !important; }';
    doc.head.append(hover);
    const paragraph = doc.querySelector('p');
    paragraph.setAttribute('data-foux-original-style','');
    paragraph.style.color = '#112233';
    const {generateProjectCss} = await import('/src/utils/exportCss.js');
    return generateProjectCss(doc);
  })()`);
  assert.doesNotMatch(educationalCss, /!important|\/\*|@import|data:text\/css|padding-(left|right|top|bottom)|foux-|html > body/);
  assert.match(educationalCss, /#demo \{\n  color: #654321;\n  padding: 12px 20px;\n  border: 2px solid #123456;\n  border-radius: 8px;\n\}/);
  assert.match(educationalCss, /#demo:hover \{\n  color: #ff8800;\n  transform: scale\(1\.1\);\n\}/);
  assert.match(educationalCss, /\.unique \{\n  --length: 0px;\n  background-color: #ffffff;\n  color: #112233;\n\}/);
  assert.match(educationalCss, /body \{\n  margin: 0;\n\}/);
  await evaluate(`new Promise(resolve => {
    const iframe = document.getElementById('educational-test');
    iframe.onload = () => {
      const doc = iframe.contentDocument;
      window.educationalResult = {color:doc.defaultView.getComputedStyle(doc.getElementById('demo')).color,padding:doc.defaultView.getComputedStyle(doc.getElementById('demo')).padding,colorText:doc.defaultView.getComputedStyle(doc.querySelector('p')).color};
      resolve(true);
    };
    iframe.srcdoc = ${JSON.stringify(educationalHtml)} + '<style>' + ${JSON.stringify(educationalCss)} + '</style>';
  })`);
  assert.deepEqual(await evaluate('window.educationalResult'), {color:'rgb(101, 67, 33)',padding:'12px 20px',colorText:'rgb(17, 34, 51)'});
  await evaluate('document.getElementById("educational-test").remove()');
  console.log('PASS: educational CSS uses short selectors, formatted blocks, hexadecimal colors, shorthands and no unnecessary !important or comments');
  const tutorialCss = await evaluate(`(async () => {
    const {TUTORIAL_HTML} = await import('/src/utils/tutorialTemplate.js');
    const {generateProjectCss} = await import('/src/utils/exportCss.js');
    const iframe = document.createElement('iframe'); iframe.id = 'tutorial-export-test';
    await new Promise(resolve => {iframe.onload = resolve; iframe.srcdoc = TUTORIAL_HTML; document.body.append(iframe);});
    const doc = iframe.contentDocument;
    const box = doc.getElementById('box-unica');
    box.setAttribute('data-foux-original-style','');
    box.style.setProperty('border-radius','32px','important');
    box.style.backgroundColor = '#123456';
    box.classList.add('foux-hover-target-box');
    doc.getElementById('foux-user-hover-rules').textContent = '.foux-hover-target-box:hover {background-color: #ff8800 !important;}';
    const css = await generateProjectCss(doc);
    await new Promise(resolve => {iframe.onload = resolve; iframe.srcdoc = TUTORIAL_HTML + '<style>' + css + '</style>';});
    const result = iframe.contentWindow.getComputedStyle(iframe.contentDocument.getElementById('box-unica'));
    if (result.borderRadius !== '32px' || result.backgroundColor !== 'rgb(18, 52, 86)') throw new Error('Tutorial visual changed after export');
    return css;
  })()`);
  assert.doesNotMatch(tutorialCss, /\/\*|data:text\/css|foux-hover-target-/);
  assert.doesNotMatch(tutorialCss, /border-radius: 16px !important/);
  assert.match(tutorialCss, /#box-unica:hover \{\n  background-color: #ff8800 !important;\n\}/);
  await evaluate('document.getElementById("tutorial-export-test").remove()');
  console.log('PASS: tutorial export preserves border-radius, colors and hover despite authored selector specificity');
  await evaluate(`document.querySelector('.editor-header__project-name').click()`);
  await evaluate(`(() => {
    const input = document.querySelector('.editor-header__name-input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Meu Projeto');
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await evaluate(`document.querySelector('.editor-header__name-input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);
  await eventually(() => evaluate('document.querySelector(".editor-header__project-name")?.textContent === "Meu Projeto"'), 'Project rename failed');
  await evaluate(`document.querySelector('[aria-label="Exportar CSS"]').click()`);
  await eventually(() => readFile(path.join(temporaryDir, 'Meu Projeto.css'), 'utf8'), 'Renamed CSS was not downloaded');
  console.log('PASS: export, download name, original HTML, duplicate selectors, gradients, hover rules, fonts and authored outlines');

  await evaluate(`document.querySelector('[aria-label="Expandir página"]').click()`);
  await eventually(() => evaluate('!!document.fullscreenElement'), 'Native fullscreen did not open');
  const preview = await evaluate(`(() => {
    const iframe = document.querySelector('.editor-canvas__iframe');
    const doc = iframe.contentDocument;
    doc.defaultView.scrollTo(0, 1000);
    doc.querySelector('button').click();
    return {
      width: iframe.getBoundingClientRect().width,
      viewport: innerWidth,
      scroll: doc.defaultView.scrollY,
      selected: doc.querySelector('[data-foux-selected]')?.id,
      inspectorDisabled: doc.getElementById('foux-inspector-styles').sheet.disabled,
      outline: doc.defaultView.getComputedStyle(doc.getElementById('title:main')).outlineStyle,
    };
  })()`);
  assert.equal(preview.width, preview.viewport);
  assert.ok(preview.scroll > 0);
  assert.equal(preview.selected, 'title:main');
  assert.equal(preview.inspectorDisabled, true);
  assert.equal(preview.outline, 'dotted');
  await evaluate(`document.querySelector('iframe').contentDocument.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape',bubbles:true}))`);
  await eventually(() => evaluate('!document.fullscreenElement && !document.querySelector(".editor-canvas--expanded")'), 'Esc did not exit fullscreen');
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.getElementById('foux-inspector-styles').sheet.disabled`), false);
  await evaluate(`document.querySelector('.editor-canvas').requestFullscreen = undefined; document.querySelector('[aria-label="Expandir página"]').click()`);
  await eventually(() => evaluate('!!document.querySelector(".editor-canvas--expanded")'), 'Fallback did not open');
  await evaluate(`document.querySelector('iframe').contentDocument.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape',bubbles:true}))`);
  await eventually(() => evaluate('!document.querySelector(".editor-canvas--expanded")'), 'Esc did not exit fallback');
  console.log('PASS: native fullscreen, scrolling, preview without inspection, Esc inside iframe and fallback');

  await (await import('./test_ui_refinements.mjs')).runUiRefinements({ evaluate, command, eventually, temporaryDir });

  await evaluate(`localStorage.setItem('foux_projects', JSON.stringify([{id:'empty',name:'Vazio',folderId:null,htmlContent:null,createdAt:Date.now(),updatedAt:Date.now()}]));`);
  await command('Page.reload');
  await eventually(() => evaluate('!!document.querySelector(".project-card--saved")'), 'Empty project did not appear');
  await evaluate('document.querySelector(".project-card--saved").click()');
  await eventually(() => evaluate('!!document.querySelector(".editor-dropzone")'), 'Empty editor did not load');
  assert.equal(await evaluate(`document.querySelector('[aria-label="Exportar CSS"]').disabled`), true);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Expandir página"]').disabled`), true);
  console.log('PASS: empty projects disable export and fullscreen');
  }
} finally {
  socket?.close();
  browser?.kill();
  server.kill();
  // The directory comes directly from mkdtemp inside the system temporary folder.
  await delay(500);
  await rm(temporaryDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
