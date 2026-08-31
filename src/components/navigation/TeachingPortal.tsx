'use client';

import React, { useState, useMemo } from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import { MathCategory, Topic, Activity, TYMMTheme, GradeId } from '@/types/curriculum';
import { DiscoveryModal } from './DiscoveryModal';
import {
  Search,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Trophy,
  CheckCircle2,
  Play,
  RotateCcw,
  Compass,
  Layers,
  Shapes,
  Divide,
  Activity as ActivityIcon,
  ChevronRight,
  TrendingUp,
  Target,
  Percent,
  Sigma,
  Variable,
  Hash,
  Ruler,
  BarChart3,
  Award,
  Box,
  GraduationCap,
  Clock,
  CheckCircle,
} from 'lucide-react';

const CATEGORY_TABS: {
  id: MathCategory;
  label: string;
  badgeBg: string;
  badgeText: string;
  activeBorder: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'hepsi',
    label: 'Tüm Temalar',
    badgeBg: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
    badgeText: 'text-slate-900 dark:text-slate-100',
    activeBorder: 'border-slate-900 dark:border-slate-100',
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    id: 'geometri',
    label: 'Geometri & Şekiller',
    badgeBg: 'bg-rose-500 text-white',
    badgeText: 'text-rose-600 dark:text-rose-400',
    activeBorder: 'border-rose-500 shadow-rose-500/25',
    icon: <Shapes className="w-4 h-4" />,
  },
  {
    id: 'sayi',
    label: 'Sayılar & Nicelikler',
    badgeBg: 'bg-amber-500 text-white',
    badgeText: 'text-amber-600 dark:text-amber-400',
    activeBorder: 'border-amber-500 shadow-amber-500/25',
    icon: <Percent className="w-4 h-4" />,
  },
  {
    id: 'olcme',
    label: 'Ölçme & Hacim',
    badgeBg: 'bg-emerald-500 text-white',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    activeBorder: 'border-emerald-500 shadow-emerald-500/25',
    icon: <Box className="w-4 h-4" />,
  },
  {
    id: 'cebir',
    label: 'Cebirsel Düşünme',
    badgeBg: 'bg-blue-600 text-white',
    badgeText: 'text-blue-600 dark:text-blue-400',
    activeBorder: 'border-blue-500 shadow-blue-500/25',
    icon: <span className="font-mono font-bold text-xs">(x)</span>,
  },
  {
    id: 'istatistik',
    label: 'İstatistik & Olasılık',
    badgeBg: 'bg-cyan-500 text-white',
    badgeText: 'text-cyan-600 dark:text-cyan-400',
    activeBorder: 'border-cyan-500 shadow-cyan-500/25',
    icon: <Sigma className="w-4 h-4" />,
  },
];

// Kategori Eşdeğerlik Kontrolü
function isCategoryMatch(rawCat: string | undefined, targetCat: MathCategory): boolean {
  if (!rawCat) return false;
  const c = rawCat.toLowerCase().trim();
  if (c === targetCat) return true;
  if (targetCat === 'istatistik' && (c === 'olasilik' || c === 'veri' || c === 'istatistik')) return true;
  if (targetCat === 'cebir' && (c === 'fonksiyon' || c === 'cebir' || c === 'denklem')) return true;
  if (targetCat === 'geometri' && (c === 'trigonometri' || c === 'geometri' || c === 'uzamsal')) return true;
  if (targetCat === 'sayi' && (c === 'islemler' || c === 'sayi' || c === 'aritmetik')) return true;
  if (targetCat === 'olcme' && (c === 'olcme' || c === 'hacim' || c === 'alan')) return true;
  return false;
}

