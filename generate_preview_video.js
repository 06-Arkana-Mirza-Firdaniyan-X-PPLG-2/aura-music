import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { createCanvas } from '@napi-rs/canvas';
import { generateSoundtrackWav } from './generate_audio.js';

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DURATION = 30; // 30 seconds
const TOTAL_FRAMES = FPS * DURATION; // 900 frames

console.log(`=== AURA MUSIC VIDEO GENERATOR ===`);
console.log(`Resolution: ${WIDTH}x${HEIGHT} @ ${FPS}fps`);
console.log(`Total Frames: ${TOTAL_FRAMES}`);

// 1. Ensure soundtrack WAV exists
const audioPath = path.resolve('preview_audio.wav');
if (!fs.existsSync(audioPath)) {
  console.log('Generating audio soundtrack...');
  generateSoundtrackWav(audioPath);
}

// 2. Prepare Canvas
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Output paths
const outputPublic = path.resolve('public/aura-preview.mp4');
const outputRoot = path.resolve('aura-preview.mp4');

// Spawn ffmpeg child process with pipes
const ff = spawn(ffmpeg.path, [
  '-y',
  '-f', 'rawvideo',
  '-vcodec', 'rawvideo',
  '-s', `${WIDTH}x${HEIGHT}`,
  '-pix_fmt', 'rgba',
  '-r', `${FPS}`,
  '-i', '-',
  '-i', audioPath,
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '19',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-shortest',
  outputPublic
], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Helper: 3D Projection
function project3D(x, y, z, rotX, rotY, rotZ, tx = 0, ty = 0, tz = 0, fov = 800) {
  // Rotate Y
  let cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  let x1 = x * cosY + z * sinY;
  let z1 = -x * sinY + z * cosY;

  // Rotate X
  let cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  let y2 = y * cosX - z1 * sinX;
  let z2 = y * sinX + z1 * cosX;

  // Rotate Z
  let cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);
  let x3 = x1 * cosZ - y2 * sinZ;
  let y3 = x1 * sinZ + y2 * cosZ;

  // Translation
  let finalX = x3 + tx;
  let finalY = y3 + ty;
  let finalZ = z2 + tz + fov;

  if (finalZ <= 50) return null;

  let scale = fov / finalZ;
  return {
    x: WIDTH / 2 + finalX * scale,
    y: HEIGHT / 2 + finalY * scale,
    scale: scale,
    depth: finalZ
  };
}

// Helper: Draw Glassmorphic Card in 3D
function draw3DCard(ctx, cx, cy, cz, w, h, rx, ry, rz, options = {}) {
  const hw = w / 2;
  const hh = h / 2;
  const p1 = project3D(cx - hw, cy - hh, cz, rx, ry, rz);
  const p2 = project3D(cx + hw, cy - hh, cz, rx, ry, rz);
  const p3 = project3D(cx + hw, cy + hh, cz, rx, ry, rz);
  const p4 = project3D(cx - hw, cy + hh, cz, rx, ry, rz);

  if (!p1 || !p2 || !p3 || !p4) return;

  // Card background
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.closePath();

  ctx.fillStyle = options.bg || 'rgba(14, 14, 18, 0.88)';
  ctx.fill();

  ctx.lineWidth = options.borderWidth || 1.5;
  ctx.strokeStyle = options.borderColor || 'rgba(255, 255, 255, 0.22)';
  ctx.stroke();
  ctx.restore();
}

// 3D Background Particles
const PARTICLES_COUNT = 90;
const particles = [];
for (let i = 0; i < PARTICLES_COUNT; i++) {
  particles.push({
    x: (Math.random() - 0.5) * 2400,
    y: (Math.random() - 0.5) * 1600,
    z: Math.random() * 1200 - 400,
    size: Math.random() * 2.5 + 1.0,
    speed: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.7 + 0.2
  });
}

