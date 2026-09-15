'use client';

import React from 'react';
import { Topic, Activity } from '@/types/curriculum';
import { X, Box } from 'lucide-react';

interface DiscoveryModalProps {
  topic: Topic | null;
  onClose: () => void;
  onLaunchActivity?: (activity: Activity) => void;
}

export function DiscoveryModal({ topic, onClose }: DiscoveryModalProps) {
  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    };
  }, []);

  if (!topic) return null;

  const handleClose = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-card/95 border-2 border-border/90 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* 1. ÜST BAŞLIK ŞERİDİ */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-200/80 via-rose-100 to-sky-100 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {topic.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. ORTA BÖLÜM: AÇIKLAMA BALONU VE SARI SAYAÇ KUTUSU */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 p-4 rounded-2xl bg-muted/40 border border-border/80 text-xs sm:text-sm font-semibold text-foreground">
              <span>{topic.description || 'Bu konu için çalışma alanı.'}</span>
            </div>

            <div className="px-6 py-3 rounded-2xl bg-amber-300 dark:bg-amber-400 text-slate-950 font-black text-center shrink-0 shadow-sm">
              <div className="text-[9px] uppercase tracking-wider text-slate-800 font-extrabold">
                İLGİLİ GÖREVLER
              </div>
              <div className="text-3xl font-black">{topic.activities?.length || 0}</div>
            </div>
          </div>

          {/* 3. ALT ALAN (BOŞ) */}
          <div className="min-h-[220px] rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/80 mb-3">
              <Box className="w-6 h-6" />
            </div>
            <div className="font-bold text-sm text-foreground/80 mb-1">
              {topic.title}
            </div>
            <div className="text-xs text-muted-foreground max-w-sm">
              Bu konu alanı için içerik tanımlanmamıştır.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
