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
  // Projects larger than the browser localStorage quota are supported on disk.
  store.set('foux_projects', 'x'.repeat(6 * 1024 * 1024));
  store.flush();
  fs.writeFileSync(path.join(directory, 'foux-data.json'), '{interrupted');
  store = createDataStore(directory);
  assert.equal(store.snapshot().foux_projects.length, 6 * 1024 * 1024);
  assert.equal(store.snapshot().foux_theme, 'light');
  assert.ok(fs.readdirSync(directory).some((name) => name.includes('.corrupt-')));
});

test('unrecoverable data is not silently overwritten with an empty state', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'foux-storage-test-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'foux-data.json');
  fs.writeFileSync(filename, '{invalid');
  assert.throws(() => createDataStore(directory));
  assert.equal(fs.readFileSync(filename, 'utf8'), '{invalid');
});
