import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { createLayoutAdapter } from "../../runtime/layout-adapter.mjs";
import { decodeAndValidateSafeCss } from "../assets/safe-css-validator.mjs";
const require = createRequire(import.meta.url);
if (!process.env.DREAM_PLAYWRIGHT_MODULE || !process.env.DREAM_BROWSER_EXECUTABLE) {
  throw new Error("Set DREAM_PLAYWRIGHT_MODULE and DREAM_BROWSER_EXECUTABLE to a host Playwright module and Chromium browser.");
}
const { chromium } = require(process.env.DREAM_PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ headless: true, executablePath: process.env.DREAM_BROWSER_EXECUTABLE });
try {
  const page = await browser.newPage();
  await page.setContent(`<html data-dream-skin="active" data-dream-shell="light" data-nahida-page="settings"><head><style>
    html { --color-background-primary-soft-alpha: #fff; --color-text-primary-surface: #0d0d0d; }
    .text-default { color: var(--color-text-primary-surface); }
  </style></head><body><main data-ds-part="main"><div class="group/settings">
    <h1 class="text-default">常规</h1>
    <div id="settings-card" class="rounded-2xl border-default" style="background-color:var(--color-background-panel,var(--color-background-primary-soft-alpha))"><button role="switch" aria-checked="true">设置</button></div>
  </div></main><aside data-ds-part="right-panel"><h2 class="text-default">工具</h2>
    <button id="tool-card" class="rounded-xl" style="background-color:var(--color-background-panel,var(--color-background-primary-soft-alpha))">文件</button>
    <div id="tool-row" class="rounded-md bg-primary-soft-alpha" style="background-color:white"><button>终端</button></div>
    <button id="more-tools" class="rounded-md bg-primary-soft-alpha" style="background-color:white">更多工具</button>
  </aside></body></html>`);
  await page.addStyleTag({ content: await fs.readFile("windows/assets/dream-skin.css", "utf8") });
  const result = await page.evaluate(() => ({
    settings: getComputedStyle(document.getElementById("settings-card")).backgroundColor,
    tool: getComputedStyle(document.getElementById("tool-card")).backgroundColor,
    toolRow: getComputedStyle(document.getElementById("tool-row")).backgroundColor,
    moreTools: getComputedStyle(document.getElementById("more-tools")).backgroundColor,
    titles: [...document.querySelectorAll("h1,h2")].map(node => getComputedStyle(node).color),
    switchState: document.querySelector('[role="switch"]').getAttribute("aria-checked"),
  }));
  assert.equal(result.settings, "rgba(229, 241, 212, 0.66)");
  assert.equal(result.tool, "rgba(229, 241, 212, 0.66)");
  assert.equal(result.toolRow, "rgba(229, 241, 212, 0.66)");
  assert.equal(result.moreTools, "rgba(229, 241, 212, 0.66)");
  assert.deepEqual(result.titles, ["rgb(55, 106, 69)", "rgb(55, 106, 69)"]);
  assert.equal(result.switchState, "true");
  await page.evaluate(() => document.documentElement.setAttribute("data-dream-shell", "dark"));
  const dark = await page.evaluate(() => ({
    settings: getComputedStyle(document.getElementById("settings-card")).backgroundColor,
    title: getComputedStyle(document.querySelector("h1")).color,
  }));
  assert.equal(dark.settings, "rgba(32, 55, 44, 0.78)");
  assert.equal(dark.title, "rgb(201, 237, 145)");
  await page.setContent(`<html data-dream-skin="active" data-dream-shell="light" data-nahida-page="settings"><head><style>
    .text-default { color: var(--color-text-primary-surface); }
    section { display: flex; flex-direction: column; }
    section > * { margin-block: 0; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .mode-row::after { content: ""; }
    [role="switch"] > span { --switch-track-color-checked: #0169cc; background-color: var(--switch-track-color-checked); }
  </style></head><body>
    <div role="dialog" class="settings-dialog">
      <aside class="settings-dialog-sidebar">
        <div data-sidebar-header-search><div style="background:transparent"><input aria-label="Search settings"></div></div>
        <button data-settings-panel-slug="account" aria-current="page" style="background:#ddd">Account</button>
        <button data-settings-panel-slug="voice">Voice</button>
      </aside>
      <div data-settings-panel>
        <div class="settings-dialog-panel-header"><h1>Account</h1></div>
        <div class="group/settings">
          <section>
            <div class="justify-between" id="details-heading"><div><div class="font-medium text-default">Details</div></div></div>
            <div class="flex flex-col gap-1.5"><div class="rounded-2xl border-default" style="border-radius:0;--settings-row-padding-inline:0px">
              <div data-settings-search-entry style="padding-inline:var(--settings-row-padding-inline)">
                <button role="switch" aria-checked="true"><span data-state="checked">Enabled</span></button>
                <button role="switch" aria-checked="true" disabled><span data-state="checked">Unavailable</span></button>
                <button role="switch" aria-checked="false"><span data-state="unchecked">Off</span></button>
                <button data-color="danger" style="color:rgb(170,0,0)">Delete</button>
              </div>
            </div></div>
          </section>
          <section><div class="flex flex-col gap-1.5"><p class="text-default">Empty state</p></div></section>
          <section>
            <div class="bg-surface sticky justify-between" id="shortcuts-heading"><h3>Shortcuts</h3></div>
            <ul class="list-none flex flex-col"><li id="shortcut-row"><kbd>Ctrl</kbd></li></ul>
          </section>
          <section>
            <div role="group" id="usage-heading"><div class="justify-between"><h3>Usage by chat</h3></div></div>
            <div class="flex flex-col gap-1.5"><div class="rounded-2xl border-default">
              <table><thead><tr><th>Chat</th></tr></thead></table>
            </div></div>
          </section>
          <section>
            <div class="justify-between" id="permission-heading"><h3>Permissions</h3></div>
            <div class="rounded-2xl border-default"><p>Permission group</p></div>
          </section>
          <section>
            <div class="justify-between" id="advanced-heading"><button aria-expanded="true">Advanced</button></div>
            <div><div class="rounded-2xl border-default"><p>Font size</p></div></div>
          </section>
          <section class="flex flex-col">
            <section class="flex flex-col" id="first-agent-group"><div class="rounded-2xl border-default"><p>First group</p></div></section>
            <section class="flex flex-col"><div class="rounded-2xl border-default"><p>Second group</p></div></section>
          </section>
          <div id="appearance-stack" class="flex flex-col rounded-2xl border-default">
            <div id="appearance-mode" class="mode-row" data-settings-search-entry>Mode</div>
            <div class="flex flex-col"><section><div id="appearance-theme" class="rounded-2xl border-default">Theme</div></section></div>
          </div>
        </div>
      </div>
    </div>
    <div id="foreign" class="rounded-2xl border-default" style="background:white">Unrelated</div>
  </body></html>`);
  await page.addStyleTag({ content: await fs.readFile("windows/assets/dream-skin.css", "utf8") });
  const settingsContract = await fs.readFile("tools/selectors.json", "utf8");
  const settingsLayout = await page.evaluate(`(() => {
    const layout = (${createLayoutAdapter.toString()})(document, window, ${settingsContract}).discover();
    return {page:layout.page, region:layout.regions.settings?.classList.contains("settings-dialog")};
  })()`);
  assert.deepEqual(settingsLayout, {page:"settings", region:true}, "Settings must be recognized without a General button or main shell");
  const settingsStylesByShell = {};
  for (const shell of ["light", "dark"]) {
    await page.evaluate(value => document.documentElement.setAttribute("data-dream-shell", value), shell);
    const modal = await page.evaluate(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      const groupGap = id => {
        const heading = document.getElementById(id);
        return heading.nextElementSibling.getBoundingClientRect().top - heading.getBoundingClientRect().bottom;
      };
      return {
        heading: style(".settings-dialog h1").color,
        selected: style('[aria-current="page"]').backgroundColor,
        selectedShadow: style('[aria-current="page"]').boxShadow,
        surface: style(".settings-dialog").backgroundImage,
        sidebar: style(".settings-dialog-sidebar").backgroundImage,
        radius: style("[data-settings-panel] .rounded-2xl").borderRadius,
        padding: parseFloat(style("[data-settings-search-entry]").paddingInlineStart),
        empty: style('section > div[class~="gap-1.5"]:not(:has(.rounded-2xl))').backgroundColor,
        emptyText: style('section > div[class~="gap-1.5"] p').color,
        sticky: style(".bg-surface.sticky").backgroundColor,
        shortcuts: style("section > ul").borderRadius,
        shortcutPadding: parseFloat(style("#shortcut-row").paddingInlineStart),
        gaps: ["details-heading", "shortcuts-heading", "usage-heading", "permission-heading",
          "advanced-heading", "first-agent-group", "appearance-mode"].map(groupGap),
        appearanceStack: style("#appearance-stack").backgroundColor,
        appearanceMode: style("#appearance-mode").borderRadius,
        appearanceTheme: style("#appearance-theme").borderRadius,
        appearanceDivider: getComputedStyle(document.getElementById("appearance-mode"), "::after").content,
        search: style("[data-sidebar-header-search] > div").backgroundColor,
        danger: style('[data-color="danger"]').color,
        enabled: document.querySelector('[role="switch"]').getAttribute("aria-checked"),
        track: style('[role="switch"]:enabled[aria-checked="true"] > span').backgroundColor,
        disabledTrack: style('[role="switch"]:disabled > span').backgroundColor,
        offTrack: style('[role="switch"][aria-checked="false"] > span').backgroundColor,
        foreign: style("#foreign").backgroundColor,
      };
    });
    assert.equal(modal.heading, shell === "light" ? "rgb(55, 106, 69)" : "rgb(201, 237, 145)");
    assert.notEqual(modal.selected, "rgb(221, 221, 221)");
    assert.equal(modal.radius, "14px");
    assert.ok(modal.padding >= 12);
    assert.notEqual(modal.empty, "rgba(0, 0, 0, 0)");
    assert.equal(modal.emptyText, shell === "light" ? "rgb(24, 55, 45)" : "rgb(229, 239, 220)");
    if (shell === "dark") assert.equal(modal.sticky, "rgb(31, 53, 41)");
    assert.equal(modal.shortcuts, "14px");
    assert.ok(modal.shortcutPadding >= 12);
    assert.deepEqual(modal.gaps, [12, 12, 12, 12, 12, 12, 12]);
    assert.equal(modal.appearanceStack, "rgba(0, 0, 0, 0)");
    assert.equal(modal.appearanceMode, "14px");
    assert.equal(modal.appearanceTheme, "14px");
    assert.equal(modal.appearanceDivider, "none");
    assert.notEqual(modal.search, "rgba(0, 0, 0, 0)");
    assert.equal(modal.danger, "rgb(170, 0, 0)");
    assert.equal(modal.enabled, "true");
    assert.equal(modal.track, shell === "light" ? "rgb(73, 123, 55)" : "rgb(108, 155, 80)");
    assert.equal(modal.disabledTrack, "rgb(1, 105, 204)");
    assert.equal(modal.offTrack, "rgb(1, 105, 204)");
    assert.equal(modal.foreign, "rgb(255, 255, 255)");
    settingsStylesByShell[shell] = modal;
  }
  // The usage menu opens settings as a full page in the same renderer.
  await page.evaluate(() => {
    const dialog = document.querySelector(".settings-dialog");
    const sidebar = dialog.querySelector("aside");
    const panel = dialog.querySelector("[data-settings-panel]");
    const main = document.createElement("main");
    main.setAttribute("data-app-shell-main-surface", "");
    main.setAttribute("data-ds-part", "main");
    sidebar.className = "app-shell-left-panel";
    sidebar.setAttribute("data-ds-part", "sidebar");
    sidebar.querySelector('[aria-current="page"]').setAttribute("data-settings-panel-slug", "usage");
    panel.setAttribute("data-codex-history-swipe-page", "");
    document.documentElement.style.setProperty("--dream-background-art", 'url("main.png")');
    document.documentElement.style.setProperty("--dream-sidebar-art", 'url("sidebar.png")');
    main.append(panel);
    dialog.replaceWith(sidebar, main);
  });
  const fullSettings = await page.evaluate(`(() => {
    const layout = (${createLayoutAdapter.toString()})(document, window, ${settingsContract}).discover();
    return {page:layout.page, region:layout.regions.settings?.hasAttribute("data-codex-history-swipe-page")};
  })()`);
  assert.deepEqual(fullSettings, {page:"settings", region:true}, "Manage usage must be recognized with no modal or General button");
  for (const shell of ["light", "dark"]) {
    await page.evaluate(value => {
      document.documentElement.dataset.dreamShell = value;
      document.documentElement.dataset.nahidaPage = "settings";
    }, shell);
    const full = await page.evaluate(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      const heading = document.getElementById("usage-heading");
      return {
        surface: style("main").backgroundImage,
        sidebar: style("aside").backgroundImage,
        search: style("[data-sidebar-header-search] > div").backgroundColor,
        selected: style('[aria-current="page"]').backgroundColor,
        selectedShadow: style('[aria-current="page"]').boxShadow,
        cardRadius: style("[data-settings-panel] .rounded-2xl").borderRadius,
        padding: parseFloat(style("[data-settings-search-entry]").paddingInlineStart),
        text: style('section > div[class~="gap-1.5"] p').color,
        gap: heading.nextElementSibling.getBoundingClientRect().top - heading.getBoundingClientRect().bottom,
      };
    });
    const modal = settingsStylesByShell[shell];
    assert.deepEqual(full, {
      surface: modal.surface, sidebar: modal.sidebar, search: modal.search,
      selected: modal.selected, selectedShadow: modal.selectedShadow,
      cardRadius: modal.radius, padding: modal.padding, text: modal.emptyText, gap: 12,
    });
  }
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion:reduce)").matches), true);
  await page.setContent(`<html data-dream-skin="active" data-dream-shell="light" data-nahida-page="thread"><head><style>
    html { --dream-background-art: url("main-background.png"); --dream-right-panel-art: url("secondary-background.png"); }
  </style></head><body><main data-ds-part="main">
    <header data-app-shell-focus-area="right-panel" data-ds-part="right-panel"></header>
    <aside id="secondary-canvas" data-app-shell-focus-area="right-panel">
      <div data-new-tab-scroll-root="true"><button id="secondary-tool" class="rounded-md bg-primary-soft-alpha">工具</button></div>
    </aside>
  </main></body></html>`);
  await page.addStyleTag({ content: await fs.readFile("windows/assets/dream-skin.css", "utf8") });
  for (const shell of ["light", "dark"]) {
    await page.evaluate(value => document.documentElement.setAttribute("data-dream-shell", value), shell);
    const surfaces = await page.evaluate(() => {
      const main = getComputedStyle(document.querySelector('main'));
      const secondary = getComputedStyle(document.getElementById('secondary-canvas'));
      const tool = getComputedStyle(document.getElementById('secondary-tool'));
      return {main:main.backgroundImage, secondary:secondary.backgroundImage, size:secondary.backgroundSize,
        tool:tool.backgroundColor, blur:tool.backdropFilter};
    });
    assert.ok(surfaces.secondary.includes('secondary-background.png'), 'Secondary canvas must use its own artwork when the adapter marks the title bar');
    assert.ok(!surfaces.secondary.includes('main-background.png'));
    assert.ok(surfaces.main.includes('main-background.png'), 'Main background must remain unchanged');
    assert.equal(surfaces.secondary.split(')),')[0], surfaces.main.split(')),')[0], 'Keep the existing background wash');
    assert.equal(surfaces.size.split(',').at(-1).trim(), 'cover');
    assert.equal(surfaces.tool, shell === 'light' ? 'rgba(229, 241, 212, 0.66)' : 'rgba(32, 55, 44, 0.78)');
    assert.equal(surfaces.blur, 'blur(12px)');
  }
  await page.setContent('<html><head></head><body><main></main><nav>Projects</nav><article>Message</article><div role="dialog">Dialog</div></body></html>');
  await page.evaluate(`(() => {
    const adapter = (${createLayoutAdapter.toString()})(document, window, {selectors:[
      {key:'shell-main',selector:'main'}, {key:'project-list',selector:'nav'},
      {key:'message',selector:'article'}, {key:'overlay-dialog',selector:'[role="dialog"]'}]});
    adapter.discover(); window.checkAdapter=adapter;
  })()`);
  const css = ['root','project-list','message','dialog'].map(part => `[data-ds-part="${part}"] { color: #123456; }`).join('\n');
  await page.addStyleTag({ content: decodeAndValidateSafeCss(Buffer.from(css)).runtimeSource });
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-ds-part="root"],[data-ds-part="project-list"],[data-ds-part="message"],[data-ds-part="dialog"]')].map(node=>getComputedStyle(node).color)), Array(4).fill('rgb(18, 52, 86)'));
  await page.evaluate(() => window.checkAdapter.cleanup());
  assert.equal(await page.locator('[data-ds-part]').count(), 0);
  await page.setContent('<html><body><div id="codex-dream-skin-chrome" style="left:0;top:0;width:100vw;height:100vh"><div class="nahida-portrait"><span>LET WISDOM TAKE ROOT</span></div></div></body></html>');
  await page.addStyleTag({ content: await fs.readFile("windows/assets/dream-skin.css", "utf8") });
  const portraits = [];
  for (const viewport of [{width:1200,height:800}, {width:1800,height:1200}, {width:1800,height:800}]) {
    await page.setViewportSize(viewport);
    portraits.push(await page.evaluate(() => {
      const node = document.querySelector('.nahida-portrait');
      const css = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {width:parseFloat(css.width),height:parseFloat(css.height),border:parseFloat(css.borderLeftWidth),
        font:parseFloat(getComputedStyle(node.querySelector('span')).fontSize),inside:rect.right <= innerWidth && rect.bottom <= innerHeight};
    }));
  }
  assert.ok(portraits[1].width > portraits[0].width * 1.45, 'Portrait must grow with the content area');
  assert.ok(portraits[2].width < portraits[1].width, 'Shorter windows must shrink the portrait');
  assert.ok(portraits[1].border > portraits[0].border && portraits[1].font > portraits[0].font, 'Frame and caption must scale with the image');
  assert.ok(portraits.every(p => Math.abs(p.width / p.height - 98 / 130) < .01 && p.inside), 'Portrait must retain its proportions and stay inside the page');
  await page.setContent(`<html data-dream-skin="active" data-dream-shell="light" data-nahida-page="home" data-nahida-hero-mode="full"><body>
    <main data-app-shell-main-surface data-app-shell-frame="true">
      <nav data-app-navigation-rail><button data-sidebar-destination="builtin:home" aria-current="page">Home</button></nav>
      <header data-app-shell-titlebar="true" data-app-shell-application-menu-bar="true">Title bar</header>
      <div role="main">
        <div class="group/home-composer-layout">
          <div id="native-greeting" class="heading-xl"><div><h1>Native greeting</h1></div></div>
          <div data-testid="home-icon">Native Codex emblem</div>
        </div>
        <h1 id="other-heading">Recommendations</h1>
        <form data-composer-placement="home">
          <div data-composer-surface-variant="default" data-composer-radius-variant="default">
            <div data-composer-body style="background-color:white">
              <div contenteditable="true" role="textbox">Draft</div>
            </div>
          </div>
        </form>
      </div>
      <div class="thread-scroll-container" hidden>Inactive thread</div>
    </main>
  </body></html>`);
  await page.addStyleTag({ content: await fs.readFile("windows/assets/dream-skin.css", "utf8") });
  const contract = await fs.readFile("tools/selectors.json", "utf8");
  await page.evaluate(`(() => { window.checkAdapter = (${createLayoutAdapter.toString()})(document, window, ${contract}); })()`);
  const currentHome = await page.evaluate(() => {
    const layout = window.checkAdapter.discover();
    return {
      page: layout.page,
      home: layout.regions.home?.getAttribute("data-ds-part"),
      header: layout.regions.header?.getAttribute("data-ds-part"),
      composer: getComputedStyle(layout.regions.composer).backgroundColor,
      body: getComputedStyle(document.querySelector("[data-composer-body]")).backgroundColor,
    };
  });
  assert.deepEqual(currentHome, {
    page: "home", home: "home", header: "header",
    composer: "rgba(229, 241, 212, 0.66)", body: "rgba(0, 0, 0, 0)",
  });
  assert.deepEqual(await page.evaluate(() => {
    const opacity = id => getComputedStyle(document.getElementById(id)).opacity;
    const themed = opacity("native-greeting");
    const unrelated = opacity("other-heading");
    const emblem = document.querySelector('[data-testid="home-icon"]');
    const emblemWithHero = getComputedStyle(emblem).visibility;
    document.documentElement.setAttribute("data-nahida-hero-mode", "off");
    return { themed, unrelated, fallback: opacity("native-greeting"), emblemWithHero,
      emblemWithoutHero: getComputedStyle(emblem).visibility };
  }), { themed: "0", unrelated: "1", fallback: "1", emblemWithHero: "hidden", emblemWithoutHero: "visible" });
  assert.deepEqual(await page.evaluate(() => {
    const destination = document.querySelector('[data-sidebar-destination="builtin:home"]');
    const composer = document.querySelector('[data-composer-placement="home"]');
    const homeContainer = composer.parentElement;
    destination.removeAttribute('aria-current');
    composer.setAttribute('data-codex-composer-root', '');
    document.body.append(composer);
    const app = window.checkAdapter.discover();
    homeContainer.append(composer);
    composer.removeAttribute('data-codex-composer-root');
    destination.setAttribute('aria-current', 'page');
    const home = window.checkAdapter.discover();
    return { app: app.page, appHomeMarked: Boolean(app.regions.home), home: home.page };
  }), { app: "unknown", appHomeMarked: false, home: "home" });
  assert.equal(await page.evaluate(() => {
    document.querySelector("[role=main]").setAttribute("data-app-shell-active-page", "false");
    document.querySelector(".thread-scroll-container").hidden = false;
    const layout = window.checkAdapter.discover();
    return layout.page === "thread" && !document.querySelector('[data-ds-part="home"]');
  }), true);
  await page.setContent(`<html data-dream-skin="active"><head><style>
    [data-app-shell-surface-backing], main { border-start-start-radius: 12px; }
  </style></head><body>
    <div data-app-shell-frame="true" data-app-shell-application-menu-bar="true"
        style="position:relative;height:200px;--app-shell-titlebar-height:8px">
      <nav data-app-navigation-rail style="position:absolute;inset:44px auto 0 0;width:52px"></nav>
      <div data-app-shell-surface-backing="true" style="position:absolute;inset:36px 0 0 52px"></div>
      <header data-ds-part="header" data-app-shell-titlebar="true" data-app-shell-application-menu-bar="true"
          class="bg-[var(--codex-titlebar-tint,transparent)]" style="position:absolute;inset:36px 0 auto 52px;height:8px"></header>
      <main data-ds-part="main" data-app-shell-main-surface="default" class="mt-(--app-shell-titlebar-height)"
          style="position:absolute;inset:44px 0 0 52px"></main>
    </div>
  </body></html>`);
  await page.addStyleTag({ content: await fs.readFile("windows/assets/dream-skin.css", "utf8") });
  const edges = await page.evaluate(() => {
    const backing = document.querySelector('[data-app-shell-surface-backing]');
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const frame = document.querySelector('[data-app-shell-frame]');
    const rail = document.querySelector('[data-app-navigation-rail]');
    const measure = () => ({
      railOffset: main.getBoundingClientRect().top - rail.getBoundingClientRect().top,
      backingOffset: main.getBoundingClientRect().top - backing.getBoundingClientRect().top,
      bottom: main.getBoundingClientRect().bottom - backing.getBoundingClientRect().bottom,
      corners: [backing, main].map(node => getComputedStyle(node).borderStartStartRadius),
      titlebar: getComputedStyle(header).backgroundColor,
      titlebarHeight: header.getBoundingClientRect().height,
    });
    const compact = measure();
    header.className = 'bg-transparent';
    const compactTransparent = measure();
    header.className = '[--app-shell-titlebar-height:var(--app-shell-header-height)]';
    header.style.top = '44px';
    header.style.height = '46px';
    const full = measure();
    frame.removeAttribute('data-app-shell-application-menu-bar');
    return { compact, compactTransparent, full, otherShell: measure() };
  });
  const aligned = { railOffset: 0, backingOffset: 0, bottom: 0, corners: ["0px", "0px"] };
  assert.deepEqual(edges.compact, { ...aligned, titlebar: "rgba(0, 0, 0, 0)", titlebarHeight: 8 });
  assert.deepEqual(edges.compactTransparent, edges.compact);
  assert.equal(edges.full.titlebarHeight, 46);
  assert.notEqual(edges.full.titlebar, "rgba(0, 0, 0, 0)");
  assert.equal(edges.full.backingOffset, 0);
  assert.deepEqual(edges.full.corners, aligned.corners);
  assert.equal(edges.otherShell.backingOffset, 8);
  assert.deepEqual(edges.otherShell.corners, ["12px", "12px"]);
  await page.setContent(`<html data-dream-skin="active"><head><style>
    .me-1 { margin-inline-end: 4px; }
  </style></head><body>
    <header data-app-shell-titlebar="true" data-app-shell-application-menu-bar="true" class="me-1"
        style="position:fixed;inset:44px 0 auto 200px;height:46px">
      <div data-app-shell-focus-area="right-panel" style="position:absolute;inset:0 0 0 auto;width:400px">
        <div data-app-shell-tab-row="true">New tab</div>
      </div>
    </header>
    <aside data-app-shell-focus-area="right-panel" style="position:fixed;inset:90px 0 0 auto;width:400px"></aside>
  </body></html>`);
  await page.addStyleTag({ content: await fs.readFile("windows/assets/dream-skin.css", "utf8") });
  const dock = await page.evaluate(() => {
    const titlebar = document.querySelector("header");
    const strip = titlebar.querySelector('[data-app-shell-focus-area="right-panel"]');
    const body = document.querySelector("aside");
    const start = node => node.getBoundingClientRect().left;
    const open = { offset: start(strip) - start(body), titlebarStart: start(titlebar) };
    strip.firstElementChild.remove();
    return { ...open, closedMargin: getComputedStyle(titlebar).marginInlineEnd };
  });
  assert.deepEqual(dock, { offset: 0, titlebarStart: 200, closedMargin: "4px" });
  await page.setContent(`<html data-dream-skin="active" data-dream-shell="light"><head><style>
    .native-tooltip { background-color: #0d0d0d; color: white; border-radius: 16px; }
  </style></head><body>
    <div data-radix-popper-content-wrapper id="rail-tip"><div role="tooltip" class="native-tooltip">Sites</div></div>
    <div data-radix-popper-content-wrapper id="usage-menu"><div role="menu">Usage</div></div>
    <div data-radix-popper-content-wrapper id="usage-tip"><div role="tooltip" class="native-tooltip">Weekly reset</div></div>
  </body></html>`);
  await page.addStyleTag({ content: await fs.readFile("windows/assets/dream-skin.css", "utf8") });
  for (const shell of ["light", "dark"]) {
    const tips = await page.evaluate(scheme => {
      document.documentElement.dataset.dreamShell = scheme;
      const style = selector => getComputedStyle(document.querySelector(selector));
      const tooltip = id => ({
        fill: style(`${id} > [role="tooltip"]`).backgroundColor,
        text: style(`${id} > [role="tooltip"]`).color,
        radius: style(`${id} > [role="tooltip"]`).borderRadius,
        wrapper: style(id).backgroundColor,
      });
      return { rail: tooltip("#rail-tip"), usage: tooltip("#usage-tip"), menu: style('[role="menu"]').backgroundColor };
    }, shell);
    const fill = shell === "light" ? "rgba(247, 250, 239, 0.94)" : "rgba(28, 46, 36, 0.97)";
    const color = shell === "light" ? "rgb(55, 106, 69)" : "rgb(201, 237, 145)";
    assert.deepEqual(tips.rail, { fill, text: color, radius: "16px", wrapper: "rgba(0, 0, 0, 0)" });
    assert.deepEqual(tips.usage, tips.rail);
    assert.equal(tips.menu, fill);
  }
  console.log(JSON.stringify({ pass: true, portraits, ...result }));
} finally { await browser.close(); }
