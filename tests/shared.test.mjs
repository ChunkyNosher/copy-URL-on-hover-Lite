import assert from "node:assert/strict";
import test from "node:test";

await import("../shared.js");
const {
  cleanUrl,
  isEditableEvent,
  matchesShortcut,
  normalizeSettings,
  resolveLink,
  shortcutFromKeyboardEvent,
} = globalThis.CopyUrlHoverLite;

test("cleanUrl removes tracking parameters but preserves useful query data", () => {
  assert.equal(
    cleanUrl(
      "https://example.com/article?id=42&utm_source=newsletter&fbclid=abc",
    ),
    "https://example.com/article?id=42",
  );
});

test("cleanUrl canonicalizes trusted Amazon product URLs", () => {
  assert.equal(
    cleanUrl("https://www.amazon.com/gp/product/B012345678?tag=affiliate"),
    "https://www.amazon.com/dp/B012345678/",
  );
});

test("shortcut matching requires an exact modifier match and ignores repeats", () => {
  const shortcut = { key: "y", ctrl: false, alt: false, shift: false };
  assert.equal(
    matchesShortcut(
      {
        key: "y",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        repeat: false,
      },
      shortcut,
    ),
    true,
  );
  assert.equal(
    matchesShortcut(
      {
        key: "y",
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        repeat: false,
      },
      shortcut,
    ),
    false,
  );
  assert.equal(
    matchesShortcut(
      {
        key: "y",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        repeat: true,
      },
      shortcut,
    ),
    false,
  );
});

test("editable controls in a composed event path suppress shortcuts", () => {
  const host = {
    matches: () => false,
    closest: () => null,
  };
  const input = {
    matches: (selector) => selector.includes("input"),
    closest: () => null,
  };

  assert.equal(
    isEditableEvent(
      {
        target: host,
        composedPath: () => [host, input],
      },
      { activeElement: host },
    ),
    true,
  );
});

test("editable controls inside an active shadow root suppress shortcuts", () => {
  const input = {
    matches: (selector) => selector.includes("input"),
    closest: () => null,
  };
  const host = {
    matches: () => false,
    closest: () => null,
    shadowRoot: { activeElement: input },
  };

  assert.equal(
    isEditableEvent({ target: host }, { activeElement: host }),
    true,
  );
});

test("role-link cards resolve their semantic data URL", () => {
  const card = {
    dataset: { href: "/OpenAI/status/123" },
    getAttribute: () => null,
    matches: (selector) => selector === '[role="link"]',
  };
  const child = {
    dataset: {},
    getAttribute: () => null,
    matches: () => false,
  };

  assert.deepEqual(
    resolveLink(
      {
        target: child,
        composedPath: () => [child, card],
      },
      "https://x.com/home",
    ),
    {
      url: "https://x.com/OpenAI/status/123",
      element: card,
    },
  );
});

test("unrelated data attributes are not treated as links", () => {
  const wrapper = {
    dataset: { href: "/not-a-link" },
    getAttribute: () => null,
    matches: () => false,
  };

  assert.equal(
    resolveLink(
      {
        target: wrapper,
        composedPath: () => [wrapper],
      },
      "https://example.com/",
    ),
    null,
  );
});

test("placeholder anchors fall through to their safe data URL", () => {
  const anchor = {
    dataset: { href: "/real-destination" },
    getAttribute: (name) =>
      name === "href" ? "javascript:void(0)" : null,
    href: "javascript:void(0)",
    matches: (selector) => selector.includes("a[href]"),
  };

  assert.deepEqual(
    resolveLink(
      {
        target: anchor,
        composedPath: () => [anchor],
      },
      "https://example.com/base/",
    ),
    {
      url: "https://example.com/real-destination",
      element: anchor,
    },
  );
});

test("article bodies resolve through their timestamp permalink", () => {
  const anchor = {
    dataset: {},
    getAttribute: (name) =>
      name === "href" ? "/OpenAI/status/123" : null,
    href: "",
    matches: (selector) => selector.includes("a[href]"),
  };
  const timestamp = {
    closest: (selector) => (selector === "a[href]" ? anchor : null),
  };
  const article = {
    matches: (selector) => selector.includes("article"),
    querySelector: (selector) =>
      selector === "a[href] time" ? timestamp : null,
  };
  const body = {
    dataset: {},
    getAttribute: () => null,
    matches: () => false,
  };

  assert.deepEqual(
    resolveLink(
      {
        target: body,
        composedPath: () => [body, article],
      },
      "https://x.com/home",
    ),
    {
      url: "https://x.com/OpenAI/status/123",
      element: article,
    },
  );
});

test("point-only resolution climbs from an article to its link card", () => {
  const card = {
    dataset: { href: "/OpenAI/status/456" },
    getAttribute: () => null,
    matches: (selector) => selector.includes('[role="link"]'),
    closest() {
      return this;
    },
  };
  const article = {
    matches: (selector) => selector.includes("article"),
    parentElement: card,
    querySelector: () => null,
  };
  const body = {
    nodeType: 1,
    closest: () => article,
  };

  assert.deepEqual(
    resolveLink({ target: body }, "https://x.com/home"),
    {
      url: "https://x.com/OpenAI/status/456",
      element: card,
    },
  );
});

test("normalizeSettings accepts named keys and rejects malformed visual values", () => {
  const settings = normalizeSettings({
    copyUrl: { key: "F8" },
    tooltipColor: "red",
    tooltipDuration: 100,
    notifPosition: "middle",
  });
  assert.equal(settings.copyUrl.key, "f8");
  assert.equal(settings.tooltipColor, "#f26b4f");
  assert.equal(settings.tooltipDuration, 1500);
  assert.equal(settings.notifPosition, "bottom-right");
});

test("shortcut recorder captures a complete keyboard stroke", () => {
  assert.deepEqual(
    shortcutFromKeyboardEvent({
      key: "K",
      ctrlKey: true,
      altKey: false,
      shiftKey: true,
      metaKey: false,
    }),
    { key: "k", ctrl: true, alt: false, shift: true },
  );
  assert.equal(
    shortcutFromKeyboardEvent({
      key: "Shift",
      ctrlKey: false,
      altKey: false,
      shiftKey: true,
      metaKey: false,
    }),
    null,
  );
  assert.equal(
    shortcutFromKeyboardEvent({
      key: "K",
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: true,
    }),
    null,
  );
});
