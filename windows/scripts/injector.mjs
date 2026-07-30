import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const here = path.dirname(scriptPath);
const root = path.resolve(here, "..");
const SKIN_VERSION = "1.1.75";
const MAX_ART_BYTES = 16 * 1024 * 1024;
const MAX_THEME_BYTES = 32 * 1024 * 1024;
const BROWSER_RECOVERY_WAIT_MS = 45000;
const RECOVERY_START_DELAY_MS = 1500;
const RECOVERY_OPERATION_LOCK_WAIT_MS = 180000;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
const BROWSER_ID_PATTERN = /^[A-Za-z0-9._-]{1,200}$/;

class CdpIdentityMismatchError extends Error {}

function parseArgs(argv) {
  const options = {
    port: 9335,
    mode: "watch",
    timeoutMs: 30000,
    screenshot: null,
    reload: false,
    browserId: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--port") options.port = Number(argv[++i]);
    else if (arg === "--once") options.mode = "once";
    else if (arg === "--watch") options.mode = "watch";
    else if (arg === "--verify") options.mode = "verify";
    else if (arg === "--remove") options.mode = "remove";
    else if (arg === "--close-browser") options.mode = "close-browser";
    else if (arg === "--timeout-ms") options.timeoutMs = Number(argv[++i]);
    else if (arg === "--browser-id") options.browserId = argv[++i];
    else if (arg === "--screenshot") options.screenshot = path.resolve(argv[++i]);
    else if (arg === "--reload") options.reload = true;
    else if (arg === "--self-test") options.mode = "self-test";
    else if (arg === "--check-payload") options.mode = "check-payload";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) {
    throw new Error(`Invalid port: ${options.port}`);
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 250 || options.timeoutMs > 120000) {
    throw new Error(`Invalid timeout: ${options.timeoutMs}`);
  }
  if (options.browserId !== null && !BROWSER_ID_PATTERN.test(options.browserId)) {
    throw new Error(`Invalid browser ID: ${options.browserId}`);
  }
  if (["watch", "once", "verify", "remove", "close-browser"].includes(options.mode) && !options.browserId) {
    throw new Error(`--browser-id is required in ${options.mode} mode`);
  }
  return options;
}

function validatedDebuggerUrl(target, port) {
  const url = new URL(target.webSocketDebuggerUrl);
  const pathIsValid = /^\/devtools\/(?:page|browser)\/[A-Za-z0-9._-]{1,200}$/.test(url.pathname);
  if (url.protocol !== "ws:" || !LOOPBACK_HOSTS.has(url.hostname) || Number(url.port) !== port ||
      url.username || url.password || url.search || url.hash || !pathIsValid) {
    throw new Error("Rejected a CDP WebSocket URL outside the allowed loopback endpoint shape");
  }
  return url.href;
}

function browserIdFromVersion(version, port) {
  const url = validatedDebuggerUrl(version, port);
  const parsed = new URL(url);
  const match = parsed.pathname.match(/^\/devtools\/browser\/([A-Za-z0-9._-]{1,200})$/);
  if (!match || parsed.search || parsed.hash || !BROWSER_ID_PATTERN.test(match[1])) {
    throw new Error("Rejected an invalid CDP browser identity URL");
  }
  return match[1];
}

function isValidCdpPageTarget(item, port) {
  if (item?.type !== "page" || !item.url?.startsWith("app://") || typeof item.id !== "string" ||
      !BROWSER_ID_PATTERN.test(item.id) || !item.webSocketDebuggerUrl) return false;
  try {
    const debuggerUrl = new URL(validatedDebuggerUrl(item, port));
    return debuggerUrl.pathname === `/devtools/page/${item.id}`;
  } catch {
    return false;
  }
}

class CdpSession {
  constructor(target, port) {
    this.target = target;
    this.ws = new WebSocket(validatedDebuggerUrl(target, port));
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.closed = false;
  }

  async open() {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        try { this.ws.close(); } catch {}
        reject(new Error("CDP WebSocket open timed out"));
      }, 5000);
      this.ws.addEventListener("open", () => { clearTimeout(timeout); resolve(); }, { once: true });
      this.ws.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("CDP WebSocket open failed")); }, { once: true });
    });
    this.ws.addEventListener("message", (event) => this.onMessage(event));
    this.ws.addEventListener("error", () => this.close());
    this.ws.addEventListener("close", () => {
      this.closed = true;
      for (const waiter of this.pending.values()) {
        clearTimeout(waiter.timeout);
        waiter.reject(new Error("CDP socket closed"));
      }
      this.pending.clear();
    });
    await this.send("Runtime.enable");
    await this.send("Page.enable");
    return this;
  }

  onMessage(event) {
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      this.close();
      return;
    }
    if (message.id) {
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      clearTimeout(waiter.timeout);
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(`${message.error.message} (${message.error.code})`));
      else waiter.resolve(message.result);
      return;
    }
    for (const listener of this.listeners.get(message.method) ?? []) listener(message.params ?? {});
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}) {
    if (this.closed) return Promise.reject(new Error("CDP session is closed"));
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 10000);
      this.pending.set(id, { resolve, reject, timeout });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: false,
    });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
      throw new Error(`Renderer evaluation failed: ${detail}`);
    }
    return result.result?.value;
  }

  close() {
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error("CDP session closed"));
    }
    this.pending.clear();
    if (!this.closed) {
      try { this.ws.close(); } catch {}
    }
    this.closed = true;
  }
}

