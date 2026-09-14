import { describe, expect, it } from 'vitest';
import { createSilenceDetector, mergeChunks, resample, rms } from '../audio';

describe('audio helpers', () => {
  it('merges chunks in order', () => {
    expect([...mergeChunks([new Float32Array([1, 2]), new Float32Array([3])])]).toEqual([1, 2, 3]);
  });
  it('resamples 48 kHz to 16 kHz preserving a low tone', () => {
    const input = Float32Array.from({ length: 48000 }, (_, i) => Math.sin(2 * Math.PI * 220 * i / 48000));
    const output = resample(input, 48000, 16000);
    expect(output.length).toBe(16000);
    for (const i of [100, 5000, 12345]) expect(output[i]).toBeCloseTo(Math.sin(2 * Math.PI * 220 * (i * 3 + 1) / 48000), 1);
  });
  it('upsamples by interpolation and rejects invalid rates', () => {
    expect([...resample(new Float32Array([0, 1]), 8000, 16000)]).toEqual([0, 0.5, 1, 1]);
    expect(() => resample(new Float32Array(4), 0)).toThrow();
  });
  it('computes RMS', () => {
    expect(rms(new Float32Array([0.5, -0.5]))).toBeCloseTo(0.5);
    expect(rms(new Float32Array())).toBe(0);
  });
  it('ends after speech followed by silence and times out without speech', () => {
    const d = createSilenceDetector({ silenceMs: 500 });
    for (let t = 0; t < 400; t += 100) expect(d.push(0.002, 100)).toBe('continue');
    for (let t = 0; t < 600; t += 100) expect(d.push(0.2, 100)).toBe('continue');
    let result = 'continue';
    for (let t = 0; t < 600 && result === 'continue'; t += 100) result = d.push(0.002, 100);
    expect(result).toBe('done');
    const quiet = createSilenceDetector({ noSpeechMs: 1000 });
    let r = 'continue';
    for (let t = 0; t < 1200 && r === 'continue'; t += 100) r = quiet.push(0.001, 100);
    expect(r).toBe('timeout');
  });
});
