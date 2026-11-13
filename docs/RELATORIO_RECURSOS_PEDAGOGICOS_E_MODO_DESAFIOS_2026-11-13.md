# Recursos pedagógicos e Modo Desafios — 13/11/2026

Escopo: cinco melhorias pedagógicas na barra lateral do editor (nomes CSS oficiais com dicas, diagrama de Box Model com sobreposição no canvas, restaurar elemento, contraste WCAG e histórico legível), o Modo Desafios gamificado no projeto Tutorial e o card de recorde no Perfil. O painel "CSS ao vivo" ficou fora, como pedido. Nenhum commit ou executável foi gerado.

## 1. Resumo técnico da implementação

### 1.1 O que foi entregue

- **Nomenclatura W3C e microdicas:** cada controle das abas Estilos, Layout e Eventos mostra o nome amigável, o token CSS oficial em fonte monoespaçada (`border-radius`, `padding`, `box-shadow`…) e um ícone "i" com uma dica de uma linha.
- **Box Model interativo:** a seção Espaçamentos tem os campos de atalho (`padding` e `margin` nos 4 lados) e um diagrama no estilo DevTools com os 4 lados de cada propriedade, um botão de vínculo por anel e a área de conteúdo (largura × altura). Ao passar o mouse ou focar um controle, o canvas pinta a margem em laranja e o padding em verde sobre o elemento.
- **Restaurar elemento:** botão "Restaurar" no selo do elemento selecionado. Volta o estilo inline ao `data-foux-original-style`, desfaz a borda em degradê e remove as regras `:hover` do elemento, tudo como um único passo de histórico (Ctrl+Z desfaz).
- **Contraste WCAG em tempo real:** selo abaixo das cores de texto e de fundo com a razão (`4.8:1 · AA`) e o nível (AAA, AA, "só texto grande" ou "Baixo contraste"), com aviso quando a leitura fica prejudicada.
- **Histórico legível:** cada passo guarda `{ labelKey, target, from, to }`. Os botões Desfazer/Refazer mostram, no tooltip, algo como "Desfazer: Cor do texto (#000000 → #2563eb) — h3#titulo-exercicio".
- **Modo Desafios:** botão ao lado do "Tour guiado", só no projeto Tutorial. Cada rodada tem 8 desafios sorteados (um por categoria) de um banco de 24, com HUD flutuante, cronômetro, validação automática, modal de vitória e recorde.
- **Perfil:** card "Melhor Tempo (Modo Desafios)" com acordeão do histórico de conclusões.

### 1.2 Arquivos criados

| Arquivo | Papel |
|---|---|
| `src/challenges/pool.js` | Banco de 24 desafios (3 por categoria × 8 categorias), enunciados PT/ES, IDs de alvo PT/ES e a verificação de cada um |
| `src/challenges/engine.js` | Fisher–Yates, sorteio da rodada e verificação de um desafio |
| `src/challenges/records.js` | Leitura e gravação dos recordes (`foux_challenge_records`, máx. 50 conclusões) e formatação `MM:SS` / `MMm SSs` |
| `src/hooks/useChallengeMode.js` | Estado da rodada: iniciar, pular, desistir, validar e concluir |
| `src/components/editor/challenges/ChallengeHud.jsx` | HUD flutuante, arrastável e recolhível |
| `src/components/editor/challenges/ChallengeVictory.jsx` | Modal de vitória com contagem regressiva de 30 s |
| `src/components/editor/CanvasOverlay.jsx` | Camada sobre o iframe: áreas de margin/padding e destaque do alvo |
| `src/components/editor/controls/PropertyLabel.jsx` | Rótulo com token CSS e botão de dica |
| `src/components/editor/controls/ContrastBadge.jsx` | Selo WCAG |
| `src/components/editor/controls/BoxModelEditor.jsx` | Atalhos e diagrama de Box Model |
| `src/components/profile/ChallengeRecordCard.jsx` | Card de recorde e histórico no Perfil |
| `src/utils/css/contrast.js` | Luminância relativa, razão de contraste e fundo efetivo (inclui degradês e transparências) |
| `src/utils/css/glossary.js` | Tokens CSS oficiais por controle |
| `src/utils/historyLabels.js` | Descrição curta do elemento e dos valores para o histórico |
| `src/styles/learning.css`, `src/styles/challenges.css` | Estilos dos recursos novos, por tema |

