# Relatório técnico: executável Windows do FOUX

O FOUX usa React para a interface, Vite para compilar os arquivos da interface,
Electron para executá-los em uma janela desktop e electron-builder para gerar
o instalador Windows x64 com NSIS. A configuração está em `package.json`.

## Como o executável foi estruturado

1. **Processo principal — `electron/main.cjs`:** inicia o aplicativo, cria a
   janela e carrega `dist/index.html` com `loadFile`. Controla abertura do manual,
   instância única, armazenamento e fechamento com salvamento das alterações.
2. **Preload — `electron/preload.cjs`:** expõe `window.fouxDesktop` por
   `contextBridge`. A interface usa essa ponte para salvar dados e coordenar o
   fechamento. `nodeIntegration` fica desativado; `contextIsolation` e `sandbox`
   ficam ativados. O processo principal verifica a origem das mensagens.
3. **Interface — React/Vite:** `npm run build` gera HTML, CSS e JavaScript em
   `dist`. O `base: './'` em `vite.config.js` permite carregar os recursos locais
   dentro do executável, sem precisar iniciar um servidor Vite.
4. **Empacotamento:** electron-builder reúne `dist`, `electron` e os metadados
   do aplicativo no pacote `app.asar`, junto ao runtime Electron. Os manuais PDF
   vão em `resources/docs`, fora do arquivo ASAR. O idioma ativo seleciona
   `manual_pt.pdf` ou `manual_es.pdf` para abrir no visualizador padrão.
   O ícone ICO é gerado de `public/favicon.svg` antes da compilação.
5. **Instalador:** NSIS gera `release/FOUX-Setup-<versão>.exe`, com assistente e
   escolha do diretório de instalação. O computador de destino não precisa
   instalar Node.js. Os dados ficam no diretório `userData` do Electron,
   separado da pasta de instalação.

## Gerar e verificar

Em um computador Windows, com Node.js 24 e npm, execute na raiz do projeto:

```powershell
npm ci
npm run dist:win
```

`npm run dist` e `npm run electron:build` executam o mesmo fluxo. O script
`scripts/build-release.cjs` gera ícones, compila a interface uma vez, empacota
NSIS x64 e verifica o instalador. Não exige ferramentas de containers.

A verificação confirma presença, tamanho mínimo e cabeçalho MZ do arquivo,
e grava `release/SHA256SUMS-windows.txt`. Essa checagem detecta arquivos ausentes
ou claramente inválidos; não substitui instalar e abrir o programa.

Para conferir novamente: `npm run verify:release`.
Para gerar apenas a pasta executável: `npm run electron:pack`. Nesse caso,
distribua a pasta `release/win-unpacked` completa, incluindo `FOUX.exe` e seus
recursos; o arquivo EXE isolado não é uma distribuição portátil independente.

O hook `build/validate-resources.cjs` confere os recursos obrigatórios e rejeita
empacotamentos para plataformas diferentes de Windows.

## Automação

O workflow `.github/workflows/desktop-build.yml` usa somente `windows-2022`.
O job `renderer` testa a esteira e o armazenamento, gera os ícones e compila a
interface. O job `package` recebe esses arquivos, gera o instalador, confere o
SHA-256 e testa persistência no aplicativo empacotado. Os arquivos ficam no
artefato `foux-windows-x64`. Uma tag `v<versão>` compatível com `package.json`
prepara uma release em rascunho. Alterar o workflow localmente não o executa
no GitHub; ele precisa ser enviado ao repositório.

As atualizações continuam manuais: aumente a versão, gere outro instalador,
feche o aplicativo e instale a nova versão usando a mesma conta. Preserve
`name`, `build.appId` e `build.productName` para manter a identidade e os dados.
