# Auditoria multiagente: correções e polimento final — 15/11/2026

Este relatório cobre a auditoria, as correções e a validação feitas no FOUX por quatro agentes especialistas: motor de edição, interface e temas, arquitetura e segurança desktop, e integração e QA. Nenhum commit foi feito e nenhum executável foi gerado, conforme a regra vigente.

## 1. Resumo de atividades por agente

**Antes da divisão do trabalho**
- `npm test` completo foi rodado como linha de base, com 100% verde.
- O estado do projeto, com as mudanças não commitadas, foi copiado para uma pasta de backup.
- O harness E2E ([../scripts/test_editor.mjs](../scripts/test_editor.mjs)) ganhou portas configuráveis (`FOUX_TEST_PORT`/`FOUX_DEBUG_PORT`) e a opção `--suite=<arquivo>`. Assim os agentes rodaram testes em paralelo sem colidir.
- Cada agente recebeu uma lista exclusiva de arquivos. Correções fora dela viraram pendências de integração para o Agente 4.
- O trabalho foi interrompido uma vez pelo limite de cota da API e retomado do ponto de parada.
- Este relatório foi consolidado pelo orquestrador a partir dos relatórios dos quatro agentes.

| Agente | Inspecionou | Executou |
|---|---|---|
| **1 — QA e motor de edição** | Os 33 arquivos do motor (iframe, inspetor, sidebar, controles, exportação, histórico, canvas). Reproduziu cada hipótese contra o app real, ainda com o código antigo, via protocolo do Chromium. | 13 correções; suíte nova com 15 blocos de HTML "de aluno"; comentários da área traduzidos para PT-BR. |
| **2 — Front-end, UI/UX e temas** | Todas as telas (dashboard, pasta aberta, seleção em lote, modais, FAQ, configurações, perfil, editor nas 3 abas, tour, HUD de desafios) nos 4 temas (Dark, Light, Solarized, Liquid Glass) × PT/ES. Auditoria automática própria: texto cortado, contraste AA, alvos menores que 24px, rolagem e vidro aninhados, cliques nas cores da paleta. | 13 correções; suíte nova de auditoria visual; 56 comentários de CSS e 24 de JS/JSX traduzidos. |
| **3 — Arquitetura, performance e segurança** | Electron (`main`, `preload`, `data-store`, `manual`), configuração do builder, NSIS e CI; vazamentos em 34 arquivos com listeners, timers, rAF ou observers; lógica do Modo Desafios. Medições reais da sidebar, do disco, do bundle e do `app.asar`. | 7 correções e endurecimentos; 2 testes novos e 3 casos novos no teste do data-store; benchmark da sidebar; comentários da área traduzidos. |
| **4 — QA, integração e relatório** | As pendências entre áreas apontadas pelos Agentes 1–3, os comentários restantes (scripts de teste mais uma varredura final de 559 comentários em 144 arquivos), as falhas intermitentes relatadas e o escopo total das mudanças contra o backup. | 9 integrações, sendo 2 bugs novos corrigidos e a deduplicação de fontes no histórico de desfazer; 10 testes unitários novos e 3 blocos E2E novos; suítes novas encadeadas no `npm test`; bloqueio de portas ocupadas no harness; duas rodadas completas verdes. |

## 2. Bugs encontrados e soluções aplicadas

### 2.1 Agente 1 — motor de edição, HTML externo do aluno e bordas

1. **Cor de borda invisível (alta).**
   - Sintoma: escolher cor ou opacidade da borda num elemento sem borda, ou com `border: 0`, não mostrava nada.
   - Causa raiz: só a espessura ligava o `border-style`, e só o lado de cima era checado. Com estilo `none`, a espessura computada é 0.
   - Solução:
     - uma cor com alfa > 0 liga `solid` quando nenhum lado está visível;
     - se a espessura for 0, usa 3px, o `medium` do navegador;
     - a borda em gradiente também garante espessura visível;
     - opacidade 0 não cria borda;
     - tudo vira um único passo de desfazer.
   - Arquivos: [../src/utils/inspector/borders.js](../src/utils/inspector/borders.js) (novo), [../src/hooks/useIframeInspector.js](../src/hooks/useIframeInspector.js), [../src/components/editor/sidebar/useColorControls.js](../src/components/editor/sidebar/useColorControls.js).
