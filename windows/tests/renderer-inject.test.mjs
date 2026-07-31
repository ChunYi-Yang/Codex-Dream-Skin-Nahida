import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const windowsRoot = path.resolve(here, "..");
const template = await fs.readFile(path.join(windowsRoot, "assets", "renderer-inject.js"), "utf8");
const artDataUrls = Object.fromEntries(
  ["hero", "background", "sidebar", "rightPanel", "portrait", "decorations", "scene"].map((slot) =>
    [slot, "data:image/png;base64,AA=="]),
);
const theme = {
  id: "forest-test",
  name: "Forest Test",
  appLabel: "Void Terminal",
  homePrompt: "Build in the void?",
  colors: { accent: "#86d75f", highlight: "#f0a24a" },
};
const payload = template
  .replace("__DREAM_CSS_JSON__", JSON.stringify(".fixture { color: blue; }"))
  .replace("__DREAM_ARTS_JSON__", JSON.stringify(artDataUrls))
  .replace("__DREAM_THEME_JSON__", JSON.stringify(theme))
  .replace("__DREAM_VERSION_JSON__", JSON.stringify("1.1.74"));

function createFixture({
  shellPresent,
  semanticShellPresent = false,
  sidebarPresent = shellPresent,
  homePresent = false,
  homeIconPresent = true,
  homeGameSourcePresent = true,
  homeSuggestionsPresent = false,
  homeComposerPresent = false,
  homeComposerProjectSelectorPresent = true,
  conversationPresent = false,
  visibleConversationPresent = false,
  taskHeaderPresent = false,
  pageSearchPresent = false,
  activeNavText = "",
  settingsPresent = false,
  summaryPanelPresent = false,
  staleSkin = false,
}) {
  const nodes = new Map();
  const rootClasses = new Set([
    ...(staleSkin ? ["codex-dream-skin"] : []),
    ...(summaryPanelPresent ? ["dream-summary-panel-hidden"] : []),
  ]);
  const rootStyles = new Map(staleSkin ? [["--dream-art", "url(\"blob:stale\")"]] : []);
  const revokedUrls = [];
  let hasShell = shellPresent;
  let hasSidebar = sidebarPresent;

  const makeClassList = (classes = new Set()) => ({
    add(value) { classes.add(value); },
    remove(value) { classes.delete(value); },
    toggle(value, enabled) {
      if (enabled) classes.add(value);
      else classes.delete(value);
    },
  });
  const visibleRect = { left: 10, top: 10, right: 210, bottom: 60, width: 200, height: 50 };
  const hiddenRect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  const makeVisibleNode = (textContent = "") => ({
    textContent,
    getBoundingClientRect() { return visibleRect; },
  });
  const makeHiddenNode = (textContent = "") => ({
    textContent,
    getBoundingClientRect() { return hiddenRect; },
  });

  const root = {
    classList: makeClassList(rootClasses),
    style: {
      setProperty(key, value) { rootStyles.set(key, value); },
      removeProperty(key) { rootStyles.delete(key); },
    },
    appendChild(node) {
      node.parentElement = root;
      nodes.set(node.id, node);
    },
  };
  const body = {
    appendChild(node) {
      node.parentElement = body;
      nodes.set(node.id, node);
    },
  };
  const shellMainClasses = new Set();
  const shellMain = {
    classList: makeClassList(shellMainClasses),
    dataset: {},
    querySelector(selector) {
      if (selector === '[data-feature="game-source"]') return null;
      if (selector === ".group\\/home-suggestions") return null;
      return null;
    },
    getBoundingClientRect() {
      return { left: 290, top: 36, width: 990, height: 784 };
    },
  };
  const sidebarBrandClasses = new Set();
  const sidebarBrand = {
    classList: makeClassList(sidebarBrandClasses),
    dataset: {},
    textContent: "Codex",
  };
  const activePageNav = makeVisibleNode(activeNavText);
  const homeClasses = new Set();
  const homeHeroSurfaceClasses = new Set();
  const homeComposerSurfaceClasses = new Set();
  const homeIcon = {
    getBoundingClientRect() { return visibleRect; },
  };
  const homeGameSource = {
    classList: makeClassList(),
    dataset: {},
    textContent: "What should we build in codex_theme?",
    getBoundingClientRect() { return visibleRect; },
  };
  const homeSuggestions = {};
  const homeHeroSurface = {
    classList: makeClassList(homeHeroSurfaceClasses),
    parentElement: null,
    contains(node) {
      return (homeIconPresent && node === homeIcon) || node === homeGameSource;
    },
    querySelector(selector) {
      if (selector === '[data-testid="home-icon"]') return homeIconPresent ? homeIcon : null;
      if (selector === '[data-feature="game-source"]') {
        return homeGameSourcePresent ? homeGameSource : null;
      }
      return null;
    },
    getBoundingClientRect() {
      return { left: 10, top: 10, right: 610, bottom: 230, width: 600, height: 220 };
    },
  };
  const homeComposerChrome = {
    parentElement: null,
    getBoundingClientRect() { return visibleRect; },
    closest(selector) {
      if (selector !== '[class~="sticky"]') return null;
      for (let node = this.parentElement; node; node = node.parentElement) {
        if (node.isSticky) return node;
      }
      return null;
    },
  };
  const homeComposerSurface = {
    classList: makeClassList(homeComposerSurfaceClasses),
    parentElement: null,
    isSticky: true,
    querySelector(selector) {
      if (selector === '[class*="group/project-selector"]' && homeComposerProjectSelectorPresent) {
        return {};
      }
      if (selector === ".composer-surface-chrome" && homeComposerPresent) return homeComposerChrome;
      return null;
    },
    getBoundingClientRect() { return visibleRect; },
  };
  const home = {
    classList: makeClassList(homeClasses),
    contains(node) {
      return node === homeHeroSurface || homeHeroSurface.contains(node) ||
        node === homeComposerSurface || node === homeComposerChrome;
    },
    querySelector(selector) {
      if (selector === '[data-feature="game-source"]') {
        return homeGameSourcePresent ? homeGameSource : null;
      }
      if (selector === '[data-testid="home-icon"]') return homeIconPresent ? homeIcon : null;
      if (selector === ".composer-surface-chrome") return homeComposerPresent ? homeComposerChrome : null;
      if (selector === ".group\\/home-suggestions") {
        return homeSuggestionsPresent ? homeSuggestions : null;
      }
      return null;
    },
  };
  homeHeroSurface.parentElement = home;
  homeIcon.parentElement = homeHeroSurface;
  homeGameSource.parentElement = homeHeroSurface;
  homeComposerSurface.parentElement = home;
  homeComposerChrome.parentElement = homeComposerSurface;
  const settingsSurfaceClasses = new Set();
  const settingsSurface = { classList: makeClassList(settingsSurfaceClasses) };
  const summarySurfaceClasses = new Set();
  const appendNode = function appendNode(node) {
    node.parentElement = this;
    nodes.set(node.id, node);
  };
  const summarySurface = {
    classList: makeClassList(summarySurfaceClasses),
    appendChild: appendNode,
  };
  const summaryPanel = {
    firstElementChild: { firstElementChild: summarySurface },
  };
  const shellHeader = {
    textContent: taskHeaderPresent ? "Task title" : "",
    getBoundingClientRect() { return visibleRect; },
    appendChild: appendNode,
  };
  const staleHome = { classList: makeClassList(new Set(["dream-home"])) };
  const staleShell = { classList: makeClassList(new Set(["dream-home-shell"])) };

  const createElement = () => ({
    id: "",
    dataset: {},
    style: {},
    classList: makeClassList(),
    parentElement: null,
    textContent: "",
    innerHTML: "",
    listeners: new Map(),
    setAttribute() {},
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    click() { this.listeners.get("click")?.(); },
    remove() { nodes.delete(this.id); },
  });
  if (staleSkin) {
    const style = createElement();
    style.id = "codex-dream-skin-style";
    nodes.set(style.id, style);
    const chrome = createElement();
    chrome.id = "codex-dream-skin-chrome";
    nodes.set(chrome.id, chrome);
  }
  if (summaryPanelPresent) {
    for (const id of ["codex-dream-summary-panel-close", "codex-dream-summary-panel-reopen"]) {
      const control = createElement();
      control.id = id;
      nodes.set(id, control);
    }
  }

  const document = {
    documentElement: root,
    head: root,
    body,
    createElement,
    getElementById(id) { return nodes.get(id) ?? null; },
    querySelector(selector) {
      if (selector === "main.main-surface") return hasShell ? shellMain : null;
      if (selector === "main.main-surface, main[data-app-shell-main-surface]") {
        return hasShell || semanticShellPresent ? shellMain : null;
      }
      if (selector === 'aside.app-shell-left-panel button[aria-label^="切换模式"] span.font-semibold') {
        return hasSidebar ? sidebarBrand : null;
      }
      if (selector === '[role="main"]:has([data-testid="home-icon"])') {
        return homePresent && homeIconPresent ? home : null;
      }
      if (selector === '[role="main"]:has([data-feature="game-source"])') {
        return homePresent && homeGameSourcePresent ? home : null;
      }
      if (selector === '[role="main"]:has(.composer-surface-chrome)') {
        return homePresent && homeComposerPresent ? home : null;
      }
      if (selector === '[data-thread-find-target="conversation"]') {
        return conversationPresent ? makeHiddenNode("stale conversation") : null;
      }
      if (selector === "#scheduled-page-search, #plugins-page-search") {
        return pageSearchPresent ? makeVisibleNode() : null;
      }
      if (selector === "aside.app-shell-left-panel") return hasSidebar ? {} : null;
      if (selector === "[data-settings-panel-slug]") return settingsPresent ? {} : null;
      if (selector === "div.main-surface") return settingsPresent ? settingsSurface : null;
      if (selector === '[data-pip-obstacle="thread-summary-panel"]') {
        return summaryPanelPresent ? summaryPanel : null;
      }
      if (selector === "main.main-surface > header.app-header-tint") {
        return (taskHeaderPresent || summaryPanelPresent) ? shellHeader : null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-dream-sidebar-original-text]" &&
          "dreamSidebarOriginalText" in sidebarBrand.dataset) return [sidebarBrand];
      if (selector === '[role="main"].dream-home' && homeClasses.has("dream-home")) return [home];
      if (selector === ".dream-home" && homeClasses.has("dream-home")) return [home];
      if (selector === ".dream-home-hero-surface" &&
          homeHeroSurfaceClasses.has("dream-home-hero-surface")) return [homeHeroSurface];
      if (selector === ".dream-home-composer-surface" &&
          homeComposerSurfaceClasses.has("dream-home-composer-surface")) return [homeComposerSurface];
      if (selector === '[data-feature="game-source"][data-dream-original-text]' &&
          "dreamOriginalText" in homeGameSource.dataset) return [homeGameSource];
      if (selector === ".thread-scroll-container, [data-thread-find-target=\"conversation\"]") {
        if (visibleConversationPresent) return [makeVisibleNode("You said: hello")];
        if (conversationPresent) return [makeHiddenNode("stale conversation")];
        return [];
      }
      if (selector === "aside.app-shell-left-panel span.font-semibold") {
        return hasSidebar ? [sidebarBrand] : [];
      }
      if (selector === 'aside.app-shell-left-panel [aria-current="page"], aside.app-shell-left-panel [class~="bg-token-list-hover-background"]') {
        return hasSidebar && activeNavText ? [activePageNav] : [];
      }
      if (selector === ".dream-settings-surface" &&
          settingsSurfaceClasses.has("dream-settings-surface")) return [settingsSurface];
      if (selector === ".dream-home-shell" && shellMainClasses.has("dream-home-shell")) {
        return [shellMain];
      }
      if (selector === ".dream-settings-shell" && shellMainClasses.has("dream-settings-shell")) {
        return [shellMain];
      }
      if (selector === ".dream-summary-panel-surface" &&
          summarySurfaceClasses.has("dream-summary-panel-surface")) return [summarySurface];
      if (selector === "[data-dream-main-surface-compat]" &&
          "dreamMainSurfaceCompat" in shellMain.dataset) return [shellMain];
      if (!staleSkin) return [];
      if (selector === ".dream-home") return [staleHome];
      if (selector === ".dream-home-shell") return [staleShell];
      return [];
    },
  };
  const context = {
    window: { innerWidth: 1200, innerHeight: 900 },
    document,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    URL: {
      createObjectURL() { return "blob:fixture"; },
      revokeObjectURL(value) { revokedUrls.push(value); },
    },
    Blob,
    Uint8Array,
    atob,
    getComputedStyle: () => ({
      display: "block",
      visibility: "visible",
      opacity: "1",
      pointerEvents: "none",
    }),
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 2,
    clearTimeout: () => {},
  };

  return {
    context,
    nodes,
    rootClasses,
    rootStyles,
    revokedUrls,
    settingsSurfaceClasses,
    shellMainClasses,
    sidebarBrand,
    sidebarBrandClasses,
    summarySurfaceClasses,
    homeClasses,
    homeHeroSurfaceClasses,
    homeComposerSurfaceClasses,
    homeGameSource,
    setShellPresent(value) { hasShell = value; },
    setSidebarPresent(value) { hasSidebar = value; },
  };
}

