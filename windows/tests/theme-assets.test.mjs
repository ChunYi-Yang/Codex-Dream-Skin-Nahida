import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const assets = path.join(root, "assets");
const theme = JSON.parse(await fs.readFile(path.join(assets, "theme.json"), "utf8"));
const css = await fs.readFile(path.join(assets, "dream-skin.css"), "utf8");
const injector = await fs.readFile(path.join(root, "scripts", "injector.mjs"), "utf8");

assert.equal(theme.appLabel, "虚空终端");

function imageMetadata(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return {
      format: "png",
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      alpha: [4, 6].includes(buffer[25]),
    };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        return {
          format: "jpeg",
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
          alpha: false,
        };
      }
      if (marker === 0xd9 || marker === 0xda) break;
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
  }
  throw new Error("Unsupported or malformed theme image");
}

const expected = {
  hero: [2570, 1280, false],
  background: [1754, 1240, false],
  sidebar: [640, 1120, false],
  rightPanel: [600, 1000, false],
  portrait: [760, 920, false],
  decorations: [1024, 512, true],
  scene: [1024, 1024, true],
};
const files = { hero: theme.image, ...theme.images };
assert.deepEqual(Object.keys(files).sort(), Object.keys(expected).sort());
assert.equal(new Set(Object.values(files)).size, Object.keys(expected).length);

for (const [slot, filename] of Object.entries(files)) {
  assert.equal(path.basename(filename), filename, `${slot} escapes the asset directory`);
  const buffer = await fs.readFile(path.join(assets, filename));
  assert.ok(buffer.length > 0 && buffer.length <= 16 * 1024 * 1024, `${slot} has an invalid size`);
  const metadata = imageMetadata(buffer);
  assert.deepEqual(
    [metadata.width, metadata.height, metadata.alpha],
    expected[slot],
    `${slot} dimensions or alpha channel changed`,
  );
}

assert.equal(theme.images.rightPanel, "nahida-toggle-panel.png");
const togglePanel = await fs.readFile(path.join(assets, theme.images.rightPanel));
assert.equal(
  createHash("sha256").update(togglePanel).digest("hex"),
  "f1efc3b6b939f05877d6ba60a2b4f30648328698879b23cb6fa7dac68e31b22c",
  "the Toggle side panel must use the user-supplied Nahida artwork",
);

