import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadPayload } from "../scripts/injector.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(here, "../assets");
const template = await fs.readFile(path.join(assetsDir, "renderer-inject.js"), "utf8");
const sourceTheme = JSON.parse(await fs.readFile(path.join(assetsDir, "theme.json"), "utf8"));
const fingerprint = 'const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";';
const placeholders = [
  "__DREAM_CSS_JSON__",
  "__DREAM_ARTS_JSON__",
  "__DREAM_THEME_JSON__",
  "__DREAM_VERSION_JSON__",
];

assert.equal(template.split(fingerprint).length - 1, 1);

async function buildWith(themeFields) {
  const themeDir = await fs.mkdtemp(path.join(os.tmpdir(), "nahida-payload-"));
  try {
    await Promise.all([
      fs.copyFile(path.join(assetsDir, "dream-skin.css"), path.join(themeDir, "dream-skin.css")),
      fs.copyFile(path.join(assetsDir, "renderer-inject.js"), path.join(themeDir, "renderer-inject.js")),
    ]);
    const imageNames = new Set([sourceTheme.image, ...Object.values(sourceTheme.images)]);
    await Promise.all([...imageNames].map((name) =>
      fs.copyFile(path.join(assetsDir, name), path.join(themeDir, name))));
    await fs.writeFile(
      path.join(themeDir, "theme.json"),
      JSON.stringify({ ...sourceTheme, ...themeFields }),
      "utf8",
    );
    return await loadPayload(themeDir);
  } finally {
    await fs.rm(themeDir, { recursive: true, force: true });
  }
}

function payloadArguments(payload) {
  const normalized = payload.trimEnd();
  const start = normalized.lastIndexOf("})(");
  assert.ok(start >= 0 && normalized.endsWith(")"), "Could not locate renderer arguments.");
  return JSON.parse(`[${normalized.slice(start + 3, -1)}]`);
}

function assertIntact(payload, label) {
  assert.equal(
    payload.split(fingerprint).length - 1,
    1,
    `${label}: renderer source was spliced into the payload more than once.`,
  );
  for (const placeholder of placeholders) {
    assert.equal(payload.includes(placeholder), false, `${label}: unresolved ${placeholder}`);
  }
  assert.doesNotThrow(() => new Function(payload), `${label}: payload is not valid JavaScript.`);
}

test("theme text containing replacement tokens round-trips unchanged", async () => {
  const names = ["a$$b", "a$&b", "a$`b", "a$'b", "a$1b$<name>c", "N $` $& $$ $' $1"];
  for (const name of names) {
    const payload = await buildWith({ name });
    assertIntact(payload, name);
    assert.equal(payloadArguments(payload)[2].name, name);
  }
});

test("all user-visible theme strings survive payload construction", async () => {
  const fields = {
    name: "name $`",
    appLabel: "label $&",
    brandSubtitle: "brand $$",
    homePrompt: "prompt $'",
    tagline: "tagline $1",
    projectPrefix: "prefix $<x>",
    projectLabel: "project $` $&",
    statusText: "status $$",
    quote: "quote $'",
  };
  const payload = await buildWith(fields);
  assertIntact(payload, "all-fields");
  const emittedTheme = payloadArguments(payload)[2];
  for (const [key, value] of Object.entries(fields)) assert.equal(emittedTheme[key], value, key);
});

test("the shipped Nahida payload is complete and parseable", async () => {
  const payload = await loadPayload();
  assertIntact(payload, "shipped");
  const [, art, theme, version] = payloadArguments(payload);
  assert.equal(theme.id, "nahida-dream");
  assert.equal(version, "1.1.75");
  assert.deepEqual(Object.keys(art).sort(), [
    "background", "decorations", "hero", "portrait", "rightPanel", "scene", "sidebar",
  ]);
});
