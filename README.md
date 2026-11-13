# FOUX

Editor visual de interfaces HTML com React, Vite e Electron. Permite inspecionar elementos, editar estilos e eventos `:hover`, desfazer/refazer alterações e exportar CSS. Inclui tutorial guiado, Português/Espanhol e temas Dark, Light, Solarized e Debug mode.

## Executar

Requisitos: Node.js 24 e npm. O instalador e os testes desktop requerem Windows x64. Os testes de interface usam Chrome ou Edge instalado; `CHROME_PATH` pode indicar outro executável Chromium.

```powershell
npm ci
npm run dev
```

Para executar a versão desktop local:

```powershell
npm run electron:start
```

## Validar e distribuir

```powershell
npm test
npm run build
npm run dist:win
npm run test:desktop
```

`npm test` executa lint, testes unitários, verificações de idioma/armazenamento e três suítes Chromium. `test:desktop` executa o aplicativo de `release/win-unpacked` usando um perfil temporário isolado. Os testes não usam os projetos pessoais do usuário.

O instalador fica em `release/FOUX-Setup-0.0.4.exe`; o SHA-256, em `release/SHA256SUMS-windows.txt`. As capturas da matriz visual ficam em `release/qa/`. O empacotamento não publica releases; a assinatura digital depende de certificado configurado pelo responsável pela distribuição.

## Organização

| Diretório | Responsabilidade |
| --- | --- |
| `src/pages/` | Composição das telas; editor, configurações e perfil carregados sob demanda |
| `src/components/editor/` | Cabeçalho, canvas, tour e painel de edição |
| `src/components/editor/controls/` | Controles numéricos, cores, gradientes e seções |
| `src/components/dashboard/` | Cartões, pastas, atividades e menus do dashboard |
| `src/components/ui/` | Modais, notificações e tooltips compartilhados |
| `src/hooks/` | Histórico, persistência React, resize e ciclo de vida do inspetor |
| `src/services/` | Adaptador desktop/web e validação de dados persistidos |
| `src/utils/` | CSS, gradientes, estilos DOM, tutorial e atividades |
| `src/context/`, `src/locales/` | Idioma, formatação e dicionários PT/ES |
| `src/styles/` | Base, componentes e temas; `Dashboard.css` conserva a ordem da cascata |
| `electron/` | Janela, IPC restrito, salvamento atômico e abertura dos manuais |
| `public/docs/` | Manuais PT/ES empacotados |
| `scripts/`, `build/` | Testes, geração de ícones e pipeline Windows |

O HTML importado roda em iframe com `sandbox="allow-same-origin"`, sem execução de scripts. No Electron, dados ficam no diretório `userData`, com backup e confirmação de gravação antes de fechar a janela.

Consulte o [relatório técnico da auditoria](docs/RELATORIO_RC.md), as [instruções de build Windows](docs/BUILD_WINDOWS.md) e a [documentação Electron](docs/ELECTRON.md).