class BrowserIdentityAnchor {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.closed = false;
    this.ws.addEventListener("close", () => { this.closed = true; });
    this.ws.addEventListener("error", () => {
      this.closed = true;
      try { this.ws.close(); } catch {}
    });
  }

  async open() {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.close();
        reject(new Error("CDP browser identity WebSocket open timed out"));
      }, 5000);
      this.ws.addEventListener("open", () => { clearTimeout(timeout); resolve(); }, { once: true });
      this.ws.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("CDP browser identity WebSocket open failed"));
      }, { once: true });
      this.ws.addEventListener("close", () => {
        clearTimeout(timeout);
        reject(new Error("CDP browser identity WebSocket closed during startup"));
      }, { once: true });
    });
    if (this.closed) throw new Error("CDP browser identity WebSocket is already closed");
    return this;
  }

  close() {
    if (!this.closed) {
      try { this.ws.close(); } catch {}
    }
    this.closed = true;
  }
}

async function fetchCdpJson(port, resource) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(`http://127.0.0.1:${port}${resource}`, {
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function listAppTargets(port, expectedBrowserId = null) {
  const targets = await fetchCdpJson(port, "/json/list");
  if (!Array.isArray(targets)) throw new Error("CDP target list is not an array");
  if (expectedBrowserId) {
    const version = await fetchCdpJson(port, "/json/version");
    const actualBrowserId = browserIdFromVersion(version, port);
    if (actualBrowserId !== expectedBrowserId) {
      throw new CdpIdentityMismatchError(
        `CDP browser identity changed from ${expectedBrowserId} to ${actualBrowserId}`,
      );
    }
  }
  const appTargets = targets.filter((item) => isValidCdpPageTarget(item, port));
  Object.defineProperty(appTargets, "diagnostics", {
    value: {
      total: targets.length,
      types: [...new Set(targets.map((item) => String(item?.type ?? "unknown")))].sort(),
      protocols: [...new Set(targets.map((item) => {
        try { return new URL(String(item?.url ?? "")).protocol; } catch { return "invalid:"; }
      }))].sort(),
      validAppPages: appTargets.length,
    },
  });
  return appTargets;
}

async function connectBrowserIdentityAnchor(port, expectedBrowserId) {
  const version = await fetchCdpJson(port, "/json/version");
  const actualBrowserId = browserIdFromVersion(version, port);
  if (actualBrowserId !== expectedBrowserId) {
    throw new CdpIdentityMismatchError(
      `CDP browser identity changed from ${expectedBrowserId} to ${actualBrowserId}`,
    );
  }
  return new BrowserIdentityAnchor(validatedDebuggerUrl(version, port)).open();
}

async function closeBrowser(options) {
  const version = await fetchCdpJson(options.port, "/json/version");
  const actualBrowserId = browserIdFromVersion(version, options.port);
  if (actualBrowserId !== options.browserId) {
    throw new CdpIdentityMismatchError(
      `CDP browser identity changed from ${options.browserId} to ${actualBrowserId}`,
    );
  }
  const browserUrl = validatedDebuggerUrl(version, options.port);
  const socket = new WebSocket(browserUrl);
  let commandSent = false;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      try { socket.close(); } catch {}
      reject(new Error("CDP Browser.close timed out"));
    }, options.timeoutMs);
    const finish = (callback, value) => {
      clearTimeout(timeout);
      callback(value);
    };
    socket.addEventListener("open", () => {
      commandSent = true;
      socket.send(JSON.stringify({ id: 1, method: "Browser.close", params: {} }));
    }, { once: true });
    socket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.id !== 1) return;
      if (message.error) {
        finish(reject, new Error(`${message.error.message} (${message.error.code})`));
      } else {
        finish(resolve);
      }
    });
    socket.addEventListener("close", () => {
      if (commandSent) finish(resolve);
      else finish(reject, new Error("CDP browser identity WebSocket closed before Browser.close"));
    }, { once: true });
    socket.addEventListener("error", () => {
      finish(reject, new Error("CDP Browser.close WebSocket failed"));
    }, { once: true });
  });
  console.log(JSON.stringify({ pass: true, mode: options.mode, port: options.port }));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizedLocalWindowsPath(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z]:[\\/]/.test(value) || value.includes("\0")) {
    throw new Error(`${label} is not a local absolute Windows path`);
  }
  return path.win32.normalize(value);
}

