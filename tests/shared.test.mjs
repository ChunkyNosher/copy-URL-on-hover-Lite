import assert from "node:assert/strict";
import test from "node:test";

await import("../shared.js");
const {
  cleanUrl,
  matchesShortcut,
  normalizeSettings,
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