const main = createFixture({ shellPresent: true });
const mainResult = vm.runInNewContext(payload, main.context);
assert.equal(mainResult.installed, true);
assert.equal(mainResult.version, "1.1.74");
assert.equal(mainResult.themeId, "forest-test");
assert.equal(main.sidebarBrand.textContent, "Void Terminal");
assert.equal(main.sidebarBrand.dataset.dreamSidebarOriginalText, "Codex");
assert.equal(main.sidebarBrandClasses.has("dream-sidebar-brand"), true);
assert.equal(main.rootClasses.has("codex-dream-skin"), true);
assert.equal(main.rootStyles.get("--dream-art"), 'url("blob:fixture")');
assert.equal(main.rootStyles.get("--dream-background-art"), 'url("blob:fixture")');
assert.equal(main.rootStyles.get("--dream-right-panel-art"), 'url("blob:fixture")');
assert.equal(main.rootStyles.get("--dream-decor-art"), 'url("blob:fixture")');
assert.equal(main.rootStyles.get("--dream-name"), '"Forest Test"');
assert.equal(main.nodes.has("codex-dream-skin-style"), true);
assert.equal(main.nodes.has("codex-dream-skin-chrome"), true);
assert.equal(main.nodes.get("codex-dream-skin-style").dataset.dreamVersion, "1.1.74");
assert.equal(main.context.window.__CODEX_DREAM_SKIN_STATE__.cleanup(), true);
assert.equal(main.sidebarBrand.textContent, "Codex");
assert.equal("dreamSidebarOriginalText" in main.sidebarBrand.dataset, false);
assert.equal(main.sidebarBrandClasses.has("dream-sidebar-brand"), false);
assert.equal(main.rootClasses.has("codex-dream-skin"), false);
assert.equal(main.rootStyles.has("--dream-decor-art"), false);
assert.equal(main.nodes.has("codex-dream-skin-style"), false);
assert.equal(main.nodes.has("codex-dream-skin-chrome"), false);
assert.deepEqual(main.revokedUrls, ["blob:fixture"]);

