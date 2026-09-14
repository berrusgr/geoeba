import { env, pipeline } from '../semantic/transformers.web.min.js';

// Whisper base (sabit sürüm) — model dosyaları scripts/prepare-speech.mjs ile yerel sunucuya konur; ses dışarı gönderilmez.
const revision = '1846881b6b3a3024392c1eea3ad983695bc23925';
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = new URL('./models/', import.meta.url).href;
env.backends.onnx.wasm.wasmPaths = new URL('../semantic/', import.meta.url).href;
env.backends.onnx.wasm.numThreads = 1;

let ready;

function initialize() {
  self.postMessage({ type: 'status', status: 'loading' });
  return pipeline('automatic-speech-recognition', revision, {
    dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    device: 'wasm',
    progress_callback: progress => {
      if (progress.status === 'progress') self.postMessage({ type: 'progress', file: progress.file, loaded: progress.loaded, total: progress.total });
    },
  }).then(transcriber => {
    self.postMessage({ type: 'status', status: 'ready' });
    return transcriber;
  });
}

self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try { await (ready ??= initialize()); }
    catch (error) { ready = undefined; self.postMessage({ type: 'status', status: 'error', message: String(error?.message ?? error) }); }
    return;
  }
  if (data.type !== 'transcribe') return;
  try {
    const transcriber = await (ready ??= initialize());
    const output = await transcriber(data.audio, { language: 'turkish', task: 'transcribe', chunk_length_s: 30, return_timestamps: false });
    self.postMessage({ type: 'result', id: data.id, text: String(output?.text ?? '').trim() });
  } catch (error) {
    ready = undefined;
    self.postMessage({ type: 'error', id: data.id, message: String(error?.message ?? error) });
  }
};
