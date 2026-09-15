'use client';

import React from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import { useWorkspace } from '@/state/WorkspaceContext';
import { RotateCcw } from 'lucide-react';

export function ActivityPanel() {
  const { selectedActivity, isFreeSandbox, activeModalTopic } = useCurriculum();
  const { restartCurrentActivity } = useWorkspace();

  if (isFreeSandbox || !selectedActivity) {
    return null;
  }

  const title = activeModalTopic?.title || selectedActivity.title || 'Çalışma Alanı';

  return (
    <div className="bg-card border-b border-border px-4 py-2 space-y-1.5 shrink-0 select-none transition-all">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Sol Alan: Etkinlik Başlığı */}
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm">
            Çizim &amp; Modelleme Stüdyosu
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
            {title}
          </h2>
        </div>

        {/* Sağ Alan: Sıfırla Butonu */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={restartCurrentActivity}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors cursor-pointer"
            title="Çalışma Alanını Sıfırla"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sıfırla</span>
          </button>
        </div>
      </div>
    </div>
  );
}
