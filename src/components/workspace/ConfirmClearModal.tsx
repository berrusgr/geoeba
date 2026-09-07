'use client';

import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, Shapes, Box } from 'lucide-react';

interface ConfirmClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetDimension: '2D' | '3D';
  objectCount: number;
}

export function ConfirmClearModal({
  isOpen,
  onClose,
  onConfirm,
  targetDimension,
  objectCount,
}: ConfirmClearModalProps) {
  // ESC tuşu ile kapatma ve Enter ile onaylama
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  const is2D = targetDimension === '2D';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Arka Plan Dekoratif Işıma */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-red-500/10 blur-2xl pointer-events-none" />

        {/* Kapat Butonu */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Kapat (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Üst İkon & Başlık */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25">
              <Trash2 className="w-6 h-6" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center ring-2 ring-card shadow-xs">
              <AlertTriangle className="w-3 h-3" />
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                {is2D ? <Shapes className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                {is2D ? '2D Çizim Alanı' : '3D Katı Cisim Alanı'}
              </span>
            </div>
            <h2 className="text-lg font-black text-foreground tracking-tight">
              Tüm Ekranı Temizle
            </h2>
          </div>
        </div>

        {/* Açıklama Metni */}
        <div className="text-sm text-muted-foreground leading-relaxed">
          {is2D ? (
            <p>
              Çalışma alanındaki <span className="font-bold text-foreground">tüm 2D şekiller, noktalar ve çizimler</span> silinecektir. Ekrandaki tüm nesneleri temizlemek istediğinize emin misiniz?
            </p>
          ) : (
            <p>
              3D stüdyodaki <span className="font-bold text-foreground">tüm 3 boyutlu katı cisimler ve modeller</span> silinecektir. Ekrandaki tüm cisimleri temizlemek istediğinize emin misiniz?
            </p>
          )}
        </div>

        {/* Nesne Sayısı Durum Rozeti */}
        <div className="p-3.5 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground flex items-center gap-2">
            <span>Silinecek Öğe:</span>
          </span>
          <span className="font-bold px-2.5 py-1 rounded-xl bg-card border border-border text-foreground">
            {objectCount > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-black">
                {objectCount} {is2D ? 'nesne / şekil' : 'katı cisim'}
              </span>
            ) : (
              <span className="text-muted-foreground">Ekran şu anda boş</span>
            )}
          </span>
        </div>

        {/* Butonlar */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-foreground bg-muted hover:bg-muted/80 border border-border/60 transition-all cursor-pointer active:scale-95"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
            autoFocus
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Evet, Tümünü Sil</span>
          </button>
        </div>
      </div>
    </div>
  );
}
