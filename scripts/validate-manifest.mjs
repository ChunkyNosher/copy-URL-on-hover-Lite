import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url)));
assert.equal(manifest.manifest_version, 3, 'Lite uses Manifest V3');
assert.ok(manifest.content_scripts?.length, 'content script is registered');
assert.deepEqual([...manifest.permissions].sort(), ['clipboardWrite', 'storage'], 'only copy settings permissions are requested');
assert.deepEqual(manifest.host_permissions, ['<all_urls>'], 'copying is available on supported web pages');
assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions.required, ['none'], 'manifest declares no data collection');
assert.ok(!('background' in manifest), 'Lite has no Quick Tabs background coordinator');
assert.ok(!('sidebar_action' in manifest), 'Lite has no Quick Tabs sidebar');
assert.ok(!JSON.stringify(manifest).match(/quick.?tabs/i), 'manifest contains no Quick Tabs configuration');
console.log('Manifest validation passed.');
