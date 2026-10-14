import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { loadPayload, verifySession } from "../scripts/injector.mjs";

function rendererFixture() {
  const ids = new Map();
  const nodes = [];
  const element = () => {
    const classes = new Set();
    const attributes = new Map();
    const properties = new Map();
    const node = {
      dataset: {}, textContent: "", childNodes: [], children: [], isConnected: true,
      classList: {
        add: (...values) => values.forEach((value) => classes.add(value)),
        remove: (...values) => values.forEach((value) => classes.delete(value)),
        toggle: (value, on) => on ? classes.add(value) : classes.delete(value),
        [Symbol.iterator]: () => classes.values(),
      },
      style: { setProperty: (key, value) => properties.set(key, value),
        removeProperty: (key) => properties.delete(key), [Symbol.iterator]: () => properties.keys() },
      setAttribute: (key, value) => attributes.set(key, value),
      getAttribute: (key) => attributes.get(key) ?? null,
      removeAttribute: (key) => attributes.delete(key),
      getBoundingClientRect: () => ({ x: 0, y: 0, left: 0, top: 0, right: 1000, bottom: 700, width: 1000, height: 700 }),
      querySelector: () => null, querySelectorAll: () => [],
      appendChild(child) { child.parentElement = node; if (child.id) ids.set(child.id, child); },
      remove() { ids.delete(node.id); node.isConnected = false; },
    };
    nodes.push(node);
    return node;
  };
  const root = element();
  Object.assign(root, { scrollWidth: 1280, clientWidth: 1280, scrollHeight: 800, clientHeight: 800 });
  const shell = element(); const sidebar = element(); const composer = element();
  const document = {
    documentElement: root, body: element(), head: element(), visibilityState: "visible", hidden: false,
    createElement: element, getElementById: (id) => ids.get(id) ?? null,
    querySelector(selector) {
      if (selector.includes("main.main-surface") || selector.startsWith("main:is(")) return shell;
      if (selector === "aside.app-shell-left-panel") return sidebar;
      if (selector.includes(".composer-surface-chrome") || selector.includes("data-codex-composer-root")) return composer;
      return null;
    },
    querySelectorAll: (selector) => selector === "[class]" ? nodes : [],
  };
  const revoked = [];
  const context = {
    document, window: { innerWidth: 1280, innerHeight: 800 }, innerWidth: 1280, innerHeight: 800,
    getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
    atob, Blob, Uint8Array,
    URL: { createObjectURL: () => `blob:fixture-${nodes.length}-${Math.random()}`, revokeObjectURL: (url) => revoked.push(url) },
    MutationObserver: class { observe() {} disconnect() {} },
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
  };
  return { context, root, ids, revoked };
}

test("shipped layered renderer installs, verifies its real contract, and cleans up", async () => {
  const loaded = await loadPayload();
  const fixture = rendererFixture();
  vm.runInNewContext(loaded.payload, fixture.context);
  assert.equal(fixture.root.getAttribute("data-dream-skin"), "active");
  assert.ok(fixture.ids.get("codex-dream-skin-style").textContent.length > 1000);
  const session = {
    send: async () => ({ windowId: 1, bounds: { width: 1280, height: 800, windowState: "normal" } }),
    evaluate: async (expression) => vm.runInNewContext(expression, fixture.context),
  };
  const verified = await verifySession(session, "fixture", loaded.theme.id, loaded.revision);
  assert.equal(verified.pass, true, JSON.stringify(verified.readiness));
  const unknown = fixture.context.document.createElement("div");
  unknown.classList.add("dream-unexpected-native-mutation");
  assert.equal((await verifySession(session, "fixture", loaded.theme.id, loaded.revision)).pass, false);
  unknown.classList.remove("dream-unexpected-native-mutation");
  assert.equal((await verifySession(session, "fixture", loaded.theme.id, "wrong-revision")).pass, false);
  const runtime = fixture.context.window.__CODEX_DREAM_SKIN_STATE__;
  runtime.cleanup();
  assert.equal(fixture.root.getAttribute("data-dream-skin"), null);
  assert.equal(fixture.ids.has("codex-dream-skin-style"), false);
  assert.ok(fixture.revoked.length > 0);
  assert.equal(fixture.context.window.__CODEX_DREAM_SKIN_STATE__, undefined);
});
