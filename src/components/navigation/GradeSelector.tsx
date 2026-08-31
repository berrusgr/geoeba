'use client';

import React from 'react';
import Image from 'next/image';
import { useCurriculum } from '@/state/CurriculumContext';
import { GradeId } from '@/types/curriculum';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Box,
  Compass,
  TrendingUp,
  Percent,
  Shapes,
  Smile,
  Target,
} from 'lucide-react';

const GRADE_VISUALS: Record<
  number,
  {
    bgCard: string;
    borderCard: string;
    badgeBg: string;
    accentColor: string;
    icon: React.ReactNode;
    imageSrc?: string;
  }
> = {
  // İlkokul Sınıfları (Pastel Bal & Amber)
  1: {
    bgCard: 'bg-[#fffbeb] hover:bg-[#fef3c7]/90 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
    borderCard: 'border-[#fde68a] dark:border-amber-900/40 hover:border-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20',
    accentColor: '#d97706',
    icon: <Smile className="w-6 h-6 text-amber-600" />,
    imageSrc: '/images/grades/grade-1.png',
  },
  2: {
    bgCard: 'bg-[#fffbeb] hover:bg-[#fef3c7]/90 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
    borderCard: 'border-[#fde68a] dark:border-amber-900/40 hover:border-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20',
    accentColor: '#d97706',
    icon: <Shapes className="w-6 h-6 text-amber-600" />,
    imageSrc: '/images/grades/grade-2.png',
  },
  3: {
    bgCard: 'bg-[#fffbeb] hover:bg-[#fef3c7]/90 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
    borderCard: 'border-[#fde68a] dark:border-amber-900/40 hover:border-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20',
    accentColor: '#d97706',
    icon: <Compass className="w-6 h-6 text-amber-600" />,
    imageSrc: '/images/grades/grade-3.png',
  },
  4: {
    bgCard: 'bg-[#fffbeb] hover:bg-[#fef3c7]/90 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
    borderCard: 'border-[#fde68a] dark:border-amber-900/40 hover:border-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20',
    accentColor: '#d97706',
    icon: <Target className="w-6 h-6 text-amber-600" />,
    imageSrc: '/images/grades/grade-4.png',
  },

  // Ortaokul Sınıfları (Pastel Mavi & Turkuaz)
  5: {
    bgCard: 'bg-[#f0f6ff] hover:bg-[#e4efff]/90 dark:bg-blue-950/20 dark:hover:bg-blue-950/30',
    borderCard: 'border-[#dbeafe] dark:border-blue-900/40 hover:border-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20',
    accentColor: '#2563eb',
    icon: <Box className="w-6 h-6 text-blue-600" />,
    imageSrc: '/images/grades/grade-5.png',
  },
  6: {
    bgCard: 'bg-[#f0f6ff] hover:bg-[#e4efff]/90 dark:bg-blue-950/20 dark:hover:bg-blue-950/30',
    borderCard: 'border-[#dbeafe] dark:border-blue-900/40 hover:border-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20',
    accentColor: '#2563eb',
    icon: <Compass className="w-6 h-6 text-blue-600" />,
    imageSrc: '/images/grades/grade-6.png',
  },
  7: {
    bgCard: 'bg-[#f0f6ff] hover:bg-[#e4efff]/90 dark:bg-blue-950/20 dark:hover:bg-blue-950/30',
    borderCard: 'border-[#dbeafe] dark:border-blue-900/40 hover:border-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20',
    accentColor: '#2563eb',
    icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
    imageSrc: '/images/grades/grade-7.png',
  },
  8: {
    bgCard: 'bg-[#f0f6ff] hover:bg-[#e4efff]/90 dark:bg-blue-950/20 dark:hover:bg-blue-950/30',
    borderCard: 'border-[#dbeafe] dark:border-blue-900/40 hover:border-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20',
    accentColor: '#2563eb',
    icon: <Percent className="w-6 h-6 text-blue-600" />,
    imageSrc: '/images/grades/grade-8.png',
  },

  // Lise Sınıfları (Pastel Mor & Fuşya)
  0: {
    bgCard: 'bg-[#faf5ff] hover:bg-[#f3e8ff]/90 dark:bg-purple-950/20 dark:hover:bg-purple-950/30',
    borderCard: 'border-[#f3e8ff] dark:border-purple-900/40 hover:border-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/20',
    accentColor: '#9333ea',
    icon: <GraduationCap className="w-6 h-6 text-purple-600" />,
    imageSrc: '/images/grades/hazirlik-h-icon.png',
  },
  9: {
    bgCard: 'bg-[#faf5ff] hover:bg-[#f3e8ff]/90 dark:bg-purple-950/20 dark:hover:bg-purple-950/30',
    borderCard: 'border-[#f3e8ff] dark:border-purple-900/40 hover:border-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/20',
    accentColor: '#9333ea',
    icon: <BookOpen className="w-6 h-6 text-purple-600" />,
    imageSrc: '/images/grades/grade-9.png',
  },
  10: {
    bgCard: 'bg-[#faf5ff] hover:bg-[#f3e8ff]/90 dark:bg-purple-950/20 dark:hover:bg-purple-950/30',
    borderCard: 'border-[#f3e8ff] dark:border-purple-900/40 hover:border-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/20',
    accentColor: '#9333ea',
    icon: <Shapes className="w-6 h-6 text-purple-600" />,
    imageSrc: '/images/grades/grade-10.png',
  },
  11: {
    bgCard: 'bg-[#faf5ff] hover:bg-[#f3e8ff]/90 dark:bg-purple-950/20 dark:hover:bg-purple-950/30',
    borderCard: 'border-[#f3e8ff] dark:border-purple-900/40 hover:border-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/20',
    accentColor: '#9333ea',
    icon: <GraduationCap className="w-6 h-6 text-purple-600" />,
    imageSrc: '/images/grades/grade-11.png',
  },
  12: {
    bgCard: 'bg-[#faf5ff] hover:bg-[#f3e8ff]/90 dark:bg-purple-950/20 dark:hover:bg-purple-950/30',
    borderCard: 'border-[#f3e8ff] dark:border-purple-900/40 hover:border-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/20',
    accentColor: '#9333ea',
    icon: <TrendingUp className="w-6 h-6 text-purple-600" />,
    imageSrc: '/images/grades/grade-12.png',
  },
};

