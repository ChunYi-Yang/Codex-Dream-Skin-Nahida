import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const setup = new URL("../setup.ps1", import.meta.url);

test("conversation installation has a read-only preflight and never bypasses policy", async () => {
  const source = await fs.readFile(setup, "utf8");
  assert.ok(source.includes("[switch]$CheckOnly"));
  assert.ok(source.includes("[switch]$PrepareOnly"));
  assert.ok(source.includes("Get-DreamSkinValidatedNodeRuntime"));
  assert.ok(source.includes("Get-FileHash"));
  assert.ok(!source.includes("-ExecutionPolicy Bypass"));
  assert.ok(!source.includes("Stop-Process"));
  assert.ok(source.indexOf("if ($CheckOnly)") < source.indexOf("Invoke-WebRequest"));
});

test("background setup installs after exit, records verification, and reports install failure", {
  skip: process.platform !== "win32",
}, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dream-setup-中文-"));
  try {
    await fs.mkdir(path.join(root, "scripts"));
    await fs.copyFile(fileURLToPath(setup), path.join(root, "setup.ps1"));
    const common = `
function Get-DreamSkinRegisteredCodexInstalls { @([pscustomobject]@{ Version = 'fixture' }) }
function Get-DreamSkinValidatedNodeRuntime { [pscustomobject]@{ Path = 'fixture-node'; Version = '22.23.1' } }
function Ensure-DreamSkinManagedDirectory { param($Path, $Root) New-Item -ItemType Directory -Path $Path -Force | Out-Null }
function Write-DreamSkinUtf8FileAtomically { param($Path, $Content) [IO.File]::WriteAllText($Path, $Content) }
function Get-DreamSkinCodexProcesses { @() }
function Get-DreamSkinRuntimeEnginePaths { param($StateRoot) [pscustomobject]@{ Start = (Join-Path $PSScriptRoot 'fixture-start.ps1') } }
`;
    await fs.writeFile(path.join(root, "scripts", "common-windows.ps1"), common);
    await fs.writeFile(path.join(root, "scripts", "theme-windows.ps1"), "# Theme helpers are provided by the isolated fixture.\n");
    await fs.writeFile(path.join(root, "scripts", "install-dream-skin.ps1"), "[IO.File]::WriteAllText((Join-Path $env:LOCALAPPDATA 'installed'), 'yes')");
    await fs.writeFile(path.join(root, "scripts", "fixture-start.ps1"), "param($ProfilePath)\nif (-not (Test-Path (Join-Path $env:LOCALAPPDATA 'installed'))) { throw 'start before install' }\n[IO.File]::WriteAllText((Join-Path $env:LOCALAPPDATA 'started'), $ProfilePath)");
    const run = () => spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "RemoteSigned",
      "-File", path.join(root, "setup.ps1"), "-Worker"], {
      env: { ...process.env, LOCALAPPDATA: root }, encoding: "utf8", timeout: 15000,
    });
    let result = run();
    assert.equal(result.status, 0, result.stderr);
    const statusPath = path.join(root, "CodexDreamSkin", "conversation-install.json");
    assert.equal(JSON.parse(await fs.readFile(statusPath, "utf8")).stage, "verified");
    assert.match(await fs.readFile(path.join(root, "started"), "utf8"), /Profile-v3$/);
    await fs.writeFile(path.join(root, "scripts", "install-dream-skin.ps1"), "throw 'fixture-install-failure'");
    result = run();
    assert.notEqual(result.status, 0);
    const failed = JSON.parse(await fs.readFile(statusPath, "utf8"));
    assert.equal(failed.stage, "failed");
    assert.match(failed.message, /fixture-install-failure/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("conversation installer rejects invalid waits and conflicting modes before work", {
  skip: process.platform !== "win32",
}, async () => {
  const { fileURLToPath } = await import("node:url");
  for (const args of [["-WaitTimeoutSeconds", "0"], ["-CheckOnly", "-Worker"]]) {
    const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "RemoteSigned",
      "-File", fileURLToPath(setup), ...args], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
  }
});
