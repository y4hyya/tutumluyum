/**
 * Generates the app icons as raw PNGs with zero image dependencies.
 * Neo-brutalist mark: blocky ink "T" with a hard accent-yellow offset shadow,
 * zero rounded corners anywhere (including the inner artwork).
 *
 * Usage: node scripts/generate-icon.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'assets', 'images');

const INK = [0x0a, 0x0a, 0x0a, 0xff];
const PAPER = [0xf5, 0xf2, 0xea, 0xff];
const ACCENT = [0xe8, 0xff, 0x00, 0xff];
const TRANSPARENT = [0, 0, 0, 0];

// --- minimal PNG encoder (RGBA, no filtering) -------------------------------

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter: none
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- flat-rectangle canvas --------------------------------------------------

class Canvas {
  constructor(width, height, bg) {
    this.width = width;
    this.height = height;
    this.px = Buffer.alloc(width * height * 4);
    this.rect(0, 0, width, height, bg);
  }

  rect(x, y, w, h, color) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.width, Math.round(x + w));
    const y1 = Math.min(this.height, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * this.width + xx) * 4;
        this.px[i] = color[0];
        this.px[i + 1] = color[1];
        this.px[i + 2] = color[2];
        this.px[i + 3] = color[3];
      }
    }
  }

  frame(inset, thickness, color) {
    const s = this.width;
    this.rect(inset, inset, s - 2 * inset, thickness, color);
    this.rect(inset, s - inset - thickness, s - 2 * inset, thickness, color);
    this.rect(inset, inset, thickness, s - 2 * inset, color);
    this.rect(s - inset - thickness, inset, thickness, s - 2 * inset, color);
  }

  save(name) {
    writeFileSync(join(OUT_DIR, name), encodePng(this.width, this.height, this.px));
    console.log(`wrote assets/images/${name}`);
  }
}

/** Blocky "T": 7u wide, 7u tall, drawn from two rectangles. */
function markRects(cx, cy, u) {
  return [
    [cx - 3.5 * u, cy - 3.5 * u, 7 * u, 2 * u], // bar
    [cx - u, cy - 1.5 * u, 2 * u, 5 * u], // stem
  ];
}

function drawMark(canvas, cx, cy, u, { shadow = true, color = INK } = {}) {
  const offset = Math.round(u / 2);
  if (shadow) {
    for (const [x, y, w, h] of markRects(cx, cy, u)) {
      canvas.rect(x + offset, y + offset, w, h, ACCENT);
    }
  }
  for (const [x, y, w, h] of markRects(cx, cy, u)) {
    canvas.rect(x, y, w, h, color);
  }
}

// --- outputs ----------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });

// iOS/store icon: paper background, thick ink frame, mark with accent shadow.
{
  const c = new Canvas(1024, 1024, PAPER);
  c.frame(72, 36, INK);
  drawMark(c, 500, 500, 80);
  c.save('icon.png');
}

// Android adaptive foreground: transparent, mark inside the ~66% safe zone.
{
  const c = new Canvas(1024, 1024, TRANSPARENT);
  drawMark(c, 496, 496, 64);
  c.save('adaptive-icon.png');
}

// Android monochrome: alpha-only glyph, no shadow.
{
  const c = new Canvas(1024, 1024, TRANSPARENT);
  drawMark(c, 512, 512, 64, { shadow: false });
  c.save('adaptive-icon-monochrome.png');
}

// Splash mark: transparent background (splash bg color comes from app.json).
{
  const c = new Canvas(512, 512, TRANSPARENT);
  drawMark(c, 248, 248, 32);
  c.save('splash-icon.png');
}

// Web favicon.
{
  const c = new Canvas(48, 48, PAPER);
  drawMark(c, 23, 23, 5);
  c.save('favicon.png');
}
