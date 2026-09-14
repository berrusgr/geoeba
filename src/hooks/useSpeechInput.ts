'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createSilenceDetector, mergeChunks, resample, rms, WHISPER_SAMPLE_RATE } from '@/utils/audio';

/**
 * Mikrofondan Türkçe konuşmayı SÜREKLİ dinleyip her cümleyi ayrı ayrı metne çevirir.
 * start() ile açılır, stop() çağrılana kadar açık kalır; her tamamlanan cümle onResult ile bildirilir.
 *
 * - 'auto'   : tarayıcının ses tanıması varsa onu kullanır (cihaz üstü destekleniyorsa önce o, yoksa tarayıcının
 *              çevrimiçi hizmeti). İnternet yoksa, tarayıcı desteklemiyorsa ya da hizmet hata verirse çevrimdışı
 *              Whisper modeline geçer.
 * - 'offline': ses bilgisayardan çıkmaz. Tarayıcının cihaz üstü tanıması hazırsa o, değilse Whisper kullanılır.
 */
export type SpeechMode = 'auto' | 'offline';
export type SpeechEngine = 'browser' | 'device' | 'whisper';
export type SpeechStatus = 'idle' | 'starting' | 'listening' | 'transcribing' | 'error';
export interface SpeechState {
  status: SpeechStatus;
  engine?: SpeechEngine;
  /** O an söylenmekte olan (henüz bitmemiş) cümle */
  interim: string;
  /** 0–1 ses düzeyi (dalga göstergesi için) */
  level: number;
  error?: string;
  /** Çevrimdışı model indirme ilerlemesi (0–1) */
  progress?: number;
  /** Çevrilmeyi bekleyen cümle sayısı (çevrimdışı model) */
  pending: number;
}

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; length: number; [index: number]: RecognitionAlternative };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
interface BrowserRecognition {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number; processLocally?: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
interface RecognitionConstructor {
  new(): BrowserRecognition;
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
}

const LANG = 'tr-TR';
const MODE_KEY = 'geoeba_ses_tanima_modu_v1';
const IDLE: SpeechState = { status: 'idle', interim: '', level: 0, pending: 0 };

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function loadSpeechMode(): SpeechMode {
  try { return localStorage.getItem(MODE_KEY) === 'offline' ? 'offline' : 'auto'; } catch { return 'auto'; }
}
export function saveSpeechMode(mode: SpeechMode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* depolama kapalıysa yalnızca bu oturum için geçerli */ }
}

const ERROR_TEXT: Record<string, string> = {
  'not-allowed': 'Mikrofon izni verilmedi. Adres çubuğundaki mikrofon simgesinden izin verin.',
  'service-not-allowed': 'Tarayıcı ses tanıma hizmetine izin vermedi.',
  'audio-capture': 'Mikrofon bulunamadı.',
};

