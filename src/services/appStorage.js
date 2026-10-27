// Desktop writes are acknowledged only after the main process saves to disk.
// The web application continues using the browser's localStorage.
const desktop = globalThis.window?.fouxDesktop?.storage;
const data = desktop ? { ...desktop.snapshot() } : null;

export const appStorage = desktop ? {
  get length() { return Object.keys(data).length; },
  key(index) { return Object.keys(data)[index] ?? null; },
  getItem(key) { return data[String(key)] ?? null; },
  setItem(key, value) {
    key = String(key);
    value = String(value);
    desktop.setItem(key, value);
    data[key] = value;
  },
  removeItem(key) {
    key = String(key);
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