### 1.3 Arquivos modificados

- `src/hooks/useEditorHistory.js`: entradas `{ html, meta }`, `recordAction` para ações discretas e fechamento do gesto quando muda a propriedade ou o elemento.
- `src/hooks/useIframeInspector.js` e `src/hooks/inspector/useHoverStyles.js`: `restoreSelected`, `clearHoverRules` e releitura dos estilos ao fim de transições CSS.
- `src/utils/inspector/styles.js`: lados de padding/margin, tamanho do conteúdo, contraste e `transitionsSettled`.
- `src/components/editor/SidebarEstilos.jsx`, `sidebar/StylesTab.jsx`, `sidebar/LayoutTab.jsx`, `sidebar/HoverTab.jsx` e `sidebar/useColorControls.js`: rótulos, metadados de histórico, botão Restaurar e Box Model.
- Controles `SliderControl`, `ColorControl`, `GradientControls` e `ShadowPad`: aceitam `token` e `hint`.
- `src/components/editor/EditorHeader.jsx`: botão Modo Desafios e tooltips descritivos de Desfazer/Refazer.
- `src/pages/Editor.jsx`: integração (sobreposição, HUD, vitória, restaurar, validação).
- `src/pages/Profile.jsx`, `src/styles/profile.css`: card de recorde.
- `src/components/ui/Tooltip.jsx`: também atende os botões de dica da sidebar e do HUD (apenas elementos com `data-tooltip`).
- `src/locales/pt.json`, `src/locales/es.json`: grupos `glossary`, `contrast`, `history`, `challenges` e chaves novas em `sidebar` e `profile`. Paridade PT/ES de 100%.
- `src/utils/storage.js`: chave `foux_challenge_records` na lista documentada.

Rótulos renomeados (atualizar as capturas do manual): "Padding (px)" → "Espaçamento interno", "Margin (px)" → "Espaçamento externo", "Arredondamento (Radius)" → "Arredondamento". Em espanhol: "Espaciado interno", "Espaciado externo", "Esquinas redondeadas".

### 1.4 Impacto no bundle

| Arquivo gerado | Antes | Depois |
|---|---|---|
| Bundle principal (JS) | 300,27 kB (gzip 90,04) | 310,01 kB (gzip 93,26) |
| Bundle principal (CSS) | 154,6 kB | 156,9 kB (gzip 24,07) |
| Chunk do Editor (JS) | 62,74 kB (gzip 18,85) | 94,81 kB (gzip 29,01) |
| Chunk do Editor (CSS) | 2,5 kB | 16,5 kB (gzip 4,06) |
| Chunk do Perfil (JS) | 5,6 kB | 7,6 kB |
| `records` (compartilhado Editor/Perfil) | — | 1,56 kB |

- Nenhuma dependência foi adicionada.
- O aumento do bundle principal (cerca de 3 kB gzip) vem dos textos novos nos dois idiomas.
- O banco de desafios, com enunciados PT/ES, vive no módulo `src/challenges/` e só carrega com o editor. Por isso os enunciados não estão nos arquivos de locale.

### 1.5 Como a validação foi acoplada sem afetar os 60 fps

