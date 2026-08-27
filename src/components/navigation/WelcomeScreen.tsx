'use client';

import React from 'react';
import Image from 'next/image';
import { useCurriculum } from '@/state/CurriculumContext';
import {
  Sparkles,
  ArrowRight,
  Compass,
  Play,
  Volume2,
  CheckCircle2,
  Box,
  Layers,
  GraduationCap,
} from 'lucide-react';

export function WelcomeScreen() {
  const { selectLevel, startFreeSandbox } = useCurriculum();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 lg:p-12 relative overflow-hidden bg-[#faf8f5] dark:bg-[#121316] select-none">
      {/* 1. YUMUŞAK KİL & MATEMATİK AMBİYANS IŞIKLARI */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-200/35 dark:bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-200/35 dark:bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-purple-200/25 dark:bg-purple-600/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* Yüzen Matematiksel Süslemeler */}
      <div className="absolute top-12 right-16 text-amber-500/20 dark:text-amber-400/15 font-black text-6xl font-mono pointer-events-none rotate-12 hidden lg:block">
        π
      </div>
      <div className="absolute bottom-20 left-16 text-blue-500/20 dark:text-blue-400/15 font-black text-7xl font-mono pointer-events-none -rotate-12 hidden lg:block">
        Σ
      </div>
      <div className="absolute top-1/3 left-10 text-cyan-500/20 dark:text-cyan-400/15 font-black text-5xl font-mono pointer-events-none hidden lg:block">
        φ
      </div>
      <div className="absolute bottom-1/3 right-12 text-purple-500/20 dark:text-purple-400/15 font-black text-5xl font-mono pointer-events-none rotate-6 hidden lg:block">
        ∞
      </div>

      {/* 2. ANA BAŞLIK VE AÇIKLAMA */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-amber-200/80 dark:border-amber-700/50 shadow-sm text-slate-800 dark:text-slate-200 text-xs font-black tracking-wide">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-blue-600 bg-clip-text text-transparent uppercase">
            T.C. MEB Türkiye Yüzyılı Maarif Modeli
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
          Kademe{' '}
          <span className="bg-gradient-to-r from-amber-500 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Seçiniz
          </span>
        </h1>
      </div>

      {/* 3. ÜÇLÜ 3D KİL KART GRİDİ (İLKOKUL, ORTAOKUL, LİSE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-7 w-full max-w-6xl mb-10 relative z-10">
        
        {/* ===================== 1. İLKOKUL KARTI (Bal & Sıcak Kil Teması) ===================== */}
        <div className="group relative flex flex-col p-6 sm:p-7 rounded-[32px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-500 shadow-[0_20px_50px_-15px_rgba(245,158,11,0.15)] hover:shadow-[0_25px_60px_-15px_rgba(245,158,11,0.35)] transition-all duration-300 hover:-translate-y-2">
          {/* Üst 3D Kil Görsel Alanı (Sıcak Kil & Bal Sarısı Pedestal) */}
          <div className="relative w-full h-48 sm:h-52 rounded-2xl bg-gradient-to-b from-[#fff8ed] via-[#fef3c7]/60 to-[#fffbeb] dark:from-amber-950/40 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center p-3 mb-5 overflow-hidden shadow-inner" style={{ position: 'relative' }}>
            <div className="relative w-full h-full rounded-2xl overflow-hidden group-hover:scale-105 transition-transform duration-300 flex items-center justify-center" style={{ position: 'relative', width: '100%', height: '100%' }}>
              <Image
                src="/images/ilkokul-3d.png"
                alt="İlkokul 3D Kil Matematik Okulu"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain drop-shadow-md"
                priority
              />
            </div>

            {/* Sağ Üst Kademe Rozeti */}
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-amber-600 dark:text-amber-400 font-black text-xs shadow-sm border border-amber-200 dark:border-amber-800">
              1-4. Sınıf
            </div>

            {/* Sol Alt Sesli/Oyun Rozeti */}
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-amber-500 text-white font-black text-[10px] shadow-sm flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              <span>Sesli &amp; Görsel Oyun</span>
            </div>
          </div>

          {/* İçerik */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <h2 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  İlkokul
                </h2>
              </div>
              <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full">
                111 Görev
              </span>
            </div>

            {/* Sınıf Rozetleri */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold border border-amber-500/20">
                1. Sınıf (Görsel &amp; Sesli)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold border border-amber-500/20">
                2. Sınıf
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold border border-amber-500/20">
                3. Sınıf
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold border border-amber-500/20">
                4. Sınıf
              </span>
            </div>
          </div>

          {/* Aksiyon Butonu */}
          <button
            onClick={() => selectLevel('ilkokul')}
            className="mt-auto w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 hover:scale-102 transition-all cursor-pointer"
          >
            <span>İlkokul Kademesine Gir</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* ===================== 2. ORTAOKUL KARTI (Turkuaz & Kobalt Mavisi Teması) ===================== */}
        <div className="group relative flex flex-col p-6 sm:p-7 rounded-[32px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-cyan-200/80 dark:border-cyan-900/40 hover:border-cyan-500 dark:hover:border-cyan-400 shadow-[0_20px_50px_-15px_rgba(6,182,212,0.15)] hover:shadow-[0_25px_60px_-15px_rgba(6,182,212,0.35)] transition-all duration-300 hover:-translate-y-2">
          {/* Üst 3D Kil Görsel Alanı (Turkuaz & Cyan Pedestal) */}
          <div className="relative w-full h-48 sm:h-52 rounded-2xl bg-gradient-to-b from-[#ecfeff] via-[#cffafe]/60 to-[#e0f2fe] dark:from-cyan-950/40 dark:to-blue-950/20 border border-cyan-200/80 dark:border-cyan-800/60 flex items-center justify-center p-3 mb-5 overflow-hidden shadow-inner" style={{ position: 'relative' }}>
            <div className="relative w-full h-full rounded-2xl overflow-hidden group-hover:scale-105 transition-transform duration-300 flex items-center justify-center" style={{ position: 'relative', width: '100%', height: '100%' }}>
              <Image
                src="/images/ortaokul-3d.png"
                alt="Ortaokul 3D Kil İzometrik Geometri Küpleri"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain drop-shadow-md"
                priority
              />
            </div>

            {/* Sağ Üst Kademe Rozeti */}
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-cyan-700 dark:text-cyan-300 font-black text-xs shadow-sm border border-cyan-200 dark:border-cyan-800">
              5-8. Sınıf
            </div>

            {/* Sol Alt Rozet */}
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-cyan-600 text-white font-black text-[10px] shadow-sm flex items-center gap-1">
              <Box className="w-3 h-3" />
              <span>190 TYMM Görevi</span>
            </div>
          </div>

          {/* İçerik */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50" />
                <h2 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Ortaokul
                </h2>
              </div>
              <span className="text-[11px] font-extrabold text-cyan-700 dark:text-cyan-300 bg-cyan-100/80 dark:bg-cyan-950/80 px-2.5 py-0.5 rounded-full">
                190 Görev
              </span>
            </div>

            {/* Sınıf Rozetleri */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-extrabold border border-cyan-500/20">
                5. Sınıf (42)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-extrabold border border-cyan-500/20">
                6. Sınıf (52)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-extrabold border border-cyan-500/20">
                7. Sınıf (48)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-extrabold border border-cyan-500/20">
                8. Sınıf (48)
              </span>
            </div>
          </div>

          {/* Aksiyon Butonu */}
          <button
            onClick={() => selectLevel('ortaokul')}
            className="mt-auto w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-500/50 hover:scale-102 transition-all cursor-pointer"
          >
            <span>Ortaokul Kademesine Gir</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* ===================== 3. LİSE KARTI (Asil Mor & Fuşya Teması) ===================== */}
        <div className="group relative flex flex-col p-6 sm:p-7 rounded-[32px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-purple-200/80 dark:border-purple-900/40 hover:border-purple-500 dark:hover:border-purple-400 shadow-[0_20px_50px_-15px_rgba(147,51,234,0.15)] hover:shadow-[0_25px_60px_-15px_rgba(147,51,234,0.35)] transition-all duration-300 hover:-translate-y-2">
          {/* Üst 3D Kil Görsel Alanı (Asil Mor & Lavanta Pedestal) */}
          <div className="relative w-full h-48 sm:h-52 rounded-2xl bg-gradient-to-b from-[#faf5ff] via-[#f3e8ff]/60 to-[#fdf4ff] dark:from-purple-950/40 dark:to-fuchsia-950/20 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-center p-3 mb-5 overflow-hidden shadow-inner" style={{ position: 'relative' }}>
            <div className="relative w-full h-full rounded-2xl overflow-hidden group-hover:scale-105 transition-transform duration-300 flex items-center justify-center" style={{ position: 'relative', width: '100%', height: '100%' }}>
              <Image
                src="/images/lise-3d.png"
                alt="Lise 3D Kil Altın Oran ve Analitik Düzlem"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain drop-shadow-md"
                priority
              />
            </div>

            {/* Sağ Üst Kademe Rozeti */}
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-purple-600 dark:text-purple-400 font-black text-xs shadow-sm border border-purple-200 dark:border-purple-800">
              Hazırlık - 12. Sınıf
            </div>

            {/* Sol Alt Rozet */}
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-purple-600 text-white font-black text-[10px] shadow-sm flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              <span>Analitik &amp; Fonksiyon</span>
            </div>
          </div>

          {/* İçerik */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                <h2 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Lise
                </h2>
              </div>
              <span className="text-[11px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/80 px-2.5 py-0.5 rounded-full">
                88 Çıktı &amp; 32 Tema
              </span>
            </div>

            {/* Sınıf Rozetleri */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold border border-purple-500/20">
                Hazırlık (11)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold border border-purple-500/20">
                9. Sınıf (20)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold border border-purple-500/20">
                10. Sınıf (21)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold border border-purple-500/20">
                11. Sınıf (15)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold border border-purple-500/20">
                12. Sınıf (21)
              </span>
            </div>
          </div>

          {/* Aksiyon Butonu */}
          <button
            onClick={() => selectLevel('lise')}
            className="mt-auto w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 hover:scale-102 transition-all cursor-pointer"
          >
            <span>Lise Kademesine Gir</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>

      {/* 4. SERBEST MATEMATİK & ÇİZİM STÜDYOSU KARTI */}
      <div className="w-full max-w-4xl relative z-10">
        <button
          onClick={startFreeSandbox}
          className="w-full p-5 rounded-[28px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-2 border-emerald-200/80 dark:border-emerald-800/40 hover:border-emerald-500 shadow-[0_15px_40px_-10px_rgba(16,185,129,0.12)] hover:shadow-[0_20px_50px_-10px_rgba(16,185,129,0.25)] flex flex-col sm:flex-row items-center justify-between gap-4 transition-all group hover:-translate-y-1 cursor-pointer"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 shadow-md shadow-emerald-500/30 transition-transform">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="font-black text-slate-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Serbest Matematik &amp; Çizim Stüdyosu
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Müfredata bağlı kalmadan sınırsız tuvalde dilediğin 2D şekli çiz, fonksiyon grafiği oluştur ve serbestçe dene.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black shadow-md shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all shrink-0">
            <span>Stüdyoyu Başlat</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}
