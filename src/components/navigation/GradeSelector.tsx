'use client';

import React from 'react';
import Image from 'next/image';
import { useCurriculum } from '@/state/CurriculumContext';
import { GradeId } from '@/types/curriculum';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Sparkles,
  GraduationCap,
  Layers,
  Box,
  Compass,
  TrendingUp,
  Percent,
  Shapes,
  Volume2,
  Smile,
  Target,
} from 'lucide-react';

const GRADE_VISUALS: Record<
  number,
  {
    gradient: string;
    bgGradient: string;
    borderColor: string;
    badgeBg: string;
    accentColor: string;
    icon: React.ReactNode;
    imageSrc?: string;
    tag?: string;
    highlightTopics: string[];
  }
> = {
  // İlkokul Sınıfları (3D Kil Hayvan ve Blok Karakterleri — Sıcak Bal & Kil Teması)
  1: {
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-amber-500/10',
    borderColor: 'border-amber-200/80 dark:border-amber-900/50 hover:border-amber-500 dark:hover:border-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    accentColor: '#f59e0b',
    icon: <Smile className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-1.png',
    tag: '🔊 Sesli & 🎮 Görsel Oyun Modu',
    highlightTopics: ['🐰 Labirent & Yön', '🍎 Elma Saymaca (1-10)', '💰 Kumbaramız (1-200₺)', '⚽️ Şekil Eşleme'],
  },
  2: {
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-amber-500/10',
    borderColor: 'border-amber-200/80 dark:border-amber-900/50 hover:border-amber-500 dark:hover:border-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    accentColor: '#f59e0b',
    icon: <Shapes className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-2.png',
    highlightTopics: ['Onluk-Birlik Basamak', 'Bütün-Yarım-Çeyrek', 'Çarpma & Bölmeye Giriş', '⏰ Analog Saatler'],
  },
  3: {
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-amber-500/10',
    borderColor: 'border-amber-200/80 dark:border-amber-900/50 hover:border-amber-500 dark:hover:border-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    accentColor: '#f59e0b',
    icon: <Compass className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-3.png',
    highlightTopics: ['1000’e Kadar Sayılar', 'Birim Kesirler (1/n)', 'Köşe-Yüz-Ayrıt', 'Simetri Doğrusu & Kodlama'],
  },
  4: {
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-amber-500/10',
    borderColor: 'border-amber-200/80 dark:border-amber-900/50 hover:border-amber-500 dark:hover:border-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    accentColor: '#f59e0b',
    icon: <Target className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-4.png',
    highlightTopics: ['6 Basamaklı Sayılar & Bölük', 'Denk Kesirler & 4 İşlem', 'Açılar Bir Dönme Miktarıdır', 'Ayna Simetrisi & FeTeMM'],
  },

  // Ortaokul Sınıfları (3D Kil Geometrik ve Möbius Numaraları — Canlı Turkuaz Teması)
  5: {
    gradient: 'from-cyan-600 via-teal-500 to-blue-600',
    bgGradient: 'from-cyan-500/10 via-teal-500/5 to-blue-500/10',
    borderColor: 'border-cyan-200/80 dark:border-cyan-900/50 hover:border-cyan-500 dark:hover:border-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    accentColor: '#06b6d4',
    icon: <Box className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-5.png',
    highlightTopics: ['Geometrik Şekiller', 'Milyonlar & Basamak', 'Prizma Hacmi', 'Kesirler & Yüzdeler'],
  },
  6: {
    gradient: 'from-cyan-600 via-teal-500 to-blue-600',
    bgGradient: 'from-cyan-500/10 via-teal-500/5 to-blue-500/10',
    borderColor: 'border-cyan-200/80 dark:border-cyan-900/50 hover:border-cyan-500 dark:hover:border-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    accentColor: '#06b6d4',
    icon: <Compass className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-6.png',
    highlightTopics: ['Asal Çarpan Ağacı', 'Kümeler & Tam Sayılar', 'Kesir Dört İşlemi', 'Açılar (Z/U Kuralı)'],
  },
  7: {
    gradient: 'from-cyan-600 via-teal-500 to-blue-600',
    bgGradient: 'from-cyan-500/10 via-teal-500/5 to-blue-500/10',
    borderColor: 'border-cyan-200/80 dark:border-cyan-900/50 hover:border-cyan-500 dark:hover:border-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    accentColor: '#06b6d4',
    icon: <TrendingUp className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-7.png',
    highlightTopics: ['Tam Sayı Pulları', 'Rasyonel Sayılar', 'Terazi & Denklem', 'Orantı & Yüzdeler'],
  },
  8: {
    gradient: 'from-cyan-600 via-teal-500 to-blue-600',
    bgGradient: 'from-cyan-500/10 via-teal-500/5 to-blue-500/10',
    borderColor: 'border-cyan-200/80 dark:border-cyan-900/50 hover:border-cyan-500 dark:hover:border-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    accentColor: '#06b6d4',
    icon: <Percent className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-8.png',
    highlightTopics: ['EBOB - EKOK', 'Kareköklü Sayılar', 'Özdeşlikler & Olasılık', 'Doğru Eğimi & Pisagor'],
  },

  // Lise Sınıfları (MEB TYMM 2026 Resmî Programı — Asil Mor ve Fuşya Teması)
  0: {
    gradient: 'from-purple-600 via-fuchsia-600 to-indigo-600',
    bgGradient: 'from-purple-500/10 via-fuchsia-500/5 to-indigo-500/10',
    borderColor: 'border-purple-200/80 dark:border-purple-900/50 hover:border-purple-500 dark:hover:border-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    accentColor: '#9333ea',
    icon: <GraduationCap className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/hazirlik-h-icon.png',
    tag: '🎓 Hazırlık Sınıfı (108 Saat)',
    highlightTopics: ['Doğrusal İlişkiler & Eğim', 'Mantıksal Çıkarım & Ağaç Şeması', 'Kriptoloji & Sezar Şifresi', 'Geometrik İnşalar & Fraktallar'],
  },
  9: {
    gradient: 'from-purple-600 via-fuchsia-600 to-indigo-600',
    bgGradient: 'from-purple-500/10 via-fuchsia-500/5 to-indigo-500/10',
    borderColor: 'border-purple-200/80 dark:border-purple-900/50 hover:border-purple-500 dark:hover:border-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    accentColor: '#9333ea',
    icon: <BookOpen className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-9.png',
    highlightTopics: ['Gerçek Sayılar & Aralıklar', 'Doğrusal Fonk. & Mutlak Değer', 'Dönüşümler & Benzerlik', 'Algoritma & Çizge Kuramı'],
  },
  10: {
    gradient: 'from-purple-600 via-fuchsia-600 to-indigo-600',
    bgGradient: 'from-purple-500/10 via-fuchsia-500/5 to-indigo-500/10',
    borderColor: 'border-purple-200/80 dark:border-purple-900/50 hover:border-purple-500 dark:hover:border-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    accentColor: '#9333ea',
    icon: <Shapes className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-10.png',
    highlightTopics: ['Birim Çember & Trigonometri', 'Paraboller & Ters Fonksiyon', 'Kombinasyon & Pascal Üçgeni', 'Analitik Eğim & Bayes Teoremi'],
  },
  11: {
    gradient: 'from-purple-600 via-fuchsia-600 to-indigo-600',
    bgGradient: 'from-purple-500/10 via-fuchsia-500/5 to-indigo-500/10',
    borderColor: 'border-purple-200/80 dark:border-purple-900/50 hover:border-purple-500 dark:hover:border-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    accentColor: '#9333ea',
    icon: <GraduationCap className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-11.png',
    highlightTopics: ['Korelasyon & Saçılım', 'Dışbükey Dörtgen & Çokgen', 'Trigonometrik Dalgalar & Periyot', 'Üstel & Logaritma (e Sayısı)'],
  },
  12: {
    gradient: 'from-purple-600 via-fuchsia-600 to-indigo-600',
    bgGradient: 'from-purple-500/10 via-fuchsia-500/5 to-indigo-500/10',
    borderColor: 'border-purple-200/80 dark:border-purple-900/50 hover:border-purple-500 dark:hover:border-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    accentColor: '#9333ea',
    icon: <TrendingUp className="w-7 h-7 text-white" />,
    imageSrc: '/images/grades/grade-12.png',
    highlightTopics: ['Aritmetik & Geometrik Diziler', 'Polinom Fonksiyon Grafikleri', 'Çemberde Açılar & Katı Cisimler', 'Limit, Türev & Optimizasyon'],
  },
};

