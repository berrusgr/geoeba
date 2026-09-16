'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useTheme } from '@/state/ThemeContext';
import { ToolMode } from '@/types/workspace';
import { LayoutMode } from './PropertiesPanel';
import { exportPng, exportSvg, exportPdf, exportWord } from '@/utils/exportCanvas';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Upload,
  Printer,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  Clipboard,
  Trash2,
  CheckSquare,
  LayoutGrid,
  Columns2,
  Box,
  Eye,
  Grid,
  Compass,
  Maximize,
  RotateCcw,
  MousePointer,
  Dot,
  Minus,
  Circle,
  Shapes,
  Ruler,
  FlipHorizontal,
  Wrench,
  Type,
  Image as ImageIcon,
  FunctionSquare,
  SlidersHorizontal,
  Link2,
  HelpCircle,
  BookOpen,
  Keyboard,
  Info,
  Palette,
  Globe,
  Settings,
  X,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface WorkspaceMenuBarProps {
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onSelectTool: (tool: ToolMode) => void;
  onOpenFunctionDialog: () => void;
  onOpenSliderDialog: () => void;
  onOpenAddObjectDialog: () => void;
  onOpenRegularPolygonDialog?: () => void;
  onToggleProperties: (tab?: 'ozellikler' | 'ayarlar') => void;
  onClearAll: () => void;
  onResetView?: () => void;
}

type MenuKey = 'dosya' | 'duzenle' | 'gorunum' | 'araclar' | 'ekle' | 'ayarlar' | 'yardim' | null;