2. **Borda de um lado só (média).**
   - Sintoma: um `border-left` aparecia como 0px e #000000, e mudar a espessura acendia as quatro bordas em preto.
   - Causa raiz: a leitura usava o shorthand com vários valores e pegava o primeiro.
   - Solução: a sidebar lê o primeiro lado visível, e o estilo só é ligado quando nenhum lado está visível.
   - Arquivos: [../src/utils/inspector/styles.js](../src/utils/inspector/styles.js), `borders.js`.
3. **`border-radius` forçava `overflow: hidden !important` em qualquer elemento (alta).**
   - Sintoma: menus e sombras dos filhos eram cortados. No `body`, a rolagem do canvas travava (scrollY 0, contra 400 antes de arredondar). O `overflow` também aparecia no CSS exportado.
   - Causa raiz: sobra do primeiro tutorial. O tutorial atual já declara `overflow` no próprio CSS.
   - Solução: o `overflow` forçado foi removido.
   - Arquivo: `useIframeInspector.js`.
4. **Edições anuladas pelo `!important` do aluno (alta).**
   - Sintoma: cor, fonte, padding e fundo não mudavam em HTML com utilitários `!important`, como os do Bootstrap.
   - Causa raiz: a escrita inline sem prioridade perdia para as regras importantes do aluno.
   - Solução: um índice por documento das declarações `!important` das folhas do aluno, considerando `@media`, `@import` e `@supports`. A escrita usa `!important` só quando uma regra ativa alcança o elemento.
   - Arquivos: [../src/utils/inspector/important.js](../src/utils/inspector/important.js) (novo), `constants.js`, `useIframeInspector.js`.
5. **Hover de fundo sumia com borda em gradiente (média).**
   - Causa raiz: a pintura da borda gravava `background-image` inline com `!important`, que vence a folha de hover.
   - Solução: a pintura usa a prioridade detectada no item 4.
   - Arquivo: [../src/utils/gradientBorder.js](../src/utils/gradientBorder.js).
6. **Hover de cor sólida escondido por gradiente ou imagem de fundo (média).**
   - Solução: a regra de hover acrescenta `background-image: none` quando o elemento tem imagem de fundo.
   - Arquivos: `hoverRules.js`, `HoverTab.jsx`.
7. **Gradiente do aluno não reconhecido (média).**
   - Sintoma: com `to right`, sem direção, em `turn`/`rad` ou com 3+ paradas, a chave de gradiente ficava desligada e a cor escolhida ficava escondida embaixo dele.
   - Solução:
     - leitura ampliada para gradientes de uma camada;
     - fundos com várias camadas ficam de fora, para não apagar uma foto;
     - radial e cônico dão lugar à cor escolhida em um passo de desfazer.
   - Arquivos: `gradientBorder.js`, `styles.js`, `useColorControls.js`.
8. **Sólido → gradiente → sólido terminava transparente (média).**
   - Causa raiz: ligar o gradiente apagava a cor inline.
   - Solução: a cor fica por baixo do gradiente.
   - Arquivo: `useColorControls.js`.
9. **CSP no HTML do aluno derrubava o editor (alta).**
   - Sintoma: TypeError ao carregar, e a sidebar ficava presa em "Esperando o carregamento do HTML".
   - Causa raiz: a CSP declarada pelo aluno passava a valer na prévia e bloqueava a folha `<style>` que o inspetor injeta.
   - Solução: a prévia remove o meta de CSP do aluno (scripts continuam bloqueados pelo sandbox), e há uma proteção para quando a folha não existe.
   - Arquivos: [../src/components/editor/EditorCanvas.jsx](../src/components/editor/EditorCanvas.jsx), `useIframeInspector.js`.
10. **Aba Layout (média).**
    - Sintoma: um ID repetido sempre selecionava o primeiro, e a lista mantinha os IDs antigos depois de importar outro HTML.
    - Solução: cada item guarda sua ocorrência entre os IDs repetidos, e a aba é remontada a cada documento carregado.
    - Arquivos: `useIframeInspector.js`, `LayoutTab.jsx`, `SidebarEstilos.jsx`, [../src/pages/Editor.jsx](../src/pages/Editor.jsx).
11. **Controles faltando em tags fora do tutorial (média).**
    - Sintoma: `pre`, `code`, `ul`, tabelas e tags personalizadas não tinham família da fonte; `svg`, `video` e `canvas` não tinham dimensões.
    - Solução: a lista passou a marcar as tags que não têm texto, e mídia ganhou os controles de dimensão.
    - Arquivo: [../src/components/editor/sidebar/StylesTab.jsx](../src/components/editor/sidebar/StylesTab.jsx).