- **Mesmo ciclo do inspector:** cada edição da sidebar já chama `onStyleChange`. Durante uma rodada, essa chamada agenda **uma** validação por quadro (`requestAnimationFrame`), mesmo que cheguem dezenas de eventos por segundo.
- **Leitura barata:** a validação lê o `getComputedStyle` de um único elemento (o alvo do desafio atual), no mesmo quadro em que o inspector já recalculou os estilos. Por isso não força layout extra.
- **Nada fora da rodada:** sem desafio ativo, `scheduleCheck` retorna na primeira linha.
- **Sem re-render por segundo no editor:** o cronômetro vive no estado do próprio HUD (1 atualização por segundo). O Editor só renderiza de novo quando o desafio muda.
- **Gravação mínima:** o recorde é gravado uma vez, no fim da rodada completa.
- **Overlay fora do documento do aluno:** as áreas de margin/padding e o destaque são `div`s no editor, posicionados sobre o iframe. O HTML do aluno, o histórico e o CSS exportado não recebem marcações auxiliares.
- **Contraste:** calculado junto com os demais estilos no quadro já agendado, subindo pelos ancestrais só até achar um fundo opaco.

**Medição** (mesmo benchmark do relatório anterior: documento com fonte embutida de 600 KB, 300 elementos, 120 eventos seguidos; faixa de 3 execuções):

| Controle | Após a otimização anterior: média / p95 / máx. | Agora: média / p95 / máx. |
|---|---|---|
| Seletor de cor | 0,35 / 0,5 / 5,6 ms | 0,33–0,37 / 0,5 / 5,3–5,7 ms |
| Slider de borda | 0,48 / 0,7 / 1,0 ms | 0,55–0,68 / 0,8–1,1 / 5,2–6,8 ms |

O custo extra fica entre 0,1 e 0,2 ms por evento, vindo dos rótulos, do selo e do diagrama, que agora renderizam junto. O pior caso continua muito abaixo dos 16,7 ms de um quadro a 60 fps.

### 1.6 Regras do Modo Desafios

- **Visibilidade:** o botão só existe quando o projeto aberto é o Tutorial (`template: 'tutorial'`).
- **Sorteio:** Fisher–Yates nas categorias e dentro de cada categoria, uma por categoria, com a ordem final embaralhada outra vez. Desafios que o documento já cumpre (porque o aluno já fez aquela edição) ficam de fora. Se uma categoria esgotar, a vaga vai para um desafio restante de outra. Se não sobrar nenhum, aparece um aviso.
- **Tolerância:** cores são aceitas por faixa de matiz ("um tom de azul" aceita do azul-marinho ao azul-claro), números por limite mínimo (por exemplo, "32px ou mais") e o ângulo do degradê com ±5°.
- **Pular:** move o desafio para o fim da fila. A rodada continua exigindo os 8.
- **Persistência:** o tempo só é salvo quando os 8 desafios são concluídos. Desistir, sair do modo ou sair do editor descarta a rodada. As últimas 50 conclusões ficam em `foux_challenge_records`, e o melhor tempo é guardado à parte para não se perder quando a lista é cortada.

### 1.7 Correção encontrada durante os testes

O tutorial (e muitas páginas de alunos) declara `transition: all 0.2s`. Logo após uma edição, o navegador reporta o valor **no meio da transição**. Com isso, um desafio cumprido podia não ser reconhecido, e a barra lateral podia ficar mostrando um valor intermediário (por exemplo, borda 2 px quando o elemento já tinha 5 px). Esse segundo problema já existia antes desta etapa. Agora o inspector e a validação releem o elemento quando as transições terminam (`element.getAnimations()`), sem polling.

### 1.8 Testes

- `eslint`, `vite build`, testes unitários (12/12) e paridade PT/ES: OK.
- Suítes E2E existentes: editor, `--rc` (inclui os campos de padding/margin), `--i18n`, refinamentos de UI e `--design` (8 combinações de tema e idioma + movimento reduzido): todas passam. O teste de tela cheia nativa continua dependente do ambiente headless, como já registrado no relatório anterior.
- E2E dos recursos novos (script de verificação fora do repositório):
  - tokens e dica;
  - selo nos estados aviso, AAA e falha;
  - tooltip de Desfazer/Refazer;
  - Box Model com lado único, placeholder "vários" e sobreposição alinhada ao elemento;
  - Restaurar com um passo de histórico;
  - posição do botão, HUD, pular, destacar alvo e rodada completa até a vitória e o recorde;
  - desistir sem gravar;
  - cabeçalho em 960 e 390 px;
  - card do Perfil.
  - Rodou 5 vezes seguidas sem falhas.
