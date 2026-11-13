# Tecnologias do FOUX e como se conectam — 13/11/2026

Relatório para quem vai assumir o projeto: papel de cada tecnologia, APIs usadas, sequência Vite → Electron, lógica de conexão e p95. Retrato do projeto antes dos recursos pedagógicos e do Modo Desafios (ver `RELATORIO_RECURSOS_PEDAGOGICOS_E_MODO_DESAFIOS_2026-11-13.md`).

## 1. Visão geral

- O FOUX é um editor visual desktop para ensinar CSS3 a iniciantes (ensino médio e cursos técnicos).
- Em vez de digitar código, o aluno abre um arquivo HTML, clica em um elemento da página e ajusta cor, fonte, borda, espaçamento e efeitos de hover com controles visuais.
- Cada alteração aparece na página em tempo real, e o resultado pode ser exportado como um arquivo `.css` limpo.
- O programa roda 100% offline, em Windows, e é entregue como instalador `.exe` (NSIS).
- Há interface bilíngue (português e espanhol) e um manual em PDF para cada idioma.

## 2. Tecnologias usadas e para que servem

### 2.1 JavaScript

- É a linguagem de programação do projeto inteiro.
- Roda em dois lugares:
  - no navegador embutido (Chromium), onde está a interface e o editor;
  - no processo principal do Electron, que usa Node.js (também JavaScript), onde ficam janela, disco e diálogos do sistema.
- Além disso, é a linguagem que manipula a página do aluno dentro do iframe, pelas APIs do navegador.
- No projeto, os arquivos aparecem em três formas:
  - `.js` e `.jsx` em `src/` (interface);
  - `.cjs` em `electron/` e `scripts/` (CommonJS, sintaxe de módulo usada pelo Node);
  - `.mjs` em `scripts/` (módulos ES, usados nos testes).

### 2.2 React (versão 19)

- Biblioteca para construir interfaces a partir de componentes.
- O papel do React é manter a tela sincronizada com o estado da aplicação. Você descreve como a tela deve ser para um dado estado, e o React calcula o que mudou e atualiza só essa parte do DOM.
- Conceitos centrais usados no projeto:
  - Componente: função que recebe props e devolve elementos (ex.: `ColorControl`, `StylesTab`).
  - JSX: sintaxe parecida com HTML dentro do JavaScript. Não é HTML puro; o Vite a transforma em chamadas JavaScript.
  - Estado: valores que, quando mudam, disparam nova renderização (ex.: o elemento selecionado no editor).
  - Efeitos: código que sincroniza algo fora do React (listeners, timers, gravação em disco).
- Não há biblioteca de roteamento. As telas (dashboard, editor, configurações, perfil) são escolhidas por um estado `currentScreen` em `App.jsx`.
- O React também não gerencia dados globais por biblioteca externa (como Redux). O estado vive em `App.jsx` e no hook `useWorkspaceState`, e o idioma usa a Context API do React.

### 2.3 Vite (versão 8)

- Ferramenta de build e servidor de desenvolvimento.
- Funções, em ordem:
  1. No desenvolvimento (`npm run dev`): serve os módulos direto ao navegador, sem empacotar tudo a cada mudança, e atualiza a tela sem perder o estado (Fast Refresh, pelo `@vitejs/plugin-react`).
  2. Na produção (`npm run build`): transforma JSX em JavaScript comum, resolve os `import`, empacota tudo com Rollup e grava o resultado em `dist/`.
  3. Divide o código em partes (code splitting): Editor, Configurações e Perfil são carregados sob demanda com `React.lazy`, e por isso aparecem como arquivos separados no build.
  4. Gera nomes com hash (ex.: `Editor-DGxETLB6.js`), o que evita cache antigo após uma atualização.
- Configuração relevante: `base: './'` em `vite.config.js`. Como o Electron abre `dist/index.html` pelo sistema de arquivos (`file://`), os caminhos precisam ser relativos. Sem isso a tela fica em branco.
- Também importa CSS como texto (`?inline`), usado para injetar a barra de rolagem dentro do iframe.

### 2.4 Electron (versão 44)

- Empacota uma aplicação web como programa de desktop. Combina o navegador Chromium com Node.js.
- O Electron tem três processos:
  - Processo principal (`electron/main.cjs`): roda Node.js, cria janelas, grava no disco, abre o manual, mostra diálogos de erro.
  - Processo de renderização: a janela do navegador, onde roda o React. Não tem acesso direto ao Node.
  - Preload (`electron/preload.cjs`): roda antes da página e é a única ponte entre os dois. Expõe funções específicas com `contextBridge`.
