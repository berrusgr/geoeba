'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useTheme } from '@/state/ThemeContext';
import {
  Menu,
  Search,
  Sparkles,
  Undo2,
  Redo2,
  Maximize2,
  RotateCcw,
  Sun,
  Moon,
  Compass,
  Layers,
  Shapes,
  Box,
  X,
} from 'lucide-react';

export function Header() {
  const {
    currentScreen,
    selectedLevel,
    goHome,
    startFreeSandbox,
    setScreen,
    selectLevel,
    searchQuery,
    setSearchQuery,
  } = useCurriculum();

  const { canUndo, canRedo, undo, redo, resetViewport, clearWorkspace } = useWorkspace();
  const { theme, setTheme } = useTheme();

  // State
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <header className="h-16 bg-white dark:bg-[#15171c] border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 shadow-xs select-none">
        
        {/* ================= SOL: LOGO + KADEME BUTONLARI ================= */}
        <div className="flex items-center gap-3">
          {/* Menü Hamburger Butonu */}
          <button
            onClick={() => setShowMenuDrawer(!showMenuDrawer)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Menü"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <button
            onClick={goHome}
            className="flex items-center gap-2.5 group focus:outline-hidden"
            title="Ana Sayfaya Dön"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                GeoEBA
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                Etkileşimli Çalışma Ortamı
              </span>
            </div>
          </button>
        </div>

        {/* ================= ORTA: ARAMA BARI ================= */}
        <div className="flex-1 max-w-lg mx-3 sm:mx-6 relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Ara (Konu, Şekil, Görev...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full pl-9 pr-10 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/90 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
            {/* Mor Parlama / Akıllı Arama Butonu */}
            <button
              onClick={() => {
                if (searchInputRef.current) searchInputRef.current.focus();
              }}
              className="absolute right-1.5 w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95"
              title="Akıllı Arama"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hızlı Arama Sonuçları Açılır Paneli */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-72 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Hızlı Sonuçlar
              </div>
              <button
                onMouseDown={() => {
                  setScreen('portal');
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"
              >
                <Compass className="w-4 h-4 text-blue-600" />
                <span>&quot;{searchQuery}&quot; ile ilgili tüm etkinlik ve dersleri göster</span>
              </button>
              <button
                onMouseDown={() => startFreeSandbox()}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2"
              >
                <Shapes className="w-4 h-4 text-emerald-500" />
                <span>Serbest Çizim Masasında Aç</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= SAĞ: SERBEST ÇALIŞMA + TEMA ================= */}
        <div className="flex items-center gap-2">
          {/* Çalışma Alanı Kısayolları (Sadece Workspace Ekranında Görünür) */}
          {currentScreen === 'workspace' && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 mr-2">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-all"
                title="Geri Al"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-all"
                title="Yinele"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />
              <button
                onClick={resetViewport}
                className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all"
                title="Sıfırla"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={clearWorkspace}
                className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                title="Temizle"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Serbest Çalışma Butonu */}
          {currentScreen !== 'workspace' && (
            <button
              onClick={startFreeSandbox}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Serbest Stüdyo</span>
            </button>
          )}

          {/* Tema Değiştirici */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all"
              title="Temayı Değiştir"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Menü Yan Çekmecesi */}
      {showMenuDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white dark:bg-slate-900 h-full p-5 shadow-2xl border-r border-slate-200 dark:border-slate-800 space-y-4 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white">GeoEBA</span>
              </div>
              <button
                onClick={() => setShowMenuDrawer(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-semibold">
              <button
                onClick={() => {
                  goHome();
                  setShowMenuDrawer(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white hover:bg-slate-100 flex items-center gap-2.5"
              >
                <Compass className="w-4 h-4 text-blue-600" />
                <span>Ana Sayfa (Kademe Seçimi)</span>
              </button>
              <button
                onClick={() => {
                  selectLevel('ilkokul');
                  setShowMenuDrawer(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
              >
                <Shapes className="w-4 h-4 text-amber-500" />
                <span>İlkokul Matematik (1-4. Sınıf)</span>
              </button>
              <button
                onClick={() => {
                  selectLevel('ortaokul');
                  setShowMenuDrawer(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
              >
                <Compass className="w-4 h-4 text-blue-600" />
                <span>Ortaokul Matematik (5-8. Sınıf)</span>
              </button>
              <button
                onClick={() => {
                  selectLevel('lise');
                  setShowMenuDrawer(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
              >
                <Box className="w-4 h-4 text-purple-600" />
                <span>Lise Matematik (9-12. Sınıf)</span>
              </button>
              <button
                onClick={() => {
                  startFreeSandbox();
                  setShowMenuDrawer(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2.5"
              >
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>Serbest Çizim Masası</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowMenuDrawer(false)} />
        </div>
      )}
    </>
  );
}