12. **Selecionar convertia o `border-image` do aluno (média).**
    - Sintoma: o visual e o HTML mudavam só de clicar no elemento.
    - Solução: a migração legada só vale para `border-image` inline.
    - Arquivo: `styles.js`.
13. **Folha temporária da exportação podia ir para o HTML salvo (baixa).**
    - Solução: a folha é marcada e removida ao serializar.
    - Arquivos: [../src/utils/exportCss.js](../src/utils/exportCss.js), `useIframeInspector.js`.

Verificado e correto, sem alteração:
- o sandbox `allow-same-origin` (script do aluno não roda nem alcança a janela do editor);
- IDs especiais, numéricos ou repetidos no CSS exportado;
- Ctrl+Z, Ctrl+Y e Ctrl+Shift+Z;
- Restaurar e Limpar tela, com desfazer depois de cada um;
- salvamento automático e reabertura;
- arrastar arquivo num projeto vazio.

### 2.2 Agente 2 — interface, temas e micro-interações

1. **A paleta de cores do banner da pasta mostrava 4 das 8 cores.**
   - Causa raiz: `overflow: hidden` no banner cortava a paleta. No Liquid Glass, além disso, o `backdrop-filter` cria um contexto de empilhamento, e os cards de vidro pintavam por cima.
   - Solução: o overflow saiu, a faixa de cor virou sombra interna e o banner ganhou `z-index: 2`.
   - Arquivo: [../src/styles/dashboard-selection.css](../src/styles/dashboard-selection.css).
2. **Liquid Glass: o título da área de importação estava invisível (contraste 1,21:1).**
   - Causa raiz: tokens claros do tema sobre o cinza claro do documento.
   - Solução: tinta escura própria para o título, a borda, o ícone e o hover.
   - Arquivo: [../src/styles/LiquidGlass.css](../src/styles/LiquidGlass.css).
3. **Tema claro com sidebar escura: elementos sumiam.**
   - Sintoma:
     - ícone do selo invisível;
     - "#" da lista de IDs a 1,04:1;
     - "Gradiente" a 3,27:1;
     - unidades a 3,96:1;
     - dica do estado vazio a 4,09:1.
   - Solução: tons claros nesses elementos.
   - Arquivo: [../src/styles/themes/light.css](../src/styles/themes/light.css).
4. **Sidebar bloqueada antes de carregar o HTML.**
   - Sintoma: o aviso ficava a 40% de opacidade e por cima das abas.
   - Solução: só os controles esmaecem; o aviso fica sólido no lugar das abas.
   - Arquivo: [../src/styles/editor.css](../src/styles/editor.css).
5. **Com a transparência do Windows desligada, o conteúdo de trás vazava pelo texto dos flutuantes.**
   - Afetava modais, menus, tour, tooltip, HUD e barra em lote.
   - Causa raiz: com `prefers-reduced-transparency`, o tema tirava o desfoque mas mantinha o fundo translúcido.
   - Solução: superfície sólida (`--floating-solid`). O Liquid Glass fica de fora de propósito.
   - Arquivo: [../src/styles/glass.css](../src/styles/glass.css).
6. **`backdrop-filter` aninhado, que quebra a refração no Chromium.**
   - Onde: menus da barra em lote, paleta e botões do banner, selo de favorito.
   - Solução: os menus aninhados ficam sólidos, como os submenus já eram, e os botões perderam o segundo filtro. A reauditoria encontrou 0 ocorrências.
   - Arquivos: `dashboard-selection.css`, [../src/styles/pinned.css](../src/styles/pinned.css).
7. **O vidro do modal "pulava" no fim da abertura.**
   - Causa raiz: o fundo escurecido fazia fade por `opacity`. Com opacidade < 1, o pai bloqueia o desfoque do card até a animação terminar.
   - Solução: o fade passou a ser pela `background-color`, e as regras de blur mortas saíram.
   - Arquivos: `dashboard-layout.css`, `glass.css`, `interaction-polish.css`, `light.css`, `LiquidGlass.css`.
8. **"Tour guiado" e "Modo Desafios" desligados pareciam desabilitados.**
   - Causa raiz: opacidade 0,65 mais texto apagado (3,55:1 no Solarized).
   - Solução: estado de repouso legível; a opacidade reduzida ficou só para `:disabled`. O amarelo do Solarized passou para `#d4a417` (5,6:1).
   - Arquivo: [../src/styles/editor-controls.css](../src/styles/editor-controls.css).
