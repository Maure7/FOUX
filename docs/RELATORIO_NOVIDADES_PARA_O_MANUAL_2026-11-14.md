# Novidades para o novo manual do usuário — 14/11/2026

Escopo: o que mudou no FOUX depois dos manuais atuais (PT de 09/10/2026 e ES de 15/10/2026, em `public/docs/`) e que o novo manual precisa citar. A base de comparação é o commit `f4a0361` (que adicionou o manual) até o estado atual da árvore de trabalho. Nenhum commit ou executável foi gerado.

**Fontes e confiança**
- Itens sem marca: documentados nos relatórios em `docs/`, que registram testes passando.
- Itens com **†**: existem só no código **ainda não commitado** e não têm relatório. Li o código e os textos PT/ES, mas **não rodei a interface**. Vale conferir na tela antes de escrever.

**Legenda:** **NOVO** (não existe no manual) · **MUDOU** (contradiz o manual atual) · **LACUNA** (já existia, o manual nunca descreveu).

---

## 0. Antes de escrever

- [ ] **Capas divergentes.** O manual PT não tem capa e usa o subtítulo "Fancy and Organized UX". O ES tem capa com aluno, tutor, cotutor e IFSul, e o subtítulo "Software de Estilización Básica de Pantallas". Padronize os dois.
- [ ] **Refazer as capturas "Menu Estilos / Layout / Eventos".** A barra lateral mudou: seções novas, rótulos renomeados, selos e diagrama (ver seção 3).
- [ ] **Versão do app:** 0.0.4 (README e `package.json`). Cite no manual se quiser.

## 1. Conhecendo o FOUX (visão geral, instalação, aparência)

- [ ] **MUDOU — aplicativo desktop.** O manual só fala em "navegador". Existe o aplicativo Windows x64, instalado por `FOUX-Setup-0.0.4.exe`.
  - O instalador permite escolher a pasta de instalação.
  - Cria atalhos na Área de Trabalho e no Menu Iniciar, com o nome "FOUX" †.
  - Usa o ícone novo †.
  - Sem atualização automática: para atualizar, feche o FOUX e rode o novo instalador na mesma conta e pasta.
  - O instalador não é assinado (README). O Windows pode exibir um aviso de segurança na instalação; isso é inferência minha, confirme.
  - O manual PDF abre no leitor de PDF padrão do sistema.
- [ ] **NOVO † — logo do FOUX** (raposa + nome) no lugar do texto "FOUX" nos cabeçalhos do painel e do editor. Clicar nele leva ao painel inicial; dica: "Ir para a Dashboard" ("Ir al Dashboard"). O favicon também foi trocado †.
- [ ] **NOVO — quatro temas, redesenhados.** Dark (padrão), Light, Solarized Waves e o tema de vidro.
  - **Atenção ao nome:** em Configurações, o Liquid Glass agora aparece como **"Debug mode"** (PT e ES). Confirme se é intencional antes de citar.
  - O tema de vidro tem refração nas bordas e paleta monocromática. Os outros temas têm vidro discreto.
  - Em todos, uma luz acompanha o cursor nos cards, e o seletor Grade/Lista é uma pílula deslizante.
  - Respeita as preferências do sistema: movimento reduzido, transparência reduzida e alto contraste.
- [ ] **NOVO — acessibilidade e teclado** (um parágrafo geral basta):
  - Enter/Espaço ativam cards e botões.
  - Menus de contexto navegam com setas, Home e End.
  - O foco fica contido nos modais e volta ao botão de origem.
  - Esc fecha modais e menus.
  - Confirmações destrutivas abrem com o foco em "Cancelar".
- [ ] **NOVO — dicas (tooltips) em todos os botões.** Aparecem com atraso ao passar o mouse e na hora ao navegar por Tab. Os atalhos de Desfazer/Refazer aparecem nelas.
- [ ] **NOVO — notificações (toasts).** Ficam de 4 a 8 s, pausam com mouse/foco, têm botão de fechar, não repetem mensagens iguais e mostram no máximo três.

## 2. Criando e organizando projetos (painel)

