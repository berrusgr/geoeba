'use client';

import React, { useState } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { ToolMode } from '@/types/workspace';
import {
  MousePointer,
  Dot,
  Minus,
  MoveRight,
  Ruler,
  Square,
  Triangle,
  Circle as CircleIcon,
  PenTool,
  Trash2,
  Compass,
  Sigma,
  RotateCw,
  FlipHorizontal,
  Sparkles,
  Image as ImageIcon,
  Type,
  Search,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  Calculator,
  Shapes,
  Table,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react';

interface ToolItem {
  id: ToolMode;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

interface ToolGroup {
  groupName: string;
  emoji: string;
  themeColor: string;
  badgeBg: string;
  containerBg: string;
  containerBorder: string;
  headerTextColor: string;
  tools: ToolItem[];
}

const TOOL_GROUPS: ToolGroup[] = [
  // 1. Temel Çizim Araçları (8) - Kırmızı / Mercan Pastel Arka Plan
  {
    groupName: 'Temel Çizim Araçları',
    emoji: '📐',
    themeColor: 'from-rose-500 to-red-600',
    badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    containerBg: 'bg-[#fff1f2] dark:bg-rose-950/25',
    containerBorder: 'border-rose-200/90 dark:border-rose-900/50',
    headerTextColor: 'text-rose-800 dark:text-rose-200',
    tools: [
      { id: 'select', name: 'Seç ve Taşı', description: 'Noktaları veya nesneleri seçip sürükleyin.', icon: <MousePointer className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'point', name: 'Nokta', description: 'Tuvale tıklayarak yeni nokta oluşturun.', icon: <Dot className="w-6 h-6" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'segment', name: 'Doğru Parçası', description: 'İki nokta arasına doğru parçası çizin.', icon: <Minus className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'line', name: 'Doğru', description: 'İki noktadan geçen sonsuz doğru çizin.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'square', name: 'Kare', description: 'Kare şekli oluşturun.', icon: <Square className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'polygon', name: 'Çokgen', description: 'Köşeleri belirleyerek çokgen çizin.', icon: <Triangle className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'circle', name: 'Çember', description: 'Merkez ve yarıçap noktasıyla çember çizin.', icon: <CircleIcon className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'pen', name: 'Kalem', description: 'Serbest çizim kalemi.', icon: <PenTool className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
    ],
  },

  // 2. Düzenleme Araçları (2) - Mavi Pastel Arka Plan
  {
    groupName: 'Düzenleme Araçları',
    emoji: '✂️',
    themeColor: 'from-blue-500 to-indigo-600',
    badgeBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    containerBg: 'bg-[#eff6ff] dark:bg-blue-950/25',
    containerBorder: 'border-blue-200/90 dark:border-blue-900/50',
    headerTextColor: 'text-blue-800 dark:text-blue-200',
    tools: [
      { id: 'select', name: 'Nesneleri Seç', description: 'Çoklu nesne seçimi.', icon: <MousePointer className="w-4 h-4" />, iconBg: 'bg-blue-500/10 dark:bg-blue-500/20', iconColor: 'text-blue-600 dark:text-blue-400' },
      { id: 'delete', name: 'Sil', description: 'Silmek istediğiniz nesneye dokunun.', icon: <Trash2 className="w-4 h-4" />, iconBg: 'bg-red-500/10 dark:bg-red-500/20', iconColor: 'text-red-600 dark:text-red-400' },
    ],
  },

  // 3. Ölçme Araçları (9) - Nane / Zümrüt Yeşili Pastel Arka Plan
  {
    groupName: 'Ölçme Araçları',
    emoji: '📏',
    themeColor: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    containerBg: 'bg-[#ecfdf5] dark:bg-emerald-950/25',
    containerBorder: 'border-emerald-200/90 dark:border-emerald-900/50',
    headerTextColor: 'text-emerald-800 dark:text-emerald-200',
    tools: [
      { id: 'measure_angle', name: 'Açıölçer', description: 'Açı ölçümü yapın.', icon: <Compass className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'angle', name: 'Açı Oluştur', description: '3 nokta ile açı oluşturun.', icon: <Sigma className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'measure_distance', name: 'Uzunluk Ölç', description: 'Mesafe ve uzunluk ölçün.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'measure_area', name: 'Alanı Bul', description: 'Kapalı şeklin alanını hesaplayın.', icon: <Square className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'unit_measure', name: 'Birimle Ölç', description: 'Birim karelerle ölçüm yapın.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'measure_perimeter', name: 'Çevre Tahmin', description: 'Şekil çevre hesabı.', icon: <Square className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'area_model', name: 'Alanı Modelle', description: 'Alan modelleme ızgarası.', icon: <Square className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'ruler', name: 'Cetvel', description: 'İnteraktif cetvel aracı.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'setsquare', name: 'Gönye', description: 'Dik açı ve gönye aracı.', icon: <Triangle className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    ],
  },

  // 4. Çokgen & Şekil Araçları (3) - Sıcak Kehribar / Sarı Pastel Arka Plan
  {
    groupName: 'Çokgen Araçları',
    emoji: '⬡',
    themeColor: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    containerBg: 'bg-[#fffbeb] dark:bg-amber-950/25',
    containerBorder: 'border-amber-200/90 dark:border-amber-900/50',
    headerTextColor: 'text-amber-800 dark:text-amber-200',
    tools: [
      { id: 'polygon', name: 'Şekil Oluştur', description: 'Serbest çokgen çizin.', icon: <Triangle className="w-4 h-4" />, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
      { id: 'rectangle', name: 'Dikdörtgen', description: 'Dikdörtgen şekli ekleyin.', icon: <Square className="w-4 h-4" />, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
      { id: 'regular_polygon', name: 'Düzgün Çokgen', description: 'Eşit kenarlı düzgün çokgen oluşturun.', icon: <Sigma className="w-4 h-4" />, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
    ],
  },

  // 5. Dönüşüm & Simetri Araçları (3) - Mor Pastel Arka Plan
  {
    groupName: 'Dönüşüm Araçları',
    emoji: '🔄',
    themeColor: 'from-purple-500 to-fuchsia-600',
    badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    containerBg: 'bg-[#faf5ff] dark:bg-purple-950/25',
    containerBorder: 'border-purple-200/90 dark:border-purple-900/50',
    headerTextColor: 'text-purple-800 dark:text-purple-200',
    tools: [
      { id: 'rotate', name: 'Şekli Döndür', description: 'Şekli bir merkez etrafında döndürün.', icon: <RotateCw className="w-4 h-4" />, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600 dark:text-purple-400' },
      { id: 'reflect', name: 'Yansıt', description: 'Doğruya göre simetri / yansıma.', icon: <FlipHorizontal className="w-4 h-4" />, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600 dark:text-purple-400' },
      { id: 'symmetry', name: 'Simetri Keşfet', description: 'Simetri eksenlerini keşfedin.', icon: <Sparkles className="w-4 h-4" />, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600 dark:text-purple-400' },
    ],
  },

  // 6. Kesir & Medya Araçları (3) - Turuncu / Şeftali Pastel Arka Plan
  {
    groupName: 'Kesir & Medya',
    emoji: '🎨',
    themeColor: 'from-orange-500 to-amber-600',
    badgeBg: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
    containerBg: 'bg-[#fff7ed] dark:bg-orange-950/25',
    containerBorder: 'border-orange-200/90 dark:border-orange-900/50',
    headerTextColor: 'text-orange-800 dark:text-orange-200',
    tools: [
      { id: 'fraction', name: 'Kesir Göster', description: 'Kesir modeli oluşturun.', icon: <span className="font-bold text-xs">½</span>, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
      { id: 'image', name: 'Görsel Ekle', description: 'Tuvale görsel ekleyin.', icon: <ImageIcon className="w-4 h-4" />, iconBg: 'bg-orange-500/10', iconColor: 'text-orange-600 dark:text-orange-400' },
      { id: 'text', name: 'Yazı Ekle', description: 'Tuvale metin kutusu ekleyin.', icon: <Type className="w-4 h-4" />, iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-600 dark:text-cyan-400' },
    ],
  },
];

interface ToolbarProps {
  onOpenFunctionDialog?: () => void;
  onOpenSliderDialog?: () => void;
}

export function Toolbar({ onOpenFunctionDialog, onOpenSliderDialog }: ToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    objects,
    updateObject,
    deleteObject,
    addObject,
    addFunction,
    pendingPointIds,
  } = useWorkspace();

  const [toolSearch, setToolSearch] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'cebir' | 'araclar' | 'tablo'>('araclar');

  // Cebir Input State
  const [algebraInput, setAlgebraInput] = useState('');

  // Spreadsheet Tablo Verileri: 10 Satır x 3 Sütun (A, B, C)
  const [tableData, setTableData] = useState<string[][]>(
    Array(10).fill(null).map(() => ['', '', ''])
  );

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Temel Çizim Araçları': true,
    'Düzenleme Araçları': true,
    'Ölçme Araçları': true,
    'Çokgen Araçları': true,
    'Dönüşüm Araçları': true,
    'Kesir & Medya': true,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleToolClick = (toolId: ToolMode) => {
    if (toolId === 'function') {
      if (onOpenFunctionDialog) onOpenFunctionDialog();
      return;
    }
    if (toolId === 'slider') {
      if (onOpenSliderDialog) onOpenSliderDialog();
      return;
    }
    setActiveTool(toolId);
  };

  // Spreadsheet Hücre Değişimi & Nokta Çizme
  const handleTableCellChange = (rowIdx: number, colIdx: number, val: string) => {
    const newData = tableData.map((row, rIdx) =>
      rIdx === rowIdx
        ? row.map((cell, cIdx) => (cIdx === colIdx ? val : cell))
        : row
    );
    setTableData(newData);

    const coordRegex = /^\s*\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?\s*$/;
    const numRegex = /^\s*(-?\d+\.?\d*)\s*$/;

    for (let r = 0; r < 10; r++) {
      const valA = r === rowIdx && colIdx === 0 ? val : newData[r][0];
      const valB = r === rowIdx && colIdx === 1 ? val : newData[r][1];

      const matchA = valA.trim().match(numRegex);
      const matchB = valB.trim().match(numRegex);

      const rowPointId = `spreadsheet-row-point-${r}`;

      if (matchA && matchB) {
        const x = parseFloat(matchA[1]);
        const y = parseFloat(matchB[1]);
        const existing = objects.find((o) => o.id === rowPointId);
        if (existing) {
          updateObject(rowPointId, { x, y } as any, false);
        } else {
          addObject({
            id: rowPointId,
            type: 'point',
            name: `P${r + 1}`,
            color: '#3b82f6',
            x,
            y,
            isLocked: false,
            visible: true,
          } as any);
        }
      } else {
        if (objects.some((o) => o.id === rowPointId)) {
          deleteObject(rowPointId);
        }
      }

      for (let c = 0; c < 3; c++) {
        const cellVal = r === rowIdx && colIdx === c ? val : newData[r][c];
        const cellPointId = `spreadsheet-point-${r}-${c}`;
        const matchCoord = cellVal.match(coordRegex);

        if (matchCoord) {
          const x = parseFloat(matchCoord[1]);
          const y = parseFloat(matchCoord[2]);
          const colLetter = c === 0 ? 'A' : c === 1 ? 'B' : 'C';

          const existing = objects.find((o) => o.id === cellPointId);
          if (existing) {
            updateObject(cellPointId, { x, y } as any, false);
          } else {
            addObject({
              id: cellPointId,
              type: 'point',
              name: `${colLetter}${r + 1}`,
              color: '#6366f1',
              x,
              y,
              isLocked: false,
              visible: true,
            } as any);
          }
        } else {
          if (objects.some((o) => o.id === cellPointId)) {
            deleteObject(cellPointId);
          }
        }
      }
    }
  };

  const getObjectDetails = (obj: any) => {
    switch (obj.type) {
      case 'point':
        return `(${obj.x.toFixed(1)}, ${obj.y.toFixed(1)})`;
      case 'circle': {
        let r = obj.fixedRadius ?? 0;
        if (obj.radiusPointId && !r) {
          const center = objects.find((o) => o.id === obj.centerPointId) as any;
          const rPoint = objects.find((o) => o.id === obj.radiusPointId) as any;
          if (center && rPoint) {
            const dx = rPoint.x - center.x;
            const dy = rPoint.y - center.y;
            r = Math.sqrt(dx * dx + dy * dy);
          }
        }
        return `Yarıçap: ${r.toFixed(1)} br`;
      }
      case 'line':
        return 'Doğru';
      case 'segment':
        return 'Doğru Parçası';
      case 'polygon': {
        const köşeSayısı = obj.pointIds?.length || 0;
        return `Çokgen (${köşeSayısı} Köşe)`;
      }
      case 'pen':
        return 'Serbest Çizim';
      case 'fraction':
        return `Kesir (${obj.numerator}/${obj.denominator})`;
      default:
        return obj.type;
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-card/95 backdrop-blur-md border-r border-border select-none z-30 overflow-hidden shadow-xs shrink-0">
      
      {/* 1. SOL DİKEY MENÜ SEÇİCİ (GeoGebra Birebir Stil) */}
      <div className="w-14 shrink-0 h-full border-r border-border flex flex-col items-center py-4 justify-between bg-slate-50/70 dark:bg-slate-900/60">
        
        {/* Üst Kısım: Cebir, Araçlar, Tablo Butonları */}
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Cebir Sekmesi */}
          <button
            onClick={() => {
              setSidebarTab('cebir');
              setIsCollapsed(false);
            }}
            title="Cebir Görünümü (Cebirsel İfadeler & Fonksiyonlar)"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              sidebarTab === 'cebir' && !isCollapsed
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Calculator className="w-5 h-5" />
          </button>

          {/* Araçlar Sekmesi */}
          <button
            onClick={() => {
              setSidebarTab('araclar');
              setIsCollapsed(false);
            }}
            title="Araçlar Görünümü (Geometrik Çizim Araçları)"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              sidebarTab === 'araclar' && !isCollapsed
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Shapes className="w-5 h-5" />
          </button>

          {/* Tablo Sekmesi */}
          <button
            onClick={() => {
              setSidebarTab('tablo');
              setIsCollapsed(false);
            }}
            title="Hesap Tablosu Görünümü (Spreadsheet)"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              sidebarTab === 'tablo' && !isCollapsed
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Table className="w-5 h-5" />
          </button>
        </div>

        {/* Alt Kısım: Daraltma / Genişletme */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Genişlet" : "Daralt"}
          className="w-10 h-10 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. SAĞ KISIM: İÇERİK PANALE */}
      {!isCollapsed && (
        <div className="w-64 sm:w-72 h-full flex flex-col min-h-0 overflow-hidden">
          
          {/* A. CEBİR GÖRÜNÜMÜ */}
          {sidebarTab === 'cebir' && (
            <div className="flex-1 flex flex-col min-h-0 bg-card">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-black text-foreground">Cebir Girişleri</h3>
              </div>

              {/* Obje Listesi */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
                {objects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                    Masada henüz nesne yok.<br/>Nesne çizin veya aşağıdan fonksiyon girin.
                  </div>
                ) : (
                  objects.map((obj) => (
                    <div key={obj.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Görünürlük Düğmesi */}
                        <button
                          onClick={() => updateObject(obj.id, { visible: obj.visible !== false ? false : true })}
                          className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                          title={obj.visible !== false ? 'Gizle' : 'Göster'}
                        >
                          {obj.visible !== false ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        
                        <div className="text-xs font-black text-foreground truncate leading-tight">
                          <span className="text-primary mr-1">{obj.label}:</span>
                          <span className="font-mono text-muted-foreground text-[10px]">
                            {getObjectDetails(obj)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteObject(obj.id)}
                        className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Cebir Fonksiyon / Formül Girişi */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (algebraInput.trim()) {
                    addFunction(algebraInput);
                    setAlgebraInput('');
                  }
                }}
                className="p-3 border-t border-border shrink-0 space-y-2 bg-muted/15"
              >
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  Matematiksel İfade Ekle (f(x))
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={algebraInput}
                    onChange={(e) => setAlgebraInput(e.target.value)}
                    placeholder="Örn: x^2 - 2 veya sin(x)"
                    className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs outline-none focus:border-primary placeholder:text-muted-foreground font-mono"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors cursor-pointer"
                    title="Ekle"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* B. ARAÇLAR GÖRÜNÜMÜ */}
          {sidebarTab === 'araclar' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                <h3 className="text-xs font-black text-foreground tracking-tight">Geometri Araçları</h3>
              </div>

              {/* Arama Çubuğu */}
              <div className="p-3 border-b border-border/60 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Araç veya komut ara..."
                    className="w-full pl-8.5 pr-3 py-2 rounded-xl bg-muted/60 border border-border/80 text-foreground text-xs placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Araç Grupları Listesi */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin">
                {TOOL_GROUPS.map((group) => {
                  const isExpanded = expandedGroups[group.groupName] ?? true;
                  const matchingTools = group.tools.filter(
                    (t) => toolSearch.trim() === '' || t.name.toLowerCase().includes(toolSearch.toLowerCase())
                  );

                  if (matchingTools.length === 0) return null;

                  return (
                    <div
                      key={group.groupName}
                      className={`rounded-2xl p-2.5 ${group.containerBg} border ${group.containerBorder} space-y-2 shadow-2xs transition-all`}
                    >
                      {/* Grup Başlığı */}
                      <button
                        onClick={() => toggleGroup(group.groupName)}
                        className={`w-full flex items-center justify-between px-1.5 py-1 text-xs font-black ${group.headerTextColor} hover:opacity-80 transition-opacity cursor-pointer`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{group.emoji}</span>
                          <span className="text-xs font-black">{group.groupName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${group.badgeBg}`}>
                            {matchingTools.length}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* 2 Sütunlu Buton Kartları */}
                      {isExpanded && (
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          {matchingTools.map((tool) => {
                            const isActive = activeTool === tool.id;

                            return (
                              <button
                                key={tool.id}
                                onClick={() => handleToolClick(tool.id)}
                                title={`${tool.name} — ${tool.description}`}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                                  isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-sm scale-102 ring-2 ring-primary/20'
                                    : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-primary/40 shadow-2xs hover:-translate-y-0.5'
                                }`}
                              >
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform ${
                                    isActive
                                      ? 'bg-white/20 text-white'
                                      : `${tool.iconBg} ${tool.iconColor}`
                                  }`}
                                >
                                  {tool.icon}
                                </div>

                                <span
                                  className={`text-xs font-extrabold truncate leading-tight ${
                                    isActive ? 'text-white' : 'text-foreground'
                                  }`}
                                >
                                  {tool.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* C. TABLO SPREADSHEET GÖRÜNÜMÜ */}
          {sidebarTab === 'tablo' && (
            <div className="flex-1 flex flex-col min-h-0 bg-card">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-black text-foreground">Hesap Tablosu</h3>
              </div>

              {/* Hücre Giriş Açıklaması */}
              <div className="p-3 bg-muted/30 border-b border-border text-[10px] text-muted-foreground leading-normal font-medium">
                Sütunlara <strong className="text-primary">(x, y)</strong> formatında değer girerek otomatik nokta oluşturabilirsiniz. Örn: <code className="bg-background px-1 py-0.5 rounded font-mono">(2, 3)</code>
              </div>

              {/* Spreadsheet Grid */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-left text-xs font-mono">
                  <thead className="sticky top-0 bg-muted/70 z-10">
                    <tr className="border-b border-border">
                      <th className="w-10 px-2 py-1.5 text-center text-muted-foreground font-black border-r border-border bg-muted/80">#</th>
                      <th className="px-2 py-1.5 text-center text-muted-foreground font-black border-r border-border">A</th>
                      <th className="px-2 py-1.5 text-center text-muted-foreground font-black border-r border-border">B</th>
                      <th className="px-2 py-1.5 text-center text-muted-foreground font-black">C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                        <td className="w-10 px-2 py-1.5 text-center text-muted-foreground font-black border-r border-border bg-muted/30">{rIdx + 1}</td>
                        <td className="p-0 border-r border-border/60">
                          <input
                            type="text"
                            value={row[0]}
                            onChange={(e) => handleTableCellChange(rIdx, 0, e.target.value)}
                            className="w-full h-8 px-2 bg-transparent outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/20 text-center font-mono text-xs text-foreground font-semibold"
                          />
                        </td>
                        <td className="p-0 border-r border-border/60">
                          <input
                            type="text"
                            value={row[1]}
                            onChange={(e) => handleTableCellChange(rIdx, 1, e.target.value)}
                            className="w-full h-8 px-2 bg-transparent outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/20 text-center font-mono text-xs text-foreground font-semibold"
                          />
                        </td>
                        <td className="p-0">
                          <input
                            type="text"
                            value={row[2]}
                            onChange={(e) => handleTableCellChange(rIdx, 2, e.target.value)}
                            className="w-full h-8 px-2 bg-transparent outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/20 text-center font-mono text-xs text-foreground font-semibold"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bekleyen Seçim Bilgisi */}
          {pendingPointIds.length > 0 && (
            <div className="p-3 border-t border-border bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-300 font-medium shrink-0">
              <span className="font-bold">Bekleyen Seçim: </span>
              <span>{pendingPointIds.length} nokta seçildi. Devam etmek için sıradaki noktaya tıklayın.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