- Configurações de segurança aplicadas à janela:
  - `contextIsolation: true`: a página não enxerga objetos internos do preload;
  - `sandbox: true` e `nodeIntegration: false`: a página não acessa Node nem o sistema de arquivos;
  - `setWindowOpenHandler` e `will-navigate` bloqueados: a janela não navega para outros endereços;
  - `setPermissionRequestHandler` negando todas as permissões (câmera, microfone etc.).
- A empacotagem usa `electron-builder` (target NSIS, x64). O ícone `.ico` é gerado a partir do `public/favicon.svg` pelo script `generate-icons.cjs`, com resvg.

### 2.5 Outras ferramentas

- `lucide-react`: conjunto de ícones em SVG, usado como componentes React.
- ESLint (com plugins de hooks e de Fast Refresh): verifica erros e regras de uso dos hooks. Roda com `npm run lint`.
- Google Fonts (Inter): carregada pelo `index.html`, com fallback para Segoe UI quando offline.
- @resvg/resvg-js: converte o SVG em PNG e ICO durante o build de ícones.
- Testes: não há framework de testes. Os testes em `scripts/` usam `node:test` (unitários) e um controle próprio do Chromium pelo protocolo DevTools (E2E). Para os E2E é preciso ter Chrome ou Edge instalado, ou apontar `CHROME_PATH`.

## 3. APIs usadas e para que servem

Chamo de API o conjunto de funções que o código usa para conversar com uma plataforma. O projeto usa quatro conjuntos.

### 3.1 APIs do React

- Hooks de estado e ciclo de vida:
  - `useState`: estado local de um componente;
  - `useEffect` e `useLayoutEffect`: sincronizam com o mundo externo (listeners, observers, timers);
  - `useRef`: guarda valores mutáveis que não devem disparar renderização (ex.: o elemento selecionado dentro do iframe);
  - `useCallback` e `useMemo`: mantêm funções e objetos estáveis entre renderizações;
  - `useId`: gera IDs únicos para acessibilidade;
  - `useReducer`: usado no relógio compartilhado do histórico.
- Otimização: `memo` (evita re-renderizar controles que não mudaram), `lazy` e `Suspense` (carregamento sob demanda).
- Renderização fora da árvore: `createPortal` para o tour guiado e os tooltips (aparecem sobre a página, não dentro do componente que os originou).
- Outras: `createRoot` (ponto de entrada), `StrictMode` (checagens extras em desenvolvimento), `flushSync` (força a gravação antes de fechar a janela).

### 3.2 APIs do navegador (plataforma web)

- DOM: `querySelector`, `addEventListener`, `createElement`, `getElementById`, `closest`, `classList`.
- CSSOM: `getComputedStyle` (estilo final calculado de um elemento), `style` (estilo inline), `styleSheet.cssRules` (regras de folhas de estilo), `CSS.escape`, `CSS.supports`.
- Iframe: atributo `srcDoc` com a página do aluno e `contentDocument` para acessar o documento interno. O iframe usa `sandbox="allow-same-origin"`, sem `allow-scripts`, então scripts do HTML do aluno não executam.
- `DOMParser`: lê HTML em texto e o transforma em documento (usado para neutralizar `<meta refresh>` e para traduzir o tutorial).
- `FileReader`, `Blob`, `URL.createObjectURL`: leitura de arquivos escolhidos pelo aluno (HTML, fontes, fotos).
- Canvas 2D (`canvas.getContext('2d')`, `toDataURL`) e `Image.decode`: redimensionamento da foto de perfil.
- `requestAnimationFrame`: agrupa leituras e escritas por quadro da tela.
- `MutationObserver`: observa mudanças no DOM (menus, tooltips, troca de tema).
- `ResizeObserver`: acompanha o tamanho dos elementos destacados pelo tour.
- `dialog.showModal()` e `close()`: diálogo modal nativo do tour.
- Fullscreen API (`requestFullscreen`): modo de visualização expandida.
- `matchMedia`: detecta `prefers-reduced-motion` e media queries na exportação.
- `fetch` com `AbortSignal.timeout`: lê folhas de estilo externas quando o CSSOM bloqueia o acesso.
- `localStorage`: armazenamento usado apenas na versão web.
- `Intl` e `Date` (via `toLocaleDateString`): datas no idioma escolhido.

### 3.3 APIs do Electron

- Processo principal:
  - `app`: `requestSingleInstanceLock` (impede duas instâncias), `whenReady`, `getPath('userData')` (pasta de dados do usuário), `isPackaged`.
  - `BrowserWindow`: cria a janela principal.
  - `ipcMain.on`: recebe mensagens da página.
  - `dialog`: mensagens de erro e confirmação de falha ao salvar.
  - `shell.openPath`: abre o manual PDF no leitor do sistema.
  - `session.flushStorageData` e `setPermissionRequestHandler`: persistência da sessão e permissões.
