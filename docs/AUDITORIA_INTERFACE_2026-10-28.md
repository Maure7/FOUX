# Auditoria e refinamento da interface — 28/10/2026

Escopo: dashboard, grade/lista, pastas, editor, configurações, perfil, ajuda, modais, menus, tour, tooltips e notificações. Cobertura dos temas Dark, Light, Solarized Waves e Liquid Glass em português e espanhol. A organização das telas foi preservada.

Referência: [skills de Emil Kowalski](https://github.com/emilkowalski/skills/blob/main/README.md), especialmente `emil-design-eng`, `improve-animations`, `animate` e `animation-performance`. A auditoria orientou a implementação solicitada, sem instalar dependências de animação.

| Tela / área | Antes | Depois | Por que mudou | Código principal |
| --- | --- | --- | --- | --- |
| Interface inteira | Transições `all`, curvas repetidas e propriedades de layout interpoladas sem necessidade | Receita compartilhada com propriedades explícitas; pressão de 120 ms, feedback de 160 ms, entrada de 220 ms e saída de 140 ms | Resposta previsível e menor trabalho de layout durante interações | `src/styles/base.css`, `src/styles/themes/{dark,light,solarized}.css`, `src/styles/interaction-polish.css` |
| Dashboard / cards | Pastas tinham preenchimento diferente de projetos; títulos longos podiam alargar a grade do Liquid Glass | Previews e informações alinhados; itens com largura mínima controlada e títulos contidos | Consistência visual sem deslocar ações ou ultrapassar a janela | `src/styles/interaction-polish.css`, `src/styles/dashboard-layout.css` |
| Busca e histórico | Busca aumentava de largura no foco; linhas do histórico mudavam de preenchimento no hover; confirmação pulsava indefinidamente | Busca estável; histórico sem deslocamento; confirmação destrutiva estática e legível | Evitar que o alvo se mova durante leitura ou clique | `src/styles/dashboard-layout.css`, `src/styles/shared.css` |
| Grade / lista e botões personalizados | Estado de visualização apenas visual; Enter em “Opções” podia também abrir o projeto; Espaço não ativava alguns controles | `aria-pressed`, ativação por Enter/Espaço e proteção contra eventos de botões filhos; ações visíveis ao foco e no toque | Navegação por teclado previsível e descoberta das ações | `src/utils/keyboard.js`, componentes de dashboard, `src/pages/Dashboard.jsx`, `src/components/editor/EditableProjectName.jsx` |
| Modais de projeto, pasta, renomear, confirmação e ajuda | Entrada com keyframes, fechamento abrupto, foco livre para escapar e bloqueio de rolagem duplicado | Entrada/saída com transições, foco contido, retorno ao acionador, Escape e rolagem administrados; confirmação inicia em Cancelar | Contexto preservado e menor chance de ativar uma exclusão por engano | `src/hooks/useModal.js`, `src/components/ui/{ModalConfirm,ModalRenomear,FaqModal}.jsx`, `src/components/dashboard/Modal{NovoProjeto,NovaPasta}.jsx` |
| Menus e submenus | Posição calculada com altura estimada; destinos longos podiam sair da janela | Medição real, origem junto ao acionador, ajuste às bordas, submenu lateral ou abaixo da ação e navegação com setas/Home/End | Manter todas as ações alcançáveis | `src/hooks/useFloatingMenu.js`, `src/components/dashboard/{ContextMenu,FolderContextMenu}.jsx`, `src/pages/Dashboard.jsx` |
| Editor | Checkbox marcado quase invisível no tema claro; ícone do accordion trocado abruptamente; barra apertada em janelas pequenas | Contraste de seleção corrigido; mesmo chevron indica abertura/fechamento; barra organizada em duas linhas em larguras pequenas e painel contido | Estado legível e controles acessíveis sem alterar a estrutura do editor | `src/styles/interaction-polish.css`, `src/components/editor/controls/CollapsibleSection.jsx`, `src/styles/editor.css` |
| Configurações | Switches escondidos com `display:none`; instruções e ação destrutiva de baixo contraste no Solarized | Switches alcançáveis com Tab/Espaço, anel de foco e cores semânticas legíveis | Preferências utilizáveis por teclado e leitura mais clara | `src/styles/interaction-polish.css`, `src/styles/themes/solarized.css` |
| Perfil | Botão branco sobre laranja com contraste insuficiente; campos usavam variável de fundo inexistente; nome longo podia escapar do card | Botão e avatar acompanham o tema; fundos válidos; nome quebra dentro do card; números alinhados | Harmonia de cores e resistência a dados reais | `src/styles/profile.css`, `src/pages/Profile.jsx`, `src/services/workspaceData.js` |
| Tooltips | Cada dica repetia o atraso e a animação | Atraso inicial preservado; dicas vizinhas aparecem imediatamente durante uma janela de 400 ms; foco de teclado continua imediato | Exploração mais rápida da barra de ferramentas | `src/components/ui/Tooltip.jsx`, `src/styles/Tooltip.css` |
| Notificações | Desapareciam após cerca de 3 s; sem fechamento manual, pausa de leitura ou controle de repetição | Duração de 4–8 s, pausa no foco/hover/janela oculta, botão de fechar, deduplicação e limite de três mensagens | Dar tempo de leitura e evitar sobreposição de mensagens repetidas | `src/components/ui/ToastNotification.jsx`, `src/App.jsx` |
| Idiomas e acessibilidade | Nome padrão/erro do perfil em português no espanhol; título do iframe em inglês; paleta sem estado acessível | Novas mensagens PT/ES, nome padrão localizado, título do preview traduzido, paleta com seleção e busca com nome acessível | Coerência de idioma também para leitores de tela | `src/locales/{pt,es}.json`, `src/pages/Profile.jsx`, `src/components/editor/EditorCanvas.jsx`, `src/components/dashboard/{Header,ModalNovaPasta}.jsx` |
| Movimento reduzido e teclado | Ausência de política comum; botões e painéis se deslocavam em hovers frequentes | Preferência de movimento reduzido mantém cores/fades suaves e remove deslocamentos; ações de teclado da aplicação usam transições imediatas | Respeitar preferência de movimento e frequência de uso | `src/hooks/useInputModality.js`, `src/styles/interaction-polish.css`, `src/App.jsx` |

## Verificação

`npm run test:ui` foi adicionado à suíte `npm test`. A nova verificação usa Chromium e o protocolo DevTools já utilizados pelo projeto, sem dependências novas.

| Cobertura | O que foi verificado |
| --- | --- |
| 8 combinações de tema/idioma | Dashboard, lista, ajuda, configurações, perfil, editor, menus e modais |
| 1280, 960 e 390 px | Limites de cabeçalhos, painel lateral, canvas, nomes extensos, cards, menus e diálogos |
| Teclado | Tab/Shift+Tab em modais, Escape, Espaço nos switches, Enter em Opções sem abrir projeto, retorno do foco e acesso às ações |
| Feedback | Pausa de toast enquanto focado, fechamento manual, deduplicação e tooltips vizinhos imediatos |
| Preferências | Movimento reduzido e ausência de transição na ativação por teclado |
| Regressões existentes | Edição, CSS exportado, undo/redo, fullscreen, persistência, migração/localização do tutorial, manuais e 16 combinações visuais do editor |

Contrastes calculados em amostras renderizadas, iguais em PT e ES:

| Tema | Busca / placeholder | Texto da ajuda | Instrução nas configurações | Salvar perfil |
| --- | --- | --- | --- | --- |
| Dark | 5,54:1 | 5,77:1 | 6,13:1 | 8,72:1 |
| Light | 4,83:1 | 5,84:1 | 5,84:1 | 19,80:1 |
| Solarized | 5,68:1 | 5,02:1 | 5,68:1 | 4,61:1 |
| Liquid Glass | 5,18:1 | 5,84:1 | 6,93:1 | 12,68:1 |

As amostras acima atingem pelo menos 4,5:1. Isso não representa certificação integral de acessibilidade. Para o Liquid Glass, o teste compõe as cores translúcidas sobre uma base conservadora; imagens e blur podem mudar o contraste percebido.

Capturas por tela, tema, idioma e largura, junto de `results.json`, ficam em `%TEMP%/foux-design-audit`. A validação automática foi executada em Chromium no Windows; o julgamento final da sensação do movimento fica para a revisão visual do usuário.

Comandos: `npm test`, `npm run build` e `git diff --check`.

Alterações mantidas localmente para revisão. Sem commit, publicação, novo release ou alteração da versão do aplicativo.
