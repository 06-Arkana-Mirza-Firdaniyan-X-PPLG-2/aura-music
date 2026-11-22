import fs from 'fs';

// Synthesizes a 30-second electronic/synthwave soundtrack
export function generateSoundtrackWav(outputPath) {
  const sampleRate = 44100;
  const duration = 30; // seconds
  const totalSamples = sampleRate * duration;
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // Write WAV Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat (PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const bpm = 124;
  const beatSec = 60 / bpm; // ~0.4838s

  // Musical notes in Hz
  const C2 = 65.41, Eb2 = 77.78, F2 = 87.31, G2 = 97.99, Bb2 = 116.54;
  const C3 = 130.81, Eb3 = 155.56, G3 = 196.00, Bb3 = 233.08;
  const C4 = 261.63, Eb4 = 311.13, F4 = 349.23, G4 = 392.00, Bb4 = 466.16, C5 = 523.25;

  const bassNotes = [C2, C2, Eb2, F2, G2, G2, Bb2, G2];
  const arpNotes = [C4, Eb4, G4, Bb4, C5, Bb4, G4, Eb4];

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beat = t / beatSec;
    const beatFract = beat % 1.0;
    const bar = Math.floor(beat / 4);

    let left = 0;
    let right = 0;

    // Master volume fade-in and fade-out
    let masterEnv = 1.0;
    if (t < 0.5) masterEnv = t / 0.5;
    if (t > 28.5) masterEnv = Math.max(0, (30 - t) / 1.5);

    // 1. Kick Drum (active from t=4s to 26s, plus accents at t=1.0s and t=3.0s)
    let kick = 0;
    const isKickTime = (t >= 4.0 && t < 26.5) || (t >= 1.0 && t < 1.4) || (t >= 3.0 && t < 3.4);
    if (isKickTime) {
      const kFract = (t >= 4.0) ? beatFract : (t - Math.floor(t));
      if (kFract < 0.25) {
        const kt = kFract / 0.25;
        const kickFreq = 140 * Math.exp(-kt * 18) + 42;
        kick = Math.sin(2 * Math.PI * kickFreq * kt * 0.25) * Math.exp(-kt * 6) * 0.9;
      }
    }

    // 2. Snare / Clap (on beats 2 & 4, active from t=4s to 26.5s)
    let snare = 0;
    if (t >= 4.0 && t < 26.5) {
      const beatInBar = beat % 4.0;
      const isSnareBeat = (beatInBar >= 1.0 && beatInBar < 1.3) || (beatInBar >= 3.0 && beatInBar < 3.3);
      if (isSnareBeat) {
        const sFract = (beatInBar >= 3.0) ? (beatInBar - 3.0) : (beatInBar - 1.0);
        const noise = (Math.random() * 2 - 1) * Math.exp(-sFract * 12);
        const tone = Math.sin(2 * Math.PI * 185 * sFract * beatSec) * Math.exp(-sFract * 16) * 0.6;
        snare = (noise * 0.5 + tone) * 0.6;
      }
    }

    // 3. Hi-Hats (16th notes from t=4s to 26.5s)
    let hihat = 0;
    if (t >= 4.0 && t < 26.5) {
      const sixteenth = (beat * 4) % 1.0;
      if (sixteenth < 0.2) {
        const hEnv = Math.exp(-sixteenth * 28);
        hihat = (Math.random() * 2 - 1) * hEnv * 0.25;
      }
    }

    // 4. Synth Bass (Rolling 16th note acid/electro bass)
    let bass = 0;
    if (t >= 4.0 && t < 27.0) {
      const sixteenthIndex = Math.floor(beat * 4);
      const noteIndex = Math.floor(beat) % bassNotes.length;
      const currentNote = bassNotes[noteIndex];
      const sFract = (beat * 4) % 1.0;
      const bEnv = Math.exp(-sFract * 7);

      // Filter cutoff modulation based on section
      let filterCut = 3.0;
      if (t >= 15.0 && t < 19.0) filterCut = 6.0 + 3.0 * Math.sin(t * 3); // EQ section sweep!

      const phase = 2 * Math.PI * currentNote * t;
      const saw = ((phase % (2 * Math.PI)) / Math.PI - 1);
      const sub = Math.sin(2 * Math.PI * (currentNote / 2) * t);
      bass = (saw * filterCut * 0.15 + sub * 0.5) * bEnv * 0.55;
    }

    // 5. Arpeggio Synth (High-tech cyber melodic lead)
    let arpL = 0, arpR = 0;
    if (t < 28.0) {
      const arpIdx = Math.floor(beat * 4) % arpNotes.length;
      const arpFreq = arpNotes[arpIdx];
      const aFract = (beat * 4) % 1.0;
      const aEnv = Math.exp(-aFract * 6);
      const tone = Math.sin(2 * Math.PI * arpFreq * t) + 0.3 * Math.sin(4 * Math.PI * arpFreq * t);
      const pan = Math.sin(t * 2);
      arpL = tone * aEnv * (0.5 - pan * 0.3) * 0.35;
      arpR = tone * aEnv * (0.5 + pan * 0.3) * 0.35;
    }

    // 6. Sub-Drop & Ambient Chords
    let pad = 0;
    const padChord = [C3, Eb3, G3, Bb3];
    for (const freq of padChord) {
      pad += Math.sin(2 * Math.PI * freq * t) * 0.05;
    }

    // Riser / White noise sweep into drops
    let sweep = 0;
    if (t >= 2.5 && t < 4.0) {
      const swT = (t - 2.5) / 1.5;
      sweep = (Math.random() * 2 - 1) * Math.pow(swT, 3) * 0.35;
    } else if (t >= 19.5 && t < 21.0) {
      const swT = (t - 19.5) / 1.5;
      sweep = (Math.random() * 2 - 1) * Math.pow(swT, 3) * 0.4;
    }

    // Mixdown
    left = (kick + snare + hihat + bass + arpL + pad + sweep) * masterEnv;
    right = (kick + snare + hihat + bass + arpR + pad + sweep) * masterEnv;

    // Soft clip / limiter
    left = Math.tanh(left * 1.1);
    right = Math.tanh(right * 1.1);

    // Convert to 16-bit integer
    const sampleL = Math.max(-32768, Math.min(32767, Math.floor(left * 32767)));
    const sampleR = Math.max(-32768, Math.min(32767, Math.floor(right * 32767)));

    buffer.writeInt16LE(sampleL, offset);
    buffer.writeInt16LE(sampleR, offset + 2);
    offset += 4;
  }

  fs.writeFileSync(outputPath, buffer);
  console.log(`Audio soundtrack written to ${outputPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

if (process.argv[1]?.endsWith('generate_audio.js')) {
  generateSoundtrackWav('./preview_audio.wav');
}