- Banco de desafios: os 24 desafios começam não cumpridos e passam exatamente no limite pedido, no tutorial PT e no ES. Em 50 sorteios, todas as rodadas tiveram 8 desafios de 8 categorias, e todas as 50 ordens foram diferentes.

### 1.9 Limitações e decisões

- **Arraste com transições:** em elementos com `transition` declarada pelo aluno, o slider pode oscilar durante o arraste, porque os valores computados ficam atrasados. O valor final agora fica correto. Comportamento anterior a esta etapa.
- **Liquid Glass:** os campos numéricos do diagrama herdam o formato arredondado dos campos desse tema.
- **Rodadas seguidas:** sem restaurar, cada rodada só sorteia o que ainda não foi feito no tutorial, então rodadas consecutivas esgotam o banco. O aviso orienta o aluno a restaurar elementos ou criar um novo projeto Tutorial.

## 2. Guia para o manual do usuário

Somente as funcionalidades novas visíveis ao aluno. Os nomes entre parênteses são os da interface em espanhol.

### 2.1 Nome oficial da propriedade e dicas

- **O que é:** ao lado do nome de cada controle aparece o nome oficial da propriedade CSS, em uma etiqueta cinza (por exemplo, "Arredondamento `border-radius`"). O ícone "i" mostra uma dica curta sobre o efeito daquela propriedade.
- **Onde fica:** abas Estilos, Layout e Eventos da barra lateral, em cada controle.
- **Como usar:**
  1. Selecione um elemento no canvas.
  2. Observe a etiqueta ao lado do nome do controle: é o nome que se escreve no CSS.
  3. Passe o mouse sobre o "i" (ou chegue nele com Tab) para ler a dica.

### 2.2 Diagrama de Box Model e áreas no canvas

- **O que é:** um desenho do modelo de caixa com os quatro lados de `margin` (laranja) e de `padding` (verde) e, no centro, o tamanho do conteúdo.
- **Onde fica:** aba Estilos, seção Espaçamentos. No topo continuam os campos "Espaçamento interno" e "Espaçamento externo" ("Espaciado interno/externo"), que alteram os quatro lados de uma vez.
- **Como usar:**
  1. Selecione um elemento.
  2. Passe o mouse ou clique em qualquer campo de margin ou padding. O canvas pinta a área correspondente sobre o elemento: laranja para margin, verde para padding.
  3. Para mudar só um lado, clique no ícone de corrente ao lado de "margin" ou "padding" no diagrama ("Editar cada lado separadamente" / "Editar cada lado por separado") e digite o valor do lado desejado.
  4. Com a corrente ativa ("Vincular os 4 lados"), qualquer campo do anel altera os quatro lados juntos.
  5. Quando os lados são diferentes, o campo de atalho mostra "vários" ("varios").

### 2.3 Restaurar elemento

- **O que é:** volta o elemento selecionado ao estilo que ele tinha no arquivo original, apagando cores, bordas, espaçamentos, degradês e efeitos `:hover` aplicados pelo FOUX naquele elemento.
- **Onde fica:** botão "Restaurar" com seta circular, na faixa de "selecionado", no topo da barra lateral.
- **Como usar:**
  1. Selecione o elemento.
  2. Clique em "Restaurar". Uma mensagem confirma a restauração.
  3. Mudou de ideia? Use Desfazer (Ctrl+Z). A restauração conta como uma única ação.
  4. Se o elemento já estiver no estilo original, uma mensagem avisa que não há nada a restaurar.

### 2.4 Selo de contraste (WCAG)

- **O que é:** mostra se o texto do elemento é fácil de ler sobre o fundo, com a razão de contraste e o nível:
  - **AAA ou AA** (verde): leitura confortável;
  - **só texto grande / solo texto grande** (amarelo): suficiente apenas para textos de 24 px, ou 18,7 px em negrito;
  - **Baixo contraste / Bajo contraste** (vermelho): difícil de ler.