export function WorkspaceMenuBar({
  layoutMode,
  onLayoutModeChange,
  onSelectTool,
  onOpenFunctionDialog,
  onOpenSliderDialog,
  onOpenAddObjectDialog,
  onOpenRegularPolygonDialog,
  onToggleProperties,
  onClearAll,
  onResetView,
}: WorkspaceMenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [infoModalType, setInfoModalType] = useState<'shortcuts' | 'about' | 'guide' | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { theme, setTheme } = useTheme();
  const {
    objects,
    selectedObjectId,
    viewport,
    setViewport,
    undo,
    redo,
    canUndo,
    canRedo,
    deleteObject,
    setSelectedObjectId,
    addObject,
    resetViewport,
  } = useWorkspace();

  // Menü dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
        setInfoModalType(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMenuHeaderClick = (menu: MenuKey) => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const handleMenuHeaderHover = (menu: MenuKey) => {
    if (activeMenu !== null) {
      setActiveMenu(menu);
    }
  };

  const closeMenu = () => setActiveMenu(null);

  // Tuvali bulma (Dışa aktarma ve yazdırma için)
  const getCanvasSvg = (): SVGSVGElement | null => {
    const svgs = Array.from(document.querySelectorAll('svg'));
    if (svgs.length === 0) return null;
    return svgs.reduce((largest, cur) =>
      cur.getBoundingClientRect().width > largest.getBoundingClientRect().width ? cur : largest
    ) as SVGSVGElement;
  };

  // Dışa aktarma eylemi
  const handleExport = async (format: 'png' | 'svg' | 'pdf' | 'word') => {
    closeMenu();
    const svg = getCanvasSvg();
    if (!svg) {
      alert('Dışa aktarılacak çizim alanı bulunamadı.');
      return;
    }
    const title = 'GeoEBA Çizimi';
    try {
      if (format === 'png') await exportPng(svg, title);
      else if (format === 'svg') exportSvg(svg, title);
      else if (format === 'pdf') await exportPdf(svg, title);
      else await exportWord(svg, title);
    } catch (err) {
      console.error('Dışa aktarma hatası:', err);
    }
  };

  // Proje kaydetme (.geoeba JSON)
  const handleSaveProject = () => {
    closeMenu();
    const projectData = {
      version: '1.0',
      timestamp: Date.now(),
      viewport,
      objects,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geoeba-proje-${new Date().toISOString().slice(0, 10)}.geoeba`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Proje dosyası açma (.geoeba JSON)
  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data && Array.isArray(data.objects)) {
          if (data.viewport) setViewport(data.viewport);
          data.objects.forEach((obj: any) => addObject(obj));
        }
      } catch (err) {
        alert('Dosya açılamadı. Lütfen geçerli bir .geoeba veya JSON dosyası seçin.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    closeMenu();
  };

  // Yazdır
  const handlePrint = () => {
    closeMenu();
    window.print();
  };

  // Kopyala / Kes / Yapıştır
  const handleCopy = () => {
    closeMenu();
    const obj = objects.find((o) => o.id === selectedObjectId);
    if (obj) {
      sessionStorage.setItem('geoeba_clipboard', JSON.stringify(obj));
    }
  };

  const handleCut = () => {
    closeMenu();
    const obj = objects.find((o) => o.id === selectedObjectId);
    if (obj) {
      sessionStorage.setItem('geoeba_clipboard', JSON.stringify(obj));
      deleteObject(obj.id);
    }
  };

  const handlePaste = () => {
    closeMenu();
    const raw = sessionStorage.getItem('geoeba_clipboard');
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        const newId = `${obj.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        if (obj.x !== undefined && obj.y !== undefined) {
          addObject({ ...obj, id: newId, x: obj.x + 1, y: obj.y + 1, createdAt: Date.now() });
        } else {
          addObject({ ...obj, id: newId, createdAt: Date.now() });
        }
      } catch (e) {
        console.error('Yapıştırma hatası:', e);
      }
    }
  };

  const handleDelete = () => {
    closeMenu();
    if (selectedObjectId) {
      deleteObject(selectedObjectId);
      setSelectedObjectId(null);
    }
  };

  const handleSelectAll = () => {
    closeMenu();
    if (objects.length > 0) {
      setSelectedObjectId(objects[0].id);
    }
  };

  const handleResetView = () => {
    closeMenu();
    if (onResetView) onResetView();
    else resetViewport();
  };

  return (
    <>
      {/* GİZLİ DOSYA YÜKLEME INPUTU */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleOpenFile}
        accept=".json,.geoeba"
        className="hidden"
      />

      {/* ÜST MENÜ ŞERİDİ */}
      <div
        ref={menuBarRef}
        className="h-8.5 w-full bg-white/95 dark:bg-[#15171c]/95 backdrop-blur-md border-b border-border/80 px-3 flex items-center justify-between z-30 select-none shadow-2xs shrink-0 relative"
      >
        {/* SOL: 7 ANA MENÜ LİSTESİ */}
        <div className="flex items-center gap-0.5 sm:gap-1 text-xs font-medium">
          {/* 1. DOSYA MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('dosya')}
              onMouseEnter={() => handleMenuHeaderHover('dosya')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeMenu === 'dosya'
                  ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Dosya
            </button>
            {activeMenu === 'dosya' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-popover/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-xl border border-border/80 py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    closeMenu();
                    onClearAll();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Yeni</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+N</span>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>Aç...</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+O</span>
                </button>

                <button
                  onClick={handleSaveProject}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Kaydet</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+S</span>
                </button>

                <button
                  onClick={handleSaveProject}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Farklı Kaydet...</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">.geoeba</span>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={() => {
                    closeMenu();
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5 text-indigo-500" />
                    <span>İçe Aktar</span>
                  </div>
                </button>

                {/* Dışa Aktar Seçenekleri */}
                <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Dışa Aktar
                </div>
                <button
                  onClick={() => handleExport('png')}
                  className="w-full px-4 py-1 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer pl-6"
                >
                  <span>Görsel (PNG)</span>
                  <Download className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleExport('svg')}
                  className="w-full px-4 py-1 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer pl-6"
                >
                  <span>Vektör (SVG)</span>
                  <Download className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-1 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer pl-6"
                >
                  <span>Belge (PDF)</span>
                  <Download className="w-3 h-3 text-muted-foreground" />
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={handlePrint}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Yazdır...</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+P</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. DÜZENLE MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('duzenle')}
              onMouseEnter={() => handleMenuHeaderHover('duzenle')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeMenu === 'duzenle'
                  ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Düzenle
            </button>
            {activeMenu === 'duzenle' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-popover/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-xl border border-border/80 py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  disabled={!canUndo}
                  onClick={() => {
                    closeMenu();
                    undo();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Undo2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Geri Al</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+Z</span>
                </button>

                <button
                  disabled={!canRedo}
                  onClick={() => {
                    closeMenu();
                    redo();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Redo2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Yinele</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+Y</span>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  disabled={!selectedObjectId}
                  onClick={handleCut}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5 text-amber-500" />
                    <span>Kes</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+X</span>
                </button>

                <button
                  disabled={!selectedObjectId}
                  onClick={handleCopy}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Kopyala</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+C</span>
                </button>

                <button
                  onClick={handlePaste}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Clipboard className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Yapıştır</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+V</span>
                </button>

                <button
                  disabled={!selectedObjectId}
                  onClick={handleDelete}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sil</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Del</span>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={handleSelectAll}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-purple-500" />
                    <span>Tümünü Seç</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+A</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. GÖRÜNÜM MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('gorunum')}
              onMouseEnter={() => handleMenuHeaderHover('gorunum')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeMenu === 'gorunum'
                  ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Görünüm
            </button>
            {activeMenu === 'gorunum' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-popover/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-xl border border-border/80 py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Çalışma Alanı Düzenleri
                </div>

                <button
                  onClick={() => {
                    closeMenu();
                    onLayoutModeChange('2d_only');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Maximize className="w-3.5 h-3.5 text-blue-500" />
                    <span>Grafik Paneli (2D)</span>
                  </div>
                  {layoutMode === '2d_only' && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onLayoutModeChange('3d_only');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-violet-500" />
                    <span>3B Görünüm</span>
                  </div>
                  {layoutMode === '3d_only' && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onLayoutModeChange('2d_3d');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Columns2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>2D + 3D Çift Görünüm</span>
                  </div>
                  {layoutMode === '2d_3d' && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onLayoutModeChange('algebra_2d');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Cebir Paneli + 2D</span>
                  </div>
                  {layoutMode === 'algebra_2d' && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onLayoutModeChange('three_col');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Columns2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Hesap / 3 Sütun (Cebir+2D+3D)</span>
                  </div>
                  {layoutMode === 'three_col' && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <div className="my-1 border-t border-border/60" />

                <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Düzlem Ögeleri
                </div>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, showGrid: !prev.showGrid }));
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Grid className="w-3.5 h-3.5 text-blue-600" />
                    <span>Izgara</span>
                  </div>
                  {viewport.showGrid && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, showAxes: !prev.showAxes }));
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-teal-600" />
                    <span>Eksenler</span>
                  </div>
                  {viewport.showAxes && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={handleResetView}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Görünümü Sıfırla (Yakınlaştır)</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 4. ARAÇLAR MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('araclar')}
              onMouseEnter={() => handleMenuHeaderHover('araclar')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeMenu === 'araclar'
                  ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Araçlar
            </button>
            {activeMenu === 'araclar' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-popover/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-xl border border-border/80 py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    closeMenu();
                    onSelectTool('select');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MousePointer className="w-3.5 h-3.5 text-blue-500" />
                    <span>Seçim</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">V</span>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onSelectTool('point');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Dot className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Nokta</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">P</span>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onSelectTool('segment');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Minus className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Doğru / Parça</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">S</span>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onSelectTool('circle');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Circle className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Çember</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">C</span>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onSelectTool('polygon');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Shapes className="w-3.5 h-3.5 text-purple-500" />
                    <span>Çokgen</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">G</span>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={() => {
                    closeMenu();
                    onSelectTool('measure_distance');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Ruler className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ölçüm (Uzunluk / Açı)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">M</span>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onSelectTool('reflect');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FlipHorizontal className="w-3.5 h-3.5 text-rose-500" />
                    <span>Dönüşüm (Simetri / Öteleme)</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onSelectTool('perpendicular');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5 text-teal-500" />
                    <span>Geometri Araçları (Dikme/Teğet)</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 5. EKLE MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('ekle')}
              onMouseEnter={() => handleMenuHeaderHover('ekle')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeMenu === 'ekle'
                  ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Ekle
            </button>
            {activeMenu === 'ekle' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-popover/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-xl border border-border/80 py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    closeMenu();
                    onSelectTool('text');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Type className="w-3.5 h-3.5 text-blue-500" />
                    <span>Metin</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">T</span>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Görsel</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onOpenFunctionDialog();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FunctionSquare className="w-3.5 h-3.5 text-violet-500" />
                    <span>Denklem / Fonksiyon</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">F</span>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onOpenSliderDialog();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                    <span>Etkileşimli Sürgü</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onOpenAddObjectDialog();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-purple-500" />
                    <span>Medya & 3D Cisim</span>
                  </div>
                </button>

                {onOpenRegularPolygonDialog && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onOpenRegularPolygonDialog();
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Shapes className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Düzgün Çokgen</span>
                    </div>
                  </button>
                )}

                <div className="my-1 border-t border-border/60" />

                <a
                  href="https://ogmmateryal.eba.gov.tr"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMenu}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>EBA Bağlantısı</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </div>
            )}
          </div>

          {/* 6. AYARLAR MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('ayarlar')}
              onMouseEnter={() => handleMenuHeaderHover('ayarlar')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeMenu === 'ayarlar'
                  ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Ayarlar
            </button>
            {activeMenu === 'ayarlar' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-popover/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-xl border border-border/80 py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    closeMenu();
                    setTheme(theme === 'dark' ? 'light' : 'dark');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-pink-500" />
                    <span>Tema: {theme === 'dark' ? 'Koyu' : 'Açık'}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Değiştir</span>
                </button>

                <div className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>Dil: Türkçe</span>
                  </div>
                  <Check className="w-3.5 h-3.5 text-primary" />
                </div>

                <div className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-3.5 h-3.5 text-teal-500" />
                    <span>Birim: Santimetre (cm)</span>
                  </div>
                </div>

                <div className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-amber-500">0.00</span>
                    <span>Ondalık: 2 Basamak</span>
                  </div>
                </div>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={() => {
                    closeMenu();
                    onToggleProperties('ayarlar');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Izgara & Eksen Ayarları...</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    setInfoModalType('shortcuts');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Kısayollar...</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 7. YARDIM MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('yardim')}
              onMouseEnter={() => handleMenuHeaderHover('yardim')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeMenu === 'yardim'
                  ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Yardım
            </button>
            {activeMenu === 'yardim' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-popover/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-xl border border-border/80 py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    closeMenu();
                    setInfoModalType('guide');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                    <span>Kullanım Kılavuzu</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    setInfoModalType('shortcuts');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-3.5 h-3.5 text-amber-500" />
                    <span>Klavye Kısayolları</span>
                  </div>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={() => {
                    closeMenu();
                    setInfoModalType('about');
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                    <span>GeoEBA Hakkında</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SAĞ: HIZLI DURUM BİLGİSİ */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
          <span className="hidden sm:inline bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-border/60">
            {objects.length} Nesne
          </span>
          <button
            onClick={() => onToggleProperties('ozellikler')}
            className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
            title="Özellikler Panelini Aç"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Özellikler</span>
          </button>
        </div>
      </div>

      {/* BİLGİLENDİRME MODALLARI (Kısayollar, Hakkında, Kılavuz) */}
      {infoModalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Modal Başlık */}
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                {infoModalType === 'shortcuts' && <Keyboard className="w-5 h-5 text-indigo-500" />}
                {infoModalType === 'about' && <Info className="w-5 h-5 text-blue-500" />}
                {infoModalType === 'guide' && <BookOpen className="w-5 h-5 text-emerald-500" />}
                <h3 className="font-bold text-base text-foreground">
                  {infoModalType === 'shortcuts' && 'Klavye Kısayolları'}
                  {infoModalType === 'about' && 'GeoEBA Hakkında'}
                  {infoModalType === 'guide' && 'Kullanım Kılavuzu'}
                </h3>
              </div>
              <button
                onClick={() => setInfoModalType(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal İçerik */}
            {infoModalType === 'shortcuts' && (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto text-xs pr-1">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'Ctrl + Z', desc: 'Geri Al' },
                    { key: 'Ctrl + Y', desc: 'Yinele' },
                    { key: 'Ctrl + S', desc: 'Projeyi Kaydet' },
                    { key: 'Ctrl + A', desc: 'Tümünü Seç' },
                    { key: 'Del / Backspace', desc: 'Seçiliyi Sil' },
                    { key: 'Esc', desc: 'İptal / Seçim Aracı' },
                    { key: 'P', desc: 'Nokta Aracı' },
                    { key: 'S', desc: 'Doğru Parçası' },
                    { key: 'L', desc: 'Doğru' },
                    { key: 'C', desc: 'Çember' },
                    { key: 'G', desc: 'Çokgen' },
                    { key: 'M', desc: 'Ölçüm' },
                    { key: 'T', desc: 'Metin' },
                    { key: 'F', desc: 'Fonksiyon' },
                  ].map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60"
                    >
                      <span className="font-mono font-bold text-primary">{s.key}</span>
                      <span className="text-muted-foreground">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {infoModalType === 'about' && (
              <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">GeoEBA</strong>, Millî Eğitim Bakanlığı müfredatına tam uyumlu; ilkokul, ortaokul ve lise kademelerinde geometri, matematik ve 3D uzamsal düşünme becerilerini geliştirmek amacıyla tasarlanmış yeni nesil etkileşimli çalışma ortamıdır.
                </p>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-foreground font-medium">
                  🚀 Sürüm: 1.0.0 (Etkileşimli 2D + 3D Hibrit Çizim Stüdyosu)
                </div>
                <p>
                  Tüm çizim araçları, dinamik fonksiyon grafikleyicisi, çokgen ağırlık merkezleri, 3D katı cisim açınımları ve EBA ders içerikleriyle entegre çalışır.
                </p>
              </div>
            )}

            {infoModalType === 'guide' && (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto text-xs text-muted-foreground leading-relaxed pr-1">
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <h4 className="font-bold text-foreground">1. Sol Menü (Araçlar, Nesneler, Bağlamlar)</h4>
                  <p>Sol taraftaki ağaç menüden dilediğiniz çizim aracını seçebilir, nesneler sekmesinden koordinatları inceleyebilirsiniz.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <h4 className="font-bold text-foreground">2. 2D ve 3D Görünümler</h4>
                  <p>Üstteki Görünüm menüsünden veya sol taraftaki Görünümler sekmesinden 2D, 3D veya yan yana çoklu görünümleri seçebilirsiniz.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <h4 className="font-bold text-foreground">3. Sağ Özellikler Paneli</h4>
                  <p>Sağdaki dikey Özellikler butonuna tıklayarak ızgara, koordinat eksenleri, bölge isimleri ve arkaplan ayarlarını kontrol edebilirsiniz.</p>
                </div>
              </div>
            )}

            {/* Modal Alt Buton */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInfoModalType(null)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
