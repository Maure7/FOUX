const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { resolveManualPath } = require('../electron/manual.cjs');

test('both localized manuals exist, are PDFs and are packaged as external resources', () => {
  const metadata = require('../package.json');
  assert.deepEqual(metadata.build.extraResources, [{
    from: 'public/docs', to: 'docs', filter: ['manual_pt.pdf', 'manual_es.pdf'],
  }]);
  for (const language of ['pt', 'es']) {
    const data = fs.readFileSync(`public/docs/manual_${language}.pdf`);
    assert.equal(data.subarray(0, 5).toString(), '%PDF-');
    assert.ok(data.length > 1000);
  }
});

test('desktop routes only trusted local manual URLs to the native viewer', () => {
  const appUrl = pathToFileURL(path.resolve('release/win-unpacked/resources/app.asar/dist/index.html')).href;
  const resources = path.resolve('release/win-unpacked/resources');
  for (const language of ['pt', 'es']) {
    const filename = `manual_${language}.pdf`;
    assert.equal(resolveManualPath(new URL(`docs/${filename}`, appUrl).href, appUrl, resources), path.join(resources, 'docs', filename));
    assert.equal(resolveManualPath(`https://example.com/docs/${filename}`, appUrl, resources), null);
    assert.equal(resolveManualPath(new URL(`../docs/${filename}`, appUrl).href, appUrl, resources), null);
  }
  assert.equal(resolveManualPath('invalid', appUrl, resources), null);
  assert.equal(resolveManualPath(new URL('docs/other.pdf', appUrl).href, appUrl, resources), null);
});
