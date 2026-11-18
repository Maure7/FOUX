import assert from 'node:assert/strict';

// Extensões de "modo escuro" (Dark Reader) não podem repintar o FOUX nem a página do aluno:
// o tema claro tem que continuar claro, o canvas tem que mostrar as cores reais (o conta-gotas
// e a exportação leem getComputedStyle) e nada da extensão pode entrar no HTML salvo.
// Com a extensão real (opcional; o Chrome 137+ não carrega extensões por linha de comando):
//   CHROME_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
//   FOUX_EXTENSION=<pasta do Dark Reader descompactada> npm run test:dark-reader
// Sem FOUX_EXTENSION, verifica só as proteções (meta de bloqueio e color-scheme).
const HTML = `<!doctype html><html><head><style>
  body { margin: 0; padding: 20px; background: #ffffff; color: #111111; font-family: Arial; }
  #box { width: 140px; height: 60px; background: rgb(250, 240, 200); color: rgb(30, 60, 90); }
</style></head><body><h1 id="title">Página clara do aluno</h1><div id="box">Caixa</div></body></html>`;

const FRAME = `document.querySelector('.editor-canvas__iframe')`;
const DOC = `${FRAME}.contentDocument`;
const DARK_READER_MARKS = `(doc) => ({
  mode: doc.documentElement.getAttribute('data-darkreader-mode'),
  styles: doc.querySelectorAll('style.darkreader, .darkreader').length,
  inline: doc.querySelectorAll('[data-darkreader-inline-bgcolor], [data-darkreader-inline-color]').length,
})`;