assert.match(css, /\.dream-settings-surface[\s\S]*var\(--dream-background-art\)/);
assert.match(css, /\.composer-surface-chrome[\s\S]*background: var\(--dream-panel-glass\)/);
assert.match(css, /\.dream-home \.dream-home-hero-surface[\s\S]*width: min\(980px[\s\S]*background: var\(--dream-art\)/);
assert.doesNotMatch(
  css,
  /\.dream-home > div:first-child > div:first-child > div:first-child/,
  "home hero art must target only the injected hero surface",
);
assert.match(css, /\.dream-home \.group\\\/home-suggestions \{[\s\S]*display: none !important/);
assert.match(css, /\.dream-home \.dream-home-composer-surface[\s\S]*bottom: 18px[\s\S]*width: min\(980px/);
assert.match(css, /\.dream-home \{[\s\S]*position: relative !important[\s\S]*overflow: hidden !important[\s\S]*scrollbar-width: none/);
assert.match(css, /\.dream-home \*:has\(\.dream-home-hero-surface\)[\s\S]*position: static !important/);
assert.match(
  css,
  /div:has\(\.dream-home-hero-surface\) > div:first-child:not\(\.dream-home-hero-surface\)[\s\S]*height: auto !important/,
);
assert.match(css, /main\.main-surface\.dream-home-shell[\s\S]*app-shell-main-content-frame[\s\S]*overflow: hidden/);
assert.match(css, /main\.main-surface\.dream-home-shell \.dream-home-composer-surface[\s\S]*bottom: 18px/);
assert.match(css, /dream-home-hero-surface \[data-feature="game-source"\][\s\S]*left: 40px[\s\S]*transform: translateY\(-50%\)/);
assert.match(css, /dream-home-composer-surface[\s\S]*gap: 0[\s\S]*width: min\(980px/);
assert.match(
  css,
  /data-composer-rail\]\[data-composer-rail-placement="above"\][\s\S]*margin: 0 !important[\s\S]*rgba\(200, 229, 177, \.82\)/,
  "the home utility rail must connect directly to the composer without a white gap",
);
assert.match(
  css,
  /data-composer-rail-item\]\[data-composer-rail-variant="controls"\][\s\S]*background: transparent !important/,
  "the native grey rail canvas must reveal the joined green surface",
);
assert.match(css, /horizontal-scroll-fade-mask \.group\\\/project-selector\)[\s\S]*display: inline-flex[\s\S]*width: fit-content[\s\S]*min-height: 40px[\s\S]*padding: 6px 12px 6px 96px[\s\S]*border-bottom: 0/);
assert.match(css, /horizontal-scroll-fade-mask \.group\\\/project-selector\)::before[\s\S]*top: 50%[\s\S]*transform: translateY\(-50%\)/);
assert.match(css, /horizontal-scroll-fade-mask \.group\\\/project-selector\)[\s\S]*> \.horizontal-scroll-fade-mask[\s\S]*width: auto[\s\S]*overflow: visible/);
assert.match(css, /\.dream-home \.group\\\/project-selector \{[\s\S]*display: inline-flex[\s\S]*width: auto/);
assert.match(css, /\.group\\\/project-selector > button[\s\S]*z-index: 61[\s\S]*height: auto[\s\S]*min-height: 32px[\s\S]*padding-block: 3px[\s\S]*line-height: 1\.25[\s\S]*overflow: visible/);
assert.match(css, /\.group\\\/project-selector > button :is\(span, p, div\)[\s\S]*line-height: 1\.25[\s\S]*overflow: visible/);
assert.match(css, /dream-home-composer-surface \.composer-surface-chrome[\s\S]*z-index: 1[\s\S]*margin-top: 0/);
assert.match(css, /\.dream-home \.home-banners[\s\S]*display: none !important[\s\S]*flex: 0 0 0[\s\S]*\.dream-home > div:first-child > div:first-child:not\(\.home-banners\)/);
assert.match(css, /\.dream-home-shell \.composer-surface-chrome::before[\s\S]*display: none !important/);
assert.match(css, /data-app-shell-focus-area="right-panel"[\s\S]*var\(--dream-right-panel-art\)/);
assert.match(css, /main\.main-surface[\s\S]*aside\[data-app-shell-focus-area="right-panel"\][\s\S]*background:[\s\S]*var\(--dream-right-panel-art\)/);
assert.match(css, /main\.main-surface \{[\s\S]*overflow: clip !important/);
assert.match(css, /aside\[data-app-shell-focus-area="right-panel"\][\s\S]*height: calc\(100% - var\(--app-shell-main-content-frame-top-offset, 46px\)\)[\s\S]*margin-top: var\(--app-shell-main-content-frame-top-offset, 46px\)/);
assert.match(css, /aside\[data-app-shell-focus-area="right-panel"\][\s\S]*bg-token-main-surface[\s\S]*background-color: transparent/);
assert.match(css, /right-panel[\s\S]*ul:has\(> li > button\[class\*="bg-token-bg-fog"\]\)[\s\S]*gap: 8px/);
assert.match(css, /right-panel[\s\S]*ul:has\(> li > button\[class\*="bg-token-bg-fog"\]\) > li > button[\s\S]*background: var\(--dream-panel-glass\)[\s\S]*border-radius: 16px/);
assert.match(
  css,
  /html\.codex-dream-skin :where\(\*, \*::before, \*::after\)[\s\S]*border-color: transparent !important[\s\S]*outline-color: transparent !important[\s\S]*box-shadow: none !important/,
  "all injected skin borders and inset rings must be transparent",
);
assert.match(
  css,
  /html\.codex-dream-skin\[data-codex-window-type\]\[data-window-type\]\[lang\]\[class\][\s\S]*body \*[\s\S]*border-color: transparent !important[\s\S]*box-shadow: none !important/,
  "high-specificity utility override must remove native border and ring colors",
);
assert.doesNotMatch(
  css,
  /:is\(div, section, aside\):has\([\s\S]{0,120}\[data-app-shell-tabs="true"\][\s\S]{0,300}var\(--dream-right-panel-art\)/,
  "opening the Toggle side panel must not paint its artwork on a main-page ancestor",
);
assert.match(
  css,
  /aside\[data-app-shell-focus-area="right-panel"\][\s\S]*\[class~="bg-token-main-surface-primary"\][\s\S]*background: transparent !important/,
  "the Toggle side panel must reveal its assigned artwork instead of a white canvas",
);
assert.ok(
  css.includes('[class*="bg-[var(--app-shell-panel-background"]'),
  "the current app-shell panel canvas selector must be explicitly cleared",
);
assert.match(
  css,
  /aside\[data-app-shell-focus-area="right-panel"\][\s\S]*border: 0 !important[\s\S]*box-shadow: none !important/,
  "the Toggle side panel anchor must remain borderless",
);
assert.match(
  css,
  /aside\[data-app-shell-focus-area="right-panel"\][\s\S]*\[class~="bg-primary-soft-alpha"\][\s\S]*background: rgba\(216, 237, 199, \.38\)/,
  "the Toggle side panel action rows must remain readable green glass",
);
assert.ok(css.includes(
  'aside[data-app-shell-focus-area="right-panel"]:has(\n' +
  '    [data-app-shell-tab-panel-controller="right"][data-tab-id="diff"]\n' +
  '  )',
));
assert.match(css, /data-tab-id="diff"[\s\S]*height: calc\(100% - var\(--app-shell-main-content-frame-top-offset, 46px\)\) !important;[\s\S]*margin-top: var\(--app-shell-main-content-frame-top-offset, 46px\) !important;[\s\S]*var\(--dream-right-panel-art\)/);
assert.match(css, /data-tab-id="diff"[\s\S]*data-app-shell-tabs="true"[\s\S]*background-color: transparent[\s\S]*data-app-shell-tabs="true"\] > div:first-child[\s\S]*rgba\(240, 248, 232, \.58\)/);
assert.match(css, /data-tab-id="diff"[\s\S]*bg-token-main-surface[\s\S]*background-color: rgba\(235, 245, 226, \.15\)/);
assert.match(css, /data-tab-id="diff"[\s\S]*container-name:review-header[\s\S]*rgba\(240, 248, 232, \.62\)/);
assert.match(css, /data-tab-id="diff"[\s\S]*#review-diffs-open[\s\S]*--codex-diffs-surface-override: rgba\(235, 245, 226, \.15\)[\s\S]*codex-review-diff-card, diffs-container[\s\S]*rgba\(235, 245, 226, \.15\)/);
assert.match(css, /data-tab-id="diff"[\s\S]*review-changed-files-search[\s\S]*rgba\(247, 250, 239, \.84\)/);
assert.match(css, /data-tab-id="diff"[\s\S]*file-tree-container\[data-file-tree-virtualized="true"\][\s\S]*--color-token-main-surface-primary: rgba\(235, 245, 226, \.15\)/);
assert.match(css, /data-tab-id\^="file:"[\s\S]*workspace-directory-tree-search[\s\S]*rgba\(247, 250, 239, \.84\)/);
assert.match(css, /data-tab-id\^="file:"[\s\S]*nav\[class\*="bg-token-main-surface"\][\s\S]*rgba\(240, 248, 232, \.62\)/);
assert.match(css, /data-tab-id\^="file:"[\s\S]*file-tree-container\[data-file-tree-virtualized="true"\][\s\S]*--color-token-main-surface-primary: rgba\(235, 245, 226, \.15\)[\s\S]*background: rgba\(235, 245, 226, \.15\)/);
assert.match(css, /data-tab-id\^="terminal:"[\s\S]*data-codex-terminal="true"[\s\S]*--vscode-terminal-background: transparent[\s\S]*rgba\(235, 245, 226, \.15\)/);
assert.match(css, /data-tab-id\^="terminal:"[\s\S]*\.xterm-viewport[\s\S]*background: transparent/);
assert.match(css, /--dream-panel-glass: rgba\(216, 237, 199, \.50\)/);
assert.match(css, /dream-settings-surface \[style\*="--color-background-panel"\]/);
assert.match(css, /data-settings-panel-slug="appearance"[\s\S]*data-testid="theme-preview"[\s\S]*--codex-diffs-surface-override: rgba\(235, 245, 226, \.15\)/);
assert.match(css, /data-settings-panel-slug="git-settings"[\s\S]*input:not[\s\S]*rgba\(247, 250, 239, \.84\)[\s\S]*git-settings[\s\S]*textarea[\s\S]*rgba\(235, 245, 226, \.15\)/);
assert.match(css, /data-settings-panel-slug="voice"[\s\S]*input:not[\s\S]*rgba\(247, 250, 239, \.84\)/);
assert.match(css, /#personal-agents-editor[\s\S]*rgba\(235, 245, 226, \.15\)/);
assert.match(css, /data-settings-panel-slug="keyboard-shortcuts"[\s\S]*div\.sticky:has\(input\[type="text"\]\)[\s\S]*background: transparent[\s\S]*border: 0[\s\S]*::after[\s\S]*display: none[\s\S]*div:has\(> input\[type="text"\]\)[\s\S]*rgba\(247, 250, 239, \.84\)/);
assert.match(css, /div\.sticky:has\(#scheduled-page-search\)[\s\S]*div\.sticky:has\(#plugins-page-search\)[\s\S]*background: transparent[\s\S]*border: 0[\s\S]*#scheduled-page-search\)::after[\s\S]*#plugins-page-search\)::after[\s\S]*display: none/);
assert.match(css, /div:has\(> #scheduled-page-search\)[\s\S]*div:has\(> #plugins-page-search\)[\s\S]*rgba\(247, 250, 239, \.84\)[\s\S]*rgba\(103, 157, 69, \.38\)/);
assert.match(css, /\[class~="sticky"\]:has\(\.composer-surface-chrome\)[\s\S]*padding-bottom: 12px/);
assert.match(css, /bg-gradient-to-t[\s\S]*display: none/);
assert.match(
  css,
  /\.thread-scroll-container[\s\S]*--thread-content-max-width: min\(1200px, calc\(100cqw - 72px\)\)/,
  "thread content and its composer must use the requested wider layout",
);
assert.match(css, /header\.app-header-tint[\s\S]*background: var\(--dream-panel-glass\)/);
assert.match(css, /header\.app-header-tint[\s\S]*width: clamp\(520px, 40%, 760px\)/);
assert.match(css, /header\.app-header-tint[\s\S]*margin-inline: auto/);
assert.match(css, /main\.main-surface:is\(\.dream-home-shell, \.dream-settings-shell\) > header\.app-header-tint[\s\S]*display: none/);
assert.match(css, /main\.main-surface\.dream-settings-shell > header[\s\S]*display: none/);
assert.match(css, /main\.main-surface\.dream-settings-shell[\s\S]*:has\(> \.dream-settings-surface\)[\s\S]*class~="px-panel"[\s\S]*class~="draggable"[\s\S]*display: none/);
assert.match(css, /main\.main-surface:not\(\.dream-home-shell\):not\(\.dream-settings-shell\) > header\.app-header-tint[\s\S]*display: flex/);
assert.match(css, /main\.main-surface:is\(\.dream-home-shell, \.dream-settings-shell\)[\s\S]*app-shell-main-content-frame[\s\S]*border-top: 0[\s\S]*background: transparent/);
assert.match(css, /main\.main-surface\.dream-route-shell[\s\S]*app-shell-main-content-frame[\s\S]*border-top: 0[\s\S]*background: transparent[\s\S]*box-shadow: none/);
assert.match(css, /main\.main-surface\.dream-route-shell[\s\S]*\[class\*="bg-token-main-surface"\][\s\S]*background-color: rgba\(235, 245, 226, \.05\)[\s\S]*backdrop-filter: none/);
assert.match(css, /main\.main-surface\.dream-settings-shell[\s\S]*--app-shell-main-content-frame-top-offset: 0px/);
assert.match(css, /main\.main-surface\.dream-settings-shell[\s\S]*app-shell-main-content-frame[\s\S]*margin-top: 0/);
assert.match(css, /main\.main-surface\.dream-settings-shell[\s\S]*:has\(> div\.relative\.flex\.min-h-0\.flex-1[\s\S]*dream-settings-surface[\s\S]*margin-top: 0[\s\S]*height: 100%/);
assert.doesNotMatch(css, /data-pip-obstacle="thread-footer"[\s\S]*40cqw/);
assert.match(css, /data-above-composer-portal[\s\S]*bg-gradient-to-t[\s\S]*display: none/);
assert.match(css, /data-above-composer-portal[\s\S]*bg-token-input-background[\s\S]*background: var\(--dream-panel-glass\)/);
assert.match(css, /data-codex-composer-root[\s\S]*bg-token-input-background[\s\S]*background: var\(--dream-panel-glass\)/);
assert.match(
  css,
  /html\.codex-dream-skin \.thread-scroll-container[\s\S]*\[class~="sticky"\] > \[class~="bg-gradient-to-t"\][\s\S]*display: none !important/,
  "the thread composer footer must not restore a white strip above the green composer",
);
const semanticThreadGradient = css.indexOf(
  'html.codex-dream-skin main.main-surface [class~="sticky"]:has(\n' +
  '  [data-codex-composer-root][data-composer-placement="thread"]\n' +
  ') > [class~="bg-gradient-to-t"]',
);
assert.ok(semanticThreadGradient >= 0, "semantic thread composer gradient is not themed");
assert.match(css.slice(semanticThreadGradient, semanticThreadGradient + 420), /display: none !important/);
const queuedMessageSurface = css.indexOf(
  'html.codex-dream-skin [class~="bg-background-primary-soft/70"]:has(\n' +
  '  [data-markdown-copy="exclude"][class~="cursor-interaction"]\n' +
  ')',
);
assert.ok(queuedMessageSurface >= 0, "semantic queued message surface is not themed");
assert.match(
  css.slice(queuedMessageSurface, queuedMessageSurface + 520),
  /background: rgba\(200, 229, 177, \.90\)[\s\S]*background-color: rgba\(200, 229, 177, \.90\)[\s\S]*border-color: rgba\(103, 157, 69, \.34\)/,
);
assert.match(css, /data-codex-composer-root[\s\S]*data-composer-surface-variant[\s\S]*background: var\(--dream-panel-glass\)[\s\S]*border-color: rgba\(103, 157, 69, \.34\)/);
assert.match(
  css,
  /dream-home-shell[\s\S]*data-composer-placement="home"[\s\S]*data-composer-surface-variant[\s\S]*border-color: rgba\(96, 153, 65, \.55\)[\s\S]*background: rgba\(200, 229, 177, \.82\)/,
);
assert.match(
  css,
  /data-composer-placement="home"[\s\S]*data-composer-surface-variant[\s\S]*> \[data-composer-layout\][\s\S]*background: transparent[\s\S]*backdrop-filter: none/,
);
assert.match(css, /data-composer-rail-item[\s\S]*data-composer-rail-variant="controls"[\s\S]*background: transparent/);
assert.match(css, /thread-scroll-container \{[\s\S]*--color-token-main-surface-primary: transparent[\s\S]*--color-token-bg-primary: transparent/);
assert.match(css, /thread-scroll-container[\s\S]*data-content-search-unit-key\$=":assistant"[\s\S]*\[class\*="bg-white"\][\s\S]*\[class\*="bg-\[\"\][\s\S]*background: transparent/);
assert.match(css, /thread-scroll-container[\s\S]*data-content-search-unit-key\$=":assistant"[\s\S]*\[class\*="rounded"\]\[class\*="bg-token-main-surface"\][\s\S]*background: transparent[\s\S]*box-shadow: none/);
assert.match(css, /thread-scroll-container[\s\S]*data-content-search-unit-key\$=":assistant"[\s\S]*blockquote[\s\S]*background: transparent[\s\S]*box-shadow: none/);
assert.match(css, /data-thread-find-target="conversation"[\s\S]*background: transparent[\s\S]*--color-token-main-surface-primary: transparent[\s\S]*--color-token-bg-primary: transparent/);
assert.match(css, /data-content-search-unit-key\$=":assistant"\] \{[\s\S]*border: 0[\s\S]*background: transparent[\s\S]*padding: 0[\s\S]*box-shadow: none/);
assert.match(css, /data-content-search-unit-key\$=":assistant"[\s\S]*_markdownContent_[\s\S]*background: transparent[\s\S]*padding: 0[\s\S]*box-shadow: none/);
assert.match(css, /data-content-search-unit-key\$=":assistant"[\s\S]*_markdownContent_[\s\S]*> :where\(p, ul, ol, h1, h2, h3, h4, h5, h6, table, blockquote\)[\s\S]*background: transparent[\s\S]*padding: 0[\s\S]*box-shadow: none/);
const assistantOutputCss = css.slice(
  css.indexOf('html.codex-dream-skin .thread-scroll-container\n  [data-content-search-unit-key$=":assistant"]'),
  css.indexOf('html.codex-dream-skin [data-thread-find-target="conversation"] [data-user-message-bubble]'),
);
assert.doesNotMatch(assistantOutputCss, /rgba\(216, 237, 199, \.42\)/);
const assistantRoleOutputCss = css.slice(
  css.indexOf('html.codex-dream-skin .thread-scroll-container\n  [data-message-author-role="assistant"]'),
  css.indexOf('html.codex-dream-skin .thread-scroll-container div:has(> .group\\/turn-diff-header)'),
);
assert.doesNotMatch(assistantRoleOutputCss, /rgba\(216, 237, 199, \.42\)/);
assert.match(css, /data-oai-writing-block-surface\]\[data-markdown-copy="code-block"\][\s\S]*--oai-wb-surface-primary: rgba\(216, 237, 199, \.15\)[\s\S]*background: rgba\(216, 237, 199, \.15\)[\s\S]*backdrop-filter: blur\(16px\)/);
assert.match(css, /data-user-message-bubble[\s\S]*background: rgba\(0, 0, 0, \.04\)/);
assert.doesNotMatch(css, /data-user-message-bubble[\s\S]{0,260}rgba\(216, 237, 199, \.42\)/);
assert.match(
  css,
  /group\\\/turn-diff-header[\s\S]*background: transparent !important[\s\S]*backdrop-filter: none !important/,
  "changed-file cards must reveal the task wallpaper instead of adding glass",
);
assert.match(
  css,
  /text-size-chat\.text-secondary > button:has\(\.tabular-nums\)[\s\S]*background: transparent !important/,
  "duration disclosures at the bottom of turns must remain transparent",
);
assert.match(
  css,
  /\[class~="group\/activity-header"\][\s\S]*\[class~="group\/activity-header"\] > button[\s\S]*background: transparent !important/,
  "agent activity labels and their expansion buttons must not paint text backplates",
);
assert.match(
  css,
  /\[class~="group\/turn-diff-header"\] button[\s\S]*\[class~="group\/turn-diff-file-row"\] > button[\s\S]*background: transparent !important/,
  "changed-file headers and rows must remain transparent",
);
assert.match(
  css,
  /\[data-in-progress-fixed-content\] \[class~="bg-background-primary-soft\/70"\][\s\S]*\[data-in-progress-fixed-content\] button[\s\S]*backdrop-filter: none !important/,
  "the fixed changed-file summary must not add a pill or blur behind its text",
);
assert.match(
  css,
  /\[data-thread-user-message-navigation-item-id\][\s\S]*background: transparent !important[\s\S]*backdrop-filter: none !important/,
  "the floating user-message navigation buttons must not merge into a green backplate",
);
assert.match(css, /\.composer-surface-chrome[\s\S]*box-shadow: inset 0 0 0 1px/);
const semanticComposerAction = css.indexOf(
  'html.codex-dream-skin [data-codex-composer-root]\n' +
  '  button[class~="bg-primary-solid"]',
);
assert.ok(semanticComposerAction >= 0, "semantic composer action button is not themed");
assert.match(
  css.slice(semanticComposerAction, semanticComposerAction + 520),
  /background: var\(--dream-accent\)[\s\S]*color: #fff/,
);
assert.doesNotMatch(css, /dream-summary-panel-(?:close|reopen|hidden)/);
assert.match(css, /group\/section-toggle[\s\S]*opacity: 1 !important/);
assert.match(css, /\[role="dialog"\][\s\S]*background: rgba\(216, 237, 199, \.68\)[\s\S]*backdrop-filter: blur\(16px\)/);
assert.match(css, /data-radix-popper-content-wrapper[\s\S]*rgba\(216, 237, 199, \.68\)/);
assert.match(css, /role="menu"[\s\S]*role="listbox"[\s\S]*background: rgba\(216, 237, 199, \.68\)/);
assert.match(css, /data-composer-overlay-floating-ui[\s\S]*background: rgba\(216, 237, 199, \.68\)[\s\S]*bg-token-dropdown-background[\s\S]*background: rgba\(216, 237, 199, \.42\)/);
assert.match(css, /data-radix-popper-content-wrapper[\s\S]*data-slot\^="thread-summary-panel-"[\s\S]*background: transparent/);
assert.match(css, /bg-token-dropdown-background[\s\S]*data-slot\^="thread-summary-panel-"[\s\S]*rgba\(216, 237, 199, \.60\)[\s\S]*backdrop-filter: blur\(16px\)/);
assert.match(
  css,
  /input\[placeholder\*="archived" i\][\s\S]*background: var\(--dream-panel-glass\)[\s\S]*border-color: rgba\(103, 157, 69, \.22\)/,
  "archived chat filters must not sit on an opaque white toolbar",
);
assert.match(injector, /settings: box\(document\.querySelector\('\.dream-settings-surface'\)\)[\s\S]*pageSearch: box\(document\.querySelector\('#scheduled-page-search, #plugins-page-search'\)\)[\s\S]*navPage: box\(navPage\)[\s\S]*const focusReady = Boolean\([\s\S]*result\.composer \|\| result\.settings \|\| result\.pageSearch \|\| result\.navPage[\s\S]*result\.homeVisible && \(result\.hero \|\| result\.homeFallback\)[\s\S]*result\.pass =[\s\S]*focusReady/);

console.log("PASS: Windows Nahida theme assets are complete, bounded, and structurally valid.");
