import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCollection, normalizeProfile, normalizeTheme, readJson } from '../src/services/workspaceData.js';

test('workspace boundaries tolerate malformed records without discarding valid project content', () => {
  const html = '<h1>Keep my edits</h1>';
  const result = normalizeCollection([null, 2, {}, {id:'a', name:'A', htmlContent:html}, {id:'a'}, {id:'b', name:42, htmlContent:42}], 'projects');
  assert.equal(result.length, 2);
  assert.equal(result[0].htmlContent, html);
  assert.equal(result[0].folderId, null);
  assert.equal(result[1].htmlContent, null);
  assert.equal(typeof result[1].name, 'string');
  for (const value of [null, {}, false, '[]']) assert.deepEqual(normalizeCollection(value, 'folders'), []);
});

test('profile and theme have valid defaults while supported preferences survive', () => {
  assert.equal(normalizeProfile(null).avatar, null);
  assert.equal(normalizeProfile({name:'QA', bio:'Keep', avatar:'data:image/png;base64,x'}).bio, 'Keep');
  assert.equal(normalizeProfile({name:{}, avatar:42, bio:[]}).bio, '');
  for (const theme of ['dark', 'light', 'solarized', 'liquid-glass']) assert.equal(normalizeTheme(theme), theme);
  assert.equal(normalizeTheme('unknown'), 'dark');
});

test('JSON loader falls back on denied storage and invalid JSON', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:{getItem:()=>'{broken'}});
    assert.deepEqual(readJson('foux_projects', []), []);
    Object.defineProperty(globalThis, 'localStorage', {configurable:true, get(){ throw Error('Access denied'); }});
    assert.deepEqual(readJson('foux_projects', []), []);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});
