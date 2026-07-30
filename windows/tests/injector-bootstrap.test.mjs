import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const injectorPath = path.resolve(here, "../scripts/injector.mjs");
const source = await fs.readFile(injectorPath, "utf8");

const watcherStart = source.indexOf("async function runWatch(options)");
const watcher = source.slice(watcherStart);
assert.ok(watcherStart >= 0, "The watcher entry point must exist.");

assert.match(
  watcher,
  /connectBrowserIdentityAnchor\(options\.port, options\.browserId\)/,
  "The watcher must pin the browser identity before attaching to renderers.",
);
assert.match(
  watcher,
  /listAppTargets\(options\.port, options\.browserId\)/,
  "Every target refresh must revalidate the expected browser identity.",
);

const connect = watcher.indexOf("session = await connectTarget(target, options.port)");
const identityBeforeProbe = watcher.indexOf("if (identityAnchor.closed)", connect);
const probe = watcher.indexOf("const probe = await probeSession(session)", identityBeforeProbe);
const rejectNonCodex = watcher.indexOf("if (!probe?.codex)", probe);
const loadFallback = watcher.indexOf('session.on("Page.loadEventFired"', rejectNonCodex);
const identityBeforeApply = watcher.indexOf("if (identityAnchor.closed)", loadFallback);
const apply = watcher.indexOf("await applyToSession(session, payload)", identityBeforeApply);

assert.ok(
  connect >= 0 &&
    identityBeforeProbe > connect &&
    probe > identityBeforeProbe &&
    rejectNonCodex > probe &&
    loadFallback > rejectNonCodex &&
    identityBeforeApply > loadFallback &&
    apply > identityBeforeApply,
  "Targets must pass browser and Codex identity checks before injection or reload fallback registration.",
);
assert.match(
  watcher.slice(loadFallback, identityBeforeApply),
  /setTimeout\(\(\) => applyToSession\(session, payload\)/,
  "Reload fallback must reapply only to the already validated target session.",
);
assert.match(
  watcher,
  /if \(identityAnchor\.closed \|\| error instanceof CdpIdentityMismatchError\) break;/,
  "Identity changes must stop the current watcher instead of crossing into another browser.",
);

console.log("PASS: Windows watcher scopes initial and reload injection to a pinned Codex browser identity.");
