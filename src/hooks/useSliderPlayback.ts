'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SliderObject } from '@/types/math';

/** Bir kaydırıcının uçtan uca bir kez taranması için geçen süre (saniye). */
const TUR_SANIYE = 8;

/**
 * İki kare arasındaki en büyük kabul edilen süre (ms).
 * Sekme arka plana alınıp geri gelindiğinde requestAnimationFrame arada onlarca saniyelik
 * bir boşluk bildirir; sınır olmasa kaydırıcı tek karede uçtan uca sıçrardı.
 */
const MAX_KARE_MS = 50;

/**
 * Tek bir animasyon karesinde kaydırıcı değerlerini ilerletir (SAF fonksiyon).
 * `dirs` yerinde güncellenir: uca gelen kaydırıcının yönü ters çevrilir.
 *
 * React'ten bağımsızdır; böylece salınım davranışı birim testlerle doğrulanabilir.
 */
export function advanceSliders(
  sliders: { id: string; min: number; max: number; value: number }[],
  dirs: Record<string, 1 | -1>,
  dtSeconds: number,
  tourSeconds: number = TUR_SANIYE
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const s of sliders) {
    const aralik = s.max - s.min;
    // Dejenere kaydırıcı (min === max) sonsuz döngüye girmesin
    if (!(aralik > 0)) continue;
    const yon = dirs[s.id] ?? 1;
    let d = s.value + (yon * aralik * dtSeconds) / tourSeconds;

    if (d >= s.max) {
      d = s.max;
      dirs[s.id] = -1;
    } else if (d <= s.min) {
      d = s.min;
      dirs[s.id] = 1;
    }
    next[s.id] = d;
  }
  return next;
}

interface Params {
  /** Sahnedeki kaydırıcılar (oynatma yalnızca bunlar üzerinde çalışır). */
  sliders: SliderObject[];
  /**
   * Her karede TEK çağrı ile yeni değerleri yazar.
   * Geçmişe (undo) yazmamalıdır: animasyon bir kullanıcı eylemi değildir.
   */
  onValues: (values: Record<string, number>) => void;
}

/**
 * Kaydırıcıları kendiliğinden ilerleten oynatma döngüsü.
 *
 * Davranış:
 * - Kaydırıcı uca geldiğinde BAŞA ZIPLAMAZ, yön değiştirip geri gelir (salınım / ping-pong).
 *   Zıplama gösterimi keserdi: kaydırıcıya bağlı bir eğri birden başa ışınlanırdı.
 * - Yön kaydırıcı BAŞINA tutulur. Ortak tek yönle, farklı konumlardan başlayan iki
 *   kaydırıcıdan geride kalan hiçbir zaman kendi ucuna ulaşamazdı.
 * - Sahnede kaydırıcı kalmazsa oynatma kendiliğinden durur.
 */
export function useSliderPlayback({ sliders, onValues }: Params) {
  const [isPlaying, setIsPlaying] = useState(false);

  const frameRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);
  /** Kaydırıcı kimliğine göre yön: +1 ileri, -1 geri. */
  const dirsRef = useRef<Record<string, 1 | -1>>({});
  // Döngü içinde her zaman güncel değerleri görmek için ref
  const slidersRef = useRef(sliders);
  slidersRef.current = sliders;
  const onValuesRef = useRef(onValues);
  onValuesRef.current = onValues;

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    prevTimeRef.current = null;
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  // Sahnede hiç kaydırıcı kalmadıysa oynatmayı sürdürmenin anlamı yok
  useEffect(() => {
    if (isPlaying && sliders.length === 0) stop();
  }, [isPlaying, sliders.length, stop]);

  useEffect(() => {
    if (!isPlaying) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      prevTimeRef.current = null;
      return;
    }

    const adim = (simdi: number) => {
      const onceki = prevTimeRef.current;
      prevTimeRef.current = simdi;

      if (onceki !== null) {
        const gecen = Math.min(MAX_KARE_MS, simdi - onceki) / 1000;
        const yeni = advanceSliders(slidersRef.current, dirsRef.current, gecen);

        if (Object.keys(yeni).length > 0) {
          try {
            onValuesRef.current(yeni);
          } catch {
            // Sahne değiştiyse (nesneler serbest bırakıldıysa) döngü boşa dönmesin
            stop();
            return;
          }
        }
      }

      frameRef.current = requestAnimationFrame(adim);
    };

    frameRef.current = requestAnimationFrame(adim);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      prevTimeRef.current = null;
    };
  }, [isPlaying, stop]);

  // Bileşen kaldırıldığında döngüyü kapat
  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  return { isPlaying, toggle, stop };
}
