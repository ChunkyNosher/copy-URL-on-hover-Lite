import assert from 'node:assert/strict';
import test from 'node:test';

await import('../shared.js');
const { cleanUrl, matchesShortcut, normalizeSettings } = globalThis.CopyUrlHoverLite;

test('cleanUrl removes tracking parameters but preserves useful query data', () => {
  assert.equal(
    cleanUrl('https://example.com/article?id=42&utm_source=newsletter&fbclid=abc'),
    'https://example.com/article?id=42'
  );
});

test('cleanUrl canonicalizes trusted Amazon product URLs', () => {
  assert.equal(
    cleanUrl('https://www.amazon.com/gp/product/B012345678?tag=affiliate'),
    'https://www.amazon.com/dp/B012345678/'
  );
});

test('shortcut matching requires an exact modifier match and ignores repeats', () => {
  const shortcut = { key: 'y', ctrl: false, alt: false, shift: false };
  assert.equal(matchesShortcut({ key: 'y', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, repeat: false }, shortcut), true);
  assert.equal(matchesShortcut({ key: 'y', ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, repeat: false }, shortcut), false);
  assert.equal(matchesShortcut({ key: 'y', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, repeat: true }, shortcut), false);
});

test('normalizeSettings rejects malformed values and preserves safe defaults', () => {
  const settings = normalizeSettings({ copyUrl: { key: 'long' }, notificationColor: 'red', notificationDuration: 100 });
  assert.equal(settings.copyUrl.key, 'l');
  assert.equal(settings.notificationColor, '#2563eb');
  assert.equal(settings.notificationDuration, 1600);
});
