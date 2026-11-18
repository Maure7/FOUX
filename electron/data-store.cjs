const fs = require('node:fs');
const path = require('node:path');

// No Windows, antivírus e indexador seguram o arquivo recém-gravado por alguns
// milissegundos; a troca de arquivo é tentada de novo antes de virar erro.
// A espera é síncrona e trava o processo principal: no máximo 150 ms por gravação.
const RETRY_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const RETRY_ATTEMPTS = 4;
const RETRY_WAIT_MS = 25;
const RETRY_AFTER_FAILURE_MS = 5000;

function validateData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Dados inválidos');
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith('foux_') || typeof value !== 'string') throw new Error('Chave de armazenamento inválida');
  }
  return { ...data };
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withRetry(operation) {
  for (let attempt = 1; ; attempt++) {
    try {
      return operation();
    } catch (error) {
      if (attempt >= RETRY_ATTEMPTS || !RETRY_CODES.has(error.code)) throw error;
      sleep(RETRY_WAIT_MS * attempt);
    }
  }
}

// writeDelay > 0 agrupa as gravações: set/remove só atualizam a memória e o arquivo
// inteiro é regravado uma vez depois da pausa. Com 0, cada alteração vai ao disco na hora.
function createDataStore(directory, { writeDelay = 0, onError = () => {} } = {}) {
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, 'foux-data.json');
  let data = {};
  let initialized = false;
  let dirty = false;
  let timer = null;
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

  // Grava num temporário e só então troca: uma queda no meio nunca deixa o arquivo pela metade.
  function commit(next) {
    const temporary = `${filename}.tmp`;
    const descriptor = fs.openSync(temporary, 'w', 0o600);
    try {
      fs.writeFileSync(descriptor, JSON.stringify({ version: 1, data: next }), 'utf8');
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    if (fs.existsSync(filename)) withRetry(() => fs.copyFileSync(filename, `${filename}.bak`));
    withRetry(() => fs.renameSync(temporary, filename));
    data = next;
    dirty = false;
    initialized = true;
  }

  function cancelTimer() {
    clearTimeout(timer);
    timer = null;
  }

  function persist() {
    cancelTimer();
    if (dirty) commit(data);
  }

  function schedule(delay) {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      try {
        persist();
      } catch (error) {
        onError(error);
        // Os dados continuam na memória; nova tentativa até o disco voltar ou o app fechar.
        schedule(RETRY_AFTER_FAILURE_MS);
      }
    }, delay);
  }

  function update(next) {
    if (!writeDelay) {
      commit(next);
      return;
    }
    data = next;
    dirty = true;
    schedule(writeDelay);
  }

  return {
    get initialized() { return initialized; },
    get pending() { return dirty; },
    snapshot: () => ({ ...data }),
    get: (key) => (Object.hasOwn(data, key) ? data[key] : undefined),
    migrate: (legacy) => { if (!initialized) commit(validateData(legacy)); },
    set(key, value) {
      validateData({ [key]: value });
      if (data[key] !== value) update({ ...data, [key]: value });
    },
    remove(key) {
      if (!Object.hasOwn(data, key)) return;
      const next = { ...data };
      delete next[key];
      update(next);
    },
    // Só o que ainda não foi ao disco (fim de sessão do Windows, saída do app).
    persist,
    // Grava as pendências e regrava mais uma vez para renovar o .bak: depois de um
    // fechamento limpo, o backup é igual ao estado atual.
    flush() {
      cancelTimer();
      try {
        if (dirty) commit(data);
      } catch (error) {
        if (writeDelay) schedule(RETRY_AFTER_FAILURE_MS);
        throw error;
      }
      try {
        commit({ ...data });
      } catch (error) {
        // O arquivo principal já tem o estado atual; só o backup ficou para trás.
        onError(error);
      }
    },
  };
}

module.exports = { createDataStore };
