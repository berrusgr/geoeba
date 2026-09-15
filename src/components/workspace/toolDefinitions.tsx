import React from 'react';
import { ToolMode } from '@/types/workspace';
import { MousePointer, CheckSquare, MousePointerClick, TextCursorInput, Scissors, SeparatorVertical, GitBranch, Equal, X as XIcon, MoveRight, Ruler, Square, Triangle, Circle as CircleIcon, CircleDot, PieChart, PenTool, Trash2, Hexagon, RotateCw, FlipHorizontal, Sparkles, Image as ImageIcon, Type, Plus, TrendingUp, Sliders } from 'lucide-react';
import { GeometryToolIcon } from './GeometryToolIcon';

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
  themeColor: string;
  badgeBg: string;
  containerBg: string;
  containerBorder: string;
  headerTextColor: string;
  tools: ToolItem[];
}

export const TOOL_GROUPS: ToolGroup[] = [
  // 1. Temel Çizim Araçları - Kırmızı / Mercan Pastel Arka Plan
  {
    groupName: 'Temel Çizim Araçları',
    themeColor: 'from-rose-500 to-red-600',
    badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    containerBg: 'bg-[#fff1f2] dark:bg-rose-950/25',
    containerBorder: 'border-rose-200/90 dark:border-rose-900/50',
    headerTextColor: 'text-rose-800 dark:text-rose-200',
    tools: [
      { id: 'point', name: 'Nokta', description: 'Tuvale tıklayarak yeni nokta oluşturun.', icon: <GeometryToolIcon kind="point" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'segment', name: 'Doğru Parçası', description: 'İki nokta arasına doğru parçası çizin.', icon: <GeometryToolIcon kind="segment" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'line', name: 'Doğru', description: 'İki noktadan geçen sonsuz doğru çizin.', icon: <GeometryToolIcon kind="line" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'ray', name: 'Işın', description: 'Başlangıç noktası ve üzerinden geçen ikinci nokta ile ışın çizin.', icon: <GeometryToolIcon kind="ray" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'segment_length', name: 'Ölçülü Parça', description: 'Bir başlangıç noktasına tıklayın, uzunluğu sayı olarak girin.', icon: <Ruler className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'circle', name: 'Çember', description: 'Merkez ve yarıçap noktasıyla çember çizin.', icon: <CircleIcon className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
      { id: 'pen', name: 'Kalem', description: 'Serbest çizim kalemi.', icon: <PenTool className="w-4 h-4" />, iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400' },
    ],
  },

  // 2. Düzenleme Araçları - Mavi Pastel Arka Plan
  {
    groupName: 'Düzenleme Araçları',
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
    themeColor: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    containerBg: 'bg-[#ecfdf5] dark:bg-emerald-950/25',
    containerBorder: 'border-emerald-200/90 dark:border-emerald-900/50',
    headerTextColor: 'text-emerald-800 dark:text-emerald-200',
    tools: [
      { id: 'measure_distance', name: 'Uzunluk Ölç (cm)', description: 'Mesafe ve uzunluk ölçün.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'unit_measure', name: 'Birimle Ölç (br)', description: 'Birim karelerle ölçüm yapın.', icon: <GeometryToolIcon kind="grid" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'measure_angle', name: 'Açıölçer', description: 'Açı ölçümü yapın.', icon: <GeometryToolIcon kind="protractor" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'angle', name: 'Açı Oluştur', description: '3 nokta ile açı oluşturun.', icon: <GeometryToolIcon kind="angle" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'measure_area', name: 'Alanı Bul', description: 'Kapalı şeklin alanını hesaplayın.', icon: <GeometryToolIcon kind="area" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'measure_perimeter', name: 'Çevre Hesapla', description: 'Şeklin çevre uzunluğunu hesaplayın.', icon: <GeometryToolIcon kind="perimeter" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'measure_slope', name: 'Eğim Ölç', description: 'İki noktaya tıklayın; aradaki doğrunun eğimini gösterir.', icon: <TrendingUp className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'trig_ratios', name: 'Trig. Oranlar', description: 'Bir kola, AÇININ KÖŞESİNE ve diğer kola tıklayın; sin, cos, tan değerlerini gösterir. Üçgen dikse kenar oranları da yazılır.', icon: <Triangle className="w-4 h-4" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'area_model', name: 'Alanı Modelle', description: 'Alan modelleme ızgarası.', icon: <GeometryToolIcon kind="grid" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'ruler', name: 'Cetvel', description: 'İnteraktif cetvel aracı.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'setsquare', name: 'Gönye', description: 'Dik açı ve gönye aracı.', icon: <GeometryToolIcon kind="setsquare" />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    ],
  },

  // 4. Çokgen Araçları - Sıcak Kehribar / Sarı Pastel Arka Plan
  // Çember Araçları - Mor / Menekşe Pastel Arka Plan
  {
    groupName: 'Çember Araçları',
    themeColor: 'from-violet-500 to-purple-600',
    badgeBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
    containerBg: 'bg-[#f5f3ff] dark:bg-violet-950/25',
    containerBorder: 'border-violet-200/90 dark:border-violet-900/50',
    headerTextColor: 'text-violet-800 dark:text-violet-200',
    tools: [
      { id: 'circle_radius', name: 'Yarıçapla Çember', description: 'Merkeze tıklayın, yarıçapı sayı olarak girin.', icon: <CircleDot className="w-4 h-4" />, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
      { id: 'circle_3points', name: '3 Noktalı Çember', description: 'Üç noktaya tıklayın; bu üç noktadan geçen çember (çevrel çember) çizilir.', icon: <CircleIcon className="w-4 h-4" />, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
      { id: 'arc', name: 'Yay', description: 'Merkez, başlangıç ve bitiş noktasına tıklayın; saat yönünün tersine yay çizilir.', icon: <GeometryToolIcon kind="arc" />, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
      { id: 'sector', name: 'Daire Dilimi', description: 'Yay ile aynı üç tıklama, ama içi dolu pasta dilimi çizilir.', icon: <PieChart className="w-4 h-4" />, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
      { id: 'ellipse', name: 'Elips', description: 'Tuvalde sürükleyin; sürüklediğiniz kutuya içten teğet elips çizilir.', icon: <GeometryToolIcon kind="ellipse" />, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
    ],
  },

  {
    groupName: 'Çokgen Araçları',
    themeColor: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    containerBg: 'bg-[#fffbeb] dark:bg-amber-950/25',
    containerBorder: 'border-amber-200/90 dark:border-amber-900/50',
    headerTextColor: 'text-amber-800 dark:text-amber-200',
    tools: [
      { id: 'polygon', name: 'Çokgen', description: 'Köşeleri belirleyerek çokgen çizin.', icon: <GeometryToolIcon kind="polygon" />, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
      { id: 'rectangle', name: 'Dikdörtgen', description: 'Dikdörtgen şekli ekleyin.', icon: <GeometryToolIcon kind="rectangle" />, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
      { id: 'square', name: 'Kare', description: 'Sürükleyerek kare çizin.', icon: <Square className="w-4 h-4" />, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
      { id: 'regular_polygon', name: 'Düzgün Çokgen', description: 'Kenar sayısını girerek düzgün çokgen oluşturun.', icon: <Hexagon className="w-4 h-4" />, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
    ],
  },

  // 5. Cebir & Fonksiyon Araçları - Gök Mavisi Pastel Arka Plan
  {
    groupName: 'Cebir & Fonksiyon',
    themeColor: 'from-sky-500 to-cyan-600',
    badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    containerBg: 'bg-[#f0f9ff] dark:bg-sky-950/25',
    containerBorder: 'border-sky-200/90 dark:border-sky-900/50',
    headerTextColor: 'text-sky-800 dark:text-sky-200',
    tools: [
      { id: 'function', name: 'Fonksiyon', description: 'f(x) ifadesi girerek grafik çizin.', icon: <GeometryToolIcon kind="function" />, iconBg: 'bg-sky-500/10', iconColor: 'text-sky-600 dark:text-sky-400' },
      { id: 'slider', name: 'Sürgü', description: 'a, b gibi parametreler için sürgü ekleyin.', icon: <Sliders className="w-4 h-4" />, iconBg: 'bg-sky-500/10', iconColor: 'text-sky-600 dark:text-sky-400' },
    ],
  },

  // 5.5 Klasik Geometri İnşaları - Çivit Mavisi Pastel Arka Plan
  // Pergel-cetvel geleneğindeki temel inşalar: orta nokta, orta dikme, açıortay,
  // dik/paralel doğru, pergel ve kesişim. Hepsi tıklanan NOKTALARDAN üretilir.
  {
    groupName: 'İnşa Araçları',
    themeColor: 'from-indigo-500 to-blue-600',
    badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    containerBg: 'bg-[#eef2ff] dark:bg-indigo-950/25',
    containerBorder: 'border-indigo-200/90 dark:border-indigo-900/50',
    headerTextColor: 'text-indigo-800 dark:text-indigo-200',
    tools: [
      { id: 'midpoint', name: 'Orta Nokta', description: 'İki noktaya tıklayın; aralarındaki orta nokta oluşur.', icon: <GeometryToolIcon kind="midpoint" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'divide_ratio', name: 'Oranda Böl', description: 'İki noktaya tıklayın, sonra m:n oranını girin (örn. 2:1).', icon: <Scissors className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'perp_bisector', name: 'Orta Dikme', description: 'İki noktaya tıklayın; orta noktadan geçen dik doğru çizilir.', icon: <SeparatorVertical className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'angle_bisector', name: 'Açıortay', description: 'Açının bir kolu, köşesi ve diğer kolu: üç noktaya sırayla tıklayın.', icon: <GitBranch className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'perpendicular', name: 'Dik Doğru', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', icon: <Plus className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'parallel', name: 'Paralel Doğru', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', icon: <Equal className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'compass', name: 'Pergel', description: 'İğneyi saplayın, açıklığı ayarlayın, yayın başlangıcını istediğiniz yere bırakın ve iki yöne de çizin.', icon: <GeometryToolIcon kind="compass" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'intersect', name: 'Kesiştir', description: 'İki şekle tıklayın; ortak noktalarını oluşturur. Doğru, ışın, doğru parçası, çember ve yay desteklenir; elips yalnızca doğrularla kesiştirilebilir.', icon: <XIcon className="w-4 h-4" />, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400' },
    ],
  },

  // 6. Dönüşüm & Simetri Araçları (3) - Mor Pastel Arka Plan
  {
    groupName: 'Dönüşüm Araçları',
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

