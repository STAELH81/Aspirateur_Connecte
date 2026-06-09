/**
 * Genere assets/sounds/vacuum.wav — bruit aspirateur ~3 s (brown noise + rumble).
 * Relancer si tu changes la duree : node scripts/generate-vacuum-sound.js
 */
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 48_000;
const DURATION_SEC = 3;
const OUT = path.join(__dirname, "..", "assets", "sounds", "vacuum.wav");

function writeWav(pcm16, sampleRate) {
  const dataSize = pcm16.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm16]);
}

function generate() {
  const n = SAMPLE_RATE * DURATION_SEC;
  const pcm = Buffer.alloc(n * 2);
  let brown = 0;

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const white = Math.random() * 2 - 1;
    brown = (brown + white * 0.05) / 1.05;
    const rumble =
      Math.sin((2 * Math.PI * 55 * t)) * 0.12 +
      Math.sin((2 * Math.PI * 110 * t)) * 0.06 +
      Math.sin((2 * Math.PI * 220 * t)) * 0.03;
    const envelope = Math.min(1, t / 0.15, (DURATION_SEC - t) / 0.2);
    let sample = (brown * 2.2 + rumble) * envelope * 0.35;
    sample = Math.max(-1, Math.min(1, sample));
    pcm.writeInt16LE(Math.floor(sample * 32_767 * 0.45), i * 2);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, writeWav(pcm, SAMPLE_RATE));
  console.log(`OK: ${OUT} (${DURATION_SEC}s)`);
}

generate();