9. **Contrastes abaixo do AA.**
   - Dica do dashboard vazio e rodapé (2,5:1 em todos os temas).
   - Etiqueta "pasta" no tema claro (2,13:1).
   - Cinza `#71717a` do tema claro (4,4:1).
   - Seis pontos do Solarized entre 3,75 e 4,47:1.
   - Todos foram ajustados com tons da mesma família.
   - Arquivos: `dashboard-layout.css`, `light.css`, `shared.css`, `solarized.css`.
10. **As opções de projetos e pastas na grade só abriam pelo botão direito.**
    - Solução: botão "⋯" que aparece no hover e no foco e fica sempre visível em telas de toque. Abre o mesmo menu de contexto.
    - Arquivos: [../src/components/dashboard/ProjectCard.jsx](../src/components/dashboard/ProjectCard.jsx), [../src/components/dashboard/FolderCard.jsx](../src/components/dashboard/FolderCard.jsx), `shared.css`, `interaction-polish.css`.
11. **Alvos de clique pequenos.**
    - "Ver histórico completo": 15 → 28px.
    - Breadcrumb: 19 → 24px.
    - "Restaurar": 22 → 24px.
    - Campos numéricos: 20 → 24px.
    - Ícones ⓘ: área de toque de 24px.
    - Arquivos: `dashboard-layout.css`, `dashboard-selection.css`, `learning.css`, `shared.css`.
12. **A sidebar, que fica à direita, entrava vindo da esquerda.** O sentido da animação foi invertido em `interaction-polish.css`.
13. **CSS morto:** removidos `.footer__link*`, o fundo escurecido duplicado do Liquid Glass e `.foux-config-overlay`.

### 2.3 Agente 3 — arquitetura, performance e segurança desktop

1. **O app não abria nem fechava se a pasta de instalação tivesse `[`, `]` ou `~` (alta).** O NSIS permite escolher a pasta, e nomes curtos 8.3 do Windows contêm `~`.
   - Causa raiz: `isTrustedSender` comparava URLs como texto. O `pathToFileURL` do Node escapa `[ ] ~`, e o Chromium não.
   - Efeito:
     - todo IPC de armazenamento era rejeitado e a janela ficava em branco;
     - o fechamento esperava 10 s e falhava;
     - o manual não abria;
     - o `loadFile` também falhava com `%` ou `#` no caminho.
   - Solução:
     - [../electron/app-url.cjs](../electron/app-url.cjs) (novo) compara caminhos decodificados (`fileURLToPath`), sem diferenciar maiúsculas no Windows;
     - `manual.cjs` usa o mesmo critério;
     - a janela carrega por `loadURL(pathToFileURL(...))`.
   - Prova: o teste novo falha com o código antigo e passa com o atual.
   - Arquivos: [../electron/main.cjs](../electron/main.cjs), [../electron/manual.cjs](../electron/manual.cjs), [../build/validate-resources.cjs](../build/validate-resources.cjs).
2. **Cada gravação regravava o `foux-data.json` inteiro, com fsync e cópia do `.bak`, enquanto a tela esperava (média-alta, performance).**
   - Medido: 2 MB → 9–17 ms; 7,8 MB → 50–60 ms; 19,5 MB → cerca de 125 ms. Abrir um projeto custava duas regravações.
   - Solução:
     - as gravações atualizam a memória, e o arquivo é regravado uma vez após 250 ms;
     - o `flush` roda no fechamento, em `will-quit` e no fim de sessão do Windows;
     - erros de antivírus (EPERM/EBUSY/EACCES) são repetidos;
     - uma falha persistente mantém os dados na memória, tenta de novo a cada 5 s e bloqueia o fechamento com aviso;
     - o renderer não envia valor idêntico.
   - Resultado: o IPC espera cerca de 0,03 ms, e abrir um projeto gera uma regravação.
   - Arquivos: [../electron/data-store.cjs](../electron/data-store.cjs), `main.cjs`, [../src/services/appStorage.js](../src/services/appStorage.js).
3. **Janela impossível de fechar com a tela travada ou o disco falhando (média).**
   - Solução:
     - o diálogo oferece "Continuar no FOUX" e "Fechar sem salvar"; o segundo ainda grava o que já chegou ao processo principal;
     - se a tela caiu, o fechamento é direto;
     - os diálogos seguem o idioma escolhido (PT/ES).
   - Arquivo: `main.cjs`.
