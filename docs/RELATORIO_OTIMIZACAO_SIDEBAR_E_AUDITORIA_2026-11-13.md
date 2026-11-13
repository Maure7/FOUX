# Otimização da sidebar e auditoria do editor — 13/11/2026

Escopo: travamento da barra lateral em controles contínuos, limpeza e modularização do código, auditoria das funções do Dashboard e do Editor, sugestões pedagógicas e parecer sobre o logo SVG. Nenhum commit ou executável foi gerado nesta etapa.

## 1. Changelog técnico

**Correção do travamento (Sidebar → histórico → iframe)**
- **Causa:** a cada evento `input`, o editor fazia três coisas pesadas de forma síncrona:
  - `serializeDocument()`, que clona o documento inteiro e gera o `outerHTML`, incluindo fontes embutidas em base64;
  - uma leitura de `getComputedStyle` com layout forçado;
  - um re-render de todo o Editor.
- **Histórico ([useEditorHistory.js](../src/hooks/useEditorHistory.js)):**
  - Agora há um snapshot por gesto: o documento é serializado uma única vez, 350 ms depois de o movimento parar.
  - As pilhas ficam em refs e os callbacks são estáveis.
  - `Ctrl+Z` no meio de um arraste fecha o gesto antes de desfazer.
- **Inspector ([useIframeInspector.js](../src/hooks/useIframeInspector.js)):**
  - O estilo é escrito no iframe na hora.
  - A leitura dos estilos de volta e o `setState` acontecem no máximo uma vez por frame (`requestAnimationFrame`).
- **Controles:**
  - Novo hook [useDraft.js](../src/hooks/useDraft.js) guarda um rascunho local, então o input não "pula de volta" enquanto o estado global não alcança.
  - `React.memo` nos controles, no `EditorHeader` e no `EditorCanvas`.
  - Os handlers leem o estado mais recente por ref, então continuam estáveis.
- **Aba Eventos (hover):** vai no máximo uma escrita por frame para a folha de estilos, e o estado fica isolado na própria aba.
- **Medição** (documento com fonte embutida de 600 KB + 300 elementos, 120 eventos):

| Controle | Antes: média / p95 | Depois: média / p95 |
|---|---|---|
| Seletor de cor | 6,93 / 20,7 ms | 0,35 / 0,5 ms |
| Slider de borda | 4,00 / 10,1 ms | 0,48 / 0,7 ms |

O p95 anterior passava do limite de 16,7 ms por frame, e era isso que o usuário sentia como engasgo.

**Organização dos arquivos**
- `SidebarEstilos.jsx` caiu de 1126 para 154 linhas e agora é só a moldura (abas, badge, overlay).
- As abas foram para `sidebar/`: `StylesTab`, `LayoutTab`, `HoverTab` e o hook `useColorControls`.
- Novos controles: `ColorField` (seletor + campo hexadecimal, antes repetido 6 vezes), `GradientControls` (antes duplicado) e `ShadowPad`.
- Novos utilitários: [utils/css/color.js](../src/utils/css/color.js) (junta conversões de cor que estavam duplicadas), [utils/inspector/hoverRules.js](../src/utils/inspector/hoverRules.js) (leitura/montagem do `:hover` como funções puras) e [utils/image.js](../src/utils/image.js).
- A API que o Editor usa não mudou. Os caminhos que os testes importam também não.

**Remoção de código e peso**

| | Antes | Depois |
|---|---|---|
| Linhas JS/JSX em `src` | 7842 | 7211 (−631, −8%) |
| Chunk do Editor | 66,67 kB | 62,74 kB (gzip +0,28 kB) |
| Bundle principal | 302,48 kB | 300,27 kB |

- **Código morto removido:**
  - um bloco de re-sincronização inalcançável no Editor;
  - os ramos para string do `addActivity`;
  - o componente `Tooltip`, nunca usado;
  - `clearSelection`, `getHoverClass` e `selectedTagName`;
  - quatro props que ninguém lia;
  - 11 chaves/grupos i18n sem uso, nos dois idiomas (cerca de 1 KB em cada).
- **Comentários:** 132 linhas de comentários óbvios removidas (rótulos de JSX, passos numerados, JSDoc que só repetia o nome da função). As linhas de comentário caíram de 334 para 179, e as que restam explicam o porquê.

## 2. Diagnóstico das funções e fragilidades

**Saúde geral:** boa. A arquitetura (iframe isolado, exportação, i18n, persistência atômica) é sólida e bem coberta por testes E2E. Os problemas se concentravam em desempenho e em casos de borda.

**Corrigidas nesta sessão**
- **Cor que não aparecia:** escolher uma cor num elemento transparente (por exemplo, uma `<div>` sem fundo) aplicava `rgba(…, 0)`, ou seja, invisível.
- **Fundo preto inesperado:** desligar o gradiente de fundo num elemento sem fundo próprio deixava o fundo preto.
- **Campo hexadecimal:** não dava para digitar caractere por caractere, porque o valor era revertido a cada tecla.
- **Fontes:**
  - a opção "Padrão do navegador" era ignorada;
  - as fontes importadas sumiam da lista ao reabrir o projeto;
  - um arquivo de fonte com nome não-latino gerava `font-family: ''`.
- **Listeners (eventos de teclado e de carregamento):**
  - o atalho de teclado do histórico era recriado a cada mudança de estado;
  - a configuração do iframe rodava duas vezes no primeiro carregamento.
