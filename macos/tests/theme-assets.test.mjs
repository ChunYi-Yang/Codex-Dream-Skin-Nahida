import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const assets = path.join(root, "assets");
const theme = JSON.parse(await fs.readFile(path.join(assets, "theme.json"), "utf8"));

function imageMetadata(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return {
      format: "png",
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      alpha: [4, 6].includes(buffer[25]),
    };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        return {
          format: "jpeg",
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
          alpha: false,
        };
      }
      if (marker === 0xd9 || marker === 0xda) break;
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
  }
  throw new Error("Unsupported or malformed theme image");
}

const expected = {
  hero: [1754, 1240, false],
  sidebar: [640, 1120, false],
  portrait: [760, 920, false],
  decorations: [1024, 512, true],
  scene: [1024, 1024, true],
};
const files = { hero: theme.image, ...theme.images };
assert.deepEqual(Object.keys(files).sort(), Object.keys(expected).sort());
assert.equal(new Set(Object.values(files)).size, Object.keys(expected).length);

for (const [slot, filename] of Object.entries(files)) {
  assert.equal(path.basename(filename), filename, `${slot} escapes the asset directory`);
  const buffer = await fs.readFile(path.join(assets, filename));
  assert.ok(buffer.length > 0 && buffer.length <= 16 * 1024 * 1024, `${slot} has an invalid size`);
  const metadata = imageMetadata(buffer);
  assert.deepEqual(
    [metadata.width, metadata.height, metadata.alpha],
    expected[slot],
    `${slot} dimensions or alpha channel changed`,
  );
}

console.log("PASS: macOS forest theme assets are complete, bounded, and structurally valid.");
