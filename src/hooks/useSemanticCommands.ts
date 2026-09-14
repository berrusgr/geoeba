'use client';

import { useEffect, useRef, useState } from 'react';
import { canSearchMeaning, rankSemanticMatches, SemanticMatch } from '@/math/semanticCommands';

export function useSemanticCommands(text: string, enabled: boolean) {
  const worker = useRef<Worker | null>(null);
  const sequence = useRef(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [result, setResult] = useState<{ text: string; matches: SemanticMatch[] }>({ text: '', matches: [] });
  useEffect(() => {
    if (!enabled || worker.current || status === 'error') return;
    const instance = new Worker(`${process.env.NEXT_PUBLIC_ASSET_PREFIX ?? ''}/semantic/worker.js`, { type: 'module' });
    worker.current = instance;
    instance.onmessage = ({ data }) => {
      if (data.type === 'status') setStatus(data.status);
      if (data.type === 'results' && data.id === sequence.current) setResult({ text: data.text, matches: data.matches });
    };
    instance.onerror = () => setStatus('error');
    instance.postMessage({ type: 'init' });
  }, [enabled, status]);
  useEffect(() => {
    const id = ++sequence.current;
    if (!enabled || !canSearchMeaning(text)) return;
    const timer = setTimeout(() => worker.current?.postMessage({ type: 'query', id, text }), 350);
    return () => clearTimeout(timer);
  }, [text, enabled]);
  useEffect(() => () => { worker.current?.terminate(); worker.current = null; }, []);
  return { status, matches: result.text === text && canSearchMeaning(text) ? rankSemanticMatches(text, result.matches) : [] };
}