function buildRecoveryLaunch(port, environment = process.env) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`Invalid recovery port: ${port}`);
  }
  const systemRoot = normalizedLocalWindowsPath(
    environment.SystemRoot ?? environment.SYSTEMROOT,
    "SystemRoot",
  );
  const localAppData = normalizedLocalWindowsPath(environment.LOCALAPPDATA, "LOCALAPPDATA");
  const startScript = path.resolve(here, "start-dream-skin.ps1");
  if (path.dirname(startScript) !== here || path.basename(startScript) !== "start-dream-skin.ps1") {
    throw new Error("Recovery start script escaped the injector directory");
  }
  const stateRoot = path.win32.join(localAppData, "CodexDreamSkin");
  const profilePath = path.win32.join(stateRoot, "Profile-v3");
  return {
    executable: path.win32.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    startScript,
    profilePath,
    logPath: path.win32.join(stateRoot, "browser-recovery.log"),
    args: [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      startScript,
      "-Port",
      String(port),
      "-ProfilePath",
      profilePath,
      "-RecoveryDelayMs",
      String(RECOVERY_START_DELAY_MS),
      "-OperationLockWaitMs",
      String(RECOVERY_OPERATION_LOCK_WAIT_MS),
      "-RestartExisting",
    ],
  };
}

async function waitForReplacementBrowser(port, previousBrowserId, shouldStop) {
  const deadline = Date.now() + BROWSER_RECOVERY_WAIT_MS;
  while (!shouldStop() && Date.now() < deadline) {
    try {
      const version = await fetchCdpJson(port, "/json/version");
      const browserId = browserIdFromVersion(version, port);
      if (browserId !== previousBrowserId) return browserId;
    } catch {
      // A browser rebuild normally leaves the loopback endpoint unavailable briefly.
    }
    await delay(500);
  }
  return null;
}

async function launchVerifiedRecovery(port) {
  const recovery = buildRecoveryLaunch(port);
  await fs.mkdir(path.dirname(recovery.logPath), { recursive: true });
  await fs.appendFile(
    recovery.logPath,
    `[${new Date().toISOString()}] Browser identity changed; requesting verified theme recovery.\r\n`,
    "utf8",
  );
  const logHandle = await fs.open(recovery.logPath, "a");
  let child;
  try {
    child = spawn(recovery.executable, recovery.args, {
      detached: true,
      windowsHide: true,
      stdio: ["ignore", logHandle.fd, logHandle.fd],
    });
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    child.unref();
  } finally {
    await logHandle.close();
  }
  return child.pid;
}

async function loadTheme(assetsRoot = path.join(root, "assets")) {
  const configPath = path.join(assetsRoot, "theme.json");
  const raw = JSON.parse(await fs.readFile(configPath, "utf8"));
  if (raw.schemaVersion !== 1 || typeof raw.image !== "string" || !raw.image) {
    throw new Error(`${configPath} has an unsupported schema or image field`);
  }
  const text = (value, fallback, max) => typeof value === "string" && value.trim()
    ? value.trim().slice(0, max) : fallback;
  const color = (value, fallback) => {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim();
    return /^#[0-9a-f]{6}$/i.test(normalized) || /^rgba?\([0-9., %]+\)$/i.test(normalized)
      ? normalized
      : fallback;
  };
  const image = (value, fallback, field) => {
    const candidate = typeof value === "string" && value.trim() ? value.trim() : fallback;
    if (path.basename(candidate) !== candidate) {
      throw new Error(`Theme ${field} image must stay inside its theme directory`);
    }
    const extension = path.extname(candidate).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
      throw new Error(`Unsupported theme ${field} image format: ${extension || "missing"}`);
    }
    return candidate;
  };
  const heroImage = image(raw.image, "", "hero");
  const theme = {
    schemaVersion: 1,
    id: text(raw.id, "custom", 80),
    name: text(raw.name, "Codex Dream Skin", 80),
    appLabel: text(raw.appLabel, "Codex", 80),
    brandSubtitle: text(raw.brandSubtitle, "CODEX DREAM SKIN", 80),
    homePrompt: text(raw.homePrompt, "What should we build?", 160),
    tagline: text(raw.tagline, "Make something wonderful.", 160),
    projectPrefix: text(raw.projectPrefix, "梦境林庭 · ", 80),
    projectLabel: text(raw.projectLabel, "✦ 选择项目", 80),
    statusText: text(raw.statusText, "DREAM SKIN ONLINE", 80),
    quote: text(raw.quote, "MAKE SOMETHING WONDERFUL", 80),
    image: heroImage,
    images: {
      background: image(raw.images?.background, heroImage, "background"),
      sidebar: image(raw.images?.sidebar, heroImage, "sidebar"),
      rightPanel: image(raw.images?.rightPanel, heroImage, "rightPanel"),
      portrait: image(raw.images?.portrait, heroImage, "portrait"),
      decorations: image(raw.images?.decorations, heroImage, "decorations"),
      scene: image(raw.images?.scene, heroImage, "scene"),
    },
    colors: {
      background: color(raw.colors?.background, "#081611"),
      panel: color(raw.colors?.panel, "#0d211a"),
      panelAlt: color(raw.colors?.panelAlt, "#123027"),
      accent: color(raw.colors?.accent, "#86d75f"),
      accentAlt: color(raw.colors?.accentAlt, "#d2ed72"),
      secondary: color(raw.colors?.secondary, "#58c7c3"),
      highlight: color(raw.colors?.highlight, "#f0a24a"),
      text: color(raw.colors?.text, "#eef8ef"),
      muted: color(raw.colors?.muted, "#a7bcae"),
      line: color(raw.colors?.line, "rgba(134, 215, 95, .30)"),
    },
  };
  const imageNames = { hero: theme.image, ...theme.images };
  const imagePaths = {};
  const assetsRootReal = await fs.realpath(assetsRoot);
  const uniqueImagePaths = new Set();
  let themeBytes = 0;
  for (const [slot, filename] of Object.entries(imageNames)) {
    const imagePath = path.join(assetsRoot, filename);
    const imagePathReal = await fs.realpath(imagePath);
    if (path.dirname(imagePathReal) !== assetsRootReal) {
      throw new Error(`Theme ${slot} image resolves outside its theme directory`);
    }
    const imageStat = await fs.stat(imagePathReal);
    if (!imageStat.isFile() || imageStat.size < 1 || imageStat.size > MAX_ART_BYTES) {
      throw new Error(`Theme ${slot} image must be a non-empty file no larger than ${MAX_ART_BYTES} bytes`);
    }
    if (!uniqueImagePaths.has(imagePathReal)) {
      uniqueImagePaths.add(imagePathReal);
      themeBytes += imageStat.size;
    }
    imagePaths[slot] = imagePathReal;
  }
  if (themeBytes > MAX_THEME_BYTES) {
    throw new Error(`Theme images must total no more than ${MAX_THEME_BYTES} bytes`);
  }
  return { imagePaths, theme };
}

