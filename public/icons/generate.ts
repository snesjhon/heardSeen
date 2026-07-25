// One-off dev utility: rasterizes source.svg into the PNG sizes iOS/PWA
// manifests need. Re-run with `pnpm exec tsx public/icons/generate.ts` if
// you edit source.svg. Not part of the app's runtime.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ICONS_DIR = __dirname;
const svg = readFileSync(join(ICONS_DIR, "source.svg"));

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "maskable-512.png", size: 512, padding: true },
  { file: "apple-touch-icon.png", size: 180 },
];

async function main() {
  for (const target of targets) {
    const size = target.size;
    const image = target.padding
      ? sharp(svg)
          .resize(Math.round(size * 0.7), Math.round(size * 0.7))
          .extend({
            top: Math.round(size * 0.15),
            bottom: Math.round(size * 0.15),
            left: Math.round(size * 0.15),
            right: Math.round(size * 0.15),
            background: "#6d28d9",
          })
      : sharp(svg).resize(size, size);

    const buffer = await image.png().toBuffer();
    writeFileSync(join(ICONS_DIR, target.file), buffer);
    console.log(`wrote ${target.file}`);
  }
}

main();
