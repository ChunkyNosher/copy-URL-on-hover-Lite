import assert from "node:assert/strict";
import test from "node:test";

test("content script captures shortcuts on window before page hotkeys", async () => {
  const listeners = { document: new Map(), window: new Map() };
  const settings = {
    copyUrl: { key: "y", ctrl: false, alt: false, shift: false },
    copyRawUrl: { key: "", ctrl: false, alt: false, shift: false },
    copyText: { key: "x", ctrl: false, alt: false, shift: false },
    openLink: { key: "o", ctrl: false, alt: false, shift: false },
  };

  globalThis.browser = {
    storage: {
      local: {
        get: async () => ({ settings }),
      },
      onChanged: {
        addListener() {},
      },
    },
  };
  globalThis.CopyUrlHoverLite = {
    isEditableEvent: () => false,
    matchesShortcut: () => false,
    normalizeSettings: () => settings,
    resolveLink: () => null,
  };
  globalThis.document = {
    addEventListener(type, listener, options) {
      listeners.document.set(type, { listener, options });
    },
  };
  globalThis.window = {
    addEventListener(type, listener, options) {
      listeners.window.set(type, { listener, options });
    },
    location: { href: "https://x.com/home" },
  };

  await import(`../content.js?test=${Date.now()}`);

  assert.equal(listeners.document.has("pointerover"), true);
  assert.equal(listeners.document.has("keydown"), false);
  assert.equal(listeners.window.get("keydown")?.options, true);
});