const collapsedSidebar = createFixture({ shellPresent: true, sidebarPresent: false });
vm.runInNewContext(payload, collapsedSidebar.context);
assert.equal(collapsedSidebar.rootClasses.has("codex-dream-skin"), true);
assert.equal(collapsedSidebar.nodes.has("codex-dream-skin-style"), true);
assert.equal(collapsedSidebar.nodes.has("codex-dream-skin-chrome"), true);

const semanticShell = createFixture({ shellPresent: false, semanticShellPresent: true });
vm.runInNewContext(payload, semanticShell.context);
assert.equal(semanticShell.rootClasses.has("codex-dream-skin"), true);
assert.equal(semanticShell.shellMainClasses.has("main-surface"), true);
assert.equal(semanticShell.shellMain.dataset.dreamMainSurfaceCompat, "true");
semanticShell.context.window.__CODEX_DREAM_SKIN_STATE__.cleanup();
assert.equal(semanticShell.shellMainClasses.has("main-surface"), false);
assert.equal("dreamMainSurfaceCompat" in semanticShell.shellMain.dataset, false);

const home = createFixture({ shellPresent: true, homePresent: true });
vm.runInNewContext(payload, home.context);
assert.equal(home.homeClasses.has("dream-home"), true);
assert.equal(home.homeHeroSurfaceClasses.has("dream-home-hero-surface"), true);
assert.equal(home.shellMainClasses.has("dream-home-shell"), true);
assert.equal(home.shellMainClasses.has("dream-settings-shell"), false);
assert.equal(home.homeGameSource.textContent, "Build in the void?");
assert.equal(home.homeGameSource.dataset.dreamOriginalText, "What should we build in codex_theme?");
home.context.window.__CODEX_DREAM_SKIN_STATE__.cleanup();
assert.equal(home.homeGameSource.textContent, "What should we build in codex_theme?");
assert.equal("dreamOriginalText" in home.homeGameSource.dataset, false);
assert.equal(home.shellMainClasses.has("dream-home-shell"), false);
assert.equal(home.homeHeroSurfaceClasses.has("dream-home-hero-surface"), false);

