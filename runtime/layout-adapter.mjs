export function createLayoutAdapter(document, window, contract) {
  const selectors = new Map(contract.selectors.map((entry) => [entry.key, entry.selector]));
  const owned = new Map();
  const visible = (node) => {
    if (!node || node.isConnected === false || node.closest?.('[data-app-shell-active-page="false"]')) return false;
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 1 && rect.height > 1 && rect.right > 0 && rect.bottom > 0 &&
      rect.left < window.innerWidth && rect.top < window.innerHeight &&
      style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0.01;
  };
  const nodes = (key) => {
    const selector = selectors.get(key);
    if (!selector) return [];
    try { return [...document.querySelectorAll(selector)].filter(visible); } catch { return []; }
  };
  const first = (key) => nodes(key)[0] ?? null;
  const restore = (node, value) => {
    if (value === null) node.removeAttribute("data-ds-part");
    else node.setAttribute("data-ds-part", value);
  };
  const cleanup = () => {
    for (const [node, value] of owned) restore(node, value);
    owned.clear();
  };
  const discover = () => {
    const main = first("shell-main");
    const homeComposer = first("home-composer");
    const thread = first("thread-surface");
    const settings = first("settings-panel");
    const secondary = first("secondary-page");
    const home = first("home-route-css");
    const page = settings ? "settings" : secondary ? "secondary" : thread ? "thread" : homeComposer ? "home" : "unknown";
    const modeValue = document.documentElement.getAttribute("data-app-shell-mode");
    const mode = ["codex", "work"].includes(modeValue) ? modeValue : "unknown";
    const regions = {
      main, navigation: first("navigation-rail"), sidebar: first("left-panel"),
      header: first("header-tint"), composer: first("composer-chrome") ?? first("composer-root"),
      rightPanel: first("right-panel"), home: page === "home" ? home : null,
      thread, settings, toolbar: first("composer-toolbar"),
    };
    const desired = new Map([[document.documentElement, "root"]]);
    for (const [key, part] of [["project-list", "project-list"], ["message", "message"], ["overlay-dialog", "dialog"]]) {
      for (const node of nodes(key)) desired.set(node, part);
    }
    for (const [key, part] of [
      ["main", "main"], ["sidebar", "sidebar"], ["navigation", "navigation"],
      ["header", "header"], ["composer", "composer"], ["rightPanel", "right-panel"],
      ["home", "home"], ["thread", "thread"], ["settings", "settings"], ["toolbar", "composer-toolbar"],
    ]) {
      const node = regions[key];
      if (node && !desired.has(node)) desired.set(node, part);
    }
    for (const [node, original] of owned) {
      if (!desired.has(node)) { restore(node, original); owned.delete(node); }
    }
    for (const [node, part] of desired) {
      if (!owned.has(node)) owned.set(node, node.getAttribute("data-ds-part"));
      if (node.getAttribute("data-ds-part") !== part) node.setAttribute("data-ds-part", part);
    }
    const rect = main?.getBoundingClientRect();
    return {
      page, mode, regions, overlay: Boolean(first("overlay-dialog") || first("overlay-menu")),
      viewport: { width: rect?.width ?? 0, height: rect?.height ?? 0 },
      missingRequired: main ? [] : ["shell-main"],
    };
  };
  return { discover, cleanup };
}