- [ ] **NOVO † — modo Seleção e ações em lote.**
  - **Onde:** botão "Selecionar" ("Seleccionar"), ao lado de Grade/Lista. Vira "Concluir seleção" ("Finalizar selección") enquanto ativo. Fica desabilitado se não há nada para selecionar.
  - **Como:** cada card ou linha ganha uma caixa de marcação; clique, Enter ou Espaço marcam. Esc cancela a seleção. O botão direito fica desativado nesse modo, e o card "Novo projeto" some.
  - **Regra:** projetos e pastas **não se misturam**. Ao marcar um tipo, o outro fica bloqueado, com a dica "Limpe a seleção de projetos para selecionar pastas" (e o inverso).
  - **Barra de ações, com projetos:** Favoritar/Desfavoritar, Duplicar, "Mover para pasta" (dentro de uma pasta, inclui "Dashboard (sem pasta)") e Excluir.
  - **Barra de ações, com pastas:** Mudar cor, Favoritar/Desfavoritar e Excluir.
  - **Exclusão em lote:** pede confirmação. Ao excluir pastas, os projetos voltam ao painel.
  - **Histórico:** cada item gera uma entrada em "Atividade Recente".
- [ ] **MUDOU † — tela de uma pasta.** O manual descreve só "a seta de voltar". Agora há um cabeçalho da pasta com:
  - botão "Voltar à Dashboard" e caminho (breadcrumb) "Dashboard › Nome da pasta";
  - nome da pasta editável direto: clique, Enter salva, Esc cancela;
  - bolinha para trocar a cor da pasta;
  - contador ("1 projeto nesta pasta", "Nenhum projeto nesta pasta");
  - botão "Adicionar projetos existentes".
- [ ] **NOVO † — Adicionar projetos existentes.** Abre uma janela com os projetos soltos no painel.
  - Há filtro por nome (aparece com mais de 6 projetos), "Selecionar todos"/"Limpar seleção" e contador.
  - Confirma em "Adicionar à pasta" ou "Adicionar N projetos".
  - Pasta vazia mostra "Esta pasta ainda está vazia", com os botões "Novo Projeto" e "Adicionar projetos existentes".
- [ ] **MUDOU † — Nova Pasta.** O manual diz "nome, cor, Criar Pasta". Agora também há o campo opcional **"Incluir projetos existentes"**. A lista inclui projetos que já estão em outras pastas, com o nome da pasta atual ao lado; incluí-los move o projeto.
- [ ] **MUDOU † — cores de pasta.** A paleta é a mesma em todos os lugares (modal, menu da pasta, tela da pasta e ações em lote): 8 cores — Dourado, Vermelho, Verde, Azul, Roxo, Rosa, Ciano, Laranja. Antes, o menu de contexto tinha só 6.
- [ ] **NOVO † — contexto de pasta.**
  - "Novo Projeto" e o Tutorial, quando criados com uma pasta aberta, nascem **dentro dela**.
  - A seta de voltar do editor reabre a pasta em que você estava; o logo volta ao painel (raiz).
- [ ] **NOVO — Tutorial por idioma.** O projeto Tutorial é criado no idioma ativo (PT ou ES). Trocar o idioma traduz os textos do tutorial e preserva os estilos que você já editou. O Tutorial continua reconhecido mesmo se renomeado.
- [ ] **MUDOU — Atividade Recente** guarda no máximo **100** registros.

## 3. Editando uma página HTML

**Cabeçalho do editor**
- [ ] **MUDOU — balões de dica → Tour guiado.** O manual manda "ocultar balões de dica". Esse botão não existe mais. No lugar há **"Tour guiado"**, só no projeto Tutorial.
  - **Etapas (8):** barra lateral, aba Estilos, Tipografia, Bordas e formas, Espaçamentos, Fundos e cores, Eventos `:hover` e Inspeção de layout.
  - **Abertura e fechamento:** abre sozinho na primeira visita. Concluir, pular, fechar ou Esc impedem a abertura automática; o botão reinicia quando quiser.
  - **Botões:** "Anterior", "Próximo", "Concluir" e "Pular tutorial / Não mostrar novamente".
- [ ] **NOVO † — "Limpar tela".** Botão no lado direito do cabeçalho, antes do botão de tela cheia.
  - Remove as estilizações da página inteira: estilos inline, borda em degradê, regras `:hover` e fontes importadas.
  - Pede confirmação ("Limpar a tela?").
  - É um único passo de histórico, então Ctrl+Z restaura tudo.
  - Se não houver nada a limpar: "Não há estilizações para limpar."
  - **Não confundir com "Restaurar" (abaixo):** "Limpar tela" age na página toda; "Restaurar" age só no elemento selecionado.
