import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export async function runDesignPolish({ evaluate, command, eventually }) {
  const output = path.join(tmpdir(), 'foux-design-audit');
  await mkdir(output, { recursive: true });
  const screenshot = async name => {
    // Allow the finite entrance to settle before checking the final composition.
    await delay(260);
    const shot = await command('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
  };
  const key = async (key, code, windowsVirtualKeyCode, modifiers = 0) => {
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, modifiers, ...(key === 'Enter' ? { text: '\r' } : key === ' ' ? { text: ' ' } : {}) });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode, modifiers });
  };
  const click = async selector => {
    const point = await evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({block:'nearest'}); const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  };
  const bounded = async selector => {
    const result = await evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)});const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight};})()`);
    assert.ok(result.left >= -1 && result.top >= -1 && result.right <= result.width + 1 && result.bottom <= result.height + 1, `${selector} outside viewport: ${JSON.stringify(result)}`);
  };
  const closeModal = async () => {
    await key('Escape', 'Escape', 27);
    await eventually(() => evaluate('!document.querySelector(".modal-overlay")'), 'Dialog did not finish closing');
  };
  const checkFocus = async () => {
    assert.equal(await evaluate('!!document.activeElement.closest(".modal-card")'), true, 'Dialog did not receive focus');
    await evaluate(`(() => {const buttons=[...document.querySelector('.modal-card').querySelectorAll('button,a[href],input,select,textarea')].filter(el=>el.getClientRects().length&&!el.disabled);buttons.at(-1).focus();window.__modalFirst=buttons[0];})()`);
    await key('Tab', 'Tab', 9);
    assert.equal(await evaluate('document.activeElement===window.__modalFirst'), true, 'Tab escaped dialog');
    await key('Tab', 'Tab', 9, 8);
    assert.equal(await evaluate('!!document.activeElement.closest(".modal-card")'), true, 'Shift+Tab escaped dialog');
  };

  const contrastHelper = `window.__contrast=(selector,pseudo=null)=>{
    const el=document.querySelector(selector); if(!el) throw Error('Missing '+selector);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const rgba=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);const data=ctx.getImageData(0,0,1,1).data;return [data[0],data[1],data[2],data[3]/255]};
    const blend=(fg,bg)=>fg.slice(0,3).map((v,i)=>v*(fg[3]??1)+bg[i]*(1-(fg[3]??1)));
    let bg=document.documentElement.dataset.theme==='liquid-glass'?[40,40,48]:[255,255,255];
    const ancestors=[]; for(let node=el;node;node=node.parentElement)ancestors.unshift(node);
    for(const node of ancestors)bg=blend(rgba(getComputedStyle(node).backgroundColor),bg);
    const fg=blend(rgba(getComputedStyle(el,pseudo).color),bg);
    const lum=color=>color.map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);
    const a=lum(fg),b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  }`;
  const contrast = async (selector, label, pseudo) => {
    const ratio = await evaluate(`window.__contrast(${JSON.stringify(selector)},${JSON.stringify(pseudo || null)})`);
    assert.ok(ratio >= 4.5, `${label}: ${ratio.toFixed(2)}:1 (${selector})`);
    return Number(ratio.toFixed(2));
  };
  const results = [];
  for (const language of ['pt', 'es']) {
    for (const theme of ['dark', 'light', 'solarized', 'liquid-glass']) {
      const label = `${theme}-${language}`;
      if (process.env.FOUX_UI_CASE && process.env.FOUX_UI_CASE !== label) continue;
      await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
      await evaluate(`localStorage.clear();localStorage.setItem('foux_theme',${JSON.stringify(theme)});localStorage.setItem('foux_language',${JSON.stringify(language)});localStorage.setItem('foux_tutorial_completed','true');
        localStorage.setItem('foux_projects',JSON.stringify([{id:'polish',name:'Projeto de interface — revisão de usabilidade e alinhamento',folderId:null,htmlContent:'<!doctype html><html><body><h1 id="example" style="color:#234567">Exemplo</h1><button>Teste</button></body></html>',showTutorialTips:false,updatedAt:Date.now()}]));
        localStorage.setItem('foux_folders',JSON.stringify([{id:'folder',name:'Biblioteca de componentes '+ 'W'.repeat(100),borderColor:'#e59843',createdAt:Date.now()}]));window.__oldAudit=true;`);
      await command('Page.reload');
      await eventually(() => evaluate(`!window.__oldAudit&&document.documentElement.dataset.theme===${JSON.stringify(theme)}&&!!document.querySelector('.project-card--saved')`), 'Fixture did not load');
      await evaluate(contrastHelper);
      assert.equal(await evaluate('document.documentElement.lang'), language === 'pt' ? 'pt-BR' : 'es-419');
      const searchWidth = await evaluate('document.querySelector(".header__search-input").getBoundingClientRect().width');
      await click('.header__search-input');
      await delay(180);
      assert.equal(await evaluate('document.querySelector(".header__search-input").getBoundingClientRect().width'), searchWidth, 'Search moved neighboring actions');
      const placeholder = await contrast('.header__search-input', `${label} placeholder`, '::placeholder');
      await screenshot(`dashboard-${label}`);

      await click('.header__new-folder');
      await eventually(() => evaluate('!!document.querySelector(".modal-card--folder")'), 'New folder missing');
      await checkFocus();
      assert.equal(await evaluate('document.querySelectorAll(".color-picker-swatch[aria-pressed=true]").length'), 1);
      await screenshot(`folder-dialog-${label}`);
      await closeModal();
      assert.equal(await evaluate('document.activeElement.matches(".header__new-folder")'), true, 'Trigger focus was not restored');
      assert.equal(await evaluate('document.body.style.overflow'), '', 'Body remained scroll locked');

      await click('.view-toggle__btn:nth-child(2)');
      await evaluate('document.querySelector(".list-item:not(.list-item--folder) .list-item__options").focus()');
      await eventually(() => evaluate('getComputedStyle(document.activeElement).opacity === "1"'), 'Options invisible to keyboard users');
      await key('Enter', 'Enter', 13);
      await eventually(() => evaluate('!!document.querySelector(".context-menu")'), 'Options did not open');
      assert.equal(await evaluate('!!document.querySelector(".editor-shell")'), false, 'Enter on Options opened the project');
      await key('Escape', 'Escape', 27);
      await click('.view-toggle__btn:first-child');

      await evaluate(`document.querySelector('.project-card--saved').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:innerWidth-3,clientY:innerHeight-3}))`);
      await eventually(() => evaluate('!!document.querySelector(".context-menu")'), 'Context menu missing');
      await bounded('.context-menu');
      await evaluate('document.querySelector(".context-menu__item--submenu").focus()');
      await bounded('.context-menu__submenu');
      await screenshot(`menu-${label}`);
      await evaluate(`Array.from(document.querySelectorAll('.context-menu > button')).find(el=>el.textContent.includes(${JSON.stringify(language === 'pt' ? 'Renomear' : 'Renombrar')})).click()`);
      await eventually(() => evaluate('!!document.querySelector(".modal-card--rename")'), 'Rename dialog missing');
      await checkFocus();
      await closeModal();

      await click(`.header__icon-btn[aria-label="${language === 'pt' ? 'Ajuda' : 'Ayuda'}"]`);
      await eventually(() => evaluate('!!document.querySelector(".faq-modal")'), 'FAQ missing');
      await checkFocus();
      const help = await contrast('.faq-item p', `${label} FAQ`);
      await screenshot(`help-${label}`);
      await click('.faq-item[open] summary');
      await eventually(() => evaluate('(() => {const item=document.querySelector(".faq-item");return item.getBoundingClientRect().height<=item.querySelector("summary").getBoundingClientRect().height+3})()'), 'FAQ answer did not collapse');
      await click('.faq-item summary');
      await eventually(() => evaluate('(() => {const item=document.querySelector(".faq-item");return item.getBoundingClientRect().height>item.querySelector("summary").getBoundingClientRect().height+20})()'), 'FAQ answer did not reopen');
      await closeModal();

      await click('.header__icon-btn');
      await eventually(() => evaluate('!!document.querySelector(".settings-page")'), 'Settings missing');
      const hint = await contrast('.settings-row__hint', `${label} settings hint`);
      await evaluate('document.querySelector(".settings-switch input").focus()');
      const originalChecked = await evaluate('document.activeElement.checked');
      await key(' ', 'Space', 32);
      assert.notEqual(await evaluate('document.querySelector(".settings-switch input").checked'), originalChecked, 'Switch unreachable by keyboard');
      await screenshot(`settings-${label}`);
      await click('.settings-row__btn--danger');
      await eventually(() => evaluate('!!document.querySelector(".modal-card--confirm")'), 'Confirm missing');
      assert.equal(await evaluate('document.activeElement.matches(".modal-cancel-btn")'), true, 'Destructive dialog focused Delete');
      await contrast('.modal-confirm__delete-btn', `${label} destructive action`);
      await checkFocus();
      await closeModal();
      await click('.settings-page__back');

      await click('.header__avatar-wrapper');
      await eventually(() => evaluate('!!document.querySelector(".profile-page")'), 'Profile missing');
      assert.equal(await evaluate('document.querySelector(".profile-hero-name").textContent'), language === 'pt' ? 'Usuário FOUX' : 'Usuario FOUX');
      await evaluate(`(() => {const input=document.querySelector('.profile-input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'W'.repeat(50));input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      const heroFits = await evaluate(`(() => {const name=document.querySelector('.profile-hero-name').getBoundingClientRect();const card=document.querySelector('.profile-card').getBoundingClientRect();return name.right<=card.right && name.left>=card.left;})()`);
      assert.equal(heroFits, true, 'Profile name escaped card');
      const save = await contrast('.profile-save-btn', `${label} save button`);
      await screenshot(`profile-${label}`);
      const savePoint = await evaluate(`(() => {const r=document.querySelector('.profile-save-btn').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...savePoint });
      await delay(180);
      await contrast('.profile-save-btn', `${label} save button hover`);
      await click('.profile-save-btn');
      await eventually(() => evaluate('!!document.querySelector(".toast")'), 'Save feedback missing');
      await evaluate(`document.querySelector('.profile-save-btn').click();document.querySelector('.profile-save-btn').click()`);
      assert.equal(await evaluate('document.querySelectorAll(".toast").length'), 1, 'Repeated saves stacked duplicate feedback');
      await evaluate('document.querySelector(".toast__close").focus()');
      await delay(4200);
      assert.equal(await evaluate('!!document.querySelector(".toast:not(.toast--exiting)")'), true, 'Toast expired while reading with keyboard focus');
      await key('Enter', 'Enter', 13);
      await eventually(() => evaluate('!document.querySelector(".toast")'), 'Toast dismissal failed');
      await click('.profile-page__back');

      await click('.project-card--saved');
      await eventually(() => evaluate('!!document.querySelector("iframe")?.contentDocument?.getElementById("example")'), 'Editor missing');
      await evaluate('document.querySelector("iframe").contentDocument.getElementById("example").click()');
      await screenshot(`editor-${label}`);
      assert.equal(await evaluate('document.querySelector("iframe").contentDocument.getElementById("example").style.color'), 'rgb(35, 69, 103)', 'Polish altered authored document');
      await evaluate('window.__section=document.querySelector(".sidebar-section--open");window.__section.querySelector(".sidebar-section__header").click()');
      await eventually(() => evaluate('(() => {const header=window.__section.querySelector(".sidebar-section__header"),style=getComputedStyle(header);return window.__section.getBoundingClientRect().height<=header.getBoundingClientRect().height+parseFloat(style.marginTop)+parseFloat(style.marginBottom)+3})()'), 'Editor section did not collapse');
      await evaluate('window.__section.querySelector("input,select,button:not(.sidebar-section__header)")?.focus()');
      assert.equal(await evaluate('!!document.activeElement.closest(".sidebar-section__body")'), false, 'Collapsed editor controls received focus');
      await evaluate('window.__section.querySelector(".sidebar-section__header").click()');
      await eventually(() => evaluate('window.__section.getBoundingClientRect().height>window.__section.querySelector(".sidebar-section__header").getBoundingClientRect().height+20'), 'Editor section did not reopen');
      await evaluate(`Array.from(document.querySelectorAll('.sidebar-tab')).find(el=>el.textContent.trim()==='Eventos').click()`);
      await evaluate('document.querySelector(".sidebar-toggle-checkbox").click()');
      await delay(180);
      await contrast('.sidebar-toggle-checkbox:checked', `${label} selected checkbox`, '::after');
      for (const width of [960, 390]) {
        await command('Emulation.setDeviceMetricsOverride', { width, height: 700, deviceScaleFactor: 1, mobile: false });
        await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
        const headerFits = await evaluate('document.querySelector(".editor-header").scrollWidth<=document.querySelector(".editor-header").clientWidth+1');
        assert.equal(headerFits, true, `${label} editor header overflows at ${width}`);
        await bounded('.editor-sidebar');
        await bounded('.editor-canvas');
        await screenshot(`editor-${width}-${label}`);
      }
      await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
      await click('.editor-header__back');

      for (const width of [960, 390]) {
        await command('Emulation.setDeviceMetricsOverride', { width, height: 700, deviceScaleFactor: 1, mobile: false });
        const overflow = await evaluate('document.documentElement.scrollWidth > innerWidth');
        if (overflow) {
          const outside = await evaluate(`Array.from(document.querySelectorAll('body *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>({class:el.className,right:el.getBoundingClientRect().right})).slice(0,12)`);
          assert.fail(`${label} dashboard overflows at ${width}: ${JSON.stringify(outside)}`);
        }
        await bounded('.header__controls');
        await click('.project-card--folder');
        await bounded('.section-header');
        const clippedTitle = await evaluate('document.querySelector(".section-header__title").getBoundingClientRect().right<=innerWidth');
        assert.equal(clippedTitle, true, 'Long folder title displaced view controls');
        await click('.section-header__back');
        await evaluate(`document.querySelector('.project-card--saved').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:innerWidth-3,clientY:innerHeight-3}))`);
        await eventually(() => evaluate('!!document.querySelector(".context-menu")'), 'Narrow context menu missing');
        await bounded('.context-menu');
        await evaluate('document.querySelector(".context-menu__item--submenu").focus()');
        await bounded('.context-menu__submenu');
        await bounded('.context-menu');
        await key('Escape', 'Escape', 27);
        await click('.header__new-folder');
        await bounded('.modal-card');
        await screenshot(`narrow-${width}-${label}`);
        await closeModal();
      }
      results.push({ theme, language, contrast: { placeholder, help, hint, save } });
      console.log(`PASS: ${label} — dashboard/list, dialogs, help, settings, profile, editor, contrast, keyboard and 960/390px`);
    }
  }

  await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await evaluate('document.activeElement.blur()');
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 4, y: 4 });
  for (const index of [0, 1]) {
    const point = await evaluate(`(() => {const r=document.querySelectorAll('.header__icon-btn')[${index}].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await eventually(() => evaluate('!!document.querySelector(".foux-tooltip")'), 'Toolbar tooltip missing');
    if (index === 1) assert.equal(await evaluate('document.querySelector(".foux-tooltip").dataset.instant'), 'true', 'Adjacent tooltip repeated its entrance delay');
  }
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await click('#card-new-project');
  await eventually(() => evaluate('!!document.querySelector(".modal-card")'), 'Reduced-motion dialog missing');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".modal-card")).transform'), 'none');
  assert.ok(await evaluate('getComputedStyle(document.querySelector(".modal-card")).transitionProperty.includes("opacity")'));
  await closeModal();
  await command('Emulation.setEmulatedMedia', { features: [] });
  await evaluate('document.getElementById("card-new-project").focus()');
  await key(' ', 'Space', 32);
  await eventually(() => evaluate('!!document.querySelector(".modal-card")'), 'Space did not activate custom button');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".modal-card")).transitionDuration'), '0s', 'Keyboard action animated');
  await closeModal();
  await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`PASS: reduced motion and instant keyboard actions; screenshots and contrast results: ${output}`);
}
