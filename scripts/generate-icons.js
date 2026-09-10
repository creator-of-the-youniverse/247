import zlib from 'zlib';
import fs from 'fs';
import path from 'path';

function createPng(width, height, getPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xEDB88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    let c = 0 ^ (-1);
    const buf = Buffer.concat([t, data]);
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xFF];
    }
    c = (c ^ (-1)) >>> 0;
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(c, 0);
    return Buffer.concat([len, t, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const idat = zlib.deflateSync(rawData);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Draw crisp 247 glyphs on a grid
// 7x7 grid for T, 2, 4
const GLYPH_7 = [
  "1111111",
  "0001000",
  "0001000",
  "0001000",
  "0001000",
  "0001000",
  "0001000"
];

const GLYPH_2 = [
  "0111110",
  "1000001",
  "0000010",
  "0001100",
  "0010000",
  "0100000",
  "1111111"
];

const GLYPH_4 = [
  "0000110",
  "0001010",
  "0010010",
  "0100010",
  "1111111",
  "0000010",
  "0000010"
];

function isInsideGlyph(gx, gy, glyph) {
  if (gx < 0 || gx >= 7 || gy < 0 || gy >= 7) return false;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  return glyph[iy]?.[ix] === '1';
}

function renderIcon(size, isMaskable = false) {
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 100;

  // Colors
  const bgDark = [12, 10, 9, 255];
  const stoneBorder = [68, 64, 60, 255];
  const amber = [245, 158, 11, 255];
  const amberDark = [217, 119, 6, 255];
  const charcoal = [28, 25, 23, 255];

  const circleRadius = isMaskable ? 28 * scale : 34 * scale;
  const ringRadius = isMaskable ? 33 * scale : 39 * scale;

  return createPng(size, size, (x, y) => {
    if (!isMaskable) {
      const cornerR = 20 * scale;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const hw = 46 * scale;
      const hh = 46 * scale;

      if (dx > hw || dy > hh) return [0, 0, 0, 0];

      if (dx > hw - cornerR && dy > hh - cornerR) {
        const cdx = dx - (hw - cornerR);
        const cdy = dy - (hh - cornerR);
        if (cdx * cdx + cdy * cdy > cornerR * cornerR) {
          return [0, 0, 0, 0];
        }
      }
    }

    const distFromCenter = Math.hypot(x - cx, y - cy);

    if (distFromCenter <= circleRadius) {
      const textH = 22 * scale;
      const textTop = cy - textH / 2;
      const textBottom = cy + textH / 2;

      if (y >= textTop && y <= textBottom) {
        const ny = ((y - textTop) / textH) * 7;

        // 2 — left digit
        const twoLeft = cx - 21 * scale;
        const twoRight = cx - 7 * scale;
        if (x >= twoLeft && x <= twoRight) {
          const nx = ((x - twoLeft) / (twoRight - twoLeft)) * 7;
          if (isInsideGlyph(nx, ny, GLYPH_2)) return bgDark;
        }

        // 4 — center digit
        const fourLeft = cx - 6.5 * scale;
        const fourRight = cx + 6.5 * scale;
        if (x >= fourLeft && x <= fourRight) {
          const nx = ((x - fourLeft) / (fourRight - fourLeft)) * 7;
          if (isInsideGlyph(nx, ny, GLYPH_4)) return bgDark;
        }

        // 7 — right digit
        const sevenLeft = cx + 7.5 * scale;
        const sevenRight = cx + 21.5 * scale;
        if (x >= sevenLeft && x <= sevenRight) {
          const nx = ((x - sevenLeft) / (sevenRight - sevenLeft)) * 7;
          if (isInsideGlyph(nx, ny, GLYPH_7)) return bgDark;
        }
      }

      const dotY = cy + 16 * scale;
      if (Math.hypot(x - cx, y - dotY) <= 2 * scale) {
        return bgDark;
      }

      return amber;
    }

    if (distFromCenter > circleRadius && distFromCenter <= ringRadius) {
      const angle = Math.atan2(y - cy, x - cx);
      const cogCount = 16;
      const cogPhase = (angle + Math.PI) / (2 * Math.PI) * cogCount;
      const frac = cogPhase - Math.floor(cogPhase);

      if (
        distFromCenter >
        circleRadius + (ringRadius - circleRadius) * 0.4 &&
        frac > 0.45
      ) {
        return charcoal;
      }

      return stoneBorder;
    }

    return bgDark;
  });
}

const publicDir = path.join(process.cwd(), 'public');

console.log('Generating PWA icons...');
const pwa192 = renderIcon(192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);
console.log('Created pwa-192x192.png (size:', pwa192.length, ')');

const pwa512 = renderIcon(512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);
console.log('Created pwa-512x512.png (size:', pwa512.length, ')');

const pwaMaskable = renderIcon(512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);
console.log('Created pwa-maskable-512x512.png (size:', pwaMaskable.length, ')');

const appleTouchIcon = renderIcon(180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);
console.log('Created apple-touch-icon.png (size:', appleTouchIcon.length, ')');

// Simple favicon.ico (can be 32x32 PNG framed as ICO or pure 32x32 PNG)
const favicon = renderIcon(32, false);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon);
console.log('Created favicon.ico (size:', favicon.length, ')');

console.log('All PWA icons generated successfully!');