- [ ] **NOVO — Desfazer/Refazer com descrição.** A dica mostra qual alteração será desfeita, com os valores e o elemento. Exemplo: "Desfazer: Cor do texto (#000000 → #2563eb) — h3#titulo-exercicio".
  - Um arraste contínuo (slider, seletor de cor) conta como **um** passo.
  - O histórico guarda até **50** passos.
- [ ] **NOVO — Modo Desafios** (ver seção 7).

**Barra lateral**
- [ ] **NOVO — nome oficial da propriedade + dica.** Cada controle mostra uma etiqueta com o nome CSS (`border-radius`, `padding`, `box-shadow`…) e um ícone "i" com uma dica de uma linha. Vale nas abas Estilos, Layout e Eventos.
- [ ] **NOVO — Box Model.** Na seção **Espaçamentos**, além dos campos "Espaçamento interno" e "Espaçamento externo", há um diagrama com os 4 lados de `margin` (laranja) e `padding` (verde) e o tamanho do conteúdo.
  - Passar o mouse ou focar um campo pinta a área correspondente sobre o elemento no canvas.
  - O ícone de corrente alterna entre "Vincular os 4 lados" e "Editar cada lado separadamente".
  - Quando os lados diferem, o campo de atalho mostra "vários".
- [ ] **NOVO — Restaurar elemento.** Botão "Restaurar" na faixa do elemento selecionado. Devolve o elemento ao estilo do arquivo original e remove o degradê de borda e as regras `:hover` dele. É um passo de histórico. Se já estiver original: "Este elemento já está com o estilo original."
- [ ] **NOVO — selo de contraste (WCAG).** Aparece abaixo de "Cor do Texto" e "Cor de Fundo" e também na aba Layout. Mostra a razão (por exemplo, `4.8:1`) e o nível:
  - **AAA/AA:** verde, leitura confortável.
  - **"só texto grande":** amarelo, serve para texto de 24 px ou 18,7 px em negrito.
  - **"Baixo contraste":** vermelho.
- [ ] **MUDOU — seções e rótulos renomeados** (atualize os textos e as capturas):

| Antes (PT) | Agora (PT) | Agora (ES) |
|---|---|---|
| Padding (px) | Espaçamento interno | Espaciado interno |
| Margin (px) | Espaçamento externo | Espaciado externo |
| Arredondamento (Radius) | Arredondamento | Esquinas redondeadas |
| ESPAÇAMENTO E FUNDO | seções **Espaçamentos** e **Fundos e cores** | Espaciado / Fondos y colores |

- [ ] **LACUNA — recursos que já existiam e o manual não cita.** O texto atual fala só em "fonte, tamanho, alinhamento, cor, bordas, arredondamento, espaçamentos e fundo". Faltam:
  - gradiente de fundo (duas cores, ângulo, opacidade);
  - borda em degradê;
  - sombra (deslocamento, desfoque, opacidade);
  - posição da imagem à esquerda ou à direita (float);
  - fonte "Padrão do navegador" e **importar fonte local**, que fica na lista "Fontes importadas";
  - nos Eventos, a escala no `:hover`.
- [ ] **NOVO — erro ao abrir HTML inválido.** Mensagem: "Não foi possível abrir o arquivo. Selecione um HTML válido e não vazio."

## 4. Salvamento e exportação

- [ ] **MUDOU — onde os dados ficam.** O manual diz "armazenamento local do navegador". Descreva os dois casos:
  - **App desktop:** arquivo `foux-data.json` na pasta de dados do aplicativo, com cópia de segurança `.bak`. O armazenamento é separado do navegador. Na primeira abertura, migra o que existir na versão anterior.
  - **Ao fechar a janela:** o FOUX espera concluir as edições pendentes e gravar. Se a gravação falhar, a janela permanece aberta e informa o erro.
  - **Navegador (modo web):** continua em `localStorage`.
- [ ] **NOVO — limites que o usuário pode notar:**
  - histórico de edição: 50 passos;
  - atividades: 100 registros;
  - foto de perfil: reduzida para 256 px (WebP) ao ser escolhida.
- [ ] **Sem mudança:** "Exportar CSS" continua baixando só o CSS, não o projeto nem o HTML.

## 5. Configurações e perfil

