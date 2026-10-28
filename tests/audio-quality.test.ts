import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultAudioLibrary } from '../lib/audio-library.ts';

const ffmpegAvailable = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

test('decoded examples contain a full minute of audio without blank starts or silent tails', {
  skip: ffmpegAvailable ? false : 'Install FFmpeg to run the bundled-audio signal regression check.',
}, () => {
  for (const clip of defaultAudioLibrary.clips) {
    const decoded = spawnSync('ffmpeg', [
      '-v', 'error', '-i', fileURLToPath(new URL(`../public${clip.url}`, import.meta.url)),
      '-f', 'f32le', '-ac', '1', '-ar', '16000', '-',
    ], { maxBuffer: 8 * 1024 * 1024 });
    assert.equal(decoded.status, 0, `${clip.id}: decode failed: ${decoded.stderr}`);
    const sampleCount = decoded.stdout.length / 4;
    assert.ok(Math.abs(sampleCount / 16000 - 60) < .05, `${clip.id}: actual duration must be 60 seconds`);
    const windows: boolean[] = [];
    for (let offset = 0; offset + 320 <= sampleCount; offset += 320) {
      let power = 0;
      for (let index = offset; index < offset + 320; index++) power += decoded.stdout.readFloatLE(index * 4) ** 2;
      windows.push(Math.sqrt(power / 320) >= .01); // 20 ms RMS windows, −40 dBFS.
    }
    const leadingQuiet = windows.findIndex(Boolean) * .02;
    const trailingQuiet = [...windows].reverse().findIndex(Boolean) * .02;
    assert.ok(leadingQuiet >= 0 && leadingQuiet <= .2, `${clip.id}: blank opening ${leadingQuiet}s`);
    assert.ok(trailingQuiet >= 0 && trailingQuiet <= 1, `${clip.id}: silent ending ${trailingQuiet}s`);
    let run = 0, longest = 0;
    for (const audible of windows) { run = audible ? 0 : run + 1; longest = Math.max(longest, run); }
    assert.ok(longest * .02 < 3, `${clip.id}: continuous silence ${longest * .02}s`);
    for (let index = 0; index < 6; index++) {
      const section = windows.slice(index * 500, (index + 1) * 500);
      assert.ok(section.filter(Boolean).length / section.length >= .35, `${clip.id}: mostly blank during seconds ${index * 10}–${index * 10 + 10}`);
    }
    console.log(`${clip.id}: leading ${leadingQuiet.toFixed(2)}s, trailing ${trailingQuiet.toFixed(2)}s, longest quiet ${(longest * .02).toFixed(2)}s`);
  }
});
