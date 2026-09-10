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
  Triangle,
  Cone,
  Pyramid,
  LayoutGrid,
  ScanSearch,
} from 'lucide-react';

type CameraPreset = 'isometric' | 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left' | 'side';

interface Toolbar3DProps {
  activeTool: Tool3DMode;
  setActiveTool: (tool: Tool3DMode) => void;
  onAddSolid: (type: Solid3DType) => void;
  onAutoArrange: () => void;
  onSetCameraPreset: (preset: CameraPreset) => void;
  toggleShowVertices: () => void;
  toggleShowEdges: () => void;
  toggleShowFaces: () => void;
  showVertices: boolean;
  showEdges: boolean;
  showFaces: boolean;
  onDeleteSelected: () => void;
  hasSelection?: boolean;
  onClearAll?: () => void;
  onOpenAddObjectDialog?: () => void;
}

const SOLID_BUTTONS: { type: Solid3DType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'cube', label: 'Küp', Icon: Box },
  { type: 'sphere', label: 'Küre', Icon: CircleIcon },
  { type: 'cylinder', label: 'Silindir', Icon: Cylinder },
  { type: 'prism', label: 'Dikdörtgenler Prizması', Icon: Layers },
  { type: 'triangular_prism', label: 'Üçgen Prizma', Icon: Triangle },
  { type: 'cone', label: 'Koni', Icon: Cone },
  { type: 'pyramid', label: 'Kare Piramit', Icon: Pyramid },
];

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'front', label: 'Önden bak' },
  { id: 'top', label: 'Üstten bak' },
  { id: 'right', label: 'Sağdan bak' },
  { id: 'back', label: 'Arkadan bak' },
  { id: 'left', label: 'Soldan bak' },
  { id: 'bottom', label: 'Alttan bak' },
  { id: 'isometric', label: 'İzometrik bak' },
];

const toolButtonClass = (active: boolean, tone: 'rose' | 'red' = 'rose') =>
  `flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
    active
      ? tone === 'red'
        ? 'bg-red-600 text-white border-transparent shadow-sm ring-2 ring-red-500/30'
        : 'bg-[#f87171] text-white border-transparent shadow-sm ring-2 ring-rose-500/30'
      : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-rose-400 shadow-sm hover:-translate-y-0.5'
  }`;

