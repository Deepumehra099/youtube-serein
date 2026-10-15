const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const size = 1024;
const scale = 3;
const hi = size * scale;
const background = [23, 70, 61];
const foregroundColor = [212, 242, 231];
const points = [[.66, .32], [.43, .32], [.32, .41], [.32, .45], [.42, .50], [.58, .54], [.68, .59], [.68, .64], [.57, .73], [.35, .73]]
  .map(([x, y]) => [x * hi, y * hi]);

function segmentDistance(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (a[0] + dx * t), py - (a[1] + dy * t));
}

const hiPixels = new Uint8Array(hi * hi * 4);
for (let i = 0; i < hiPixels.length; i += 4) { hiPixels[i] = background[0]; hiPixels[i + 1] = background[1]; hiPixels[i + 2] = background[2]; hiPixels[i + 3] = 255; }
for (let y = Math.floor(hi * .23); y < hi * .79; y++) for (let x = Math.floor(hi * .24); x < hi * .76; x++) {
  const px = x + .5, py = y + .5;
  let distance = Infinity;
  for (let n = 0; n < points.length - 1; n++) distance = Math.min(distance, segmentDistance(px, py, points[n], points[n + 1]));
  const inMark = distance <= hi * .039 || Math.hypot(px - hi * .70, py - hi * .25) <= hi * .025;
  if (!inMark) continue;
  const i = (y * hi + x) * 4;
  hiPixels[i] = foregroundColor[0]; hiPixels[i + 1] = foregroundColor[1]; hiPixels[i + 2] = foregroundColor[2];
}

const full = new PNG({ width: size, height: size, alpha: true });
const mark = new PNG({ width: size, height: size, alpha: true });
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const to = (y * size + x) * 4;
  let r = 0, g = 0, b = 0, a = 0;
  for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
    const from = ((y * scale + sy) * hi + x * scale + sx) * 4;
    r += hiPixels[from]; g += hiPixels[from + 1]; b += hiPixels[from + 2];
    if (hiPixels[from] === foregroundColor[0] && hiPixels[from + 1] === foregroundColor[1]) a += 255;
  }
  const samples = scale * scale;
  full.data[to] = Math.round(r / samples); full.data[to + 1] = Math.round(g / samples); full.data[to + 2] = Math.round(b / samples); full.data[to + 3] = 255;
  mark.data[to] = foregroundColor[0]; mark.data[to + 1] = foregroundColor[1]; mark.data[to + 2] = foregroundColor[2]; mark.data[to + 3] = Math.round(a / samples);
}

const outDir = path.resolve(__dirname, '../assets');
fs.writeFileSync(path.join(outDir, 'icon.png'), PNG.sync.write(full));
fs.writeFileSync(path.join(outDir, 'splash-icon.png'), PNG.sync.write(full));
fs.writeFileSync(path.join(outDir, 'favicon.png'), PNG.sync.write(full));
fs.writeFileSync(path.join(outDir, 'android-icon-foreground.png'), PNG.sync.write(mark));
fs.writeFileSync(path.join(outDir, 'android-icon-monochrome.png'), PNG.sync.write(mark));
console.log('Generated original Serein monogram assets.');
