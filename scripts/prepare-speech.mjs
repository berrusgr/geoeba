import { mkdir, access, writeFile, rename, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Çevrimdışı konuşma tanıma (Whisper base, sabit sürüm) dosyalarını public/speech/ altına hazırlar.
 * Model yalnızca eksikse indirilir. İnternet yoksa uyarı verir ve devam eder: tarayıcının kendi ses tanıması
 * yine çalışır, yalnızca "çevrimdışı" yedek kullanılamaz. GEOEBA_SKIP_SPEECH_MODEL=1 indirmeyi atlar.
 */
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public/speech');
const model = 'onnx-community/whisper-base';
const revision = '1846881b6b3a3024392c1eea3ad983695bc23925';
const files = [
  'config.json', 'generation_config.json', 'preprocessor_config.json', 'tokenizer.json', 'tokenizer_config.json',
  'special_tokens_map.json', 'added_tokens.json', 'normalizer.json', 'vocab.json',
  'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx',
];

if (process.env.GEOEBA_SKIP_SPEECH_MODEL === '1') {
  console.log('Çevrimdışı konuşma modeli atlandı (GEOEBA_SKIP_SPEECH_MODEL=1).');
  process.exit(0);
}

await mkdir(output, { recursive: true });
try {
  for (const file of files) {
    const target = path.join(output, 'models', revision, file);
    try { await access(target); continue; } catch { /* yalnızca eksik dosyalar indirilir */ }
    await mkdir(path.dirname(target), { recursive: true });
    console.log(`Konuşma modeli indiriliyor: ${file}`);
    const response = await fetch(`https://huggingface.co/${model}/resolve/${revision}/${file}`, { signal: AbortSignal.timeout(600000) });
    if (!response.ok || !response.body) throw new Error(`${file}: HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(`${target}.partial`));
    await rename(`${target}.partial`, target);
  }
  await writeFile(path.join(output, 'MODEL-SOURCE.json'), JSON.stringify({
    model, revision, runtime: '@huggingface/transformers@3.8.1 (public/semantic)', source: `https://huggingface.co/${model}`,
    license: 'MIT (OpenAI Whisper)', files,
  }, null, 2));
  console.log('Çevrimdışı konuşma tanıma dosyaları hazır.');
} catch (error) {
  for (const file of files) await rm(path.join(output, 'models', revision, `${file}.partial`), { force: true });
  console.warn(`Uyarı: çevrimdışı konuşma modeli indirilemedi (${error instanceof Error ? error.message : error}). Tarayıcı ses tanıması kullanılabilir.`);
}
