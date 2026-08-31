'use client';

import React from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import {
  Sparkles,
  ArrowRight,
  Compass,
  Smile,
  GraduationCap,
  Shapes,
  Layers,
  ChevronRight,
} from 'lucide-react';

export function WelcomeScreen() {
  const { selectLevel, selectGrade, startFreeSandbox } = useCurriculum();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fafbfc] dark:bg-[#0f1115] text-slate-800 dark:text-slate-100 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col items-center justify-start select-none">
      <div className="w-full max-w-5xl space-y-5">
        
        {/* ============================================================== */}
        {/* 1. ÜST BAŞLIK ALANI (Sade & Zarif Tipografi)                     */}
        {/* ============================================================== */}
        <div className="bg-gradient-to-r from-amber-200/80 via-rose-100/70 to-sky-100/70 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 p-5 rounded-2xl border border-amber-200/60 dark:border-slate-800 shadow-2xs">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Kademe Seçimi
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Etkileşimli matematik ve geometri çalışmaları için kademenizi veya doğrudan sınıfınızı seçiniz.
          </p>
        </div>

        {/* ============================================================== */}
        {/* 2. PASTEL RENKLİ 3 KADEME KARTI                                 */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          
          {/* ================= KART 1: İLKOKUL (Pastel Sarı/Bal) ================= */}
          <div
            onClick={() => selectLevel('ilkokul')}
            className="group relative h-60 p-5 sm:p-6 rounded-3xl bg-[#fffbeb] hover:bg-[#fef3c7] dark:bg-amber-950/20 dark:hover:bg-amber-950/30 border-2 border-[#fde68a] dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-500 text-left flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
          >
            {/* Sol Üst İkon & Rozet */}
            <div className="flex items-center justify-between w-full relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-[#d97706] text-white flex items-center justify-center shadow-xs">
                <Smile className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-amber-800 dark:text-amber-300 text-xs font-black border border-amber-200 dark:border-amber-800 shadow-2xs">
                1-4. Sınıf
              </span>
            </div>

            {/* Sağ Alt Silik Filigran İkon */}
            <Shapes className="absolute -bottom-4 -right-4 w-36 h-36 text-amber-300/35 dark:text-amber-500/10 pointer-events-none group-hover:scale-105 transition-transform duration-300" />

            {/* Sol Alt Başlık ve Sade Sınıf Etiketleri */}
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-[#b45309] dark:text-amber-400">
                  İlkokul
                </h2>
                <div className="flex items-center gap-1 text-xs font-black text-amber-700 dark:text-amber-300 group-hover:translate-x-1 transition-transform">
                  <span>Sınıf Seç</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Sınıf Butonları */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { num: 1, label: '1. Sınıf' },
                  { num: 2, label: '2. Sınıf' },
                  { num: 3, label: '3. Sınıf' },
                  { num: 4, label: '4. Sınıf' },
                ].map((cls) => (
                  <button
                    key={cls.num}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectGrade(cls.num as any);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white text-amber-900 dark:text-amber-200 text-xs font-black border border-amber-300/80 shadow-2xs transition-all active:scale-95 cursor-pointer z-20"
                  >
                    {cls.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ================= KART 2: ORTAOKUL (Pastel Mavi) ================= */}
          <div
            onClick={() => selectLevel('ortaokul')}
            className="group relative h-60 p-5 sm:p-6 rounded-3xl bg-[#f0f6ff] hover:bg-[#e4efff] dark:bg-blue-950/20 dark:hover:bg-blue-950/30 border-2 border-[#dbeafe] dark:border-blue-900/40 hover:border-blue-400 dark:hover:border-blue-500 text-left flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
          >
            {/* Sol Üst İkon & Rozet */}
            <div className="flex items-center justify-between w-full relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Compass className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-blue-800 dark:text-blue-300 text-xs font-black border border-blue-200 dark:border-blue-800 shadow-2xs">
                5-8. Sınıf
              </span>
            </div>

            {/* Sağ Alt Silik Filigran İkon */}
            <Compass className="absolute -bottom-4 -right-4 w-36 h-36 text-blue-300/35 dark:text-blue-500/10 pointer-events-none group-hover:scale-105 transition-transform duration-300" />

            {/* Sol Alt Başlık ve Sade Sınıf Etiketleri */}
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-blue-700 dark:text-blue-400">
                  Ortaokul
                </h2>
                <div className="flex items-center gap-1 text-xs font-black text-blue-700 dark:text-blue-300 group-hover:translate-x-1 transition-transform">
                  <span>Sınıf Seç</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Sınıf Butonları */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { num: 5, label: '5. Sınıf' },
                  { num: 6, label: '6. Sınıf' },
                  { num: 7, label: '7. Sınıf' },
                  { num: 8, label: '8. Sınıf' },
                ].map((cls) => (
                  <button
                    key={cls.num}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectGrade(cls.num as any);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-blue-900 dark:text-blue-200 text-xs font-black border border-blue-300/80 shadow-2xs transition-all active:scale-95 cursor-pointer z-20"
                  >
                    {cls.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ================= KART 3: LİSE (Pastel Mor/Lavanta) ================= */}
          <div
            onClick={() => selectLevel('lise')}
            className="group relative h-60 p-5 sm:p-6 rounded-3xl bg-[#faf5ff] hover:bg-[#f3e8ff] dark:bg-purple-950/20 dark:hover:bg-purple-950/30 border-2 border-[#f3e8ff] dark:border-purple-900/40 hover:border-purple-400 dark:hover:border-purple-500 text-left flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
          >
            {/* Sol Üst İkon & Rozet */}
            <div className="flex items-center justify-between w-full relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-xs">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-purple-800 dark:text-purple-300 text-xs font-black border border-purple-200 dark:border-purple-800 shadow-2xs">
                9-12. Sınıf
              </span>
            </div>

            {/* Sağ Alt Silik Filigran İkon */}
            <GraduationCap className="absolute -bottom-4 -right-4 w-36 h-36 text-purple-300/35 dark:text-purple-500/10 pointer-events-none group-hover:scale-105 transition-transform duration-300" />

            {/* Sol Alt Başlık ve Sade Sınıf Etiketleri */}
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-purple-700 dark:text-purple-400">
                  Lise
                </h2>
                <div className="flex items-center gap-1 text-xs font-black text-purple-700 dark:text-purple-300 group-hover:translate-x-1 transition-transform">
                  <span>Sınıf Seç</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Sınıf Butonları */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { num: 9, label: '9. Sınıf' },
                  { num: 10, label: '10. Sınıf' },
                  { num: 11, label: '11. Sınıf' },
                  { num: 12, label: '12. Sınıf' },
                ].map((cls) => (
                  <button
                    key={cls.num}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectGrade(cls.num as any);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white text-purple-900 dark:text-purple-200 text-xs font-black border border-purple-300/80 shadow-2xs transition-all active:scale-95 cursor-pointer z-20"
                  >
                    {cls.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ============================================================== */}
        {/* 3. SERBEST MATEMATİK & ÇİZİM STÜDYOSU (Zarif Yeşil Kart)        */}
        {/* ============================================================== */}
        <button
          onClick={startFreeSandbox}
          className="w-full group relative h-24 p-5 rounded-2xl bg-[#f0fdf4] hover:bg-[#dcfce7] dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 border border-[#bbf7d0] dark:border-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-500 text-left flex items-center justify-between overflow-hidden shadow-2xs hover:shadow-sm transition-all duration-200 cursor-pointer"
        >
          {/* Sol İkon & Başlık */}
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#15803d] dark:text-emerald-400">
                Serbest Geometri &amp; Matematik Stüdyosu
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                Dinamik 2D şekiller, açılar, alanlar ve 3D prizma laboratuvarı
              </p>
            </div>
          </div>

          {/* Sağ Alt Silik Filigran */}
          <Layers className="absolute -bottom-4 -right-4 w-32 h-32 text-emerald-200/40 dark:text-emerald-500/10 pointer-events-none group-hover:scale-105 transition-transform duration-300" />

          {/* Sağ Giriş Butonu */}
          <div className="relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#16a34a] text-white text-xs font-semibold shadow-2xs group-hover:bg-[#15803d] transition-colors shrink-0">
            <span>Stüdyoyu Başlat</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

      </div>
    </div>
  );
}
