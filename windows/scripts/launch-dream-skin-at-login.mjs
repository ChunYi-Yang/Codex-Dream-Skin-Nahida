import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const START_DELAY_MS = 5_000;
const RETRY_DELAYS_MS = [0, 5_000, 10_000, 20_000];
const OPERATION_LOCK_MESSAGE =
  "Another Codex Dream Skin install, start, restore, or verify operation is already running.";

function parseArgs(args) {
  if (args.length === 1 && args[0] === "--self-test") {
    return { selfTest: true, port: null };
  }
  if (args.length === 0) return { selfTest: false, port: null };
  if (args.length !== 2 || args[0] !== "--port") {
    throw new Error("The login launcher accepts only --self-test or an optional --port value.");
  }
  const port = Number(args[1]);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("The login launcher port must be an integer from 1024 to 65535.");
  }
  return { selfTest: false, port };
}

function requireAbsoluteWindowsPath(value, label) {
  if (typeof value !== "string" || !path.win32.isAbsolute(value) || value.includes("\0")) {
    throw new Error(`${label} must be an absolute local Windows path.`);
  }
  return path.win32.normalize(value);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function readLogTail(logPath, maxLength = 8_000) {
  try {
    return fs.readFileSync(logPath, "utf8").slice(-maxLength);
  } catch {
    return "";
  }
}

function writeAutostartLog(stateRoot, details) {
  fs.mkdirSync(stateRoot, { recursive: true });
  const output = path.join(stateRoot, "autostart.log");
  const temporary = `${output}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(details, null, 2)}\r\n`, "utf8");
  fs.renameSync(temporary, output);
}

function buildLaunch(port) {
  const windowsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const startScript = path.join(windowsRoot, "scripts", "start-dream-skin.ps1");
  const localAppData = requireAbsoluteWindowsPath(process.env.LOCALAPPDATA, "LOCALAPPDATA");
  const systemRoot = requireAbsoluteWindowsPath(
    process.env.SystemRoot || process.env.SYSTEMROOT || "C:\\Windows",
    "SystemRoot",
  );
  const stateRoot = path.win32.join(localAppData, "CodexDreamSkin");
  const profilePath = path.win32.join(stateRoot, "Profile-v3");
  const args = [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-WindowStyle", "Hidden",
    "-ExecutionPolicy", "Bypass",
    "-File", startScript,
    "-ProfilePath", profilePath,
    "-RestartExisting",
    "-AllowDeferredVerify",
  ];
  if (port !== null) args.push("-Port", String(port));
  return {
    windowsRoot,
    startScript,
    stateRoot,
    profilePath,
    powershell: path.win32.join(
      systemRoot,
      "System32", "WindowsPowerShell", "v1.0", "powershell.exe",
    ),
    args,
  };
}

function runStart(launch) {
  fs.mkdirSync(launch.stateRoot, { recursive: true });
  const stdoutPath = path.join(launch.stateRoot, "autostart-start.out.log");
  const stderrPath = path.join(launch.stateRoot, "autostart-start.err.log");
  const stdoutHandle = fs.openSync(stdoutPath, "w");
  const stderrHandle = fs.openSync(stderrPath, "w");
  let result;
  try {
    result = spawnSync(launch.powershell, launch.args, {
      cwd: launch.windowsRoot,
      windowsHide: true,
      stdio: ["ignore", stdoutHandle, stderrHandle],
    });
  } finally {
    fs.closeSync(stdoutHandle);
    fs.closeSync(stderrHandle);
  }
  const stdout = readLogTail(stdoutPath);
  const stderr = readLogTail(stderrPath);
  return {
    status: result.status,
    signal: result.signal,
    error: result.error?.message || null,
    stdout,
    stderr,
    lockBusy: `${stdout}\n${stderr}`.includes(OPERATION_LOCK_MESSAGE),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const launch = buildLaunch(options.port);
  if (!fs.existsSync(launch.startScript)) {
    throw new Error(`Dream Skin start script is missing: ${launch.startScript}`);
  }
  if (options.selfTest) {
    console.log(JSON.stringify({
      pass: true,
      startScript: launch.startScript,
      profilePath: launch.profilePath,
      initialDelayMs: START_DELAY_MS,
      retryDelaysMs: RETRY_DELAYS_MS,
      restartExisting: launch.args.includes("-RestartExisting"),
      deferredVerify: launch.args.includes("-AllowDeferredVerify"),
      logsUseFileHandles: true,
    }));
    return;
  }

  await sleep(START_DELAY_MS);
  const startedAt = new Date().toISOString();
  const attempts = [];
  for (let index = 0; index < RETRY_DELAYS_MS.length; index += 1) {
    const retryDelayMs = RETRY_DELAYS_MS[index];
    if (retryDelayMs > 0) await sleep(retryDelayMs);
    const attempt = runStart(launch);
    attempts.push({
      attemptedAt: new Date().toISOString(),
      retryDelayMs,
      status: attempt.status,
      signal: attempt.signal,
      error: attempt.error,
      lockBusy: attempt.lockBusy,
    });
    writeAutostartLog(launch.stateRoot, {
      startedAt,
      finishedAt: new Date().toISOString(),
      node: process.execPath,
      nodeVersion: process.version,
      script: launch.startScript,
      profile: launch.profilePath,
      port: options.port,
      attempts,
      status: attempt.status,
      error: attempt.error,
      stdout: attempt.stdout,
      stderr: attempt.stderr,
    });
    if (!attempt.error && attempt.status === 0) return;
    if (!attempt.lockBusy) {
      process.exitCode = 1;
      return;
    }
  }
  process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  try {
    const localAppData = requireAbsoluteWindowsPath(process.env.LOCALAPPDATA, "LOCALAPPDATA");
    writeAutostartLog(path.win32.join(localAppData, "CodexDreamSkin"), {
      startedAt: new Date().toISOString(),
      status: 1,
      error: error instanceof Error ? error.message : String(error),
    });
  } catch {
    // A login launcher cannot show a reliable UI before the desktop is ready.
  }
  process.exitCode = 1;
}