export function GradeSelector() {
  const { selectedLevel, selectLevel, selectGrade, goBack } = useCurriculum();

  if (!selectedLevel) return null;

  const gradesInLevel = selectedLevel.grades;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#fafbfc] dark:bg-[#0f1115] text-slate-800 dark:text-slate-100 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 select-none flex flex-col items-center justify-start">
      <div className="w-full max-w-6xl space-y-5 animate-in fade-in duration-200">
        
        {/* ÜST BAŞLIK ALANI */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-200/80 via-rose-100/70 to-sky-100/70 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 p-5 rounded-2xl border border-amber-200/60 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Geri Dön"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-red-600 dark:text-red-400 text-xs font-black border border-red-200/60">
                  {selectedLevel.title}
                </span>
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  Sınıf Seçimi
                </h1>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Çalışmak istediğiniz sınıf seviyesine tıklayınız
              </p>
            </div>
          </div>
        </div>

        {/* SINIF SEÇİM KARTLARI GRİDİ */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${gradesInLevel.length === 5 ? 'lg:grid-cols-5 md:grid-cols-3' : 'lg:grid-cols-4'} gap-5`}>
          {gradesInLevel.map((grade) => {
            const visual = GRADE_VISUALS[grade.gradeNumber] || {
              bgCard: 'bg-slate-50 dark:bg-slate-900',
              borderCard: 'border-slate-200 dark:border-slate-800',
              badgeBg: 'bg-slate-200 text-slate-700',
              accentColor: '#3b82f6',
              icon: <BookOpen className="w-6 h-6" />,
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
                className={`group relative h-52 flex flex-col justify-between p-6 rounded-3xl ${visual.bgCard} border-2 ${visual.borderCard} shadow-2xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden text-left`}
              >
                {/* Sağ Alt Silik Filigran Logo */}
                {visual.imageSrc && (
                  <div className="absolute -bottom-4 -right-4 w-36 h-36 opacity-20 dark:opacity-15 pointer-events-none group-hover:scale-105 group-hover:opacity-35 transition-all duration-300">
                    <Image
                      src={visual.imageSrc}
                      alt=""
                      fill
                      sizes="144px"
                      className="object-contain"
                    />
                  </div>
                )}

                {/* Üst Rozet ve İkon Alanı */}
                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-xs border border-slate-200/60 dark:border-slate-700/60">
                    {visual.icon}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${visual.badgeBg}`}>
                      {grade.themes.length} Tema
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                      {totalActs || 18} Görev
                    </span>
                  </div>
                </div>

                {/* Bilgi ve Başlık */}
                <div className="space-y-1 relative z-10">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                    {grade.title}
                  </h3>
                </div>

                {/* Giriş Buton Şeridi */}
                <div
                  className="w-full pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-black transition-colors relative z-10"
                  style={{ color: visual.accentColor }}
                >
                  <span>Konuları Aç</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
