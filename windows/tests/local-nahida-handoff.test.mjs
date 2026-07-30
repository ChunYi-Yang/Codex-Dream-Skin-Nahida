import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const windowsRoot = path.resolve(here, "..");
const localStartPath = path.join(windowsRoot, "scripts", "start-dream-skin.ps1");
const localCommonPath = path.join(windowsRoot, "scripts", "common-windows.ps1");
const localInstallPath = path.join(windowsRoot, "scripts", "install-dream-skin.ps1");
const loginLauncherPath = path.join(windowsRoot, "scripts", "launch-dream-skin-at-login.mjs");
const managerTrayPath = path.join(windowsRoot, "scripts", "tray-dream-skin.ps1");
const managerThemePath = path.join(windowsRoot, "scripts", "theme-windows.ps1");

const localStart = fs.readFileSync(localStartPath, "utf8");
assert.match(localStart, /\[switch\]\$UseLocalTheme/);
assert.match(localStart, /if \(\$UseLocalTheme\)[\s\S]*local-theme\.json[\s\S]*paused/);
assert.match(localStart, /if \(-not \$ForegroundInjector -and -not \$UseLocalTheme\)/);

const localCommon = fs.readFileSync(localCommonPath, "utf8");
assert.match(localCommon, /function Register-DreamSkinLocalTheme/);
assert.match(localCommon, /local-theme\.json/);

const localInstall = fs.readFileSync(localInstallPath, "utf8");
assert.match(localInstall, /Register-DreamSkinLocalTheme/);

const selfTest = spawnSync(process.execPath, [loginLauncherPath, "--self-test"], {
  cwd: windowsRoot,
  encoding: "utf8",
});
assert.equal(selfTest.status, 0, selfTest.stderr || selfTest.stdout);
const selfTestResult = JSON.parse(selfTest.stdout);
assert.equal(selfTestResult.localTheme, true);

const managerTheme = fs.readFileSync(managerThemePath, "utf8");
assert.match(managerTheme, /function Get-DreamSkinLocalThemeRegistration/);
assert.match(managerTheme, /function Test-DreamSkinLocalThemeActive/);

const managerTray = fs.readFileSync(managerTrayPath, "utf8");
assert.match(managerTray, /本地纳西妲 · 梦境林庭/);
assert.match(managerTray, /Get-DreamSkinLocalThemeRegistration/);
assert.match(managerTray, /-UseLocalTheme/);
assert.match(managerTray, /Set-DreamSkinPaused -Paused \$true/);

console.log("PASS: local Nahida is the login default and remains switchable from CodexDreamSkin.");