export async function loadPayload(assetsRoot = path.join(root, "assets")) {
  const [css, template, loaded] = await Promise.all([
    fs.readFile(path.join(assetsRoot, "dream-skin.css"), "utf8"),
    fs.readFile(path.join(assetsRoot, "renderer-inject.js"), "utf8"),
    loadTheme(assetsRoot),
  ]);
  const artDataUrls = {};
  const encodedByPath = new Map();
  for (const [slot, imagePath] of Object.entries(loaded.imagePaths)) {
    if (!encodedByPath.has(imagePath)) {
      const art = await fs.readFile(imagePath);
      const extension = path.extname(imagePath).toLowerCase();
      const mime = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg"
        : extension === ".webp" ? "image/webp" : "image/png";
      encodedByPath.set(imagePath, `data:${mime};base64,${art.toString("base64")}`);
    }
    artDataUrls[slot] = encodedByPath.get(imagePath);
  }
  const replacements = [
    ["__DREAM_CSS_JSON__", css],
    ["__DREAM_ARTS_JSON__", artDataUrls],
    ["__DREAM_THEME_JSON__", loaded.theme],
    ["__DREAM_VERSION_JSON__", SKIN_VERSION],
  ];
  let payload = template;
  for (const [placeholder, value] of replacements) {
    payload = payload.replace(placeholder, () => JSON.stringify(value));
  }
  const unresolved = replacements.find(([placeholder]) => payload.includes(placeholder));
  if (unresolved) throw new Error(`Payload still contains ${unresolved[0]}`);
  return payload;
}

