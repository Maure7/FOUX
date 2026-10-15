# Aplicativo desktop Windows

Estrutura e comandos de distribuição: [relatório técnico Windows](BUILD_WINDOWS.md).

O Electron e o electron-builder ficam instalados localmente em `node_modules`.
Requisito: Node.js e npm. Para instalar em outro computador, execute `npm ci`.

Abra o aplicativo:

```powershell
npm run electron:start
```

Esse comando compila o React e abre o aplicativo. Depois de alterar o código,
feche o aplicativo e execute o comando novamente. Para desenvolvimento com
atualização automática no navegador, continue usando `npm run dev`.

Gere o instalador Windows de 64 bits:

```powershell
npm run electron:build
```

O instalador fica em `release/FOUX-Setup-0.0.2.exe`. A versão vem de
`package.json`. Para gerar somente a pasta com o executável, use
`npm run electron:pack`; o resultado fica em `release/win-unpacked/FOUX.exe`.
Distribua a pasta completa ao usar essa opção.

O aplicativo salva os dados em `foux-data.json`, dentro da pasta padrão
`userData` do Electron. O armazenamento do aplicativo desktop é separado do
navegador. O manual PDF abre no visualizador padrão do sistema.

## Manuais e tutorial por idioma

O botão do manual usa `public/docs/manual_pt.pdf` para português e
`public/docs/manual_es.pdf` para espanhol. Os dois arquivos acompanham o
instalador em `resources/docs`; o Electron abre somente as URLs locais
autorizadas para esses manuais.

`src/utils/tutorialTemplate_es.js` contém o tutorial espanhol, com as mesmas
classes e estrutura do template português. Ao criar ou reabrir o tutorial,
o idioma ativo define o conteúdo. A troca de idioma traduz os textos originais,
IDs pedagógicos e seletores CSS, preservando os estilos e efeitos já editados.
Projetos HTML comuns mantêm seu conteúdo. Tutoriais novos guardam a marca
`template: 'tutorial'` para continuar reconhecidos mesmo após renomeação.

Valide os manuais, a paridade dos templates e a alternância de idioma com:

```powershell
npm run test:i18n
```

## Persistência de dados

- A sessão Chromium usa a partição persistente `persist:foux-app`.
- Projetos, pastas, histórico de atividades, perfil e preferências são gravados
  no arquivo `foux-data.json` pelo processo principal. O renderer acessa somente
  uma API de armazenamento pelo preload; a integração Node permanece desativada.
- Cada gravação escreve e sincroniza um arquivo temporário antes de substituir
  o arquivo principal, mantendo a cópia anterior em `foux-data.json.bak`.
- Ao fechar, o processo principal espera o editor concluir as edições pendentes
  e os dados serem gravados. Se houver uma falha de gravação, a janela permanece
  aberta e informa o erro.
- Na primeira abertura, os dados ainda disponíveis na sessão Chromium anterior
  são migrados. Dados já perdidos pela versão antiga não podem ser recuperados.
- O botão de limpeza de dados continua removendo projetos, pastas e atividades.

Para executar os testes de armazenamento e reabertura no Windows:

```powershell
node --test scripts/test_data_store.cjs
npm run electron:pack
node scripts/test_desktop_persistence.mjs
```

O teste do executável usa uma pasta temporária isolada. Ele migra dados legados,
edita o tutorial, fecha antes do debounce de 800 ms e verifica os estilos,
histórico, pastas, perfil, tema e idioma ao reabrir.

## Manual resumido: gerar e atualizar

1. Abra o PowerShell na pasta do projeto:

   ```powershell
   cd C:\Users\Maure\Desktop\TADS\FOUX1
   ```

2. Em uma instalação nova do projeto, instale as dependências com `npm ci`.
   Neste ambiente elas já estão instaladas.
3. Execute `npm run electron:build`. Ele compila o React e gera o instalador
   `release/FOUX-Setup-<versão>.exe`. Envie esse arquivo para instalar o FOUX;
   o computador de destino não precisa de Node.js.

Para publicar uma atualização:

1. Altere o código e teste com `npm run electron:start`. Feche o aplicativo
   antes de empacotar.
2. Aumente a versão e gere outro instalador:

   ```powershell
   npm version patch --no-git-tag-version
   npm run electron:build
   ```

   Por exemplo, `0.0.2` passa a `0.0.3`, e o novo arquivo será
   `release/FOUX-Setup-0.0.3.exe`. O comando atualiza `package.json` e
   `package-lock.json` sem criar commit ou tag Git.
3. No computador de destino, feche o FOUX e execute o novo instalador usando
   a mesma conta e o mesmo diretório da instalação anterior.

Mantenha `build.appId`, `name` e `build.productName` para conservar a identidade
do aplicativo e seu armazenamento de dados. As atualizações são manuais;
o projeto ainda não possui um mecanismo de atualização automática.

Referências: [npm version](https://docs.npmjs.com/cli/v11/commands/npm-version/)
e [instaladores NSIS](https://www.electron.build/docs/nsis/).
