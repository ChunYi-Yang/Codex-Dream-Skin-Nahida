((cssText, artDataUrls, theme, version) => {
  const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";
  const STYLE_ID = "codex-dream-skin-style";
  const CHROME_ID = "codex-dream-skin-chrome";
  const HOME_FALLBACK_ID = "codex-dream-home-fallback";
  const LEGACY_SUMMARY_CONTROL_IDS = [
    "codex-dream-summary-panel-close",
    "codex-dream-summary-panel-reopen",
  ];
  const ART_PROPERTIES = {
    hero: "--dream-art",
    background: "--dream-background-art",
    sidebar: "--dream-sidebar-art",
    rightPanel: "--dream-right-panel-art",
    portrait: "--dream-portrait-art",
    decorations: "--dream-decor-art",
    scene: "--dream-scene-art",
  };
  const THEME_PROPERTIES = [
    "--dream-name",
    "--dream-subtitle",
    "--dream-tagline",
    "--dream-project-prefix",
    "--dream-project-label",
    "--dream-status-text",
    "--dream-quote",
    "--dream-bg",
    "--dream-panel",
    "--dream-panel-alt",
    "--dream-accent",
    "--dream-accent-alt",
    "--dream-secondary",
    "--dream-highlight",
    "--dream-text",
    "--dream-muted",
    "--dream-line",
  ];

  window.__CODEX_DREAM_SKIN_DISABLED__ = false;

  const previous = window[STATE_KEY];
  const previousHomePrompt = previous?.homePrompt ?? null;
  previous?.observer?.disconnect();
  if (previous?.timer) clearInterval(previous.timer);
  if (previous?.scheduler?.timeout) clearTimeout(previous.scheduler.timeout);
  for (const objectUrl of previous?.objectUrls ?? []) URL.revokeObjectURL(objectUrl);
  document.documentElement?.classList.remove("dream-summary-panel-hidden");
  for (const id of LEGACY_SUMMARY_CONTROL_IDS) document.getElementById(id)?.remove();

  const dataUrlCache = new Map();
  const objectUrls = new Set();
  const artUrls = {};
  for (const [slot, dataUrl] of Object.entries(artDataUrls)) {
    let objectUrl = dataUrlCache.get(dataUrl);
    if (!objectUrl) {
      const comma = dataUrl.indexOf(",");
      const binary = atob(dataUrl.slice(comma + 1));
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      const mime = dataUrl.slice(5, dataUrl.indexOf(";")) || "image/png";
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
      dataUrlCache.set(dataUrl, objectUrl);
      objectUrls.add(objectUrl);
    }
    artUrls[slot] = objectUrl;
  }

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const clearSkinDom = () => {
    const root = document.documentElement;
    document.querySelectorAll("[data-dream-sidebar-original-text]").forEach((node) => {
      node.textContent = node.dataset.dreamSidebarOriginalText ?? "";
      delete node.dataset.dreamSidebarOriginalText;
      node.classList.remove("dream-sidebar-brand");
    });
    document.querySelectorAll('[data-feature="game-source"][data-dream-original-text]')
      .forEach((node) => {
        node.textContent = node.dataset.dreamOriginalText ?? "";
        delete node.dataset.dreamOriginalText;
      });
    root?.classList.remove("codex-dream-skin");
    root?.classList.remove("dream-summary-panel-hidden");
    for (const property of [...Object.values(ART_PROPERTIES), ...THEME_PROPERTIES]) {
      root?.style.removeProperty(property);
    }
    document.querySelectorAll(".dream-home").forEach((node) => node.classList.remove("dream-home"));
    document.querySelectorAll(".dream-home-hero-surface")
      .forEach((node) => node.classList.remove("dream-home-hero-surface"));
    document.querySelectorAll(".dream-home-composer-surface")
      .forEach((node) => node.classList.remove("dream-home-composer-surface"));
    document.querySelectorAll(".dream-home-shell").forEach((node) => node.classList.remove("dream-home-shell"));
    document.querySelectorAll(".dream-route-shell").forEach((node) => node.classList.remove("dream-route-shell"));
    document.querySelectorAll(".dream-settings-shell").forEach((node) =>
      node.classList.remove("dream-settings-shell"));
    document.querySelectorAll(".dream-settings-surface").forEach((node) =>
      node.classList.remove("dream-settings-surface"));
    document.querySelectorAll(".dream-summary-panel-surface").forEach((node) =>
      node.classList.remove("dream-summary-panel-surface"));
    document.querySelectorAll("[data-dream-main-surface-compat]").forEach((node) => {
      node.classList.remove("main-surface");
      delete node.dataset.dreamMainSurfaceCompat;
    });
    for (const id of LEGACY_SUMMARY_CONTROL_IDS) document.getElementById(id)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(CHROME_ID)?.remove();
    document.getElementById(HOME_FALLBACK_ID)?.remove();
  };

  const applyRootProperties = (root) => {
    for (const [slot, property] of Object.entries(ART_PROPERTIES)) {
      root.style.setProperty(property, `url("${artUrls[slot]}")`);
    }
    const textProperties = {
      "--dream-name": theme.name,
      "--dream-subtitle": theme.brandSubtitle,
      "--dream-tagline": theme.tagline,
      "--dream-project-prefix": theme.projectPrefix,
      "--dream-project-label": theme.projectLabel,
      "--dream-status-text": theme.statusText,
      "--dream-quote": theme.quote,
    };
    for (const [property, value] of Object.entries(textProperties)) {
      root.style.setProperty(property, JSON.stringify(value));
    }
    const colorProperties = {
      "--dream-bg": theme.colors?.background,
      "--dream-panel": theme.colors?.panel,
      "--dream-panel-alt": theme.colors?.panelAlt,
      "--dream-accent": theme.colors?.accent,
      "--dream-accent-alt": theme.colors?.accentAlt,
      "--dream-secondary": theme.colors?.secondary,
      "--dream-highlight": theme.colors?.highlight,
      "--dream-text": theme.colors?.text,
      "--dream-muted": theme.colors?.muted,
      "--dream-line": theme.colors?.line,
    };
    for (const [property, value] of Object.entries(colorProperties)) {
      if (value) root.style.setProperty(property, value);
    }
  };

  const ensure = () => {
    if (window.__CODEX_DREAM_SKIN_DISABLED__) return;
    const root = document.documentElement;
    if (!root || !document.body) return;

    const shellMain = document.querySelector("main.main-surface, main[data-app-shell-main-surface]");
    if (!shellMain) {
      clearSkinDom();
      return;
    }
    if (!document.querySelector("main.main-surface")) {
      shellMain.classList.add("main-surface");
      shellMain.dataset.dreamMainSurfaceCompat = "true";
    }

    root.classList.add("codex-dream-skin");
    root.classList.remove("dream-summary-panel-hidden");
    applyRootProperties(root);

    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || root).appendChild(style);
    }
    if (style.dataset.dreamVersion !== version) {
      style.textContent = cssText;
      style.dataset.dreamVersion = version;
    }

    const appLabel = String(theme.appLabel ?? "Codex").trim();
    const sidebarBrand = document.querySelector(
      'aside.app-shell-left-panel button[aria-label^="切换模式"] span.font-semibold')
      ?? [...document.querySelectorAll("aside.app-shell-left-panel span.font-semibold")]
        .find((node) => {
          const text = String(node.textContent ?? "").trim();
          return text === "Codex" || text === appLabel || node.classList?.contains("font-openai-sans");
        })
      ?? null;
    if (sidebarBrand && appLabel && sidebarBrand.textContent !== appLabel) {
      if (!("dreamSidebarOriginalText" in sidebarBrand.dataset)) {
        sidebarBrand.dataset.dreamSidebarOriginalText = sidebarBrand.textContent ?? "";
      }
      sidebarBrand.textContent = appLabel;
      sidebarBrand.classList.add("dream-sidebar-brand");
    }

    const isVisibleSurface = (node) => {
      if (!node) return false;
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return box.width > 1 && box.height > 1 &&
        box.bottom > 0 && box.right > 0 &&
        box.top < window.innerHeight && box.left < window.innerWidth &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0.01;
    };
    const settingsPresent = Boolean(document.querySelector("[data-settings-panel-slug]"));
    const pageSearch = document.querySelector("#scheduled-page-search, #plugins-page-search");
    const pageSearchPresent = isVisibleSurface(pageSearch);
    const routePage = [...document.querySelectorAll(
      'aside.app-shell-left-panel [aria-current="page"], aside.app-shell-left-panel [class~="bg-token-list-hover-background"]',
    )].find((node) => {
      const text = String(node.textContent ?? "").trim();
      return isVisibleSurface(node) && /插件|Plugins|已安排|Scheduled|拉取请求|Pull Request/i.test(text);
    }) ?? null;
    const routePagePresent = Boolean(routePage);
    const pullRequestRoutePresent = Boolean(routePage &&
      /拉取请求|Pull Request/i.test(String(routePage.textContent ?? "")));
    const taskHeader = document.querySelector("main.main-surface > header.app-header-tint");
    const taskHeaderPresent = Boolean(String(taskHeader?.textContent ?? "").trim()) &&
      isVisibleSurface(taskHeader);
    const visibleConversationPresent = [...document.querySelectorAll(
      '.thread-scroll-container, [data-thread-find-target="conversation"]',
    )].some((node) => isVisibleSurface(node) && Boolean(String(node.textContent ?? "").trim()));
    const blocksHome = Boolean(taskHeaderPresent || settingsPresent ||
      pageSearchPresent || routePagePresent || visibleConversationPresent);
    const home = blocksHome ? null : (
      document.querySelector('[role="main"]:has([data-testid="home-icon"])') ??
      document.querySelector('[role="main"]:has([data-feature="game-source"])') ??
      document.querySelector('[role="main"]:has(.composer-surface-chrome)')
    );
    const emptyStartSurface = !home && !blocksHome;
    const homeActive = Boolean(home || emptyStartSurface);
    for (const candidate of document.querySelectorAll('[role="main"].dream-home')) {
      if (candidate !== home) candidate.classList.remove("dream-home");
    }
    if (home) home.classList.add("dream-home");
    shellMain.classList.toggle("dream-home-shell", homeActive);
    shellMain.classList.toggle("dream-route-shell", pullRequestRoutePresent);

    const homeSurface = home ?? (homeActive ? shellMain : null);
    const gameSource = homeSurface?.querySelector?.('[data-feature="game-source"]') ?? null;
    const homeSuggestions = homeSurface?.querySelector?.('.group\\/home-suggestions') ?? null;
    let homeHeroSurface = null;
    if (homeActive && gameSource) {
      const boundary = home ?? shellMain;
      for (let node = gameSource.parentElement; node && node !== boundary; node = node.parentElement) {
        if (!node.contains(gameSource)) continue;
        const box = node.getBoundingClientRect();
        homeHeroSurface = node;
        if (box.width >= 300 && box.height >= 120) break;
      }
    }
    for (const candidate of document.querySelectorAll(".dream-home-hero-surface")) {
      if (candidate !== homeHeroSurface) candidate.classList.remove("dream-home-hero-surface");
    }
    if (homeHeroSurface) homeHeroSurface.classList.add("dream-home-hero-surface");
    const homeComposer = homeSurface?.querySelector?.(".composer-surface-chrome") ?? null;
    let homeComposerSurface = null;
    if (homeActive && homeComposer) {
      const boundary = home ?? shellMain;
      for (let node = homeComposer.parentElement; node && node !== boundary; node = node.parentElement) {
        if (node.querySelector?.('[class*="group/project-selector"]')) {
          homeComposerSurface = node;
          break;
        }
      }
      homeComposerSurface ??= homeComposer.closest?.('[class~="sticky"]') ??
        homeComposer.parentElement;
    }
    for (const candidate of document.querySelectorAll(".dream-home-composer-surface")) {
      if (candidate !== homeComposerSurface) candidate.classList.remove("dream-home-composer-surface");
    }
    if (homeComposerSurface) homeComposerSurface.classList.add("dream-home-composer-surface");
    const homePrompt = String(theme.homePrompt ?? "What should we build?").trim();
    if (gameSource && homePrompt && gameSource.textContent !== homePrompt) {
      const currentText = gameSource.textContent ?? "";
      if (!("dreamOriginalText" in gameSource.dataset) || currentText !== previousHomePrompt) {
        gameSource.dataset.dreamOriginalText = currentText;
      }
      gameSource.textContent = homePrompt;
    }
    const needsHomeFallback = Boolean(homeActive && !gameSource && !homeSuggestions);
    let homeFallback = document.getElementById(HOME_FALLBACK_ID);
    if (needsHomeFallback) {
      if (!homeFallback) {
        homeFallback = document.createElement("div");
        homeFallback.id = HOME_FALLBACK_ID;
        homeFallback.setAttribute("aria-hidden", "true");
        homeFallback.innerHTML = `
          <section class="dream-home-fallback-card">
            <div class="dream-home-fallback-copy">
              <b>${escapeHtml(theme.name)}</b>
              <strong>${escapeHtml(homePrompt)}</strong>
              <span>${escapeHtml(theme.tagline)}</span>
            </div>
          </section>`;
        document.body.appendChild(homeFallback);
      }
      const shellBox = shellMain.getBoundingClientRect();
      homeFallback.style.left = `${Math.round(shellBox.left)}px`;
      homeFallback.style.top = `${Math.round(shellBox.top)}px`;
      homeFallback.style.width = `${Math.round(shellBox.width)}px`;
      homeFallback.style.height = `${Math.round(shellBox.height)}px`;
    } else {
      homeFallback?.remove();
    }

    const settingsSurface = settingsPresent
      ? document.querySelector("div.main-surface")
      : null;
    shellMain.classList.toggle("dream-settings-shell", settingsPresent);
    for (const candidate of document.querySelectorAll(".dream-settings-surface")) {
      if (candidate !== settingsSurface) candidate.classList.remove("dream-settings-surface");
    }
    if (settingsSurface) settingsSurface.classList.add("dream-settings-surface");

    const summaryPanel = document.querySelector('[data-pip-obstacle="thread-summary-panel"]');
    const summarySurface = summaryPanel?.firstElementChild?.firstElementChild ?? null;
    for (const candidate of document.querySelectorAll(".dream-summary-panel-surface")) {
      if (candidate !== summarySurface) candidate.classList.remove("dream-summary-panel-surface");
    }
    if (summarySurface) summarySurface.classList.add("dream-summary-panel-surface");

    let chrome = document.getElementById(CHROME_ID);
    if (!chrome || chrome.parentElement !== document.body) {
      chrome?.remove();
      chrome = document.createElement("div");
      chrome.id = CHROME_ID;
      chrome.setAttribute("aria-hidden", "true");
      chrome.innerHTML = `
        <div class="dream-brand">
          <span class="dream-brand-mark"></span>
          <span><b>${escapeHtml(theme.name)}</b><small>${escapeHtml(theme.brandSubtitle)}</small></span>
        </div>
        <div class="dream-status"><i></i>${escapeHtml(theme.statusText)}</div>
        <div class="dream-scene"></div>
        <div class="dream-portrait"><span>${escapeHtml(theme.quote)}</span></div>
        <div class="dream-motes"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="dream-corner-leaf"></div>`;
      document.body.appendChild(chrome);
    }

    const shellBox = shellMain.getBoundingClientRect();
    chrome.style.left = `${Math.round(shellBox.left)}px`;
    chrome.style.top = `${Math.round(shellBox.top)}px`;
    chrome.style.width = `${Math.round(shellBox.width)}px`;
    chrome.style.height = `${Math.round(shellBox.height)}px`;
    chrome.classList.toggle("dream-home-shell", homeActive);
  };

  const cleanup = () => {
    window.__CODEX_DREAM_SKIN_DISABLED__ = true;
    clearSkinDom();
    const state = window[STATE_KEY];
    state?.observer?.disconnect();
    if (state?.timer) clearInterval(state.timer);
    if (state?.scheduler?.timeout) clearTimeout(state.scheduler.timeout);
    for (const objectUrl of state?.objectUrls ?? []) URL.revokeObjectURL(objectUrl);
    delete window[STATE_KEY];
    return true;
  };

  const scheduler = { timeout: null };
  const scheduleEnsure = () => {
    if (scheduler.timeout) clearTimeout(scheduler.timeout);
    scheduler.timeout = setTimeout(() => {
      scheduler.timeout = null;
      ensure();
    }, 180);
  };
  const observer = new MutationObserver(scheduleEnsure);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const timer = setInterval(ensure, 5000);
  window[STATE_KEY] = {
    ensure,
    cleanup,
    observer,
    timer,
    scheduler,
    objectUrls,
    homePrompt: String(theme.homePrompt ?? "What should we build?").trim(),
    version,
    themeId: theme.id,
  };
  ensure();
  return { installed: true, version, themeId: theme.id };
})(__DREAM_CSS_JSON__, __DREAM_ARTS_JSON__, __DREAM_THEME_JSON__, __DREAM_VERSION_JSON__)
