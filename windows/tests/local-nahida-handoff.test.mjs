import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const windowsRoot = path.resolve(here, "..");
const localStartPath = path.join(windowsRoot, "scripts", "start-dream-skin.ps1");
const localInstallPath = path.join(windowsRoot, "scripts", "install-dream-skin.ps1");
const loginLauncherPath = path.join(windowsRoot, "scripts", "launch-dream-skin-at-login.mjs");
const managerTrayPath = path.join(windowsRoot, "scripts", "tray-dream-skin.ps1");
const managerThemePath = path.join(windowsRoot, "scripts", "theme-windows.ps1");

const localStart = fs.readFileSync(localStartPath, "utf8");
assert.match(localStart, /Initialize-DreamSkinThemeStore/);
assert.match(localStart, /Get-DreamSkinActiveThemeAppearance/);
assert.match(localStart, /\[switch\]\$RestartExisting/);
assert.doesNotMatch(localStart, /\[switch\]\$UseLocalTheme|\[switch\]\$AllowDeferredVerify/);

const localInstall = fs.readFileSync(localInstallPath, "utf8");
assert.match(localInstall, /\$engine\.LoginLauncher/);
assert.match(localInstall, /Codex Dream Skin Auto Start\.lnk/);

const selfTest = spawnSync(process.execPath, [loginLauncherPath, "--self-test"], {
  cwd: windowsRoot,
  encoding: "utf8",
});
assert.equal(selfTest.status, 0, selfTest.stderr || selfTest.stdout);
const selfTestResult = JSON.parse(selfTest.stdout);
assert.equal(selfTestResult.restartExisting, true);
assert.equal(selfTestResult.explicitProfile, true);
assert.equal(selfTestResult.legacyFlagsPresent, false);

const managerTheme = fs.readFileSync(managerThemePath, "utf8");
assert.match(managerTheme, /function Initialize-DreamSkinThemeStore/);
assert.match(managerTheme, /\^\[A-Za-z0-9\]\[A-Za-z0-9_-\]\{0,71\}\$/);

const managerTray = fs.readFileSync(managerTrayPath, "utf8");
assert.match(managerTray, /launch-dream-skin-at-login\.mjs/);
assert.match(managerTray, /Codex Dream Skin Auto Start\.lnk/);
assert.doesNotMatch(
  managerTray.match(/function Set-DreamSkinAutoStart[\s\S]*?^  }/m)?.[0] || "",
  /tray-dream-skin\.ps1/,
);

console.log("PASS: active Nahida theme uses the current login startup contract.");
