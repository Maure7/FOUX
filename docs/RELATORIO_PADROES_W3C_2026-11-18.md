# Tecnologias e conformidade com os padrões W3C — 18/11/2026

Escopo: as tecnologias do FOUX e a especificação W3C (ou WHATWG) que cada uma segue; onde cada padrão aparece no código; o que foi feito, nesta rodada e antes dela, para cumprir esses padrões; como isso foi verificado; e o que ainda falta. Este relatório acompanha o commit da branch `feat/padroes-w3c-acessibilidade`.

---

## 1. Resumo

- O FOUX é uma aplicação web (React + Vite) empacotada como programa desktop pelo Electron, que usa o Chromium. Tudo o que o usuário vê é HTML, CSS, SVG e DOM padrão. Não há tecnologia proprietária de interface.
- Os padrões W3C entram no projeto de duas formas:
  1. **Na interface do FOUX:** HTML semântico, WAI-ARIA, WCAG 2.2 (teclado, foco visível, contraste, movimento reduzido, idioma da página) e CSS padrão.
  2. **No que o FOUX ensina e gera:** o aluno edita CSS pelos nomes oficiais das propriedades, recebe um selo de contraste WCAG em tempo real e exporta um `.css` produzido pela serialização do CSSOM do navegador.
- **Status da verificação:** lint, 31 testes unitários, build de produção e 9 suítes E2E no Chromium passaram em 18/11/2026 (seção 6). Nem o HTML nem o CSS exportado passaram ainda pelos validadores oficiais do W3C (Nu HTML Checker e CSS Validator). Esse é o principal item pendente (seção 7).

> **Nota sobre W3C e WHATWG.** Desde o acordo de 2019, HTML e DOM são mantidos pelo WHATWG como "Living Standards", e o W3C publica e endossa versões estáveis deles. CSS, WAI-ARIA, WCAG, SVG, CSP, Pointer Events, File API, Web Animations e Media Queries são especificações do próprio W3C. Em um texto acadêmico, o certo é escrever "padrões web abertos (W3C/WHATWG)" quando o assunto for HTML ou DOM.

---

## 2. Tecnologias do projeto e a especificação de cada uma

| Tecnologia | Versão | Papel no FOUX | Padrão que segue |
|---|---|---|---|
| HTML | Living Standard | Estrutura da interface (`index.html`, JSX renderizado) e documento do aluno no iframe | WHATWG HTML (endossado pelo W3C) |
| CSS | Módulos CSS3+ | Temas, layout e tudo o que o aluno edita e exporta | W3C CSS (Cascade, Selectors 4, Custom Properties, Media Queries 5, Color Adjust, Filter Effects, Backgrounds) |
| JavaScript | ES2023+ | Lógica da interface e do processo principal | ECMA-262 (Ecma International, não W3C) |
| DOM e CSSOM | Living Standard / W3C | Ler e alterar a página do aluno, ler regras e estilos computados | WHATWG DOM; W3C CSSOM e CSSOM View |
| SVG | SVG 1.1 / 2 | Ícones (`lucide-react`), logotipo, filtro de refração do Liquid Glass | W3C SVG; W3C Filter Effects |
| WAI-ARIA | 1.2 | Papéis, estados e propriedades para leitores de tela | W3C WAI-ARIA 1.2 e ARIA Authoring Practices Guide (APG) |
| WCAG | 2.2 | Critérios de acessibilidade seguidos pela interface e pelo selo de contraste | W3C WCAG 2.2 |
| Content Security Policy | Level 3 | Restringe scripts, `<object>` e formulários na janela do app | W3C CSP |
| React | 19 | Gera o DOM da interface a partir de componentes | Não é padrão; produz HTML padrão |
| Vite | 8 | Build e servidor de desenvolvimento; injeta a CSP no build | Não é padrão; emite HTML/CSS/JS padrão |
| Electron | 44 (Chromium) | Janela desktop, disco e diálogos | Não é padrão; o motor (Blink) implementa os padrões acima |
| lucide-react | 1.31 | Ícones SVG inline | Gera SVG padrão |
| ESLint | 10 | Qualidade do JavaScript | Não é padrão |
| Google Fonts (Inter) | — | Tipografia, com fallback local | W3C CSS Fonts (`@font-face`, `font-display: swap`) |

Outras APIs de plataforma usadas, com suas especificações:

