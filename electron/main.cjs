const { app, BrowserWindow, shell, ipcMain, dialog, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createDataStore } = require('./data-store.cjs');
const { resolveManualPath } = require('./manual.cjs');
const { isFileUrlFor } = require('./app-url.cjs');

const appFile = path.join(__dirname, '../dist/index.html');
// loadURL com a URL do Node: o loadFile não acha o arquivo em pastas com "%" ou "#" no nome.
const appUrl = pathToFileURL(appFile).href;
// Abrir um projeto grava projeto ativo e histórico em seguida: as duas viram uma só
// regravação do arquivo, e o IPC síncrono não espera mais pelo disco.
const STORE_WRITE_DELAY_MS = 250;
let store;
let initializing = true;

// Vale para qualquer renderer, inclusive janelas que venham a ser criadas depois.
app.enableSandbox();

// O processo principal não carrega os locales do React; só estes diálogos precisam de tradução.
const MESSAGES = {
  pt: {
    saveFailedTitle: 'Não foi possível salvar',
    saveFailedMessage: 'O FOUX permaneceu aberto para preservar suas alterações.',
    editorTimeout: 'O editor não respondeu ao pedido de salvamento. Tente fechar novamente.',
    keepOpen: 'Continuar no FOUX',
    closeAnyway: 'Fechar sem salvar',
  },
  es: {
    saveFailedTitle: 'No se pudo guardar',
    saveFailedMessage: 'FOUX sigue abierto para conservar tus cambios.',
    editorTimeout: 'El editor no respondió a la solicitud de guardado. Intenta cerrar de nuevo.',
    keepOpen: 'Seguir en FOUX',
    closeAnyway: 'Cerrar sin guardar',
  },
};
const message = (key) => MESSAGES[store?.get('foux_language') === 'es' ? 'es' : 'pt'][key];

function isTrustedSender(event) {
  const frame = event.senderFrame;
  return !!frame && frame === event.sender.mainFrame && isFileUrlFor(frame.url, appFile);
}

function denyPermissions(target) {
  target.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
}

// O app nunca navega: links externos, arquivos soltos na janela e popups ficam bloqueados.
function lockNavigation(contents, openWindow = () => {}) {
  contents.on('will-navigate', (event) => event.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    openWindow(url);
    return { action: 'deny' };
  });
}

// Com o armazenamento adiado, set/remove só validam e atualizam a memória; erros de
// disco aparecem no fechamento, quando o flush grava tudo de uma vez.
ipcMain.on('foux:storage', (event, request) => {
  try {
    if (!store || !isTrustedSender(event)) throw new Error('Origem de armazenamento inválida');
    if (request?.operation === 'snapshot') {
      event.returnValue = { ok: true, data: store.snapshot() };
      return;
    }
    if (typeof request?.key !== 'string' || !request.key.startsWith('foux_')) throw new Error('Chave inválida');
    if (request.operation === 'set') store.set(request.key, request.value);
    else if (request.operation === 'remove') store.remove(request.key);
    else throw new Error('Operação inválida');
    event.returnValue = { ok: true };
  } catch (error) {
    event.returnValue = { ok: false, error: error.message };
  }
});

// Versões antigas guardavam tudo no localStorage da sessão padrão. Ele é lido uma única
// vez, antes de o app passar a usar a partição própria e o arquivo foux-data.json.
async function migrateLegacyStorage() {
  if (store.initialized) return;
  denyPermissions(session.defaultSession);
  const legacyWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
      additionalArguments: ['--foux-migrate-storage'],
    },
  });
  lockNavigation(legacyWindow.webContents);
  try {
    const legacy = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Não foi possível recuperar o armazenamento anterior')), 10000);
      function finish(error, data) {
        clearTimeout(timer);
        ipcMain.removeListener('foux:legacy-storage', listener);
        if (error) reject(error);
        else resolve(data);
      }
      function listener(event, result) {
        if (event.sender !== legacyWindow.webContents || !isTrustedSender(event)) return;
        finish(result?.error ? new Error(String(result.error)) : null, result?.data);
      }
      ipcMain.on('foux:legacy-storage', listener);
      legacyWindow.loadURL(appUrl).catch((error) => finish(error));
    });
    store.migrate(legacy);
  } finally {
    legacyWindow.destroy();
  }
}

