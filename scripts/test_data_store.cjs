const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDataStore } = require('../electron/data-store.cjs');

test('desktop data survives restarts, removals, corruption and rejects invalid keys', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'foux-storage-test-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let store = createDataStore(directory);
  store.migrate({ foux_projects: '[{"id":"existing"}]', foux_theme: 'light' });
  store.set('foux_language', 'es');
  store = createDataStore(directory);
  assert.equal(store.snapshot().foux_theme, 'light');
  assert.equal(store.snapshot().foux_language, 'es');
  store.migrate({ foux_theme: 'dark' });
  assert.equal(store.snapshot().foux_theme, 'light');
  store.remove('foux_projects');
  store.flush();
  assert.equal(createDataStore(directory).snapshot().foux_projects, undefined);
  assert.throws(() => store.set('../outside', 'bad'));
  assert.throws(() => store.set('foux_projects', {}));
  // No disco cabem projetos maiores que a cota do localStorage do navegador.
  store.set('foux_projects', 'x'.repeat(6 * 1024 * 1024));
  store.flush();
  fs.writeFileSync(path.join(directory, 'foux-data.json'), '{interrupted');
  store = createDataStore(directory);
  assert.equal(store.snapshot().foux_projects.length, 6 * 1024 * 1024);
  assert.equal(store.snapshot().foux_theme, 'light');
  assert.ok(fs.readdirSync(directory).some((name) => name.includes('.corrupt-')));
});

function tempStore(context, options) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'foux-storage-test-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = createDataStore(directory, options);
  store.migrate({ foux_theme: 'light' });
  return { directory, store, saved: () => JSON.parse(fs.readFileSync(path.join(directory, 'foux-data.json'), 'utf8')).data };
}
// Conta as trocas de arquivo feitas pelo data-store (uma por gravação completa).
function countRenames(context) {
  const original = fs.renameSync;
  const counter = { count: 0, fail: null };
  fs.renameSync = (...args) => {
    counter.count++;
    if (counter.fail) {
      const error = counter.fail();
      if (error) throw error;
    }
    return original(...args);
  };
  context.after(() => { fs.renameSync = original; });
  return counter;
}
const lockError = (code) => Object.assign(new Error(code), { code });

test('grouped writes answer without disk work and reach the disk once after the pause', async (context) => {
  const { directory, store, saved } = tempStore(context, { writeDelay: 40 });
  const renames = countRenames(context);
  store.set('foux_active_project', 'p1');
  store.set('foux_activities', '[{"id":"a1"}]');
  store.remove('foux_theme');
  assert.equal(renames.count, 0);
  assert.equal(store.pending, true);
  assert.equal(store.get('foux_active_project'), 'p1');
  assert.equal(saved().foux_theme, 'light');
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(renames.count, 1);
  assert.equal(store.pending, false);
  assert.deepEqual(createDataStore(directory).snapshot(), { foux_active_project: 'p1', foux_activities: '[{"id":"a1"}]' });
  store.persist();
  assert.equal(renames.count, 1, 'nada pendente, nada gravado');
});

test('flush writes pending changes at once and leaves the backup equal to the saved file', (context) => {
  const { directory, store } = tempStore(context, { writeDelay: 10000 });
  store.set('foux_language', 'es');
  store.flush();
  const filename = path.join(directory, 'foux-data.json');
  assert.equal(createDataStore(directory).snapshot().foux_language, 'es');
  assert.equal(fs.readFileSync(`${filename}.bak`, 'utf8'), fs.readFileSync(filename, 'utf8'));
});

test('transient Windows file locks are retried and lasting failures keep the data until a flush succeeds', async (context) => {
  const renames = countRenames(context);
  let busy = 2;
  renames.fail = () => (busy-- > 0 ? lockError('EBUSY') : null);
  const direct = tempStore(context);
  direct.store.set('foux_language', 'es');
  assert.equal(direct.saved().foux_language, 'es');

  const errors = [];
  const grouped = tempStore(context, { writeDelay: 20, onError: (error) => errors.push(error.code) });
  renames.fail = () => lockError('EPERM');
  grouped.store.set('foux_projects', '[{"id":"keep"}]');
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert.ok(errors.length >= 1 && errors.every((code) => code === 'EPERM'));
  assert.equal(grouped.store.pending, true);
  assert.equal(grouped.store.snapshot().foux_projects, '[{"id":"keep"}]');
  assert.throws(() => grouped.store.flush(), /EPERM/);
  renames.fail = null;
  grouped.store.flush();
  assert.equal(grouped.store.pending, false);
  assert.equal(grouped.saved().foux_projects, '[{"id":"keep"}]');
});

test('unrecoverable data is not silently overwritten with an empty state', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'foux-storage-test-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'foux-data.json');
  fs.writeFileSync(filename, '{invalid');
  assert.throws(() => createDataStore(directory));
  assert.equal(fs.readFileSync(filename, 'utf8'), '{invalid');
});