export async function run({ evaluate, command, eventually }) {
  const withExtension = !!process.env.FOUX_EXTENSION;
  const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // Brilho médio (0–255) do screenshot reduzido: mede o que o aluno vê, não só o CSS.
  const brightness = async () => {
    const { data } = await command('Page.captureScreenshot', { format: 'png' });
    return evaluate(`(async () => {
      const image = new Image(); image.src = 'data:image/png;base64,${data}'; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 40;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, 64, 40);
      const pixels = context.getImageData(0, 0, 64, 40).data; let sum = 0;
      for (let index = 0; index < pixels.length; index += 4) sum += (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
      return Math.round(sum / (pixels.length / 4));
    })()`);
  };

  await evaluate(`localStorage.clear(); localStorage.setItem('foux_theme', 'light'); localStorage.setItem('foux_projects', JSON.stringify([{id:'claro',name:'Claro',folderId:null,createdAt:Date.now(),updatedAt:Date.now(),htmlContent:${JSON.stringify(HTML)}}])); window.__stale = true;`);
  await command('Page.reload');
  await eventually(() => evaluate(`!window.__stale && document.documentElement.dataset.theme === 'light' && !!document.querySelector('.project-card--saved')`), 'Dashboard clara não carregou');

  if (withExtension) {
    // Controle: um documento claro SEM o bloqueio, na mesma aba, tem que ser escurecido.
    // Sem isso, um teste verde poderia só significar que a extensão não carregou.
    await evaluate(`(() => {
      const frame = document.createElement('iframe');
      frame.id = 'dark-reader-control';
      frame.style.cssText = 'position:fixed;left:-9999px;width:300px;height:200px';
      frame.srcdoc = '<!doctype html><html><head></head><body style="background:#ffffff;color:#111111"><p>controle</p></body></html>';
      document.body.append(frame);
    })()`);
    await eventually(
      () => evaluate(`document.getElementById('dark-reader-control').contentDocument?.documentElement.getAttribute('data-darkreader-mode')`),
      'O Dark Reader não escureceu o documento de controle: a extensão não está ativa e o teste não provaria nada',
    );
    await evaluate(`document.getElementById('dark-reader-control').remove()`);
    // O Dark Reader leva alguns instantes para iniciar e aplicar o tema.
    await settle(1500);
  }
  // O sintoma visível primeiro: a Dashboard clara precisa continuar clara na tela.
  const dashboardBrightness = await brightness();
  assert.deepEqual(await evaluate(`(${DARK_READER_MARKS})(document)`), { mode: null, styles: 0, inline: 0 }, `Dark Reader alterou a Dashboard (brilho médio ${dashboardBrightness})`);
  assert.ok(dashboardBrightness > 150, `Dashboard clara ficou escura na tela (brilho médio ${dashboardBrightness})`);

  // Proteções que valem com ou sem extensão.
  assert.ok(await evaluate(`!!document.querySelector('meta[name="darkreader-lock"]')`), 'Falta o bloqueio do Dark Reader no app');
  // O Chromium serializa `only light` como 'light only'.
  assert.deepEqual(
    (await evaluate(`getComputedStyle(document.documentElement).colorScheme`)).split(/\s+/).sort(),
    ['light', 'only'],
    'Tema claro deveria recusar o escurecimento automático do navegador',
  );

  await evaluate(`document.querySelector('.project-card--saved').click()`);
  await eventually(() => evaluate(`!!${DOC}?.getElementById('foux-inspector-styles') && !!document.querySelector('.editor-sidebar:not(.editor-sidebar--locked)')`), 'Editor não carregou');
  if (withExtension) await settle(2500);

  // Canvas: cores reais do aluno, sem marcas da extensão.
  assert.ok(await evaluate(`!!${DOC}.querySelector('meta[name="darkreader-lock"]')`), 'Falta o bloqueio dentro do canvas');
  assert.deepEqual(await evaluate(`(${DARK_READER_MARKS})(${DOC})`), { mode: null, styles: 0, inline: 0 }, 'Dark Reader alterou a página do aluno');
  assert.equal(await evaluate(`getComputedStyle(${DOC}.body).backgroundColor`), 'rgb(255, 255, 255)');
  assert.equal(await evaluate(`getComputedStyle(${DOC}.getElementById('box')).backgroundColor`), 'rgb(250, 240, 200)');
  assert.deepEqual(await evaluate(`(${DARK_READER_MARKS})(document)`), { mode: null, styles: 0, inline: 0 }, 'Dark Reader alterou o editor');

  // O bloqueio é só do editor: some do HTML salvo e não aparece no projeto.
  await evaluate(`${DOC}.getElementById('box').click()`);
  await eventually(() => evaluate(`${DOC}.getElementById('box').hasAttribute('data-foux-selected')`), 'Caixa não selecionada');
  await evaluate(`(() => {
    const input = document.querySelector('.sidebar-color-field input[type="color"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '#123456');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await eventually(() => evaluate(`JSON.parse(localStorage.getItem('foux_projects'))[0].htmlContent.includes('#123456') || JSON.parse(localStorage.getItem('foux_projects'))[0].htmlContent.includes('18, 52, 86')`), 'Autosave não gravou a edição');
  const saved = await evaluate(`JSON.parse(localStorage.getItem('foux_projects'))[0].htmlContent`);
  assert.ok(!/darkreader/i.test(saved), 'Marcas do Dark Reader (ou do bloqueio) vazaram para o HTML salvo');

  // Os temas escuros do FOUX também ficam como foram desenhados.
  await evaluate(`document.querySelector('.editor-header__back').click()`);
  await eventually(() => evaluate(`!!document.querySelector('.project-card--saved')`), 'Dashboard não voltou');
  await evaluate(`localStorage.setItem('foux_theme', 'dark'); window.__stale = true;`);
  await command('Page.reload');
  await eventually(() => evaluate(`!window.__stale && document.documentElement.dataset.theme === 'dark'`), 'Tema escuro não carregou');
  if (withExtension) await settle(2500);
  assert.deepEqual(await evaluate(`(${DARK_READER_MARKS})(document)`), { mode: null, styles: 0, inline: 0 }, 'Dark Reader alterou o tema escuro');

  console.log(`✔ Tema claro, canvas e HTML salvo imunes ao Dark Reader (${withExtension ? 'extensão real carregada' : 'só proteções; sem FOUX_EXTENSION'})`);
}