/** onResult: en olası metin, kullanılan yöntem ve (tarayıcı verirse) diğer olası metinler, olasılık sırasıyla. */
export function useSpeechInput({ onResult, mode }: { onResult: (text: string, engine: SpeechEngine, alternatives?: string[]) => void; mode: SpeechMode }) {
  const [state, setState] = useState<SpeechState>(IDLE);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const recognition = useRef<BrowserRecognition | null>(null);
  const capture = useRef<{ stop: (flush: boolean) => void } | null>(null);
  const worker = useRef<Worker | null>(null);
  const active = useRef(false);
  const session = useRef(0);
  const pending = useRef(new Set<number>());
  const nextRequest = useRef(0);

  const supported = typeof window !== 'undefined' && (!!recognitionConstructor() || (!!navigator.mediaDevices?.getUserMedia && typeof Worker !== 'undefined'));

  const settle = useCallback(() => {
    if (active.current) return;
    setState(s => pending.current.size ? { ...s, status: 'transcribing', level: 0, interim: '', pending: pending.current.size } : { ...IDLE, engine: s.engine });
  }, []);

  const fail = useCallback((message: string, engine?: SpeechEngine) => {
    active.current = false;
    session.current += 1;
    recognition.current?.abort();
    recognition.current = null;
    capture.current?.stop(false);
    setState({ ...IDLE, status: 'error', engine, error: message, pending: pending.current.size });
  }, []);

  const whisperWorker = useCallback(() => {
    if (!worker.current) {
      const instance = new Worker(`${process.env.NEXT_PUBLIC_ASSET_PREFIX ?? ''}/speech/worker.js`, { type: 'module' });
      instance.onmessage = ({ data }) => {
        if (data.type === 'progress' && data.total) setState(s => ({ ...s, progress: data.loaded / data.total }));
        if (data.type === 'status' && data.status === 'ready') setState(s => ({ ...s, progress: undefined }));
        if (data.type === 'status' && data.status === 'error') fail('Çevrimdışı konuşma modeli açılamadı. Model dosyaları hazırlanmamış olabilir (npm run speech:prepare).', 'whisper');
        if ((data.type === 'result' || data.type === 'error') && pending.current.has(data.id)) {
          pending.current.delete(data.id);
          setState(s => ({ ...s, pending: pending.current.size }));
          if (data.type === 'result' && data.text) onResultRef.current(data.text, 'whisper');
          if (data.type === 'error') setState(s => ({ ...s, error: `Bir cümle çevrilemedi: ${data.message}` }));
          settle();
        }
      };
      instance.onerror = () => fail('Çevrimdışı konuşma modeli yüklenemedi.', 'whisper');
      worker.current = instance;
    }
    return worker.current;
  }, [fail, settle]);

  /** Çevrimdışı yol: mikrofon açık kalır; her konuşma + sessizlik bir cümle olarak çevrilir. */
  const startWhisper = useCallback(async (notice?: string) => {
    const mySession = session.current;
    if (!navigator.mediaDevices?.getUserMedia) { fail('Bu tarayıcı mikrofon kaydını desteklemiyor.'); return; }
    setState(s => ({ ...s, status: 'starting', interim: notice ?? '', level: 0, engine: 'whisper', error: undefined }));
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch (error) {
      fail(error instanceof DOMException && error.name === 'NotAllowedError' ? ERROR_TEXT['not-allowed'] : ERROR_TEXT['audio-capture'], 'whisper');
      return;
    }
    if (!active.current || mySession !== session.current) { stream.getTracks().forEach(t => t.stop()); return; }
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioCtx();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    let chunks: Float32Array[] = [];
    let detector = createSilenceDetector({ noSpeechMs: Number.POSITIVE_INFINITY, maxMs: 20000 });
    whisperWorker().postMessage({ type: 'init' });

    const flush = () => {
      if (detector.heardSpeech && chunks.length) {
        const audio = resample(mergeChunks(chunks), context.sampleRate, WHISPER_SAMPLE_RATE);
        const id = ++nextRequest.current;
        pending.current.add(id);
        setState(s => ({ ...s, pending: pending.current.size }));
        whisperWorker().postMessage({ type: 'transcribe', id, audio }, [audio.buffer]);
      }
      chunks = [];
      detector = createSilenceDetector({ noSpeechMs: Number.POSITIVE_INFINITY, maxMs: 20000 });
    };
    let stopped = false;
    const stop = (deliver: boolean) => {
      if (stopped) return;
      stopped = true;
      if (deliver) flush();
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach(t => t.stop());
      void context.close();
      if (capture.current?.stop === stop) capture.current = null;
      settle();
    };
    processor.onaudioprocess = event => {
      const frame = new Float32Array(event.inputBuffer.getChannelData(0));
      chunks.push(frame);
      const level = rms(frame);
      const frameMs = (frame.length / context.sampleRate) * 1000;
      setState(s => (s.status === 'listening' || s.status === 'starting') ? { ...s, status: 'listening', level: Math.min(1, level * 8) } : s);
      const verdict = detector.push(level, frameMs);
      if (verdict === 'done') flush();
      else if (!detector.heardSpeech) {
        // Konuşma yokken belleği büyütme: cümle başı kesilmesin diye yalnızca son ~0,6 sn tutulur.
        const keep = Math.ceil(600 / frameMs);
        if (chunks.length > keep * 2) chunks = chunks.slice(-keep);
        if (verdict === 'timeout') detector = createSilenceDetector({ noSpeechMs: Number.POSITIVE_INFINITY, maxMs: 20000 });
      }
    };
    source.connect(processor);
    processor.connect(context.destination);
    capture.current = { stop };
    setState(s => ({ ...s, status: 'listening', interim: notice ?? '', level: 0, engine: 'whisper' }));
  }, [fail, settle, whisperWorker]);

  /** Tarayıcı yolu: sürekli tanıma; tarayıcı kendiliğinden kapanırsa (sessizlik, süre sınırı) yeniden başlatılır. */
  const startBrowser = useCallback((Ctor: RecognitionConstructor, onDevice: boolean) => {
    const mySession = session.current;
    const engine: SpeechEngine = onDevice ? 'device' : 'browser';
    const rec = new Ctor();
    rec.lang = LANG;
    rec.interimResults = true;
    rec.continuous = true;
    // Birden çok olası metin istenir; motorun anladığı ilki seçilir (speechChoice).
    rec.maxAlternatives = 5;
    if (onDevice) rec.processLocally = true;
    let quickEnds = 0, startedAt = 0, switched = false;
    const begin = () => {
      startedAt = Date.now();
      try { rec.start(); } catch { /* zaten başlamış */ }
    };
    rec.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const alternatives = Array.from({ length: result.length }, (_, k) => result[k]?.transcript?.trim() ?? '').filter(Boolean);
          if (alternatives.length) onResultRef.current(alternatives[0], engine, alternatives);
        } else interim += result[0].transcript;
      }
      quickEnds = 0;
      setState(s => ({ ...s, status: 'listening', interim: interim.trim(), level: interim ? 0.7 : 0.15, error: undefined }));
    };
    rec.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (['network', 'service-not-allowed', 'language-not-supported'].includes(event.error) && active.current) {
        switched = true;
        recognition.current = null;
        void startWhisper('İnternet ses hizmetine ulaşılamadı; çevrimdışı modele geçildi. Konuşmaya devam edin.');
        return;
      }
      fail(ERROR_TEXT[event.error] ?? `Ses tanıma hatası: ${event.error}`, engine);
    };
    rec.onend = () => {
      if (switched || mySession !== session.current) return;
      if (!active.current) { recognition.current = null; settle(); return; }
      // Tarayıcılar sessizlikte ya da ~60 sn sonra tanımayı kapatır: kullanıcı kapatana kadar yeniden aç.
      quickEnds = Date.now() - startedAt < 1000 ? quickEnds + 1 : 0;
      if (quickEnds > 5) { fail('Ses tanıma sürekli kapanıyor. Mikrofon ayarlarını denetleyip tekrar deneyin.', engine); return; }
      begin();
    };
    recognition.current = rec;
    setState({ ...IDLE, status: 'listening', engine, pending: pending.current.size });
    begin();
  }, [fail, settle, startWhisper]);

  const start = useCallback(async () => {
    if (active.current) return;
    active.current = true;
    session.current += 1;
    const mySession = session.current;
    setState(s => ({ ...IDLE, status: 'starting', pending: s.pending }));
    const Ctor = recognitionConstructor();
    let onDevice = false;
    if (Ctor?.available) {
      try { onDevice = (await Ctor.available({ langs: [LANG], processLocally: true })) === 'available'; } catch { onDevice = false; }
    }
    if (!active.current || mySession !== session.current) return;
    if (Ctor && (onDevice || (mode === 'auto' && navigator.onLine !== false))) startBrowser(Ctor, onDevice);
    else await startWhisper();
  }, [mode, startBrowser, startWhisper]);

  /** Dinlemeyi kapatır; o ana kadar söylenen cümle yine çevrilir. */
  const stop = useCallback(() => {
    active.current = false;
    if (recognition.current) { recognition.current.stop(); recognition.current = null; }
    capture.current?.stop(true);
    settle();
  }, [settle]);

  /** Dinlemeyi ve bekleyen çevirileri iptal eder. */
  const cancel = useCallback(() => {
    active.current = false;
    session.current += 1;
    pending.current.clear();
    recognition.current?.abort();
    recognition.current = null;
    capture.current?.stop(false);
    setState(IDLE);
  }, []);

  useEffect(() => () => {
    active.current = false;
    recognition.current?.abort();
    capture.current?.stop(false);
    worker.current?.terminate();
  }, []);

  return { state, start, stop, cancel, supported, active: active.current };
}
