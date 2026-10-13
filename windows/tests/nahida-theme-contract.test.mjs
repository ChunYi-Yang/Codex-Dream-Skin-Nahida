import assert from "node:assert/strict";
import test from "node:test";
import { loadTheme } from "../scripts/injector.mjs";

test("bundled theme retains the approved home copy and dark palette", async () => {
  const result = await loadTheme(new URL("../assets/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  assert.equal(result.theme.homePrompt, "我们应该在虚空中做些什么？");
  assert.equal(result.theme.darkColors.background, "#15251f");
  assert.equal(Object.keys(result.imagePaths).length, 7);
});
