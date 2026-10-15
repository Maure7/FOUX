import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export async function runUiRefinements({ evaluate, command, eventually }) {
  // Finish any editor autosave before replacing this test profile's storage.
  await evaluate(`document.querySelector('.editor-header__back')?.click()`);
  await eventually(() => evaluate(`!!document.getElementById('card-new-project')`), 'Dashboard did not settle before tutorial fixture');
  await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await evaluate(`(async () => {
    const {TUTORIAL_HTML} = await import('/src/utils/tutorialTemplate.js');
    localStorage.clear();
    localStorage.setItem('foux_projects', JSON.stringify([{id:'tour', name:'TUTORIAL', folderId:null, htmlContent:TUTORIAL_HTML, showTutorialTips:true, createdAt:Date.now(), updatedAt:Date.now()}]));
    window.__fouxUiOldDocument = true;
  })()`);
  await command('Page.reload');
  await eventually(() => evaluate('!window.__fouxUiOldDocument && !!document.querySelector(".project-card--saved")'), 'Tutorial project missing');
  await evaluate('document.querySelector(".project-card--saved").click()');
  await eventually(() => evaluate('!!document.querySelector(".tutorial-tour[open] .tutorial-tour__spotlight")'), 'Automatic tour did not start');

  const steps = ['sidebar', 'styles', 'typography', 'borders', 'spacing', 'background', 'events', 'layout'];
  const originalHover = await evaluate('document.querySelector("iframe").contentDocument.getElementById("foux-user-hover-rules").textContent');
  for (const [index, id] of steps.entries()) {
    await eventually(() => evaluate(`document.querySelector('.tutorial-tour__progress').textContent === '${index + 1} de 8' && !!document.querySelector('[data-tour="${id}"]')`), `Missing step ${id}`);
    assert.equal(await evaluate('document.querySelectorAll(".tutorial-tour__card").length'), 1);
    assert.equal(await evaluate('document.querySelectorAll(".tutorial-tip").length'), 0);
    const bounds = await evaluate(`(() => {
      const card = document.querySelector('.tutorial-tour__card').getBoundingClientRect();
      const spot = document.querySelector('.tutorial-tour__spotlight').getBoundingClientRect();
      return {left: card.left, right: card.right, top: card.top, bottom: card.bottom, spotHeight: spot.height};
    })()`);
    assert.ok(bounds.left >= 0 && bounds.right <= 1280 && bounds.top >= 0 && bounds.bottom <= 800, `Card offscreen: ${id}`);
    assert.ok(bounds.spotHeight > 0, `Spotlight empty: ${id}`);
    // Real input must remain inside the modal, even when focus is requested outside.
    await evaluate('document.querySelector(".editor-header__back").focus()');
    assert.equal(await evaluate('document.activeElement.closest(".tutorial-tour") !== null'), true);
    if (index === 2) {
      await evaluate('document.querySelector(".tutorial-tour__navigation button").click()');
      await eventually(() => evaluate('document.querySelector(".tutorial-tour__progress").textContent === "2 de 8"'), 'Previous failed');
      await evaluate('document.querySelector(".tutorial-tour__next").click()');
    }
    if (index < steps.length - 1) await evaluate('document.querySelector(".tutorial-tour__next").click()');
  }
  assert.equal(await evaluate('document.querySelector("iframe").contentDocument.getElementById("foux-user-hover-rules").textContent'), originalHover, 'Tour modified hover rules');
  await evaluate('document.querySelector(".tutorial-tour__next").click()');
  await eventually(() => evaluate('!document.querySelector(".tutorial-tour")'), 'Completion failed');
  assert.equal(await evaluate('localStorage.getItem("foux_tutorial_completed")'), 'true');
  assert.equal(await evaluate('document.activeElement.classList.contains("editor-header__tutorial-btn")'), true);
  await evaluate('document.querySelector(".editor-header__back").click()');
  await evaluate('document.querySelector(".project-card--saved").click()');
  await eventually(() => evaluate('!!document.querySelector(".editor-sidebar")'), 'Reopen failed');
  assert.equal(await evaluate('!!document.querySelector(".tutorial-tour")'), false);
  await command('Page.reload');
  await eventually(() => evaluate('!!document.querySelector(".project-card--saved")'), 'Reload failed');
  await evaluate('document.querySelector(".project-card--saved").click()');
  await eventually(() => evaluate('!!document.querySelector(".editor-sidebar")'), 'Reloaded editor missing');
  assert.equal(await evaluate('!!document.querySelector(".tutorial-tour")'), false);

  // All available editor action buttons, including disabled actions, have tooltip copy.
  const missing = await evaluate(`Array.from(document.querySelectorAll('button,[role="button"]')).filter(el => !(el.dataset.tooltip || el.getAttribute('aria-label') || el.textContent.trim())).map(el => el.className)`);
  assert.deepEqual(missing, []);
  const configRect = await evaluate(`(() => { const r = document.querySelector('[aria-label="Configurações"]').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...configRect });
  assert.equal(await evaluate('document.querySelector("[role=tooltip]")?.textContent || null'), null);
  await eventually(() => evaluate('document.querySelector("[role=tooltip]")?.textContent === "Configurações"'), 'Hover tooltip missing');
  assert.equal(await evaluate('document.querySelector("[aria-label=Configurações]").hasAttribute("title")'), false);
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await eventually(() => evaluate('!document.querySelector("[role=tooltip]")'), 'Tooltip Esc failed');
  await evaluate('document.querySelector("[aria-label=Configurações]").focus()');
  await eventually(() => evaluate('!!document.querySelector("[role=tooltip]")'), 'Keyboard tooltip missing');
  assert.ok(await evaluate('document.querySelector("[aria-label=Configurações]").getAttribute("aria-describedby")'));
  await evaluate('document.querySelector(".editor-toolbar-btn").focus()');
  await eventually(() => evaluate('!document.querySelector("[aria-label=Configurações]").hasAttribute("aria-describedby")'), 'Description not cleaned up');

  for (const theme of ['light', 'dark', 'solarized', 'liquid-glass']) {
    await evaluate(`document.documentElement.dataset.theme = '${theme}'; document.querySelector('.editor-header__tutorial-btn').click()`);
    await eventually(() => evaluate('!!document.querySelector(".tutorial-tour__spotlight")'), 'Manual restart failed');
    for (let i = 0; i < 4; i++) await evaluate('document.querySelector(".tutorial-tour__next").click()');
    const colors = await evaluate(`(() => { const card = document.querySelector('.tutorial-tour__card'); return {text:getComputedStyle(card.querySelector('p')).color, background:getComputedStyle(card).backgroundColor}; })()`);
    const channels = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
    const luminance = (color) => channels(color).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    const a = luminance(colors.text), b = luminance(colors.background);
    assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `Tour text contrast: ${theme}`);
    if (theme === 'liquid-glass') {
      const styles = await evaluate(`(() => {const css=getComputedStyle(document.querySelector('.editor-sidebar')); return {blur:css.backdropFilter,bg:css.backgroundColor,canvas:getComputedStyle(document.querySelector('.editor-canvas')).backgroundColor};})()`);
      assert.match(styles.blur, /blur\(24px\)/);
      assert.equal(styles.bg, 'rgba(18, 18, 24, 0.45)');
      assert.equal(styles.canvas, 'rgb(229, 229, 231)');
      const shot = await command('Page.captureScreenshot', { format: 'png' });
      const screenshotPath = path.join(tmpdir(), 'foux-ui-liquid-glass.png');
      await writeFile(screenshotPath, Buffer.from(shot.data, 'base64'));
      console.log(`UI screenshot: ${screenshotPath}`);
    }
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await eventually(() => evaluate('!document.querySelector(".tutorial-tour")'), 'Tour Esc failed');
  }

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 700, deviceScaleFactor: 1, mobile: false });
  await evaluate('document.querySelector(".editor-header__tutorial-btn").click()');
  await eventually(() => evaluate('!!document.querySelector(".tutorial-tour__spotlight")'), 'Narrow tour missing');
  for (let i = 0; i < 8; i++) {
    await eventually(() => evaluate('document.querySelector(".tutorial-tour__spotlight").getBoundingClientRect().height > 0'), 'Narrow spotlight is offscreen');
    const card = await evaluate('(() => {const r=document.querySelector(".tutorial-tour__card").getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})()');
    assert.ok(card.left >= 0 && card.right <= 390 && card.top >= 0 && card.bottom <= 700, 'Narrow tour clipped');
    if (i < 7) await evaluate('document.querySelector(".tutorial-tour__next").click()');
  }
  await evaluate('document.querySelector(".tutorial-tour__skip").click()');
  await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await evaluate('document.querySelector("[aria-label=Configurações]").click()');
  await eventually(() => evaluate('!!document.querySelector(".settings-switch input")'), 'Settings missing');
  await evaluate('document.querySelector(".settings-switch input").click()');
  await evaluate('document.querySelector(".settings-page__back").click()');
  await eventually(() => evaluate('!!document.querySelector(".editor-sidebar")'), 'Settings back failed');
  assert.equal(await evaluate('!!document.querySelector(".tutorial-tour")'), false);
  // A manual tour remains available when automatic onboarding is disabled.
  await evaluate('document.querySelector(".editor-header__tutorial-btn").click()');
  await eventually(() => evaluate('!!document.querySelector(".tutorial-tour[open]")'), 'Disabled setting prevented manual tour');
  await evaluate('document.querySelector(".tutorial-tour__close").click()');
  await evaluate('document.querySelector("[aria-label=Configurações]").click()');
  await evaluate('Array.from(document.querySelectorAll(".settings-row__btn")).find(el=>el.textContent === "Reiniciar tutorial").click()');
  await eventually(() => evaluate('!!document.querySelector(".tutorial-tour[open]")'), 'Settings restart failed');
  await evaluate('document.querySelector(".tutorial-tour__skip").click()');
  // Restart remains usable after the example's ID is edited or removed.
  await evaluate(`document.querySelector('iframe').contentDocument.getElementById('titulo-exercicio').removeAttribute('id'); document.querySelector('.editor-header__tutorial-btn').click()`);
  await eventually(() => evaluate('!!document.querySelector(".tutorial-tour[open]")'), 'Edited tutorial restart failed');
  for (let i = 0; i < 6; i++) await evaluate('document.querySelector(".tutorial-tour__next").click()');
  assert.equal(await evaluate('!!document.querySelector("[data-tour=events]")'), true);
  await evaluate('document.querySelector(".tutorial-tour__skip").click()');
  console.log('PASS: eight-step tour, spotlight, modal focus, persistence, back/next, restart, skip, all themes, narrow viewport and tooltips');
}
