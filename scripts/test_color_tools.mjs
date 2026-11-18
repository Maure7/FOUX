import assert from 'node:assert/strict';

// Cores recentes, conta-gotas restrito ao canvas e acordeões da sidebar salvos por projeto.
// Uso: npm run test:color-tools
const HTML = `<!doctype html>
<html><head><style>
  body { margin: 0; padding: 16px; background: #ffffff; font-family: Arial, sans-serif; }
  #solid { width: 120px; height: 60px; background: rgb(10, 120, 200); }
  #holder { background: rgb(0, 200, 0); padding: 10px; width: 120px; }
  #inner { display: block; width: 60px; height: 30px; }
  #grad { width: 120px; height: 40px; background: linear-gradient(90deg, rgb(255, 0, 0), rgb(0, 0, 255)); }
  #words { color: rgb(200, 30, 40); font-size: 48px; line-height: 1; margin: 8px 0; }
  #target { width: 120px; height: 40px; background: #eeeeee; }
  #framed { width: 120px; height: 40px; border: 12px solid rgb(0, 0, 0); background: rgb(250, 250, 0); }
  #pic { display: block; width: 100px; height: 30px; }
  #bgimg { width: 100px; height: 30px; background-size: 100% 100%; background-repeat: no-repeat; }
  #faded { width: 100px; height: 30px; background: rgb(0, 0, 0); opacity: 0.5; }
</style></head><body>
  <div id="solid"></div>
  <img id="pic" alt=""><div id="bgimg"></div><div id="faded"></div>
  <div id="holder"><span id="inner"></span></div>
  <div id="grad"></div>
  <p id="words">WWWW</p>
  <div id="target">Alvo</div>
  <div id="framed"></div>
  <div style="height: 1600px"></div>
</body></html>`;

const FRAME = `document.querySelector('.editor-canvas__iframe')`;
const DOC = `${FRAME}.contentDocument`;
const section = (id) => `document.querySelector('.sidebar-section[data-section="${id}"]')`;
const BG_FIELD = `${section('background')}.querySelector('.sidebar-color-field')`;