// Konu Düzeyinde Alana Uygunluk Değerlendirmesi
function doesTopicMatchCategory(topic: Topic, targetCat: MathCategory): boolean {
  // 1. Doğrudan konu kategorisi
  if (isCategoryMatch(topic.category, targetCat)) return true;

  // 2. Konu etkinliklerinin çoğunluğu
  if (topic.activities && topic.activities.length > 0) {
    const matchingActs = topic.activities.filter((a) => isCategoryMatch(a.category, targetCat)).length;
    if (matchingActs / topic.activities.length >= 0.5) return true;
  }

  // 3. Konu başlığı ve kazanım metninde anahtar kavram ağırlığı
  const text = `${topic.title || ''} ${topic.badge || ''} ${topic.description || ''} ${(topic.learningOutcomes || []).join(' ')}`.toLowerCase();
  
  if (targetCat === 'geometri') {
    return (
      text.includes('geometri') ||
      text.includes('şekil') ||
      text.includes('üçgen') ||
      text.includes('dörtgen') ||
      text.includes('çokgen') ||
      text.includes('çember') ||
      text.includes('daire') ||
      text.includes('prizma') ||
      text.includes('piramit') ||
      text.includes('katı cisim') ||
      text.includes('simetri') ||
      text.includes('dönüşüm') ||
      text.includes('pisagor') ||
      text.includes('trigonometri') ||
      text.includes('açı') ||
      text.includes('analitik')
    );
  }

  if (targetCat === 'sayi') {
    return (
      text.includes('sayı') ||
      text.includes('basamak') ||
      text.includes('kesir') ||
      text.includes('ondalık') ||
      text.includes('tam sayı') ||
      text.includes('rasyonel') ||
      text.includes('üslü') ||
      text.includes('köklü') ||
      text.includes('çarpan') ||
      text.includes('katlar') ||
      text.includes('ebob') ||
      text.includes('oran') ||
      text.includes('yüzde') ||
      text.includes('küme') ||
      text.includes('toplama') ||
      text.includes('çıkarma') ||
      text.includes('çarpma') ||
      text.includes('bölme')
    );
  }

  if (targetCat === 'olcme') {
    return (
      text.includes('ölçme') ||
      text.includes('hacim') ||
      text.includes('alan') ||
      text.includes('çevre') ||
      text.includes('uzunluk') ||
      text.includes('zaman') ||
      text.includes('saat') ||
      text.includes('para') ||
      text.includes('lira') ||
      text.includes('kütle') ||
      text.includes('sıvı') ||
      text.includes('litre') ||
      text.includes('kapasite')
    );
  }

  if (targetCat === 'cebir') {
    return (
      text.includes('cebir') ||
      text.includes('denklem') ||
      text.includes('eşitlik') ||
      text.includes('fonksiyon') ||
      text.includes('özdeşlik') ||
      text.includes('polinom') ||
      text.includes('logaritma') ||
      text.includes('dizi') ||
      text.includes('türev') ||
      text.includes('limit') ||
      text.includes('terazi') ||
      text.includes('örüntü') ||
      text.includes('parabol') ||
      text.includes('eğim')
    );
  }

  if (targetCat === 'istatistik') {
    return (
      text.includes('olasılık') ||
      text.includes('istatistik') ||
      text.includes('veri') ||
      text.includes('grafik') ||
      text.includes('çetele') ||
      text.includes('sıklık') ||
      text.includes('ortalama') ||
      text.includes('medyan') ||
      text.includes('kombinasyon') ||
      text.includes('permütasyon') ||
      text.includes('binom') ||
      text.includes('örneklem')
    );
  }

  return false;
}

// Kategori ve Tema Eşleme Yardımcısı (En Az %60 Uygunluk Eşiği Kuralı)
function isThemeMatchingCategory(theme: TYMMTheme, selectedCategory: MathCategory): boolean {
  if (selectedCategory === 'hepsi') return true;

  // 1. Temanın Birincil Alanı (100% Eşleşme)
  if (isCategoryMatch(theme.category, selectedCategory)) {
    return true;
  }

  // 2. MEB Resmî Kod Eşlemesi (100% Eşleşme)
  const code = (theme.code || '').toUpperCase();
  if (selectedCategory === 'sayi' && (code.includes('SAYI') || code.includes('.1'))) return true;
  if (selectedCategory === 'cebir' && (code.includes('CEB') || code.includes('FONK') || code.includes('.2'))) return true;
  if (selectedCategory === 'geometri' && (code.includes('GEO') || code.includes('UZAM') || code.includes('TRIG') || code.includes('TRİG') || code.includes('.3'))) return true;
  if (selectedCategory === 'olcme' && (code.includes('OLC') || code.includes('ÖLÇ') || code.includes('HAC') || code.includes('.4'))) return true;
  if (selectedCategory === 'istatistik' && (code.includes('VERI') || code.includes('VERİ') || code.includes('IST') || code.includes('İST') || code.includes('OLA') || code.includes('.5') || code.includes('.6'))) return true;

  // 3. İkincil / Çapraz Alan Eşleşmesi İçin En Az %60 (0.60) Uygunluk Eşiği
  if (theme.topics && theme.topics.length > 0) {
    const matchingTopics = theme.topics.filter((topic) => doesTopicMatchCategory(topic, selectedCategory));
    const relevanceRatio = matchingTopics.length / theme.topics.length;

    // Kullanıcının kuralı: İkinci bir başlığa girmesi için temanın en az %60'ı o alanla ilgili olmalıdır!
    if (relevanceRatio >= 0.60) {
      return true;
    }
  }

  return false;
}