4. **Só abrir e sair de um projeto mudava o `updatedAt` (média).** Isso reordenava o painel e regravava a lista a cada navegação.
   - Solução: atualizações sem alteração real são ignoradas.
   - Arquivo: [../src/App.jsx](../src/App.jsx).
5. **`app.asar` com 27,8 MB, dos quais 26,1 MB eram dependências que nunca rodam (média, tamanho).** O Vite já embute React e ícones em `dist/`, e os manuais iam duplicados em `dist/docs`.
   - Solução:
     - `react`, `react-dom` e `lucide-react` foram para `devDependencies`, com as mesmas versões;
     - o `package-lock.json` só foi reclassificado (`"dev": true`): sem download, sem pacote novo, `integrity` idêntico;
     - `build.files` ganhou `"!dist/docs/**"`.
   - Efeito esperado: o `app.asar` cai de cerca de 28 MB para menos de 1 MB, e os PDFs vão só em `resources/docs`. A confirmação exige reempacotar (seção 4).
   - Arquivo: [../package.json](../package.json).
6. **O app não tinha CSP (média, endurecimento).**
   - Solução: meta CSP injetada só no build: `script-src 'self'`, `object-src 'none'`, `form-action 'none'`. Estilos, imagens, fontes, mídia e fetch ficam amplos, porque o iframe da prévia herda a política.
   - Validado no Electron: script inline bloqueado e zero violações com HTML de aluno.
   - Arquivo: [../vite.config.js](../vite.config.js).
7. **Endurecimento geral (baixa-média).**
   - `app.enableSandbox()`.
   - Janela de migração com `nodeIntegration: false` explícito e bloqueio de navegação e popups.
   - Permissões negadas durante a migração.
   - Um erro de validação no IPC não bloqueia mais o fechamento para sempre. Antes, `storageFailures.set(undefined)` causava esse bloqueio; era um bug latente.

Verificado e correto, sem alteração:
- todos os listeners, timers, rAF e observers fazem limpeza;
- o Modo Desafios aparece só em projetos tutorial, por desenho;
- as checagens de borda dos desafios (≥ 4px e estilo visível) batem com as correções do Agente 1.

### 2.4 Integração aplicada pelo Agente 4

1. **Slider mostrava o valor do elemento anterior (baixa).**
   - Sintoma: duas imagens com `max-width: 100%` arrastadas além do contêiner. Ao selecionar a segunda, o slider exibia o valor da primeira.
   - Causa raiz: o rascunho do `useDraft` só era descartado quando o valor computado mudava.
   - Solução: `useDraft(value, resetKey)` zera o rascunho durante o render quando a chave muda, sem efeito extra por frame. A chave é o elemento selecionado mais a revisão, então o rascunho também cai em "Restaurar elemento".
   - Prova: o teste novo falha com o `useDraft` antigo e passa com o atual.
   - Arquivos: [../src/hooks/useDraft.js](../src/hooks/useDraft.js), `NumericInput.jsx`, `SliderControl.jsx`, `BoxModelEditor.jsx`, `StylesTab.jsx`, `SidebarEstilos.jsx`.
2. **Cor de partida do fundo no hover era sempre `#000000` (média).**
   - Sintoma: num parágrafo transparente com texto escuro, o hover virava uma caixa preta e o texto sumia.
   - Solução: a cor de partida é o fundo visível (do próprio elemento ou dos ancestrais) 15% mais perto do preto ou do branco, o que der mais contraste. Exemplos: branco → `#d9d9d9`, `#333` → `#525252`. O documento não muda até a primeira ação do usuário.
   - Arquivos: [../src/components/editor/sidebar/HoverTab.jsx](../src/components/editor/sidebar/HoverTab.jsx), [../src/utils/css/contrast.js](../src/utils/css/contrast.js) (novas `visibleBackground` e `hoverShade`).
3. **Fontes importadas duplicadas na memória do desfazer (média, memória).**
   - Causa raiz: cada retrato do histórico guardava o documento inteiro, com a fonte em base64 gravada três vezes (woff2, woff, truetype). Uma fonte de 500 KB pesava cerca de 2 MB por retrato, ou cerca de 200 MB em 100 retratos (estimativa).
   - Solução: um depósito guarda cada `<style id="foux-font-*">` uma vez, e os retratos levam só uma referência. No teste unitário, um documento de 1 MB vira um retrato de 174 caracteres.
   - Prova: a importação pelo botão real é um único passo de desfazer, e o documento fica idêntico em cada desfazer e refazer.
   - Arquivo: [../src/hooks/useEditorHistory.js](../src/hooks/useEditorHistory.js).