- **Onde fica:** abaixo de "Cor do Texto" (seção Tipografia) e de "Cor de Fundo" (seção Fundos e cores), e também na aba Layout.
- **Como usar:**
  1. Selecione um elemento com texto.
  2. Mude a cor do texto ou do fundo e acompanhe o selo, que se atualiza na hora.
  3. Se aparecer um aviso, aumente a diferença entre claro e escuro das duas cores.

### 2.5 Desfazer e Refazer com descrição

- **O que é:** os botões Desfazer e Refazer informam qual alteração será desfeita ou refeita, com os valores antes e depois e o elemento afetado.
- **Onde fica:** setas curvas no cabeçalho do editor, ao lado do nome do projeto.
- **Como usar:** passe o mouse sobre a seta (ou chegue nela com Tab) para ver, por exemplo, "Desfazer: Cor do texto (#000000 → #2563eb) — h3#titulo-exercicio". Um arraste contínuo (slider ou seletor de cor) conta como uma única alteração.

### 2.6 Modo Desafios ("Modo Desafíos")

- **O que é:** uma rodada de 8 desafios sorteados sobre a página do Tutorial, um de cada tema (cor, degradê, tipografia, box model, bordas, sombra, `:hover` e layout), com cronômetro e recorde.
- **Onde fica:** botão com troféu "Modo Desafios", ao lado de "Tour guiado", no cabeçalho do editor. Só aparece no projeto Tutorial.
- **Como jogar:**
  1. Abra o projeto Tutorial e clique em "Modo Desafios".
  2. Um painel flutuante aparece no canto inferior esquerdo, com:
     - o tempo (MM:SS);
     - a barra de progresso ("0 / 8 concluídos" / "completados");
     - a categoria e o enunciado do desafio.
  3. Faça a alteração pedida usando a barra lateral. O FOUX confere sozinho: ao acertar, aparece um check verde e o próximo desafio entra em menos de um segundo.
  4. "Destacar alvo" ("Resaltar objetivo") seleciona e faz piscar o elemento do desafio no canvas.
  5. "Pular" ("Saltar") manda o desafio atual para o fim da fila. Ele ainda precisa ser feito.
  6. "Desistir" ("Rendirse"), ou clicar de novo no botão do cabeçalho, encerra a rodada **sem salvar o tempo**.
  7. O painel pode ser arrastado pela barra superior e recolhido pela seta, deixando só o tempo e o progresso.
- **Ao concluir os 8:**
  - abre a janela "Desafio concluído com sucesso!" ("¡Desafío completado con éxito!"), com o tempo total no formato "02m 14s";
  - o selo "Novo recorde!" ("¡Nuevo récord!") aparece na primeira conclusão ou quando o tempo for o melhor até agora;
  - a barra no topo esvazia em 30 segundos e fecha a janela sozinha, ou clique em "Concluir" ("Finalizar").
- **Observação:** o tempo só é registrado quando os 8 desafios são concluídos. Desafios que você já fez no tutorial não são sorteados de novo. Para jogar tudo outra vez, restaure os elementos ou crie um novo projeto Tutorial.

### 2.7 Melhor tempo no Perfil

- **O que é:** um card com o recorde do Modo Desafios e o histórico de todas as rodadas concluídas.
- **Onde fica:** página Perfil do Usuário, abaixo de Estatísticas da Conta, com o título "Melhor Tempo (Modo Desafios)" ("Mejor Tiempo (Modo Desafíos)").
- **Como usar:**
  1. Abra o Perfil. O card mostra o melhor tempo (MM:SS), a data do recorde e o número de conclusões.
  2. Clique no card para abrir a lista com data e hora, tempo de cada rodada e o selo "Recorde" ("Récord") nas rodadas que bateram o recorde da época.
  3. Clique de novo para recolher. O FOUX guarda as últimas 50 conclusões.