| API | Especificação | Onde |
|---|---|---|
| Pointer Events, `setPointerCapture` | W3C Pointer Events | Arraste do HUD, disco de ângulo, redimensionar a sidebar |
| `ResizeObserver` | W3C Resize Observer | Overlays, tour, tooltips |
| `MutationObserver`, `TreeWalker`, `DOMParser`, `Range` | WHATWG DOM / DOM Parsing | Inspetor, tradução do tutorial, conta-gotas |
| `element.getAnimations()` | W3C Web Animations | [styles.js](../src/utils/inspector/styles.js) |
| `FileReader`, `Blob`, `URL.createObjectURL` | W3C File API | Importar HTML e fontes; exportar `.css` |
| `matchMedia` | W3C CSSOM View | Movimento reduzido, `@media` ativas na exportação |
| `CSS.escape`, `CSS.supports` | W3C CSSOM / CSS Conditional | Seletores seguros, detecção de suporte |
| Fullscreen API, `<dialog>`, atributo `inert` | WHATWG Fullscreen / HTML | Prévia em tela cheia, tour modal, regiões fechadas |
| Web Storage | WHATWG HTML | Persistência da versão web |

---

## 3. Onde cada padrão aparece no código

### 3.1 HTML: estrutura e semântica

| O que | Onde | Para que serve |
|---|---|---|
| `<!doctype html>`, `<html lang>`, `<meta charset="UTF-8">`, `<meta name="viewport">`, `<meta name="description">`, `<title>` | [index.html](../index.html) | Documento HTML5 válido, em modo padrão (sem *quirks*) |
| Idioma da página sincronizado com o idioma da interface (`pt-BR` ou `es-419`) | [LanguageContext.jsx:50-57](../src/context/LanguageContext.jsx#L50-L57) | WCAG 3.1.1: leitores de tela usam a pronúncia correta |
| Idioma do documento do tutorial atualizado ao traduzir | [tutorialI18n.js:77](../src/utils/tutorialI18n.js#L77) | O documento do aluno declara o idioma do próprio conteúdo |
| Regiões semânticas: `<header>`, `<main>`, `<nav>`, `<aside>`, `<section>` | [Header.jsx](../src/components/dashboard/Header.jsx), [Dashboard.jsx:337](../src/pages/Dashboard.jsx#L337), [SidebarEstilos.jsx:79](../src/components/editor/SidebarEstilos.jsx#L79), [FolderBanner.jsx:83-93](../src/components/dashboard/FolderBanner.jsx#L83-L93), [Profile.jsx:74-87](../src/pages/Profile.jsx#L74-L87) | Pontos de referência (*landmarks*) para navegação assistiva |
| `<label for>` ligado ao campo | Modais de projeto, pasta e renomear; [Profile.jsx](../src/pages/Profile.jsx); [Settings.jsx](../src/pages/Settings.jsx) | Todo campo tem nome acessível (WCAG 1.3.1 e 4.1.2) |
| `<dialog>` nativo com `showModal()` | [TutorialTour.jsx:20](../src/components/editor/TutorialTour.jsx#L20) | Modal com foco preso e camada de topo nativos |
| Atributo `inert` em modais fechados e acordeões recolhidos | [CollapsibleSection.jsx:37](../src/components/editor/controls/CollapsibleSection.jsx#L37), [ModalConfirm.jsx:46](../src/components/ui/ModalConfirm.jsx#L46) e demais modais | Conteúdo oculto não recebe foco nem é lido |
| `<button type="button">` nativo para ações | Todo o projeto | Botão real, com teclado e semântica nativos |
| Documento do aluno serializado com `<!DOCTYPE html>` | [useIframeInspector.js:144](../src/hooks/useIframeInspector.js#L144), [EditorCanvas.jsx:26](../src/components/editor/EditorCanvas.jsx#L26) | O HTML salvo continua um documento HTML5 completo |
| `iframe` com `sandbox="allow-same-origin"`, sem `allow-scripts` | [EditorCanvas.jsx](../src/components/editor/EditorCanvas.jsx) | Isola a página do aluno usando o mecanismo padrão de *sandbox* do HTML |

### 3.2 WAI-ARIA 1.2 e padrões do APG

Contagem em `src/`: 219 atributos `aria-*` e 55 atributos `role`.

| Padrão APG | Implementação | Onde |
|---|---|---|
| Dialog (modal) | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` | [ModalNovoProjeto.jsx:45](../src/components/dashboard/ModalNovoProjeto.jsx#L45), [ModalNovaPasta.jsx:67](../src/components/dashboard/ModalNovaPasta.jsx#L67), [ModalAdicionarProjetos.jsx:41](../src/components/dashboard/ModalAdicionarProjetos.jsx#L41), [ChallengeVictory.jsx:35](../src/components/editor/challenges/ChallengeVictory.jsx#L35) |
| Alert dialog | `role="alertdialog"` na confirmação destrutiva | [ModalConfirm.jsx:51](../src/components/ui/ModalConfirm.jsx#L51) |
| Prender o foco no modal | Tab e Shift+Tab circulam dentro do modal | [useModal.js:40](../src/hooks/useModal.js#L40) |
| Menu e menu button | `role="menu"`/`menuitem`, `aria-haspopup="menu"`, setas ↑/↓, Home e End | [ContextMenu.jsx:69-94](../src/components/dashboard/ContextMenu.jsx#L69-L94), [useFloatingMenu.js:48-53](../src/hooks/useFloatingMenu.js#L48-L53), [BatchActionBar.jsx:35-64](../src/components/dashboard/BatchActionBar.jsx#L35-L64) |
| Disclosure (acordeão) | `aria-expanded` + `aria-controls` | [CollapsibleSection.jsx:26-27](../src/components/editor/controls/CollapsibleSection.jsx#L26-L27), [ChallengeRecordCard.jsx:18-19](../src/components/profile/ChallengeRecordCard.jsx#L18-L19), [AtividadeRecente.jsx:149](../src/components/dashboard/AtividadeRecente.jsx#L149) |
| Toggle button | `aria-pressed` (grade/lista, seleção, conta-gotas, cores recentes) | [Dashboard.jsx](../src/pages/Dashboard.jsx), [RecentColors.jsx](../src/components/editor/controls/RecentColors.jsx) |
| Slider | `role="slider"` + `aria-valuenow`/`min`/`max` | [GradientAngleDisc.jsx:36-41](../src/components/editor/controls/GradientAngleDisc.jsx#L36-L41) |
| Tooltip | `role="tooltip"` + `aria-describedby`, preservando descrições já existentes | [Tooltip.jsx:59-120](../src/components/ui/Tooltip.jsx#L59-L120) |
| Toolbar | `role="toolbar"` com `aria-label` | [BatchActionBar.jsx:104](../src/components/dashboard/BatchActionBar.jsx#L104) |
| Breadcrumb | `<nav aria-label>` | [FolderBanner.jsx:93](../src/components/dashboard/FolderBanner.jsx#L93) |
| Live regions | `aria-live="polite"`, `role="status"` e região de notificações | [ToastNotification.jsx:87](../src/components/ui/ToastNotification.jsx#L87), [TutorialTour.jsx:84-87](../src/components/editor/TutorialTour.jsx#L84-L87), [ChallengeHud.jsx:100-119](../src/components/editor/challenges/ChallengeHud.jsx#L100-L119), [App.jsx:325](../src/App.jsx#L325) |
| Progressbar e timer | `role="progressbar"` + `aria-valuetext`; `role="timer"` | [ChallengeHud.jsx:66-88](../src/components/editor/challenges/ChallengeHud.jsx#L66-L88) |
| Imagem descrita | `role="img"` + `aria-label` no diagrama do Box Model | [BoxModelEditor.jsx:109](../src/components/editor/controls/BoxModelEditor.jsx#L109) |
| Ícones decorativos | `aria-hidden="true"`; botões só com ícone recebem `aria-label` | Todo o projeto |

### 3.3 WCAG 2.2: critérios atendidos e onde

| Critério WCAG | Como é atendido | Onde |
|---|---|---|
| 1.4.3 Contraste (mínimo), 1.4.6 (aprimorado) | Os temas foram auditados com contraste de 4,5:1 ou mais em textos; o editor mostra um selo AA/AAA para o aluno | [contrast.js](../src/utils/css/contrast.js), [ContrastBadge.jsx](../src/components/editor/controls/ContrastBadge.jsx), `test:ui` |
| 1.4.11 Contraste de componentes | Bordas e anel de foco com cor própria por tema (`--focus-ring`) | `src/styles/themes/*.css` |
| 2.1.1 Teclado | Superfícies clicáveis ativam com Enter/Espaço; menus usam setas | [keyboard.js](../src/utils/keyboard.js), [useFloatingMenu.js](../src/hooks/useFloatingMenu.js) |
| 2.1.2 Sem armadilha de teclado | Esc fecha modais, menus e conta-gotas; o foco volta ao elemento de origem | [useModal.js](../src/hooks/useModal.js), `test:editor` |
| 2.4.3 Ordem do foco | Foco preso em modais; `inert` em conteúdo oculto | Seção 3.1 |
| 2.4.7 e 2.4.11 Foco visível | `:focus-visible` em 35 regras, com anel por tema e cores próprias no Liquid Glass | [interaction-polish.css:73](../src/styles/interaction-polish.css#L73), [LiquidGlass.css:279](../src/styles/LiquidGlass.css#L279) |
| 2.3.3 Animação por interação | `prefers-reduced-motion: reduce` desliga transições, animações e a rolagem suave; ações pelo teclado são instantâneas | 11 pontos, por exemplo [refinements.css:138](../src/styles/refinements.css#L138), [useModal.js:14](../src/hooks/useModal.js#L14), [Dashboard.jsx:194](../src/pages/Dashboard.jsx#L194) |
| Preferências do sistema | `prefers-reduced-transparency` deixa as superfícies sólidas; `prefers-contrast: more` reforça bordas | [glass.css:265-279](../src/styles/glass.css#L265-L279) |
| 2.5.8 Tamanho do alvo | Áreas de clique ampliadas (commit `831baeb` e auditoria de 28/10) | `src/styles/interaction-polish.css` |
| 3.1.1 Idioma da página | `lang` atualizado ao trocar de idioma | [LanguageContext.jsx](../src/context/LanguageContext.jsx) |
| 3.3.2 Rótulos ou instruções | `<label for>` em todos os campos de formulário | Seção 3.1 |
| 4.1.2 Nome, função, valor | ARIA completo nos componentes personalizados | Seção 3.2 |
| 4.1.3 Mensagens de status | Toasts, contadores e progresso em `aria-live` | Seção 3.2 |

**Cálculo de contraste ([contrast.js](../src/utils/css/contrast.js)):** segue a definição de luminância relativa e de razão de contraste do WCAG 2.x, `(L1 + 0,05) / (L2 + 0,05)`. Compõe as camadas com alfa sobre os ancestrais e considera o pior ponto de um degradê. Aplica os limiares de texto normal (AA 4,5; AAA 7) e de texto grande (AA 3; AAA 4,5; texto grande é a partir de 24 px, ou 18,66 px em negrito). A razão é truncada, nunca arredondada para cima. Detalhes no [DOSSIE_TECNICO_TCC.md](DOSSIE_TECNICO_TCC.md), seção 4.1.

### 3.4 CSS padrão (módulos W3C)

| Módulo W3C | Uso no FOUX |
|---|---|
| CSS Custom Properties | 1.388 usos de `var(--…)`; os quatro temas são conjuntos de variáveis sobre `:root[data-theme]` |
| Selectors Level 4 | `:focus-visible`, `:is()`, `:has()`, `:not()`; seletores de atributo para estados ARIA (`[aria-pressed="true"]`, `[aria-expanded]`), de modo que o estilo segue o estado acessível |
| Media Queries Level 5 | `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`, `hover`/`pointer` |
| CSS Color Adjustment | `color-scheme: dark` / `color-scheme: only light` em [base.css:42-72](../src/styles/base.css#L42-L72), para que controles nativos e barras de rolagem sigam o tema |
| CSS Cascade 5 / Conditional 3 | `@layer` e `@supports` preservados na exportação; `CSS.supports` detecta `background-clip: border-area` |
| Filter Effects / Compositing | `backdrop-filter` e filtro SVG (`feDisplacementMap`) no Liquid Glass |
| CSS Fonts 4 | `@font-face` com fontes que o aluno importa; Inter com `display=swap` |
| CSSOM | Leitura de `document.styleSheets`/`cssRules` e escrita via `style.setProperty(prop, valor, 'important')` |

**No que o FOUX ensina:**
- Cada controle mostra o nome oficial da propriedade CSS em fonte monoespaçada (`border-radius`, `padding`, `box-shadow`…), ao lado do nome amigável e de uma dica ([glossary.js](../src/utils/css/glossary.js), [PropertyLabel.jsx](../src/components/editor/controls/PropertyLabel.jsx)).
- O `.css` exportado vem da serialização do CSSOM do navegador ([exportCss.js](../src/utils/exportCss.js), [format.js](../src/utils/css/format.js)), com sintaxe padrão: um seletor por linha, cores opacas em hexadecimal, *shorthands* preservados e `!important` apenas quando a cascata exige. O arquivo é baixado como `text/css;charset=utf-8`.

### 3.5 Segurança por padrão W3C: Content Security Policy

- [vite.config.js:7-19](../vite.config.js#L7-L19) injeta no build de produção a política `default-src 'self'; script-src 'self'; object-src 'none'; form-action 'none'`.
- Estilos, imagens, fontes e mídia continuam liberados, porque o HTML do aluno precisa renderizar.
- Teste: `test_security_desktop.cjs` e `test_build_pipeline.cjs` ("production pages carry a restrictive script policy that still renders the student HTML").

---

## 4. O que foi feito nesta rodada (commit de 18/11/2026)

O commit reúne o trabalho acumulado desde 13/11 (151 arquivos: 113 modificados e 38 novos, incluindo este relatório). Entre as mudanças que dizem respeito aos padrões W3C:

1. **Cards da Dashboard com papel ARIA correto em cada modo** ([ProjectCard.jsx](../src/components/dashboard/ProjectCard.jsx), [FolderCard.jsx](../src/components/dashboard/FolderCard.jsx)):
   - Antes, o card era sempre `role="button"`, mesmo durante a seleção em lote.
   - Agora vira `role="checkbox"` com `aria-checked` no modo de seleção, como recomenda o APG.
   - Card bloqueado recebe `aria-disabled="true"` e `tabIndex=-1`.
   - A caixinha visual de seleção ficou `aria-hidden`, para o estado não ser anunciado duas vezes.
2. **Botão "⋯" visível com `aria-haspopup="menu"`.** O menu de opções, que só abria com o botão direito, agora tem um botão nativo acessível pelo teclado (WCAG 2.1.1).
3. **Toggles com `aria-pressed`:** grade/lista, modo de seleção, conta-gotas e paleta de cores recentes.
4. **Novos componentes já criados com ARIA:**
   - [BatchActionBar.jsx](../src/components/dashboard/BatchActionBar.jsx): `role="toolbar"`, contador em `aria-live` e menu "Mover para" navegável por setas;
   - [FolderBanner.jsx](../src/components/dashboard/FolderBanner.jsx): `<section aria-labelledby>` e breadcrumb em `<nav aria-label>`;
   - [FolderColorPicker.jsx](../src/components/dashboard/FolderColorPicker.jsx): `aria-expanded` + `aria-controls`;
   - [ProjectPicker.jsx](../src/components/dashboard/ProjectPicker.jsx) e [ModalAdicionarProjetos.jsx](../src/components/dashboard/ModalAdicionarProjetos.jsx): diálogo modal rotulado, contador em `aria-live` e `inert` quando fechado;
   - [RecentColors.jsx](../src/components/editor/controls/RecentColors.jsx): `role="group"` rotulado;
   - [FouxLogo.jsx](../src/components/ui/FouxLogo.jsx): SVG com `aria-label`, com as partes decorativas em `aria-hidden`.
5. **Foco visível nos novos estilos:** `:focus-visible` em `dashboard-selection.css`, `editor-actions.css`, `color-tools.css`, `logo.css` e no novo tema [light-comfort.css](../src/styles/themes/light-comfort.css), que também redefine `--focus-ring`.
6. **Movimento reduzido nos novos estilos:** blocos `prefers-reduced-motion: reduce` nos quatro CSS novos. A rolagem ao topo da Dashboard respeita a preferência ([Dashboard.jsx:194](../src/pages/Dashboard.jsx#L194)).
7. **`color-scheme: only light`** no tema claro, que impede o navegador de escurecer automaticamente controles e barras de rolagem ([base.css:72](../src/styles/base.css#L72)).
8. **Content Security Policy de produção**, nova nesta rodada (seção 3.5).
9. **`<meta name="darkreader-lock">`** na interface e no canvas, removido ao salvar. Ele impede que extensões repintem as cores e falseiem o contraste calculado e o HTML gravado ([index.html](../index.html), [EditorCanvas.jsx](../src/components/editor/EditorCanvas.jsx)).
10. **Conta-gotas pelo DOM** ([eyedropper.js](../src/utils/css/eyedropper.js)): lê a cor pelo `getComputedStyle` e pelos pixels das imagens (Canvas 2D com CORS), sem a API `EyeDropper`, que ainda é rascunho do WICG e amostraria a tela inteira.
11. **Testes novos:** `test_ui_audit.mjs` (inclui transparência reduzida), `test_color_tools.mjs`, `test_dark_reader.mjs`, `test_user_html_editing.mjs`, `test_editor_units.mjs`, `test_security_desktop.cjs` e `test_desktop_source.mjs`.

**O que já existia antes desta rodada** (commits até `9708495`): `lang` dinâmico, diálogos ARIA, foco preso, `inert`, tooltips com `aria-describedby`, selo de contraste WCAG, nomes oficiais das propriedades CSS, `:focus-visible` nos temas e a auditoria de interface de 28/10 ([AUDITORIA_INTERFACE_2026-10-28.md](AUDITORIA_INTERFACE_2026-10-28.md)).

---

## 5. Como a conformidade é garantida no dia a dia

- **Componentes nativos primeiro** (primeira regra de uso do ARIA): `<button>`, `<label>`, `<dialog>` e `<select>` vêm antes de qualquer `role`. O ARIA entra só em componentes sem equivalente nativo (card selecionável, disco de ângulo, menu flutuante).
- **Estilo amarrado ao estado acessível:** o CSS usa `[aria-pressed="true"]` e `[aria-expanded]` como seletores. Se o atributo ARIA faltar, o visual também quebra, e o erro aparece na hora.
- **Utilitário único de teclado:** [keyboard.js](../src/utils/keyboard.js) dá a todo elemento com papel de botão o comportamento de um botão nativo (Enter e Espaço) e não intercepta ações de botões internos.
- **Testes E2E no Chromium real** (protocolo DevTools) emulam `prefers-reduced-motion` e `prefers-reduced-transparency`, medem contraste nos quatro temas, percorrem os diálogos pelo teclado e testam larguras de 960 e 390 px.
- **CSP verificada no build** pelo teste unitário do pipeline.

---

## 6. Verificação executada em 18/11/2026

| Comando | Resultado |
|---|---|
| `npm run lint` | OK, sem erros |
| `npm run test:unit` | 31 de 31 passaram |
| `npm run build` | OK (Vite, 652 ms) |
| `npm run test:features` | Passou |
| `npm run test:editor` | Passou (tour, foco no modal, temas, viewport estreito, tooltips) |
| `npm run test:ui` | Passou (4 temas × PT/ES: diálogos, contraste, teclado, 960/390 px, movimento reduzido) |
| `npm run test:ui-audit` | Passou (inclui transparência reduzida) |
| `npm run test:i18n` | Passou (estrutura PT/ES idêntica, `lang`, ida e volta de idioma) |
| `npm run test:user-html` | Passou |
| `npm run test:color-tools` | Passou |
| `npm run test:dark-reader` | Passou |
| `npm run test:rc` | **Não executado:** regrava capturas em `release/qa` |
| `npm run test:desktop` | **Não executado:** exige o instalador, cuja geração segue suspensa |

---

## 7. Limitações e pendências

1. **Validadores oficiais do W3C ainda não foram usados.** Nem o HTML da interface, nem o documento do Tutorial, nem o CSS exportado passaram pelo [Nu HTML Checker](https://validator.w3.org/nu/) ou pelo [W3C CSS Validator](https://jigsaw.w3.org/css-validator/). Para afirmar "conformidade W3C" no TCC:
   - validar o `index.html` do build, o HTML do Tutorial e o `.css` exportado do Tutorial;
   - registrar os resultados num anexo.

   Construções recentes (`@layer`, `:has()`, `color-scheme: only light`, `backdrop-filter`) podem gerar avisos no CSS Validator. Isso não é erro de sintaxe: o validador ainda não conhece todos os módulos CSS recentes.
2. **Sem auditoria automática de acessibilidade** (axe-core ou Lighthouse). A cobertura atual vem dos testes próprios. Rodar o axe no Chromium dos testes E2E seria o próximo passo.
3. **Não há link "Pular para o conteúdo"** (WCAG 2.4.1). O `<main id="main-content">` já existe, então basta adicionar o link.
4. **`role="application"` no conta-gotas** ([EyedropperOverlay.jsx:209](../src/components/editor/EyedropperOverlay.jsx#L209)): é aceitável numa camada temporária, controlada pelo ponteiro e fechada com Esc, mas o APG recomenda cautela com esse papel. Vale testar com o NVDA.
5. **Liquid Glass fora de `prefers-reduced-transparency`**, por decisão de projeto: o tema é a própria transparência.
6. **O selo de contraste ignora** imagens de fundo (`url()`) e `text-shadow`.
7. **Especificidade na exportação** é calculada por heurística e não cobre todo o Selectors Level 4 (`:is()`, `:where()`).
8. **Testes com leitor de tela real** (NVDA, Narrador do Windows) ainda não foram feitos. A conformidade ARIA foi verificada só pela estrutura do DOM.
