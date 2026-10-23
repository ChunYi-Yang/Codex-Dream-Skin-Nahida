import assert from "node:assert/strict";
import test from "node:test";
import { createLayoutAdapter } from "../../runtime/layout-adapter.mjs";

function fixture({ home = false, thread = false, settings = false, secondary = false, hiddenHome = false, overlay = false } = {}) {
  const nodes = new Map();
  const make = (visible = true) => ({
    hidden: !visible, isConnected: true,
    getBoundingClientRect: () => ({ left: 300, top: 80, right: 1100, bottom: 780, width: 800, height: 700 }),
    closest: () => null, querySelector: () => null, querySelectorAll: () => [],
    setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
  });
  const main = make();
  nodes.set("main", [main]);
  if (home || hiddenHome) nodes.set("home", [make(!hiddenHome)]);
  if (thread) nodes.set("thread", [make()]);
  if (settings) nodes.set("settings", [make()]);
  if (secondary) nodes.set("secondary", [make()]);
  if (overlay) nodes.set("overlay", [make()]);
  const root = make();
  const document = { documentElement: root, querySelectorAll(selector) { return nodes.get(selector) ?? []; } };
  const window = { innerWidth: 1280, innerHeight: 800, getComputedStyle: (node) => ({ display: node.hidden ? "none" : "block", visibility: "visible", opacity: "1" }) };
  const contract = { selectors: [
    { key: "shell-main", selector: "main" }, { key: "home-composer", selector: "home" },
    { key: "thread-surface", selector: "thread" }, { key: "settings-panel", selector: "settings" },
    { key: "secondary-page", selector: "secondary" }, { key: "overlay-dialog", selector: "overlay" },
  ] };
  return { adapter: createLayoutAdapter(document, window, contract), main, root, nodes, make, contract };
}

test("all public community regions receive owned and recoverable attributes", () => {
  const app = fixture();
  const marked = new Map();
  const regions = [[app.root, "root"], [app.make(), "project-list"], [app.make(), "message"], [app.make(), "dialog"]];
  for (const [node, part] of regions) {
    node.getAttribute = () => marked.get(node) ?? null;
    node.setAttribute = (_, value) => marked.set(node, value);
    node.removeAttribute = () => marked.delete(node);
    if (part !== "root") {
      app.nodes.set(part, [node]);
      app.contract.selectors.push({key: part === "dialog" ? "overlay-dialog" : part, selector: part});
    }
  }
  // Recreate after registering selectors.
  const adapter = createLayoutAdapter({ documentElement: app.root, querySelectorAll: selector => app.nodes.get(selector) ?? [] },
    { innerWidth: 1280, innerHeight: 800, getComputedStyle: () => ({display:"block",visibility:"visible",opacity:"1"}) }, app.contract);
  adapter.discover();
  for (const [node, part] of regions) assert.equal(marked.get(node), part);
  adapter.cleanup();
  assert.equal(marked.size, 0);
});

test("visible native home placement identifies the new home without home-icon", () => {
  assert.equal(fixture({ home: true }).adapter.discover().page, "home");
});
test("a retained hidden home cannot activate decorations", () => {
  assert.equal(fixture({ hiddenHome: true }).adapter.discover().page, "unknown");
});
test("a composer-shaped region alone is not a home", () => {
  assert.equal(fixture().adapter.discover().page, "unknown");
});
for (const [state, flags] of [["thread", { home: true, thread: true }], ["settings", { home: true, settings: true }], ["secondary", { home: true, secondary: true }]]) {
  test(`${state} takes precedence over retained home signals`, () => assert.equal(fixture(flags).adapter.discover().page, state));
}
test("dialog overlay retains the underlying page state", () => {
  const result = fixture({ thread: true, overlay: true }).adapter.discover();
  assert.equal(result.page, "thread");
  assert.equal(result.overlay, true);
});
test("cleanup restores attributes that predated the theme", () => {
  const app = fixture({ home: true });
  const attributes = new Map([["data-ds-part", "original"]]);
  app.main.getAttribute = (key) => attributes.get(key) ?? null;
  app.main.setAttribute = (key, value) => attributes.set(key, value);
  app.main.removeAttribute = (key) => attributes.delete(key);
  app.adapter.discover();
  assert.equal(attributes.get("data-ds-part"), "main");
  app.adapter.cleanup();
  assert.equal(attributes.get("data-ds-part"), "original");
});
