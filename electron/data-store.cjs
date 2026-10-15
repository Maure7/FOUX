const fs = require('node:fs');
const path = require('node:path');

function validateData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Dados inválidos');
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith('foux_') || typeof value !== 'string') throw new Error('Chave de armazenamento inválida');
  }
  return { ...data };
}

function createDataStore(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, 'foux-data.json');
  let data = {};
  let initialized = false;
  function read(filename) {
    const document = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (document.version !== 1) throw new Error('Versão de dados inválida');
    return validateData(document.data);
  }
  if (fs.existsSync(filename)) {
    try {
      data = read(filename);
    } catch (error) {
      if (!fs.existsSync(`${filename}.bak`)) throw error;
      data = read(`${filename}.bak`);
      fs.copyFileSync(filename, `${filename}.corrupt-${Date.now()}`);
      fs.copyFileSync(`${filename}.bak`, filename);
    }
    initialized = true;
  } else if (fs.existsSync(`${filename}.bak`)) {
    data = read(`${filename}.bak`);
    fs.copyFileSync(`${filename}.bak`, filename);
    initialized = true;
  }

  function commit(next) {
    const temporary = `${filename}.tmp`;
    const descriptor = fs.openSync(temporary, 'w', 0o600);
    try {
      fs.writeFileSync(descriptor, JSON.stringify({ version: 1, data: next }), 'utf8');
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    if (fs.existsSync(filename)) fs.copyFileSync(filename, `${filename}.bak`);
    fs.renameSync(temporary, filename);
    data = next;
    initialized = true;
  }

  return {
    get initialized() { return initialized; },
    snapshot: () => ({ ...data }),
    migrate: (legacy) => { if (!initialized) commit(validateData(legacy)); },
    set(key, value) {
      validateData({ [key]: value });
      if (data[key] !== value) commit({ ...data, [key]: value });
    },
    remove(key) {
      if (!Object.hasOwn(data, key)) return;
      const next = { ...data };
      delete next[key];
      commit(next);
    },
    flush: () => commit({ ...data }),
  };
}

module.exports = { createDataStore };
