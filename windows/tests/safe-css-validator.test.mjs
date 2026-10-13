import assert from "node:assert/strict";
import test from "node:test";
import { decodeAndValidateSafeCss } from "../assets/safe-css-validator.mjs";

test("registered region CSS produces a confined important cascade", () => {
  const result = decodeAndValidateSafeCss(Buffer.from('[data-ds-part="composer"] { background-color: #123456; }'));
  assert.ok(result.runtimeSource.includes("#123456 !important"));
  assert.ok(result.runtimeSource.includes("dreamskin-community"));
});

for (const [name, css] of [
  ["global selectors", "body { color: red; }"],
  ["external images", '[data-ds-part="main"] { background-image: url(https://example.com/x.png); }'],
  ["layout takeover", '[data-ds-part="composer"] { position: fixed; }'],
  ["unregistered regions", '[data-ds-part="right-panel"] { color: red; }'],
]) {
  test(`Safe CSS refuses ${name}`, () => assert.throws(() => decodeAndValidateSafeCss(Buffer.from(css))));
}