export function GradeSelector() {
  const { selectedLevel, selectGrade, completedActivityIds, goBack } = useCurriculum();

  if (!selectedLevel) return null;

  const gradesInLevel = selectedLevel.grades;
  const totalActivitiesInLevel = gradesInLevel.reduce((acc, g) => {
    let count = 0;
    g.themes.forEach((t) => {
      t.topics.forEach((top) => {
        count += top.activities.length;
      });
    });
    return acc + count;
  }, 0);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#faf8f5] dark:bg-[#121316] relative overflow-hidden py-4 sm:py-6 select-none">
      {/* Yumuşak Kil ve Kademe Işıkları */}
      {selectedLevel.id === 'ilkokul' && (
        <>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-200/40 dark:bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-orange-200/30 dark:bg-orange-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        </>
      )}
      {selectedLevel.id === 'ortaokul' && (
        <>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-200/40 dark:bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        </>
      )}
      {selectedLevel.id === 'lise' && (
        <>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-fuchsia-200/30 dark:bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        </>
      )}

      <div className="w-full px-4 sm:px-10 lg:px-16 space-y-8 animate-in fade-in duration-300 relative z-10">
        {/* 1. ÜST HERO BAŞLIK BÖLÜMÜ */}
        <div className="relative rounded-[32px] p-6 sm:p-8 bg-gradient-to-r from-card via-card to-muted/40 border-2 border-border/80 shadow-soft overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10 space-y-3 max-w-2xl">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-foreground text-xs font-bold shadow-xs hover:bg-white transition-all cursor-pointer border border-border/60 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Kademelere Dön (Ana Sayfa)</span>
            </button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-black text-xs border border-primary/20">
              {selectedLevel.title} Kademesi
            </span>
            <span className="text-xs text-muted-foreground font-semibold">
              T.C. MEB TYMM 2026 Resmî Öğretim Programı
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
            {selectedLevel.title} Sınıf Seviyesi Seçimi
          </h1>

          <p className="text-xs sm:text-sm text-foreground/80 font-medium leading-relaxed">
            {selectedLevel.id === 'ilkokul'
              ? '1. sınıfta okuma gerektirmeyen meyve/hayvan sayma oyunları, sesli yönlendirmeler ve 1-4. sınıf TYMM görev kartları sizi bekliyor!'
              : 'Aşağıdaki sınıflardan birini seçerek ilgili sınıfın TYMM temalarını, öğrenme çıktılarını ve interaktif animasyonlu görev kartlarını inceleyebilirsiniz.'}
          </p>
        </div>

        {/* 3D Kil Görsel Rozeti */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden p-2 bg-gradient-to-b from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-border/80 shadow-lg shrink-0 group" style={{ position: 'relative' }}>
          <Image
            src={
              selectedLevel.id === 'ilkokul'
                ? '/images/ilkokul-3d.png'
                : selectedLevel.id === 'lise'
                ? '/images/lise-3d.png'
                : '/images/ortaokul-3d.png'
            }
            alt={`${selectedLevel.title} 3D Kil İllüstrasyonu`}
            fill
            sizes="176px"
            className="object-contain p-1 drop-shadow-md group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      {/* 2. SINIF KARTLARI (ÖNCE GELİR) */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <span>Keşfetmek İstediğiniz Sınıfı Seçin</span>
        </h2>

        <div className="flex flex-wrap md:flex-nowrap justify-center items-stretch gap-3 lg:gap-4 w-full">
          {gradesInLevel.map((grade) => {
            const visual = GRADE_VISUALS[grade.gradeNumber] || {
              gradient: 'from-blue-600 to-indigo-600',
              bgGradient: 'from-blue-500/5 to-indigo-500/5',
              borderColor: 'hover:border-blue-500/60',
              badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
              accentColor: '#3b82f6',
              icon: <BookOpen className="w-7 h-7 text-white" />,
              highlightTopics: grade.topics.map((t) => t.title),
            };

            let totalActs = 0;
            grade.themes.forEach((t) => {
              t.topics.forEach((top) => {
                totalActs += top.activities.length;
              });
            });

            return (
              <button
                key={grade.gradeNumber}
                onClick={() => selectGrade(grade.gradeNumber as GradeId)}
                className={`group relative flex flex-col items-center text-center p-4 sm:p-5 rounded-3xl bg-card border-2 ${visual.borderColor} shadow-soft hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer overflow-hidden flex-1 min-w-[140px] sm:min-w-[160px] max-w-[240px]`}
              >
                {/* Arka Plan Hafif Renk Vurgusu */}
                <div className={`absolute inset-0 bg-gradient-to-br ${visual.bgGradient} opacity-60 pointer-events-none`} />

                {/* Sınıf 3D Kil Görseli veya İkon Rozeti */}
                {visual.imageSrc ? (
                  <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden p-1 bg-[#f6f4ee] dark:bg-[#1a1b20] border border-border/80 shadow-md group-hover:scale-105 transition-transform shrink-0 mb-3 mx-auto flex items-center justify-center" style={{ position: 'relative' }}>
                    <Image
                      src={visual.imageSrc}
                      alt={`${grade.title} 3D Kil Figürü`}
                      fill
                      sizes="88px"
                      className="object-contain drop-shadow-sm"
                    />
                  </div>
                ) : (
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${visual.gradient} flex items-center justify-center font-black text-xl mb-3 mx-auto group-hover:scale-110 shadow-md transition-transform shrink-0`}>
                    {visual.icon}
                  </div>
                )}

                <div className="space-y-1 mb-3 flex flex-col items-center text-center w-full">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${visual.badgeBg}`}>
                      {totalActs || 19} Görev
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground">
                      {grade.themes.length} Tema
                    </span>
                  </div>

                  {visual.tag && (
                    <div className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black text-[9px]">
                      {visual.tag}
                    </div>
                  )}

                  <h3 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-primary transition-colors text-center">
                    {grade.title}
                  </h3>
                </div>

                {/* Buton Şeridi (Ortalanmış ve Kademeye Özel Renkli) */}
                <div
                  className="w-full mt-auto pt-2.5 border-t border-border/70 flex items-center justify-center gap-1.5 text-[11px] font-black transition-colors group-hover:translate-x-0.5"
                  style={{ color: visual.accentColor }}
                >
                  <span className="truncate">{grade.gradeNumber === 0 ? 'Hazırlık Keşfet' : `${grade.gradeNumber}. Sınıf Keşfet`}</span>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all group-hover:scale-110 shrink-0"
                    style={{ backgroundColor: `${visual.accentColor}20`, color: visual.accentColor }}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. EN ALT: HEDEFLER & İLERLEME ÖZETİ PANOSU */}
      <div className="p-6 rounded-3xl bg-card border-2 border-border/80 shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-border/60">
          <div className="flex items-center gap-2 font-black text-foreground text-sm">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <span>{selectedLevel.title} TYMM Görev İlerleme Durumu</span>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            Toplam {totalActivitiesInLevel} Görev Kartı
          </span>
        </div>

        <div className="space-y-4 pt-1">
          {gradesInLevel.map((gradeData) => {
            const gNum = gradeData.gradeNumber;
            let totalActs = 0;
            gradeData.themes.forEach((t) => {
              t.topics.forEach((top) => {
                totalActs += top.activities.length;
              });
            });
            const actualTotal = totalActs || 24;
            const completedInGrade = completedActivityIds.filter((id) =>
              gradeData.themes.some((t) =>
                t.topics.some((top) => top.activities.some((a) => a.id === id))
              )
            ).length;
            const pct = Math.round((completedInGrade / actualTotal) * 100);

            return (
              <div
                key={gNum}
                onClick={() => selectGrade(gNum as GradeId)}
                className="space-y-1.5 cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors text-sm">
                    {gNum === 0 ? 'Hazırlık Sınıfı' : `${gNum}. Sınıf`}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 font-bold font-mono">
                    {completedInGrade}/{actualTotal} • %{pct}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                    style={{ width: `${Math.max(pct, 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            onClick={() => {
              if (confirm('Haftalık görev kartı ilerleme özetini sıfırlamak istiyor musunuz?')) {
                localStorage.removeItem('matematik_tamamlanan_etkinlikler_v3');
                window.location.reload();
              }
            }}
            className="px-5 py-2 rounded-full border border-border/80 hover:bg-muted text-slate-700 dark:text-slate-300 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Haftalık özeti sıfırla
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
