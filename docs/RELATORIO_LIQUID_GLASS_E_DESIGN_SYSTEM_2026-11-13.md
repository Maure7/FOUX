# Liquid Glass com refração e refinamento visual — 13/11/2026

Este relatório cobre a reengenharia do tema Liquid Glass e o refinamento visual da Dashboard e do Editor nos quatro temas. O vidro é aplicado com força total no Liquid Glass e de forma mais discreta no Escuro, no Claro e no Solarized.

## 1. O que mudou em cada tela

### Liquid Glass (completo)
- **Refração óptica de borda:**
  - O [LiquidGlassEngine.jsx](../src/components/ui/LiquidGlassEngine.jsx) desenha uma única vez, num `<canvas>` de 128×128, um mapa de deslocamento de lente convexa. O centro é neutro (R = G = 128), e só os 20% de cada borda curvam a luz, com cantos em squircle.
  - O mapa é injetado num `<svg>` oculto com dois filtros: `#foux-liquid-refraction` (`scale` 14) e `#foux-liquid-subtle` (`scale` 6).
- **Fundo em mesh:** um fundo preto com reflexos brancos suaves, numa camada `position: fixed`. A camada é composta uma vez, então rolar a página não a repinta.
- **Paleta monocromática (revisão de 13/11):** a pedido, os orbes coloridos e os brilhos neon roxos e amarelos saíram do tema. Acento, foco, halos, slider, pílula do seletor, badge de fixado, scrollbar e divisores agora são brancos ou cinzas. Só as cores com significado continuam: o status online, os níveis do selo de contraste e as cores do Box Model, que seguem o padrão do DevTools.
- **Materiais:**
  - **Flutuantes** (cabeçalhos, modais, menus, toasts, tooltip, HUD de desafios e tour): `url(#foux-liquid-refraction) blur(7px) saturate(200%) brightness(1.12) contrast(1.05)`, com o rim light de 4 camadas pedido (brilho branco no topo, acento na base e brilho interno difuso).
  - **Painéis de trabalho** (Sidebar, cards de projeto e pasta, itens de lista, Perfil, Configurações, Atividade): lente sutil e `blur(10px) saturate(180%)`, com o miolo estável para ler números e inputs.
  - **Pílulas** (abas da Sidebar e botões do cabeçalho): lente iluminada por gradiente no hover e no estado ativo. Elas não usam um segundo `backdrop-filter`.
- **Regra do Chromium:** o backdrop aninhado foi removido de 3 lugares:
  - nas seções da Sidebar;
  - no scrim dos modais, para que o card refrate a página real;
  - nos submenus.
- **Mesa de trabalho:** o mesh aparece ao redor da página editada.

### Todos os temas (versão discreta)
- **Rim light** de 2 px no topo dos cards.
- **Luz que segue o mouse** nos cards de projeto, pasta e lista, em âmbar suave no Claro. Ela também sinaliza qual card será aberto no clique.
- **Lente sutil** (`#foux-liquid-subtle`) na borda de modais, menus de contexto, toasts e no card do tour. O fundo deles continua a 92% de opacidade, então o contraste não mudou.

### Refinamentos (Prompt 2) em [refinements.css](../src/styles/refinements.css)
- **Números tabulares** na Sidebar, no HUD, na vitória, no recorde, nas estatísticas do Perfil e no tooltip: os valores não "dançam" ao arrastar.
- **Seletor Grade/Lista como segmented control:** uma pílula desliza entre as opções (300 ms, `cubic-bezier(0.22, 1, 0.36, 1)`) e é desativada com movimento reduzido.
- **Sliders táteis:**
  - a trilha fica preenchida até o valor, na cor de acento do tema;
  - o polegar cresce para `scale(1.12)` durante o arraste;
  - vale também para o slider de opacidade das cores.
- **Seletor de gradiente circular:** anel interno de 1 px e sombra interna no mostrador.
- **Mesa de trabalho:** 12 px ao redor da página editada, com cantos de 10 px e sombra em 3 camadas. A moldura some na tela cheia e no modo expandido.
- **Claro:** fundo `#f4f6f9` com cards brancos, borda `rgba(15, 23, 42, .08)` e sombras difusas.
- **Escuro:** fundo `#0b0d13`, cards `#121620` e borda iluminada no topo (`inset 0 1px 0 rgba(255,255,255,.06)`).

## 2. Desempenho
- **Luz do mouse:**
  - atualiza só a superfície sob o ponteiro, no máximo uma vez por quadro (`requestAnimationFrame`, listeners passivos);
  - para enquanto o botão do mouse está pressionado (arraste de slider, redimensionamento);
  - usa propriedades `@property` com `inherits: false`, então trocar a posição não recalcula os filhos do card nem da Sidebar.
