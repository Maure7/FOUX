<div align="center">

# FOUX

**Editor visual de interfaces HTML, com inspeção de elementos, estilos `:hover` e exportação de CSS.**

![Versão](https://img.shields.io/badge/vers%C3%A3o-0.0.4-8b5cf6?style=flat-square)
![Node](https://img.shields.io/badge/node-24-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/react-19-61dafb?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/vite-8-646cff?style=flat-square&logo=vite&logoColor=white)
![Electron](https://img.shields.io/badge/electron-44-47848f?style=flat-square&logo=electron&logoColor=white)
![Plataforma](https://img.shields.io/badge/desktop-windows%20x64-0078d4?style=flat-square)

[Escopo](#escopo) · [Tecnologias](#tecnologias) · [Guia rápido](#guia-rápido-das-tecnologias) · [Organização](#organização) · [Comandos](#guia-do-projeto)

</div>

---

## Escopo

O FOUX ajuda quem está aprendendo HTML e CSS a alterar uma página sem escrever código às cegas. O estudante abre um HTML, clica em um elemento, ajusta o estilo em um painel visual e vê o resultado na hora.

**O que o projeto faz**

- Importa um HTML e o exibe em um canvas isolado.
- Seleciona elementos e edita cor, tipografia, bordas, espaçamento, fundo e layout.
- Edita o estado `:hover` e eventos de cada elemento.
- Desfaz e refaz alterações, com histórico legível.
- Exporta o CSS gerado.
- Organiza projetos em pastas, com fixação, busca e histórico de atividades.

**Recursos pedagógicos**

- Tour guiado de oito etapas e projeto de exemplo.
- Modo Desafios, com objetivos, cronômetro e recordes.
- Perfil com estatísticas da conta.
- Interface em Português e Espanhol, com manuais em PDF nos dois idiomas.

**Interface**

- Quatro temas: Dark, Light, Solarized e Debug mode (Liquid Glass).
- Acessibilidade: navegação por teclado, tooltips, foco visível e suporte a movimento e transparência reduzidos.

**Fora do escopo**

- Não executa JavaScript do HTML importado.
- Não envia dados a servidores: tudo fica no computador do usuário.
- Não publica releases nem assina o instalador.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Interface | React 19, JavaScript (JSX) |
| Ícones | lucide-react |
| Build e servidor de desenvolvimento | Vite 8 |
| Aplicativo desktop | Electron 44 |
| Instalador | electron-builder (NSIS, Windows x64) |
| Estilo | CSS puro, organizado em temas |
| Qualidade | ESLint 10, `node:test` e suítes Chromium via CDP |
| Geração de ícones | @resvg/resvg-js |

## Guia rápido das tecnologias

- **React:** biblioteca que monta a interface a partir de componentes. Cada tela do FOUX é uma composição de componentes pequenos.
- **Vite:** inicia o projeto em segundos no desenvolvimento e gera os arquivos finais com `vite build`.
- **Electron:** empacota a aplicação web em um programa de desktop. O processo principal (`electron/`) cuida de janela, arquivos e IPC; a interface roda no processo de renderização.
- **electron-builder:** transforma o build em instalador `.exe`.
- **iframe com sandbox:** o HTML importado roda em um iframe com `sandbox="allow-same-origin"`, sem scripts, e o editor só lê e altera seus estilos.
- **CSS com variáveis:** cada tema redefine variáveis de cor e material; os componentes só as consomem.
- **Liquid Glass:** o tema Debug mode usa `backdrop-filter` com um filtro SVG de refração (`feDisplacementMap`), gerado em `LiquidGlassEngine.jsx`.
- **Testes:** os testes de interface abrem o aplicativo em Chrome ou Edge pelo protocolo CDP e simulam o uso real.

## Organização

```text
FOUX1/
├── src/
│   ├── pages/          telas: Dashboard, Editor, Perfil e Configurações
│   ├── components/     editor, dashboard, perfil e elementos de interface
│   ├── hooks/          histórico, persistência, resize e inspetor
│   ├── services/       adaptador desktop/web e validação de dados
│   ├── utils/          CSS, gradientes, tutorial e atividades
│   ├── challenges/     motor, sorteio e recordes do Modo Desafios
│   ├── context/        idioma e formatação
│   ├── locales/        dicionários PT e ES
│   └── styles/         base, componentes e temas
├── electron/           janela, IPC restrito e salvamento atômico
├── public/docs/        manuais PT e ES empacotados
├── scripts/            testes, ícones e pipeline Windows
├── build/              recursos e validação do empacotamento
└── docs/               relatórios técnicos e instruções de build
```

| Diretório | Responsabilidade |
| --- | --- |
| `src/pages/` | Composição das telas; editor, configurações e perfil carregados sob demanda |
| `src/components/editor/` | Cabeçalho, canvas, tour e painel de edição |
| `src/components/editor/controls/` | Controles numéricos, cores, gradientes e seções |
| `src/components/dashboard/` | Cartões, pastas, atividades e menus |
| `src/components/ui/` | Modais, notificações, tooltips e motor Liquid Glass |
| `src/styles/` | `glass.css` e `refinements.css` por último na cascata; temas em `themes/` |

**Dados e segurança**

- No Electron, os dados ficam em `userData`, com backup e confirmação de gravação antes de fechar a janela.
- No navegador, ficam em `localStorage`.
- A ponte entre interface e sistema expõe apenas o necessário, via `preload.cjs`.

## Guia do projeto

**Requisitos**

- Node.js 24 e npm.
- Windows x64 para gerar o instalador e rodar os testes desktop.
- Chrome ou Edge para os testes de interface; `CHROME_PATH` aponta para outro Chromium.

**Primeiros passos**

```powershell
npm ci
npm run dev
```

**Comandos**

| Comando | Função |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento web |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm run electron:start` | Compila e abre o aplicativo no Electron |
| `npm run lint` | Verifica o código com ESLint |
| `npm test` | Lint e todas as suítes |
| `npm run test:unit` | Testes unitários |
| `npm run test:features` | Funcionalidades do dashboard e do editor |
| `npm run test:editor` | Fluxos do editor |
| `npm run test:i18n` | Idiomas e manuais |
| `npm run test:rc` | Verificações de release |
| `npm run test:ui` | Design, contraste e temas |
| `npm run test:desktop` | Executa `release/win-unpacked` com perfil temporário |
| `npm run icons` | Gera os ícones do aplicativo |
| `npm run dist:win` | Gera o instalador (apenas Windows) |
| `npm run verify:release` | Confere os artefatos do instalador |

**Distribuição**

- O instalador fica em `release/FOUX-Setup-0.0.4.exe` e o SHA-256 em `release/SHA256SUMS-windows.txt`.
- As capturas da matriz visual ficam em `release/qa/`.
- A assinatura digital depende de certificado configurado por quem distribui.
- Os testes não usam os projetos pessoais do usuário.

## Documentação

- [Auditoria de interface](docs/AUDITORIA_INTERFACE_2026-10-28.md)
- [Instruções de build para Windows](docs/BUILD_WINDOWS.md)
- [Documentação do Electron](docs/ELECTRON.md)
- [Refinamentos de interface](docs/UI_REFINEMENTS.md)
- [Liquid Glass e sistema de design](docs/RELATORIO_LIQUID_GLASS_E_DESIGN_SYSTEM_2026-11-13.md)

## Autor

Maure7 · [github.com/Maure7/FOUX](https://github.com/Maure7/FOUX)
Mauricio Carvalho . [https://www.linkedin.com/in/mauricio-carvalho-654b35308/]

