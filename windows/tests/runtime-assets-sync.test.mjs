import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const tool = path.join(root, "tools/sync-runtime-assets.mjs");

test("generated deployment assets match canonical source", () => {
  const result = spawnSync(process.execPath, [tool, "--check"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("check mode rejects drift without rewriting deployment files", async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "nahida-sync-"));
  try {
    await fs.cp(path.join(root, "runtime"), path.join(fixture, "runtime"), { recursive: true });
    await fs.mkdir(path.join(fixture, "windows/assets"), { recursive: true });
    await fs.writeFile(path.join(fixture, "windows/assets/dream-skin.css"), "user change");
    const result = spawnSync(process.execPath, [tool, "--check", "--root", fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.equal(await fs.readFile(path.join(fixture, "windows/assets/dream-skin.css"), "utf8"), "user change");
  } finally {
    await fs.rm(fixture, { recursive: true, force: true });
  }
});

test("CRLF source checkouts generate the same LF deployment assets", async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "nahida-sync-crlf-"));
  try {
    for (const directory of ["runtime", "tools", "windows/assets"]) {
      await fs.cp(path.join(root, directory), path.join(fixture, directory), { recursive: true });
    }
    for (const directory of ["runtime", "tools"]) {
      for (const name of await fs.readdir(path.join(fixture, directory))) {
        const file = path.join(fixture, directory, name);
        if (!(await fs.stat(file)).isFile()) continue;
        const source = await fs.readFile(file, "utf8");
        await fs.writeFile(file, source.replace(/\r?\n/g, "\r\n"));
      }
    }
    const result = spawnSync(process.execPath, [path.join(fixture, "tools/sync-runtime-assets.mjs"), "--check"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally {
    await fs.rm(fixture, { recursive: true, force: true });
  }
});