- **Mapa de refração:** é gerado uma vez por sessão.
- **Medição** (arraste real de slider na Sidebar, 120 eventos, Chromium):

| Tema | Média entre quadros | p95 | Pior quadro | Quadros > 20 ms |
|---|---|---|---|---|
| Liquid Glass com refração | 6,5 ms | 11,1 ms | 16,6 ms | 0 |
| Liquid Glass sem nenhum backdrop (controle) | 6,3 ms | 11,1 ms | 11,2 ms | 0 |
| Escuro | 9,9 ms | 16,7 ms | 16,8 ms | 0 |

- **Bundle:** o CSS principal cresceu cerca de 11,8 kB (gzip cerca de 2 kB) e o JS principal 2,6 kB (gzip 0,9 kB). Nenhuma dependência foi adicionada.

## 3. Usabilidade e contraste
- **Superfícies sobre a página branca:** as que podem ficar sobre o documento do aluno (HUD, tour, toasts, tooltip e modais) usam uma tinta escura mais densa, de 74–86%, em vez do fundo de 4–14% pedido para as superfícies sobre o mesh. Sem isso, o texto branco ficaria ilegível sobre a página branca. Os cards, os cabeçalhos e a Sidebar seguem a faixa translúcida pedida.
- **Transparência reduzida no sistema:** o Windows deste computador está com os efeitos de transparência desligados, e nesse caso o Chromium/Electron informa `prefers-reduced-transparency: reduce`.
  - **Nos outros temas,** essa preferência é respeitada: o vidro discreto é desligado.
  - **No Liquid Glass,** o efeito é mantido, porque escolher esse tema já é um pedido explícito de translucidez. Se o efeito fosse desligado, você nunca o veria neste PC.
  - **Alto contraste:** com `prefers-contrast: more`, as superfícies do Liquid Glass ficam sólidas.
- **Tema e idioma nas Configurações:** continuam como `<select>`, e não viraram segmented control. Os testes E2E de idioma e de persistência dependem de `#theme-select` e `#language-select`, e o select nativo também é a opção mais acessível para 4 temas.
- **Fora desta entrega:** a animação de pulso no favorito não foi feita. Ela dispararia em todos os cards favoritos a cada abertura da Dashboard.

## 4. Testes
- Passaram: lint, unitários (12/12), features, editor, `--rc`, `--i18n`, `--design` (4 temas × 2 idiomas, mais movimento reduzido) e `FOUX_UI_ONLY`. O teste do editor rodou com a cópia que aceita a tela cheia alternativa, porque o headless não abre tela cheia nativa, como já acontecia antes.
- O [test_ui_refinements.mjs](../scripts/test_ui_refinements.mjs) fixava os valores do Liquid Glass antigo (`blur(24px)`, fundo `rgba(18,18,24,.45)` e canvas cinza). Agora ele verifica o novo material da Sidebar (lente sutil, `blur(10px)` e fundo transparente), o canvas transparente e a presença do filtro de refração.

## 5. Arquivos
- **Novos:**
  - [LiquidGlassEngine.jsx](../src/components/ui/LiquidGlassEngine.jsx)
  - [glass.css](../src/styles/glass.css)
  - [refinements.css](../src/styles/refinements.css)
- **Alterados:**
  - [App.jsx](../src/App.jsx): monta o motor;
  - [main.jsx](../src/main.jsx): importa os 2 CSS;
  - [SliderControl.jsx](../src/components/editor/controls/SliderControl.jsx) e [ColorControl.jsx](../src/components/editor/controls/ColorControl.jsx): variável `--fill`;
  - [test_ui_refinements.mjs](../scripts/test_ui_refinements.mjs).

## 6. Revisão 2 — vidro nos flutuantes, spotlight e foco único
- **Campos de texto com uma borda só:** antes, o foco desenhava a borda do tema e, por fora dela, o contorno de acessibilidade. Agora, nos 4 temas, a própria borda vira o anel de foco, com 2 px (borda mais `box-shadow` de 1 px) e sem `outline`.
- **Vidro com refração nos elementos flutuantes de todos os temas:** modais (Nova pasta, FAQ, Novo projeto, confirmações), menus de contexto, toasts, tooltip, card do tour e HUD do Modo Desafios.
  - **Material:** `url(#foux-liquid-refraction) blur(12px) saturate(170%)`.
  - **Tinta:** 78–80% nos modais e menus, e 88% no que pode ficar sobre a página branca do aluno (HUD, tour, toast e tooltip), para manter o contraste AA.
  - **Scrim:** o fundo escurecido atrás do modal deixou de usar desfoque e agora só escurece. Assim o modal refrata a página real, e não uma camada lisa.
