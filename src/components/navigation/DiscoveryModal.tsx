'use client';

import React from 'react';
import { Topic, Activity } from '@/types/curriculum';
import {
  X,
  Play,
  Shapes,
  Box,
} from 'lucide-react';

interface DiscoveryModalProps {
  topic: Topic | null;
  onClose: () => void;
  onLaunchActivity: (activity: Activity) => void;
}

export function DiscoveryModal({ topic, onClose, onLaunchActivity }: DiscoveryModalProps) {
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
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                {topic.code || 'KONU'}
              </div>
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
              <span>{topic.description || 'İnteraktif çalışma alanını açarak modelleme yapın.'}</span>
            </div>

            <div className="px-6 py-3 rounded-2xl bg-amber-300 dark:bg-amber-400 text-slate-950 font-black text-center shrink-0 shadow-sm">
              <div className="text-[9px] uppercase tracking-wider text-slate-800 font-extrabold">
                İLGİLİ GÖREVLER
              </div>
              <div className="text-3xl font-black">{topic.activities.length}</div>
            </div>
          </div>

          {/* 3. GÖREV KARTLARI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {topic.activities.map((activity, idx) => {
              const folderColor = activity.folderColor || (idx === 0 ? '#ef4444' : idx === 1 ? '#eab308' : idx === 2 ? '#3b82f6' : '#10b981');

              return (
                <div
                  key={activity.id}
                  className="group relative rounded-3xl p-5 text-white flex flex-col space-y-4 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                  style={{ backgroundColor: folderColor }}
                >
                  {/* Klasör Kulakçığı */}
                  <div
                    className="absolute -top-3 left-6 px-4 py-1 rounded-t-xl font-bold text-[10px] uppercase tracking-wider shadow-sm"
                    style={{ backgroundColor: folderColor }}
                  >
                    <span className="opacity-90">GÖREV #{idx + 1}</span>
                  </div>

                  {/* Beyaz Görsel Çizim / Önizleme Kutusu */}
                  <div className="w-full h-36 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-3 flex flex-col items-center justify-center overflow-hidden relative shadow-inner border border-black/10">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                      <Shapes className="w-7 h-7" />
                    </div>
                    <div className="font-bold text-xs text-foreground text-center">
                      Boş Çalışma Alanı
                    </div>
                    <div className="text-[10px] text-muted-foreground text-center">
                      Çizim, Modelleme &amp; Geometri
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider opacity-85">
                      UYGULAMA
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                      <Box className="w-4 h-4 shrink-0" />
                      <span>{activity.title}</span>
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onLaunchActivity(activity);
                    }}
                    className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-950 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition-all mt-auto cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current text-amber-400" />
                    <span>Çalışma Alanına Başla</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
