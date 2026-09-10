'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspace } from '@/state/WorkspaceContext';
import { ToolMode } from '@/types/workspace';
import {
  MathObject,
  PointObject,
  FunctionObject,
  CircleObject,
  EllipseObject,
  SegmentObject,
  AngleObject,
  SliderObject,
  MeasurementObject,
} from '@/types/math';
import {
  generateNextPointLabel,
  calculateDistance,
  calculateAngleDegrees,
  calculateSlope,
  rightTriangleRatios,
} from '@/math/geometry';
import { formatTurkishNumber } from '@/math/coordinates';
import { validateMathExpression, extractVariableNames, compileMathExpression, evaluateNumericInput } from '@/math/parser';
import {
  MousePointer,
  Dot,
  CheckSquare,
  MousePointerClick,
  TextCursorInput,
  Scissors,
  SeparatorVertical,
  GitBranch,
  Equal,
  X as XIcon,
  Minus,
  MoveRight,
  Ruler,
  Square,
  Triangle,
  Circle as CircleIcon,
  CircleDot,
  Spline,
  PieChart,
  Egg,
  PenTool,
  Trash2,
  Compass,
  Sigma,
  Hexagon,
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
  TrendingUp,
  Sliders,
  Check,
  X,
  AlertCircle,
  Keyboard,
} from 'lucide-react';
import { MathKeypad } from '@/components/workspace/MathKeypad';

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
  // 1. Temel Çizim Araçları - Kırmızı / Mercan Pastel Arka Plan
  {
    groupName: 'Temel Çizim Araçları',
    emoji: '📐',
    themeColor: 'from-rose-500 to-red-600',
    badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    containerBg: 'bg-[#fff1f2] dark:bg-rose-950/25',
    containerBorder: 'border-rose-200/90 dark:border-rose-900/50',
    headerTextColor: 'text-rose-800 dark:text-rose-200',
    tools: [
      { id: 'point', name: 'Nokta', description: 'Tuvale tıklayarak yeni nokta oluşturun.', icon: <Dot className="w-6 h-6" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'segment', name: 'Doğru Parçası', description: 'İki nokta arasına doğru parçası çizin.', icon: <Minus className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'line', name: 'Doğru', description: 'İki noktadan geçen sonsuz doğru çizin.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'ray', name: 'Işın', description: 'Başlangıç noktası ve üzerinden geçen ikinci nokta ile ışın çizin.', icon: <MoveRight className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'segment_length', name: 'Ölçülü Parça', description: 'Bir başlangıç noktasına tıklayın, uzunluğu sayı olarak girin.', icon: <Ruler className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'circle', name: 'Çember', description: 'Merkez ve yarıçap noktasıyla çember çizin.', icon: <CircleIcon className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'pen', name: 'Kalem', description: 'Serbest çizim kalemi.', icon: <PenTool className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
    ],
  },

  // 2. Düzenleme Araçları - Mavi Pastel Arka Plan
  {
    groupName: 'Düzenleme Araçları',
    emoji: '✂️',
    themeColor: 'from-blue-500 to-indigo-600',
    badgeBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    containerBg: 'bg-[#eff6ff] dark:bg-blue-950/25',
    containerBorder: 'border-blue-200/90 dark:border-blue-900/50',
    headerTextColor: 'text-blue-800 dark:text-blue-200',
    tools: [
      { id: 'select', name: 'Seç ve Taşı', description: 'Noktaları veya nesneleri seçip sürükleyin.', icon: <MousePointer className="w-4 h-4" />, iconBg: 'bg-blue-500/10 dark:bg-blue-500/20', iconColor: 'text-blue-600 dark:text-blue-400' },
      { id: 'delete', name: 'Sil', description: 'Silmek istediğiniz nesneye dokunun.', icon: <Trash2 className="w-4 h-4" />, iconBg: 'bg-red-500/10 dark:bg-red-500/20', iconColor: 'text-red-600 dark:text-red-400' },
    ],
  },

  // 3. Ölçme Araçları - Nane / Zümrüt Yeşili Pastel Arka Plan
  {
    groupName: 'Ölçme Araçları',
    emoji: '📏',
    themeColor: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    containerBg: 'bg-[#ecfdf5] dark:bg-emerald-950/25',
    containerBorder: 'border-emerald-200/90 dark:border-emerald-900/50',
    headerTextColor: 'text-emerald-800 dark:text-emerald-200',
    tools: [
      { id: 'measure_distance', name: 'Uzunluk Ölç (cm)', description: 'Mesafe ve uzunluk ölçün.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'unit_measure', name: 'Birimle Ölç (br)', description: 'Birim karelerle ölçüm yapın.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'measure_angle', name: 'Açıölçer', description: 'Açı ölçümü yapın.', icon: <Compass className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'angle', name: 'Açı Oluştur', description: '3 nokta ile açı oluşturun.', icon: <Sigma className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'measure_area', name: 'Alanı Bul', description: 'Kapalı şeklin alanını hesaplayın.', icon: <Square className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'measure_perimeter', name: 'Çevre Hesapla', description: 'Şeklin çevre uzunluğunu hesaplayın.', icon: <Square className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'measure_slope', name: 'Eğim Ölç', description: 'İki noktaya tıklayın; aradaki doğrunun eğimini gösterir.', icon: <TrendingUp className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'trig_ratios', name: 'Trig. Oranlar', description: 'Bir kola, AÇININ KÖŞESİNE ve diğer kola tıklayın; sin, cos, tan değerlerini gösterir. Üçgen dikse kenar oranları da yazılır.', icon: <Triangle className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'area_model', name: 'Alanı Modelle', description: 'Alan modelleme ızgarası.', icon: <Square className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'ruler', name: 'Cetvel', description: 'İnteraktif cetvel aracı.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'setsquare', name: 'Gönye', description: 'Dik açı ve gönye aracı.', icon: <Triangle className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    ],
  },

  // 4. Çokgen Araçları - Sıcak Kehribar / Sarı Pastel Arka Plan
  // Çember Araçları - Mor / Menekşe Pastel Arka Plan
  {
    groupName: 'Çember Araçları',
    emoji: '⭕',
    themeColor: 'from-violet-500 to-purple-600',
    badgeBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
    containerBg: 'bg-[#f5f3ff] dark:bg-violet-950/25',
    containerBorder: 'border-violet-200/90 dark:border-violet-900/50',
    headerTextColor: 'text-violet-800 dark:text-violet-200',
    tools: [
      { id: 'circle_radius', name: 'Yarıçapla Çember', description: 'Merkeze tıklayın, yarıçapı sayı olarak girin.', icon: <CircleDot className="w-4 h-4" />, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
      { id: 'circle_3points', name: '3 Noktalı Çember', description: 'Üç noktaya tıklayın; bu üç noktadan geçen çember (çevrel çember) çizilir.', icon: <CircleIcon className="w-4 h-4" />, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
      { id: 'arc', name: 'Yay', description: 'Merkez, başlangıç ve bitiş noktasına tıklayın; saat yönünün tersine yay çizilir.', icon: <Spline className="w-4 h-4" />, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
      { id: 'sector', name: 'Daire Dilimi', description: 'Yay ile aynı üç tıklama, ama içi dolu pasta dilimi çizilir.', icon: <PieChart className="w-4 h-4" />, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
      { id: 'ellipse', name: 'Elips', description: 'Tuvalde sürükleyin; sürüklediğiniz kutuya içten teğet elips çizilir.', icon: <Egg className="w-4 h-4" />, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
    ],
  },

  {
    groupName: 'Çokgen Araçları',
    emoji: '⬡',
    themeColor: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    containerBg: 'bg-[#fffbeb] dark:bg-amber-950/25',
    containerBorder: 'border-amber-200/90 dark:border-amber-900/50',
    headerTextColor: 'text-amber-800 dark:text-amber-200',
    tools: [
      { id: 'polygon', name: 'Çokgen', description: 'Köşeleri belirleyerek çokgen çizin.', icon: <Triangle className="w-4 h-4" />, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
      { id: 'rectangle', name: 'Dikdörtgen', description: 'Dikdörtgen şekli ekleyin.', icon: <Square className="w-4 h-4" />, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
      { id: 'square', name: 'Kare', description: 'Sürükleyerek kare çizin.', icon: <Square className="w-4 h-4" />, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
      { id: 'regular_polygon', name: 'Düzgün Çokgen', description: 'Kenar sayısını girerek düzgün çokgen oluşturun.', icon: <Hexagon className="w-4 h-4" />, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
    ],
  },

  // 5. Cebir & Fonksiyon Araçları - Gök Mavisi Pastel Arka Plan
  {
    groupName: 'Cebir & Fonksiyon',
    emoji: '𝑓',
    themeColor: 'from-sky-500 to-cyan-600',
    badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    containerBg: 'bg-[#f0f9ff] dark:bg-sky-950/25',
    containerBorder: 'border-sky-200/90 dark:border-sky-900/50',
    headerTextColor: 'text-sky-800 dark:text-sky-200',
    tools: [
      { id: 'function', name: 'Fonksiyon', description: 'f(x) ifadesi girerek grafik çizin.', icon: <TrendingUp className="w-4 h-4" />, iconBg: 'bg-sky-500/10', iconColor: 'text-sky-600 dark:text-sky-400' },
      { id: 'slider', name: 'Kaydırıcı', description: 'a, b gibi parametreler için kaydırıcı ekleyin.', icon: <Sliders className="w-4 h-4" />, iconBg: 'bg-sky-500/10', iconColor: 'text-sky-600 dark:text-sky-400' },
    ],
  },

  // 5.5 Klasik Geometri İnşaları - Çivit Mavisi Pastel Arka Plan
  // Pergel-cetvel geleneğindeki temel inşalar: orta nokta, orta dikme, açıortay,
  // dik/paralel doğru, pergel ve kesişim. Hepsi tıklanan NOKTALARDAN üretilir.
  {
    groupName: 'İnşa Araçları',
    emoji: '📐',
    themeColor: 'from-indigo-500 to-blue-600',
    badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    containerBg: 'bg-[#eef2ff] dark:bg-indigo-950/25',
    containerBorder: 'border-indigo-200/90 dark:border-indigo-900/50',
    headerTextColor: 'text-indigo-800 dark:text-indigo-200',
    tools: [
      { id: 'midpoint', name: 'Orta Nokta', description: 'İki noktaya tıklayın; aralarındaki orta nokta oluşur.', icon: <Dot className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'divide_ratio', name: 'Oranda Böl', description: 'İki noktaya tıklayın, sonra m:n oranını girin (örn. 2:1).', icon: <Scissors className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'perp_bisector', name: 'Orta Dikme', description: 'İki noktaya tıklayın; orta noktadan geçen dik doğru çizilir.', icon: <SeparatorVertical className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'angle_bisector', name: 'Açıortay', description: 'Açının bir kolu, köşesi ve diğer kolu: üç noktaya sırayla tıklayın.', icon: <GitBranch className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'perpendicular', name: 'Dik Doğru', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', icon: <Plus className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'parallel', name: 'Paralel Doğru', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', icon: <Equal className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'compass', name: 'Pergel', description: 'İğneyi saplayın, açıklığı ayarlayın, yayın başlangıcını istediğiniz yere bırakın ve iki yöne de çizin.', icon: <Compass className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'intersect', name: 'Kesiştir', description: 'İki şekle tıklayın; ortak noktalarını oluşturur. Doğru, ışın, doğru parçası, çember ve yay desteklenir; elips yalnızca doğrularla kesiştirilebilir.', icon: <XIcon className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
    ],
  },

  // 6. Dönüşüm & Simetri Araçları (3) - Mor Pastel Arka Plan
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
      { id: 'translate', name: 'Öteleme', description: 'Önce şekli seçin; sonra öteleme vektörünün başlangıç ve bitiş noktasına tıklayın.', icon: <MoveRight className="w-4 h-4" />, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600 dark:text-purple-400' },
      { id: 'reflect', name: 'Yansıt', description: 'Doğruya göre simetri / yansıma.', icon: <FlipHorizontal className="w-4 h-4" />, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600 dark:text-purple-400' },
      { id: 'symmetry', name: 'Simetri Keşfet', description: 'Simetri eksenlerini keşfedin.', icon: <Sparkles className="w-4 h-4" />, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600 dark:text-purple-400' },
    ],
  },

  // 6.5 Etkileşim Araçları — düğme, işaret kutusu, girdi kutusu
  {
    groupName: 'Etkileşim Araçları',
    emoji: '🎛️',
    themeColor: 'from-teal-500 to-cyan-600',
    badgeBg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
    containerBg: 'bg-[#f0fdfa] dark:bg-teal-950/25',
    containerBorder: 'border-teal-200/90 dark:border-teal-900/50',
    headerTextColor: 'text-teal-800 dark:text-teal-200',
    tools: [
      { id: 'checkbox', name: 'İşaret Kutusu', description: 'Önce göster/gizle edilecek nesneleri seçin, sonra kutunun yerine tıklayın.', icon: <CheckSquare className="w-4 h-4" />, iconBg: 'bg-teal-500/10', iconColor: 'text-teal-600 dark:text-teal-400' },
      { id: 'button', name: 'Düğme', description: 'Seçili nesneleri gösterip gizleyen ya da kaydırıcıyı oynatan düğme ekler.', icon: <MousePointerClick className="w-4 h-4" />, iconBg: 'bg-teal-500/10', iconColor: 'text-teal-600 dark:text-teal-400' },
      { id: 'input_box', name: 'Girdi Kutusu', description: 'Önce bir kaydırıcı veya fonksiyon seçin, sonra kutunun yerine tıklayın.', icon: <TextCursorInput className="w-4 h-4" />, iconBg: 'bg-teal-500/10', iconColor: 'text-teal-600 dark:text-teal-400' },
    ],
  },

  // 7. Kesir & Medya Araçları (3) - Turuncu / Şeftali Pastel Arka Plan
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
  /**
   * 2D "Nesne ekle" diyaloğunu açar. Verilmezse düğme gösterilmez.
   * (WorkspaceView bu prop'u geçtiğinde AddObjectModal'ın 2D sekmeleri erişilebilir olur.)
   */
  onOpenAddObjectDialog?: () => void;
}

/** Araç panelinin ikon modu tercihi bu anahtarla saklanır. */
const IKON_MODU_ANAHTARI = 'geoeba_arac_ikon_modu_v1';

const TABLE_ROWS = 10;
const TABLE_COLS = 3;
const COLUMN_LETTERS = ['A', 'B', 'C'];

// Hücre biçimleri: "(2, 3)", "(2; 3)", "2,5" (Türkçe ondalık) veya "(1,5; 2)"
const NUMBER_PATTERN = '[-+]?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)';
const COORD_REGEX = new RegExp(`^\\s*\\(?\\s*(${NUMBER_PATTERN})\\s*[;,]\\s*(${NUMBER_PATTERN})\\s*\\)?\\s*$`);
const NUM_REGEX = new RegExp(`^\\s*(${NUMBER_PATTERN})\\s*$`);

const parseCell = (raw: string): number => parseFloat(raw.replace(',', '.'));

/**
 * "(1,5, 2)" gibi girdilerde ondalık virgül ile ayırıcı virgül karışabilir;
 * bu durumda yalnızca ";" veya boşluk+virgül ayırıcı kabul edilir.
 */
function matchCoordinate(raw: string): [number, number] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = trimmed.match(COORD_REGEX);
  if (!m) return null;
  const a = parseCell(m[1]);
  const b = parseCell(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
}

function matchNumber(raw: string): number | null {
  const m = raw.trim().match(NUM_REGEX);
  if (!m) return null;
  const n = parseCell(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function Toolbar({ onOpenFunctionDialog, onOpenSliderDialog, onOpenAddObjectDialog }: ToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    objects,
    updateObject,
    deleteObject,
    addObject,
    addFunction,
    assignSliderValue,
    setHintMessage,
    setCircleRadius,
    setSegmentLength,
    setAngleDegrees,
    pendingPointIds,
    requestClearAll,
    openRegularPolygonDialog,
    recordHistory,
  } = useWorkspace();

  const [toolSearch, setToolSearch] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'cebir' | 'araclar' | 'tablo'>('araclar');

  // Cebir Input State
  const [algebraInput, setAlgebraInput] = useState('');
  /** Hesap makinesi çizelgesi açık mı? */
  const [klavyeAcik, setKlavyeAcik] = useState(false);
  const algebraInputRef = useRef<HTMLInputElement>(null);
  const [algebraError, setAlgebraError] = useState<string | null>(null);

  // Cebir listesinde satır içi düzenleme (fonksiyon ifadesi / nokta koordinatı)
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<{ a: string; b: string }>({ a: '', b: '' });
  const [rowError, setRowError] = useState<string | null>(null);

  const cancelRowEdit = () => {
    setEditingRowId(null);
    setRowError(null);
  };

  /**
   * Cebir listesinde bir satırın hangi alanlarının düzenlenebileceğini tarif eder.
   * Böylece nokta, çember, elips, doğru parçası ve açı aynı arayüzü paylaşır:
   * kullanıcı değere tıklar, sayıyı yazar, Enter'a basar.
   */
  type SatirBicimi =
    | { mod: 'ifade'; aEtiket: string }
    | { mod: 'tekli'; aEtiket: string; birim: string }
    | { mod: 'ikili'; aEtiket: string; bEtiket: string; ayirac: string };

  const satirBicimi = (obj: MathObject): SatirBicimi | null => {
    switch (obj.type) {
      case 'function':
        return { mod: 'ifade', aEtiket: 'Fonksiyon ifadesi' };
      case 'point':
        return { mod: 'ikili', aEtiket: 'x koordinatı', bEtiket: 'y koordinatı', ayirac: ';' };
      case 'ellipse':
        return { mod: 'ikili', aEtiket: 'Yatay yarıçap (a)', bEtiket: 'Dikey yarıçap (b)', ayirac: '×' };
      case 'circle':
        return { mod: 'tekli', aEtiket: 'Yarıçap', birim: 'br' };
      case 'segment':
        return { mod: 'tekli', aEtiket: 'Uzunluk', birim: 'br' };
      case 'angle':
        return { mod: 'tekli', aEtiket: 'Açı', birim: '°' };
      case 'slider':
        return { mod: 'tekli', aEtiket: 'Değer', birim: '' };
      default:
        return null;
    }
  };

  /** Bir nesnenin çember/yay yarıçapı: merkez ile yarıçap noktası arasındaki uzaklık. */
  const cemberYaricapi = (circ: CircleObject): number => {
    if (typeof circ.fixedRadius === 'number') return circ.fixedRadius;
    const merkez = objects.find((o) => o.id === circ.centerPointId && o.type === 'point') as
      | PointObject
      | undefined;
    const yari = objects.find((o) => o.id === circ.radiusPointId && o.type === 'point') as
      | PointObject
      | undefined;
    if (!merkez || !yari) return 0;
    return Math.hypot(yari.x - merkez.x, yari.y - merkez.y);
  };

  const startRowEdit = (obj: MathObject) => {
    setRowError(null);
    const bicim = satirBicimi(obj);
    if (!bicim) return;
    if (obj.type === 'function') {
      setRowDraft({ a: (obj as FunctionObject).expression, b: '' });
    } else if (obj.type === 'point') {
      const pt = obj as PointObject;
      setRowDraft({ a: formatTurkishNumber(pt.x, 4), b: formatTurkishNumber(pt.y, 4) });
    } else if (obj.type === 'ellipse') {
      const e = obj as EllipseObject;
      setRowDraft({ a: formatTurkishNumber(e.radiusX, 4), b: formatTurkishNumber(e.radiusY, 4) });
    } else if (obj.type === 'circle') {
      setRowDraft({ a: formatTurkishNumber(cemberYaricapi(obj as CircleObject), 4), b: '' });
    } else if (obj.type === 'segment') {
      const seg = obj as SegmentObject;
      const p1 = objects.find((o) => o.id === seg.startPointId) as PointObject | undefined;
      const p2 = objects.find((o) => o.id === seg.endPointId) as PointObject | undefined;
      const uz = p1 && p2 ? Math.hypot(p2.x - p1.x, p2.y - p1.y) : 0;
      setRowDraft({ a: formatTurkishNumber(uz, 4), b: '' });
    } else if (obj.type === 'slider') {
      setRowDraft({ a: formatTurkishNumber((obj as SliderObject).value, 4), b: '' });
    } else if (obj.type === 'angle') {
      const a = obj as AngleObject;
      const p1 = objects.find((o) => o.id === a.point1Id) as PointObject | undefined;
      const v = objects.find((o) => o.id === a.vertexPointId) as PointObject | undefined;
      const p3 = objects.find((o) => o.id === a.point3Id) as PointObject | undefined;
      const derece = p1 && v && p3 ? calculateAngleDegrees(p1, v, p3) : 0;
      setRowDraft({ a: formatTurkishNumber(Math.round(derece), 4), b: '' });
    }
    setEditingRowId(obj.id);
  };

  /** Türkçe ondalık virgülü kabul eden sayı okuyucu. */
  /** Sahnedeki kaydırıcıların o anki değerleri: "a", "2*a" gibi girişler için kapsam. */
  const kaydiriciKapsami = (): Record<string, number> => {
    const kapsam: Record<string, number> = {};
    for (const o of objects) {
      if (o.type === 'slider') kapsam[(o as SliderObject).variableName] = (o as SliderObject).value;
    }
    return kapsam;
  };

  /**
   * Alana yazılanı sayıya çevirir. Düz sayı da olabilir ("3", "7,5"),
   * kaydırıcı adı veya ifade de ("a", "2*a", "pi/2", "sqrt(2)").
   * Hata varsa satırdaki uyarıya yazılır ve null döner.
   */
  const sayiOku = (raw: string): number | null => {
    const kapsam = kaydiriciKapsami();
    const sonuc = evaluateNumericInput(raw, kapsam);
    if (!sonuc.ok) {
      setRowError(sonuc.error);
      return null;
    }
    // Kaydırıcıya dayalı bir ifade yazıldıysa değerin ANLIK olduğunu söyle:
    // kaydırıcı sonradan oynatılınca bu değer kendiliğinden güncellenmez.
    const kullanilan = Object.keys(kapsam).filter((ad) =>
      new RegExp(`(^|[^a-zçğıöşü0-9])${ad}([^a-zçğıöşü0-9]|$)`, 'i').test(raw)
    );
    if (kullanilan.length > 0) {
      setHintMessage(
        `${raw.trim()} = ${formatTurkishNumber(sonuc.value)} olarak hesaplandı. ` +
          `Bu bir anlık değerdir: ${kullanilan.join(', ')} kaydırıcısını oynatınca kendiliğinden güncellenmez.`
      );
    }
    return sonuc.value;
  };

  const commitRowEdit = (obj: MathObject) => {
    if (obj.type === 'function') {
      const ifade = rowDraft.a.trim();
      if (!ifade) {
        setRowError('İfade boş olamaz.');
        return;
      }
      const dogrulama = validateMathExpression(ifade);
      if (!dogrulama.ok) {
        setRowError(dogrulama.error);
        return;
      }
      updateObject(obj.id, { expression: ifade, label: `f(x) = ${ifade}` });
      cancelRowEdit();
      return;
    }
    if (obj.type === 'point') {
      const x = sayiOku(rowDraft.a);
      const y = sayiOku(rowDraft.b);
      if (x === null || y === null) return; // hata mesajını sayiOku yazdı
      updateObject(obj.id, { x, y });
      cancelRowEdit();
      return;
    }
    if (obj.type === 'ellipse') {
      const a = sayiOku(rowDraft.a);
      const b = sayiOku(rowDraft.b);
      if (a === null || b === null) return;
      if (a <= 0 || b <= 0) {
        setRowError('a ve b sıfırdan büyük olmalı.');
        return;
      }
      updateObject(obj.id, { radiusX: a, radiusY: b } as Partial<MathObject>);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'circle') {
      const r = sayiOku(rowDraft.a);
      if (r === null) return;
      if (r <= 0) {
        setRowError('Yarıçap sıfırdan büyük olmalı.');
        return;
      }
      setCircleRadius(obj.id, r);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'segment') {
      const uz = sayiOku(rowDraft.a);
      if (uz === null) return;
      if (uz <= 0) {
        setRowError('Uzunluk sıfırdan büyük olmalı.');
        return;
      }
      setSegmentLength(obj.id, uz);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'slider') {
      const v = sayiOku(rowDraft.a);
      if (v === null) return; // hata mesajını sayiOku yazdı
      assignSliderValue((obj as SliderObject).variableName, v);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'angle') {
      const d = sayiOku(rowDraft.a);
      if (d === null) return;
      if (d <= 0 || d >= 360) {
        setRowError('Açı 0 ile 360 arasında olmalı.');
        return;
      }
      setAngleDegrees(obj.id, d);
      cancelRowEdit();
      return;
    }
    cancelRowEdit();
  };

  // Spreadsheet Tablo Verileri: 10 Satır x 3 Sütun (A, B, C)
  const [tableData, setTableData] = useState<string[][]>(
    Array.from({ length: TABLE_ROWS }, () => Array.from({ length: TABLE_COLS }, () => ''))
  );

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOOL_GROUPS.map((g) => [g.groupName, true]))
  );

  /**
   * Araç panelinin İKON MODU: yazılar gizlenir, araçlar iki sütunlu ikon ızgarası olur.
   * Dar ekranlarda tuvale yer açar. Tercih tarayıcıda saklanır.
   */
  const [ikonModu, setIkonModu] = useState(false);

  // Sunucuda localStorage yok; tercih bağlanma anında okunur.
  useEffect(() => {
    try {
      setIkonModu(localStorage.getItem(IKON_MODU_ANAHTARI) === '1');
    } catch {
      /* depolama kapalıysa varsayılan (kapalı) kalır */
    }
  }, []);

  /**
   * Kayıt, EFEKTLE değil doğrudan burada yapılır. Efektle yazıldığında, ilk
   * render'da okuma henüz state'e yansımadığı için varsayılan değer kaydın
   * üzerine yazılıyor ve tercih her yenilemede kayboluyordu.
   */
  const ikonModuDegistir = () => {
    const yeni = !ikonModu;
    setIkonModu(yeni);
    try {
      localStorage.setItem(IKON_MODU_ANAHTARI, yeni ? '1' : '0');
    } catch {
      /* yoksay */
    }
  };

  /**
   * İkon modunda üzerine gelinen araç ve baloncuğun EKRAN konumu.
   *
   * Baloncuk panelin içine çizilirse panelin `overflow` kırpması ve yığın bağlamı
   * yüzünden tuvalin altında kalıyordu; bu yüzden portal ile doğrudan `body`'ye
   * çizilir ve konumu düğmenin ekran dikdörtgeninden hesaplanır.
   */
  const [vurgulanan, setVurgulanan] = useState<{
    id: string;
    ad: string;
    aciklama: string;
    x: number;
    y: number;
  } | null>(null);

  const baloncukAc = (el: HTMLElement, id: string, ad: string, aciklama: string) => {
    const r = el.getBoundingClientRect();
    setVurgulanan({ id, ad, aciklama, x: Math.round(r.right + 8), y: Math.round(r.top + r.height / 2) });
  };
  const baloncukKapat = (id: string) => setVurgulanan((v) => (v && v.id === id ? null : v));

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !(prev[groupName] ?? true) }));
  };

  const handleToolClick = (toolId: ToolMode) => {
    if (toolId === 'function') {
      onOpenFunctionDialog?.();
      return;
    }
    if (toolId === 'slider') {
      onOpenSliderDialog?.();
      return;
    }
    if (toolId === 'regular_polygon') {
      setActiveTool('regular_polygon');
      openRegularPolygonDialog();
      return;
    }
    setActiveTool(toolId);
  };

  /**
   * Klavye tuşundan gelen metni İMLECİN bulunduğu yere yazar.
   * `geri` kadar imleci geri alır: sin() yazınca imleç parantezin içinde kalsın diye.
   */
  const klavyeEkle = (metin: string, geri = 0) => {
    const el = algebraInputRef.current;
    const bas = el?.selectionStart ?? algebraInput.length;
    const son = el?.selectionEnd ?? algebraInput.length;
    const yeni = algebraInput.slice(0, bas) + metin + algebraInput.slice(son);
    setAlgebraInput(yeni);
    if (algebraError) setAlgebraError(null);
    const imlec = bas + metin.length - geri;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(imlec, imlec);
    });
  };

  /** İmlecin solundaki karakteri siler (seçim varsa seçimi siler). */
  const klavyeSil = () => {
    const el = algebraInputRef.current;
    const bas = el?.selectionStart ?? algebraInput.length;
    const son = el?.selectionEnd ?? algebraInput.length;
    const kesBas = bas === son ? Math.max(0, bas - 1) : bas;
    const yeni = algebraInput.slice(0, kesBas) + algebraInput.slice(son);
    setAlgebraInput(yeni);
    if (algebraError) setAlgebraError(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(kesBas, kesBas);
    });
  };

  /**
   * "a = 2" gibi bir ATAMA mı yazıldı? Öyleyse değişken adı ve sağ tarafı döndürür.
   *
   * GeoGebra'da cebir girişine "a = 2" yazmak kaydırıcı üretir; burada da öyle olmalı.
   * Ama "y = x^2" bir FONKSİYON tanımıdır: sağ taraf x'e bağlıysa ya da sol taraf y ise
   * atama değil fonksiyon sayılır.
   */
  const atamayiCoz = (
    ifade: string
  ): { tur: 'kaydirici'; ad: string; sag: string } | { tur: 'fonksiyon'; sag: string } | null => {
    // f(x) = ... biçimi doğrudan fonksiyondur
    const fonksiyonTanimi = /^\s*[a-zçğıöşü][a-zçğıöşü0-9]?\s*\(\s*x\s*\)\s*=\s*(.+)$/i.exec(ifade);
    if (fonksiyonTanimi) return { tur: 'fonksiyon', sag: fonksiyonTanimi[1].trim() };

    const atama = /^\s*([a-zçğıöşü][a-zçğıöşü0-9]?)\s*=\s*(.+)$/i.exec(ifade);
    if (!atama) return null;

    const ad = atama[1].toLocaleLowerCase('tr');
    const sag = atama[2].trim();
    if (sag.includes('=')) return null; // "a = b = 2" gibi çoklu atama desteklenmiyor

    // Sağ taraf x'e bağlıysa ya da sol taraf y ise bu bir fonksiyon tanımıdır
    const degiskenler = extractVariableNames(sag);
    if (ad === 'y' || degiskenler.includes('x')) return { tur: 'fonksiyon', sag };
    return { tur: 'kaydirici', ad, sag };
  };

  /** Girişteki ifadeyi doğrular ve tuvale ekler. Hem Enter hem klavyedeki ↵ buradan geçer. */
  const algebraGonder = () => {
    const expr = algebraInput.trim();
    if (!expr) {
      setAlgebraError('Bir ifade girin. Örn: x^2 - 2  ya da  a = 2');
      return;
    }

    const cozum = atamayiCoz(expr);

    // 1) Kaydırıcı ataması: "a = 2", "k = 3/4", "m = 2*a" …
    if (cozum && cozum.tur === 'kaydirici') {
      const bilinen = objects
        .filter((o) => o.type === 'slider')
        .map((o) => (o as SliderObject).variableName);
      const dogrulama = validateMathExpression(cozum.sag, bilinen);
      if (!dogrulama.ok) {
        setAlgebraError(dogrulama.error);
        return;
      }
      const hesapla = compileMathExpression(cozum.sag, bilinen);
      const kapsam: Record<string, number> = {};
      for (const o of objects) {
        if (o.type === 'slider') kapsam[(o as SliderObject).variableName] = (o as SliderObject).value;
      }
      const deger = hesapla ? hesapla(0, kapsam) : NaN;
      if (!Number.isFinite(deger)) {
        setAlgebraError('Sağ taraf bir sayıya eşit olmalı. Örn: a = 2 veya a = 3/4');
        return;
      }
      assignSliderValue(cozum.ad, Number(deger.toFixed(6)));
      setAlgebraInput('');
      setAlgebraError(null);
      return;
    }

    // Eşittir içeren ama tanınmayan girdiler: ayrıştırıcının "Geçersiz karakter" uyarısı
    // burada yanıltıcı olurdu; kullanıcıya ne yazması gerektiğini söyleyelim.
    if (!cozum && expr.includes('=')) {
      setAlgebraError(
        'Atamayı "değişken = sayı" biçiminde yazın (örn. a = 2). Fonksiyon için "y = x^2" ya da doğrudan "x^2" yazabilirsiniz.'
      );
      return;
    }

    // 2) Fonksiyon tanımı: "y = x^2" ve "f(x) = x^2" sol tarafı atılarak eklenir
    const ifade = cozum && cozum.tur === 'fonksiyon' ? cozum.sag : expr;
    const validation = validateMathExpression(ifade);
    if (!validation.ok) {
      setAlgebraError(validation.error);
      return;
    }
    addFunction(ifade);
    setAlgebraInput('');
    setAlgebraError(null);
  };

  // Cebir girişi: doğrulama ve ekleme tek yerde (algebraGonder) yapılır
  const handleAlgebraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    algebraGonder();
  };

  // Hesap tablosundan geçerli bir PointObject üretir (etiket sıradaki boş harf)
  const createSheetPoint = (
    id: string,
    x: number,
    y: number,
    color: string,
    usedLabels: string[]
  ): PointObject => {
    const label = generateNextPointLabel(usedLabels);
    usedLabels.push(label);
    return {
      id,
      type: 'point',
      label,
      showLabel: true,
      isIndependent: true,
      x,
      y,
      color,
      visible: true,
      createdAt: Date.now(),
    };
  };

  // Hücrede yazarken her tuş vuruşu ayrı bir geçmiş adımı üretmesin diye nokta
  // taşımaları geçmişe yazılmadan uygulanır; düzenleme bitince (odak kaybı) tek
  // bir geçmiş adımı kaydedilir. Böylece Geri Al tablo değişikliğini de geri alır.
  const hasUncommittedTableEditRef = useRef(false);

  const commitTableEdit = () => {
    if (!hasUncommittedTableEditRef.current) return;
    hasUncommittedTableEditRef.current = false;
    recordHistory('Hesap tablosu güncellendi');
  };

  // Spreadsheet Hücre Değişimi & Nokta Çizme
  const handleTableCellChange = (rowIdx: number, colIdx: number, val: string) => {
    const newData = tableData.map((row, rIdx) =>
      rIdx === rowIdx ? row.map((cell, cIdx) => (cIdx === colIdx ? val : cell)) : row
    );
    setTableData(newData);

    const usedLabels = objects.filter((o) => o.type === 'point').map((o) => o.label);
    const upsertPoint = (pointId: string, x: number, y: number, color: string) => {
      const existing = objects.find((o) => o.id === pointId);
      if (existing && existing.type === 'point') {
        if (existing.x !== x || existing.y !== y) {
          updateObject(pointId, { x, y } as Partial<PointObject>, false);
          hasUncommittedTableEditRef.current = true;
        }
      } else {
        addObject(createSheetPoint(pointId, x, y, color, usedLabels), 'Hesap tablosundan nokta eklendi');
        hasUncommittedTableEditRef.current = false;
      }
    };
    const removePoint = (pointId: string) => {
      if (objects.some((o) => o.id === pointId)) {
        deleteObject(pointId);
        hasUncommittedTableEditRef.current = false;
      }
    };

    // Yalnızca değişen satırı işle
    const r = rowIdx;
    const row = newData[r];

    // A ve B sütunları birlikte bir nokta: (A, B)
    const rowPointId = `spreadsheet-row-point-${r}`;
    const xVal = matchNumber(row[0]);
    const yVal = matchNumber(row[1]);
    if (xVal !== null && yVal !== null) {
      upsertPoint(rowPointId, xVal, yVal, '#3b82f6');
    } else {
      removePoint(rowPointId);
    }

    // Her hücre tek başına "(x, y)" koordinatı olabilir
    for (let c = 0; c < TABLE_COLS; c++) {
      const cellPointId = `spreadsheet-point-${r}-${c}`;
      const coord = matchCoordinate(row[c]);
      if (coord) {
        upsertPoint(cellPointId, coord[0], coord[1], '#6366f1');
      } else {
        removePoint(cellPointId);
      }
    }
  };

  const getObjectDetails = (obj: MathObject): string => {
    switch (obj.type) {
      case 'point':
        return `(${formatTurkishNumber(obj.x, 2)}; ${formatTurkishNumber(obj.y, 2)})`;
      case 'circle': {
        let radius = obj.fixedRadius ?? 0;
        if (obj.radiusPointId && !radius) {
          const center = objects.find((o) => o.id === obj.centerPointId);
          const rPoint = objects.find((o) => o.id === obj.radiusPointId);
          if (center?.type === 'point' && rPoint?.type === 'point') {
            radius = calculateDistance(center, rPoint);
          }
        }
        return `Yarıçap: ${formatTurkishNumber(radius, 2)} br`;
      }
      case 'ellipse':
        return `a = ${formatTurkishNumber(obj.radiusX, 2)} br, b = ${formatTurkishNumber(obj.radiusY, 2)} br`;
      case 'arc':
      case 'sector': {
        const merkez = objects.find((o) => o.id === obj.centerPointId);
        const bas = objects.find((o) => o.id === obj.startPointId);
        const r =
          merkez?.type === 'point' && bas?.type === 'point' ? calculateDistance(merkez, bas) : 0;
        return `Yarıçap: ${formatTurkishNumber(r, 2)} br`;
      }
      case 'line':
        return 'Doğru';
      case 'ray':
        return 'Işın';
      case 'segment': {
        const p1 = objects.find((o) => o.id === obj.startPointId);
        const p2 = objects.find((o) => o.id === obj.endPointId);
        const uz = p1?.type === 'point' && p2?.type === 'point' ? calculateDistance(p1, p2) : 0;
        return `Uzunluk: ${formatTurkishNumber(uz, 2)} br`;
      }
      case 'polygon':
        return `Çokgen (${obj.pointIds?.length || 0} Köşe)`;
      case 'pen':
        return 'Serbest Çizim';
      case 'fraction':
        return `Kesir (${obj.numerator}/${obj.denominator})`;
      case 'function':
        return obj.expression;
      case 'slider':
        return `${obj.variableName} = ${formatTurkishNumber(obj.value, 2)}`;
      case 'measurement': {
        const m = obj as MeasurementObject;
        const nk = (id: string) => objects.find((o) => o.id === id && o.type === 'point') as PointObject | undefined;
        if (m.kind === 'slope') {
          const a = nk(m.pointIds[0]);
          const b = nk(m.pointIds[1]);
          if (!a || !b) return 'Eğim';
          const e = calculateSlope(a, b);
          return e === null ? 'eğim tanımsız' : `eğim = ${formatTurkishNumber(Number(e.toFixed(4)))}`;
        }
        const [k, d, u] = m.pointIds.map(nk);
        if (!k || !d || !u) return 'Trigonometrik oranlar';
        const o = rightTriangleRatios(k, d, u);
        return o
          ? `sin=${formatTurkishNumber(Number(o.sin.toFixed(3)))} cos=${formatTurkishNumber(Number(o.cos.toFixed(3)))} tan=${formatTurkishNumber(Number(o.tan.toFixed(3)))}`
          : 'Dik üçgen değil';
      }
      case 'angle': {
        const p1 = objects.find((o) => o.id === obj.point1Id);
        const v = objects.find((o) => o.id === obj.vertexPointId);
        const p3 = objects.find((o) => o.id === obj.point3Id);
        const d =
          p1?.type === 'point' && v?.type === 'point' && p3?.type === 'point'
            ? calculateAngleDegrees(p1, v, p3)
            : 0;
        return `${formatTurkishNumber(Math.round(d), 0)}°`;
      }
      case 'text':
        return 'Metin Notu';
      case 'image':
        return 'Görsel';
      default:
        return 'Nesne';
    }
  };

  const normalizedSearch = toolSearch.trim().toLocaleLowerCase('tr');

  return (
    <div className="flex h-full min-h-0 bg-card/95 backdrop-blur-md border-r border-border select-none z-30 overflow-hidden shadow-sm shrink-0">

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

      {/* 2. SAĞ KISIM: İÇERİK PANELİ */}
      {!isCollapsed && (
        // İkon modunda panel daralır: amaç tuvale yer açmaktır.
        <div
          className={`h-full flex flex-col min-h-0 overflow-hidden transition-[width] duration-200 ${
            ikonModu && sidebarTab === 'araclar' ? 'w-[104px]' : 'w-72 sm:w-80'
          }`}
        >

          {/* A. CEBİR GÖRÜNÜMÜ */}
          {sidebarTab === 'cebir' && (
            <div className="flex-1 flex flex-col min-h-0 bg-card">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-black text-foreground">Cebir Girişleri</h3>
                {objects.length > 0 && (
                  <button
                    onClick={() => requestClearAll('2D')}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Tüm Girişleri ve Şekilleri Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Tümünü Sil</span>
                  </button>
                )}
              </div>

              {/* Obje Listesi */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
                {objects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                    Masada henüz nesne yok.<br/>Nesne çizin veya aşağıdan fonksiyon girin.
                  </div>
                ) : (
                  objects.map((obj) => {
                    const bicim = satirBicimi(obj);
                    const duzenlenebilir = bicim !== null;
                    const duzenleniyor = editingRowId === obj.id;
                    return (
                    <div key={obj.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Görünürlük Düğmesi */}
                        <button
                          onClick={() => updateObject(obj.id, { visible: obj.visible !== false ? false : true })}
                          className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                          title={obj.visible !== false ? 'Gizle' : 'Göster'}
                        >
                          {obj.visible !== false ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        {duzenleniyor ? (
                          // DÜZENLEME KİPİ: fonksiyonda ifade, noktada x ve y girilebilir
                          <form
                            className="flex items-center gap-1 min-w-0 flex-1"
                            onSubmit={(e) => {
                              e.preventDefault();
                              commitRowEdit(obj);
                            }}
                          >
                            <span className="text-primary text-xs font-black shrink-0">{obj.label}:</span>
                            {obj.type === 'function' ? (
                              <input
                                autoFocus
                                type="text"
                                value={rowDraft.a}
                                onChange={(e) => {
                                  setRowDraft({ ...rowDraft, a: e.target.value });
                                  if (rowError) setRowError(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    e.stopPropagation();
                                    cancelRowEdit();
                                  }
                                }}
                                aria-invalid={rowError !== null}
                                aria-label="Fonksiyon ifadesi"
                                className={`flex-1 min-w-0 px-2 py-1 rounded-lg bg-background border text-[11px] font-mono outline-none focus:border-primary ${
                                  rowError ? 'border-destructive' : 'border-border'
                                }`}
                              />
                            ) : (
                              <>
                                <input
                                  autoFocus
                                  type="text"
                                  inputMode="decimal"
                                  value={rowDraft.a}
                                  onChange={(e) => {
                                    setRowDraft({ ...rowDraft, a: e.target.value });
                                    if (rowError) setRowError(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.stopPropagation();
                                      cancelRowEdit();
                                    }
                                  }}
                                  aria-label={bicim?.mod === 'ifade' ? 'İfade' : bicim?.aEtiket}
                                  className={`w-16 min-w-0 px-1.5 py-1 rounded-lg bg-background border text-[11px] font-mono text-center outline-none focus:border-primary ${
                                    rowError ? 'border-destructive' : 'border-border'
                                  }`}
                                />
                                {bicim?.mod === 'tekli' && (
                                  <span className="text-[10px] text-muted-foreground">{bicim.birim}</span>
                                )}
                                {bicim?.mod === 'ikili' && (
                                  <>
                                <span className="text-[10px] text-muted-foreground">{bicim.ayirac}</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={rowDraft.b}
                                  onChange={(e) => {
                                    setRowDraft({ ...rowDraft, b: e.target.value });
                                    if (rowError) setRowError(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.stopPropagation();
                                      cancelRowEdit();
                                    }
                                  }}
                                  aria-label={bicim.bEtiket}
                                  className={`w-16 min-w-0 px-1.5 py-1 rounded-lg bg-background border text-[11px] font-mono text-center outline-none focus:border-primary ${
                                    rowError ? 'border-destructive' : 'border-border'
                                  }`}
                                />
                                  </>
                                )}
                              </>
                            )}
                            <button
                              type="submit"
                              title="Uygula (Enter)"
                              className="p-1 rounded hover:bg-emerald-500/10 text-emerald-600 shrink-0 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelRowEdit}
                              title="Vazgeç (Esc)"
                              className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => duzenlenebilir && startRowEdit(obj)}
                            disabled={!duzenlenebilir}
                            title={duzenlenebilir ? 'Değeri düzenlemek için tıklayın' : undefined}
                            className={`text-xs font-black text-foreground truncate leading-tight text-left min-w-0 ${
                              duzenlenebilir ? 'cursor-text hover:underline decoration-dotted underline-offset-2' : 'cursor-default'
                            }`}
                          >
                            <span className="text-primary mr-1">{obj.label}:</span>
                            <span className="font-mono text-muted-foreground text-[10px]">
                              {getObjectDetails(obj)}
                            </span>
                          </button>
                        )}
                      </div>

                      {!duzenleniyor && (
                        <button
                          onClick={() => deleteObject(obj.id)}
                          className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    );
                  })
                )}
              </div>

              {rowError && (
                <div role="alert" className="px-3 pb-2 -mt-1 flex items-start gap-1 text-[11px] text-destructive font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{rowError}</span>
                </div>
              )}

              {/* Cebir Fonksiyon / Formül Girişi */}
              <form
                onSubmit={handleAlgebraSubmit}
                className="p-3 border-t border-border shrink-0 space-y-2 bg-muted/15"
              >
                <label
                  htmlFor="algebra-expression-input"
                  className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider"
                >
                  Matematiksel İfade Ekle (f(x))
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="algebra-expression-input"
                    ref={algebraInputRef}
                    type="text"
                    value={algebraInput}
                    onChange={(e) => {
                      setAlgebraInput(e.target.value);
                      if (algebraError) setAlgebraError(null);
                    }}
                    placeholder="Örn: x^2 - 2,  a = 2,  y = sin(x)"
                    aria-invalid={algebraError !== null}
                    className={`flex-1 px-3 py-2 rounded-xl bg-background border text-xs outline-none focus:border-primary placeholder:text-muted-foreground font-mono ${
                      algebraError ? 'border-destructive' : 'border-border'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setKlavyeAcik((a) => !a)}
                    aria-expanded={klavyeAcik}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      klavyeAcik
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-muted/60 border-border text-muted-foreground hover:text-foreground'
                    }`}
                    title={klavyeAcik ? 'Hesap makinesi klavyesini kapat' : 'Hesap makinesi klavyesini aç'}
                    aria-label="Hesap makinesi klavyesi"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors cursor-pointer"
                    title="Ekle (Enter)"
                    aria-label="İfadeyi ekle"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {klavyeAcik && (
                  <MathKeypad onInsert={klavyeEkle} onDelete={klavyeSil} onSubmit={algebraGonder} />
                )}
                {algebraError && (
                  <div className="flex items-start gap-1 text-[11px] text-destructive" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{algebraError}</span>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* B. ARAÇLAR GÖRÜNÜMÜ */}
          {sidebarTab === 'araclar' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                {!ikonModu && (
                  <h3 className="text-xs font-black text-foreground tracking-tight">Geometri Araçları</h3>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  {objects.length > 0 && !ikonModu && (
                    <button
                      onClick={() => requestClearAll('2D')}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Tüm Çizimleri ve Şekilleri Temizle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Tümünü Sil</span>
                    </button>
                  )}
                  {/* Panelin SAĞ ÜST köşesindeki daralt/genişlet düğmesi */}
                  <button
                    onClick={ikonModuDegistir}
                    aria-pressed={ikonModu}
                    title={
                      ikonModu
                        ? 'Araç adlarını göster (paneli genişlet)'
                        : 'Yalnızca ikonları göster (paneli daralt)'
                    }
                    aria-label={ikonModu ? 'Paneli genişlet' : 'Paneli daralt'}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
                  >
                    {ikonModu ? (
                      <PanelLeftOpen className="w-4 h-4" />
                    ) : (
                      <PanelLeftClose className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Arama Çubuğu — ikon modunda yer kaplamasın diye gizlenir */}
              <div className={`p-3 border-b border-border/60 shrink-0 ${ikonModu ? 'hidden' : ''}`}>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Araç veya komut ara..."
                    aria-label="Araç ara"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/60 border border-border/80 text-foreground text-xs placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Ölçü girerek nesne ekleme (yalnızca üst bileşen diyaloğu bağladıysa) */}
                {onOpenAddObjectDialog && (
                  <button
                    type="button"
                    onClick={onOpenAddObjectDialog}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-sm hover:opacity-90 transition-all cursor-pointer active:scale-95"
                    title="Kesin ölçü girerek nesne ekleyin (nokta, doğru parçası, çember, üçgen, açı, fonksiyon)"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nesne ekle</span>
                  </button>
                )}
              </div>

              {/* Araç Grupları Listesi */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin">
                {TOOL_GROUPS.map((group) => {
                  const isExpanded = expandedGroups[group.groupName] ?? true;
                  const matchingTools = group.tools.filter(
                    (t) =>
                      normalizedSearch === '' ||
                      t.name.toLocaleLowerCase('tr').includes(normalizedSearch) ||
                      t.description.toLocaleLowerCase('tr').includes(normalizedSearch)
                  );

                  if (matchingTools.length === 0) return null;

                  return (
                    <div
                      key={group.groupName}
                      className={`rounded-2xl ${ikonModu ? 'p-1.5' : 'p-2.5'} ${group.containerBg} border ${group.containerBorder} space-y-2 shadow-sm transition-all`}
                    >
                      {/* Grup Başlığı — ikon modunda yalnızca emoji, adı ipucunda */}
                      <button
                        onClick={() => toggleGroup(group.groupName)}
                        title={ikonModu ? group.groupName : undefined}
                        className={`w-full flex items-center ${
                          ikonModu ? 'justify-center' : 'justify-between'
                        } px-1.5 py-1 text-xs font-black ${group.headerTextColor} hover:opacity-80 transition-opacity cursor-pointer`}
                        aria-expanded={isExpanded}
                        aria-label={ikonModu ? group.groupName : undefined}
                      >
                        {ikonModu ? (
                          <span className="text-sm leading-none">{group.emoji}</span>
                        ) : (
                          <>
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
                          </>
                        )}
                      </button>

                      {/* 2 Sütunlu Buton Kartları */}
                      {isExpanded && (
                        <div className={`grid grid-cols-2 ${ikonModu ? 'gap-1.5' : 'gap-2'} pt-0.5`}>
                          {matchingTools.map((tool) => {
                            const isActive = activeTool === tool.id;

                            // İKON MODU: kare ikon; üzerine gelince ad YANA doğru açılır
                            if (ikonModu) {
                              return (
                                <div
                                  key={tool.id}
                                  onMouseEnter={(e) =>
                                    baloncukAc(e.currentTarget, tool.id, tool.name, tool.description)
                                  }
                                  onMouseLeave={() => baloncukKapat(tool.id)}
                                >
                                  <button
                                    onClick={() => handleToolClick(tool.id)}
                                    onFocus={(e) =>
                                      baloncukAc(
                                        e.currentTarget.parentElement as HTMLElement,
                                        tool.id,
                                        tool.name,
                                        tool.description
                                      )
                                    }
                                    onBlur={() => baloncukKapat(tool.id)}
                                    title={`${tool.name} — ${tool.description}`}
                                    aria-label={tool.name}
                                    aria-pressed={isActive}
                                    className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                                      isActive
                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent shadow-sm ring-2 ring-primary/20'
                                        : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-primary/40 shadow-sm'
                                    }`}
                                  >
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                        isActive ? 'bg-white/20 text-white' : `${tool.iconBg} ${tool.iconColor}`
                                      }`}
                                    >
                                      {tool.icon}
                                    </div>
                                  </button>

                                </div>
                              );
                            }

                            return (
                              <button
                                key={tool.id}
                                onClick={() => handleToolClick(tool.id)}
                                title={`${tool.name} — ${tool.description}`}
                                aria-pressed={isActive}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                                  isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-sm scale-105 ring-2 ring-primary/20'
                                    : 'bg-card hover:bg-background text-foreground border-border/80 hover:border-primary/40 shadow-sm hover:-translate-y-0.5'
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

                                {/* En fazla 2 satır: uzun adlar taşmak yerine kısaltılır, tamamı ipucunda */}
                                <span
                                  className={`text-[11px] sm:text-xs font-bold leading-tight break-words hyphens-auto line-clamp-2 ${
                                    isActive ? 'text-white' : 'text-foreground'
                                  }`}
                                >
                                  {tool.name}
                                </span>
                              </button>
                            );
                          })}
                          {group.groupName === 'Düzenleme Araçları' &&
                            (ikonModu ? (
                              <div
                                className="col-span-2"
                                onMouseEnter={(e) =>
                                  baloncukAc(
                                    e.currentTarget,
                                    'tumunu-sil',
                                    'Tümünü Sil / Temizle',
                                    'Tuvaldeki bütün çizimleri ve şekilleri siler.'
                                  )
                                }
                                onMouseLeave={() => baloncukKapat('tumunu-sil')}
                              >
                                <button
                                  onClick={() => requestClearAll('2D')}
                                  aria-label="Tümünü Sil / Temizle"
                                  title="Tüm 2D ekranı ve şekilleri temizle"
                                  className="w-full aspect-[2/1] flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 shadow-sm transition-all cursor-pointer active:scale-95"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => requestClearAll('2D')}
                                className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 shadow-sm transition-all cursor-pointer hover:shadow-sm active:scale-95"
                                title="Tüm 2D ekranı ve şekilleri temizle"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Tümünü Sil / Temizle</span>
                              </button>
                            ))}
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
                Bir hücreye <strong className="text-primary">(x; y)</strong> yazarak ya da A ve B sütunlarına ayrı ayrı sayı girerek otomatik nokta oluşturabilirsiniz. Örn: <code className="bg-background px-1 py-0.5 rounded font-mono">(2; 3)</code> veya <code className="bg-background px-1 py-0.5 rounded font-mono">(1,5; -2)</code>
              </div>

              {/* Spreadsheet Grid */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-left text-xs font-mono">
                  <thead className="sticky top-0 bg-muted/70 z-10">
                    <tr className="border-b border-border">
                      <th scope="col" className="w-10 px-2 py-1.5 text-center text-muted-foreground font-black border-r border-border bg-muted/80">#</th>
                      {COLUMN_LETTERS.map((letter, idx) => (
                        <th
                          key={letter}
                          scope="col"
                          className={`px-2 py-1.5 text-center text-muted-foreground font-black ${idx < TABLE_COLS - 1 ? 'border-r border-border' : ''}`}
                        >
                          {letter}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                        <td className="w-10 px-2 py-1.5 text-center text-muted-foreground font-black border-r border-border bg-muted/30">{rIdx + 1}</td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className={`p-0 ${cIdx < TABLE_COLS - 1 ? 'border-r border-border/60' : ''}`}>
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => handleTableCellChange(rIdx, cIdx, e.target.value)}
                              onBlur={commitTableEdit}
                              aria-label={`Hücre ${COLUMN_LETTERS[cIdx]}${rIdx + 1}`}
                              className="w-full h-8 px-2 bg-transparent outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/20 text-center font-mono text-xs text-foreground font-semibold"
                            />
                          </td>
                        ))}
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

      {/* İkon modu baloncuğu — panelin taşma sınırından etkilenmesin diye body'ye çizilir */}
      {ikonModu &&
        vurgulanan &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{ position: 'fixed', left: vurgulanan.x, top: vurgulanan.y, transform: 'translateY(-50%)', zIndex: 9999 }}
            className="pointer-events-none animate-in fade-in slide-in-from-left-1 duration-150"
          >
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white shadow-2xl border border-white/10 w-max max-w-[220px]">
              <div className="text-[11px] font-black leading-tight">{vurgulanan.ad}</div>
              <div className="text-[10px] text-slate-300 leading-snug mt-0.5">{vurgulanan.aciklama}</div>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
}