// No executável empacotado o Windows usa o ícone embutido no .exe; em
// desenvolvimento (electron .) a janela usaria o ícone padrão do Electron.
const devIcon = path.join(__dirname, '../build/icon.ico');

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'FOUX',
    autoHideMenuBar: true,
    ...(!app.isPackaged && fs.existsSync(devIcon) ? { icon: devIcon } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      partition: 'persist:foux-app',
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const manualDirectory = app.isPackaged
    ? process.resourcesPath
    : path.join(app.getAppPath(), 'public');
  lockNavigation(window.webContents, (url) => {
    const manualPath = resolveManualPath(url, appUrl, manualDirectory);
    if (!manualPath) return;
    shell.openPath(manualPath).then((errorMessage) => {
      if (errorMessage) console.error('Não foi possível abrir o manual:', errorMessage);
    }).catch(console.error);
  });
  denyPermissions(window.webContents.session);

  // Fechar passa por um aperto de mão: o renderer grava o documento aberto, avisa, e só
  // então o arquivo é regravado e a janela fecha.
  let closeAllowed = false;
  let closeTimer = null;
  function allowClose() {
    clearTimeout(closeTimer);
    closeTimer = null;
    closeAllowed = true;
    window.close();
  }
  async function cancelClose(detail) {
    clearTimeout(closeTimer);
    closeTimer = null;
    if (window.isDestroyed()) return;
    // Sem a segunda opção, um renderer travado deixava a janela impossível de fechar.
    const { response } = await dialog.showMessageBox(window, {
      type: 'error',
      title: message('saveFailedTitle'),
      message: message('saveFailedMessage'),
      detail: String(detail),
      buttons: [message('keepOpen'), message('closeAnyway')],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (response !== 1 || window.isDestroyed()) return;
    try {
      // O que já chegou ao processo principal ainda vai para o disco, se ele aceitar.
      store.persist();
    } catch (error) {
      console.error('Falha ao gravar os dados do FOUX:', error);
    }
    allowClose();
  }
  function finishClose() {
    try {
      store.flush();
      window.webContents.session.flushStorageData();
    } catch (error) {
      cancelClose(error.message);
      return;
    }
    allowClose();
  }
  window.on('close', (event) => {
    if (closeAllowed) return;
    event.preventDefault();
    if (closeTimer) return;
    // Um renderer que caiu não responde ao pedido; os dados já confirmados estão aqui.
    if (window.webContents.isCrashed()) {
      finishClose();
      return;
    }
    closeTimer = setTimeout(() => cancelClose(message('editorTimeout')), 10000);
    window.webContents.send('foux:before-close');
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    console.error('O renderer do FOUX foi encerrado:', details.reason);
    if (closeTimer) finishClose();
  });
  // Desligar ou sair do Windows não espera o aperto de mão; grava o que estiver pendente.
  window.on('session-end', () => {
    try {
      store.persist();
    } catch (error) {
      console.error('Falha ao gravar os dados do FOUX:', error);
    }
  });
  const ready = (event) => {
    if (event.sender !== window.webContents || !isTrustedSender(event) || !closeTimer) return;
    finishClose();
  };
  const failed = (event, error) => {
    if (event.sender === window.webContents && isTrustedSender(event) && closeTimer) cancelClose(error);
  };
  const requested = (event) => {
    if (event.sender === window.webContents && isTrustedSender(event)) window.close();
  };
  ipcMain.on('foux:close-ready', ready);
  ipcMain.on('foux:close-error', failed);
  ipcMain.on('foux:request-close', requested);
  window.on('closed', () => {
    clearTimeout(closeTimer);
    ipcMain.removeListener('foux:close-ready', ready);
    ipcMain.removeListener('foux:close-error', failed);
    ipcMain.removeListener('foux:request-close', requested);
  });
  window.loadURL(appUrl);
}

if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(async () => {
  // A pasta userData padrão do Electron não depende de onde o instalador colocou o app.
  store = createDataStore(app.getPath('userData'), {
    writeDelay: STORE_WRITE_DELAY_MS,
    onError: (error) => console.error('Falha ao gravar os dados do FOUX:', error),
  });
  await migrateLegacyStorage();
  createWindow();
  initializing = false;
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => {
  dialog.showErrorBox('Falha ao carregar dados do FOUX', error.message);
  app.quit();
});

app.on('second-instance', () => {
  const window = BrowserWindow.getAllWindows().find((window) => window.isVisible());
  if (window) {
    if (window.isMinimized()) window.restore();
    window.focus();
  }
});

app.on('window-all-closed', () => {
  if (!initializing) app.quit();
});

app.on('will-quit', () => {
  try {
    store?.persist();
  } catch (error) {
    console.error('Falha ao gravar os dados do FOUX:', error);
  }
});
