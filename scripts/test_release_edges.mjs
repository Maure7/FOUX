import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function runReleaseEdges({ evaluate, command, eventually }) {
  const fixture = '<h1 id="title">Release</h1><p>Sem identificador</p><section id="other">Outro</section>';
  async function open(html = fixture, extra = {}) {
    await evaluate(`document.querySelector('.editor-header__back')?.click()`);
    await evaluate(`localStorage.clear(); localStorage.setItem('foux_projects', JSON.stringify([{id:'rc',name:'RC',folderId:null,createdAt:Date.now(),updatedAt:Date.now(),htmlContent:${JSON.stringify(html)},...${JSON.stringify(extra)}}])); window.__oldRc = true;`);
    await command('Page.reload');
    await eventually(() => evaluate(`!window.__oldRc && !!document.querySelector('.project-card--saved')`), 'RC project missing');
    await evaluate(`document.querySelector('.project-card--saved').click()`);
    await eventually(() => evaluate(`!!document.querySelector('iframe')?.contentDocument?.querySelector('h1')`), 'RC iframe missing');
  }
  async function select(id = 'title') {
    await evaluate(`document.querySelector('iframe').contentDocument.getElementById('${id}').click()`);
  }
  async function size(value) {
    await evaluate(`(() => { const input = document.querySelector('input[aria-label="Tamanho da Fonte"][type="number"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '${value}'); input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  }
  const titleSize = () => evaluate(`document.querySelector('iframe').contentDocument.getElementById('title').style.fontSize`);
  await open();
  await select();
  await size(41);
  await eventually(async () => await titleSize() === '41px', 'Font edit failed');
  await eventually(() => evaluate(`JSON.parse(localStorage.getItem('foux_projects'))[0].htmlContent.includes('41px')`), 'Autosave failed');
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', {key:'z',ctrlKey:true,bubbles:true}))`);
  await eventually(async () => await titleSize() !== '41px', 'Undo failed');
  await delay(1100);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('foux_projects'))[0].htmlContent.includes('41px')`), false, 'Undo was not autosaved');
  await evaluate(`document.querySelector('iframe').contentDocument.dispatchEvent(new KeyboardEvent('keydown', {key:'y',ctrlKey:true,bubbles:true}))`);
  await eventually(async () => await titleSize() === '41px', 'Redo shortcut inside iframe failed');
  await select();
  await size(48);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', {key:'z',ctrlKey:true,bubbles:true}))`);
  await eventually(async () => await titleSize() === '41px', 'Immediate undo failed');
  await select();
  await size(55);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', {key:'z',ctrlKey:true,bubbles:true}))`);
  await eventually(async () => await titleSize() === '41px', 'Edit immediately after undo lost history');
  console.log('PASS: autosaved undo, iframe shortcuts and editing immediately after undo');

  await select();
  await evaluate(`document.querySelector('[data-tour="background"] .sidebar-gradient-toggle input').click()`);
  await select('other');
  await select();
  assert.equal(await evaluate(`document.querySelector('[data-tour="background"] .sidebar-gradient-toggle input').checked`), true, 'Background gradient lost on reselection');
  console.log('PASS: background gradient restored on reselection');

  for (const [label, value, property] of [['Padding (Espaço Interno)',18,'padding'],['Margin (Espaço Externo)',9,'margin']]) {
    await evaluate(`(() => { const input=[...document.querySelectorAll('[data-tour="spacing"] input[type=number]')][${property === 'padding' ? 0 : 1}]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'${value}'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.getElementById('title').style.${property}`), value+'px', label);
  }
  await evaluate(`document.querySelector('.sidebar-resize-handle').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:600})); window.dispatchEvent(new MouseEvent('mousemove',{clientX:-5000})); window.dispatchEvent(new MouseEvent('mouseup'));`);
  let width = await evaluate(`document.querySelector('.editor-sidebar').getBoundingClientRect().width`);
  assert.ok(width <= 600 && width <= await evaluate('Math.max(300, Math.floor(innerWidth*.45))'));
  await evaluate(`document.querySelector('.sidebar-resize-handle').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:600})); window.dispatchEvent(new MouseEvent('mousemove',{clientX:5000})); window.dispatchEvent(new Event('blur'));`);
  width = await evaluate(`document.querySelector('.editor-sidebar').getBoundingClientRect().width`);
  assert.equal(width,300);
  assert.equal(await evaluate(`!!document.querySelector('.editor-resize-glass-overlay')`),false);
  console.log('PASS: padding/margin controls, resize bounds and drag cleanup on blur');

  const exportMatrix = await evaluate(`(async () => {
    const { generateProjectCss, getCssFileName } = await import('/src/utils/exportCss.js');
    const { getGradientBorder } = await import('/src/utils/gradientBorder.js');
    const doc = document.querySelector('iframe').contentDocument;
    const target = doc.getElementById('title');
    target.setAttribute('data-foux-gradient-border', '{}');
    if (getGradientBorder(target) !== null) throw Error('Invalid gradient metadata accepted');
    target.removeAttribute('data-foux-gradient-border');
    const cases = ['color: #123456; padding: 12px 20px; margin: 7px;',
      'background-image: linear-gradient(45deg, red, blue); border-radius: 24px;',
      '--custom: "a;b,c"; background: url("data:image/svg+xml,%3Csvg/%3E");',
      'font-family: Arial; font-size: 32px; box-shadow: 0 0 0 transparent;',
      'border: 0 solid transparent; opacity: 0; transform: scale(1.2);'];
    for (const style of cases) {
      target.style.cssText = style;
      const css = await generateProjectCss(doc);
      const sheet = new CSSStyleSheet(); sheet.replaceSync(css);
      if (!sheet.cssRules.length || css.includes('foux-inspector-styles')) throw Error('Invalid CSS');
    }
    return [getCssFileName(null),getCssFileName('CON'),getCssFileName('a/b:*')];
  })()`);
  assert.deepEqual(exportMatrix, ['Projeto.css', '_CON.css', 'a_b__.css']);
  console.log('PASS: CSS value combinations, invalid gradient metadata and Windows filenames');

  await evaluate(`(() => {
    const file = new File(['<meta http-equiv="refresh" content="0;url=https://example.invalid"><h1 id="imported">Importado<p>incompleto'], 'MALFORMED.HTML', {type:'text/html'});
    const transfer = new DataTransfer(); transfer.items.add(file);
    const input = document.querySelector('.editor-shell > input[type=file]'); input.files = transfer.files;
    input.dispatchEvent(new Event('change', {bubbles:true}));
  })()`);
  await eventually(() => evaluate(`!!document.querySelector('iframe').contentDocument?.getElementById('imported')`), 'Malformed uppercase HTML import failed');
  assert.equal(await evaluate(`document.querySelector('iframe').contentDocument.querySelectorAll('meta[http-equiv="refresh"]').length`), 0);
  assert.equal(await evaluate(`document.querySelector('[aria-label^="Desfazer"]').disabled`), true, 'New file retained previous history');
  await evaluate(`(() => { const transfer = new DataTransfer(); transfer.items.add(new File([''], 'empty.html')); const input = document.querySelector('.editor-shell > input[type=file]'); input.files = transfer.files; input.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  await eventually(() => evaluate(`!!document.querySelector('.toast')`), 'Empty HTML did not report a read failure');
  assert.equal(await evaluate(`!!document.querySelector('iframe').contentDocument.getElementById('imported')`), true);
  console.log('PASS: malformed HTML, uppercase extensions, refresh neutralization, empty-file fallback and history reset');

  await evaluate(`document.querySelector('.editor-header__back').click()`);
  await evaluate(`localStorage.setItem('foux_projects','{}'); localStorage.setItem('foux_folders','null'); localStorage.setItem('foux_user_profile','null'); localStorage.setItem('foux_theme','invalid'); window.__oldRc = true;`);
  await command('Page.reload');
  await eventually(() => evaluate(`!window.__oldRc && !!document.getElementById('card-new-project')`), 'Malformed persisted state crashed the app');
  assert.equal(await evaluate(`document.documentElement.dataset.theme`), 'dark');
  console.log('PASS: invalid persisted collections, profile and theme recover safely');

  await evaluate(`document.querySelector('.header__new-folder').click()`);
  await evaluate(`(() => { const input = document.querySelector('.modal-name-input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Pasta QA'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await evaluate(`document.querySelector('.modal-create-btn').click()`);
  await eventually(() => evaluate(`JSON.parse(localStorage.getItem('foux_folders')).length === 1`), 'Folder creation failed');
  await evaluate(`document.querySelector('.project-card--folder').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:200,clientY:200}))`);
  await evaluate(`Array.from(document.querySelectorAll('.context-menu__item')).find(button => /Fixar|Favorit/.test(button.textContent)).click()`);
  await eventually(() => evaluate(`JSON.parse(localStorage.getItem('foux_folders'))[0].favorite`), 'Folder favorite failed');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('foux_activities')).filter(item => item.actionKey === 'activity.pin_folder').length`), 1, 'StrictMode duplicated activity');
  console.log('PASS: folder creation, favorites and exactly one activity under StrictMode');

  const output = path.resolve('release/qa');
  await mkdir(output, {recursive:true});
  for (const language of ['pt','es']) {
    for (const theme of ['dark','light','solarized','liquid-glass']) {
      await evaluate(`(async () => { const {getTutorialHtml}=await import('/src/utils/tutorialI18n.js'); localStorage.setItem('foux_projects',JSON.stringify([{id:'matrix',name:'Projeto com nome muito longo para verificar limites do cabeçalho',folderId:null,template:'tutorial',htmlContent:getTutorialHtml('${language}'),showTutorialTips:false}])); localStorage.setItem('foux_theme','${theme}'); localStorage.setItem('foux_language','${language}'); window.__oldRc=true; })()`);
      await command('Page.reload');
      await eventually(() => evaluate(`!window.__oldRc && !!document.querySelector('.project-card--saved')`), 'Theme matrix dashboard missing');
      await evaluate(`document.querySelector('.project-card--saved').click()`);
      await eventually(() => evaluate(`!!document.querySelector('iframe')?.contentDocument?.getElementById('foux-inspector-styles') && !!document.querySelector('.editor-sidebar:not(.editor-sidebar--locked)')`), 'Theme matrix iframe missing');
      await evaluate(`document.querySelector('iframe').contentDocument.querySelector('h1').click()`);
      await eventually(() => evaluate(`!!document.querySelector('.foux-editor-element-badge__tag')`), 'Theme matrix selection missing');
      for (const width of [1280,960]) {
        await command('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:false});
        await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
        const bounds = await evaluate(`(() => { const header=document.querySelector('.editor-header'); const sidebar=document.querySelector('.editor-sidebar').getBoundingClientRect(); return {header:header.scrollWidth,available:header.clientWidth,sidebarRight:sidebar.right,sidebarLeft:sidebar.left}; })()`);
        assert.ok(bounds.header <= bounds.available + 1, 'Header overflow: '+JSON.stringify({language,theme,width,...bounds}));
        assert.ok(bounds.sidebarRight <= width + 1 && bounds.sidebarLeft >= 0, 'Sidebar outside viewport');
        const overflow = await evaluate(`(() => {const content=document.querySelector('.sidebar-content');return {width:content.clientWidth,scroll:content.scrollWidth,items:[...content.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>content.getBoundingClientRect().right-10).map(el=>({class:el.className,width:el.getBoundingClientRect().width})).slice(0,15)};})()`);
        assert.ok(overflow.scroll <= overflow.width + 1, 'Sidebar content overflow: '+JSON.stringify({language,theme,width,...overflow}));
        const shot = await command('Page.captureScreenshot',{format:'png'});
        await writeFile(path.join(output,`editor-${theme}-${language}-${width}.png`),Buffer.from(shot.data,'base64'));
      }
      await evaluate(`document.querySelector('.editor-header__back').click()`);
    }
  }
  console.log('PASS: 16 visual theme/language/viewport combinations; screenshots in release/qa');
}