const homeWithoutIcon = createFixture({
  shellPresent: true,
  homePresent: true,
  homeIconPresent: false,
});
vm.runInNewContext(payload, homeWithoutIcon.context);
assert.equal(homeWithoutIcon.homeClasses.has("dream-home"), true);
assert.equal(homeWithoutIcon.homeHeroSurfaceClasses.has("dream-home-hero-surface"), true);
assert.equal(homeWithoutIcon.shellMainClasses.has("dream-home-shell"), true);

const homeComposer = createFixture({
  shellPresent: true,
  homePresent: true,
  homeIconPresent: false,
  homeComposerPresent: true,
  homeComposerProjectSelectorPresent: false,
});
vm.runInNewContext(payload, homeComposer.context);
assert.equal(homeComposer.homeClasses.has("dream-home"), true);
assert.equal(homeComposer.homeComposerSurfaceClasses.has("dream-home-composer-surface"), true);
assert.equal(homeComposer.shellMainClasses.has("dream-home-shell"), true);

const emptyHome = createFixture({ shellPresent: true, homePresent: true, homeGameSourcePresent: false });
vm.runInNewContext(payload, emptyHome.context);
assert.equal(emptyHome.nodes.has("codex-dream-home-fallback"), true);
emptyHome.context.window.__CODEX_DREAM_SKIN_STATE__.cleanup();
assert.equal(emptyHome.nodes.has("codex-dream-home-fallback"), false);

