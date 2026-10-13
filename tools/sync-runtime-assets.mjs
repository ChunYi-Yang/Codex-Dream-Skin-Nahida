import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLayoutAdapter } from "../runtime/layout-adapter.mjs";
import { resolveNahidaLayout } from "../runtime/nahida-layout.mjs";

const args = process.argv.slice(2);
let root = fileURLToPath(new URL("../", import.meta.url));
let check = false;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--check") check = true;
  else if (args[index] === "--root" && args[index + 1]) root = path.resolve(args[++index]);
  else throw new Error(`Unknown sync argument: ${args[index]}`);
}

const jobs = [
  ["runtime/renderer-inject.js", "windows/assets/renderer-inject.js"],
  ["runtime/dream-skin.css", "windows/assets/dream-skin.css"],
];
if (await fs.stat(path.join(root, "tools/selectors.json")).catch(() => null)) {
  jobs.push(["tools/selectors.json", "windows/assets/selectors.json"]);
}
const stale = [];
for (const [source, target] of jobs) {
  let expected = await fs.readFile(path.join(root, source), "utf8");
  if (source.endsWith("dream-skin.css")) {
    expected += "\n" + await fs.readFile(path.join(root, "runtime/nahida-theme.css"), "utf8");
  }
  if (source.endsWith("renderer-inject.js")) {
    const contract = await fs.readFile(path.join(root, "tools/selectors.json"), "utf8").catch(() => '{"selectors":[]}');
    expected = expected.replace("__DREAM_LAYOUT_FACTORY__", () => createLayoutAdapter.toString())
      .replace("__DREAM_LAYOUT_POLICY__", () => resolveNahidaLayout.toString())
      .replace("__DREAM_SELECTOR_CONTRACT__", () => contract.trim());
  }
  const actual = await fs.readFile(path.join(root, target), "utf8").catch(() => null);
  if (actual === expected) continue;
  if (check) stale.push(target);
  else {
    await fs.mkdir(path.dirname(path.join(root, target)), { recursive: true });
    const temporary = `${path.join(root, target)}.${process.pid}.tmp`;
    await fs.writeFile(temporary, expected, "utf8");
    await fs.rename(temporary, path.join(root, target));
    console.log(`Generated ${target}`);
  }
}
if (stale.length) {
  console.error(`Runtime assets differ: ${stale.join(", ")}`);
  process.exitCode = 1;
} else console.log(check ? "PASS: generated runtime assets are current" : "PASS: runtime assets generated");
