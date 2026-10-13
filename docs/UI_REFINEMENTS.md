# Refinamentos da interface FOUX

Os componentes estão integrados ao repositório, sem dependências adicionais.

## Tour guiado

`src/components/TutorialTour.jsx` e `src/styles/TutorialTour.css` substituem os balões simultâneos. As oito etapas ficam em `src/utils/tutorialTour.js`:

1. Barra lateral
2. Aba Estilos
3. Tipografia
4. Bordas e formas
5. Espaçamentos
6. Fundos e cores
7. Eventos :hover
8. Inspeção de layout

O editor aguarda o iframe carregar, seleciona o título de exemplo e mostra um único card. O diálogo modal bloqueia a interação com a página e o iframe. O spotlight acompanha o alvo durante mudanças de tamanho e rolagem; o card permanece dentro da janela.

`SidebarEstilos` recebe `tourStep` para apresentar a aba e a seção explicadas. Os atributos `data-tour` identificam os alvos. As preferências de abas e accordions do usuário são restauradas ao terminar; visitar Eventos durante o tour não grava regras CSS.

Concluir, pular, fechar ou pressionar Esc salva `foux_tutorial_completed=true` e desativa a abertura automática naquele projeto. `foux_global_tutorial_tips` mantém a preferência global existente. O botão **Tour guiado** reinicia manualmente, inclusive quando a abertura automática está desligada. Em **Configurações → Tutorial**, o usuário pode desligar a abertura automática ou reiniciar o tour; reiniciar também limpa a flag de conclusão.

As traduções ficam em `src/locales/pt.json` e `src/locales/es.json`.

## Tooltips globais

`src/components/Tooltip.jsx` e `src/styles/Tooltip.css` oferecem `TooltipProvider` e `Tooltip`. O provider envolve a aplicação em `App.jsx` e usa delegação de eventos para cobrir botões e controles inseridos dinamicamente, sem wrappers que alterem o layout.

- Hover: atraso de 250 ms.
- Foco por teclado: exibição imediata.
- Esc, clique, perda de foco, rolagem e redimensionamento: fecham a dica.
- `role="tooltip"` e `aria-describedby` associam a dica ao controle, preservando descrições existentes.
- As dicas usam `data-tooltip`, o nome acessível ou o texto da ação. Controles numéricos e seletores também reconhecem os labels do painel.
- Atributos `title` existentes são migrados para `data-tooltip` para evitar duas dicas sobrepostas.
- As dicas dentro do tour são renderizadas no próprio diálogo, para permanecerem acima da camada modal.

Para personalizar um controle:

```jsx
<button data-tooltip="Exportar folha CSS">Exportar CSS</button>
```

Ou use o componente para um único elemento React que aceite atributos DOM:

```jsx
<Tooltip content="Configurações">
  <button aria-label="Configurações"><Settings size={16} /></button>
</Tooltip>
```

Ícones sem texto precisam de `aria-label` descritivo. Os atalhos de desfazer e refazer aparecem nas dicas.

## Liquid Glass

`src/styles/LiquidGlass.css` concentra os tokens e as regras do tema, importados em `App.jsx` depois dos estilos base. As antigas regras neon foram removidas de `Dashboard.css`.

Cards e painéis usam superfícies translúcidas, `blur(24px) saturate(190%)`, bordas especulares e raios de 20–24 px. Modais ficam em `rgba(18, 18, 24, .45)`; o scrim escurece e desfoca suavemente a página para conservar os detalhes atrás do vidro. Menus suspensos recebem o mesmo efeito. Botões mantêm preenchimento neutro translúcido, inclusive nas ações de confirmação e exclusão; o estado ativo usa uma borda violeta suave. Campos têm preenchimento leve e a cor de fundo não muda ao receber foco. O preview preserva uma base neutra e os estilos do HTML do estudante. Há fallback mais opaco quando o navegador não suporta blur.

## Validação

```powershell
npm.cmd run build
npm.cmd run lint
node scripts/test_features.mjs
node scripts/test_editor.mjs
```

Para executar apenas a validação de UI no navegador:

```powershell
$env:FOUX_UI_ONLY = '1'
node scripts/test_editor.mjs
```

Os testes de UI verificam as oito etapas, avanço e retorno, spotlight, foco modal, persistência após reabrir e recarregar, reinício, fechamento, tooltips por hover e teclado, contraste do texto nos quatro temas e posicionamento em uma janela estreita. A suíte completa também verifica o editor, exportação CSS, fullscreen e as regressões de estilos existentes.
