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
  console.log(JSON.stringify({ pass: true, portraits, ...result }));
} finally { await browser.close(); }