function renderBackground(ctx, frame, bassEnergy = 0) {
  // Deep gradient background
  const bgGrad = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, WIDTH * 0.8);
  bgGrad.addColorStop(0, '#0a0a0f');
  bgGrad.addColorStop(0.5, '#050508');
  bgGrad.addColorStop(1, '#020203');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle 3D Horizon Grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridY = HEIGHT * 0.68;
  for (let i = -10; i <= 10; i++) {
    const xBase = WIDTH / 2 + i * 160;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, gridY);
    ctx.lineTo(WIDTH / 2 + i * 600, HEIGHT);
    ctx.stroke();
  }
  for (let y = gridY + 20; y < HEIGHT; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();

  // Floating Star/Dust Particles
  ctx.save();
  for (let p of particles) {
    p.z -= p.speed;
    if (p.z < -400) p.z = 800;
    const proj = project3D(p.x, p.y, p.z, 0, 0, 0);
    if (proj) {
      const pRadius = p.size * proj.scale * (1 + bassEnergy * 0.4);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * Math.min(1, proj.scale)})`;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, Math.max(0.5, pRadius), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Draw Top Brand Bar
function drawHeaderBrand(ctx, currentSceneTitle = '') {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Segoe UI", sans-serif';
  ctx.fillText('AURA', 90, 70);

  ctx.fillStyle = '#666666';
  ctx.font = '14px "Segoe UI", sans-serif';
  ctx.fillText('•  v4.5.0 STUDIO PRO', 160, 70);

  if (currentSceneTitle) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(currentSceneTitle.toUpperCase(), WIDTH - 90, 70);
  }

  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(90, 92);
  ctx.lineTo(WIDTH - 90, 92);
  ctx.stroke();
  ctx.restore();
}

// Render individual scenes
function renderFrame(frame) {
  const t = frame / FPS; // Time in seconds
  const beat = t * (124 / 60); // 124 BPM
  const bassEnergy = Math.max(0, Math.sin(beat * Math.PI * 2)) * 0.8;

  renderBackground(ctx, frame, bassEnergy);

  // SCENE ROUTING
  if (t < 4.2) {
    // -------------------------------------------------------------
    // SCENE 1: HERO TITLE & OVERVIEW (0.0s - 4.2s)
    // -------------------------------------------------------------
    drawHeaderBrand(ctx, 'Official Product Showcase');

    const progress = Math.min(1, t / 1.5);
    const discRot = t * 1.8;

    // Center 3D Vinyl Emblem
    const pCenter = project3D(0, -60, 0, 0.25, discRot, 0, 0, 0, 0, 900);
    if (pCenter) {
      ctx.save();
      ctx.translate(pCenter.x, pCenter.y);
      ctx.scale(pCenter.scale * progress, pCenter.scale * progress);

      // Outer glow
      const glow = ctx.createRadialGradient(0, 0, 80, 0, 0, 240);
      glow.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 240, 0, Math.PI * 2);
      ctx.fill();

      // Vinyl Disc
      ctx.fillStyle = '#08080a';
      ctx.beginPath();
      ctx.arc(0, 0, 160, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222226';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Grooves
      for (let r = 70; r < 150; r += 16) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Center White Ring & Hole
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#050507';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Title Typography
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 78px "Segoe UI", sans-serif';
    ctx.fillText('AURA MUSIC', WIDTH / 2, 640);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillText('ULTRA-FAST AD-FREE STREAMING PLAYER', WIDTH / 2, 695);

    // Pill Badges
    const pills = ['DUAL STREAM ENGINE', 'STUDIO SOUND CARD', 'DSP EQUALIZER', 'SYNCED LYRICS'];
    const totalPillW = pills.length * 190;
    pills.forEach((p, idx) => {
      const px = WIDTH / 2 - totalPillW / 2 + idx * 190 + 90;
      const py = 760;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px - 85, py - 18, 170, 36, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 13px "Segoe UI", sans-serif';
      ctx.fillText(p, px, py + 5);
    });
    ctx.restore();

  } else if (t < 9.0) {
    // -------------------------------------------------------------
    // SCENE 2: DUAL CLOUD STREAMING ENGINES (4.2s - 9.0s)
    // -------------------------------------------------------------
    drawHeaderBrand(ctx, 'Feature 01: Dual Cloud Streaming Engines');

    const st = t - 4.2;
    const enterProgress = Math.min(1, st / 1.0);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px "Segoe UI", sans-serif';
    ctx.fillText('DUAL CLOUD STREAM ARCHITECTURE', WIDTH / 2, 180);
    ctx.fillStyle = '#888888';
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText('Dual-engine redundancy guarantees 100% uptime with zero buffering', WIDTH / 2, 220);
    ctx.restore();

    // 3D Engine Cards
    const rotY = Math.sin(t * 0.8) * 0.15;
    const rotX = 0.08;

    // Left Card: YouTube Standard
    const leftX = -360 * enterProgress;
    draw3DCard(ctx, leftX, 60, 0, 480, 520, rotX, rotY - 0.1, 0, {
      bg: 'rgba(16, 16, 22, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.28)'
    });

    const pL = project3D(leftX, 60, 0, rotX, rotY - 0.1, 0);
    if (pL) {
      ctx.save();
      ctx.translate(pL.x, pL.y);
      ctx.scale(pL.scale, pL.scale);
      ctx.textAlign = 'left';

      // Badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-200, -220, 160, 30, 15);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillText('ENGINE 01 • ACTIVE', -188, -200);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "Segoe UI", sans-serif';
      ctx.fillText('YouTube Standard', -200, -150);

      ctx.fillStyle = '#999999';
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillText('Fast CDN direct audio stream', -200, -115);

      const itemsL = [
        '⚡ 160kbps High-Bitrate Opus Stream',
        '⚡ Global Edge CDN Content Delivery',
        '⚡ Millions of Covers, Remixes & Lives',
        '⚡ Instantaneous Track Buffering'
      ];
      itemsL.forEach((it, idx) => {
        ctx.fillStyle = '#e0e0e0';
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillText(it, -200, -50 + idx * 45);
      });
      ctx.restore();
    }

    // Right Card: YouTube Music Studio
    const rightX = 360 * enterProgress;
    draw3DCard(ctx, rightX, 60, 0, 480, 520, rotX, rotY + 0.1, 0, {
      bg: 'rgba(16, 16, 22, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.35)'
    });

    const pR = project3D(rightX, 60, 0, rotX, rotY + 0.1, 0);
    if (pR) {
      ctx.save();
      ctx.translate(pR.x, pR.y);
      ctx.scale(pR.scale, pR.scale);
      ctx.textAlign = 'left';

      // Badge
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-200, -220, 185, 30, 15);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillText('ENGINE 02 • STUDIO', -188, -200);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "Segoe UI", sans-serif';
      ctx.fillText('YouTube Music', -200, -150);

      ctx.fillStyle = '#999999';
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillText('Curated Studio Master Releases', -200, -115);

      const itemsR = [
        '💎 Official Artist Master Audio',
        '💎 Clean Metadata (No Titles Clutter)',
        '💎 Precise LRCLIB Synced Lyrics',
        '💎 Automatic Failover Redundancy'
      ];
      itemsR.forEach((it, idx) => {
        ctx.fillStyle = '#e0e0e0';
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillText(it, -200, -50 + idx * 45);
      });
      ctx.restore();
    }

    // Animated Connection Beam
    if (pL && pR) {
      ctx.save();
      const beamX = pL.x + (pR.x - pL.x) * ((t * 2) % 1);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pL.x + 220 * pL.scale, pL.y);
      ctx.lineTo(pR.x - 220 * pR.scale, pR.y);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(beamX, pL.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

  } else if (t < 14.5) {
    // -------------------------------------------------------------
    // SCENE 3: STUDIO SOUND CARD & LIVE VISUALIZER (9.0s - 14.5s)
    // -------------------------------------------------------------
    drawHeaderBrand(ctx, 'Feature 02: Studio Sound Card & Spectrum Visualizer');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px "Segoe UI", sans-serif';
    ctx.fillText('STUDIO SOUND CARD & VISUALIZER', WIDTH / 2, 170);
    ctx.fillStyle = '#888888';
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText('Real-time audio spectrum telemetry with reactive multi-mode visualizer', WIDTH / 2, 210);
    ctx.restore();

    // Large 3D Sound Card Center
    const rotY = Math.sin(t * 0.6) * 0.12 - 0.05;
    const rotX = 0.12;

    draw3DCard(ctx, 0, 70, 0, 840, 560, rotX, rotY, 0, {
      bg: 'rgba(12, 12, 16, 0.94)',
      borderColor: 'rgba(255, 255, 255, 0.25)'
    });

    const pCard = project3D(0, 70, 0, rotX, rotY, 0);
    if (pCard) {
      ctx.save();
      ctx.translate(pCard.x, pCard.y);
      ctx.scale(pCard.scale, pCard.scale);

      // Artwork box (left)
      ctx.fillStyle = '#08080c';
      ctx.strokeStyle = '#22222a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-380, -230, 260, 260, 16);
      ctx.fill();
      ctx.stroke();

      // Mini vinyl rotating inside artwork
      ctx.save();
      ctx.translate(-250, -100);
      ctx.rotate(t * 1.5);
      ctx.fillStyle = '#111116';
      ctx.beginPath();
      ctx.arc(0, 0, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#33333d';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Track Metadata (right of artwork)
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillText('NOW PLAYING • HIGH DEFINITION', -90, -200);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px "Segoe UI", sans-serif';
      ctx.fillText('Starboy (feat. Daft Punk)', -90, -155);

      ctx.fillStyle = '#a0a0a8';
      ctx.font = '20px "Segoe UI", sans-serif';
      ctx.fillText('The Weeknd • Official Audio Master', -90, -120);

      // Badge
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-90, -90, 140, 26, 13);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.fillText('YT MUSIC ENGINE', -76, -73);

      // Visualizer Box (bottom half of card)
      ctx.fillStyle = '#07070a';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(-380, 50, 760, 140, 14);
      ctx.fill();
      ctx.stroke();

      // Visualizer Bars (32 reactive bars)
      const barCount = 36;
      const barW = 16;
      const startX = -350;
      for (let b = 0; b < barCount; b++) {
        const freq = Math.sin(t * 8 + b * 0.4) * 0.5 + 0.5;
        const bH = (freq * 75 + Math.random() * 20 + bassEnergy * 25);
        const bx = startX + b * 20;
        const by = 175;

        // Gradient from white to bright light
        ctx.fillStyle = b < 10 ? '#ffffff' : (b < 24 ? '#d8d8e0' : '#8c8c9a');
        ctx.beginPath();
        ctx.roundRect(bx, by - bH, barW, bH, 4);
        ctx.fill();
      }

      // Telemetry row
      ctx.textAlign = 'left';
      ctx.fillStyle = '#777780';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillText(`BASS PEAK: +${(bassEnergy * 6 + 1.2).toFixed(1)} dB`, -380, 220);
      ctx.fillText('OUTPUT PEAK: 98.4%', -180, 220);
      ctx.fillText('AUDIO STREAM: 48kHz OPUS', 20, 220);
      ctx.fillText('LATENCY: 8ms', 280, 220);

      ctx.restore();
    }

  } else if (t < 19.0) {
    // -------------------------------------------------------------
    // SCENE 4: STUDIO SOUND TUNING & EQ PRESETS (14.5s - 19.0s)
    // -------------------------------------------------------------
    drawHeaderBrand(ctx, 'Feature 03: Studio Sound Tuning & EQ Presets');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px "Segoe UI", sans-serif';
    ctx.fillText('STUDIO SOUND TUNING (DSP EQ)', WIDTH / 2, 170);
    ctx.fillStyle = '#888888';
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText('Instant hardware-accelerated sound shaping presets with zero latency', WIDTH / 2, 210);
    ctx.restore();

    // 3D Card for EQ
    draw3DCard(ctx, 0, 70, 0, 880, 560, 0.1, 0, 0, {
      bg: 'rgba(14, 14, 18, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.3)'
    });

    const pEQ = project3D(0, 70, 0, 0.1, 0, 0);
    if (pEQ) {
      ctx.save();
      ctx.translate(pEQ.x, pEQ.y);
      ctx.scale(pEQ.scale, pEQ.scale);

      // EQ Frequency Response Curve Visualizer
      ctx.fillStyle = '#060609';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(-400, -230, 800, 240, 16);
      ctx.fill();
      ctx.stroke();

      // Dynamic curve
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = -380; x <= 380; x += 10) {
        const normX = (x + 380) / 760; // 0 to 1
        // Bass boost curve in action!
        const bassCurve = Math.exp(-normX * 5) * 60 * (1 + bassEnergy * 0.4);
        const midDip = Math.sin(normX * Math.PI) * 15;
        const trebleRise = Math.pow(normX, 3) * 35;
        const curveY = -110 - bassCurve + midDip - trebleRise;
        if (x === -380) ctx.moveTo(x, curveY);
        else ctx.lineTo(x, curveY);
      }
      ctx.stroke();

      // Frequency Grid Marks
      ctx.fillStyle = '#555560';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ['32Hz', '64Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'].forEach((hz, idx) => {
        const hx = -360 + idx * 80;
        ctx.fillText(hz, hx, -15);
      });

      // 4 Interactive EQ Pills
      const eqPills = [
        { label: 'Natural Studio', desc: 'Flat reference curve' },
        { label: 'Bass Boost', desc: '+6dB Sub-Bass Punch', active: true },
        { label: 'Vokal Jernih', desc: 'Crisp vocal presence' },
        { label: 'Treble Bright', desc: 'Sparkle & air highs' }
      ];

      eqPills.forEach((pill, idx) => {
        const px = -300 + idx * 200;
        const py = 120;
        const isAct = pill.active;

        ctx.fillStyle = isAct ? '#ffffff' : 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = isAct ? '#ffffff' : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(px - 90, py - 40, 180, 80, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isAct ? '#000000' : '#ffffff';
        ctx.font = 'bold 16px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pill.label, px, py - 8);

        ctx.fillStyle = isAct ? '#333333' : '#888890';
        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.fillText(pill.desc, px, py + 18);

        if (isAct) {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(px, py + 30, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();
    }

  } else if (t < 23.0) {
    // -------------------------------------------------------------
    // SCENE 5: SYNCHRONIZED STUDIO LYRICS (19.0s - 23.0s)
    // -------------------------------------------------------------
    drawHeaderBrand(ctx, 'Feature 04: Real-time Synchronized Studio Lyrics');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px "Segoe UI", sans-serif';
    ctx.fillText('SYNCHRONIZED STUDIO LYRICS', WIDTH / 2, 170);
    ctx.fillStyle = '#888888';
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText('Precision LRCLIB integration with 220ms vocal lead compensation', WIDTH / 2, 210);
    ctx.restore();

    // 3D Glass Lyrics Panel
    draw3DCard(ctx, 0, 70, 0, 880, 560, 0.1, -0.06, 0, {
      bg: 'rgba(12, 12, 16, 0.96)',
      borderColor: 'rgba(255, 255, 255, 0.28)'
    });

    const pLyr = project3D(0, 70, 0, 0.1, -0.06, 0);
    if (pLyr) {
      ctx.save();
      ctx.translate(pLyr.x, pLyr.y);
      ctx.scale(pLyr.scale, pLyr.scale);
      ctx.textAlign = 'center';

      // Badge
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-140, -220, 280, 30, 15);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillText('220MS VOCAL LEAD COMPENSATED', 0, -200);

      // Lyrics Lines
      const lines = [
        { text: "I'm tryna put you in the worst mood, ah", status: 'past' },
        { text: "P1 cleaner than your church shoes, ah", status: 'active' },
        { text: "Milli point two just to hurt you, ah", status: 'next' },
        { text: "All red Lamb' just to tease you, ah", status: 'next' }
      ];

      lines.forEach((l, idx) => {
        const ly = -100 + idx * 90;
        if (l.status === 'past') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.font = '24px "Segoe UI", sans-serif';
          ctx.fillText(l.text, 0, ly);
        } else if (l.status === 'active') {
          // Highlight active line
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.beginPath();
          ctx.roundRect(-360, ly - 40, 720, 70, 16);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 36px "Segoe UI", sans-serif';
          ctx.fillText(l.text, 0, ly + 8);

          // Audio lead indicator dot
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-320, ly + 4, 6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.font = '24px "Segoe UI", sans-serif';
          ctx.fillText(l.text, 0, ly);
        }
      });

      ctx.restore();
    }

  } else if (t < 27.0) {
    // -------------------------------------------------------------
    // SCENE 6: MOBILE RESPONSIVE 3D SMARTPHONE (23.0s - 27.0s)
    // -------------------------------------------------------------
    drawHeaderBrand(ctx, 'Feature 05: Mobile Responsive & Bottom Sheet Drawer');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px "Segoe UI", sans-serif';
    ctx.fillText('TOUCH-FIRST MOBILE ARCHITECTURE', WIDTH / 2, 170);
    ctx.fillStyle = '#888888';
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText('Native-app feel with slide-up bottom sheet drawer and full touch controls', WIDTH / 2, 210);
    ctx.restore();

    // 3D Smartphone Device Mockup
    const phoneRotY = Math.sin(t * 0.8) * 0.18;
    const phoneRotX = 0.08;

    // Outer Phone Body
    draw3DCard(ctx, 0, 70, 0, 340, 620, phoneRotX, phoneRotY, 0, {
      bg: '#050508',
      borderColor: 'rgba(255, 255, 255, 0.45)',
      borderWidth: 2.5
    });

    const pPhone = project3D(0, 70, 0, phoneRotX, phoneRotY, 0);
    if (pPhone) {
      ctx.save();
      ctx.translate(pPhone.x, pPhone.y);
      ctx.scale(pPhone.scale, pPhone.scale);

      // Dynamic Island / Top Camera
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.roundRect(-45, -285, 90, 24, 12);
      ctx.fill();

      // Screen UI Content: Mobile Bottom Sheet Sliding Up
      const sheetProgress = Math.min(1, Math.max(0, (t - 23.5) / 1.0));
      const sheetY = 280 - sheetProgress * 360;

      // Bottom Sheet Glass Drawer
      ctx.fillStyle = 'rgba(20, 20, 28, 0.96)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-155, sheetY, 310, 360, 20);
      ctx.fill();
      ctx.stroke();

      // Drag Handle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.roundRect(-24, sheetY + 12, 48, 4, 2);
      ctx.fill();

      // Drawer Content: Sound Card Preview
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.fillText('Sedang Diputar', 0, sheetY + 45);

      // Mobile Visualizer Mini
      ctx.fillStyle = '#09090f';
      ctx.beginPath();
      ctx.roundRect(-135, sheetY + 65, 270, 70, 10);
      ctx.fill();

      for (let b = 0; b < 18; b++) {
        const bH = (Math.sin(t * 10 + b * 0.5) * 0.5 + 0.5) * 45 + 5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-120 + b * 13, sheetY + 125 - bH, 8, bH, 2);
        ctx.fill();
      }

      // Mobile EQ Pills
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-135, sheetY + 155, 80, 28, 14);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.fillText('Natural', -95, sheetY + 173);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(-45, sheetY + 155, 85, 28, 14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Bass Boost', -2, sheetY + 173);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(48, sheetY + 155, 85, 28, 14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Vokal', 90, sheetY + 173);

      ctx.restore();
    }

  } else {
    // -------------------------------------------------------------
    // SCENE 7: 24/7 CLOUD DEPLOYMENT & OUTRO (27.0s - 30.0s)
    // -------------------------------------------------------------
    drawHeaderBrand(ctx, 'Ready for 24/7 Cloud Deployment');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px "Segoe UI", sans-serif';
    ctx.fillText('AURA MUSIC PLAYER v4.5', WIDTH / 2, 340);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillText('LISTEN ANYWHERE • LAPTOP MATI, WEB TETAP HIDUP 24/7', WIDTH / 2, 400);

    // 3 Cards: Cloud Features
    const cloudFeatures = [
      { title: 'RENDER.COM DEPLOY', sub: 'Runs on Singapore Cloud Data Center 24/7' },
      { title: 'ZERO SUBSCRIPTIONS', sub: 'Free & Open-Source Full Fidelity Audio' },
      { title: 'MULTI-DEVICE SYNC', sub: 'Seamless on Mobile, Tablet & Desktop' }
    ];

    cloudFeatures.forEach((cf, idx) => {
      const cx = WIDTH / 2 - 400 + idx * 400;
      const cy = 540;

      ctx.fillStyle = 'rgba(16, 16, 24, 0.92)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 170, cy - 65, 340, 130, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillText(cf.title, cx, cy - 12);

      ctx.fillStyle = '#9999a4';
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillText(cf.sub, cx, cy + 24);
    });

    // Call to Action
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillText('GET STARTED: GITHUB.COM / RENDER.COM', WIDTH / 2, 740);

    ctx.restore();
  }

  // Draw progress bar at very bottom
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(0, HEIGHT - 6, WIDTH, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, HEIGHT - 6, (frame / TOTAL_FRAMES) * WIDTH, 6);
  ctx.restore();
}

// 4. Render loop & write to ffmpeg stdin
console.log('Rendering 3D video frames and encoding to MP4...');
const startTime = Date.now();

let currentFrame = 0;

function writeNextFrames() {
  let canWrite = true;
  while (currentFrame < TOTAL_FRAMES && canWrite) {
    renderFrame(currentFrame);
    const data = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
    const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    canWrite = ff.stdin.write(buf);
    currentFrame++;

    if (currentFrame % 90 === 0) {
      const pct = ((currentFrame / TOTAL_FRAMES) * 100).toFixed(0);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Rendered frame ${currentFrame}/${TOTAL_FRAMES} (${pct}%) in ${elapsed}s`);
    }
  }

  if (currentFrame < TOTAL_FRAMES) {
    ff.stdin.once('drain', writeNextFrames);
  } else {
    ff.stdin.end();
  }
}

writeNextFrames();

ff.on('close', code => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nFFmpeg process exited with code ${code} in ${elapsed}s`);
  if (fs.existsSync(outputPublic)) {
    fs.copyFileSync(outputPublic, outputRoot);
    const sizeMB = (fs.statSync(outputPublic).size / (1024 * 1024)).toFixed(2);
    console.log(`SUCCESS: Video saved to:`);
    console.log(`- ${outputPublic} (${sizeMB} MB)`);
    console.log(`- ${outputRoot} (${sizeMB} MB)`);
  }
});
