# Quadro-resumo de limpeza e polimento

As alterações desta entrega mantêm a estrutura React/Vite/Electron e os fluxos
de projetos, exportação e persistência. A distribuição oficial passa a ser
exclusivamente Windows x64, com instalador NSIS.

| Onde | Inconsistência | O que foi feito |
| --- | --- | --- |
| `package.json` | Scripts e targets geravam pacotes de outros sistemas; o empacotamento em pasta dependia da plataforma do host. | Removidos scripts, targets e metadados específicos fora do escopo. `dist`, `dist:win` e `electron:build` geram NSIS; `electron:pack` fixa Windows x64. |
| `scripts/build-release.cjs` | O comando padrão exigia uma infraestrutura adicional mesmo para distribuir no Windows. | Fluxo sequencial nativo: ícones, Vite, NSIS e verificação. Falhas interrompem a execução antes de declarar sucesso. |
| `scripts/verify-release.cjs` | A validação padrão exigia vários formatos. | Confere somente o instalador Windows da versão atual e escreve seu SHA-256. |
| `build/validate-resources.cjs` | O hook ainda contemplava empacotamento fora do escopo. | Exige Windows e mantém a conferência de HTML, processos Electron, armazenamento, manual e ícones. |
| `build/Dockerfile`, `.dockerignore`, `.gitattributes` | Arquivos e regras dedicados à antiga infraestrutura de distribuição. | Removidos o Dockerfile, seu filtro de contexto e as regras de finais de linha específicas dele e de scripts shell. |
| `.github/workflows/desktop-build.yml` | Runners, matriz e artefatos atendiam múltiplos sistemas. | Todos os jobs usam Windows; empacotamento e anexos são apenas EXE e SHA-256. O script da release usa PowerShell. |
| `electron/main.cjs` | O fechamento ainda tinha uma exceção para outro sistema. | Após a inicialização, encerrar a última janela finaliza o aplicativo, conforme o comportamento Windows. |
| `src/components/SidebarEstilos.jsx` — campos numéricos | Apagar um número restaurava imediatamente o valor anterior; entradas manuais podiam ultrapassar limites dos sliders. | Adicionado um pequeno controle local de texto temporário, usado nos campos numéricos existentes. Permite apagar e redigitar, aplica valores válidos com limites e restaura a apresentação ao sair do campo. |
| `src/components/SidebarEstilos.jsx` — sombras | Valores zero eram trocados por padrões; o parser não reconhecia a cor antes dos deslocamentos na serialização do navegador. | Preservados zeros e leitura independente da posição da cor. Opacidade passa a aceitar 0%. |
| `src/components/SidebarEstilos.jsx` — borda | Alterar a espessura convertia uma borda tracejada ou pontilhada em sólida. | Ativa `solid` apenas quando o estilo anterior é `none` ou `hidden`. |
| `src/hooks/useIframeInspector.js` | Bordas declaradas com `!important` no HTML importado podiam ignorar os controles. | A leitura inclui o estilo da borda; alterações de largura, estilo e cor usam prioridade suficiente para aparecer imediatamente. |
| `scripts/test_build_pipeline.cjs`, `scripts/test_style_regressions.mjs` | Os testes da esteira exigiam o escopo antigo e faltavam regressões dos casos corrigidos. | Atualizados para Windows e incluídas verificações de digitação real, zeros ao reselecionar, prioridade da borda e preservação de tracejado. |
| `scripts/test_ui_refinements.mjs` | O teste esperava desfoque e transparência anteriores ao CSS atual do tema Liquid Glass. | Expectativas ajustadas aos valores já definidos no tema: 24px e 0,45. O visual do tema não foi alterado. |
| `docs/ELECTRON.md`, `docs/BUILD_WINDOWS.md` | A documentação orientava comandos removidos. | Guia desktop atualizado e relatório técnico Windows criado. Removido o antigo `BUILD_MULTIPLATAFORMA.md`. |

O preload, o formato dos dados e a configuração `base: './'` do Vite foram
preservados. As alterações já existentes na área de trabalho foram mantidas.
Referências a plataformas em dependências transitivas do `package-lock.json`
são metadados de terceiros e não representam targets de distribuição do FOUX.

## Validação local

- `npm run lint`: análise estática.
- `npm run test:build`: configuração do builder, jobs Windows, sequência de
  build, interrupção em falhas, verificação de instalador e ícones.
- `node --test scripts/test_data_store.cjs`: persistência e recuperação de dados.
- `node scripts/test_editor.mjs`: controles reais no Chromium, bordas e
  sombras, exportação CSS, undo/redo, tela cheia, tutorial, temas e tooltips.
- `npm run dist:win`: compilação e geração real do instalador NSIS x64.
- `node scripts/test_desktop_persistence.mjs`: migração, fechamento imediato e
  reabertura com estilos, histórico e preferências no aplicativo empacotado.

O workflow foi validado localmente como configuração; não foi executado no
GitHub nesta entrega. A instalação pelo assistente NSIS ainda requer uma
verificação manual; os testes automatizados abrem o executável empacotado.