4. **ⓘ sozinho na linha quando o rótulo quebrava.** O token e o ícone agora ficam juntos num `span.prop-label__meta`. Arquivo: `PropertyLabel.jsx`.
5. **Timers de Configurações não eram limpos ao sair da tela.** Agora são limpos ao reagendar e ao desmontar. Arquivo: [../src/pages/Settings.jsx](../src/pages/Settings.jsx).
6. **Comentário desatualizado no autosave.** Ficou falso depois da gravação agrupada e foi reescrito. Arquivo: [../src/pages/Editor.jsx](../src/pages/Editor.jsx).
7. **Testes intermitentes.**
   - O harness passou a falhar cedo, com mensagem clara, quando a porta do Vite ou do Chromium já está ocupada.
   - A recarga em `test_ui_refinements.mjs` agora espera a página nova antes de clicar.
   - Arquivos: [../scripts/test_editor.mjs](../scripts/test_editor.mjs), [../scripts/test_ui_refinements.mjs](../scripts/test_ui_refinements.mjs).
8. **Suítes novas no `npm test`.**
   - Entraram `test:user-html`, `test:ui-audit` e os testes unitários novos.
   - `bench:sidebar` ficou como script avulso.
   - `test:desktop:source` ficou fora do `npm test`, porque o job de CI que o roda não baixa o Electron.
   - O README ganhou os comandos novos.
   - Arquivos: [../package.json](../package.json), [../README.md](../README.md).
9. **Comentários:**
   - 29 trechos em inglês traduzidos em 7 scripts de teste;
   - varredura final com o parser do ESLint (que separa comentário de texto em string): nenhum comentário em inglês restante em `src/`, `electron/`, `build/` e `scripts/`;
   - strings, fixtures de teste e os templates do tutorial ficaram intocados.

## 3. Validação de testes

**Linha de base:** antes de qualquer correção, `npm test` passou 100%.

**Validação final integrada (Agente 4), com a árvore parada e sem execuções concorrentes**

| Comando | Resultado | Detalhe |
|---|---|---|
| `npm run lint` | PASS | 0 erros |
| `npm test` (com as suítes novas) | PASS nas 2 rodadas completas (145 s e 147 s) | unit 31/31 (10 novos), features 18 ✔, editor 11 PASS, user-html 18 PASS, i18n 2/2 + 1 PASS, rc 8 PASS, ui 9 PASS, ui-audit 1 PASS |
| `npm run test:desktop:source` | PASS | Electron a partir do código numa pasta `FOUX [teste] ~ ç %41 #1`, com build temporário |
| `npm run build` | PASS | 1900 módulos, CSP injetada no `index.html` |
| Conferência das regras | OK | HEAD continua em `9708495` (nenhum commit). Nenhum instalador novo em `release/`; só as capturas de `release/qa` foram regravadas pelos testes. PDFs byte a byte iguais aos do backup. |

**Testes novos que blindam o sistema contra regressões**

