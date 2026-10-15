const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createDataStore } = require('./data-store.cjs');
const { resolveManualPath } = require('./manual.cjs');

const appFile = path.join(__dirname, '../dist/index.html');
const appUrl = pathToFileURL(appFile).href;
let store;
let initializing = true;
const storageFailures = new Map();

function isTrustedSender(event) {
  return event.senderFrame === event.sender.mainFrame && event.senderFrame?.url === appUrl;
}

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
    storageFailures.delete(request.key);
    event.returnValue = { ok: true };
  } catch (error) {
    if (isTrustedSender(event)) storageFailures.set(request?.key, error.message);
    event.returnValue = { ok: false, error: error.message };
  }
});

// Read the previous default Chromium session once, before switching partitions.
async function migrateLegacyStorage() {
  if (store.initialized) return;
  const legacyWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
      additionalArguments: ['--foux-migrate-storage'],
    },
  });
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
        finish(result.error ? new Error(result.error) : null, result.data);
      }
      ipcMain.on('foux:legacy-storage', listener);
      legacyWindow.loadFile(appFile).catch((error) => finish(error));
    });
    store.migrate(legacy);
  } finally {
    legacyWindow.destroy();
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'FOUX',
    autoHideMenuBar: true,
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
  window.webContents.setWindowOpenHandler(({ url }) => {
    const manualPath = resolveManualPath(url, appUrl, manualDirectory);
    if (manualPath) {
      shell.openPath(manualPath).then((errorMessage) => {
        if (errorMessage) console.error('Não foi possível abrir o manual:', errorMessage);
      }).catch(console.error);
    }
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  let closeAllowed = false;
  let closeTimer = null;
  function cancelClose(message) {
    clearTimeout(closeTimer);
    closeTimer = null;
    dialog.showMessageBox(window, {
      type: 'error',
      title: 'Não foi possível salvar',
      message: 'O FOUX permaneceu aberto para preservar suas alterações.',
      detail: message,
    });
  }
  window.on('close', (event) => {
    if (closeAllowed) return;
    event.preventDefault();
    if (closeTimer) return;
    closeTimer = setTimeout(() => cancelClose('O editor não respondeu ao pedido de salvamento. Tente fechar novamente.'), 10000);
    window.webContents.send('foux:before-close');
  });
  const ready = (event) => {
    if (event.sender !== window.webContents || !isTrustedSender(event) || !closeTimer) return;
    try {
      if (storageFailures.size) throw new Error([...storageFailures.values()].join('\n'));
      store.flush();
      window.webContents.session.flushStorageData();
      clearTimeout(closeTimer);
      closeTimer = null;
      closeAllowed = true;
      window.close();
    } catch (error) {
      cancelClose(error.message);
    }
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
  window.loadFile(appFile);
}

if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(async () => {
  // Electron's standard userData folder is independent of the installer path.
  store = createDataStore(app.getPath('userData'));
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
