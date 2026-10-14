import assert from "node:assert/strict";
import test from "node:test";
import { compileSafeCss, decodeAndValidateSafeCss } from "../assets/safe-css-validator.mjs";

test("community CSS is scoped and compiled, while network and script values are rejected", () => {
  const compiled = compileSafeCss('[data-ds-part="composer"] { background-color: #123456; border-radius: 12px; }');
  assert.match(compiled, /@layer dreamskin-community/);
  assert.match(compiled, /background-color: #123456 !important/);
  assert.match(compiled, /border-radius: 12px !important/);
  for (const source of [
    'body { color: red; }',
    '@import "https://example.com/a.css";',
    '[data-ds-part="composer"] { background-image: url(https://example.com/a.png); }',
    '[data-ds-part="composer"] { color: expression(alert(1)); }',
  ]) assert.throws(() => compileSafeCss(source));
  assert.throws(() => decodeAndValidateSafeCss(new Uint8Array([0xff])));
});
