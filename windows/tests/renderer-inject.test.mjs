import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const template = await fs.readFile(new URL("../assets/renderer-inject.js", import.meta.url), "utf8");

function fixture({ shell = true, pathname = "/index.html", protocol = "app:", home = false, width = 1200, reducedMotion = false } = {}) {
  const nodes = new Set();
  const timers = new Set();
  const observers = new Set();
  let sequence = 0;
  const makeNode = (tagName) => {
    const classes = new Set();
    const attrs = new Map();
    const properties = new Map();
    const node = {
      tagName, dataset: {}, children: [], parentElement: null, textContent: "",
      style: { setProperty: (key, value) => properties.set(key, value), removeProperty: (key) => properties.delete(key), getPropertyValue: (key) => properties.get(key) ?? "" },
      classList: { add: (...items) => items.forEach((item) => classes.add(item)), remove: (...items) => items.forEach((item) => classes.delete(item)), contains: (item) => classes.has(item), toggle: (item, value) => value ? classes.add(item) : classes.delete(item) },
      setAttribute: (key, value) => attrs.set(key, value), removeAttribute: (key) => attrs.delete(key), getAttribute: (key) => attrs.get(key) ?? null,
      getBoundingClientRect: () => ({ x: 220, y: 40, left: 220, top: 40, right: 1280, bottom: 760, width: 1060, height: 720 }),
      appendChild(child) { child.parentElement = this; this.children.push(child); nodes.add(child); return child; },
      remove() { nodes.delete(this); this.parentElement = null; },
      querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    };
    nodes.add(node);
    return node;
  };
  const root = makeNode("HTML");
  const body = makeNode("BODY");
  const main = makeNode("MAIN");
  main.classList.add("main-surface");
  const document = {
    documentElement: root, body, createElement: makeNode,
    getElementById: (id) => [...nodes].find((node) => node.id === id) ?? null,
    querySelector(selector) { return shell && (selector === "main.main-surface" || selector.startsWith("main.main-surface,")) ? main : null; },
    querySelectorAll: (selector) => shell && (selector.startsWith("main:") || (home && selector.includes('data-composer-placement="home"'))) ? [main] : [],
  };
  const context = {
    window: { innerWidth: 1280, innerHeight: 800 }, location: { protocol, pathname }, document,
    URL, Blob, Uint8Array, atob,
    getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
    MutationObserver: class { constructor() { observers.add(this); } observe() {} disconnect() { observers.delete(this); } },
    setInterval: () => { const id = ++sequence; timers.add(id); return id; }, clearInterval: (id) => timers.delete(id),
    setTimeout: () => { const id = ++sequence; timers.add(id); return id; }, clearTimeout: (id) => timers.delete(id),
  };
  context.window.getComputedStyle = context.getComputedStyle;
  if (home) main.getBoundingClientRect = () => ({ left: 200, top: 40, right: 200 + width, bottom: 940, width, height: 900 });
  context.window.innerWidth = 200 + width;
  context.window.innerHeight = 1000;
  context.window.matchMedia = () => ({ matches: reducedMotion });
  vm.createContext(context);
  const run = () => vm.runInContext(template
    .replace("__DREAM_SKIN_CSS_JSON__", () => JSON.stringify("test CSS"))
    .replace("__DREAM_SKIN_ART_JSON__", () => JSON.stringify({}))
    .replace("__DREAM_SKIN_THEME_JSON__", () => JSON.stringify({ id: "nahida-dream", name: "纳西妲", colors: {} }))
    .replace("__DREAM_SKIN_VERSION_JSON__", () => JSON.stringify("test"))
    .replace("__DREAM_SKIN_PAYLOAD_REVISION_JSON__", () => JSON.stringify("test-revision")), context);
  return { context, root, document, nodes, timers, observers, run };
}

test("owned scene and decoration layers follow full, compact and reduced-motion policy", () => {
  for (const [width, reducedMotion, sceneVisible, decorationsVisible] of [[1200, false, true, true], [800, false, true, false], [1200, true, true, false]]) {
    const app = fixture({ home: true, width, reducedMotion });
    app.run();
    const scene = [...app.nodes].find(node => node.className === "nahida-scene");
    const decorations = [...app.nodes].find(node => node.className === "nahida-decorations");
    assert.ok(scene);
    assert.ok(decorations);
    assert.equal(scene.style.display !== "none", sceneVisible);
    assert.equal(decorations.style.display !== "none", decorationsVisible);
    app.context.window.__CODEX_DREAM_SKIN_STATE__.cleanup();
    assert.equal(app.document.getElementById("codex-dream-skin-chrome"), null);
  }
});

test("repeated injection replaces the previous observer and decorations", () => {
  const app = fixture();
  app.run();
  app.run();
  assert.equal(app.observers.size, 1);
  assert.equal(app.timers.size, 1);
  assert.equal([...app.nodes].filter((node) => node.id === "codex-dream-skin-style").length, 1);
  assert.equal([...app.nodes].filter((node) => node.id === "codex-dream-skin-chrome").length, 1);
});

test("cleanup removes all owned runtime resources", () => {
  const app = fixture();
  app.run();
  assert.equal(app.root.getAttribute("data-dream-skin"), "active");
  app.context.window.__CODEX_DREAM_SKIN_STATE__.cleanup();
  assert.equal(app.root.getAttribute("data-dream-skin"), null);
  assert.equal(app.document.getElementById("codex-dream-skin-style"), null);
  assert.equal(app.document.getElementById("codex-dream-skin-chrome"), null);
  assert.equal(app.timers.size, 0);
  assert.equal(app.observers.size, 0);
  assert.equal(app.context.window.__CODEX_DREAM_SKIN_STATE__, undefined);
});

test("native nodes do not receive theme business classes", () => {
  const app = fixture();
  app.run();
  assert.equal(app.root.classList.contains("codex-dream-skin"), false);
  assert.equal(app.context.window.__CODEX_DREAM_SKIN_STATE__.revision, "test-revision");
});

for (const [name, options] of [
  ["pet overlay", { pathname: "/avatar-overlay" }],
  ["pet composition surface", { pathname: "/avatar-overlay-composition-surface.html" }],
  ["browser page", { protocol: "https:" }],
]) {
  test(`renderer refuses ${name} even with shell-like markup`, () => {
    const app = fixture(options);
    const result = app.run();
    assert.equal(result.installed, false);
    assert.equal(app.document.getElementById("codex-dream-skin-style"), null);
    assert.equal(app.root.getAttribute("data-dream-skin"), null);
    assert.equal(app.timers.size, 0);
  });
}
