'use client';

import React, { useState } from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import { Topic } from '@/types/curriculum';
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  BookOpen,
  X,
  Sparkles,
  Layers,
  Shapes,
} from 'lucide-react';

export function TopicSelector() {
  const { selectedGrade, selectTopic, goBack } = useCurriculum();
  const [activeExplainTopic, setActiveExplainTopic] = useState<Topic | null>(null);

  if (!selectedGrade) return null;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#faf8f5] dark:bg-[#121316] relative overflow-hidden py-4 sm:py-6 select-none">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-200/30 dark:bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8 animate-in fade-in duration-300 relative z-10">
        {/* Üst Başlık ve Geri Dön Butonu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sınıf Seçimine Dön</span>
            </button>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              {selectedGrade.title} Matematik Konuları
            </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Konu anlatımlarını incele, renkli formülleri gör ve etkileşimli çalışma alanında deneylere başla.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500/15 via-purple-500/15 to-pink-500/15 text-primary border border-primary/25 text-xs font-extrabold self-start sm:self-auto flex items-center gap-2 shadow-2xs">
          <Layers className="w-4 h-4 text-purple-500" />
          <span>{selectedGrade.topics.length} Konu Modülü</span>
        </div>
      </div>

      {/* Konu Kartları Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selectedGrade.topics.map((topic) => (
          <div
            key={topic.id}
            className="flex flex-col p-6 rounded-3xl bg-card border-2 border-border/80 hover:border-primary shadow-soft hover:shadow-xl transition-all duration-200 space-y-4 relative overflow-hidden"
          >
            {/* Üst Renkli Çizgi */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: topic.colorTheme || '#3b82f6' }}
            />

            {/* Üst Başlık & Rozet */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="space-y-1.5">
                {topic.badge && (
                  <span
                    className="inline-block px-3 py-0.5 rounded-full text-white text-[10px] font-black uppercase tracking-wider shadow-xs"
                    style={{ backgroundColor: topic.colorTheme || '#3b82f6' }}
                  >
                    {topic.badge}
                  </span>
                )}
                <h3 className="text-xl font-extrabold text-foreground">{topic.title}</h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-muted text-[11px] font-black text-foreground shrink-0 shadow-2xs">
                {topic.activities.length} Etkinlik
              </span>
            </div>

            {/* Kısa Açıklama */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {topic.description}
            </p>

            {/* Renkli Temel Formül / Kural Kutusu */}
            {topic.keyFormula && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border-2 border-amber-400/30 flex items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Önemli Formül / Kural
                  </div>
                  <div className="font-mono text-xs font-black text-foreground">
                    {topic.keyFormula}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Konu Anlatımı Özeti */}
            {topic.summary && (
              <div className="text-xs text-foreground/85 bg-muted/50 p-3.5 rounded-2xl border border-border/60 leading-relaxed font-medium">
                <strong className="text-foreground font-black">Konu Özeti: </strong>
                {topic.summary}
              </div>
            )}

            {/* Öğrenme Kazanımları */}
            {topic.learningOutcomes.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                  Kazanımlar
                </div>
                {topic.learningOutcomes.slice(0, 2).map((outcome, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="font-medium">{outcome}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Aksiyon Butonları */}
            <div className="mt-auto pt-4 border-t border-border/60 flex items-center justify-between gap-2">
              <button
                onClick={() => setActiveExplainTopic(topic)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all"
              >
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>Konu Anlatımı</span>
              </button>

              <button
                onClick={() => selectTopic(topic.id)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:opacity-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Çalışma Alanına Gir</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detaylı Konu Anlatımı Modalı */}
      {activeExplainTopic && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border-2 border-border w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-1">
                {activeExplainTopic.badge && (
                  <span
                    className="px-3 py-0.5 rounded-full text-white text-[10px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: activeExplainTopic.colorTheme || '#3b82f6' }}
                  >
                    {activeExplainTopic.badge}
                  </span>
                )}
                <h2 className="text-xl font-black text-foreground">
                  {activeExplainTopic.title} — Konu Anlatımı
                </h2>
              </div>
              <button
                onClick={() => setActiveExplainTopic(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Anlatım İçeriği */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-sm text-muted-foreground">
              {activeExplainTopic.keyFormula && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border-2 border-amber-400/40 space-y-1 shadow-2xs">
                  <div className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Önemli Formül / Bağıntı
                  </div>
                  <div className="font-mono text-sm font-black text-foreground">
                    {activeExplainTopic.keyFormula}
                  </div>
                </div>
              )}

              {activeExplainTopic.summary && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                    Teorik Tanım
                  </h4>
                  <p className="text-foreground leading-relaxed text-xs sm:text-sm font-medium">
                    {activeExplainTopic.summary}
                  </p>
                </div>
              )}

              {activeExplainTopic.explanationSteps && activeExplainTopic.explanationSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                    Görsel ve Mantıksal Adımlar
                  </h4>
                  <div className="space-y-2">
                    {activeExplainTopic.explanationSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 bg-muted/60 rounded-2xl border border-border text-xs font-medium">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center shrink-0 text-xs shadow-xs">
                          {idx + 1}
                        </span>
                        <span className="text-foreground pt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeExplainTopic.learningOutcomes.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                    Kazanımlar
                  </h4>
                  {activeExplainTopic.learningOutcomes.map((out, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{out}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
              <button
                onClick={() => setActiveExplainTopic(null)}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  const topicId = activeExplainTopic.id;
                  setActiveExplainTopic(null);
                  selectTopic(topicId);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Etkinliği Başlat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
