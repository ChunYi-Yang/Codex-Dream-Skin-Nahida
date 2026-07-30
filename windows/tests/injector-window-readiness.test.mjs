import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { verifySession } from "../scripts/injector.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const startPath = path.resolve(here, "../scripts/start-dream-skin.ps1");

function rect(width = 800, height = 600, x = 0, y = 0) {
  return { x, y, width, height, right: x + width, bottom: y + height };
}

function element({ bounds = rect(), style = {}, query = () => null, queryAll = () => [] } = {}) {
  return {
    getBoundingClientRect: () => bounds,
    querySelector: query,
    querySelectorAll: queryAll,
    _style: {
      display: "block",
      visibility: "visible",
      opacity: "1",
      pointerEvents: "auto",
      ...style,
    },
  };
}

function fixture({
  version = "1.1.75",
  sidebar = element({ bounds: rect(320, 800) }),
  composer = element({ bounds: rect(820, 140, 380, 620) }),
  settings = null,
  home = null,
  homeShell = null,
  homeFallback = null,
  chromePointerEvents = "none",
} = {}) {
  const styleNode = {};
  const chromeNode = element({ style: { pointerEvents: chromePointerEvents } });
  const documentElement = {
    classList: { contains: (name) => name === "codex-dream-skin" },
    scrollWidth: 1280,
    clientWidth: 1280,
    scrollHeight: 800,
    clientHeight: 800,
    style: { getPropertyValue: () => "" },
  };
  const document = {
    documentElement,
    body: element(),
    getElementById(id) {
      if (id === "codex-dream-skin-style") return styleNode;
      if (id === "codex-dream-skin-chrome") return chromeNode;
      if (id === "codex-dream-home-fallback") return homeFallback;
      return null;
    },
    querySelector(selector) {
      if (selector === ".dream-home") return home;
      if (selector === "main.main-surface.dream-home-shell") return homeShell;
      if (selector === ".composer-surface-chrome") return composer;
      if (selector === ".dream-settings-surface") return settings;
      if (selector === "aside.app-shell-left-panel") return sidebar;
      return null;
    },
    querySelectorAll: () => [],
  };
  return {
    document,
    window: { __CODEX_DREAM_SKIN_STATE__: { version } },
    innerWidth: 1280,
    innerHeight: 800,
    getComputedStyle: (node) => node?._style ?? {},
  };
}

async function verify(dom) {
  return verifySession({
    async evaluate(expression) {
      return vm.runInNewContext(expression, dom);
    },
  });
}

test("a themed task route with native sidebar and composer passes", async () => {
  const result = await verify(fixture());
  assert.equal(result.pass, true);
  assert.deepEqual({ ...result.viewport }, { width: 1280, height: 800 });
  assert.equal(result.documentOverflow.x, false);
  assert.equal(result.documentOverflow.y, false);
});

test("missing native anchors or mismatched injected state fail", async () => {
  assert.equal((await verify(fixture({ sidebar: null }))).pass, false);
  assert.equal((await verify(fixture({ composer: null }))).pass, false);
  assert.equal((await verify(fixture({ version: "stale" }))).pass, false);
  assert.equal((await verify(fixture({ chromePointerEvents: "auto" }))).pass, false);
});

test("a visible home route requires its hero or fallback card", async () => {
  const hero = element({ bounds: rect(900, 300, 350, 80) });
  const withHero = element({
    bounds: rect(900, 700, 350, 50),
    query: (selector) => selector === ".dream-home-hero-surface" ? hero : null,
  });
  assert.equal((await verify(fixture({ home: withHero, homeShell: element() }))).pass, true);

  const withoutHero = element({ bounds: rect(900, 700, 350, 50) });
  assert.equal((await verify(fixture({ home: withoutHero, homeShell: element() }))).pass, false);

  const fallbackCard = element({ bounds: rect(720, 260, 420, 180) });
  const fallback = element({
    query: (selector) => selector === ".dream-home-fallback-card" ? fallbackCard : null,
  });
  assert.equal((await verify(fixture({ home: withoutHero, homeFallback: fallback }))).pass, true);
});

test("startup rolls back before reporting success when verification fails", async () => {
  const source = await fs.readFile(startPath, "utf8");
  const verifyStart = source.indexOf("$verifyProcess = Start-Process");
  const verifyExit = source.indexOf("$verifyExitCode = $verifyProcess.ExitCode", verifyStart);
  const failureThrow = source.indexOf('throw "Dream Skin verification failed.', verifyExit);
  const startupCatch = source.indexOf("$startupError = $_", failureThrow);
  const stateCleanup = source.indexOf("Remove-Item -LiteralPath $StatePath", startupCatch);
  const rethrow = source.indexOf("throw $startupError", stateCleanup);
  const activeMessage = source.indexOf('Write-Host "Codex Dream Skin is active', rethrow);
  assert.ok(
    verifyStart >= 0 && verifyExit > verifyStart && failureThrow > verifyExit &&
      startupCatch > failureThrow && stateCleanup > startupCatch &&
      rethrow > stateCleanup && activeMessage > rethrow,
    "Verification failure must clean transient state and rethrow before the active message.",
  );
});
