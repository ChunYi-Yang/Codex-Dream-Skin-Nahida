((cssText, artDataUrls, theme, version) => {
  const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";
  const STYLE_ID = "codex-dream-skin-style";
  const CHROME_ID = "codex-dream-skin-chrome";
  const revision = __DREAM_SKIN_PAYLOAD_REVISION_JSON__;
  const previous = window[STATE_KEY];
  previous?.cleanup?.();
  if (location.protocol !== "app:" ||
    /(?:^|\/)avatar-overlay(?:\/|$)|avatar-overlay-composition-surface\.html$/.test(location.pathname)) {
    return { installed: false, reason: "excluded-surface" };
  }
  window.__CODEX_DREAM_SKIN_DISABLED__ = false;
  const root = document.documentElement;
  if (!root || !document.body) return { installed: false, reason: "document-not-ready" };
  const adapter = (__DREAM_LAYOUT_FACTORY__)(document, window, __DREAM_SELECTOR_CONTRACT__);
  const resolveLayout = __DREAM_LAYOUT_POLICY__;
  const objectUrls = new Set();
  const urlCache = new Map();
  const artUrls = {};
  const attributes = new Map();
  const properties = new Map();
  const scheduler = { timeout: null };
  let observer;
  let resizeObserver;
  let timer;
  let chrome;
  let hero;
  let portrait;
  let observedMain;
  let observedComposer;
  const setAttribute = (name, value) => {
    if (!attributes.has(name)) attributes.set(name, root.getAttribute(name));
    if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  };
  const setProperty = (name, value) => {
    if (!properties.has(name)) properties.set(name, {
      value: root.style.getPropertyValue(name),
      priority: root.style.getPropertyPriority?.(name) ?? "",
    });
    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
  };
  for (const [slot, dataUrl] of Object.entries(artDataUrls)) {
    if (!urlCache.has(dataUrl)) {
      const comma = dataUrl.indexOf(",");
      const binary = atob(dataUrl.slice(comma + 1));
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const mime = dataUrl.slice(5, dataUrl.indexOf(";")) || "image/png";
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      urlCache.set(dataUrl, url);
      objectUrls.add(url);
    }
    artUrls[slot] = urlCache.get(dataUrl);
  }
  const artProperties = {
    hero: "--dream-art", background: "--dream-background-art", sidebar: "--dream-sidebar-art",
    rightPanel: "--dream-right-panel-art", portrait: "--dream-portrait-art",
    decorations: "--dream-decor-art", scene: "--dream-scene-art",
  };
  for (const [slot, property] of Object.entries(artProperties)) {
    if (artUrls[slot]) setProperty(property, 'url("' + artUrls[slot] + '")');
  }
  if (artUrls.background ?? artUrls.hero) {
    setProperty("--dream-skin-art", 'url("' + (artUrls.background ?? artUrls.hero) + '")');
  }
  const create = (tag, className, parent, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    parent.appendChild(node);
    return node;
  };
  let styleNode = document.getElementById(STYLE_ID);
  if (!styleNode) {
    styleNode = document.createElement("style");
    styleNode.id = STYLE_ID;
    (document.head ?? document.documentElement).appendChild(styleNode);
  }
  styleNode.textContent = cssText;
  const detectShellAppearance = () => {
    if (theme.appearance === "light" || theme.appearance === "dark") return theme.appearance;
    const appearance = root.getAttribute("data-theme") ?? root.getAttribute("data-appearance");
    if (appearance === "dark" || root.classList.contains("electron-dark")) return "dark";
    if (appearance === "light" || root.classList.contains("electron-light")) return "light";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  const ensure = () => {
    if (window.__CODEX_DREAM_SKIN_DISABLED__) return;
    const layout = adapter.discover();
    const state = window[STATE_KEY];
    if (!layout.regions.main && layout.page !== "settings") {
      if (root.getAttribute("data-dream-skin") === "active") root.removeAttribute("data-dream-skin");
      chrome?.remove();
      chrome = hero = portrait = null;
      if (state) state.scope = { baseState: "unknown", level: "L0", missingL1: ["shell-main"] };
      return;
    }
    const scheme = detectShellAppearance();
    setAttribute("data-dream-skin", "active");
    setAttribute("data-dream-shell", scheme);
    setAttribute("data-nahida-page", layout.page);
    const palette = scheme === "dark" && theme.darkColors ? theme.darkColors : theme.colors;
    const names = {
      background: "bg", panel: "panel", panelAlt: "panel-alt", accent: "accent",
      accentAlt: "accent-alt", secondary: "secondary", highlight: "highlight",
      text: "text", muted: "muted", line: "line",
    };
    for (const [key, name] of Object.entries(names)) {
      if (palette?.[key]) {
        setProperty("--dream-" + name, palette[key]);
        setProperty("--ds-theme-color-" + (key === "background" ? "background" : name), palette[key]);
      }
    }
    const mainRect = layout.regions.main?.getBoundingClientRect();
    const composerRect = layout.regions.composer?.getBoundingClientRect();
    const policy = resolveLayout({
      ...layout.viewport, composerHeight: composerRect?.height ?? 140, page: layout.page,
      reducedMotion: root.getAttribute("data-reduced-motion") === "true" ||
        Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    });
    if (mainRect && (!chrome || chrome.parentElement !== document.body)) {
      chrome?.remove();
      chrome = create("div", null, document.body);
      chrome.id = CHROME_ID;
      chrome.setAttribute("aria-hidden", "true");
      hero = create("section", "nahida-hero", chrome);
      hero.setAttribute("data-ds-part", "home-hero");
      const copy = create("div", "nahida-hero-copy", hero);
      create("small", null, copy, theme.name);
      create("strong", null, copy, theme.homePrompt ?? "我们应该在虚空中做些什么？");
      create("p", null, copy, theme.tagline);
      portrait = create("div", "nahida-portrait", chrome);
      create("span", null, portrait, theme.quote);
    }
    if (chrome && mainRect) {
      for (const [name, value] of Object.entries({
        left: mainRect.left + "px", top: mainRect.top + "px",
        width: mainRect.width + "px", height: mainRect.height + "px",
      })) if (chrome.style[name] !== value) chrome.style[name] = value;
      const contentTop = layout.regions.home?.getBoundingClientRect().top ??
        Math.max(mainRect.top, layout.regions.header?.getBoundingClientRect().bottom ?? mainRect.top);
      const top = Math.max(12, contentTop - mainRect.top + 16);
      const safeHeight = (composerRect?.top ?? mainRect.bottom) - mainRect.top - top - 28;
      const heroHeight = Math.min(policy.heroMode === "full" ? 260 : 180, safeHeight);
      const showHero = policy.heroMode !== "off" && heroHeight >= 130;
      hero.style.display = showHero ? "block" : "none";
      hero.style.top = top + "px";
      hero.style.height = Math.max(0, heroHeight) + "px";
      portrait.style.display = policy.showPortrait && showHero ? "block" : "none";
      chrome.setAttribute("data-hero-mode", showHero ? policy.heroMode : "off");
      setAttribute("data-nahida-hero-mode", showHero ? policy.heroMode : "off");
    }
    if (resizeObserver && (observedMain !== layout.regions.main || observedComposer !== layout.regions.composer)) {
      resizeObserver.disconnect();
      observedMain = layout.regions.main;
      observedComposer = layout.regions.composer;
      if (observedMain) resizeObserver.observe(observedMain);
      if (observedComposer) resizeObserver.observe(observedComposer);
    }
    if (state) {
      state.scope = {
        baseState: layout.page, level: layout.page === "settings" ? "L0" : layout.missingRequired.length ? "L0" : "L1",
        missingL1: layout.missingRequired, overlay: layout.overlay,
      };
      state.layout = { page: layout.page, mode: layout.mode, heroMode: chrome?.getAttribute("data-hero-mode") ?? "off" };
      state.applicationStatus = layout.missingRequired.length ? "not-applied" :
        layout.page === "unknown" ? "basic" : "full";
    }
  };
  const scheduleEnsure = () => {
    if (scheduler.timeout || window.__CODEX_DREAM_SKIN_DISABLED__) return;
    scheduler.timeout = setTimeout(() => { scheduler.timeout = null; ensure(); }, 120);
  };
  const cleanup = () => {
    window.__CODEX_DREAM_SKIN_DISABLED__ = true;
    observer?.disconnect();
    resizeObserver?.disconnect();
    if (timer) clearInterval(timer);
    if (scheduler.timeout) clearTimeout(scheduler.timeout);
    window.removeEventListener?.("resize", scheduleEnsure);
    window.navigation?.removeEventListener?.("navigate", scheduleEnsure);
    adapter.cleanup();
    chrome?.remove();
    styleNode.remove();
    for (const [name, value] of attributes) {
      if (value === null) root.removeAttribute(name);
      else root.setAttribute(name, value);
    }
    for (const [name, saved] of properties) {
      if (saved.value) root.style.setProperty(name, saved.value, saved.priority);
      else root.style.removeProperty(name);
    }
    for (const url of objectUrls) URL.revokeObjectURL(url);
    if (window[STATE_KEY]?.cleanup === cleanup) delete window[STATE_KEY];
    return true;
  };
  observer = new MutationObserver(scheduleEnsure);
  observer.observe(root, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ["class", "data-theme", "data-appearance", "data-app-shell-active-page", "data-composer-placement", "data-reduced-motion"],
  });
  if (typeof ResizeObserver === "function") resizeObserver = new ResizeObserver(scheduleEnsure);
  window.addEventListener?.("resize", scheduleEnsure);
  window.navigation?.addEventListener?.("navigate", scheduleEnsure);
  timer = setInterval(ensure, 5000);
  window[STATE_KEY] = {
    ensure, cleanup, observer, timer, scheduler, objectUrls, version, themeId: theme.id, revision,
    styleMode: "style", styleNode, scope: null, artMetadata: theme.artMetadata,
  };
  ensure();
  return { installed: root.getAttribute("data-dream-skin") === "active", version, themeId: theme.id };
})(__DREAM_SKIN_CSS_JSON__, __DREAM_SKIN_ART_JSON__, __DREAM_SKIN_THEME_JSON__, __DREAM_SKIN_VERSION_JSON__)

