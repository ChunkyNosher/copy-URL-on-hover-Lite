import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const popup = await readFile(new URL("../popup.html", import.meta.url), "utf8");

test("popup ships an in-panel CSP-safe color picker instead of native color dialogs", async () => {
  assert.match(popup, /vendor\/vanilla-picker\.csp\.css/);
  assert.match(popup, /vendor\/vanilla-picker\.csp\.min\.js/);
  assert.doesNotMatch(popup, /type="color"/);
  await Promise.all([
    readFile(new URL("../vendor/vanilla-picker.csp.css", import.meta.url)),
    readFile(new URL("../vendor/vanilla-picker.csp.min.js", import.meta.url)),
    readFile(new URL("../vendor/vanilla-picker.LICENSE.md", import.meta.url)),
  ]);
});