const toggleButtonClass = (active: boolean) =>
  `flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
    active
      ? 'bg-emerald-500 text-white border-transparent shadow-sm'
      : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-emerald-400 shadow-sm hover:-translate-y-0.5'
  }`;

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
  hasSelection = false,
  onClearAll,
  onOpenAddObjectDialog,
}: Toolbar3DProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    İncele: true,
    'Cisim oluştur': true,
    'Özellikleri keşfet': true,
  });

  // Sıradaki bakış açısı: düğme tıklandığında gösterilen açı uygulanır
  const [presetIdx, setPresetIdx] = useState(0);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const inspectTools = 6;
  const exploreTools = 6;

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
            onClick={() => onOpenAddObjectDialog && onOpenAddObjectDialog()}
            title="Nesne Ekle"
            className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
          {(
            [
              { tool: 'select_move', title: 'Cismi seç / taşı', Icon: MousePointer },
              { tool: 'orbit', title: 'Görünümü döndür', Icon: RotateCw },
              { tool: 'pan', title: 'Görünümü kaydır', Icon: Hand },
              { tool: 'inspect', title: 'Yüz seç ve incele', Icon: ScanSearch },
            ] as { tool: Tool3DMode; title: string; Icon: React.ComponentType<{ className?: string }> }[]
          ).map(({ tool, title, Icon }) => (
            <button
              key={tool}
              onClick={() => setActiveTool(tool)}
              title={title}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTool === tool ? 'bg-rose-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}

          <div className="w-6 h-px bg-border my-1" />

          {SOLID_BUTTONS.map(({ type, label, Icon }) => (
            <button
              key={type}
              onClick={() => onAddSolid(type)}
              title={`${label} Ekle`}
              className="w-9 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-all cursor-pointer"
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}

          <div className="w-6 h-px bg-border my-1" />

          <button
            onClick={onClearAll}
            title="Tüm Cisimleri Sil (Sahneyi Temizle)"
            className="w-9 h-9 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 sm:w-80 shrink-0 h-full min-h-0 bg-card/95 backdrop-blur-md border-r border-border flex flex-col select-none z-30 overflow-hidden shadow-sm">
      {/* Üst Başlık & Daraltma Butonu */}
      <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">🧊</span>
          <h3 className="text-xs font-black text-foreground tracking-tight">3D Katı Cisimler Stüdyosu</h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClearAll}
            title="Tüm Cisimleri Sil (Sahneyi Temizle)"
            className="p-1.5 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            title="Paneli Daralt (3D Uzayı Genişlet)"
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin">
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

        {/* 1. İNCELE GRUBU */}
        <div className="rounded-2xl p-2.5 bg-rose-500/5 dark:bg-rose-950/15 border border-rose-200/80 dark:border-rose-900/40 space-y-2">
          <button
            onClick={() => toggleGroup('İncele')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-black text-rose-700 dark:text-rose-300 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm">
                <Compass className="w-3 h-3" />
              </div>
              <span className="text-xs font-bold">İncele</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                {inspectTools}
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
              <button onClick={() => setActiveTool('select_move')} className={toolButtonClass(activeTool === 'select_move')}>
                <MousePointer className={`w-4 h-4 shrink-0 ${activeTool === 'select_move' ? 'text-white' : 'text-rose-500'}`} />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">Cismi seç / taşı</span>
              </button>

              <button onClick={() => setActiveTool('orbit')} className={toolButtonClass(activeTool === 'orbit')}>
                <RotateCw className={`w-4 h-4 shrink-0 ${activeTool === 'orbit' ? 'text-white' : 'text-rose-500'}`} />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">Görünümü döndür</span>
              </button>

              <button onClick={() => setActiveTool('pan')} className={toolButtonClass(activeTool === 'pan')}>
                <Hand className={`w-4 h-4 shrink-0 ${activeTool === 'pan' ? 'text-white' : 'text-rose-500'}`} />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">Görünümü kaydır</span>
              </button>

              <button
                onClick={() => {
                  onSetCameraPreset(PRESETS[presetIdx].id);
                  setPresetIdx((presetIdx + 1) % PRESETS.length);
                }}
                className={toolButtonClass(false)}
                title="Bakış açısını uygula; her tıklamada sıradaki açıya geçer (Önden / Üstten / Sağdan / Arkadan / Soldan / Alttan / İzometrik)"
              >
                <Eye className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">{PRESETS[presetIdx].label}</span>
              </button>

              <button
                onClick={() => {
                  if (hasSelection) onDeleteSelected();
                  else setActiveTool(activeTool === 'delete' ? 'select_move' : 'delete');
                }}
                className={`${toolButtonClass(activeTool === 'delete', 'red')} col-span-2 ${
                  activeTool !== 'delete' ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-400' : ''
                }`}
                title={hasSelection ? 'Seçili cisimleri sil' : 'Silme modu: tıklanan cisim silinir'}
              >
                <Trash2 className={`w-4 h-4 shrink-0 ${activeTool === 'delete' ? 'text-white' : 'text-red-500'}`} />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">
                  {hasSelection ? 'Seçili Cismi Sil' : activeTool === 'delete' ? 'Silme Modu Aktif (Cisme Tıkla)' : 'Sil (Cisme Tıkla)'}
                </span>
              </button>

              <button
                onClick={onClearAll}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border col-span-2 bg-rose-50/80 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 shadow-sm active:scale-95"
                title="Sahnedeki tüm 3D cisimleri sil"
              >
                <Trash2 className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">Tüm Cisimleri Sil / Temizle</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. CİSİM OLUŞTUR GRUBU */}
        <div className="rounded-2xl p-2.5 bg-emerald-500/5 dark:bg-emerald-950/15 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
          <button
            onClick={() => toggleGroup('Cisim oluştur')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                <Box className="w-3 h-3" />
              </div>
              <span className="text-xs font-bold">Cisim oluştur</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                {SOLID_BUTTONS.length}
              </span>
              {expandedGroups['Cisim oluştur'] ? (
                <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
          </button>

          {expandedGroups['Cisim oluştur'] && (
            <div className="space-y-2 pt-0.5">
              <div className="grid grid-cols-2 gap-2">
                {SOLID_BUTTONS.map(({ type, label, Icon }) => (
                  <button
                    key={type}
                    onClick={() => onAddSolid(type)}
                    onContextMenu={(e) => {
                      // Sağ tık: sürükleyerek boyutlandırma modu
                      e.preventDefault();
                      setActiveTool(`create_${type}` as Tool3DMode);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-left border shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                      activeTool === `create_${type}`
                        ? 'bg-emerald-500 text-white border-transparent'
                        : 'bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-foreground border-border/80 hover:border-emerald-400'
                    }`}
                    title={`${label} ekle (sağ tık: zemine sürükleyerek boyutlandır)`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${activeTool === `create_${type}` ? 'text-white' : 'text-emerald-600'}`} />
                    <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">{label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground px-1 leading-snug">
                İpucu: Bir cisme <strong>sağ tıklayıp</strong> zemine sürükleyerek istediğiniz boyutta ve konumda oluşturabilirsiniz.
              </p>
            </div>
          )}
        </div>

        {/* 3. ÖZELLİKLERİ KEŞFET GRUBU */}
        <div className="rounded-2xl p-2.5 bg-teal-500/5 dark:bg-teal-950/15 border border-teal-200/80 dark:border-teal-900/40 space-y-2">
          <button
            onClick={() => toggleGroup('Özellikleri keşfet')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-black text-teal-700 dark:text-teal-300 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-sm">
                <Square className="w-3 h-3" />
              </div>
              <span className="text-xs font-bold">Özellikleri keşfet</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 border border-teal-500/20">
                {exploreTools}
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
              <button onClick={toggleShowVertices} className={toggleButtonClass(showVertices)}>
                <Crosshair className={`w-4 h-4 shrink-0 ${showVertices ? 'text-white' : 'text-emerald-600'}`} />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">Köşeleri göster</span>
              </button>

              <button onClick={toggleShowEdges} className={toggleButtonClass(showEdges)}>
                <MoveRight className={`w-4 h-4 shrink-0 ${showEdges ? 'text-white' : 'text-emerald-600'}`} />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">Ayrıtları göster</span>
              </button>

              <button onClick={toggleShowFaces} className={toggleButtonClass(showFaces)}>
                <Square className={`w-4 h-4 shrink-0 ${showFaces ? 'text-white' : 'text-emerald-600'}`} />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">Yüzleri göster</span>
              </button>

              <button
                onClick={() => setActiveTool(activeTool === 'inspect' ? 'select_move' : 'inspect')}
                className={toggleButtonClass(activeTool === 'inspect')}
                title="Bir yüze tıklayarak adını ve alanını görün"
              >
                <ScanSearch className={`w-4 h-4 shrink-0 ${activeTool === 'inspect' ? 'text-white' : 'text-teal-600'}`} />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">Yüz seç ve incele</span>
              </button>

              <button
                onClick={() => setActiveTool('inspect')}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left bg-card hover:bg-background text-foreground border border-border/80 hover:border-emerald-400 shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
                title="Bir yüz seçin, ardından sağ panelden yüzün rengini değiştirin"
              >
                <Palette className="w-4 h-4 shrink-0 text-teal-600" />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">Yüzü renklendir</span>
              </button>

              <button
                onClick={onAutoArrange}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left bg-card hover:bg-background text-foreground border border-border/80 hover:border-emerald-400 shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
                title="Cisimleri yan yana dizip görünümü sıfırla"
              >
                <LayoutGrid className="w-4 h-4 shrink-0 text-teal-600" />
                <span className="text-[11px] sm:text-xs font-bold leading-tight break-words">Cisimleri hizala</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