async function probeSession(session) {
  return session.evaluate(`(() => {
    const shell = document.querySelector('main.main-surface');
    const firstMain = document.querySelector('main');
    const firstAside = document.querySelector('aside');
    const allElements = [...document.querySelectorAll('*')];
    const safeToken = (value) => typeof value === 'string' && /^[A-Za-z0-9:_-]{1,80}$/.test(value);
    const classCounts = new Map();
    for (const element of allElements) {
      for (const className of element.classList) {
        if (className.length <= 120) classCounts.set(className, (classCounts.get(className) ?? 0) + 1);
      }
    }
    const topClasses = [...classCounts]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 40)
      .map(([name, count]) => ({ name, count }));
    const dataAttributes = [...new Set(allElements.flatMap((element) =>
      [...element.attributes]
        .map((attribute) => attribute.name)
        .filter((name) => name.startsWith('data-'))))].sort().slice(0, 80);
    const testIds = [...new Set(allElements.map((element) => element.getAttribute('data-testid'))
      .filter(safeToken))].sort().slice(0, 80);
    const roleValues = [...new Set(allElements.map((element) => element.getAttribute('role'))
      .filter(safeToken))].sort();
    const landmarkTags = new Set(['MAIN', 'ASIDE', 'NAV', 'HEADER', 'FOOTER', 'TEXTAREA', 'INPUT']);
    const landmarks = allElements.filter((element) =>
      landmarkTags.has(element.tagName) || safeToken(element.getAttribute('role')) ||
      safeToken(element.getAttribute('data-testid'))).slice(0, 80).map((element) => ({
        tag: element.tagName,
        id: safeToken(element.id) ? element.id : null,
        role: safeToken(element.getAttribute('role')) ? element.getAttribute('role') : null,
        testId: safeToken(element.getAttribute('data-testid'))
          ? element.getAttribute('data-testid') : null,
        classes: [...element.classList].filter((value) => value.length <= 120).slice(0, 12),
        data: [...element.attributes].map((attribute) => attribute.name)
          .filter((name) => name.startsWith('data-')).slice(0, 12),
      }));
    const markers = {
      shell: Boolean(shell),
      surface: Boolean(document.querySelector('.main-surface')),
      sidebar: Boolean(document.querySelector('aside.app-shell-left-panel')),
      composer: Boolean(document.querySelector('.composer-surface-chrome')),
      main: Boolean(document.querySelector('[role="main"]')),
      focusAreas: document.querySelectorAll('[data-app-shell-focus-area]').length,
      navigation: Boolean(document.querySelector('aside nav, nav[aria-label]')),
    };
    return {
      markers,
      protocol: location.protocol,
      readyState: document.readyState,
      visibilityState: document.visibilityState,
      viewport: { width: innerWidth, height: innerHeight },
      windowType: safeToken(document.documentElement.getAttribute('data-codex-window-type'))
        ? document.documentElement.getAttribute('data-codex-window-type')
        : safeToken(document.body?.getAttribute('data-codex-window-type'))
          ? document.body.getAttribute('data-codex-window-type') : null,
      genericWindowType: safeToken(document.documentElement.getAttribute('data-window-type'))
        ? document.documentElement.getAttribute('data-window-type')
        : safeToken(document.body?.getAttribute('data-window-type'))
          ? document.body.getAttribute('data-window-type') : null,
      bodyPresent: Boolean(document.body),
      bodyChildCount: document.body?.children.length ?? 0,
      bodyChildTags: document.body
        ? [...document.body.children].slice(0, 12).map((node) => node.tagName)
        : [],
      elementCount: allElements.length,
      iframeCount: document.querySelectorAll('iframe').length,
      webviewCount: document.querySelectorAll('webview').length,
      openShadowRoots: allElements.filter((node) => Boolean(node.shadowRoot)).length,
      buttons: document.querySelectorAll('button').length,
      inputs: document.querySelectorAll('input').length,
      textareas: document.querySelectorAll('textarea').length,
      contentEditables: document.querySelectorAll('[contenteditable="true"]').length,
      dataAttributes,
      testIds,
      roleValues,
      topClasses,
      landmarks,
      shellTag: shell?.tagName ?? null,
      firstMainClasses: firstMain ? [...firstMain.classList].slice(0, 12) : [],
      firstAsideClasses: firstAside ? [...firstAside.classList].slice(0, 12) : [],
      codex: location.protocol === 'app:' && markers.shell &&
        (markers.sidebar || markers.composer || markers.main),
    };
  })()`);
}

async function connectTarget(target, port) {
  return new CdpSession(target, port).open();
}

