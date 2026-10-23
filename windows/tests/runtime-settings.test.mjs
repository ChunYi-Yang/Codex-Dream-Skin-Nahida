import assert from "node:assert/strict";
import test from "node:test";
import { resolveRuntimeSettings } from "../scripts/runtime-settings.mjs";

const stateRoot = "C:\\Users\\测试用户\\AppData\\Local\\CodexDreamSkin";
const existsSync = (value) => value.endsWith("Profile-v3");

test("an existing login profile takes precedence over creating a new profile", () => {
  assert.deepEqual(resolveRuntimeSettings({ stateRoot, existsSync }), { profilePath: stateRoot + "\\Profile-v3", port: 9335 });
});
test("verified saved settings remain consistent across entry points", () => {
  const savedState = { profilePath: stateRoot + "\\用户 配置", port: 9341 };
  assert.deepEqual(resolveRuntimeSettings({ stateRoot, savedState, existsSync }), { profilePath: savedState.profilePath, port: 9341 });
});
test("explicit arguments override saved settings", () => {
  const settings = resolveRuntimeSettings({ stateRoot, savedState: { profilePath: stateRoot + "\\旧配置", port: 9341 }, explicitProfile: "D:\\测试 配置", explicitPort: 9441, existsSync });
  assert.deepEqual(settings, { profilePath: "D:\\测试 配置", port: 9441 });
});
test("a fresh install uses the managed CDP profile", () => {
  assert.equal(resolveRuntimeSettings({ stateRoot, existsSync: () => false }).profilePath, stateRoot + "\\cdp-profile");
});
test("saved settings cannot redirect to an unrelated profile directory", () => {
  assert.throws(() => resolveRuntimeSettings({ stateRoot, savedState: { profilePath: "D:\\unrelated" } }), /inside/);
});
test("invalid ports and relative explicit profiles fail clearly", () => {
  assert.throws(() => resolveRuntimeSettings({ stateRoot, explicitPort: 12 }), /port/i);
  assert.throws(() => resolveRuntimeSettings({ stateRoot, explicitProfile: "relative" }), /absolute/i);
});
