import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parsePort(args) {
  if (args.length === 0) return null;
  if (args.length !== 2 || args[0] !== "--port") {
    throw new Error("The launcher accepts only an optional --port value.");
  }
  const port = Number(args[1]);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("The launcher port must be an integer from 1024 to 65535.");
  }
  return port;
}

function showError(message) {
  const powershell = path.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32", "WindowsPowerShell", "v1.0", "powershell.exe",
  );
  const command = [
    "Add-Type -AssemblyName System.Windows.Forms;",
    "[System.Windows.Forms.MessageBox]::Show(",
    "$env:CODEX_DREAM_SKIN_ERROR, 'Codex Dream Skin', 'OK', 'Error') | Out-Null",
  ].join(" ");
  spawnSync(powershell, ["-NoProfile", "-WindowStyle", "Hidden", "-Command", command], {
    windowsHide: true,
    stdio: "ignore",
    env: { ...process.env, CODEX_DREAM_SKIN_ERROR: String(message).slice(0, 4000) },
  });
}

function writeLauncherLog(stateRoot, details) {
  fs.mkdirSync(stateRoot, { recursive: true });
  const output = path.join(stateRoot, "launcher.log");
  const temporary = `${output}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(details, null, 2)}\r\n`, "utf8");
  fs.renameSync(temporary, output);
}

function readLogTail(logPath, maxLength = 8000) {
  try {
    return fs.readFileSync(logPath, "utf8").slice(-maxLength);
  } catch {
    return "";
  }
}

try {
  const port = parsePort(process.argv.slice(2));
  const windowsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const startScript = path.join(windowsRoot, "scripts", "start-dream-skin.ps1");
  const profilePath = path.join(process.env.LOCALAPPDATA, "CodexDreamSkin", "Profile-v3");
  const stateRoot = path.dirname(profilePath);
  fs.mkdirSync(stateRoot, { recursive: true });
  const startStdoutPath = path.join(stateRoot, "launcher-start.out.log");
  const startStderrPath = path.join(stateRoot, "launcher-start.err.log");
  const powershell = path.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32", "WindowsPowerShell", "v1.0", "powershell.exe",
  );
  const args = [
    "-NoProfile",
    "-WindowStyle", "Hidden",
    "-ExecutionPolicy", "Bypass",
    "-File", startScript,
    "-ProfilePath", profilePath,
    "-PromptRestart",
  ];
  if (port !== null) args.push("-Port", String(port));

  const stdoutHandle = fs.openSync(startStdoutPath, "w");
  const stderrHandle = fs.openSync(startStderrPath, "w");
  let result;
  try {
    result = spawnSync(powershell, args, {
      cwd: windowsRoot,
      windowsHide: true,
      stdio: ["ignore", stdoutHandle, stderrHandle],
    });
  } finally {
    fs.closeSync(stdoutHandle);
    fs.closeSync(stderrHandle);
  }
  const stdout = readLogTail(startStdoutPath);
  const stderr = readLogTail(startStderrPath);
  writeLauncherLog(stateRoot, {
    startedAt: new Date().toISOString(),
    node: process.execPath,
    nodeVersion: process.version,
    script: startScript,
    profile: profilePath,
    port,
    status: result.status,
    signal: result.signal,
    error: result.error?.message || null,
    stdout,
    stderr,
  });
  if (result.error || result.status !== 0) {
    const details = result.error?.message || stderr || stdout ||
      `Dream Skin start returned exit code ${result.status}.`;
    showError(details.trim());
    process.exitCode = 1;
  }
} catch (error) {
  showError(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