- **Aba Eventos:**
  - só abrir a aba reescrevia as regras de hover e criava uma entrada no histórico;
  - uma injeção de hover pendente podia escrever no documento recém-restaurado pelo desfazer (agora há uma checagem de `ownerDocument`).
- **Dados sem limite:**
  - a lista de atividades crescia sem limite e era regravada em disco a cada ação (agora limitada a 100);
  - o avatar era salvo em base64 de qualquer tamanho (agora é reduzido para 256 px em WebP).
- **Painel de atividades:** havia um timer por item, o rótulo de tempo ficava até 30 s no idioma antigo após a troca, e o timer de confirmação de limpeza se sobrepunha.
- **Acessibilidade e IDs:**
  - o estado vazio de pasta não respondia a Enter/Espaço;
  - os botões de alinhamento de imagem e a alça de redimensionar não tinham nome acessível;
  - IDs repetidos no HTML do aluno geravam chaves React duplicadas.

**Complexas, mantidas e só documentadas**
- **Persistência no Electron:** cada gravação faz `ipcRenderer.sendSync`, regrava o JSON inteiro e chama `fsync`, bloqueando a interface. A solução seria uma fila assíncrona com escritas agrupadas, mas isso muda o protocolo de fechamento e a garantia testada em `test_data_store.cjs`. Reduzi a frequência (autosave só nas pausas) e o peso (avatar e atividades).
- **Projetos numa única chave:** `foux_projects` guarda o HTML de todos os projetos, então cada autosave regrava tudo. Separar por projeto exige migração de dados.
- **Memória do histórico:** guarda até 50 snapshots completos, e com fontes embutidas isso chega a dezenas de MB. Um histórico por diferenças seria um redesenho.
- **Google Fonts no `index.html`:** a folha da Inter vem da internet e bloqueia o primeiro render. Offline, cai para Segoe UI. Corrigir exige empacotar a fonte (`@fontsource/inter`), o que altera o `package.json`.
- **`!important` do autor:** cor e fundo aplicados sem `!important` perdem para regras `!important` do CSS do aluno. Mudar isso afeta a exportação, que é testada para não gerar `!important` desnecessário.
- **Teste de tela cheia nativa:** falha no Chromium headless deste ambiente, igualmente no código original. Validei o resto do teste do editor com uma cópia que aceita o modo de tela cheia alternativo.

## 3. Sugestões pedagógicas e de UX (dentro do escopo)
- **Painel "CSS ao vivo":** mostrar, em modo leitura, a regra do elemento selecionado sendo atualizada enquanto o aluno mexe. `getElementSelector` e `formatRule` já existem.
- **Nome oficial da propriedade W3C** em cada controle, por exemplo "Arredondamento · `border-radius`", com uma dica curta.
- **Overlay de margin/padding no canvas** ao focar o controle, como no DevTools, e edição dos 4 lados com um diagrama de box model.
- **"Restaurar original"** por elemento, aproveitando o `data-foux-original-style` que já é salvo.
- **Aviso de contraste WCAG** ao escolher cor de texto sobre o fundo; os testes já calculam isso.
- **Histórico legível:** por exemplo, "Cor do texto: #000000 → #123456".
- **Desafios no tutorial** ("deixe o botão com 12px de raio"), verificados automaticamente pelos estilos computados.

## 4. Parecer: logo SVG do FOUX

**Na interface:** é viável e simples.
- **Onde o nome aparece hoje:**
  - `.header__logo` em `Header.jsx`;
  - `.editor-header__logo` em `EditorHeader.jsx` (também funciona como botão de voltar);
  - o `<title>` e o `public/favicon.svg` do `index.html`.
- **Como fazer:** um componente `FouxLogo.jsx` com o SVG inline e `fill="currentColor"` ou variáveis CSS, para acompanhar os 4 temas. Um `<img src>` importado também funciona offline (o Vite empacota e o `base: './'` mantém o caminho válido em `file://`), mas não muda de cor com o tema.
- **Cuidados:**
  - manter o `aria-label` no elemento clicável;
  - converter o texto do logo em paths;
  - conferir o contraste no tema Liquid Glass.

**No executável e no instalador:**
- **Formato:** o Windows exige `.ico` (multirresolução) no `.exe`, nos atalhos e no instalador NSIS. SVG não é aceito nem no `.exe` nem no `BrowserWindow`, que só aceita PNG, JPEG ou ICO.
- **O pipeline já está pronto:**
  - o `build.win.icon` do `package.json` já aponta para `build/icon.ico`;
  - o `npm run icons` (incluído no `build:desktop`) já rasteriza o `public/favicon.svg` via resvg para ICO de 16 a 256 px e PNG de 512 px.
  - Ou seja, basta substituir o `favicon.svg` pelo logo oficial (viewBox quadrado, só paths, sem filtros ou imagens externas) e reempacotar, quando você autorizar.
- **Ajustes opcionais:**
  - `nsis.installerIcon`, `uninstallerIcon`, `installerHeaderIcon` e uma barra lateral BMP de 164×314;
  - no `main.cjs`, `icon: build/icons/256x256.png`, para a janela não mostrar o ícone padrão do Electron quando o app roda pelo `electron:start` (o `.exe` empacotado já usa o ícone embutido).
- **Limitações:**
  - em 16 px o logo precisa de uma versão simplificada para continuar legível;
  - o cache de ícones do Windows pode mostrar o ícone antigo após reinstalar (`ie4uinit.exe -show` resolve).