| Arquivo | Autor | Cobre | Como roda |
|---|---|---|---|
| [../scripts/test_user_html_editing.mjs](../scripts/test_user_html_editing.mjs) | Agentes 1 e 4 | HTML "de aluno" sem classes do FOUX, com `<style>` interno, `!important`, CSP, `<script>` e bordas sem estilo; bordas de um lado só; arredondamento sem `overflow`; gradientes do aluno; aba Layout com ID repetido; reaplicação do CSS exportado no HTML original; rascunho do slider, cor do hover e importação de fonte (blocos do Agente 4). | `npm run test:user-html` (no `npm test`) |
| [../scripts/test_ui_audit.mjs](../scripts/test_ui_audit.mjs) | Agente 2 | As 8 cores da paleta clicáveis, o botão "⋯", ausência de vidro aninhado, sidebar bloqueada legível, contraste da área de importação, transparência reduzida, fundo do modal sem `opacity` no pai. | `npm run test:ui-audit` (no `npm test`) |
| [../scripts/test_security_desktop.cjs](../scripts/test_security_desktop.cjs) | Agente 3 | Origem confiável por caminho, rota do manual, flags das janelas, ponte mínima, pacote sem dependências de runtime, CSP. | `test:unit` |
| [../scripts/test_desktop_source.mjs](../scripts/test_desktop_source.mjs) | Agente 3 | Electron real em caminho com `[ ] ~ ç % #`: IPC, CSP, sandbox, manual e persistência no fechamento. Falha com o código antigo. | `npm run test:desktop:source` (fora do `npm test` por falta do binário do Electron no CI) |
| [../scripts/test_data_store.cjs](../scripts/test_data_store.cjs) (+3 casos) | Agente 3 | Gravação agrupada, `flush` com `.bak`, travas de arquivo do Windows. | `test:unit` |
| [../scripts/test_editor_units.mjs](../scripts/test_editor_units.mjs) | Agente 4 | 10 testes sem navegador: leitura de gradientes, lado visível da borda, ativação de estilo e espessura, cores, contraste e `hoverShade`, depósito de fontes do histórico. | `test:unit` |
| [../scripts/bench_sidebar.mjs](../scripts/bench_sidebar.mjs) | Agente 3 | Benchmark de resposta da sidebar. | `npm run bench:sidebar` |

**Performance medida (Agente 3, build de produção)**
- Condição: fonte de 800 KB, 300 elementos, 120 eventos.
- Handler da sidebar: 0,31 ms em média no seletor de cor (p95 0,40) e 0,43 ms no slider de borda (p95 0,60), abaixo da meta de 1 ms.
- Total por evento na thread principal: cerca de 4 ms (p95 5,3–5,8), dentro dos 16,7 ms de um frame.
- Fim do gesto (histórico + autosave): 8,5 ms.
- Espera do IPC de armazenamento: cerca de 0,03 ms.
- Bundle: JS principal de 343 KB (102 KB gzip), editor 100 KB, CSS 193 KB + 18 KB.

**Falhas intermitentes**
- Três falhas apareceram uma vez cada durante a fase paralela: "Reloaded editor missing", botão do tutorial nulo e "Toast dismissal failed". Nenhuma se repetiu na validação final.
- Causa encontrada: duas execuções nas mesmas portas. O `--strictPort` derrubava o segundo Vite sem aviso, e as duas suítes passavam a dirigir a mesma página do Chromium.
- Agora o harness aborta em menos de 200 ms com mensagem clara quando a porta está ocupada.

**Escopo das mudanças em relação ao backup:** 99 arquivos alterados e 10 novos, nenhum removido. Por pasta: `src` 82 + 2 novos, `scripts` 9 + 6, `electron` 3 + 1, `build` 1, raiz 4, `docs` 1 novo (este relatório).

## 4. Problemas sem solução imediata ou dependentes de ação externa

**Decisões suas**
1. **Espessura da borda criada pela cor:** escolher a cor de uma borda inexistente cria uma borda de 3px. Confirme se prefere 1px.
2. **Recorte do conteúdo:** arredondar um elemento não recorta mais o conteúdo dos filhos, como uma imagem num card. O tutorial não é afetado. Se quiser o recorte, a proposta é um controle explícito de `overflow`.
3. **Botão "⋯" nos cards do dashboard:** é uma mudança visível de interface. Recomendado manter.
4. **CSP com `object-src 'none'`:** bloqueia `<object>` e `<embed>` no HTML do aluno dentro do canvas. É raro, mas confirme.
5. **Cor de partida do texto no hover:** o padrão `#ffffff` faz o texto sumir numa página clara, o mesmo problema que foi corrigido no fundo. A mesma estratégia pode ser aplicada ao texto.
6. **`test:desktop:source` no CI:** para rodar no CI, precisa de um passo no job `package`, que tem o Electron. Isso muda o workflow, que não foi tocado.

**Ações externas**
7. **Reempacotar o instalador** (`dist:win` + `npm run test:desktop`). Só assim a redução do `app.asar` e o pacote sem `node_modules` e sem `dist/docs` se concretizam e são validados. Depende de você liberar a geração de executável.
8. **Assinatura de código:** exige certificado. Sem ela, o SmartScreen do Windows continua avisando.
9. **Electron Fuses:** dá para configurar no electron-builder 26, mas só validar empacotando.
   - `grantFileProtocolExtraPrivileges` precisa continuar ligado enquanto o app usar `file://`.
   - Desligar `EnableNodeCliInspectArguments` quebra o `test_desktop_persistence`.
