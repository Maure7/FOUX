import assert from 'node:assert/strict';

// Regressões de interface: paleta da pasta, vidro aninhado, transparência reduzida,
// tema claro com sidebar escura, área de importação do Liquid Glass e menu "⋯".
// Uso: npm run test:ui-audit
export async function run({ evaluate, command, eventually }) {
  const luminance = `(c => c.match(/[\\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0))`;
  const contrast = (fg, bg) => evaluate(`(() => { const L = ${luminance}; const a = L(${JSON.stringify(fg)}), b = L(${JSON.stringify(bg)}); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); })()`);

  const seed = async (theme) => {
    await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await evaluate(`localStorage.clear();
      localStorage.setItem('foux_theme', ${JSON.stringify(theme)});
      localStorage.setItem('foux_tutorial_completed', 'true');
      const now = Date.now();
      localStorage.setItem('foux_projects', JSON.stringify([
        {id: 'p1', name: 'Projeto na pasta', folderId: 'f1', htmlContent: '<h1 id="titulo">Título</h1>', createdAt: now, updatedAt: now},
        {id: 'p2', name: 'Projeto vazio', folderId: null, htmlContent: null, createdAt: now, updatedAt: now},
        {id: 'p3', name: 'Projeto solto', folderId: null, htmlContent: '<h1 id="solto">Solto</h1>', createdAt: now, updatedAt: now},
      ]));
      localStorage.setItem('foux_folders', JSON.stringify([{id: 'f1', name: 'Pasta', borderColor: '#3b82f6', createdAt: now}]));
      window.__uiAuditOld = true;`);
    await command('Page.reload');
    await eventually(() => evaluate(`!window.__uiAuditOld && document.documentElement.dataset.theme === ${JSON.stringify(theme)} && !!document.querySelector('.project-card--folder')`), `Fixture ${theme} não carregou`);
  };
  const openProject = async (name) => {
    await evaluate(`[...document.querySelectorAll('.project-card--saved')].find(el => el.textContent.includes(${JSON.stringify(name)})).click()`);
  };

  for (const theme of ['dark', 'liquid-glass']) {
    await seed(theme);
    // A paleta do banner abre abaixo do título: nenhuma cor pode ficar cortada ou coberta pelos cards.
    await evaluate(`document.querySelector('.project-card--folder').click()`);
    await eventually(() => evaluate(`!!document.querySelector('.folder-banner .folder-color-picker__trigger')`), 'Banner da pasta ausente');
    await evaluate(`document.querySelector('.folder-banner .folder-color-picker__trigger').click()`);
    await eventually(() => evaluate(`document.querySelectorAll('.folder-banner .folder-swatches__swatch').length === 8`), 'Paleta não abriu');
    const reachable = await evaluate(`[...document.querySelectorAll('.folder-banner .folder-swatches__swatch')].filter(el => {
      const r = el.getBoundingClientRect();
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el;
    }).length`);
    assert.equal(reachable, 8, `${theme}: cores da paleta cortadas ou cobertas`);
    await evaluate(`document.querySelector('.folder-banner__back').click()`);
    await eventually(() => evaluate(`!!document.querySelector('.project-card--folder .project-card__options')`), 'Botão de opções da pasta ausente');

    // Na grade, o "⋯" abre o mesmo menu do botão direito.
    await evaluate(`document.querySelector('.project-card--folder .project-card__options').click()`);
    await eventually(() => evaluate(`!!document.querySelector('.context-menu')`), `${theme}: "⋯" não abriu o menu`);
    assert.equal(await evaluate(`!!document.querySelector('.folder-banner')`), false, 'O "⋯" abriu a pasta em vez do menu');
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await eventually(() => evaluate(`!document.querySelector('.context-menu')`), 'Menu não fechou');

    // Menu dentro da barra em lote: sem backdrop-filter aninhado (no Chromium ele não desfoca a página).
    await evaluate(`document.querySelector('.select-toggle').click()`);
    await evaluate(`[...document.querySelectorAll('.project-card--saved')].find(el => el.textContent.includes('Projeto solto')).click()`);
    await eventually(() => evaluate(`!!document.querySelector('.batch-bar__menu > .batch-bar__btn:not(:disabled)')`), 'Barra em lote ausente');
    await evaluate(`document.querySelector('.batch-bar__menu > .batch-bar__btn').click()`);
    await eventually(() => evaluate(`!!document.querySelector('.batch-bar__popover')`), 'Menu Mover não abriu');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.batch-bar__popover')).backdropFilter`), 'none', `${theme}: menu da barra em lote com vidro aninhado`);
    await evaluate(`document.querySelector('.batch-bar__close').click()`);

    // Editor vazio: aviso da sidebar bloqueada legível e área de importação com contraste AA.
    await openProject('Projeto vazio');
    await eventually(() => evaluate(`!!document.querySelector('.editor-dropzone') && !!document.querySelector('.editor-sidebar__locked-overlay')`), 'Editor vazio não abriu');
    const locked = await evaluate(`(() => {
      let opacity = 1;
      for (let n = document.querySelector('.editor-sidebar__locked-text'); n; n = n.parentElement) opacity *= parseFloat(getComputedStyle(n).opacity);
      return { opacity, tabs: getComputedStyle(document.querySelector('.sidebar-tabs')).visibility };
    })()`);
    assert.deepEqual(locked, { opacity: 1, tabs: 'hidden' }, `${theme}: aviso da sidebar bloqueada apagado ou sobre as abas`);
    const dropzone = await evaluate(`(() => {
      const channels = (color) => { const v = color.match(/[\\d.]+/g).map(Number); return [v[0], v[1], v[2], v[3] ?? 1]; };
      const title = getComputedStyle(document.querySelector('.editor-dropzone__title')).color;
      const zone = channels(getComputedStyle(document.querySelector('.editor-dropzone')).backgroundColor);
      const canvas = channels(getComputedStyle(document.querySelector('.editor-canvas')).backgroundColor);
      // A área pode ser translúcida: compõe sobre o fundo do canvas antes de medir.
      const mixed = zone.slice(0, 3).map((v, i) => Math.round(v * zone[3] + canvas[i] * (1 - zone[3])));
      return { title, bg: 'rgb(' + mixed.join(', ') + ')' };
    })()`);
    assert.ok(await contrast(dropzone.title, dropzone.bg) >= 4.5, `${theme}: título da área de importação ilegível (${dropzone.title} sobre ${dropzone.bg})`);
    await evaluate(`document.querySelector('.editor-header__back').click()`);
    await eventually(() => evaluate(`!!document.querySelector('.project-card--folder')`), 'Voltar ao dashboard falhou');
  }

  // Tema claro: a sidebar continua escura, então ícone do selo e "#" dos IDs precisam ser claros.
  await seed('light');
  await openProject('Projeto solto');
  await eventually(() => evaluate(`!!document.querySelector('iframe')?.contentDocument?.getElementById('solto')`), 'Editor não abriu');
  await evaluate(`document.querySelector('iframe').contentDocument.getElementById('solto').click()`);
  await evaluate(`document.querySelectorAll('.sidebar-tab')[1].click()`);
  await eventually(() => evaluate(`!!document.querySelector('.foux-layout-id-item__hash')`), 'Lista de IDs ausente');
  const sidebarBg = await evaluate(`getComputedStyle(document.querySelector('.editor-sidebar')).backgroundColor`);
  for (const selector of ['.foux-layout-id-item__hash', '.foux-editor-element-badge__icon']) {
    const color = await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).color`);
    assert.ok(await contrast(color, sidebarBg) >= 4.5, `light: ${selector} some na sidebar escura (${color})`);
  }
  await evaluate(`document.querySelector('.editor-header__back').click()`);
  await eventually(() => evaluate(`!!document.querySelector('.project-card--folder')`), 'Voltar ao dashboard falhou');

  // Transparência reduzida no sistema: superfícies flutuantes ficam sólidas (sem vazamento do fundo).
  await seed('dark');
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  try {
    await evaluate(`document.querySelector('.header__new-folder').click()`);
    await eventually(() => evaluate(`!!document.querySelector('.modal-card--folder')`), 'Modal de pasta ausente');
    const card = await evaluate(`(() => { const cs = getComputedStyle(document.querySelector('.modal-card--folder')); return { backdrop: cs.backdropFilter, bg: cs.backgroundColor, image: cs.backgroundImage }; })()`);
    assert.equal(card.backdrop, 'none');
    assert.match(card.bg, /^rgb\(/, `Modal translúcido sem desfoque: ${card.bg}`);
    assert.equal(card.image, 'none');
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await eventually(() => evaluate(`!document.querySelector('.modal-overlay')`), 'Modal não fechou');
  } finally {
    await command('Emulation.setEmulatedMedia', { features: [] });
  }
  // Com transparência normal, o fundo do modal chega à cor do tema sem usar opacity no pai.
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  try {
    await evaluate(`document.querySelector('.header__new-folder').click()`);
    await eventually(() => evaluate(`!!document.querySelector('.modal-card--folder')`), 'Modal de pasta ausente');
    await eventually(() => evaluate(`getComputedStyle(document.querySelector('.modal-overlay')).backgroundColor !== 'rgba(0, 0, 0, 0)'`), 'Fundo do modal não escureceu');
    const overlay = await evaluate(`(() => { const cs = getComputedStyle(document.querySelector('.modal-overlay')); return { opacity: cs.opacity, card: getComputedStyle(document.querySelector('.modal-card--folder')).backdropFilter }; })()`);
    assert.equal(overlay.opacity, '1', 'Fundo do modal com opacity no pai bloqueia o vidro do card');
    assert.notEqual(overlay.card, 'none', 'Card do modal sem vidro com transparência normal');
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await eventually(() => evaluate(`!document.querySelector('.modal-overlay')`), 'Modal não fechou');
  } finally {
    await command('Emulation.setEmulatedMedia', { features: [] });
  }
  console.log('PASS: paleta da pasta inteira, "⋯" na grade, sem vidro aninhado, sidebar bloqueada legível, importação no Liquid Glass, sidebar escura no tema claro e transparência reduzida');
}
