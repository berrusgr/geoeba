import { env, pipeline } from './transformers.web.min.js';

const revision = '2c4055b12046f11709e9df2c122e59ffbdc2f900';
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = new URL('./models/', import.meta.url).href;
env.backends.onnx.wasm.wasmPaths = new URL('./', import.meta.url).href;
env.backends.onnx.wasm.numThreads = 1;
let ready;
let pending;
let working = false;

async function initialize() {
  self.postMessage({ type: 'status', status: 'loading' });
  const response = await fetch(new URL('./intents.json', import.meta.url));
  if (!response.ok) throw new Error('Komut dizini bulunamadı.');
  const intents = await response.json();
  const extractor = await pipeline('feature-extraction', revision, { dtype: 'q8', device: 'wasm' });
  const samples = intents.flatMap(intent => intent.phrases.map(text => ({ intent: intent.id, text })));
  const vectors = [];
  // Küçük gruplar ilk yüklemedeki bellek ihtiyacını sınırlar.
  for (let i = 0; i < samples.length; i += 4) {
    const output = await extractor(samples.slice(i, i + 4).map(s => s.text), { pooling: 'mean', normalize: true });
    vectors.push(...output.tolist());
  }
  self.postMessage({ type: 'status', status: 'ready' });
  return { extractor, samples, vectors };
}

async function drain() {
  if (working) return;
  working = true;
  try {
    const { extractor, samples, vectors } = await (ready ??= initialize());
    while (pending) {
      const { id, text } = pending;
      pending = null;
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      const query = output.tolist()[0];
      const best = new Map();
      vectors.forEach((vector, index) => {
        const score = vector.reduce((sum, v, j) => sum + v * query[j], 0);
        const intent = samples[index].intent;
        if (score > (best.get(intent) ?? -1)) best.set(intent, score);
      });
      const matches = [...best].map(([intent, score]) => ({ intent, score })).sort((a, b) => b.score - a.score);
      self.postMessage({ type: 'results', id, text, matches });
    }
  } catch {
    pending = null;
    ready = undefined;
    self.postMessage({ type: 'status', status: 'error' });
  } finally { working = false; }
}

self.onmessage = ({ data }) => {
  if (data.type === 'query') pending = { id: data.id, text: data.text };
  if (data.type === 'init' || data.type === 'query') void drain();
};
