import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

const ICONS_DIR = path.resolve('public/icons');
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

function drawAuraIcon(size, isMaskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  // Center coordinate
  const cx = size / 2;
  const cy = size / 2;

  // Safe padding for maskable icons (must be inside center 80%)
  const maxR = isMaskable ? size * 0.38 : size * 0.44;

  // Outer ambient glow
  const glow = ctx.createRadialGradient(cx, cy, maxR * 0.3, cx, cy, maxR * 1.1);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR * 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Vinyl Body
  ctx.fillStyle = '#08080a';
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#222226';
  ctx.lineWidth = Math.max(2, size * 0.015);
  ctx.stroke();

  // Grooves
  const grooveStep = maxR * 0.12;
  for (let r = maxR * 0.45; r < maxR * 0.95; r += grooveStep) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = Math.max(1, size * 0.005);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // White Center Label
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, maxR * 0.32, 0, Math.PI * 2);
  ctx.fill();

  // Spindle Hole
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(cx, cy, maxR * 0.11, 0, Math.PI * 2);
  ctx.fill();

  // Soundwave Bars inside Center Label
  const barCount = 5;
  const barW = Math.max(2, size * 0.018);
  const heights = [0.12, 0.18, 0.24, 0.18, 0.12];
  const spacing = barW * 1.8;
  const totalW = (barCount - 1) * spacing;
  const startX = cx - totalW / 2;

  ctx.fillStyle = '#000000';
  for (let i = 0; i < barCount; i++) {
    const h = maxR * heights[i];
    const bx = startX + i * spacing - barW / 2;
    const by = cy - h / 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, barW, h, barW / 2);
    ctx.fill();
  }

  return canvas.toBuffer('image/png');
}

// Generate all sizes
const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'maskable-icon-192.png', size: 192, maskable: true },
  { name: 'maskable-icon-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false }
];

targets.forEach(t => {
  const buf = drawAuraIcon(t.size, t.maskable);
  const outPath = path.join(ICONS_DIR, t.name);
  fs.writeFileSync(outPath, buf);
  console.log(`Generated ${t.name} (${t.size}x${t.size}, ${buf.length} bytes)`);
});
