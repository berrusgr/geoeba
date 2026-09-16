import React from 'react';
import { ToolMode } from '@/types/workspace';
import {
  MousePointer,
  CheckSquare,
  MousePointerClick,
  TextCursorInput,
  Scissors,
  SeparatorVertical,
  GitBranch,
  Equal,
  X as XIcon,
  MoveRight,
  Ruler,
  Square,
  Triangle,
  Circle as CircleIcon,
  CircleDot,
  PieChart,
  PenTool,
  Trash2,
  Hexagon,
  RotateCw,
  FlipHorizontal,
  Sparkles,
  Image as ImageIcon,
  Type,
  Plus,
  TrendingUp,
  Sliders,
} from 'lucide-react';
import { GeometryToolIcon } from './GeometryToolIcon';

export interface TreeToolItem {
  id: ToolMode | 'add_object';
  name: string;
  description: string;
  icon: React.ReactNode;
}

export interface TreeToolGroup {
  id: string;
  name: string;
  defaultExpanded?: boolean;
  tools: TreeToolItem[];
}

export const TREE_TOOL_GROUPS: TreeToolGroup[] = [
  // 1. Çiz Grubu
  {
    id: 'ciz',
    name: 'Çiz',
    defaultExpanded: true,
    tools: [
      { id: 'point', name: 'Nokta', description: 'Tuvale tıklayarak yeni nokta oluşturun.', icon: <GeometryToolIcon kind="point" /> },
      { id: 'segment', name: 'Doğru Parçası', description: 'İki nokta arasına doğru parçası çizin.', icon: <GeometryToolIcon kind="segment" /> },
      { id: 'line', name: 'Doğru', description: 'İki noktadan geçen sonsuz doğru çizin.', icon: <GeometryToolIcon kind="line" /> },
      { id: 'ray', name: 'Işın', description: 'Başlangıç noktası ve üzerinden geçen ikinci nokta ile ışın çizin.', icon: <GeometryToolIcon kind="ray" /> },
      { id: 'circle', name: 'Çember', description: 'Merkez ve yarıçap noktasıyla çember çizin.', icon: <CircleIcon className="w-4 h-4" /> },
      { id: 'arc', name: 'Çember Yay', description: 'Merkez, başlangıç ve bitiş noktasına tıklayın; yay çizin.', icon: <GeometryToolIcon kind="arc" /> },
      { id: 'polygon', name: 'Çokgen', description: 'Köşeleri belirleyerek çokgen çizin.', icon: <GeometryToolIcon kind="polygon" /> },
      { id: 'perpendicular', name: 'Dikme', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', icon: <Plus className="w-4 h-4" /> },
      { id: 'parallel', name: 'Paralel Doğru', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', icon: <Equal className="w-4 h-4" /> },
      { id: 'midpoint', name: 'Orta Nokta', description: 'İki noktaya tıklayın; aralarındaki orta nokta oluşur.', icon: <GeometryToolIcon kind="midpoint" /> },
      { id: 'perp_bisector', name: 'Orta Dikme', description: 'İki noktaya tıklayın; orta noktadan geçen dik doğru çizilir.', icon: <SeparatorVertical className="w-4 h-4" /> },
      { id: 'angle_bisector', name: 'Açıortay', description: 'Açının bir kolu, köşesi ve diğer kolu: üç noktaya sırayla tıklayın.', icon: <GitBranch className="w-4 h-4" /> },
      { id: 'rectangle', name: 'Dikdörtgen', description: 'Dikdörtgen şekli ekleyin.', icon: <GeometryToolIcon kind="rectangle" /> },
      { id: 'square', name: 'Kare', description: 'Sürükleyerek kare çizin.', icon: <Square className="w-4 h-4" /> },
      { id: 'regular_polygon', name: 'Düzgün Çokgen', description: 'Kenar sayısını girerek düzgün çokgen oluşturun.', icon: <Hexagon className="w-4 h-4" /> },
      { id: 'circle_radius', name: 'Yarıçapla Çember', description: 'Merkeze tıklayın, yarıçapı sayı olarak girin.', icon: <CircleDot className="w-4 h-4" /> },
      { id: 'circle_3points', name: '3 Noktalı Çember', description: 'Üç noktaya tıklayın; çevrel çember çizilir.', icon: <CircleIcon className="w-4 h-4" /> },
      { id: 'sector', name: 'Daire Dilimi', description: 'Merkez ve iki yay noktasıyla pasta dilimi çizin.', icon: <PieChart className="w-4 h-4" /> },
      { id: 'ellipse', name: 'Elips', description: 'Kutuya içten teğet elips çizin.', icon: <GeometryToolIcon kind="ellipse" /> },
      { id: 'segment_length', name: 'Ölçülü Parça', description: 'Bir başlangıç noktasına tıklayın, uzunluğu sayı olarak girin.', icon: <Ruler className="w-4 h-4" /> },
      { id: 'compass', name: 'Pergel', description: 'İğneyi saplayın, açıklığı ayarlayın ve çember çizin.', icon: <GeometryToolIcon kind="compass" /> },
      { id: 'intersect', name: 'Kesiştir', description: 'İki şekle tıklayın; ortak noktalarını oluşturur.', icon: <XIcon className="w-4 h-4" /> },
      { id: 'divide_ratio', name: 'Oranda Böl', description: 'İki noktaya tıklayın, sonra m:n oranını girin.', icon: <Scissors className="w-4 h-4" /> },
      { id: 'pen', name: 'Kalem', description: 'Serbest çizim kalemi.', icon: <PenTool className="w-4 h-4" /> },
    ],
  },

  // 2. Dönüştür Grubu
  {
    id: 'donustur',
    name: 'Dönüştür',
    defaultExpanded: true,
    tools: [
      { id: 'select', name: 'Taşı', description: 'Noktaları veya nesneleri seçip sürükleyin.', icon: <MousePointer className="w-4 h-4" /> },
      { id: 'rotate', name: 'Döndür', description: 'Şekli bir merkez etrafında döndürün.', icon: <RotateCw className="w-4 h-4" /> },
      { id: 'reflect', name: 'Yansıt', description: 'Doğruya göre simetri / yansıma.', icon: <FlipHorizontal className="w-4 h-4" /> },
      { id: 'translate', name: 'Ötele', description: 'Öteleme vektörüyle şekli taşıyın.', icon: <MoveRight className="w-4 h-4" /> },
      { id: 'symmetry', name: 'Simetri', description: 'Simetri eksenlerini keşfedin.', icon: <Sparkles className="w-4 h-4" /> },
    ],
  },

  // 3. Ölç Grubu
  {
    id: 'olc',
    name: 'Ölç',
    defaultExpanded: true,
    tools: [
      { id: 'measure_distance', name: 'Uzunluk', description: 'Mesafe ve uzunluk ölçün.', icon: <Ruler className="w-4 h-4 -rotate-45" /> },
      { id: 'angle', name: 'Açı', description: '3 nokta ile açı oluşturun.', icon: <GeometryToolIcon kind="angle" /> },
      { id: 'measure_area', name: 'Alan', description: 'Kapalı şeklin alanını hesaplayın.', icon: <GeometryToolIcon kind="area" /> },
      { id: 'measure_perimeter', name: 'Çevre', description: 'Şeklin çevre uzunluğunu hesaplayın.', icon: <GeometryToolIcon kind="perimeter" /> },
      { id: 'measure_angle', name: 'Açıölçer', description: 'Açı ölçümü yapın.', icon: <GeometryToolIcon kind="protractor" /> },
      { id: 'unit_measure', name: 'Birimle Ölç', description: 'Birim karelerle ölçüm yapın.', icon: <GeometryToolIcon kind="grid" /> },
      { id: 'measure_slope', name: 'Eğim Ölç', description: 'Doğrunun eğimini gösterir.', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'trig_ratios', name: 'Trig. Oranlar', description: 'Açının trigonometrik oranlarını gösterir.', icon: <Triangle className="w-4 h-4" /> },
      { id: 'area_model', name: 'Alanı Modelle', description: 'Alan modelleme ızgarası.', icon: <GeometryToolIcon kind="grid" /> },
      { id: 'ruler', name: 'Cetvel', description: 'İnteraktif cetvel aracı.', icon: <Ruler className="w-4 h-4 -rotate-45" /> },
      { id: 'setsquare', name: 'Gönye', description: 'Dik açı ve gönye aracı.', icon: <GeometryToolIcon kind="setsquare" /> },
    ],
  },

  // 4. Diğer Grubu
  {
    id: 'diger',
    name: 'Diğer',
    defaultExpanded: true,
    tools: [
      { id: 'text', name: 'Metin', description: 'Tuvale metin kutusu ekleyin.', icon: <Type className="w-4 h-4" /> },
      { id: 'add_object', name: 'Nesne Ekle', description: 'Ölçü girerek kesin nesne ekleyin.', icon: <Plus className="w-4 h-4" /> },
      { id: 'function', name: 'Fonksiyon', description: 'f(x) ifadesi girerek grafik çizin.', icon: <GeometryToolIcon kind="function" /> },
      { id: 'slider', name: 'Sürgü', description: 'Parametreler için sürgü ekleyin.', icon: <Sliders className="w-4 h-4" /> },
      { id: 'image', name: 'Görsel Ekle', description: 'Tuvale görsel ekleyin.', icon: <ImageIcon className="w-4 h-4" /> },
      { id: 'fraction', name: 'Kesir Göster', description: 'Kesir modeli oluşturun.', icon: <span className="font-bold text-xs">½</span> },
      { id: 'checkbox', name: 'İşaret Kutusu', description: 'Nesneleri göster/gizle etmek için kutu ekleyin.', icon: <CheckSquare className="w-4 h-4" /> },
      { id: 'button', name: 'Düğme', description: 'Nesneleri çalıştıran düğme ekleyin.', icon: <MousePointerClick className="w-4 h-4" /> },
      { id: 'input_box', name: 'Girdi Kutusu', description: 'Değer girmek için kutu ekleyin.', icon: <TextCursorInput className="w-4 h-4" /> },
      { id: 'delete', name: 'Sil', description: 'Silmek istediğiniz nesneye dokunun.', icon: <Trash2 className="w-4 h-4" /> },
    ],
  },
];