async function connectCodexTargets(port, timeoutMs, expectedBrowserId) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  let lastDiagnostics = null;
  while (Date.now() < deadline) {
    try {
      const targets = await listAppTargets(port, expectedBrowserId);
      lastDiagnostics = { targets: targets.diagnostics, probes: [] };
      const connected = [];
      for (const target of targets) {
        let session;
        try {
          session = await connectTarget(target, port);
          const probe = await probeSession(session);
          lastDiagnostics.probes.push(probe);
          if (probe?.codex) connected.push({ target, session, probe });
          else session.close();
        } catch (error) {
          session?.close();
          lastError = error;
        }
      }
      if (connected.length) return connected;
      lastError = new Error(
        `No page matched the expected Codex shell markers: ${JSON.stringify(lastDiagnostics)}`,
      );
    } catch (error) {
      if (error instanceof CdpIdentityMismatchError) throw error;
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(
    `No verified Codex renderer on 127.0.0.1:${port}: ` +
    `${lastError?.message ?? "timed out"}; diagnostics=${JSON.stringify(lastDiagnostics)}`,
  );
}

async function applyToSession(session, payload) {
  return session.evaluate(payload);
}

async function removeFromSession(session) {
  return session.evaluate(`(() => {
    window.__CODEX_DREAM_SKIN_DISABLED__ = true;
    const state = window.__CODEX_DREAM_SKIN_STATE__;
    if (state?.cleanup) return state.cleanup();
    document.documentElement?.classList.remove('codex-dream-skin');
    document.documentElement?.classList.remove('dream-summary-panel-hidden');
    document.documentElement?.style.removeProperty('--dream-art');
    document.querySelectorAll('.dream-home').forEach((node) => node.classList.remove('dream-home'));
    document.querySelectorAll('.dream-home-shell').forEach((node) => node.classList.remove('dream-home-shell'));
    document.querySelectorAll('.dream-settings-surface').forEach((node) =>
      node.classList.remove('dream-settings-surface'));
    document.querySelectorAll('.dream-summary-panel-surface').forEach((node) =>
      node.classList.remove('dream-summary-panel-surface'));
    document.getElementById('codex-dream-summary-panel-close')?.remove();
    document.getElementById('codex-dream-summary-panel-reopen')?.remove();
    document.getElementById('codex-dream-skin-style')?.remove();
    document.getElementById('codex-dream-skin-chrome')?.remove();
    document.getElementById('codex-dream-home-fallback')?.remove();
    delete window.__CODEX_DREAM_SKIN_STATE__;
    return true;
  })()`);
}

async function verifyRemovedSession(session) {
  return session.evaluate(`(() =>
    !document.documentElement.classList.contains('codex-dream-skin') &&
    !document.documentElement.classList.contains('dream-summary-panel-hidden') &&
    !document.documentElement.style.getPropertyValue('--dream-art') &&
    !document.querySelector('.dream-home') &&
    !document.querySelector('.dream-home-shell') &&
    !document.querySelector('.dream-settings-surface') &&
    !document.querySelector('.dream-summary-panel-surface') &&
    !document.getElementById('codex-dream-summary-panel-close') &&
    !document.getElementById('codex-dream-summary-panel-reopen') &&
    !document.getElementById('codex-dream-skin-style') &&
    !document.getElementById('codex-dream-skin-chrome') &&
    !document.getElementById('codex-dream-home-fallback') &&
    !window.__CODEX_DREAM_SKIN_STATE__
  )()`);
}

export async function verifySession(session) {
  return session.evaluate(`(() => {
    const box = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
    };
    const visibleBox = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      if (r.width <= 1 || r.height <= 1 ||
          r.bottom <= 0 || r.right <= 0 ||
          r.top >= innerHeight || r.left >= innerWidth ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity || 1) <= 0.01) {
        return null;
      }
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
    };
    const home = document.querySelector('.dream-home');
    const homeShell = document.querySelector('main.main-surface.dream-home-shell');
    const homeFallback = document.getElementById('codex-dream-home-fallback');
    const suggestions = home?.querySelector('.group\\\\/home-suggestions') ?? null;
    const cards = suggestions ? [...suggestions.querySelectorAll('button')].map(box) : [];
    const visibleCards = suggestions ? [...suggestions.querySelectorAll('button')].map(visibleBox).filter(Boolean) : [];
    const navPage = [...document.querySelectorAll(
      'aside.app-shell-left-panel [aria-current="page"], aside.app-shell-left-panel [class~="bg-token-list-hover-background"]',
    )].find((node) => {
      const text = String(node.textContent ?? '').trim();
      return /插件|Plugins|已安排|Scheduled|拉取请求|Pull Request/i.test(text);
    }) ?? null;
    const result = {
      installed: document.documentElement.classList.contains('codex-dream-skin'),
      version: window.__CODEX_DREAM_SKIN_STATE__?.version ?? null,
      expectedVersion: ${JSON.stringify(SKIN_VERSION)},
      stylePresent: Boolean(document.getElementById('codex-dream-skin-style')),
      chromePresent: Boolean(document.getElementById('codex-dream-skin-chrome')),
      chromePointerEvents: getComputedStyle(document.getElementById('codex-dream-skin-chrome') || document.body).pointerEvents,
      homePresent: Boolean(home),
      homeVisible: Boolean(visibleBox(home)),
      homeShellPresent: Boolean(homeShell),
      homeFallbackPresent: Boolean(homeFallback),
      homeFallback: visibleBox(homeFallback?.querySelector('.dream-home-fallback-card') ?? homeFallback),
      suggestionsPresent: Boolean(suggestions),
      suggestionsVisible: Boolean(visibleBox(suggestions)),
      hero: visibleBox(
        home?.querySelector('.dream-home-hero-surface') ??
        home?.firstElementChild?.firstElementChild?.firstElementChild,
      ),
      cards,
      visibleCards,
      composer: box(document.querySelector('.composer-surface-chrome')),
      settings: box(document.querySelector('.dream-settings-surface')),
      pageSearch: box(document.querySelector('#scheduled-page-search, #plugins-page-search')),
      navPage: box(navPage),
      sidebar: box(document.querySelector('aside.app-shell-left-panel')),
      viewport: { width: innerWidth, height: innerHeight },
      documentOverflow: {
        x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      },
    };
    result.pass = result.installed && result.version === result.expectedVersion &&
      result.stylePresent && result.chromePresent &&
      result.chromePointerEvents === 'none' &&
      Boolean(result.composer || result.settings || result.pageSearch || result.navPage) &&
      Boolean(result.sidebar) &&
      (!result.homeVisible || Boolean(result.hero) || Boolean(result.homeFallback)) &&
      (!result.homeShellPresent || result.homeVisible || result.homePresent || Boolean(result.homeFallback));
    return result;
  })()`);
}

async function waitForVerifiedSession(session, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastResult;
  let lastError;
  while (Date.now() < deadline) {
    try {
      lastResult = await verifySession(session);
      lastError = null;
      if (lastResult.pass) return lastResult;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!lastResult && lastError) throw lastError;
  return lastResult;
}

async function capture(session, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await session.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  const viewport = await session.evaluate("({ width: innerWidth, height: innerHeight })");
  await session.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: Math.round(viewport.width * 0.64),
    y: Math.round(viewport.height * 0.62),
    button: "none",
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  const result = await session.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await fs.writeFile(outputPath, Buffer.from(result.data, "base64"));
}

async function runOneShot(options) {
  const connected = await connectCodexTargets(options.port, options.timeoutMs, options.browserId);
  const payload = (options.mode === "once" || options.reload) ? await loadPayload() : null;
  const results = [];
  let screenshotCaptured = false;
  try {
    for (const { target, session, probe } of connected) {
      try {
        if (options.mode === "remove") await removeFromSession(session);
        else if (options.mode === "once") await applyToSession(session, payload);
        if (options.mode === "once") {
          await new Promise((resolve) => setTimeout(resolve, 850));
        }
        if (options.reload) {
          await session.send("Page.reload", { ignoreCache: true });
          await new Promise((resolve) => setTimeout(resolve, 1600));
          if (options.mode !== "remove") await applyToSession(session, payload);
        }
        const verified = options.mode === "remove"
          ? await verifyRemovedSession(session)
          : (options.reload || options.mode === "once" || options.mode === "verify")
            ? await waitForVerifiedSession(session, options.timeoutMs)
            : await verifySession(session);
        results.push({ targetId: target.id, markers: probe.markers, result: verified });
        if (options.screenshot && !screenshotCaptured) {
          await capture(session, options.screenshot);
          screenshotCaptured = true;
        }
      } finally {
        session.close();
      }
    }
  } finally {
    for (const { session } of connected) session.close();
  }
  console.log(JSON.stringify({ mode: options.mode, port: options.port, targets: results }, null, 2));
  const failed = results.length === 0 || results.some((item) =>
    options.mode === "remove" ? item.result !== true : !item.result?.pass);
  if (failed) process.exitCode = 2;
}

async function runWatch(options) {
  const identityAnchor = await connectBrowserIdentityAnchor(options.port, options.browserId);
  const sessions = new Map();
  const targetFailures = new Map();
  let stopping = false;
  let listFailures = 0;
  let lastListErrorLogAt = 0;
  const stop = () => { stopping = true; };
  const rejectTarget = (target, baseDelayMs, error = null) => {
    const previous = targetFailures.get(target.id) ?? { failures: 0, lastLogAt: 0 };
    const failures = previous.failures + 1;
    const delayMs = Math.min(30000, baseDelayMs * (2 ** Math.min(failures - 1, 4)));
    const now = Date.now();
    if (error && (failures === 1 || now - previous.lastLogAt >= 30000)) {
      console.error(`[dream-skin] inject failed for ${target.id}: ${error.message}; retrying in ${delayMs}ms`);
      previous.lastLogAt = now;
    }
    targetFailures.set(target.id, { failures, lastLogAt: previous.lastLogAt, until: now + delayMs });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  try {
    const payload = await loadPayload();
    while (!stopping) {
      if (identityAnchor.closed) {
        for (const session of sessions.values()) session.close();
        sessions.clear();
        console.error("[dream-skin] original CDP browser identity closed; waiting for a replacement endpoint");
        const replacementBrowserId = await waitForReplacementBrowser(
          options.port,
          options.browserId,
          () => stopping,
        );
        if (stopping) break;
        if (!replacementBrowserId) {
          console.error("[dream-skin] no replacement CDP browser appeared; watcher is stopping without relaunching Codex");
          process.exitCode = 3;
          break;
        }
        try {
          const recoveryPid = await launchVerifiedRecovery(options.port);
          console.error(`[dream-skin] replacement browser detected; delegated verified recovery to PID ${recoveryPid}`);
        } catch (error) {
          console.error(`[dream-skin] could not start verified browser recovery: ${error.message}`);
          process.exitCode = 3;
        }
        break;
      }
      let targets = [];
      try {
        targets = await listAppTargets(options.port, options.browserId);
        listFailures = 0;
      } catch (error) {
        if (error instanceof CdpIdentityMismatchError) {
          identityAnchor.closed = true;
          continue;
        }
        listFailures += 1;
        const retryMs = Math.min(10000, 1000 * (2 ** Math.min(listFailures - 1, 4)));
        if (listFailures === 1 || Date.now() - lastListErrorLogAt >= 30000) {
          console.error(`[dream-skin] ${new Date().toISOString()} ${error.message}; retrying in ${retryMs}ms`);
          lastListErrorLogAt = Date.now();
        }
        await new Promise((resolve) => setTimeout(resolve, retryMs));
        continue;
      }

      const activeIds = new Set(targets.map((target) => target.id));
      for (const id of targetFailures.keys()) {
        if (!activeIds.has(id)) targetFailures.delete(id);
      }
      for (const [id, session] of sessions) {
        if (!activeIds.has(id) || session.closed) {
          session.close();
          sessions.delete(id);
          targetFailures.delete(id);
        }
      }

      for (const target of targets) {
        if (identityAnchor.closed) break;
        if (sessions.has(target.id)) continue;
        if ((targetFailures.get(target.id)?.until ?? 0) > Date.now()) continue;
        let session;
        try {
          session = await connectTarget(target, options.port);
          if (identityAnchor.closed) throw new CdpIdentityMismatchError("Original CDP browser identity closed");
          const probe = await probeSession(session);
          if (!probe?.codex) {
            rejectTarget(target, 5000);
            session.close();
            continue;
          }
          let lastReinjectErrorLogAt = 0;
          session.on("Page.loadEventFired", () => {
            setTimeout(() => applyToSession(session, payload).catch((error) => {
              if (Date.now() - lastReinjectErrorLogAt >= 30000) {
                console.error(`[dream-skin] reinject failed for ${target.id}: ${error.message}`);
                lastReinjectErrorLogAt = Date.now();
              }
            }), 250);
          });
          if (identityAnchor.closed) throw new CdpIdentityMismatchError("Original CDP browser identity closed");
          await applyToSession(session, payload);
          sessions.set(target.id, session);
          targetFailures.delete(target.id);
          console.log(`[dream-skin] injected target ${target.id}`);
        } catch (error) {
          session?.close();
          if (identityAnchor.closed || error instanceof CdpIdentityMismatchError) break;
          rejectTarget(target, 2500, error);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  } finally {
    identityAnchor.close();
    for (const session of sessions.values()) session.close();
  }
}

if (path.resolve(process.argv[1] || "") === path.resolve(scriptPath)) {
const options = parseArgs(process.argv.slice(2));
try {
if (options.mode === "self-test") {
  const valid = validatedDebuggerUrl({ webSocketDebuggerUrl: `ws://127.0.0.1:${options.port}/devtools/page/test` }, options.port);
  const browserId = browserIdFromVersion({
    webSocketDebuggerUrl: `ws://127.0.0.1:${options.port}/devtools/browser/test-browser`,
  }, options.port);
  const invalid = [
    "ws://example.com/devtools/page/test",
    `ws://127.0.0.1:${options.port + 1}/devtools/page/test`,
    `wss://127.0.0.1:${options.port}/devtools/page/test`,
    `ws://user@127.0.0.1:${options.port}/devtools/page/test`,
    `ws://127.0.0.1:${options.port}/unexpected/test`,
    `ws://127.0.0.1:${options.port}/devtools/page/test?query=1`,
  ];
  for (const value of invalid) {
    let rejected = false;
    try { validatedDebuggerUrl({ webSocketDebuggerUrl: value }, options.port); } catch { rejected = true; }
    if (!rejected) throw new Error(`CDP URL validation accepted an unsafe URL: ${value}`);
  }
  const invalidBrowserUrls = [
    `ws://127.0.0.1:${options.port}/devtools/page/not-a-browser`,
    `ws://127.0.0.1:${options.port}/devtools/browser/bad%20id`,
    `ws://127.0.0.1:${options.port}/devtools/browser/test?query=1`,
  ];
  for (const value of invalidBrowserUrls) {
    let rejected = false;
    try { browserIdFromVersion({ webSocketDebuggerUrl: value }, options.port); } catch { rejected = true; }
    if (!rejected) throw new Error(`Browser identity validation accepted an unsafe URL: ${value}`);
  }
  const validPageTarget = {
    id: "page-test",
    type: "page",
    url: "app://codex/",
    webSocketDebuggerUrl: `ws://127.0.0.1:${options.port}/devtools/page/page-test`,
  };
  const invalidPageTargets = [
    { ...validPageTarget, webSocketDebuggerUrl: `ws://127.0.0.1:${options.port}/devtools/browser/page-test` },
    { ...validPageTarget, id: "other-page" },
    { ...validPageTarget, id: 123 },
    { ...validPageTarget, type: "other" },
  ];
  const recovery = buildRecoveryLaunch(options.port, {
    SystemRoot: "C:\\Windows",
    LOCALAPPDATA: "C:\\Users\\dream-skin-test\\AppData\\Local",
  });
  if (!valid || browserId !== "test-browser" || !isValidCdpPageTarget(validPageTarget, options.port) ||
      invalidPageTargets.some((item) => isValidCdpPageTarget(item, options.port)) ||
      recovery.startScript !== path.resolve(here, "start-dream-skin.ps1") ||
      recovery.profilePath !== "C:\\Users\\dream-skin-test\\AppData\\Local\\CodexDreamSkin\\Profile-v3" ||
      !recovery.args.includes("-RecoveryDelayMs") ||
      !recovery.args.includes("-OperationLockWaitMs") ||
      !recovery.args.includes(String(RECOVERY_OPERATION_LOCK_WAIT_MS)) ||
      !recovery.args.includes("-RestartExisting") || recovery.args.includes(options.browserId)) {
    throw new Error("CDP URL and target validation self-test failed");
  }
  console.log(JSON.stringify({ pass: true, version: SKIN_VERSION, test: "loopback-cdp-validation" }));
} else if (options.mode === "check-payload") {
  const payload = await loadPayload();
  if ([
    "__DREAM_CSS_JSON__",
    "__DREAM_ARTS_JSON__",
    "__DREAM_THEME_JSON__",
    "__DREAM_VERSION_JSON__",
  ].some((placeholder) => payload.includes(placeholder))) {
    throw new Error("Payload placeholders were not fully replaced");
  }
  console.log(JSON.stringify({ pass: true, version: SKIN_VERSION, payloadBytes: Buffer.byteLength(payload) }));
} else if (options.mode === "watch") await runWatch(options);
else if (options.mode === "close-browser") await closeBrowser(options);
else await runOneShot(options);
} catch (error) {
  console.error(`[dream-skin] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
}



