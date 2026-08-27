'use client';

import React, { useState } from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useTheme } from '@/state/ThemeContext';
import {
  Undo2,
  Redo2,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  ChevronRight,
  Sparkles,
  Maximize2,
  HelpCircle,
  X,
  Compass,
} from 'lucide-react';

export function Header() {
  const {
    currentScreen,
    selectedLevel,
    selectedGrade,
    selectedTopic,
    selectedActivity,
    isFreeSandbox,
    goHome,
    goBack,
    startFreeSandbox,
    setScreen,
  } = useCurriculum();

  const { canUndo, canRedo, undo, redo, resetViewport, clearWorkspace } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 shadow-2xs">
        {/* Sol Alan: Renkli Logo ve Yol Gösterimi */}
        <div className="flex items-center gap-3">
          <button
            onClick={goHome}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl hover:bg-muted/70 transition-all text-foreground font-black text-base group"
            title="Ana Sayfaya Dön"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline tracking-tight font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent text-xl font-sans">
              GeoEBA
            </span>
          </button>

          {/* Navigasyon Yolu */}
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-muted-foreground">
            {selectedLevel && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-primary" />
                <button
                  onClick={() => setScreen('portal')}
                  className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {selectedLevel.title}
                </button>
              </>
            )}

            {selectedTopic && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-bold text-foreground truncate max-w-[150px] lg:max-w-[220px]">
                  {selectedTopic.title}
                </span>
              </>
            )}

            {isFreeSandbox && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10">
                  Serbest Çalışma Masası
                </span>
              </>
            )}
          </div>
        </div>

        {/* Orta Alan: Çalışma Alanı Kısayolları (Sadece Çalışma Alanında) */}
        {currentScreen === 'workspace' && (
          <div className="flex items-center gap-1 bg-muted/60 p-1.5 rounded-2xl border border-border/80 shadow-2xs">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded-xl text-foreground hover:bg-background disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Geri Al (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded-xl text-foreground hover:bg-background disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Yinele (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-border mx-1" />
            <button
              onClick={resetViewport}
              className="p-1.5 rounded-xl text-foreground hover:bg-background transition-all"
              title="Görünümü Merkeze Sıfırla"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={clearWorkspace}
              className="p-1.5 rounded-xl text-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
              title="Tuvali Temizle"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sağ Alan: Serbest Çalışma, Yardım ve Tema */}
        <div className="flex items-center gap-2.5">
          {currentScreen !== 'workspace' && (
            <button
              onClick={startFreeSandbox}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 text-xs font-bold transition-all shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Serbest Stüdyo</span>
            </button>
          )}

          {/* Yardım Butonu */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2.5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            title="Yardım ve İpuçları"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Tema Seçici */}
          <div className="flex items-center bg-muted/80 p-1 rounded-2xl border border-border/80 shadow-2xs">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-xl text-xs transition-all ${
                theme === 'light'
                  ? 'bg-card text-amber-500 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Açık Tema"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-xl text-xs transition-all ${
                theme === 'dark'
                  ? 'bg-card text-indigo-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Koyu Tema"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-1.5 rounded-xl text-xs transition-all ${
                theme === 'system'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Sistem Teması"
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Yardım ve Kullanım Kılavuzu Modalı */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border-2 border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" />
                Matematik Çalışma Ortamı Kılavuzu
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-foreground">
                <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-1">1. Geometrik Nesneleri Oluşturma</h3>
                <p>
                  Sol araç çubuğundan <strong>Nokta</strong>, <strong>Doğru Parçası</strong>,{' '}
                  <strong>Çember</strong>, <strong>Açı</strong> veya <strong>Çokgen</strong>{' '}
                  aracını seçerek tuval üzerine tıklayabilirsiniz.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-foreground">
                <h3 className="font-bold text-purple-600 dark:text-purple-400 mb-1">2. Noktaları Taşıma ve Görevler</h3>
                <p>
                  <strong>Seç & Taşı</strong> aracı seçiliyken herhangi bir mavi noktayı farenizle veya
                  dokunarak sürükleyin. Bağlı doğru parçaları, açılar ve alanlar gerçek zamanlı
                  olarak yeniden hesaplanır.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-foreground">
                <h3 className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">3. Etkinlikler ve Hedefler</h3>
                <p>
                  Müfredat konularından bir etkinlik seçtiğinizde, yönergeleri takip
                  ederek matematiksel hedefleri tamamlayabilirsiniz.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 shadow-md transition-opacity"
              >
                Anladım, Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
