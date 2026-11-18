// No desktop o processo principal guarda os dados e grava o arquivo em lote, logo
// após a alteração e sempre ao fechar a janela. Na web continua o localStorage.
const desktop = globalThis.window?.fouxDesktop?.storage;
const data = desktop ? { ...desktop.snapshot() } : null;

export const appStorage = desktop ? {
  get length() { return Object.keys(data).length; },
  key(index) { return Object.keys(data)[index] ?? null; },
  getItem(key) { return data[String(key)] ?? null; },
  setItem(key, value) {
    key = String(key);
    value = String(value);
    // Valor igual não cruza o IPC: a lista de projetos pode ter vários MB.
    if (data[key] === value) return;
    desktop.setItem(key, value);
    data[key] = value;
  },
  removeItem(key) {
    key = String(key);
    if (!Object.hasOwn(data, key)) return;
    desktop.removeItem(key);
    delete data[key];
  },
} : {
  get length() { return globalThis.localStorage.length; },
  key(index) { return globalThis.localStorage.key(index); },
  getItem(key) { return globalThis.localStorage.getItem(key); },
  setItem(key, value) { globalThis.localStorage.setItem(key, value); },
  removeItem(key) { globalThis.localStorage.removeItem(key); },
};
