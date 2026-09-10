'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { Modal } from '@/components/ui/Modal';
import { Sliders, X, Check, AlertCircle } from 'lucide-react';

interface SliderDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Ayrılmış adlar: "x" ifade değişkenidir, "pi"/"e" sabittir ve "ln" bir fonksiyondur.
 * (Ad alanı en fazla 2 karakter olduğu için "kok"/"mutlak" gibi uzun fonksiyon adları
 * zaten girilemez.) Bu adlarla bir kaydırıcı oluşturulsa da hiçbir ifadede kullanılamaz.
 */
const RESERVED_NAMES = ['x', 'pi', 'e', 'ln'];

/** Yeni kaydırıcı için sırayla denenecek varsayılan adlar */
const CANDIDATE_NAMES = ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'y', 'z'];

const DEFAULT_MIN = '-5';
const DEFAULT_MAX = '5';
const DEFAULT_STEP = '0,5';
const DEFAULT_VALUE = '1';

/** "-1,5" / "-1.5" gibi ham metni sayıya çevirir; geçersizse null. */
function parseNumberInput(raw: string): number | null {
  const n = parseFloat(raw.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const NUMBER_INPUT_CLASS =
  'w-full px-3 py-1.5 rounded-lg bg-input border border-border text-foreground outline-none focus:ring-1 focus:ring-primary font-mono';

export function SliderDialog({ isOpen, onClose }: SliderDialogProps) {
  const { addSlider, objects } = useWorkspace();
  const [name, setName] = useState('a');
  // Sayı alanları ham metin olarak tutulur; gönderimde/odak kaybında ayrıştırılır.
  const [minRaw, setMinRaw] = useState(DEFAULT_MIN);
  const [maxRaw, setMaxRaw] = useState(DEFAULT_MAX);
  const [stepRaw, setStepRaw] = useState(DEFAULT_STEP);
  const [valueRaw, setValueRaw] = useState(DEFAULT_VALUE);
  const [error, setError] = useState<string | null>(null);

  const existingNames = objects
    .filter((o) => o.type === 'slider')
    .map((o) => (o as { variableName?: string }).variableName)
    .filter((n): n is string => typeof n === 'string');

  // Diyalog kalıcı olarak mount edildiğinden, her açılışta formu sıfırla:
  // ad olarak sıradaki boş harfi seç, hata mesajını ve sayıları varsayılana döndür.
  const existingNamesRef = useRef(existingNames);
  existingNamesRef.current = existingNames;

  useEffect(() => {
    if (!isOpen) return;
    const used = new Set(existingNamesRef.current);
    setName(CANDIDATE_NAMES.find((n) => !used.has(n)) ?? 'a');
    setMinRaw(DEFAULT_MIN);
    setMaxRaw(DEFAULT_MAX);
    setStepRaw(DEFAULT_STEP);
    setValueRaw(DEFAULT_VALUE);
    setError(null);
  }, [isOpen]);

  const normalizeOnBlur = (raw: string, setter: (v: string) => void, fallback: string) => {
    const n = parseNumberInput(raw);
    setter(n === null ? fallback : String(n).replace('.', ','));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim().toLowerCase();
    if (!trimmedName) {
      setError('Değişken adı boş olamaz.');
      return;
    }
    if (!/^[a-zçğıöşü][a-zçğıöşü0-9]?$/.test(trimmedName)) {
      setError('Değişken adı bir harf (isteğe bağlı bir rakam) olmalıdır. Örn: a, b, m, k1');
      return;
    }
    if (RESERVED_NAMES.includes(trimmedName)) {
      setError('"x", "pi", "e" ve "ln" adları ayrılmıştır; başka bir harf seçin.');
      return;
    }
    if (existingNames.includes(trimmedName)) {
      setError(`"${trimmedName}" adlı bir kaydırıcı zaten var.`);
      return;
    }

    const min = parseNumberInput(minRaw);
    const max = parseNumberInput(maxRaw);
    const step = parseNumberInput(stepRaw);
    const value = parseNumberInput(valueRaw);

    if (min === null || max === null || step === null || value === null) {
      setError('Tüm sayı alanları geçerli bir sayı olmalıdır.');
      return;
    }
    if (min >= max) {
      setError('Minimum değer, maksimum değerden küçük olmalıdır.');
      return;
    }
    if (step <= 0) {
      setError('Adım değeri sıfırdan büyük olmalıdır.');
      return;
    }

    const clampedValue = Math.max(min, Math.min(max, value));
    addSlider(trimmedName, min, max, step, clampedValue);
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="slider-dialog-title"
      overlayClassName="bg-black/60 backdrop-blur-sm"
      className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary" />
          <h2 id="slider-dialog-title" className="text-base font-bold text-foreground">
            Parametre Kaydırıcısı Ekle
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Kapat (Esc)"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="space-y-1">
          <label className="font-semibold text-foreground" htmlFor="slider-name-input">
            Değişken Adı (Harf)
          </label>
          <input
            id="slider-name-input"
            type="text"
            maxLength={2}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg bg-input border border-border text-foreground font-mono font-bold outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground" htmlFor="slider-min-input">
              Minimum Değer
            </label>
            <input
              id="slider-min-input"
              type="text"
              inputMode="decimal"
              value={minRaw}
              onChange={(e) => {
                setMinRaw(e.target.value);
                setError(null);
              }}
              onBlur={() => normalizeOnBlur(minRaw, setMinRaw, DEFAULT_MIN)}
              className={NUMBER_INPUT_CLASS}
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground" htmlFor="slider-max-input">
              Maksimum Değer
            </label>
            <input
              id="slider-max-input"
              type="text"
              inputMode="decimal"
              value={maxRaw}
              onChange={(e) => {
                setMaxRaw(e.target.value);
                setError(null);
              }}
              onBlur={() => normalizeOnBlur(maxRaw, setMaxRaw, DEFAULT_MAX)}
              className={NUMBER_INPUT_CLASS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground" htmlFor="slider-step-input">
              Adım (Step)
            </label>
            <input
              id="slider-step-input"
              type="text"
              inputMode="decimal"
              value={stepRaw}
              onChange={(e) => {
                setStepRaw(e.target.value);
                setError(null);
              }}
              onBlur={() => normalizeOnBlur(stepRaw, setStepRaw, DEFAULT_STEP)}
              className={NUMBER_INPUT_CLASS}
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground" htmlFor="slider-value-input">
              Başlangıç Değeri
            </label>
            <input
              id="slider-value-input"
              type="text"
              inputMode="decimal"
              value={valueRaw}
              onChange={(e) => {
                setValueRaw(e.target.value);
                setError(null);
              }}
              onBlur={() => normalizeOnBlur(valueRaw, setValueRaw, DEFAULT_VALUE)}
              className={NUMBER_INPUT_CLASS}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-1 text-[11px] text-destructive" role="alert">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            İptal
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Kaydırıcıyı Ekle</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