- **Spotlight premium nos cards:**
  - acompanha o ponteiro nos cards de projeto e pasta, nos itens de lista, nos cards do Perfil e de estatísticas, nas seções de Configurações, na Atividade recente e no card de recorde;
  - aparece com um fade de 320 ms em vez de acender de uma vez (`@property --glass-glow`, sem afetar os filhos);
  - a intensidade subiu levemente: 7,5% no Escuro e no Solarized, e 8,5% âmbar no Claro.
- **Liquid Glass:**
  - os cabeçalhos ficaram sem contorno branco; ficam só o vidro e uma sombra difusa, e os botões e cards mantêm a borda;
  - o preto foi trocado por um preto arroxeado (`#0d0a14`, `#141020` e `#120e1c`), e as tintas dos painéis passaram para `rgb(24, 17, 38)`;
  - a Sidebar mantém o desfoque mas deixou de ter a lente. Ela repinta a cada passo do slider, e a refração ali quase não aparecia, então a remoção é por precaução.
- **Testes:** passaram lint, features, editor, `--rc`, `--i18n`, `--design` e `FOUX_UI_ONLY`.

## 7. Revisão 3 — spotlight que segue o cursor e distorção mais forte nas bordas
- **Spotlight:**
  - **Causa:** a luz já seguia o ponteiro, mas era pintada no fundo do card, embaixo da área de preview. Na prática só aparecia na faixa do nome.
  - **Correção:** agora ela fica numa camada própria (`::after`) acima do conteúdo, com raio de 150 px. Ela aparece com fade de opacidade (320 ms), que roda no compositor, e não bloqueia cliques.
  - **Intensidade:** 10% no Escuro e no Solarized, 11% âmbar no Claro e 14% no Liquid Glass.
- **Distorção:**
  - a faixa da lente passou de 20% para 34% de cada lado;
  - a curva ficou mais íngreme (expoente 2,4), então a distorção cresce rápido perto da borda e o centro continua neutro;
  - a força passou de 14 para 38 (lente principal) e de 6 para 18 (lente sutil).
- **Ordem do filtro:** o desfoque vem antes da lente (`blur(…) url(#…)`). Assim a lente curva o conteúdo já desfocado, e o desfoque não apaga a curvatura.
- **Borda translúcida nos flutuantes** (modais, menus de contexto, toasts e HUD de desafios): a tinta afina na faixa de 14 px da borda, onde a lente curva mais, e continua densa no miolo, onde fica o texto. O efeito usa duas rampas cruzadas, sem `mask`.
- **Testes:** passaram lint, features, editor, `--rc`, `--i18n`, `--design` e `FOUX_UI_ONLY`.

## 8. Revisão 4 — cores do spotlight, hover dos botões de aprendizado e ajustes finos
- **Spotlight:**
  - **Cores:** laranja-âmbar no Escuro (`rgba(251,146,60,.075)`), roxo no Claro (`rgba(139,92,246,.08)`), turquesa no Solarized (`.07`) e branco no Liquid Glass (`.1`), todas mais sutis que antes.
  - **Onde mais aparece:** nos itens da Atividade recente e nos botões de ação dos modais.
  - **Itens dentro de cards:** quando um item está dentro de um card (um item da atividade, uma estatística dentro do Perfil), o card e o item seguem o cursor ao mesmo tempo. Antes, só o elemento mais interno era atualizado.
- **Tour guiado e Modo Desafios:**
  - **Causa:** o hover não aparecia porque a regra de botão inativo (`:not(.is-active)`, com opacidade de 0,65) vencia a regra de `:hover`.
  - **Correção:** agora o botão acende por completo, com borda e halo na cor de acento. No Claro, o fundo fica preto com texto branco e um halo roxo; no Liquid Glass, o brilho é branco.
- **Vidro dos outros temas:** o desfoque dos elementos flutuantes subiu 45%, de 8 px para 11,6 px. O Liquid Glass ficou como estava.
- **Liquid Glass:** o roxo do fundo e das tintas foi suavizado (fundo `#0c0b11`, tinta `rgb(21, 18, 30)`).
- **Testes:** passaram lint, features, editor, `--rc`, `--i18n`, `--design` e `FOUX_UI_ONLY`.

## 9. Revisão 5 — spotlight nos painéis grandes
- **Painéis grandes:** os cards do Perfil, as seções das Configurações (Tema, Idioma, Tutorial, Dados locais), a Atividade recente e o card de recorde passaram a usar um spotlight maior (raio de 240 px em vez de 150 px). Assim a luz que acompanha o cursor fica visível em painéis largos. O efeito foi conferido nos 4 temas.
- **Tema Claro:** o spotlight roxo ficou 30% mais intenso (de 8% para 10,4%).