- Preload e renderização:
  - `contextBridge.exposeInMainWorld`: publica `window.fouxDesktop` na página.
  - `ipcRenderer.send`, `sendSync` e `on`: comunicação com o processo principal.

### 3.4 API interna do projeto

- `window.fouxDesktop`, criada em `electron/preload.cjs`, é a única forma de a interface acessar o disco:
  - `storage.snapshot()`: lê todos os dados ao iniciar;
  - `storage.setItem(key, value)` e `storage.removeItem(key)`: gravam ou removem uma chave, de forma síncrona e com confirmação do disco;
  - `requestClose()`: pede para fechar a janela;
  - `onBeforeClose(callback)`: registra a rotina de salvamento antes do fechamento.
- `services/appStorage.js` é a camada que escolhe entre `fouxDesktop.storage` (Electron) e `localStorage` (web). O restante do código não sabe em qual ambiente está.

## 4. Como o sistema funciona, em sequência

### 4.1 Durante o desenvolvimento

1. `npm run dev` inicia o Vite, que serve `src/` no navegador.
2. Cada arquivo `.jsx` é transformado pelo Vite em JavaScript; o React atualiza a tela ao salvar o arquivo.
3. Para testar dentro do Electron, `npm run electron:start` executa `npm run build` (gera `dist/`) e depois `scripts/start-electron.cjs`, que inicia o Electron apontando para o projeto.

### 4.2 Ao abrir o programa

1. O Electron executa `electron/main.cjs`.
2. `requestSingleInstanceLock` garante que só uma instância rode. Se já houver uma aberta, a segunda apenas foca a primeira.
3. Quando o Electron fica pronto (`whenReady`), o `data-store.cjs` abre `foux-data.json` na pasta `userData` (ou `.bak`, se o principal estiver corrompido).
4. Se for a primeira execução depois de uma versão antiga, `migrateLegacyStorage` abre uma janela oculta, lê o `localStorage` antigo do Chromium e grava no novo armazenamento.
5. `createWindow` cria a janela, carrega `dist/index.html` e o preload é executado antes do script da página. Ele publica `window.fouxDesktop`.
6. `src/main.jsx` registra a rotina de salvamento para o fechamento, define `window.close` para passar pelo processo principal e renderiza `<App />`.
7. `appStorage` lê o snapshot de dados de forma síncrona, e os hooks de estado (`useWorkspaceState`) inicializam projetos, pastas, perfil, tema e idioma a partir dele.

### 4.3 Ao editar um projeto

1. O aluno importa um HTML. `EditorCanvas` coloca o conteúdo no iframe via `srcDoc`. O React não renderiza o HTML do aluno; ele só define o atributo.
2. Quando o iframe carrega, `useIframeInspector` adiciona listeners no `contentDocument` (mouseover, click, submit). Esses listeners guardam o elemento selecionado em refs e publicam apenas o necessário no estado React.
3. Ao clicar num elemento, o estado `selectedElement` muda e a barra lateral (`SidebarEstilos`) recebe o novo elemento. As abas leem os estilos calculados.
4. Ao mexer num controle:
   - o valor visual fica no rascunho local do controle (`useDraft`), para o input não voltar atrás;
   - `applyStyle` escreve direto no `element.style` do iframe, sem passar pelo React;
   - no máximo uma vez por quadro, `requestAnimationFrame` relê os estilos calculados e atualiza o estado.
5. O histórico (`useEditorHistory`) registra um snapshot por gesto, 350 ms depois de o movimento parar. Ctrl+Z e Ctrl+Y restauram o snapshot recriando o iframe.
6. Depois de uma pausa de 800 ms (autosave), `serializeDocument` gera o HTML atual, `updateProject` atualiza o estado em `App.jsx`, e o efeito de persistência grava via `fouxDesktop.storage.setItem`. O processo principal grava o JSON em disco com escrita atômica (arquivo temporário, `fsync` e renomeação).
7. A exportação (`exportCss.js`) percorre as regras do documento, compara com o estado original salvo em `data-foux-original-style` e gera um CSS limpo, sem comentários nem atributos internos.

### 4.4 Ao fechar a janela

1. O processo principal intercepta o `close` e envia `foux:before-close` para o renderer.
2. A página executa o salvamento completo (inclusive o documento do iframe) e responde com `foux:close-ready`.
3. O processo principal faz `store.flush()`, `flushStorageData()` e só então fecha a janela.
4. Se o renderer não responder em 10 segundos, ou se houver falha de gravação, a janela permanece aberta e um diálogo explica o motivo. Nenhuma alteração se perde.

## 5. Por que React e JavaScript fazem sentido aqui

