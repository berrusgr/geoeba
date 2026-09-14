/** Mikrofon kaydı için saf yardımcılar (tarayıcı API'si gerektirmez, sınanabilir). */

export const WHISPER_SAMPLE_RATE = 16000;

export function mergeChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  return merged;
}

/** Doğrusal aralama ile örnekleme hızını değiştirir (ör. 48000 → 16000). Aşağı örneklemede kısa ortalama alınır. */
export function resample(input: Float32Array, fromRate: number, toRate = WHISPER_SAMPLE_RATE): Float32Array {
  if (!(fromRate > 0) || !(toRate > 0)) throw new Error('Örnekleme hızı pozitif olmalı.');
  if (fromRate === toRate) return input.slice();
  const ratio = fromRate / toRate;
  const length = Math.max(0, Math.floor(input.length / ratio));
  const output = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const position = i * ratio;
    if (ratio > 1) {
      const start = Math.floor(position), end = Math.min(input.length, Math.floor(position + ratio));
      let sum = 0;
      for (let j = start; j < end; j++) sum += input[j];
      output[i] = end > start ? sum / (end - start) : input[start] ?? 0;
    } else {
      const left = Math.floor(position), right = Math.min(input.length - 1, left + 1), t = position - left;
      output[i] = input[left] * (1 - t) + input[right] * t;
    }
  }
  return output;
}

export function rms(frame: Float32Array): number {
  if (!frame.length) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

/**
 * Konuşmanın bittiğini anlamak için sessizlik algılayıcı.
 * Ortam gürültüsü ilk karelerden öğrenilir; konuşma başladıktan sonra silenceMs boyunca eşiğin altında kalınırsa "bitti" döner.
 */
export function createSilenceDetector(o: { silenceMs?: number; maxMs?: number; minSpeechMs?: number; noSpeechMs?: number } = {}) {
  const silenceMs = o.silenceMs ?? 1300, maxMs = o.maxMs ?? 15000, minSpeechMs = o.minSpeechMs ?? 250, noSpeechMs = o.noSpeechMs ?? 7000;
  let elapsed = 0, speech = 0, quiet = 0, noise = 0.004, calibrated = 0;
  return {
    /** Bir ses karesini işler. Dönen değer: 'continue' | 'done' (konuşma bitti) | 'timeout' (hiç konuşma yok) */
    push(level: number, durationMs: number): 'continue' | 'done' | 'timeout' {
      elapsed += durationMs;
      if (calibrated < 300) { noise = calibrated === 0 ? level : noise * 0.8 + level * 0.2; calibrated += durationMs; }
      const threshold = Math.max(0.012, noise * 3);
      if (level > threshold) { speech += durationMs; quiet = 0; } else if (speech > 0) quiet += durationMs;
      if (elapsed >= maxMs) return speech >= minSpeechMs ? 'done' : 'timeout';
      if (speech >= minSpeechMs && quiet >= silenceMs) return 'done';
      if (speech < minSpeechMs && elapsed >= noSpeechMs) return 'timeout';
      return 'continue';
    },
    get heardSpeech() { return speech >= minSpeechMs; },
  };
}
