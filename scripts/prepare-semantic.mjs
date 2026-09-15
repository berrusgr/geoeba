import { mkdir, copyFile, access, writeFile, rename, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public/semantic');
const revision = '2c4055b12046f11709e9df2c122e59ffbdc2f900';
const model = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const files = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/model_quantized.onnx'];

if (process.env.GEOEBA_SKIP_SEMANTIC_MODEL === '1') {
  console.log('Anlamsal model indirmesi atlandı (GEOEBA_SKIP_SEMANTIC_MODEL=1).');
  process.exit(0);
}

await mkdir(output, { recursive: true });
try {
  await copyFile(path.join(root, 'node_modules/@huggingface/transformers/LICENSE'), path.join(output, 'TRANSFORMERS-LICENSE.txt'));
} catch {
  // lisans dosyasi eksikse devam et
}

for (const file of ['transformers.web.min.js', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  const source = file === 'transformers.web.min.js' ? 'transformers.min.js' : file;
  try {
    await copyFile(path.join(root, 'node_modules/@huggingface/transformers/dist', source), path.join(output, file));
  } catch {
    // dist dosyasi eksikse devam et
  }
}

try {
  for (const file of files) {
    const target = path.join(output, 'models', revision, file);
    try { await access(target); continue; } catch { /* İndirme yalnızca eksik dosyalar için. */ }
    await mkdir(path.dirname(target), { recursive: true });
    console.log(`Anlamsal model indiriliyor: ${file}`);
    const response = await fetch(`https://huggingface.co/${model}/resolve/${revision}/${file}`, { signal: AbortSignal.timeout(300000) });
    if (!response.ok || !response.body) throw new Error(`${file}: HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(target + '.partial'));
    await rename(target + '.partial', target);
  }
  await writeFile(path.join(output, 'MODEL-SOURCE.json'), JSON.stringify({ model, revision, runtime: '@huggingface/transformers@3.8.1', source: `https://huggingface.co/${model}`, license: 'Apache-2.0' }, null, 2));
  console.log('Yerel anlamsal arama dosyaları hazır.');
} catch (error) {
  for (const file of files) await rm(path.join(output, 'models', revision, `${file}.partial`), { force: true }).catch(() => {});
  console.warn(`Uyarı: anlamsal model indirilemedi (${error instanceof Error ? error.message : error}).`);
}