### 5.1 Por que JavaScript

- O Electron exige JavaScript (ou TypeScript) no processo principal e na página. Usar outra linguagem no lado da interface não traria vantagem.
- O mesmo idioma cobre os três processos: main, preload e renderer. Quem entende um entende os outros.
- A manipulação do CSS do aluno depende das APIs do navegador, que são JavaScript.

### 5.2 Por que React

- A barra lateral é um formulário cujos valores dependem do elemento selecionado. React expressa isso como "controles refletem o estilo calculado", e não como uma sequência manual de atualizações.
- Os controles (slider, campo numérico, seletor de cor, gradiente) são reutilizados em várias abas. Componentes evitam duplicação; por exemplo, `ColorField` substituiu seis cópias.
- Interfaces com muitos componentes que mudam juntos são o caso em que React tem melhor custo-benefício. O uso de `memo` e de callbacks estáveis deixa essa escolha eficiente.

### 5.3 A fronteira entre React e o DOM do aluno

- Este é o ponto mais importante para quem assume o projeto.
- React é declarativo: ele controla a árvore que renderiza e recalcula o que mudou.
- O documento do aluno é imperativo: ele é modificado diretamente pelo código, com listeners e escritas de estilo. Misturar os dois fariam o React sobrescrever ou apagar as edições do aluno.
- Por isso o iframe fica fora da árvore React. React fornece apenas o contêiner e o `srcDoc`. Toda a interação com o conteúdo passa por `useIframeInspector`, que é a ponte.
- Regra prática: estado da interface vai para o React; estado do documento do aluno fica no DOM, e só o necessário é copiado para o React.

### 5.4 Por que Electron e Vite, e não apenas o navegador

- O aluno precisa de acesso ao disco, instalação simples e funcionamento offline. Um site não oferece isso sem um servidor.
- O Electron permite gravar em `userData` com escrita atômica e controle de fechamento. A página fica isolada e sem acesso ao sistema, exceto pela API definida no preload.
- O Vite entrega build rápido e gera os arquivos estáticos que o Electron carrega. Sem `base: './'` a aplicação não abriria no `file://`.

### 5.5 Como as peças se conectam

- Vite transforma o código e gera `dist/`.
- Electron abre `dist/index.html` numa janela e executa o preload.
- O preload publica `window.fouxDesktop`.
- React, ao iniciar, lê os dados por `appStorage`, que usa `fouxDesktop`.
- Os componentes do React disparam ações; as ações atualizam o estado; efeitos gravam no disco pelo IPC.
- O inspector escreve no iframe e devolve ao React apenas os valores para os controles.
- O processo principal recebe as gravações e garante que nada se perca no fechamento.

## 6. Medição de desempenho: o que é p95

- p95 (percentil 95) é o valor abaixo do qual estão 95% das medições. Os 5% mais lentos ficam acima dele.
- Por que é mais útil que a média: a média esconde os picos. Um engasgo ocorre quando uma parte dos eventos demora demais, mesmo que a média pareça boa.
- Referência: a tela atualiza 60 vezes por segundo, então cada quadro tem 16,7 ms. Um evento acima disso causa travamento visível.
- Medição feita no Chromium, com 120 eventos sobre um documento com fonte embutida de 600 KB e 300 elementos:

| Controle | Versão anterior (média / p95) | Versão atual (média / p95) |
|---|---|---|
| Seletor de cor | 6,93 ms / 20,7 ms | 0,35 ms / 0,5 ms |
| Slider de espessura da borda | 4,00 ms / 10,1 ms | 0,48 ms / 0,7 ms |

- O script de medição não está no repositório. Ele fica na pasta temporária da sessão; se precisar repetir a medição, recrie-o com o mesmo método.

## 7. Pontos de atenção para quem assume o projeto

- Persistência: cada gravação regrava o JSON inteiro, de forma síncrona. Com muitos projetos isso pode ficar lento. Separar os projetos em arquivos é a evolução natural.
- Histórico de desfazer: guarda até 50 snapshots completos do documento. Com fontes embutidas, isso pode chegar a dezenas de MB.
- Testes E2E dependem de um navegador instalado e, no ambiente de desenvolvimento usado, o teste de tela cheia nativa falha no Chromium headless (o mesmo ocorre na versão anterior).
- Fonte da Inter vem do Google Fonts. Para funcionar 100% offline, o ideal é empacotá-la via `@fontsource/inter`.
- Comandos principais:
  - `npm run dev`: desenvolvimento web;
  - `npm run electron:start`: testa no Electron;
  - `npm test`: lint e todas as suítes;
  - `npm run dist:win`: gera o instalador (apenas em Windows; gera ícones, faz o build e empacota com electron-builder).