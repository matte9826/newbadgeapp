// Generates placeholder PWA icons as valid PNGs using only Node's zlib.
// Produces a solid brand-green square; with `purpose: maskable` the launcher
// rounds it into a clean app icon. Replace icons/ with the real logo later.
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "icons");

// Brand palette
const GREEN = [0x16, 0xa3, 0x4a]; // #16A34A primary green
const LIGHT = [0xdc, 0xfc, 0xe7]; // #DCFCE7 light green (leaf highlight)

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// Draws a simple two-tone leaf mark on a green field so the placeholder still
// reads as a "garden" brand rather than a flat block.
function pixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const nx = (x - cx) / (size * 0.5);
  const ny = (y - cy) / (size * 0.5);
  // Rotated leaf (ellipse) highlight
  const a = (nx + ny) * 0.7071;
  const b = (nx - ny) * 0.7071;
  const leaf = (a * a) / 0.34 + (b * b) / 0.09;
  if (leaf <= 1) {
    // central vein
    if (Math.abs(b) < 0.03 && a > -0.55) return GREEN;
    return LIGHT;
  }
  return GREEN;
}

function makePng(size) {
  const rowLen = size * 4 + 1;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y, size);
      const o = y * rowLen + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = 255;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT, { recursive: true });
for (const size of [192, 512]) {
  const file = path.join(OUT, `icon-${size}.png`);
  fs.writeFileSync(file, makePng(size));
  console.log("wrote", path.relative(path.join(__dirname, ".."), file));
}