export function TeachingPortal() {
  const {
    selectedLevel,
    selectedGrade,
    selectLevel,
    selectGrade,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectActivity,
    activeModalTopic,
    setActiveModalTopic,
    completedActivityIds,
    goBack,
  } = useCurriculum();

  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);

  // Kademeye göre mevcut sınıflar
  const availableGrades: GradeId[] = useMemo(() => {
    if (!selectedLevel) return [5, 6, 7, 8];
    return selectedLevel.grades.map((g) => g.gradeNumber);
  }, [selectedLevel]);

  // Seçili sınıftaki temalar ve alt konular
  const currentThemes: TYMMTheme[] = useMemo(() => {
    if (!selectedGrade) return [];
    return selectedGrade.themes || [];
  }, [selectedGrade]);

  const allTopicsInGrade: Topic[] = useMemo(() => {
    if (!selectedGrade) return [];
    const list: Topic[] = [...(selectedGrade.topics || [])];
    for (const th of selectedGrade.themes || []) {
      if (th.topics) list.push(...th.topics);
    }
    return list;
  }, [selectedGrade]);

  // Kategori başına tema sayısı hesaplama
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { hepsi: currentThemes.length };
    CATEGORY_TABS.forEach((tab) => {
      if (tab.id !== 'hepsi') {
        counts[tab.id] = currentThemes.filter((th) => isThemeMatchingCategory(th, tab.id)).length;
      }
    });
    return counts;
  }, [currentThemes]);

  // Arama ve kategori filtreleme
  const filteredThemes = useMemo(() => {
    return currentThemes.filter((th) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        th.fullTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        th.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        th.topics.some((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = isThemeMatchingCategory(th, selectedCategory);

      return matchSearch && matchCat;
    });
  }, [currentThemes, searchQuery, selectedCategory]);

  const totalActivitiesCount = allTopicsInGrade.reduce((acc, t) => acc + t.activities.length, 0) || 24;
  const completedCount = completedActivityIds.length || 2;
  const progressPercent = Math.round((completedCount / totalActivitiesCount) * 100) || 5;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#faf8f5] dark:bg-[#121316] relative overflow-hidden py-4 sm:py-6 select-none flex flex-col items-center justify-start">
      {/* Yumuşak Kil ve Kademe Işıkları */}
      {selectedLevel?.id === 'ilkokul' && (
        <>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-200/40 dark:bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-orange-200/30 dark:bg-orange-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        </>
      )}
      {selectedLevel?.id === 'ortaokul' && (
        <>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-200/40 dark:bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        </>
      )}
      {selectedLevel?.id === 'lise' && (
        <>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-fuchsia-200/30 dark:bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        </>
      )}

      <div className="w-full max-w-6xl space-y-6 animate-in fade-in duration-300 relative z-10 px-4 sm:px-6 lg:px-8">
        {/* 1. ÜST BAŞLIK ALANI & SINIF GEÇİŞ ŞERİDİ */}
        <div className="bg-gradient-to-r from-amber-200/80 via-rose-100/70 to-sky-100/70 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border border-amber-200/60 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Geri Dön"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                {selectedLevel?.title} &gt; {selectedGrade?.title}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {selectedGrade ? selectedGrade.title : '5. Sınıf'} Matematik
              </h1>
            </div>
          </div>

          {/* Sınıf Seçim Butonları */}
          <div className="flex items-center gap-1 p-1 bg-white/75 dark:bg-slate-800/75 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            {availableGrades.map((gNum) => (
              <button
                key={gNum}
                onClick={() => selectGrade(gNum)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedGrade?.gradeNumber === gNum
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {gNum}. Sınıf
              </button>
            ))}
          </div>
        </div>

        {/* 3. KATEGORİ FİLTRE ŞERİDİ (Sığacak Şekilde Kompakt & Scrollsuz) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full select-none">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.id;
            const count = categoryCounts[tab.id] ?? 0;

            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer ${
                  isActive
                    ? `bg-card text-foreground border-2 ${tab.activeBorder} shadow-sm ring-1 ring-primary/20 scale-102`
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border/80 hover:border-border'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${tab.badgeBg} shadow-2xs shrink-0 text-[10px]`}>
                    {tab.icon}
                  </div>
                  <span className="truncate">{tab.label}</span>
                </div>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded-md font-black shrink-0 ${
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 5. TYMM TEMALARI VE ALT KONU LİSTESİ (MEB 2026 Resmî Sıralama) */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-500" />
              <span>{selectedGrade?.title} Matematik Temaları</span>
            </h2>
            <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-muted rounded-full">
              {filteredThemes.length} Tema
            </span>
          </div>

        {filteredThemes.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-3xl bg-card border-2 border-border/80 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto text-muted-foreground">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-foreground">
                Bu kategoride tema bulunamadı
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Seçilen kategori veya arama terimi ({selectedCategory !== 'hepsi' ? CATEGORY_TABS.find(t => t.id === selectedCategory)?.label : searchQuery}) için {selectedGrade?.title} seviyesinde doğrudan tema bulunamadı.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('hepsi');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:scale-105 transition-all cursor-pointer"
            >
              Tüm Temaları Göster ({currentThemes.length})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filteredThemes.map((theme, index) => {
              const isExpanded = expandedThemeId === theme.id || filteredThemes.length === 1;

              return (
                <div
                  key={theme.id}
                  className={`rounded-3xl border-2 transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                    isExpanded
                      ? 'bg-card border-primary shadow-lg ring-2 ring-primary/20'
                      : 'bg-card border-border/80 hover:border-border hover:shadow-md'
                  }`}
                >
                  {/* TEMA BAŞLIK KARTI */}
                  <button
                    onClick={() => setExpandedThemeId(isExpanded ? null : theme.id)}
                    className="w-full p-5 flex flex-col items-start justify-between text-left cursor-pointer group flex-1"
                  >
                    {/* Üst Satır: Tema Numarası & Ders Saati */}
                    <div className="w-full flex items-center justify-between">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-105 transition-transform font-black text-sm"
                        style={{ backgroundColor: theme.colorTheme || '#ef4444' }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      <div className="flex flex-col items-end text-[10px] font-bold text-muted-foreground leading-tight">
                        <span className="flex items-center gap-1 text-foreground">
                          <Clock className="w-3 h-3 text-primary" />
                          {theme.lessonHours} Saat
                        </span>
                        <span>{theme.outcomeCount} Çıktı</span>
                      </div>
                    </div>

                    {/* Başlık */}
                    <div className="space-y-1 w-full mt-4 flex-1 flex items-center">
                      <h3 className={`font-black text-sm sm:text-base leading-snug transition-colors ${
                        index === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground group-hover:text-primary'
                      }`}>
                        {theme.fullTitle.replace(/^MAT\.[A-Z0-9\.]+[a-z]?\.?\s*—?\s*/i, '').replace(/^MAT\.\d+\.\d+[a-z]?\.?\s*/i, '').trim()}
                      </h3>
                    </div>

                    {/* Alt Kısım Ok & Etiket */}
                    <div className="w-full flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-primary">Görevleri İncele</span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isExpanded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground'
                      }`}>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </button>

                  {/* TEMA ALT KONULARI VE GÖREV KARTLARI */}
                  {isExpanded && (
                    <div className="p-4 bg-muted/40 border-t border-border space-y-3 animate-in fade-in duration-200">
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                        Alt Modüller
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {theme.topics.map((topic) => (
                          <button
                            key={topic.id}
                            onClick={() => setActiveModalTopic(topic)}
                            className="p-3 rounded-xl bg-card border border-border/80 hover:border-primary flex items-center justify-between text-left shadow-2xs hover:shadow-xs transition-all group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-3xs group-hover:scale-105 transition-transform"
                                style={{ backgroundColor: topic.colorTheme || theme.colorTheme || '#ef4444' }}
                              >
                                <Percent className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-extrabold text-foreground text-[11px] leading-tight group-hover:text-primary transition-colors line-clamp-1">
                                  {topic.title}
                                </div>
                                <div className="text-[9px] text-muted-foreground">
                                  {topic.activities.length} Görev
                                </div>
                              </div>
                            </div>
                            <div className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-black text-[10px] group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                              Aç →
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. KEŞİF MODALI (Referans Görsel 1 Düzeni) */}
      {activeModalTopic && (
        <DiscoveryModal
          topic={activeModalTopic}
          onClose={() => setActiveModalTopic(null)}
          onLaunchActivity={(act) => selectActivity(act, true)}
        />
      )}
    </div>
    </div>
  );
}
