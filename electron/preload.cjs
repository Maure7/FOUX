const { contextBridge, ipcRenderer } = require('electron');

if (process.argv.includes('--foux-migrate-storage')) {
  const data = {};
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith('foux_')) data[key] = localStorage.getItem(key);
    }
    ipcRenderer.send('foux:legacy-storage', { data });
  } catch (error) {
    ipcRenderer.send('foux:legacy-storage', { error: error.message });
  }
} else {
  function storageRequest(operation, key, value) {
    const result = ipcRenderer.sendSync('foux:storage', { operation, key, value });
    if (!result?.ok) throw new Error(result?.error || 'Falha no armazenamento do FOUX');
    return result.data;
  }
  contextBridge.exposeInMainWorld('fouxDesktop', {
    requestClose: () => ipcRenderer.send('foux:request-close'),
    storage: {
      snapshot: () => storageRequest('snapshot'),
      setItem: (key, value) => storageRequest('set', key, value),
      removeItem: (key) => storageRequest('remove', key),
    },
    onBeforeClose(callback) {
      const listener = async () => {
        try {
          await callback();
          ipcRenderer.send('foux:close-ready');
        } catch (error) {
          ipcRenderer.send('foux:close-error', String(error.message || error));
        }
      };
      ipcRenderer.on('foux:before-close', listener);
      return () => ipcRenderer.removeListener('foux:before-close', listener);
    },
  });
}
