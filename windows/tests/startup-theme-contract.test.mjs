import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const windowsRoot = path.resolve(here, "..");
const theme = JSON.parse(fs.readFileSync(path.join(windowsRoot, "assets", "theme.json"), "utf8"));
const themeScript = fs.readFileSync(path.join(windowsRoot, "scripts", "theme-windows.ps1"), "utf8");
const commonScript = fs.readFileSync(path.join(windowsRoot, "scripts", "common-windows.ps1"), "utf8");
const installScript = fs.readFileSync(path.join(windowsRoot, "scripts", "install-dream-skin.ps1"), "utf8");
const trayScript = fs.readFileSync(path.join(windowsRoot, "scripts", "tray-dream-skin.ps1"), "utf8");
const loginLauncher = fs.readFileSync(path.join(windowsRoot, "scripts", "launch-dream-skin-at-login.mjs"), "utf8");
const startScript = fs.readFileSync(path.join(windowsRoot, "scripts", "start-dream-skin.ps1"), "utf8");
const bootstrap = fs.readFileSync(path.join(windowsRoot, "installer", "setup-bootstrap.ps1"), "utf8");
const builder = fs.readFileSync(path.join(windowsRoot, "installer", "build-release.ps1"), "utf8");
const installer = fs.readFileSync(path.join(windowsRoot, "installer", "codex-dream-skin.iss"), "utf8");

assert.match(theme.id, /^[A-Za-z0-9][A-Za-z0-9_-]{0,71}$/);
assert.match(
  themeScript,
  /bundledPresetId[\s\S]*-cnotmatch '\^\[A-Za-z0-9\]\[A-Za-z0-9_-\]\{0,71\}\$'/,
  "bundled Nahida id must accept a safe non-preset-prefixed id",
);
assert.match(commonScript, /LoginLauncher\s*=\s*Join-Path \$scripts 'launch-dream-skin-at-login\.mjs'/);
assert.match(commonScript, /Node\s*=\s*Join-Path \$root 'runtime\\node\\node\.exe'/);
assert.match(commonScript, /'scripts\\launch-dream-skin-at-login\.mjs'/);
assert.match(commonScript, /'scripts\\launch-dream-skin\.mjs'/);
assert.match(installScript, /\$engine\.LoginLauncher/);
assert.match(installScript, /\$engine\.Node/);
assert.match(installScript, /Auto Start\.lnk/);
assert.match(trayScript, /launch-dream-skin-at-login\.mjs/);
assert.match(trayScript, /Auto Start\.lnk/);
assert.doesNotMatch(
  trayScript.match(/function Set-DreamSkinAutoStart[\s\S]*?^  }/m)?.[0] || "",
  /tray-dream-skin\.ps1/,
);
for (const payloadContract of [bootstrap, builder]) {
  assert.match(payloadContract, /'scripts\\launch-dream-skin-at-login\.mjs'/);
  assert.match(payloadContract, /'scripts\\launch-dream-skin\.mjs'/);
}
assert.match(
  installer,
  /Name: "\{userstartup\}\\Codex Dream Skin Auto Start";[^\r\n]*runtime\\node\\node\.exe[^\r\n]*launch-dream-skin-at-login\.mjs/,
);
assert.doesNotMatch(
  installer.match(/^Name: "\{userstartup\}.*$/m)?.[0] || "",
  /-LaunchTray|powershell\.exe/i,
);
assert.match(loginLauncher, /-RestartExisting/);
assert.match(loginLauncher, /-ProfilePath/);
const loginArgsBlock = loginLauncher.match(/const args = \[[\s\S]*?^  \];/m)?.[0] || "";
assert.doesNotMatch(loginArgsBlock, /"-UseLocalTheme"|"-AllowDeferredVerify"/);
assert.match(startScript, /\[switch\]\$RestartExisting/);
assert.match(startScript, /\[string\]\$ProfilePath/);
assert.doesNotMatch(startScript, /\[switch\]\$UseLocalTheme|\[switch\]\$AllowDeferredVerify/);
assert.match(loginLauncher, /"-ExecutionPolicy", "RemoteSigned"/);
assert.doesNotMatch(loginLauncher, /"-ExecutionPolicy", "Bypass"/);

console.log("PASS: Nahida theme identity and login startup contracts are present.");
