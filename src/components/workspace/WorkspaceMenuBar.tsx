'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useTheme } from '@/state/ThemeContext';
import { ToolMode } from '@/types/workspace';
import { LayoutMode } from './PropertiesPanel';
import { exportPng, exportSvg, exportPdf, exportWord } from '@/utils/exportCanvas';
import { StylePanel } from './StylePanel';
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
  Contrast,
  Sliders,
  Maximize2,
  Moon,
  Sun,
} from 'lucide-react';

export interface WorkspaceMenuBarProps {
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
  onSelectTool?: (tool: ToolMode) => void;
  onOpenFunctionDialog?: () => void;
  onOpenSliderDialog?: () => void;
  onOpenAddObjectDialog?: () => void;
  onOpenRegularPolygonDialog?: () => void;
  onClearAll?: () => void;
  onResetView?: () => void;
}

type MenuKey = 'dosya' | 'duzenle' | 'gorunum' | 'araclar' | 'ekle' | 'ayarlar' | 'yardim' | null;

export function WorkspaceMenuBar(props: WorkspaceMenuBarProps = {}) {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [infoModalType, setInfoModalType] = useState<'shortcuts' | 'about' | 'guide' | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'stil' | 'duzlem' | 'genel'>('stil');
  const menuBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BG_COLORS = [
    { color: '#ffffff', name: 'Beyaz' },
    { color: '#f3e8ff', name: 'Lavanta' },
    { color: '#e0f2fe', name: 'Buz Mavisi' },
    { color: '#e6f4ea', name: 'Mint Yeşili' },
    { color: '#fef3c7', name: 'Pastel Sarı' },
    { color: '#ffedd5', name: 'Şeftali' },
    { color: '#ffe4e6', name: 'Pembe' },
    { color: '#1e293b', name: 'Koyu Slate' },
  ];

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
    layoutMode: ctxLayoutMode,
    setLayoutMode: ctxSetLayoutMode,
    isFunctionDialogOpen,
    setIsFunctionDialogOpen,
    isSliderDialogOpen,
    setIsSliderDialogOpen,
    isAddObjectDialogOpen,
    setIsAddObjectDialogOpen,
    openRegularPolygonDialog,
    activateTool,
    requestClearAll,
    studioDimension,
  } = useWorkspace();

  const layoutMode = props.layoutMode ?? ctxLayoutMode;
  const onLayoutModeChange = props.onLayoutModeChange ?? ctxSetLayoutMode;
  const onSelectTool = props.onSelectTool ?? activateTool;
  const onOpenFunctionDialog = props.onOpenFunctionDialog ?? (() => setIsFunctionDialogOpen(true));
  const onOpenSliderDialog = props.onOpenSliderDialog ?? (() => setIsSliderDialogOpen(true));
  const onOpenAddObjectDialog = props.onOpenAddObjectDialog ?? (() => setIsAddObjectDialogOpen(true));
  const onOpenRegularPolygonDialog = props.onOpenRegularPolygonDialog ?? openRegularPolygonDialog;
  const onClearAll = props.onClearAll ?? (() => requestClearAll(studioDimension));
  const onResetView = props.onResetView ?? resetViewport;

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
        className="flex-1 flex items-center justify-between z-30 select-none min-w-0 relative"
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
              <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
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
              <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
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
              <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
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
              <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
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
              <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
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
              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
                {/* 1. Çalışma Alanı Ayarları Ana Butonu */}
                <button
                  onClick={() => {
                    closeMenu();
                    setIsSettingsModalOpen(true);
                  }}
                  className="w-[calc(100%-8px)] mx-1 px-3 py-2 flex items-center justify-between text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    <span>Çalışma Alanı Ayarları...</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="my-1 border-t border-border/60" />

                <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Hızlı Düzlem Ayarları
                </div>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, showGrid: !prev.showGrid }));
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Grid className="w-3.5 h-3.5 text-blue-500" />
                    <span>Izgara Çizgileri</span>
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
                    <Compass className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Koordinat Eksenleri (x, y)</span>
                  </div>
                  {viewport.showAxes && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, showCoordinates: !prev.showCoordinates }));
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Maximize className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Nokta Koordinatları</span>
                  </div>
                  {viewport.showCoordinates && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, showQuadrants: !prev.showQuadrants }));
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-600 px-1 rounded">I-IV</span>
                    <span>Bölge İsimleri (1-4)</span>
                  </div>
                  {viewport.showQuadrants && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }));
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🧲</span>
                    <span>Izgaraya Yapış (Snap)</span>
                  </div>
                  {viewport.snapToGrid && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <div className="my-1 border-t border-border/60" />

                {/* Hızlı Arkaplan Rengi */}
                <div className="px-3 py-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Hızlı Arkaplan
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {BG_COLORS.slice(0, 7).map((bg) => (
                      <button
                        key={bg.color}
                        type="button"
                        onClick={() => setViewport((prev) => ({ ...prev, backgroundColor: bg.color }))}
                        title={bg.name}
                        className={`w-5 h-5 rounded-full border border-black/15 shadow-2xs flex items-center justify-center transition-transform hover:scale-115 cursor-pointer ${
                          (viewport.backgroundColor || '#ffffff') === bg.color ? 'ring-2 ring-primary ring-offset-1 scale-110' : ''
                        }`}
                        style={{ backgroundColor: bg.color }}
                      >
                        {(viewport.backgroundColor || '#ffffff') === bg.color && (
                          <Check className="w-2.5 h-2.5 text-slate-800" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="my-1 border-t border-border/60" />

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
              <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
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

        {/* SAĞ: HIZLI İŞLEM VE TEMA BUTONLARI (SAĞA DAYALI) */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Geri Al / Yinele / Sığdır / Temizle Kapsülü */}
          <div className="flex items-center gap-0.5 bg-white/90 dark:bg-slate-800/90 p-0.5 rounded-2xl border border-slate-200/90 dark:border-slate-700/90 shadow-2xs">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Geri Al (Ctrl+Z)"
              aria-label="Geri Al"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Yinele (Ctrl+Y)"
              aria-label="Yinele"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />
            <button
              onClick={resetViewport}
              className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
              title="Görünümü Sıfırla (Merkeze Odaklan)"
              aria-label="Görünümü Sıfırla"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClearAll}
              className="p-1.5 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
              title="Tümünü Sil / Temizle"
              aria-label="Tümünü Sil"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tema Değiştirici Kapsülü */}
          <div className="flex items-center bg-white/90 dark:bg-slate-800/90 p-0.5 rounded-2xl border border-slate-200/90 dark:border-slate-700/90 shadow-2xs">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              title={theme === 'dark' ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
              aria-label={theme === 'dark' ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* BİLGİLENDİRME MODALLARI (Kısayollar, Hakkında, Kılavuz) */}
      {infoModalType && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                  <h4 className="font-bold text-foreground">3. Çalışma Alanı ve Düzlem Ayarları</h4>
                  <p>Üst menüdeki Ayarlar seçeneğinden ızgara, koordinat eksenleri, bölge isimleri, dik açı stili, çizim kalınlıkları ve arkaplan ayarlarını kontrol edebilirsiniz.</p>
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

      {/* ÇALIŞMA ALANI VE DÜZLEM AYARLARI MODALI */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Modal Başlık */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Çalışma Alanı Ayarları</h3>
                  <p className="text-[11px] text-muted-foreground">Tuval, ızgara, stil ve koordinat düzlemi tercihleri</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sekme Seçici (Stil, Düzlem, Genel) */}
            <div className="flex items-center px-5 pt-3 border-b border-border/60 bg-muted/20 shrink-0 gap-1.5">
              <button
                onClick={() => setSettingsTab('stil')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  settingsTab === 'stil'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Stil & Arkaplan</span>
              </button>

              <button
                onClick={() => setSettingsTab('duzlem')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  settingsTab === 'duzlem'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Görünüm & Düzlem</span>
              </button>

              <button
                onClick={() => setSettingsTab('genel')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  settingsTab === 'genel'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Genel & Sistem</span>
              </button>
            </div>

            {/* Modal Gövdesi (Scrollable) */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {settingsTab === 'stil' && (
                <div className="space-y-4">
                  {/* Arkaplan Rengi */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-primary" />
                      <span>Arkaplan Rengi</span>
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {BG_COLORS.map((bg) => {
                        const isSelected = (viewport.backgroundColor || '#ffffff') === bg.color;
                        return (
                          <button
                            key={bg.color}
                            type="button"
                            onClick={() => setViewport((prev) => ({ ...prev, backgroundColor: bg.color }))}
                            title={bg.name}
                            className={`w-7 h-7 rounded-full border border-black/10 shadow-xs flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                              isSelected ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''
                            }`}
                            style={{ backgroundColor: bg.color }}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-slate-700 dark:text-slate-800" />}
                          </button>
                        );
                      })}
                      <label
                        title="Özel Renk Seç"
                        className="w-7 h-7 rounded-full border border-dashed border-border bg-card flex items-center justify-center cursor-pointer hover:border-primary transition-colors text-muted-foreground hover:text-foreground shadow-xs"
                      >
                        <span className="text-xs font-black">+</span>
                        <input
                          type="color"
                          value={viewport.backgroundColor || '#ffffff'}
                          onChange={(e) => setViewport((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Dik Açı Stili */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider">
                      Dik Açı Sembol Stili
                    </h4>
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {[
                        { id: 'arc_dot', label: 'Yay + Nokta', icon: '⦠' },
                        { id: 'square', label: 'Kare Köşe', icon: '⊾' },
                        { id: 'arc_fill', label: 'Dolu Yay', icon: '◬' },
                        { id: 'l_shape', label: 'L-Köşe', icon: '└' },
                      ].map((style) => {
                        const isSelected = (viewport.rightAngleStyle || 'square') === style.id;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => setViewport((prev) => ({ ...prev, rightAngleStyle: style.id as any }))}
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                                : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                            }`}
                            title={style.label}
                          >
                            <span className="text-base leading-none mb-1 font-serif">{style.icon}</span>
                            <span className="text-[10px] text-center leading-tight">{style.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Çizim ve Metin Stili (StylePanel) */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                      <span>Çizim, Metin ve Sadeleştirme</span>
                    </h4>
                    <div className="pt-1">
                      <StylePanel />
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'duzlem' && (
                <div className="space-y-4">
                  {/* Nokta Yakalama Seçeneği */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider">
                      Nokta Yakalama Modu (Snapping)
                    </h4>
                    <select
                      value={!viewport.snapToGrid ? 'off' : viewport.pointSnapMode || 'snapToGrid'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'off') {
                          setViewport((prev) => ({ ...prev, snapToGrid: false, pointSnapMode: 'off' }));
                        } else {
                          setViewport((prev) => ({
                            ...prev,
                            snapToGrid: true,
                            pointSnapMode: val as any,
                          }));
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/80 text-foreground text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
                    >
                      <option value="automatic">Otomatik</option>
                      <option value="snapToGrid">Izgaraya Sıçra</option>
                      <option value="fixedToGrid">Izgaraya Sabitli</option>
                      <option value="off">Kapalı</option>
                    </select>
                  </div>

                  {/* Görünüm ve Koordinat Düzlemi Seçenekleri */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider">
                      Düzlem Elemanları
                    </h4>

                    <div className="space-y-2 text-xs pt-1">
                      {/* Izgara */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                        <div className="flex items-center gap-2.5">
                          <Grid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-foreground font-bold">Izgara Çizgileri</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={viewport.showGrid}
                          onChange={(e) => setViewport((prev) => ({ ...prev, showGrid: e.target.checked }))}
                          className="sr-only"
                        />
                        {viewport.showGrid ? (
                          <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-card shrink-0" />
                        )}
                      </label>

                      {/* Eksenler */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                        <div className="flex items-center gap-2.5">
                          <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                          <span className="text-foreground font-bold">Koordinat Eksenleri (x, y)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={viewport.showAxes}
                          onChange={(e) => setViewport((prev) => ({ ...prev, showAxes: e.target.checked }))}
                          className="sr-only"
                        />
                        {viewport.showAxes ? (
                          <div className="w-5 h-5 rounded-md bg-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-card shrink-0" />
                        )}
                      </label>

                      {/* Nokta Koordinatları */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                        <div className="flex items-center gap-2.5">
                          <Maximize className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-foreground font-bold">Nokta Koordinatları</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={viewport.showCoordinates}
                          onChange={(e) => setViewport((prev) => ({ ...prev, showCoordinates: e.target.checked }))}
                          className="sr-only"
                        />
                        {viewport.showCoordinates ? (
                          <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-card shrink-0" />
                        )}
                      </label>

                      {/* Bölge İsimleri */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                        <div className="flex items-center gap-2.5">
                          <div className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 border border-amber-300 text-amber-700 dark:text-amber-400 text-[10px] font-black">
                            I-IV
                          </div>
                          <span className="text-foreground font-bold">Bölge İsimleri (1, 2, 3, 4. Bölge)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={viewport.showQuadrants ?? false}
                          onChange={(e) => setViewport((prev) => ({ ...prev, showQuadrants: e.target.checked }))}
                          className="sr-only"
                        />
                        {viewport.showQuadrants ? (
                          <div className="w-5 h-5 rounded-md bg-amber-600 flex items-center justify-center text-white shadow-xs shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-card shrink-0" />
                        )}
                      </label>

                      {/* Siyah-Beyaz Mod */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                        <div className="flex items-center gap-2.5">
                          <Contrast className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                          <span className="text-foreground font-bold">Siyah–Beyaz Mod</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={viewport.blackWhite ?? false}
                          onChange={(e) => setViewport((prev) => ({ ...prev, blackWhite: e.target.checked }))}
                          className="sr-only"
                        />
                        {viewport.blackWhite ? (
                          <div className="w-5 h-5 rounded-md bg-slate-700 flex items-center justify-center text-white shadow-xs shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-card shrink-0" />
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'genel' && (
                <div className="space-y-4">
                  {/* Arayüz Teması */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Arayüz Teması</div>
                      <div className="text-[11px] text-muted-foreground">Koyu veya açık renk teması</div>
                    </div>
                    <button
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Palette className="w-3.5 h-3.5 text-pink-500" />
                      <span>{theme === 'dark' ? 'Koyu Tema' : 'Açık Tema'}</span>
                    </button>
                  </div>

                  {/* Ölçü ve Sayı Standardı */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
                    <div className="text-xs font-bold text-foreground">Sayı ve Ölçü Standartları</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Ondalık Ayırıcı:</span>
                        <span className="font-bold text-foreground">Virgül (,) — MEB Standardı</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Varsayılan Uzunluk Birimi:</span>
                        <span className="font-bold text-foreground">Birim (br)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Açı Birimi:</span>
                        <span className="font-bold text-foreground">Derece (°)</span>
                      </div>
                    </div>
                  </div>

                  {/* Kısayollar ve Bilgi */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Klavye Kısayolları</div>
                      <div className="text-[11px] text-muted-foreground">Hızlı çizim ve işlem tuş kombinasyonları</div>
                    </div>
                    <button
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        setInfoModalType('shortcuts');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Görüntüle</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Alt Buton */}
            <div className="px-5 py-3 border-t border-border/70 bg-muted/20 flex justify-end shrink-0">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