- [ ] **MUDOU — seção Tutorial.** O manual fala em "ativar ou desativar as dicas do Tutorial". Agora é **"Exibir tour guiado automaticamente"** ("Mostrar tour guiado automáticamente"), mais um botão para **reiniciar o tutorial**. Ao reiniciar: "Tutorial reiniciado. Abra o projeto TUTORIAL para começar."
- [ ] **MUDOU — temas disponíveis** (ver "Debug mode" na seção 1).
- [ ] **NOVO — card "Melhor Tempo (Modo Desafios)" no Perfil**, abaixo de "Estatísticas da Conta" (ver seção 7).
- [ ] **NOVO — foto de perfil:** arquivo que não é imagem mostra "Selecione um arquivo de imagem válido."
- [ ] **Conferir — "Limpar cache local".** O comportamento (apaga projetos, pastas, atividades e projeto ativo; mantém tema, idioma e perfil) bate com o manual. Mas o texto da janela de confirmação diz "Todos os projetos salvos, pastas e **preferências** serão apagados". O código **não** apaga preferências. Também não apaga o recorde do Modo Desafios. Corrija o texto ou o manual.

## 6. Ajuda e limitações

- [ ] **MUDOU — o FAQ** continua com 6 perguntas e **nenhuma** sobre Tour guiado, Modo Desafios, seleção em lote ou Limpar tela. O manual deve cobrir o que o FAQ não cobre.
- [ ] **Conferir fora do manual:** a resposta do FAQ sobre salvamento diz "salva … neste navegador". Isso está desatualizado para o app desktop.
- [ ] **Limitação a manter:** o HTML importado roda sem JavaScript; links e formulários não navegam nem enviam. O README confirma que o JavaScript do HTML importado não é executado.

## 7. Capítulo novo sugerido: recursos de aprendizado

- [ ] **Modo Desafios** ("Modo Desafíos").
  - **Onde:** botão com troféu, ao lado de "Tour guiado". Só aparece no projeto Tutorial.
  - **Rodada:** 8 desafios sorteados, um por categoria — Cor e fundo, Degradê, Tipografia, Box model, Bordas, Sombra, Estado `:hover` e Layout e alinhamento. Vêm de um banco de 24.
  - **Painel:** flutuante (arrastável e recolhível), com cronômetro, progresso ("0 / 8 concluídos") e o enunciado.
  - **Validação:** automática. Ao acertar, aparece um check verde e entra o próximo.
  - **Tolerância:** cores aceitas por faixa de matiz ("um tom de azul"); números por mínimo ("32px ou mais"); ângulo do degradê com ±5°.
  - **Botões:** "Destacar alvo", "Pular" (vai para o fim da fila, ainda precisa ser feito) e "Desistir" (encerra sem salvar).
  - **Vitória:** janela "Desafio concluído com sucesso!", tempo total, selo "Novo recorde!", fecha sozinha em 30 s ou em "Concluir".
  - **Regras de salvamento:** o tempo só é salvo com os 8 concluídos. Desafios que o Tutorial já cumpre não são sorteados; para jogar de novo, restaure os elementos ou crie outro Tutorial. Se não restar desafio, aparece um aviso.
- [ ] **Melhor tempo no Perfil.**
  - **Conteúdo:** melhor tempo, data do recorde e número de conclusões.
  - **Histórico:** clique no card para ver data/hora e tempo de cada rodada, com o selo "Recorde". O FOUX guarda as últimas 50 conclusões.
- [ ] **Tour guiado:** descrito na seção 3. Considere juntar os dois recursos em um único capítulo.

---

## Resumo por prioridade

| Prioridade | Itens |
|---|---|
| **Corrigir texto que ficou errado** | Balões de dica → Tour guiado · "navegador" → desktop/web · seção Tutorial das Configurações · rótulos renomeados · "seta de voltar" da pasta · Nova Pasta |
| **Funcionalidades novas de peso** | Modo Desafios · Tour guiado · Seleção e ações em lote · Tela da pasta e "Adicionar projetos existentes" · Limpar tela · Box Model · Restaurar · Selo de contraste · Histórico legível |
| **Recursos que já existiam e faltam** | Degradê de fundo e de borda · sombra · float de imagem · fontes importadas |
| **Atualizar** | Capas PT/ES · capturas dos menus Estilos, Layout e Eventos · capturas do painel e da tela da pasta |

## Pontos para você decidir

1. O nome **"Debug mode"** para o tema de vidro é definitivo? Ele aparece nos dois idiomas e no README.
2. Os itens com **†** (seleção em lote, tela da pasta, Limpar tela, logo, atalhos do instalador) ainda não foram commitados. O manual vai descrever uma versão que ainda precisa ser fechada.
3. O texto de confirmação de "Limpar cache local" e a resposta do FAQ sobre salvamento ficam inconsistentes com o app. Corrigir antes de publicar o manual evita contradição.
