'use client';

import React, { useState } from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import { useWorkspace } from '@/state/WorkspaceContext';
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function ActivityPanel() {
  const { selectedActivity, isFreeSandbox, openMissionMode, selectedLevel, selectedGrade } = useCurriculum();
  const {
    activityCompleted,
    activeSuccessMessage,
    restartCurrentActivity,
    studioDimension,
    setStudioDimension,
  } = useWorkspace();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isPrimary = selectedLevel?.id === 'ilkokul' || (selectedGrade && selectedGrade.gradeNumber <= 4);

  if (isFreeSandbox || !selectedActivity) {
    return null;
  }

  return (
    <div className="bg-card border-b border-border px-4 py-2 space-y-1.5 shrink-0 select-none transition-all">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Sol Alan: Etkinlik Başlığı ve Hedefi */}
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
            Çizim &amp; Düzenleme Stüdyosu
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
            {selectedActivity.title}
          </h2>
          <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-md">
            — {selectedActivity.description}
          </span>
        </div>

        {/* Sağ Alan: İnteraktif Göreve Geçiş + Sıfırla ve Daralt Butonları */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => openMissionMode(selectedActivity)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white text-xs font-black shadow-sm hover:scale-105 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>🎮 İnteraktif Oyun &amp; Görev Moduna Geç</span>
          </button>

          <button
            onClick={restartCurrentActivity}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors cursor-pointer"
            title="Etkinliği Sıfırla"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sıfırla</span>
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={isCollapsed ? 'Yönergeyi Genişlet' : 'Yönergeyi Daralt'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Yönerge ve Canlı Başarı Durumu (Daraltılabilir) */}
      {!isCollapsed && (
        <div className="pt-0.5">
          {activityCompleted ? (
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-bold">Başardın! </span>
                  <span>{activeSuccessMessage || selectedActivity.completedMessage}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-primary/5 border border-primary/15 text-xs text-foreground/90 flex items-start gap-2">
              <Target className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-primary">Yönerge: </span>
                <span>{selectedActivity.steps[0]?.instruction}</span>
                {selectedActivity.steps[0]?.hint && (
                  <span className="text-muted-foreground ml-2">
                    (<strong>İpucu:</strong> {selectedActivity.steps[0]?.hint})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