10. **Fonte Inter:** vem do Google Fonts a cada abertura. Funciona offline com fallback, mas envia o IP ao Google. Embuti-la exige adicionar o arquivo da fonte ao projeto.

**Limites técnicos (resolver quebraria contratos)**
11. Quando a mesma propriedade tem `!important` do aluno e também um hover do FOUX, o hover perde. Folhas de outra origem (CDN) não podem ser lidas, então não há detecção nelas.
12. Gradientes:
    - o editor tem duas cores; editar um gradiente com 3+ paradas descarta as do meio;
    - radial e cônico não são editáveis;
    - fundos com várias camadas ficam intocados de propósito.
13. Páginas montadas por JavaScript aparecem incompletas na prévia: scripts não rodam, por segurança.
14. A CSP e o `meta refresh` do aluno saem do HTML salvo do projeto. A exportação continua sendo só de CSS.
15. Até 250 ms de gravação agrupada, somados aos 800 ms do autosave, ficam em memória. Só se perdem em queda de energia ou encerramento forçado.
16. "Trocar de elemento com o slider arrastando" não é alcançável por mouse nem teclado, porque o slider mantém o foco.
17. Uma fonte apagada do documento continua no depósito do histórico até a próxima importação de HTML. O custo é limitado ao número de fontes distintas usadas na sessão.

**Fora do que esta rodada cobriu (cota)**
18. A aparência do diálogo de vitória dos Desafios, que exige completar uma rodada.
19. Zoom no disco de gradiente para checar vazamento de cor.
20. A auditoria visual automática em 960 e 390px; esses tamanhos passaram só pelas asserções do `--design`.
21. A tradução do histórico com fontes não tem teste E2E, porque hoje o idioma só muda fora do editor. Está coberta pelo teste unitário de ida e volta.
22. A mensagem `challenges.noneLeft` engana quando o HTML do tutorial foi trocado pelo botão "Novo": diz que tudo foi cumprido quando não há alvos.
23. CSS morto que ficou: `.selection-bar*` em `shared.css` e seletores sem uso no `LiquidGlass.css`.
24. O ESLint só aplica regras em `.js`/`.jsx`; os `.cjs`/`.mjs` têm apenas o parse verificado.

## 5. Roadmap de ideias futuras

**Motor de edição**
- Gravar as edições numa folha própria ("FOUX edits") com seletores gerados, em vez de estilo inline. Isso elimina o conflito entre `!important` e hover, e deixa a exportação trivial.
- Inspetor de cascata que mostre qual regra vence, inclusive a origem de um `!important`.
- Controle explícito de `overflow`, seletor de `border-style` e edição de borda por lado.
- `box-shadow` estático com `spread` e `inset`; hoje a sombra só existe no hover.
- Editor de gradiente com várias paradas, radial e cônico.
- Compartilhar o índice de `!important` com a análise de conflitos da exportação.

**Arquitetura de CSS e interface**
- Organizar o CSS em `@layer` (base, temas, componentes) para acabar com a disputa de `!important` entre 24 arquivos.
- Redefinir os tokens dentro de `.editor-sidebar` no tema claro, em vez de corrigir componente por componente.
- Popover API (top layer) com anchor positioning nos menus e paletas. Isso elimina, por construção, cortes por `overflow` e contextos de empilhamento.
- Componente de "vidro" com o `backdrop-filter` num pseudo-elemento, para evitar vidro aninhado.
- Levar a auditoria (contraste, alvos, vidro aninhado, hit-test) para o CI, com diff visual tolerante por tela, e gerar as paletas dos temas com checagem de contraste no build.

**Desktop e dados**
- Armazenamento por projeto (uma chave por projeto ou IndexedDB), para não re-serializar todos os projetos a cada autosave.
- Protocolo próprio `app://` em vez de `file://`. Dá origem isolada, CSP `'self'` mais estrita e permite desligar o fuse de privilégios do `file://`.
- IPC assíncrono (`invoke`) com fila na tela, eliminando o `sendSync`.
- Avisar com um toast quando o disco falhar, em vez de esperar o fechamento; recarregar a tela após um crash, com proteção contra loop.
- Carregar os textos de cada idioma sob demanda; hoje PT e ES vão juntos no pacote principal.
- Regras de ESLint com globals de Node para `electron/` e `scripts/`; GitHub Actions fixadas por SHA e Dependabot ativo.
