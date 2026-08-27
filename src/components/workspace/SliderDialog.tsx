'use client';

import React, { useState } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { Sliders, X, Check } from 'lucide-react';

interface SliderDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SliderDialog({ isOpen, onClose }: SliderDialogProps) {
  const { addSlider, objects } = useWorkspace();
  const [name, setName] = useState('a');
  const [min, setMin] = useState(-5);
  const [max, setMax] = useState(5);
  const [step, setStep] = useState(0.5);
  const [initialValue, setInitialValue] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addSlider(name.trim().toLowerCase(), min, max, step, initialValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Parametre Kaydırıcısı Ekle</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Değişken Adı (Harf)</label>
            <input
              type="text"
              maxLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-input border border-border text-foreground font-mono font-bold outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Minimum Değer</label>
              <input
                type="number"
                value={min}
                onChange={(e) => setMin(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-input border border-border text-foreground outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Maksimum Değer</label>
              <input
                type="number"
                value={max}
                onChange={(e) => setMax(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-input border border-border text-foreground outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Adım (Step)</label>
              <input
                type="number"
                step="0.1"
                value={step}
                onChange={(e) => setStep(parseFloat(e.target.value) || 0.1)}
                className="w-full px-3 py-1.5 rounded-lg bg-input border border-border text-foreground outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Başlangıç Değeri</label>
              <input
                type="number"
                value={initialValue}
                onChange={(e) => setInitialValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-input border border-border text-foreground outline-none"
              />
            </div>
          </div>

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
      </div>
    </div>
  );
}
