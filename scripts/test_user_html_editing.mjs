import assert from 'node:assert/strict';

// Regressões do motor de edição com HTML "de aluno": sem classes ou atributos do
// FOUX, poucos IDs, <style> interno, estilos inline e bordas sem border-style.
// Uso: npm run test:user-html
const USER_HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'">
<style>
  body { margin: 0; font-family: Georgia, serif; }
  .card { padding: 12px; background: #eeeeee; margin: 8px; }
  button { border: 0; padding: 6px 10px; }
  .alert { color: red !important; padding: 4px !important; font-size: 14px !important; }
  .note { border-left: 6px solid rgb(255, 0, 0); padding: 8px; }
  .hero { background: linear-gradient(to right, #ff0000, #0000ff); height: 40px; }
  .spot { background: radial-gradient(circle, #ff0000, #0000ff); height: 40px; }
  nav { position: relative; background: #333333; color: #ffffff; }
  .menu { position: absolute; top: 100%; left: 0; margin: 0; background: #ff9900; }
  .tall { height: 2400px; }
  .ribbon { border: 4px solid; border-image: linear-gradient(45deg, #ff0000, #0000ff) 1; }
</style></head><body>
  <nav>Menu<ul class="menu"><li>Item</li></ul></nav>
  <div class="card">Cartão sem borda</div>
  <button>Botão com reset</button>
  <p class="alert">Aviso com !important</p>
  <div class="note">Nota com borda só à esquerda</div>
  <div class="hero">Hero</div>
  <div class="spot">Radial</div>
  <div class="paint" style="background-color: rgb(255, 0, 0); height: 30px">Sólido</div>
  <div class="framed" style="margin: 20px; width: 160px; height: 60px; border: 6px solid #333333; background: #ffffff">Moldura</div>
  <div class="ribbon">Faixa com border-image autoral</div>
  <pre>código</pre>
  <svg width="40" height="40"><circle cx="20" cy="20" r="10"></circle></svg>
  <p id="dup">Primeiro</p><p id="dup">Segundo</p>
  <div id="1">Numérico</div>
  <script>document.body.innerHTML = 'quebrado';</script>
  <div class="tall">Alto</div>
</body></html>`;

const FRAME = `document.querySelector('.editor-canvas__iframe')`;
const DOC = `${FRAME}.contentDocument`;

export async function run({ evaluate, command, eventually }) {
  const settle = () => evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))))');
  async function open(html, extra = {}) {
    await evaluate(`document.querySelector('.editor-header__back')?.click()`);
    await evaluate(`localStorage.clear(); localStorage.setItem('foux_projects', JSON.stringify([{id:'aluno',name:'Aluno',folderId:null,createdAt:Date.now(),updatedAt:Date.now(),htmlContent:${JSON.stringify(html)},...${JSON.stringify(extra)}}])); window.__stale = true;`);
    await command('Page.reload');
    await eventually(() => evaluate(`!window.__stale && !!document.querySelector('.project-card--saved')`), 'Projeto do aluno não apareceu');
    if (html) await reopen();
    else {
      await evaluate(`document.querySelector('.project-card--saved').click()`);
      await eventually(() => evaluate(`!!document.querySelector('.editor-dropzone')`), 'Projeto vazio não mostrou a área de importação');
    }
  }
  async function reopen() {
    await evaluate(`document.querySelector('.project-card--saved').click()`);
    await eventually(() => evaluate(`!!${DOC}?.getElementById('foux-inspector-styles') && !!document.querySelector('.editor-sidebar:not(.editor-sidebar--locked)')`), 'Editor não carregou o HTML do aluno');
  }
  // dispatchEvent em vez de click(): elementos SVG não têm click().
  const pick = async (selector, index = 0) => {
    await evaluate(`${DOC}.querySelectorAll(${JSON.stringify(selector)})[${index}].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))`);
    await settle();
  };
  const computed = (selector, properties, index = 0) => evaluate(`(() => {
    const element = ${DOC}.querySelectorAll(${JSON.stringify(selector)})[${index}];
    const style = ${FRAME}.contentWindow.getComputedStyle(element);
    return Object.fromEntries(${JSON.stringify(properties)}.map((name) => [name, style[name]]));
  })()`);
  const setValue = async (query, value, events = ['input']) => {
    await evaluate(`(() => {
      const input = document.querySelector(${JSON.stringify(query)});
      if (!input) throw new Error('Controle ausente: ' + ${JSON.stringify(query)});
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(String(value))});
      for (const type of ${JSON.stringify(events)}) input.dispatchEvent(new Event(type, { bubbles: true }));
    })()`);
    await settle();
  };
  const setNumber = (label, value) => setValue(`input[aria-label="${label}"][type="number"]`, value);
  const setColor = (label, hex) => setValue(`input[type="color"][aria-label="${label}"]`, hex, ['input', 'change']);
  const tab = async (name) => {
    await evaluate(`Array.from(document.querySelectorAll('.sidebar-tab')).find((button) => button.textContent.trim() === ${JSON.stringify(name)}).click()`);
    await settle();
  };
  const undo = () => evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))`);
  const redo = () => evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }))`);
  const center = (selector) => evaluate(`(() => {
    const element = ${DOC}.querySelector(${JSON.stringify(selector)});
    element.scrollIntoView({ block: 'center' });
    const rect = element.getBoundingClientRect();
    const frame = ${FRAME}.getBoundingClientRect();
    return { x: frame.left + rect.left + rect.width / 2, y: frame.top + rect.top + rect.height / 2 };
  })()`);
  const exportCss = () => evaluate(`(async () => { const { generateProjectCss } = await import('/src/utils/exportCss.js'); return generateProjectCss(${DOC}); })()`);

  await open(USER_HTML);
  assert.equal(await evaluate(`${DOC}.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').length`), 0, 'A CSP do aluno continuou bloqueando o editor');
  assert.equal(await evaluate(`!!${DOC}.querySelector('.card')`), true, 'Script do aluno rodou dentro do canvas');
  await pick('.card');
  assert.equal((await computed('.card', ['outlineStyle'])).outlineStyle, 'solid', 'Seleção sem contorno com CSP no documento');
  console.log('PASS: CSP do aluno removida da prévia, scripts barrados e inspetor funcionando');

  // Cor de borda num elemento sem borda: precisa aparecer em um único passo de desfazer.
  await setColor('Cor da Borda', '#ff0000');
  assert.deepEqual(await computed('.card', ['borderTopStyle', 'borderTopWidth', 'borderTopColor']),
    { borderTopStyle: 'solid', borderTopWidth: '3px', borderTopColor: 'rgb(255, 0, 0)' }, 'Cor de borda continuou invisível');
  await eventually(() => evaluate(`document.querySelector('input[aria-label="Espessura da Borda"][type="number"]').value === '3'`), 'Slider de espessura não sincronizou');
  await undo();
  await eventually(async () => (await computed('.card', ['borderTopStyle'])).borderTopStyle === 'none', 'Desfazer não removeu a borda revelada');
  await redo();
  await eventually(async () => (await computed('.card', ['borderTopStyle', 'borderTopColor'])).borderTopColor === 'rgb(255, 0, 0)', 'Refazer não trouxe a borda');
  assert.equal((await computed('.card', ['borderTopStyle'])).borderTopStyle, 'solid');
  await pick('button');
  await setColor('Cor da Borda', '#00ff00');
  assert.deepEqual(await computed('button', ['borderTopStyle', 'borderTopWidth']), { borderTopStyle: 'solid', borderTopWidth: '3px' }, 'Reset border: 0 deixou a borda invisível');
  await pick('.paint');
  await setNumber('Cor da Borda — Opacidade', 0);
  assert.equal((await computed('.paint', ['borderTopStyle'])).borderTopStyle, 'none', 'Opacidade 0 criou uma borda que empurra o layout');
  console.log('PASS: cor de borda revela estilo e espessura, reset border: 0, opacidade zero e um passo de desfazer');

  // Borda só à esquerda: a sidebar lê o lado visível e a espessura não liga os outros lados.
  await pick('.note');
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Espessura da Borda"][type="number"]').value`), '6');
  assert.equal(await evaluate(`document.querySelector('input[type="color"][aria-label="Cor da Borda"]').value`), '#ff0000');
  await setNumber('Espessura da Borda', 10);
  assert.deepEqual(await computed('.note', ['borderLeftWidth', 'borderLeftStyle', 'borderTopStyle']),
    { borderLeftWidth: '10px', borderLeftStyle: 'solid', borderTopStyle: 'none' }, 'Espessura ligou bordas que não existiam');
  console.log('PASS: borda de um lado só lida e editada sem ganhar os outros lados');

  // Arredondar não força overflow: menus posicionados aparecem e o body continua rolando.
  await pick('nav');
  await setNumber('Arredondamento', 12);
  assert.deepEqual(await computed('nav', ['overflowX', 'overflowY', 'borderTopLeftRadius']), { overflowX: 'visible', overflowY: 'visible', borderTopLeftRadius: '12px' });
  await pick('body');
  await setNumber('Arredondamento', 20);
  await evaluate(`${FRAME}.contentWindow.scrollTo(0, 0)`);
  const canvas = await evaluate(`(() => { const r = ${FRAME}.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await command('Input.dispatchMouseEvent', { type: 'mouseWheel', ...canvas, deltaX: 0, deltaY: 400 });
  await eventually(() => evaluate(`${FRAME}.contentWindow.scrollY > 0`), 'Arredondar o body travou a rolagem do canvas');
  await evaluate(`${FRAME}.contentWindow.scrollTo(0, 0)`);
  assert.doesNotMatch(await exportCss(), /overflow: hidden/, 'overflow forçado vazou para o CSS exportado');
  console.log('PASS: border-radius sem overflow forçado (menu visível, body rolando, CSS exportado limpo)');

  // !important autoral: a edição precisa vencer, também no CSS exportado.
  await pick('.alert');
  await setColor('Cor do Texto', '#0000ff');
  await setNumber('Tamanho da Fonte', 30);
  await setNumber('Espaçamento interno', 20);
  assert.deepEqual(await computed('.alert', ['color', 'fontSize', 'paddingTop']),
    { color: 'rgb(0, 0, 255)', fontSize: '30px', paddingTop: '20px' }, 'Edição perdeu para !important do aluno');
  console.log('PASS: edições vencem !important autoral (cor, fonte e padding)');

  // Gradientes: "to right" é editável; radial não editável dá lugar à cor escolhida num passo.
  await pick('.hero');
  assert.equal(await evaluate(`document.querySelector('[data-tour="background"] .sidebar-gradient-toggle input').checked`), true, 'Gradiente "to right" não foi reconhecido');
  assert.equal(await evaluate(`document.querySelector('.sidebar-gradient-angle-section input[type="number"]').value`), '90');
  await pick('.spot');
  assert.equal(await evaluate(`document.querySelector('[data-tour="background"] .sidebar-gradient-toggle input').checked`), false);
  await setColor('Cor de Fundo', '#00ff00');
  assert.deepEqual(await computed('.spot', ['backgroundImage', 'backgroundColor']), { backgroundImage: 'none', backgroundColor: 'rgb(0, 255, 0)' }, 'Cor de fundo ficou escondida sob o gradiente radial');
  await undo();
  await eventually(async () => (await computed('.spot', ['backgroundImage'])).backgroundImage.startsWith('radial-gradient'), 'Desfazer não devolveu o gradiente radial');
  await redo();
  await eventually(async () => (await computed('.spot', ['backgroundImage'])).backgroundImage === 'none', 'Refazer não aplicou a cor sobre o radial');
  await pick('.paint');
  await evaluate(`document.querySelector('[data-tour="background"] .sidebar-gradient-toggle input').click()`);
  await settle();
  await evaluate(`document.querySelector('[data-tour="background"] .sidebar-gradient-toggle input').click()`);
  await settle();
  assert.deepEqual(await computed('.paint', ['backgroundImage', 'backgroundColor']), { backgroundImage: 'none', backgroundColor: 'rgb(255, 0, 0)' }, 'Sólido → gradiente → sólido perdeu a cor');
  console.log('PASS: gradiente "to right", radial substituído com desfazer e cor sólida preservada no toggle');

  // Hover real com o mouse: fundo sólido sobre gradiente estático e sobre borda em gradiente.
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  await pick('.hero');
  await tab('Eventos');
  await evaluate(`Array.from(document.querySelectorAll('.sidebar-toggle-row')).find((row) => row.textContent.includes('Cor de Fundo no Hover')).querySelector('input').click()`);
  await settle();
  await setColor('Cor de Fundo no Hover', '#00ff00');
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...(await center('.hero')) });
  await eventually(async () => {
    const style = await computed('.hero', ['backgroundImage', 'backgroundColor']);
    return style.backgroundImage === 'none' && style.backgroundColor === 'rgb(0, 255, 0)';
  }, 'Hover de fundo ficou escondido pelo gradiente estático');
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  await tab('Estilos');
  await pick('.framed');
  await evaluate(`document.querySelector('[data-tour="borders"] .sidebar-gradient-toggle input').click()`);
  await settle();
  await tab('Eventos');
  await evaluate(`Array.from(document.querySelectorAll('.sidebar-toggle-row')).find((row) => row.textContent.includes('Cor de Fundo no Hover')).querySelector('input').click()`);
  await settle();
  await setColor('Cor de Fundo no Hover', '#00ff00');
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...(await center('.framed')) });
  await eventually(async () => (await computed('.framed', ['backgroundImage'])).backgroundImage.startsWith('linear-gradient(rgb(0, 255, 0), rgb(0, 255, 0))'),
    'Hover de fundo não apareceu com borda em gradiente');
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  await eventually(async () => (await computed('.framed', ['backgroundImage'])).backgroundImage.startsWith('linear-gradient(rgb(255, 255, 255)'), 'Fundo não voltou ao tirar o mouse');
  await tab('Estilos');
  console.log('PASS: hover real com cor sólida sobre gradiente estático e sobre borda em gradiente');

  // Selecionar não pode converter o border-image da folha do aluno (só o legado inline do FOUX).
  await pick('.ribbon');
  assert.equal(await evaluate(`${DOC}.querySelector('.ribbon').getAttribute('style')`), null, 'Selecionar alterou o border-image autoral');
  assert.match((await computed('.ribbon', ['borderImageSource'])).borderImageSource, /^linear-gradient/);

  // Hex digitado sem '#' no campo de texto da cor.
  await pick('.card');
  await setValue('input.sidebar-color-text[aria-label="Cor da Borda"]', 'abc');
  assert.equal((await computed('.card', ['borderTopColor'])).borderTopColor, 'rgb(170, 187, 204)', 'Hex curto digitado não foi aplicado');
  await setValue('input.sidebar-color-text[aria-label="Cor da Borda"]', 'ff0000');
  assert.equal((await computed('.card', ['borderTopColor'])).borderTopColor, 'rgb(255, 0, 0)');
  // O onBlur do React escuta focusout.
  await evaluate(`document.querySelector('input.sidebar-color-text[aria-label="Cor da Borda"]').dispatchEvent(new FocusEvent('focusout', { bubbles: true }))`);
  console.log('PASS: border-image autoral intacto ao selecionar e hex digitado sem #');

  // Tipografia e mídia em tags fora do tutorial.
  await pick('pre');
  assert.equal(await evaluate(`!!document.querySelector('select[aria-label="Família da Fonte"]')`), true, 'pre sem família da fonte');
  await pick('circle');
  assert.equal(await evaluate(`!!document.querySelector('select[aria-label="Família da Fonte"]')`), false, 'Forma SVG ofereceu família da fonte');
  await pick('svg');
  assert.equal(await evaluate(`!!document.querySelector('input[aria-label="Largura"][type="number"]')`), true, 'svg sem controles de dimensão');
  console.log('PASS: família da fonte em pre, nada de fonte em formas SVG e dimensões para svg');

  // Exportar e reaplicar no HTML original (sem atributos do FOUX) reproduz o visual.
  const css = await exportCss();
  assert.doesNotMatch(css, /foux-hover-target-|data-foux|overflow: hidden/);
  // Sem conflito na cascata, a borda revelada sai sem !important no CSS do aluno.
  assert.doesNotMatch(css.match(/\.card \{[^}]*\}/)?.[0] ?? 'ausente', /!important|ausente/, 'Regra .card ausente ou com !important desnecessário');
  await evaluate(`new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.id = 'user-export-test';
    frame.setAttribute('sandbox', 'allow-same-origin');
    Object.assign(frame.style, { position: 'fixed', left: '0', top: '0', width: '900px', height: '700px', zIndex: '20000' });
    frame.onload = resolve;
    frame.srcdoc = ${JSON.stringify(USER_HTML.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, ''))}.replace('</body>', '<style>' + ${JSON.stringify(css)} + '</style></body>');
    document.body.append(frame);
  })`);
  const reapplied = await evaluate(`(() => {
    const frame = document.getElementById('user-export-test');
    const doc = frame.contentDocument;
    const style = (selector) => frame.contentWindow.getComputedStyle(doc.querySelector(selector));
    return {
      card: [style('.card').borderTopStyle, style('.card').borderTopColor],
      button: style('button').borderTopWidth,
      alert: [style('.alert').color, style('.alert').paddingTop, style('.alert').fontSize],
      note: [style('.note').borderLeftWidth, style('.note').borderTopStyle],
      nav: [style('nav').borderTopLeftRadius, style('nav').overflowY],
      spot: style('.spot').backgroundImage,
    };
  })()`);
  await evaluate(`document.getElementById('user-export-test').remove()`);
  assert.deepEqual(reapplied, {
    card: ['solid', 'rgb(255, 0, 0)'],
    button: '3px',
    alert: ['rgb(0, 0, 255)', '20px', '30px'],
    note: ['10px', 'none'],
    nav: ['12px', 'visible'],
    spot: 'none',
  }, 'CSS exportado não reproduziu o visual no HTML original');
  console.log('PASS: CSS exportado reaplicado no HTML original reproduz bordas, !important, radius e fundos');

  // Aba Layout: IDs repetidos selecionam a repetição certa.
  await tab('Layout');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.foux-layout-id-item__name')).map((item) => item.textContent)`), ['dup', 'dup', '1']);
  await evaluate(`document.querySelectorAll('.foux-layout-id-item')[1].click()`);
  await settle();
  assert.equal(await evaluate(`${DOC}.querySelector('[data-foux-selected]')?.textContent`), 'Segundo', 'ID repetido selecionou o primeiro elemento');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.foux-layout-id-item')).map((item) => item.classList.contains('foux-layout-id-item--active'))`), [false, true, false]);
  await evaluate(`document.querySelectorAll('.foux-layout-id-item')[2].click()`);
  await settle();
  assert.equal(await evaluate(`${DOC}.querySelector('[data-foux-selected]')?.textContent`), 'Numérico');
  console.log('PASS: aba Layout com IDs repetidos e numéricos');

  // Restaurar elemento, Limpar tela e desfazer em sequência.
  await pick('.alert');
  await evaluate(`document.querySelector('.foux-editor-element-badge__restore').click()`);
  await settle();
  assert.equal((await computed('.alert', ['color'])).color, 'rgb(255, 0, 0)', 'Restaurar não devolveu o estilo autoral');
  await undo();
  await eventually(async () => (await computed('.alert', ['color'])).color === 'rgb(0, 0, 255)', 'Desfazer após Restaurar falhou');
  await evaluate(`document.querySelector('[aria-label="Limpar tela"]').click()`);
  await eventually(() => evaluate(`!!document.querySelector('.modal-overlay[data-state="open"] .modal-confirm__delete-btn')`), 'Confirmação de Limpar tela não abriu');
  await evaluate(`document.querySelector('.modal-overlay[data-state="open"] .modal-confirm__delete-btn').click()`);
  await eventually(async () => (await computed('.card', ['borderTopStyle'])).borderTopStyle === 'none'
    && (await computed('.alert', ['color'])).color === 'rgb(255, 0, 0)'
    && (await computed('.spot', ['backgroundImage'])).backgroundImage.startsWith('radial-gradient'), 'Limpar tela não reverteu as edições');
  assert.equal(await evaluate(`${DOC}.getElementById('foux-user-hover-rules')?.textContent.trim() || ''`), '', 'Limpar tela manteve regras de hover');
  await undo();
  await eventually(async () => (await computed('.card', ['borderTopStyle'])).borderTopStyle === 'solid'
    && (await computed('.alert', ['color'])).color === 'rgb(0, 0, 255)', 'Desfazer após Limpar tela não trouxe as edições');
  console.log('PASS: Restaurar elemento, Limpar tela e desfazer de cada um');

  // Salvamento automático e reabertura preservam as edições, sem lixo do editor.
  await eventually(() => evaluate(`JSON.parse(localStorage.getItem('foux_projects'))[0].htmlContent.includes('border-style: solid')`), 'Salvamento automático não gravou a borda');
  const saved = await evaluate(`JSON.parse(localStorage.getItem('foux_projects'))[0].htmlContent`);
  assert.doesNotMatch(saved, /Content-Security-Policy|data-foux-export-parser|data-foux-selected|foux-inspector-styles/);
  await evaluate(`document.querySelector('.editor-header__back').click(); window.__stale = true;`);
  await command('Page.reload');
  await eventually(() => evaluate(`!window.__stale && !!document.querySelector('.project-card--saved')`), 'Projeto sumiu após recarregar');
  await reopen();
  assert.deepEqual(await computed('.card', ['borderTopStyle', 'borderTopColor']), { borderTopStyle: 'solid', borderTopColor: 'rgb(255, 0, 0)' });
  assert.equal((await computed('.alert', ['color'])).color, 'rgb(0, 0, 255)');
  console.log('PASS: salvamento automático e reabertura do HTML do aluno');

  // Aba Layout aberta durante a importação de outro HTML: a lista acompanha o documento novo.
  await tab('Layout');
  await evaluate(`(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['<h1 id="novo">Novo</h1><p id="outro">Outro</p>'], 'novo.html', { type: 'text/html' }));
    const input = document.querySelector('.editor-shell > input[type=file]');
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await eventually(() => evaluate(`!!${DOC}?.getElementById('novo')`), 'Importação por arquivo falhou');
  await eventually(() => evaluate(`Array.from(document.querySelectorAll('.foux-layout-id-item__name')).map((item) => item.textContent).join() === 'novo,outro'`), 'Lista de IDs ficou com o documento anterior');
  await tab('Estilos');
  console.log('PASS: importação por arquivo atualiza a lista da aba Layout');

  // Arrastar e soltar um .html num projeto vazio.
  await open(null);
  await evaluate(`(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['<h1 id="solto">Solto</h1>'], 'solto.html', { type: 'text/html' }));
    const zone = document.querySelector('.editor-dropzone');
    zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  })()`);
  await eventually(() => evaluate(`!!${DOC}?.getElementById('solto')`), 'Arrastar e soltar não importou o HTML');
  console.log('PASS: arrastar e soltar importa o HTML num projeto vazio');

  // Largura além do max-width não muda o computado: o rascunho do slider não pode
  // passar para outra imagem com o mesmo valor nem sobreviver ao "Restaurar elemento".
  const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  await open(`<!doctype html><html><head><style>.box { width: 300px; } img { display: block; max-width: 100%; height: 40px; }</style></head>
    <body><div class="box"><img class="foto" alt="a" src="${PIXEL}" style="width: 300px"><img class="foto" alt="b" src="${PIXEL}" style="width: 300px"></div>
    <p class="vazio">Fundo transparente</p><nav class="escuro" style="background: #333333; color: #ffffff">Fundo escuro</nav></body></html>`);
  const widthShown = () => evaluate(`['range', 'number'].map((type) => document.querySelector('input[type="' + type + '"][aria-label="Largura"]').value)`);
  await pick('.foto', 0);
  await setValue('input[type="range"][aria-label="Largura"]', 900);
  assert.equal((await computed('.foto', ['width'], 0)).width, '300px', 'O max-width deixou de limitar a imagem');
  assert.deepEqual(await widthShown(), ['900', '900']);
  await pick('.foto', 1);
  assert.deepEqual(await widthShown(), ['300', '300'], 'O slider herdou o rascunho da imagem anterior');
  await pick('.foto', 0);
  await setValue('input[type="range"][aria-label="Largura"]', 900);
  await evaluate(`document.querySelector('.foux-editor-element-badge__restore').click()`);
  await settle();
  assert.deepEqual(await widthShown(), ['300', '300'], 'Restaurar elemento manteve o rascunho do slider');
  console.log('PASS: rascunho do slider descartado ao trocar de elemento e ao restaurar');

  // Cor de partida do fundo no hover: um tom do fundo visível, não o preto fixo.
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  await tab('Eventos');
  for (const [selector, hex, rgb] of [['.vazio', '#d9d9d9', 'rgb(217, 217, 217)'], ['.escuro', '#525252', 'rgb(82, 82, 82)']]) {
    await pick(selector);
    await evaluate(`Array.from(document.querySelectorAll('.sidebar-toggle-row')).find((row) => row.textContent.includes('Cor de Fundo no Hover')).querySelector('input').click()`);
    await settle();
    assert.equal(await evaluate(`document.querySelector('input[type="color"][aria-label="Cor de Fundo no Hover"]').value`), hex, `Cor de partida do hover em ${selector}`);
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...(await center(selector)) });
    await eventually(async () => (await computed(selector, ['backgroundColor'])).backgroundColor === rgb, `Hover de ${selector} não pintou a cor de partida`);
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  }
  await tab('Estilos');
  console.log('PASS: fundo do hover parte de um tom do fundo visível (claro e escuro)');

  // Fontes no histórico (uma salva no documento, outra importada pelo botão real): cada
  // conteúdo é guardado uma vez e desfazer/refazer devolvem o documento idêntico.
  const SAVED_FONT = 'AAAA'.repeat(50 * 1024);
  await open(`<!doctype html><html><head><style id="foux-font-Aluno">@font-face { font-family: 'Aluno'; src: url('data:font/woff2;base64,${SAVED_FONT}') format('woff2'); }</style></head>
    <body><h1 class="titulo" style="color: rgb(10, 20, 30); font-family: 'Aluno'">Fonte importada</h1></body></html>`);
  const serialize = () => evaluate(`(() => {
    const clone = ${DOC}.documentElement.cloneNode(true);
    clone.querySelectorAll('#foux-inspector-styles, #foux-canvas-scrollbars, [data-foux-export-parser]').forEach((node) => node.remove());
    for (const element of [clone, ...clone.querySelectorAll('[data-foux-hovered], [data-foux-selected]')]) {
      element.removeAttribute('data-foux-hovered');
      element.removeAttribute('data-foux-selected');
    }
    return clone.outerHTML;
  })()`);
  const original = await serialize();
  await pick('.titulo');
  const IMPORTED_BYTES = 96 * 1024;
  await evaluate(`(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(${IMPORTED_BYTES})], 'Fonte Nova.woff2', { type: 'font/woff2' }));
    const input = document.querySelector('input[type="file"][accept=".ttf,.otf,.woff,.woff2"]');
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await eventually(() => evaluate(`!!${DOC}.getElementById('foux-font-Fonte-Nova') && document.querySelector('select[aria-label="Família da Fonte"]').value === "'Fonte Nova'"`), 'Importar fonte não aplicou a família no elemento');
  await settle();
  const withFont = await serialize();
  assert.ok(withFont.includes(`data:font/woff2;base64,${Buffer.alloc(IMPORTED_BYTES).toString('base64')}`), 'A fonte importada não foi embutida no documento');
  await setColor('Cor do Texto', '#123456');
  const edited = await serialize();
  await undo();
  await eventually(async () => (await computed('.titulo', ['color'])).color === 'rgb(10, 20, 30)', 'Desfazer a cor com fontes no histórico falhou');
  assert.equal(await serialize(), withFont, 'Desfazer a cor não devolveu o documento idêntico');
  await undo();
  await eventually(() => evaluate(`!!${DOC}.querySelector('.titulo') && !${DOC}.getElementById('foux-font-Fonte-Nova')`), 'Desfazer não removeu a fonte importada');
  assert.equal(await serialize(), original, 'Desfazer a importação não devolveu o documento idêntico');
  await redo();
  await eventually(() => evaluate(`!!${DOC}.getElementById('foux-font-Fonte-Nova')`), 'Refazer não trouxe a fonte importada');
  assert.equal(await serialize(), withFont, 'Refazer a importação não devolveu o documento idêntico');
  await redo();
  await eventually(async () => (await computed('.titulo', ['color'])).color === 'rgb(18, 52, 86)', 'Refazer a cor falhou');
  assert.equal(await serialize(), edited, 'Refazer a cor não devolveu o documento idêntico');
  console.log('PASS: importar fonte local é um passo de desfazer, e desfazer/refazer com fontes devolvem o documento idêntico');
}