export async function run({ evaluate, command, eventually }) {
  const settle = () => evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))))');
  const openEditor = async () => {
    await evaluate(`document.querySelector('.project-card--saved').click()`);
    await eventually(() => evaluate(`!!${DOC}?.getElementById('foux-inspector-styles') && !!document.querySelector('.editor-sidebar:not(.editor-sidebar--locked)')`), 'Editor não carregou');
  };
  const backToDashboard = async () => {
    await evaluate(`document.querySelector('.editor-header__back').click()`);
    await eventually(() => evaluate(`!!document.querySelector('.project-card--saved')`), 'Dashboard não voltou');
  };
  const select = async (id) => {
    await evaluate(`${DOC}.getElementById('${id}').click()`);
    await eventually(() => evaluate(`${DOC}.getElementById('${id}').hasAttribute('data-foux-selected')`), `#${id} não foi selecionado`);
  };
  const recent = () => evaluate(`JSON.parse(localStorage.getItem('foux_recent_colors') || '[]')`);
  const targetBg = () => evaluate(`getComputedStyle(${DOC}.getElementById('target')).backgroundColor`);
  // Centro do elemento do canvas em coordenadas da janela do editor (para eventos reais de mouse).
  const pointOf = (id, dx = 0.5, dy = 0.5) => evaluate(`(() => {
    const target = ${DOC}.getElementById('${id}');
    target.scrollIntoView({ block: 'nearest' });
    const frame = ${FRAME}, outer = frame.getBoundingClientRect(), rect = target.getBoundingClientRect();
    return { x: outer.left + frame.clientLeft + rect.left + rect.width * ${dx}, y: outer.top + frame.clientTop + rect.top + rect.height * ${dy} };
  })()`);
  const mouse = async (type, { x, y }, extra = {}) => command('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1, ...extra });
  const hover = async (id, dx, dy) => {
    const point = await pointOf(id, dx, dy);
    await mouse('mouseMoved', point, { button: 'none' });
    await settle();
    return evaluate(`document.querySelector('.eyedropper-badge__hex')?.textContent`);
  };
  const clickAt = async (point) => {
    await mouse('mousePressed', point);
    await mouse('mouseReleased', point);
  };

  await evaluate(`localStorage.clear(); localStorage.setItem('foux_projects', JSON.stringify([{id:'cores',name:'Cores',folderId:null,createdAt:Date.now(),updatedAt:Date.now(),htmlContent:${JSON.stringify(HTML)}}])); window.__stale = true;`);
  await command('Page.reload');
  await eventually(() => evaluate(`!window.__stale && !!document.querySelector('.project-card--saved')`), 'Projeto não apareceu');
  await openEditor();

  // 1. Acordeões começam fechados e são lembrados por projeto.
  await select('target');
  assert.equal(await evaluate(`document.querySelectorAll('.sidebar-content .sidebar-section--open').length`), 0, 'Seções deveriam abrir fechadas');
  assert.ok(await evaluate(`document.querySelectorAll('.sidebar-content .sidebar-section--closed').length >= 3`));
  await evaluate(`${section('borders')}.querySelector('.sidebar-section__header').click()`);
  await evaluate(`${section('background')}.querySelector('.sidebar-section__header').click()`);
  await eventually(() => evaluate(`${section('background')}.classList.contains('sidebar-section--open')`), 'Seção não abriu');
  assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('foux_sidebar_sections')).cores`), { borders: true, background: true });
  await backToDashboard();
  await openEditor();
  await select('target');
  assert.deepEqual(
    await evaluate(`[...document.querySelectorAll('.sidebar-content .sidebar-section--open')].map((node) => node.dataset.section).sort()`),
    ['background', 'borders'],
    'Reabrir o projeto deveria manter exatamente as seções abertas',
  );
  console.log('✔ Seções da sidebar iniciam fechadas e são restauradas por projeto');

  // 2. Cores recentes: só a escolha confirmada entra, sem duplicatas e em minúsculas.
  await evaluate(`(() => {
    const input = ${BG_FIELD}.querySelector('input[type="color"]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const value of ['#111111', '#222222', '#333333']) {
      set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`);
  await settle();
  assert.deepEqual(await recent(), [], 'Arrastar o seletor não pode gravar cada cor intermediária');
  await evaluate(`${BG_FIELD}.querySelector('input[type="color"]').dispatchEvent(new Event('change', { bubbles: true }))`);
  assert.deepEqual(await recent(), ['#333333']);
  await evaluate(`(() => {
    const input = ${BG_FIELD}.querySelector('.sidebar-color-text');
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '#ABCDEF');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  })()`);
  assert.deepEqual(await recent(), ['#abcdef', '#333333']);
  await eventually(() => evaluate(`${BG_FIELD}.querySelectorAll('.sidebar-recent-colors__swatch').length === 2`), 'Swatches não apareceram');
  assert.equal(await evaluate(`${BG_FIELD}.querySelector('.sidebar-recent-colors__swatch').dataset.tooltip`), '#abcdef');
  assert.match(await evaluate(`${BG_FIELD}.querySelector('.sidebar-recent-colors__swatch').getAttribute('aria-label')`), /#abcdef/);
  assert.match(await evaluate(`${BG_FIELD}.querySelector('.sidebar-recent-colors__label').textContent`), /Cores recentes/);

  // Clique num swatch aplica, vai para o início da fila e entra no histórico.
  // Pausa maior que a do gesto (350 ms): o swatch vira um passo próprio de desfazer.
  await new Promise((resolve) => setTimeout(resolve, 450));
  await evaluate(`[...${BG_FIELD}.querySelectorAll('.sidebar-recent-colors__swatch')].find((node) => node.dataset.tooltip === '#333333').click()`);
  await eventually(async () => (await targetBg()) === 'rgb(51, 51, 51)', 'Swatch não aplicou a cor');
  assert.deepEqual(await recent(), ['#333333', '#abcdef']);
  await new Promise((resolve) => setTimeout(resolve, 450));
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))`);
  await eventually(async () => (await targetBg()) === 'rgb(171, 205, 239)', 'Desfazer não voltou à cor anterior ao swatch');
  await select('target');
  console.log('✔ Cores recentes: confirmação anti-spam, FIFO sem duplicatas e aplicação com histórico');

  // 3. Conta-gotas restrito ao canvas.
  await eventually(() => evaluate(`!!${section('background')}.querySelector('.sidebar-eyedropper-btn')`), 'Botão do conta-gotas ausente');
  await evaluate(`${section('background')}.querySelector('.sidebar-eyedropper-btn').click()`);
  await eventually(() => evaluate(`!!document.querySelector('.eyedropper-layer') && document.documentElement.classList.contains('foux-picking-color')`), 'Modo conta-gotas não ativou');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.editor-sidebar')).cursor`), 'not-allowed');

  // Cliques fora do canvas são ignorados (a aba não troca).
  await evaluate(`[...document.querySelectorAll('.sidebar-tab')].find((tab) => tab.textContent.trim() === 'Layout').click()`);
  await settle();
  assert.equal(await evaluate(`document.querySelector('.sidebar-tab--active').textContent.trim()`), 'Estilos', 'Clique fora do canvas não pode agir');
  assert.ok(await evaluate(`!!document.querySelector('.eyedropper-layer')`));

  assert.equal(await hover('solid'), '#0a78c8', 'Fundo sólido');
  assert.equal(await hover('inner'), '#00c800', 'Filho transparente herda o fundo do pai');
  assert.equal(await hover('grad', 0.05), '#ff0000', 'Gradiente usa a primeira parada');
  assert.equal(await hover('words', 0.1), '#c81e28', 'Sobre as letras, a cor do texto');
  assert.match(await evaluate(`document.querySelector('.eyedropper-badge').textContent`), /<p>/);
  await mouse('mouseMoved', await pointOf('words', 0.1), { button: 'none', modifiers: 8 });
  await settle();
  assert.equal(await evaluate(`document.querySelector('.eyedropper-badge__hex').textContent`), '#ffffff', 'Shift alterna para o fundo');

  // Esc cancela sem aplicar.
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  await eventually(() => evaluate(`!document.querySelector('.eyedropper-layer') && !document.documentElement.classList.contains('foux-picking-color')`), 'Esc não cancelou');
  assert.equal(await targetBg(), 'rgb(171, 205, 239)');

  // Captura: aplica no elemento selecionado, mantém a seleção e grava nas recentes.
  await evaluate(`${section('background')}.querySelector('.sidebar-eyedropper-btn').click()`);
  await eventually(() => evaluate(`!!document.querySelector('.eyedropper-layer')`), 'Conta-gotas não reativou');
  await hover('solid');
  await clickAt(await pointOf('solid'));
  await eventually(async () => (await targetBg()) === 'rgb(10, 120, 200)', 'Cor capturada não foi aplicada');
  assert.ok(await evaluate(`${DOC}.getElementById('target').hasAttribute('data-foux-selected')`), 'A captura não pode trocar o elemento selecionado');
  assert.equal(await evaluate(`${DOC}.getElementById('solid').hasAttribute('data-foux-selected')`), false);
  assert.ok(await evaluate(`!document.querySelector('.eyedropper-layer')`), 'Modo deveria desligar após capturar');
  assert.equal((await recent())[0], '#0a78c8');
  assert.ok(await evaluate(`!document.querySelector('.editor-header [aria-label*="Desfazer"]')?.disabled`));

  // Clicar no próprio botão cancela.
  await evaluate(`${section('background')}.querySelector('.sidebar-eyedropper-btn').click()`);
  await eventually(() => evaluate(`!!document.querySelector('.eyedropper-layer')`), 'Conta-gotas não reativou');
  await evaluate(`${section('background')}.querySelector('.sidebar-eyedropper-btn').click()`);
  await eventually(() => evaluate(`!document.querySelector('.eyedropper-layer')`), 'Clique no botão não cancelou');
  console.log('✔ Conta-gotas: amostra só o canvas, resolve texto/fundo/gradiente e aplica sem trocar a seleção');

  // Regressões achadas no QA.
  const startPicking = async () => {
    await evaluate(`${section('background')}.querySelector('.sidebar-eyedropper-btn').click()`);
    await eventually(() => evaluate(`!!document.querySelector('.eyedropper-layer')`), 'Conta-gotas não ativou');
  };
  const stopPicking = async () => {
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await eventually(() => evaluate(`!document.querySelector('.eyedropper-layer')`), 'Esc não cancelou');
  };
  await startPicking();
  // Borda grossa: a cor da borda, não a do fundo.
  assert.equal(await hover('framed', 0.03), '#000000', 'Sobre a borda, a cor da borda');
  assert.match(await evaluate(`document.querySelector('.eyedropper-badge').textContent`), /borda/);
  assert.equal(await hover('framed', 0.5), '#fafa00', 'No centro, o fundo');
  // O fundo do body se propaga para a área fora da caixa dele (margem, abaixo do conteúdo).
  // Uma margem direita no body deixa uma faixa do canvas fora da caixa dele.
  await evaluate(`Object.assign(${DOC}.body.style, { background: 'rgb(18, 52, 86)', marginRight: '40px' })`);
  const below = await evaluate(`(() => { const frame = ${FRAME}, rect = frame.getBoundingClientRect(); return { x: rect.left + frame.clientLeft + frame.clientWidth - 12, y: rect.top + 30 }; })()`);
  assert.equal(await evaluate(`${DOC}.elementFromPoint(${FRAME}.clientWidth - 12, 30 - ${FRAME}.clientTop).tagName`), 'HTML', 'O ponto deveria cair fora do body');
  await mouse('mouseMoved', below, { button: 'none' });
  await settle();
  assert.equal(await evaluate(`document.querySelector('.eyedropper-badge__hex').textContent`), '#123456', 'Fundo propagado do body');
  await evaluate(`Object.assign(${DOC}.body.style, { background: '', marginRight: '' })`);
  await stopPicking();

  // Duplo clique: o 2º clique (já sem a camada) não pode selecionar outro elemento.
  await startPicking();
  const solid = await pointOf('solid');
  await mouse('mouseMoved', solid, { button: 'none' });
  await mouse('mousePressed', solid, { clickCount: 1 });
  await mouse('mouseReleased', solid, { clickCount: 1 });
  await mouse('mousePressed', solid, { clickCount: 2 });
  await mouse('mouseReleased', solid, { clickCount: 2 });
  await settle();
  assert.ok(await evaluate(`${DOC}.getElementById('target').hasAttribute('data-foux-selected')`), 'Duplo clique trocou o elemento selecionado');
  assert.equal(await evaluate(`${DOC}.getElementById('solid').hasAttribute('data-foux-selected')`), false);
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Esc com o foco dentro do canvas também cancela.
  await startPicking();
  await evaluate(`${FRAME}.contentWindow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  await eventually(() => evaluate(`!document.querySelector('.eyedropper-layer')`), 'Esc vindo do iframe não cancelou');

  // Pixels de imagem (<img> e background-image) e opacity composta sobre o fundo.
  await evaluate(`(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 1;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ff0000'; context.fillRect(0, 0, 1, 1);
    context.fillStyle = '#0000ff'; context.fillRect(1, 0, 1, 1);
    const url = canvas.toDataURL('image/png');
    const image = ${DOC}.getElementById('pic');
    image.src = url;
    await image.decode();
    ${DOC}.getElementById('bgimg').style.backgroundImage = 'url(' + url + ')';
  })()`);
  await startPicking();
  assert.equal(await hover('pic', 0.25), '#ff0000', 'Pixel esquerdo da <img>');
  assert.equal(await hover('pic', 0.75), '#0000ff', 'Pixel direito da <img>');
  assert.match(await evaluate(`document.querySelector('.eyedropper-badge').textContent`), /imagem/);
  await hover('bgimg', 0.25);
  await eventually(async () => (await hover('bgimg', 0.75)) === '#0000ff', 'Pixel do background-image');
  assert.equal(await hover('bgimg', 0.25), '#ff0000');
  assert.equal(await hover('faded'), '#808080', 'opacity 0.5 de preto sobre branco');

  // A camada deixa a barra de rolagem do canvas de fora (continua arrastável).
  const widths = await evaluate(`({ layer: document.querySelector('.eyedropper-layer').getBoundingClientRect().width, page: ${DOC}.scrollingElement.clientWidth, frame: ${FRAME}.clientWidth })`);
  assert.equal(Math.round(widths.layer), widths.page, 'A camada deveria acabar onde começa a barra de rolagem');
  assert.ok(widths.page < widths.frame, `O canvas deveria ter barra de rolagem visível (${JSON.stringify(widths)})`);
  await stopPicking();

  // Paradas de gradiente cabem na sidebar e o conta-gotas da "Cor Final" é clicável.
  await evaluate(`${section('background')}.querySelector('.sidebar-gradient-toggle input').click()`);
  await eventually(() => evaluate(`${section('background')}.querySelectorAll('.sidebar-gradient-color-field').length === 2`), 'Gradiente não ligou');
  await settle();
  const layout = await evaluate(`(() => {
    const sidebar = document.querySelector('.sidebar-content').getBoundingClientRect();
    const buttons = [...${section('background')}.querySelectorAll('.sidebar-gradient-color-field .sidebar-eyedropper-btn')];
    return buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { inside: rect.right <= sidebar.right + 0.5, reachable: document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === button.closest('button') || button.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)) };
    });
  })()`);
  assert.deepEqual(layout, [{ inside: true, reachable: true }, { inside: true, reachable: true }], 'Paradas de gradiente transbordam a sidebar');
  // O aviso de "Limpar dados" diz o que fica: as cores recentes são mantidas de propósito.
  const { readFile } = await import('node:fs/promises');
  for (const [lang, kept] of [['pt', 'cores recentes são mantidos'], ['es', 'los colores recientes']]) {
    const locale = JSON.parse(await readFile(new URL(`../src/locales/${lang}.json`, import.meta.url), 'utf8'));
    assert.ok(locale.settings.clearConfirmMessage.includes(kept), `Texto de "Limpar dados" (${lang}) não menciona o que é mantido`);
  }
  console.log('✔ Regressões do QA: borda, fundo propagado do body, duplo clique, Esc no iframe, imagens, opacity, barra de rolagem, gradiente na sidebar e aviso de limpeza');
}
