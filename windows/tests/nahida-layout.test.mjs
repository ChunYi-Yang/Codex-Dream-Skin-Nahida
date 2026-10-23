import assert from "node:assert/strict";
import test from "node:test";
import { resolveNahidaLayout } from "../../runtime/nahida-layout.mjs";

for (const [name, input, expected] of [
  ["spacious main", { width: 1080, height: 900 }, "full"],
  ["main narrowed by right dock", { width: 820, height: 720 }, "compact"],
  ["narrow main", { width: 560, height: 700 }, "off"],
  ["short main", { width: 1000, height: 500 }, "off"],
  ["large composer in short main", { width: 1000, height: 650, composerHeight: 280 }, "off"],
  ["non-home", { width: 1080, height: 900, page: "thread" }, "off"],
]) {
  test(`${name} preserves native input space`, () => assert.equal(resolveNahidaLayout({ page: "home", composerHeight: 140, ...input }).heroMode, expected));
}
test("reduced motion disables decorative particles", () => {
  assert.equal(resolveNahidaLayout({ width: 1080, height: 900, page: "home", reducedMotion: true }).showParticles, false);
});
for (const [width, height, visible] of [[1080, 720, true], [820, 650, true], [560, 700, false], [1000, 500, false]]) {
  test(`home portrait follows the banner at ${width}x${height}`, () => {
    assert.equal(resolveNahidaLayout({ width, height, page: 'home' }).showPortrait, visible);
  });
}
test('portrait stays disabled outside home and with invalid dimensions', () => {
  assert.equal(resolveNahidaLayout({ width: 1200, height: 900, page: 'thread' }).showPortrait, false);
  assert.equal(resolveNahidaLayout({ width: NaN, height: 900, page: 'home' }).showPortrait, false);
});