const emptyStart = createFixture({ shellPresent: true });
vm.runInNewContext(payload, emptyStart.context);
assert.equal(emptyStart.shellMainClasses.has("dream-home-shell"), true);
assert.equal(emptyStart.nodes.has("codex-dream-home-fallback"), true);
emptyStart.context.window.__CODEX_DREAM_SKIN_STATE__.cleanup();
assert.equal(emptyStart.nodes.has("codex-dream-home-fallback"), false);

const staleConversationStart = createFixture({ shellPresent: true, conversationPresent: true });
vm.runInNewContext(payload, staleConversationStart.context);
assert.equal(staleConversationStart.shellMainClasses.has("dream-home-shell"), true);
assert.equal(staleConversationStart.nodes.has("codex-dream-home-fallback"), true);

const visibleConversationPage = createFixture({ shellPresent: true, visibleConversationPresent: true });
vm.runInNewContext(payload, visibleConversationPage.context);
assert.equal(visibleConversationPage.shellMainClasses.has("dream-home-shell"), false);
assert.equal(visibleConversationPage.nodes.has("codex-dream-home-fallback"), false);

const taskPage = createFixture({
  shellPresent: true,
  conversationPresent: true,
  taskHeaderPresent: true,
});
vm.runInNewContext(payload, taskPage.context);
assert.equal(taskPage.shellMainClasses.has("dream-home-shell"), false);
assert.equal(taskPage.nodes.has("codex-dream-home-fallback"), false);

