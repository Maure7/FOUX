// Mede o custo de main thread por evento da sidebar (seletor de cor e slider de borda)
// com um documento pesado: fonte embutida de ~600 KB e 300 elementos.
// Uso: npm run bench:sidebar (fica fora do npm test: mede, não valida).
// FOUX_BENCH_URL aponta para outro servidor (ex.: vite preview do build de produção).
const EVENTS = 120;

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
};
const summary = (values) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return `média ${mean.toFixed(2)} ms | p95 ${percentile(values, 0.95).toFixed(2)} ms | máx ${Math.max(...values).toFixed(2)} ms`;
};

function benchHtml() {
  // Base64 pseudoaleatório: uma fonte real não se repete, e o tamanho é o que pesa na serialização.
  let font = '';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let index = 0; index < 800 * 1024; index++) font += alphabet[(index * 7919 + (index >> 5)) % 64];
  const items = Array.from({ length: 300 }, (_, index) => `<div class="item" id="item-${index}"><p>Item ${index}</p></div>`).join('');
  return `<!DOCTYPE html><html><head><style id="foux-user-hover-rules"></style>
    <style id="foux-font-Bench">@font-face { font-family: 'Bench'; src: url('data:font/woff2;base64,${font}') format('woff2'); }</style>
    <style>.item { padding: 4px; margin: 2px; border: 1px solid #ccc; }</style></head>
    <body><h1 id="bench-target">Alvo da medição</h1>${items}</body></html>`;
}

export async function run({ evaluate, command, eventually }) {
  if (process.env.FOUX_BENCH_URL) {
    await command('Page.navigate', { url: process.env.FOUX_BENCH_URL });
    await eventually(() => evaluate('document.readyState === "complete"'), 'Servidor de benchmark não respondeu');
  }
  const html = benchHtml();
  await evaluate(`localStorage.clear(); localStorage.setItem('foux_tutorial_completed', 'true'); localStorage.setItem('foux_projects', JSON.stringify([{id:'bench',name:'Bench',folderId:null,htmlContent:${JSON.stringify(html)},createdAt:Date.now(),updatedAt:Date.now()}]));`);
  await command('Page.reload');
  await eventually(() => evaluate('!!document.querySelector(".project-card--saved")'), 'Projeto de benchmark não apareceu');
  await evaluate('document.querySelector(".project-card--saved").click()');
  await eventually(() => evaluate('!!document.querySelector(".editor-canvas__iframe")?.contentDocument?.getElementById("bench-target")'), 'Editor não carregou o documento');
  await evaluate('document.querySelector(".editor-canvas__iframe").contentDocument.getElementById("bench-target").click()');
  await eventually(() => evaluate('!!document.querySelector(\'input[type="range"][aria-label="Espessura da Borda"]:not(:disabled)\')'), 'Sidebar não habilitou os controles');
  await command('Performance.enable', { timeDomain: 'threadTicks' });

  const metrics = async () => Object.fromEntries((await command('Performance.getMetrics')).metrics.map((metric) => [metric.name, metric.value]));
  // Espera o rAF do inspector, o render agendado pelo React e mais um frame.
  const settle = 'await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0))));';
  const KINDS = { TaskDuration: 'total', ScriptDuration: 'script', RecalcStyleDuration: 'estilo', LayoutDuration: 'layout' };

  async function measure(label, step) {
    const costs = Object.fromEntries(Object.values(KINDS).map((kind) => [kind, []]));
    costs.handler = [];
    for (let index = 0; index < EVENTS; index++) {
      const before = await metrics();
      // "handler" é o critério do relatório de 13/11: o tempo síncrono do evento de input.
      costs.handler.push(await evaluate(`(async () => { const start = performance.now(); ${step(index)} const handler = performance.now() - start; ${settle} return handler; })()`));
      const after = await metrics();
      for (const [metric, kind] of Object.entries(KINDS)) costs[kind].push((after[metric] - before[metric]) * 1000);
    }
    return { label, costs };
  }

  // Mesmo ciclo sem nenhum controle: desconta o custo do próprio CDP e do frame vazio.
  const idle = await measure('ociosa', () => 'document.body.dispatchEvent(new Event("foux-bench-idle"));');
  const overhead = Object.fromEntries(Object.entries(idle.costs).map(([kind, values]) => [kind, percentile(values, 0.5)]));
  const setValue = (selector, value) => `(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${value});
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })();`;
  const color = await measure('seletor de cor', (index) => setValue('.sidebar-color-picker',
    `'#' + (${index} * 2113 % 0xffffff).toString(16).padStart(6, '0')`));
  const slider = await measure('slider de borda', (index) => setValue('input[type="range"][aria-label="Espessura da Borda"]',
    `String(${index} % 20)`));

  console.log(`Custo de fundo do ciclo de medição (descontado): ${overhead.total.toFixed(2)} ms`);
  for (const { label, costs } of [color, slider]) {
    console.log(`BENCH ${label} — handler síncrono: ${summary(costs.handler)}`);
    for (const kind of Object.values(KINDS)) {
      console.log(`BENCH ${label} — main thread por evento (${kind}): ${summary(costs[kind].map((cost) => Math.max(0, cost - overhead[kind])))}`);
    }
  }

  // Fim do gesto: snapshot do histórico (350 ms) e autosave (800 ms) rodam uma vez cada.
  const taskSeconds = async () => (await metrics()).TaskDuration;
  const before = await taskSeconds();
  await evaluate('new Promise((resolve) => setTimeout(resolve, 1300))');
  const quiet = await taskSeconds();
  await evaluate('new Promise((resolve) => setTimeout(resolve, 1300))');
  const after = await taskSeconds();
  const gestureEnd = ((quiet - before) - (after - quiet)) * 1000;
  console.log(`BENCH fim do gesto (snapshot do histórico + autosave, descontado o ocioso): ${Math.max(0, gestureEnd).toFixed(1)} ms no total`);
  const serialize = await evaluate(`(() => {
    const doc = document.querySelector('.editor-canvas__iframe').contentDocument;
    const start = performance.now();
    const html = '<!DOCTYPE html>\\n' + doc.documentElement.cloneNode(true).outerHTML;
    return { ms: performance.now() - start, kb: Math.round(html.length / 1024) };
  })()`);
  console.log(`BENCH serialização do documento: ${serialize.ms.toFixed(1)} ms para ${serialize.kb} KB`);
}
