'use client';

import React, { useState } from 'react';
import { Tool3DMode, Solid3DType } from '@/types/workspace3d';
import {
  MousePointer,
  RotateCw,
  Hand,
  Eye,
  Trash2,
  Box,
  Circle as CircleIcon,
  Cylinder,
  Layers,
  Plus,
  Crosshair,
  MoveRight,
  Square,
  Palette,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Toolbar3DProps {
  activeTool: Tool3DMode;
  setActiveTool: (tool: Tool3DMode) => void;
  onAddSolid: (type: Solid3DType) => void;
  onAutoArrange: () => void;
  onSetCameraPreset: (preset: 'isometric' | 'front' | 'top' | 'side') => void;
  toggleShowVertices: () => void;
  toggleShowEdges: () => void;
  toggleShowFaces: () => void;
  showVertices: boolean;
  showEdges: boolean;
  showFaces: boolean;
  onDeleteSelected: () => void;
  onOpenAddObjectDialog?: () => void;
}

export function Toolbar3D({
  activeTool,
  setActiveTool,
  onAddSolid,
  onAutoArrange,
  onSetCameraPreset,
  toggleShowVertices,
  toggleShowEdges,
  toggleShowFaces,
  showVertices,
  showEdges,
  showFaces,
  onDeleteSelected,
  onOpenAddObjectDialog,
}: Toolbar3DProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'İncele': true,
    'Cisim oluştur': true,
    'Özellikleri keşfet': true,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // Daraltılmış Menü (İkon Çubuğu)
  if (isCollapsed) {
    return (
      <div className="w-14 shrink-0 h-full min-h-0 bg-card border-r border-border flex flex-col items-center py-3 space-y-3 z-30 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          title="3D Araç Panelini Genişlet"
          className="w-9 h-9 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors cursor-pointer"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>

        <div className="w-8 h-px bg-border my-1" />

        <div className="flex-1 overflow-y-auto w-full flex flex-col items-center space-y-2 px-1.5 scrollbar-none">
          <button
            onClick={() => {
              if (onOpenAddObjectDialog) onOpenAddObjectDialog();
            }}
            title="Nesne Ekle"
            className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('select_move')}
            title="Cismi seç / taşı"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'select_move'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <MousePointer className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('orbit')}
            title="Görünümü döndür"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'orbit'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('pan')}
            title="Görünümü kaydır"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-border my-1" />

          <button
            onClick={() => onAddSolid('cube')}
            title="Küp Ekle"
            className="w-9 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <Box className="w-4 h-4" />
          </button>

          <button
            onClick={() => onAddSolid('sphere')}
            title="Küre Ekle"
            className="w-9 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <CircleIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => onAddSolid('cylinder')}
            title="Silindir Ekle"
            className="w-9 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <Cylinder className="w-4 h-4" />
          </button>

          <button
            onClick={() => onAddSolid('prism')}
            title="Prizma Ekle"
            className="w-9 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Genişletilmiş 3D Esnek Menü (Referans Görselle Birebir)
  return (
    <div className="w-72 sm:w-80 shrink-0 h-full min-h-0 bg-card/95 backdrop-blur-md border-r border-border flex flex-col select-none z-30 overflow-hidden shadow-xs">
      {/* Üst Başlık & Daraltma Butonu */}
      <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">🧊</span>
          <h3 className="text-xs font-black text-foreground tracking-tight">3D Katı Cisimler Stüdyosu</h3>
        </div>

        <button
          onClick={() => setIsCollapsed(true)}
          title="Paneli Daralt (3D Uzayı Genişlet)"
          className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin">
        {/* Üst: + Nesne Ekle Butonu */}
        <button
          onClick={() => {
            if (onOpenAddObjectDialog) onOpenAddObjectDialog();
            else onAddSolid('cube');
          }}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nesne ekle</span>
        </button>

        {/* 1. İNCELE GRUBU (5 Araç - Kırmızı / Mercan Tema) */}
        <div className="rounded-2xl p-2.5 bg-rose-500/5 dark:bg-rose-950/15 border border-rose-200/80 dark:border-rose-900/40 space-y-2">
          <button
            onClick={() => toggleGroup('İncele')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-black text-rose-700 dark:text-rose-300 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xs">
                <Compass className="w-3 h-3" />
              </div>
              <span className="text-xs font-bold">İncele</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                5
              </span>
              {expandedGroups['İncele'] ? (
                <ChevronUp className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
          </button>

          {expandedGroups['İncele'] && (
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={() => setActiveTool('select_move')}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                  activeTool === 'select_move'
                    ? 'bg-[#f87171] text-white border-transparent shadow-sm ring-2 ring-rose-500/30'
                    : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-rose-400 shadow-2xs hover:-translate-y-0.5'
                }`}
              >
                <MousePointer className={`w-4 h-4 shrink-0 ${activeTool === 'select_move' ? 'text-white' : 'text-rose-500'}`} />
                <span className="text-xs font-extrabold truncate">Cismi seç / taşı</span>
              </button>

              <button
                onClick={() => setActiveTool('orbit')}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                  activeTool === 'orbit'
                    ? 'bg-[#f87171] text-white border-transparent shadow-sm ring-2 ring-rose-500/30'
                    : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-rose-400 shadow-2xs hover:-translate-y-0.5'
                }`}
              >
                <RotateCw className={`w-4 h-4 shrink-0 ${activeTool === 'orbit' ? 'text-white' : 'text-rose-500'}`} />
                <span className="text-xs font-extrabold truncate">Görünümü döndür</span>
              </button>

              <button
                onClick={() => setActiveTool('pan')}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                  activeTool === 'pan'
                    ? 'bg-[#f87171] text-white border-transparent shadow-sm ring-2 ring-rose-500/30'
                    : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-rose-400 shadow-2xs hover:-translate-y-0.5'
                }`}
              >
                <Hand className={`w-4 h-4 shrink-0 ${activeTool === 'pan' ? 'text-white' : 'text-rose-500'}`} />
                <span className="text-xs font-extrabold truncate">Görünümü kaydır</span>
              </button>

              <button
                onClick={() => onSetCameraPreset('front')}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border bg-card hover:bg-background text-foreground border-border/80 hover:border-rose-400 shadow-2xs hover:-translate-y-0.5"
              >
                <Eye className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="text-xs font-extrabold truncate">Önden bak</span>
              </button>

              <button
                onClick={onDeleteSelected}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border bg-card hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 border-border/80 hover:border-red-400 shadow-2xs hover:-translate-y-0.5 col-span-2"
              >
                <Trash2 className="w-4 h-4 shrink-0 text-red-500" />
                <span className="text-xs font-extrabold truncate">Sil</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. CİSİM OLUŞTUR GRUBU (4 Araç - Zümrüt / Nane Yeşili Tema) */}
        <div className="rounded-2xl p-2.5 bg-emerald-500/5 dark:bg-emerald-950/15 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
          <button
            onClick={() => toggleGroup('Cisim oluştur')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
                <Box className="w-3 h-3" />
              </div>
              <span className="text-xs font-bold">Cisim oluştur</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                4
              </span>
              {expandedGroups['Cisim oluştur'] ? (
                <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
          </button>

          {expandedGroups['Cisim oluştur'] && (
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={() => onAddSolid('cube')}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-foreground border border-border/80 hover:border-emerald-400 shadow-2xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
              >
                <Box className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="text-xs font-extrabold truncate">Küp</span>
              </button>

              <button
                onClick={() => onAddSolid('sphere')}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-foreground border border-border/80 hover:border-emerald-400 shadow-2xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
              >
                <CircleIcon className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="text-xs font-extrabold truncate">Küre</span>
              </button>

              <button
                onClick={() => onAddSolid('cylinder')}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-foreground border border-border/80 hover:border-emerald-400 shadow-2xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
              >
                <Cylinder className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="text-xs font-extrabold truncate">Silindir</span>
              </button>

              <button
                onClick={() => onAddSolid('prism')}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-foreground border border-border/80 hover:border-emerald-400 shadow-2xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
              >
                <Layers className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="text-xs font-extrabold truncate">Prizma oluştur</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. ÖZELLİKLERİ KEŞFET GRUBU (5 Araç - Teal / Zümrüt Tema) */}
        <div className="rounded-2xl p-2.5 bg-teal-500/5 dark:bg-teal-950/15 border border-teal-200/80 dark:border-teal-900/40 space-y-2">
          <button
            onClick={() => toggleGroup('Özellikleri keşfet')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-black text-teal-700 dark:text-teal-300 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-2xs">
                <Square className="w-3 h-3" />
              </div>
              <span className="text-xs font-bold">Özellikleri keşfet</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 border border-teal-500/20">
                5
              </span>
              {expandedGroups['Özellikleri keşfet'] ? (
                <ChevronUp className="w-3.5 h-3.5 text-teal-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-teal-400" />
              )}
            </div>
          </button>

          {expandedGroups['Özellikleri keşfet'] && (
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={toggleShowVertices}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                  showVertices
                    ? 'bg-emerald-500 text-white border-transparent shadow-sm'
                    : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-emerald-400 shadow-2xs hover:-translate-y-0.5'
                }`}
              >
                <Crosshair className={`w-4 h-4 shrink-0 ${showVertices ? 'text-white' : 'text-emerald-600'}`} />
                <span className="text-xs font-extrabold truncate">Köşeleri göster</span>
              </button>

              <button
                onClick={toggleShowEdges}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                  showEdges
                    ? 'bg-emerald-500 text-white border-transparent shadow-sm'
                    : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-emerald-400 shadow-2xs hover:-translate-y-0.5'
                }`}
              >
                <MoveRight className={`w-4 h-4 shrink-0 ${showEdges ? 'text-white' : 'text-emerald-600'}`} />
                <span className="text-xs font-extrabold truncate">Ayrıtları göster</span>
              </button>

              <button
                onClick={toggleShowFaces}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                  showFaces
                    ? 'bg-emerald-500 text-white border-transparent shadow-sm'
                    : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-emerald-400 shadow-2xs hover:-translate-y-0.5'
                }`}
              >
                <Square className={`w-4 h-4 shrink-0 ${showFaces ? 'text-white' : 'text-emerald-600'}`} />
                <span className="text-xs font-extrabold truncate">Yüzleri göster</span>
              </button>

              <button
                onClick={() => setActiveTool('select_move')}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left bg-card hover:bg-background text-foreground border border-border/80 hover:border-emerald-400 shadow-2xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
              >
                <Compass className="w-4 h-4 shrink-0 text-teal-600" />
                <span className="text-xs font-extrabold truncate">Yüz, ayrıt veya köşe seç</span>
              </button>

              <button
                onClick={onAutoArrange}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left bg-card hover:bg-background text-foreground border border-border/80 hover:border-emerald-400 shadow-2xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5 col-span-2"
              >
                <Palette className="w-4 h-4 shrink-0 text-teal-600" />
                <span className="text-xs font-extrabold truncate">Yüzü renklendir</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