const scheduledPage = createFixture({ shellPresent: true, pageSearchPresent: true });
vm.runInNewContext(payload, scheduledPage.context);
assert.equal(scheduledPage.shellMainClasses.has("dream-home-shell"), false);
assert.equal(scheduledPage.nodes.has("codex-dream-home-fallback"), false);

const pluginDetailPage = createFixture({ shellPresent: true, activeNavText: "插件" });
vm.runInNewContext(payload, pluginDetailPage.context);
assert.equal(pluginDetailPage.shellMainClasses.has("dream-home-shell"), false);
assert.equal(pluginDetailPage.nodes.has("codex-dream-home-fallback"), false);

const pullRequestPage = createFixture({ shellPresent: true, activeNavText: "拉取请求" });
vm.runInNewContext(payload, pullRequestPage.context);
assert.equal(pullRequestPage.shellMainClasses.has("dream-home-shell"), false);
assert.equal(pullRequestPage.shellMainClasses.has("dream-route-shell"), true);
assert.equal(pullRequestPage.nodes.has("codex-dream-home-fallback"), false);

const settings = createFixture({ shellPresent: true, settingsPresent: true });
vm.runInNewContext(payload, settings.context);
assert.equal(settings.settingsSurfaceClasses.has("dream-settings-surface"), true);
assert.equal(settings.shellMainClasses.has("dream-settings-shell"), true);
assert.equal(settings.shellMainClasses.has("dream-home-shell"), false);
settings.context.window.__CODEX_DREAM_SKIN_STATE__.cleanup();
assert.equal(settings.settingsSurfaceClasses.has("dream-settings-surface"), false);
assert.equal(settings.shellMainClasses.has("dream-settings-shell"), false);

const summary = createFixture({ shellPresent: true, summaryPanelPresent: true });
vm.runInNewContext(payload, summary.context);
assert.equal(summary.summarySurfaceClasses.has("dream-summary-panel-surface"), true);
assert.equal(summary.nodes.has("codex-dream-summary-panel-close"), false);
assert.equal(summary.nodes.has("codex-dream-summary-panel-reopen"), false);
assert.equal(summary.rootClasses.has("dream-summary-panel-hidden"), false);
assert.equal("summaryPanelHidden" in summary.context.window.__CODEX_DREAM_SKIN_STATE__, false);

const auxiliary = createFixture({ shellPresent: false, staleSkin: true });
const auxiliaryResult = vm.runInNewContext(payload, auxiliary.context);
assert.equal(auxiliaryResult.installed, true);
assert.equal(auxiliary.rootClasses.has("codex-dream-skin"), false);
assert.equal(auxiliary.rootStyles.has("--dream-art"), false);
assert.equal(auxiliary.rootStyles.has("--dream-decor-art"), false);
assert.equal(auxiliary.nodes.has("codex-dream-skin-style"), false);
assert.equal(auxiliary.nodes.has("codex-dream-skin-chrome"), false);

auxiliary.setShellPresent(true);
auxiliary.context.window.__CODEX_DREAM_SKIN_STATE__.ensure();
assert.equal(auxiliary.rootClasses.has("codex-dream-skin"), true);
assert.equal(auxiliary.nodes.has("codex-dream-skin-style"), true);
assert.equal(auxiliary.nodes.has("codex-dream-skin-chrome"), true);

console.log("PASS: renderer themes the Codex shell and preserves transparent auxiliary windows.");



