import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const template = await fs.readFile(new URL("../assets/renderer-inject.js", import.meta.url), "utf8");
const start = template.indexOf("    const homeMarker =");
const end = template.indexOf("    for (const candidate", start);
assert.ok(start >= 0 && end > start);
const detection = template.slice(start, end);

function detect(markers, blocksHome = false) {
  const surface = {};
  const document = {
    querySelectorAll(selector) {
      assert.ok(selector.includes('[data-composer-placement="home"]'));
      assert.ok(!selector.includes(".composer-surface-chrome"));
      return markers.map((visible) => ({
        visible,
        closest: () => surface,
      }));
    },
  };
  return vm.runInNewContext(`${detection}\nhomeActive`, {
    document, blocksHome, runtime: { scope: {} }, isVisibleSurface: (node) => node.visible,
  });
}

test("loading secondary pages without New chat markers do not receive the hero", () => {
  assert.equal(detect([]), false);
});

test("hidden retained home surfaces do not activate the hero", () => {
  assert.equal(detect([false]), false);
});

test("visible New chat activates the hero unless another route blocks it", () => {
  assert.equal(detect([false, true]), true);
  assert.equal(detect([true], true), false);
});
