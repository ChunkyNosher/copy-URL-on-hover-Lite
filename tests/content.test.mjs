import assert from "node:assert/strict";
import test from "node:test";

test("content script resolves the live pointer target and captures shortcuts", async () => {
  const listeners = { document: new Map(), window: new Map() };
  const copied = [];
  const resolveCalls = [];
  let editable = false;
  let shortcutChecks = 0;
  const tweetBody = { nodeType: 1 };
  const hoveredTweet = {
    url: "https://x.com/OpenAI/status/123",
    element: tweetBody,
  };
  const settings = {
    copyUrl: { key: "y", ctrl: false, alt: false, shift: false },
    copyRawUrl: { key: "", ctrl: false, alt: false, shift: false },
    copyText: { key: "x", ctrl: false, alt: false, shift: false },
    openLink: { key: "o", ctrl: false, alt: false, shift: false },
    cleanTrackingParameters: false,
    showNotification: false,
  };

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        async writeText(value) {
          copied.push(value);
        },
      },
    },
  });
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
    cleanUrl: (value) => value,
    isEditableEvent: () => editable,
    matchesShortcut(event, shortcut) {
      shortcutChecks += 1;
      return event.key === "y" && shortcut === settings.copyUrl;
    },
    normalizeSettings: () => settings,
    resolveLink(event, baseUrl) {
      resolveCalls.push({ event, baseUrl });
      return event.target === tweetBody ? hoveredTweet : null;
    },
  };
  globalThis.document = {
    activeElement: null,
    baseURI: "https://x.com/app/",
    addEventListener(type, listener, options) {
      listeners.document.set(type, { listener, options });
    },
    elementFromPoint() {
      return tweetBody;
    },
  };
  globalThis.window = {
    addEventListener(type, listener, options) {
      listeners.window.set(type, { listener, options });
    },
  };

  await import(`../content.js?test=${Date.now()}`);
  await Promise.resolve();

  assert.equal(listeners.document.has("pointerover"), true);
  assert.equal(listeners.document.has("keydown"), false);
  assert.equal(listeners.window.get("keydown")?.options, true);

  const keydown = listeners.window.get("keydown").listener;
  const pointerover = listeners.document.get("pointerover").listener;
  editable = true;
  keydown({
    key: "y",
    preventDefault() {
      assert.fail("editable shortcuts must not be captured");
    },
  });
  assert.equal(shortcutChecks, 0);

  editable = false;
  pointerover({
    target: tweetBody,
    clientX: 120,
    clientY: 240,
  });
  assert.equal(resolveCalls.at(-1).baseUrl, "https://x.com/app/");

  let prevented = false;
  let propagationStopped = false;
  keydown({
    key: "y",
    preventDefault() {
      prevented = true;
    },
    stopImmediatePropagation() {
      propagationStopped = true;
    },
  });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(prevented, true);
  assert.equal(propagationStopped, true);
  assert.deepEqual(copied, ["https://x.com/OpenAI/status/123"]);
  assert.equal(resolveCalls.length, 2);
  assert.equal(resolveCalls.at(-1).event.target, tweetBody);
  assert.equal(resolveCalls.at(-1).baseUrl, "https://x.com/app/");
});
