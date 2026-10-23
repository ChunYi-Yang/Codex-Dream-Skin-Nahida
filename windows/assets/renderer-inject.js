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
  const adapter = (function createLayoutAdapter(document, window, contract) {
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
})(document, window, {
  "schema": "codex-dream-skin-selectors/1",
  "description": "双端统一选择器契约。scope 与 required 来自双端 DOM 快照实测；shell-main 与 header-tint 另由 2026-07-31 Codex 26.727.40816 真实 macOS renderer 复核。doctor / CI 应逐条 querySelector 并按 tier 判级：L1 缺失=皮肤主行为受损，L2 缺失=精修静默降级。",
  "verifiedAgainst": {
    "date": "2026-10-14",
    "codexVersions": [
      {
        "version": "26.1007.2314.0",
        "platform": "windows",
        "evidence": "Local loopback CDP, validated Store identity, existing Profile-v3: sidebar rail, app shell, home placement and composer root; task/settings to be validated separately."
      },
      {
        "version": "26.818",
        "platform": "windows",
        "evidence": "reporter: #378 本机已验证补丁与 #373 @QingYe-05 的实机源码证据；v1.5.16 据此扩展 composer / Markdown / message 绑定，维护者未做本机 renderer 复核"
      },
      {
        "version": "26.814.41407",
        "platform": "macos",
        "evidence": "reporter: #373 @GreenLv 的 loopback CDP 只读 DOM 与样式读数，确认 _ComposerLayoutRoot_ 是真实输入框壳、_ComposerLayoutFooter_ 只是其内层 footer"
      },
      {
        "version": "26.814.5517.0",
        "platform": "windows",
        "evidence": "reporter: #376 复现环境；该版本设置页外观切换后的混色问题仍未修复，settings/appearance 路径未验证"
      },
      {
        "version": "26.803.10989.0",
        "platform": "windows",
        "evidence": "reporter: #363 实机探测（Chromium 151.0.7922.76）；受管 --user-data-dir 下 CDP、app://-/index.html renderer 与真实主题注入验证全部通过"
      },
      {
        "version": "26.803",
        "platform": "both",
        "evidence": "reporter: #359 Owl composer 布局报告；_ComposerLayoutBody_ / _ComposerLayoutFooter_ / _ComposerHomeUtilityBar_ 前缀别名已并入合同"
      },
      {
        "version": "26.727.40816",
        "platform": "macos",
        "evidence": "maintainer: 已签名 macOS app 的 live app:// renderer 实测复核（Chromium 150.0.7871.182），shell-main 与 header-tint 逐条 querySelector"
      },
      {
        "version": "26.715.61943",
        "platform": "macos",
        "evidence": "fixture: runtime/dom-fixtures/codex-dom-fixture-darwin-watch.json（15 状态，Chromium 150.0.7871.124）"
      },
      {
        "version": "unrecorded",
        "platform": "windows",
        "evidence": "fixture: runtime/dom-fixtures/codex-dom-fixture-win32-watch.json（7 状态）；bundle hash 与 mac 不同（ModelPickerTrigger mac=1fm6a win=1w4ob），确认双端存在版本错位"
      }
    ],
    "verdict": "双端运行时继续共用一份 selector/CSS 合同。26.727.40816 起主表面与顶栏的旧语义类改为 CSS Modules，26.803~26.818 又把输入框壳迁到 _ComposerLayoutRoot_；合同的做法始终是保留旧锚点、追加稳定属性或模块名前缀，绝不匹配完整 hash。注意 26.803 之后每一条证据都来自报告者，维护者没有对应平台的本机 renderer 复核——不要把它们当成与 26.727 同等强度的验收。",
    "gaps": [
      "Windows 26.727 之后至今没有维护者本机 renderer 复核",
      "#376：26.814.5517.0 上 Codex 设置→外观切换深浅色后主题混色，settings/appearance 路径的锚点行为未验证",
      "#371：Windows 顶部与底部区域配色与主区不一致，尚未确认是 header-tint 未命中还是原生层未被覆盖"
    ]
  },
  "appearanceSignal": {
    "dark": "html.electron-dark",
    "light": "html.electron-light",
    "warning": "html.electron-opaque 随窗口聚焦/毛玻璃状态闪动，与明暗无关，禁止用作外观信号"
  },
  "scopeVocabulary": {
    "all": "除设置页外的全部路由（home / thread / detail）及其上的 menu / dialog 覆盖层",
    "home": "首页（建议卡屏）。注意首页渐进渲染：home-icon 先出现，utility bar 可晚 1~2 秒",
    "thread": "会话/任务页（含 markdown 内容）",
    "settings": "设置页。mac 26.715.61943 实测设置页替换整个 shell（main/侧栏/header 全部消失）；win 实测设置页保留 shell。皮肤不得假设二者其一，锚点缺失时降为 L0",
    "overlay": "菜单 / 弹窗 / popper 浮层",
    "config": "依赖用户配置才出现（如未配置项目则无项目选择器）"
  },
  "selectors": [
    {
      "key": "shell-main",
      "selector": "main:is(.main-surface, [data-app-shell-main-surface], [class*=\"_MainContentSurface_\"])",
      "tier": "L1",
      "scope": "all",
      "required": true,
      "notes": "全局主表面。26.727.40816 提供 data-app-shell-main-surface，并使用 _MainContentSurface_ CSS Module；保留旧类兼容历史版本，前缀只限定在 main 元素。mac 设置页缺失（win 存在），缺失时整页仅 L0"
    },
    {
      "key": "left-panel",
      "selector": "aside.app-shell-left-panel",
      "tier": "L1",
      "scope": "all",
      "required": true,
      "notes": "左侧栏；收起/重建时会移除节点，勿在其消失时清皮"
    },
    {
      "key": "header-tint",
      "selector": "header:is(.app-header-tint, [data-app-shell-header-edge-scroll], [class*=\"_Header_\"])",
      "tier": "L1",
      "scope": "all",
      "required": true,
      "notes": "顶栏。26.727.40816 输出 data-app-shell-header-edge-scroll 并使用 _Header_ CSS Module；保留旧类兼容历史版本，前缀只限定在 header 元素。皮肤不得覆盖其 position/z-index（既有回归约束）"
    },
    {
      "key": "main-content-top-fade",
      "selector": ":is(.app-shell-main-content-top-fade, [data-app-shell-main-content-top-fade]:not(:has(*)), [class*=\"_MainContentTopFade_\"])",
      "tier": "L2",
      "scope": "all",
      "required": false,
      "notes": "Retain upstream v1.5.19 restriction: never match route wrappers with child elements."
    },
    {
      "key": "home-icon",
      "selector": "[data-testid=\"home-icon\"]",
      "tier": "L2",
      "scope": "home",
      "required": false,
      "notes": "Optional legacy anchor; absent on verified Windows 26.1007.2314.0."
    },
    {
      "key": "home-route",
      "selector": "[role=\"main\"]:has([data-codex-composer-root][data-composer-placement=\"home\"]), [role=\"main\"]:has([data-testid=\"home-icon\"])",
      "tier": "L1",
      "scope": "home",
      "required": true,
      "notes": "Home placement verified on Windows 26.1007.2314.0; retained legacy home-icon fallback."
    },
    {
      "key": "home-route-css",
      "selector": "[role=\"main\"]",
      "tier": "L1",
      "scope": "home",
      "required": true,
      "notes": "home-route 的 CSS 可组合别名：不含 :has()。CSS 禁止 :has() 嵌套，home-route 原选择器一旦写进 :has()/:not(:has()) 整条规则会被解析器丢弃（v1.3.1 全窗口首页与任务页氛围背景因此失效）。依据与 home-route 相同的实测：[role=main] 仅存在于首页；该锚点缺失时 CSS 路由门控整体失效，故必须按 L1 必需项监控"
    },
    {
      "key": "home-banners",
      "selector": ".home-banners",
      "tier": "L2",
      "scope": "home",
      "required": false,
      "notes": "Codex 26.721+ 新增的原生首页 banner 插槽，位于 home-route 第一个子节点内、通常为空（0 子节点）靠原生 empty:hidden 折叠。真正的首页内容（标题/建议卡/输入框）在这个版本上已变成该插槽外层容器的兄弟节点，不再是它的后代（见 #244 实测：home-route > div:first-child 被撑到 100% 高度会把内容挤出视口）。用于判定新旧 home DOM 形态，皮肤据此把 first-child 链路的强制尺寸限定在旧形态或改走兄弟节点"
    },
    {
      "key": "composer-chrome",
      "selector": ":is(.composer-surface-chrome, [class*=\"_ComposerLayoutRoot_\"], [data-composer-surface-variant][data-composer-radius-variant])",
      "tier": "L2",
      "scope": "home+thread",
      "required": false,
      "notes": "输入框视觉壳。兼容旧语义类、26.814 ComposerLayoutRoot CSS Module 与稳定 surface/radius 语义属性；hash 随版本变化。win 实测存在无 composer 的 detail 路由，不可当全局锚点"
    },
    {
      "key": "composer-toolbar",
      "selector": ":is(.composer-surface-chrome [class*=\"_footer_\"], [class*=\"_ComposerLayoutRoot_\"] [class*=\"_ComposerLayoutFooter_\"], [data-composer-surface-variant][data-composer-radius-variant] :is([data-composer-footer-responsive], [class*=\"_ComposerLayoutFooter_\"], [class*=\"_footer_\"]))",
      "tier": "L2",
      "scope": "home+thread",
      "required": false,
      "notes": "输入框工具栏；兼容旧 footer、ComposerLayoutFooter CSS Module 与 data-composer-footer-responsive，hash 随版本变化"
    },
    {
      "key": "home-utility",
      "selector": ":is([class*=\"_homeUtilityBar_\"], [class*=\"_ComposerHomeUtilityBar_\"])",
      "tier": "L2",
      "scope": "home",
      "required": false,
      "notes": "CSS Modules 前缀匹配；兼容旧 homeUtilityBar 与 ComposerHomeUtilityBar，模块名跨端稳定、hash 随版本变，禁止匹配完整 hash"
    },
    {
      "key": "game-source",
      "selector": "[data-feature=\"game-source\"]",
      "tier": "L2",
      "scope": "home",
      "required": false
    },
    {
      "key": "home-suggestions",
      "selector": ".group\\/home-suggestions",
      "tier": "L2",
      "scope": "home",
      "required": false
    },
    {
      "key": "project-selector",
      "selector": ".group\\/project-selector",
      "tier": "L2",
      "scope": "home config",
      "required": false,
      "notes": "依赖用户项目配置；win 快照未出现（该机可能未配置项目），不算平台差异"
    },
    {
      "key": "markdown",
      "selector": "[class*=\"_markdown\"]",
      "tier": "L2",
      "scope": "thread",
      "required": false,
      "notes": "会话内容块，单页可达 100+ 个，样式规则注意性能"
    },
    {
      "key": "thread-surface",
      "selector": ".thread-scroll-container",
      "tier": "L2",
      "scope": "thread",
      "required": false,
      "notes": "会话滚动表面；双端活动会话快照均存在"
    },
    {
      "key": "message",
      "selector": ":is([data-message-author-role], [data-local-conversation-user-anchor], [data-local-conversation-final-assistant])",
      "tier": "L2",
      "scope": "thread",
      "required": false,
      "notes": "用户与助手消息的稳定语义边界；兼容旧版 role 属性和 Codex 26.727+ 语义属性。当前全宽 user anchor 在运行时优先映射到内部自适应圆角气泡，找不到气泡时保留旧版 anchor fallback"
    },
    {
      "key": "settings-panel",
      "selector": "[data-settings-panel-slug=\"general-settings\"]",
      "tier": "L2",
      "scope": "settings",
      "required": false,
      "notes": "Codex 26.727 设置页稳定导航锚点；设置页可先落在 General，不再保证 appearance-theme 或 theme-preview 存在"
    },
    {
      "key": "appearance-radio",
      "selector": "input[name=\"appearance-theme\"]",
      "tier": "L2",
      "scope": "settings",
      "required": false,
      "notes": "旧版外观三选一；新设置页可能仅有 settings-panel"
    },
    {
      "key": "overlay-menu",
      "selector": "[role=\"menu\"]",
      "tier": "L2",
      "scope": "overlay",
      "required": false
    },
    {
      "key": "overlay-dialog",
      "selector": "[role=\"dialog\"]",
      "tier": "L2",
      "scope": "overlay",
      "required": false
    },
    {
      "key": "overlay-popper",
      "selector": "[data-radix-popper-content-wrapper]",
      "tier": "L2",
      "scope": "overlay",
      "required": false
    },
    {
      "key": "home-composer",
      "selector": "[data-codex-composer-root][data-composer-placement=\"home\"]",
      "tier": "L2",
      "scope": "home",
      "required": false,
      "notes": "Windows 26.1007.2314.0: loopback CDP structural inspection 2026-10-14; secondary-page retains earlier verified search IDs."
    },
    {
      "key": "composer-root",
      "selector": "[data-codex-composer-root]",
      "tier": "L2",
      "scope": "home+thread",
      "required": false,
      "notes": "Windows 26.1007.2314.0: loopback CDP structural inspection 2026-10-14; secondary-page retains earlier verified search IDs."
    },
    {
      "key": "navigation-rail",
      "selector": "nav[class~=\"group/sidebar-rail\"]",
      "tier": "L2",
      "scope": "all",
      "required": false,
      "notes": "Windows 26.1007.2314.0: loopback CDP structural inspection 2026-10-14; secondary-page retains earlier verified search IDs."
    },
    {
      "key": "right-panel",
      "selector": "[data-app-shell-focus-area=\"right-panel\"]",
      "tier": "L2",
      "scope": "all",
      "required": false,
      "notes": "Windows 26.1007.2314.0: loopback CDP structural inspection 2026-10-14; secondary-page retains earlier verified search IDs."
    },
    {
      "key": "project-list",
      "selector": "aside.app-shell-left-panel nav[class*=\"_Navigation_\"]",
      "tier": "L2",
      "scope": "all",
      "required": false,
      "notes": "Windows 26.1007.2314.0: observed project navigation container; excludes the separate rail."
    },
    {
      "key": "secondary-page",
      "selector": "#scheduled-page-search, #plugins-page-search, #plugins-store-page-search",
      "tier": "L2",
      "scope": "all",
      "required": false,
      "notes": "Windows 26.1007.2314.0: loopback CDP structural inspection 2026-10-14; secondary-page retains earlier verified search IDs."
    }
  ],
  "removed": [
    {
      "key": "suggestion-item",
      "selector": ".group\\/home-suggestion-list-item",
      "reason": "双端全部 22 个实测状态命中 0 次——当前 Codex 版本已无此类；CSS 中引用它的规则为化石，待清理"
    }
  ],
  "stableTestids": [
    "app-shell-header-context-menu-surface",
    "home-icon",
    "theme-preview"
  ],
  "notes": [
    "锚点优先级：data-testid > role/语义标签 > 稳定类名 > CSS Modules 前缀；禁止精确 hash 与纯结构路径",
    "首页渐进渲染：L2 home 锚点必须容忍晚到，找不到 = 暂不精修，不得阻断 L0/L1",
    "跨端适配 = 版本管理：同版本双端 DOM 同源；升级 Codex 后先跑 doctor 对本清单，再决定是否改适配"
  ]
});
  const resolveLayout = function resolveNahidaLayout({ width, height, composerHeight = 140, page, reducedMotion = false }) {
  const available = height - Math.max(140, composerHeight) - 220;
  let heroMode = "off";
  if (page === "home" && Number.isFinite(width) && Number.isFinite(height)) {
    if (width >= 900 && height >= 760 && available >= 260) heroMode = "full";
    else if (width >= 640 && height >= 600 && available >= 200) heroMode = "compact";
  }
  const showPortrait = heroMode !== "off";
  return { heroMode, showPortrait, showParticles: heroMode === "full" && !reducedMotion };
};
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
  let scene;
  let decorations;
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
      scene = create("div", "nahida-scene", chrome);
      decorations = create("div", "nahida-decorations", chrome);
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
      portrait.style.top = "52%";
      if (policy.showPortrait && showHero && composerRect) {
        const card = portrait.getBoundingClientRect();
        if (card.left < composerRect.right && card.right > composerRect.left &&
          card.top < composerRect.bottom && card.bottom > composerRect.top) {
          const below = composerRect.bottom - mainRect.top + 24;
          const above = composerRect.top - mainRect.top - card.height - 24;
          portrait.style.top = Math.max(12, below + card.height <= mainRect.height - 12 ? below : above) + "px";
        }
      }
      scene.style.display = showHero ? "block" : "none";
      decorations.style.display = showHero && policy.showParticles ? "block" : "none";
      scene.style.top = decorations.style.top = top + "px";
      scene.style.height = decorations.style.height = Math.max(0, heroHeight) + "px";
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

