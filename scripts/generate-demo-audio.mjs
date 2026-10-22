// Original, deterministic synthesized sounds for interface demonstration only.
// They are not validated emotion stimuli and carry no reference emotion labels.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const output = fileURLToPath(new URL('../public/audio/', import.meta.url));
const sampleRate = 22050;
const definitions = [
  ['tone-steps', 12, t => Math.sin(2 * Math.PI * [220, 277.18, 329.63, 261.63][Math.floor(t / 3) % 4] * t) * Math.sin(Math.PI * (t % 3) / 3) ** 2],
  ['soft-pulses', 15, t => Math.sin(2 * Math.PI * 196 * t) * (.5 + .5 * Math.sin(2 * Math.PI * 1.4 * t)) ** 4],
  ['layered-tones', 18, t => (Math.sin(2 * Math.PI * 174.61 * t) + .55 * Math.sin(2 * Math.PI * 261.63 * t) + .3 * Math.sin(2 * Math.PI * 349.23 * t)) / 1.85 * (.6 + .4 * Math.sin(2 * Math.PI * .14 * t))],
];
await mkdir(output, { recursive: true });
for (const [name, duration, signal] of definitions) {
  const frames = sampleRate * duration;
  const wav = Buffer.alloc(44 + frames * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;
    const fade = Math.min(1, t / .08, (duration - t) / .12);
    wav.writeInt16LE(Math.round(signal(t) * fade * .22 * 32767), 44 + i * 2);
  }
  await writeFile(`${output}${name}.wav`, wav);
  console.log(`${name}.wav: ${duration}s, ${wav.length} bytes`);
}
