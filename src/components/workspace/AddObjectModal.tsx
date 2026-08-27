'use client';

import React, { useState, useMemo } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { PointObject, SegmentObject, CircleObject, PolygonObject } from '@/types/math';
import { Solid3D, Solid3DType } from '@/types/workspace3d';
import {
  X,
  Hash,
  MoveRight,
  Circle as CircleIcon,
  Triangle,
  Square,
  TrendingUp,
  Sigma,
  Box,
  Cylinder,
  Sparkles,
} from 'lucide-react';

interface AddObjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  is3D?: boolean;
  onAddSolid3D?: (type: Solid3DType) => void;
}

type TabType =
  | 'point'
  | 'number'
  | 'segment'
  | 'circle'
  | 'disk'
  | 'triangle'
  | 'square'
  | 'rectangle'
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'prism'
  | 'function'
  | 'angle';

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  is3DOnly?: boolean;
}

const TABS: TabItem[] = [
  { id: 'point', label: 'Nokta', icon: <Hash className="w-4 h-4" /> },
  { id: 'number', label: 'Sayı', icon: <Hash className="w-4 h-4" /> },
  { id: 'segment', label: 'Doğru parçası', icon: <MoveRight className="w-4 h-4" /> },
  { id: 'circle', label: 'Çember', icon: <CircleIcon className="w-4 h-4" /> },
  { id: 'disk', label: 'Daire', icon: <CircleIcon className="w-4 h-4" /> },
  { id: 'triangle', label: 'Üçgen', icon: <Triangle className="w-4 h-4" /> },
  { id: 'square', label: 'Kare', icon: <Square className="w-4 h-4" /> },
  { id: 'rectangle', label: 'Dikdörtgen', icon: <Square className="w-4 h-4" /> },
  { id: 'cube', label: 'Küp (3D)', icon: <Box className="w-4 h-4" /> },
  { id: 'sphere', label: 'Küre (3D)', icon: <CircleIcon className="w-4 h-4" /> },
  { id: 'cylinder', label: 'Silindir (3D)', icon: <Cylinder className="w-4 h-4" /> },
  { id: 'prism', label: 'Prizma (3D)', icon: <Box className="w-4 h-4" /> },
  { id: 'function', label: 'Fonksiyon', icon: <span className="font-serif font-bold text-xs">f</span> },
  { id: 'angle', label: 'Açı', icon: <Sigma className="w-4 h-4" /> },
];

export function AddObjectModal({ isOpen, onClose, is3D, onAddSolid3D }: AddObjectModalProps) {
  const { addObject } = useWorkspace();
  const [selectedTab, setSelectedTab] = useState<TabType>(is3D ? 'cube' : 'disk');

  // Form Değerleri
  const [name, setName] = useState('daire1');
  const [creationMode, setCreationMode] = useState('Ölçü gir');
  const [startX, setStartX] = useState('1');
  const [startY, setStartY] = useState('1');
  const [startZ, setStartZ] = useState('0');
  const [radius, setRadius] = useState('2');
  const [width, setWidth] = useState('4');
  const [height, setHeight] = useState('3');
  const [depth, setDepth] = useState('3');
  const [angleVal, setAngleVal] = useState('60');
  const [funcExpr, setFuncExpr] = useState('2*x + 1');

  // Tab Değişiminde Varsayılan İsim Güncelleme
  const handleTabChange = (tabId: TabType) => {
    setSelectedTab(tabId);
    switch (tabId) {
      case 'point': setName('A'); break;
      case 'number': setName('n1'); break;
      case 'segment': setName('d1'); break;
      case 'circle': setName('cember1'); break;
      case 'disk': setName('daire1'); break;
      case 'triangle': setName('ucgen1'); break;
      case 'square': setName('kare1'); break;
      case 'rectangle': setName('dikdortgen1'); break;
      case 'cube': setName('kup1'); break;
      case 'sphere': setName('kure1'); break;
      case 'cylinder': setName('silindir1'); break;
      case 'prism': setName('prizma1'); break;
      case 'function': setName('f'); break;
      case 'angle': setName('alfa'); break;
    }
  };

  // Komut Önizlemesi
  const commandPreview = useMemo(() => {
    const x = Number(startX) || 0;
    const y = Number(startY) || 0;
    const z = Number(startZ) || 0;
    const r = Number(radius) || 2;
    const w = Number(width) || 4;
    const h = Number(height) || 3;
    const d = Number(depth) || 3;

    switch (selectedTab) {
      case 'disk':
        return `${name}Merkez = Nokta(${x}, ${y})\n${name} = Daire(${name}Merkez, ${r})`;
      case 'circle':
        return `${name}Merkez = Nokta(${x}, ${y})\n${name} = Cember(${name}Merkez, ${r})`;
      case 'point':
        return `${name} = Nokta(${x}, ${y}${is3D ? `, ${z}` : ''})`;
      case 'segment':
        return `${name}A = Nokta(${x}, ${y})\n${name}B = Nokta(${x + w}, ${y + h})\n${name} = DogruParcasi(${name}A, ${name}B)`;
      case 'square':
        return `${name}Kose = Nokta(${x}, ${y})\n${name} = Kare(${name}Kose, Kenar=${w})`;
      case 'rectangle':
        return `${name}Kose = Nokta(${x}, ${y})\n${name} = Dikdortgen(${name}Kose, Genislik=${w}, Yukseklik=${h})`;
      case 'triangle':
        return `${name}A = Nokta(${x}, ${y})\n${name}B = Nokta(${x + w}, ${y})\n${name}C = Nokta(${x + w / 2}, ${y + h})\n${name} = Ucgen(${name}A, ${name}B, ${name}C)`;
      case 'cube':
        return `${name} = Kup(Merkez=(${x}, ${y}, ${z}), Kenar=${w})`;
      case 'sphere':
        return `${name} = Kure(Merkez=(${x}, ${y}, ${z}), Yaricap=${r})`;
      case 'cylinder':
        return `${name} = Silindir(Merkez=(${x}, ${y}, ${z}), Yaricap=${r}, Yukseklik=${h})`;
      case 'prism':
        return `${name} = Prizma(Merkez=(${x}, ${y}, ${z}), a=${w}, b=${d}, h=${h})`;
      case 'function':
        return `${name}(x) = ${funcExpr}`;
      case 'angle':
        return `${name} = Aci(${angleVal}°)`;
      case 'number':
        return `${name} = ${radius}`;
      default:
        return `${name} = Nesne()`;
    }
  }, [selectedTab, name, startX, startY, startZ, radius, width, height, depth, angleVal, funcExpr, is3D]);

  if (!isOpen) return null;

  // Nesneyi Çalışma Alanına Ekle
  const handleAdd = () => {
    const x = Number(startX) || 0;
    const y = Number(startY) || 0;
    const z = Number(startZ) || 0;
    const r = Number(radius) || 2;
    const w = Number(width) || 4;
    const h = Number(height) || 3;
    const d = Number(depth) || 3;

    // 3D Cisimler
    if (selectedTab === 'cube' || selectedTab === 'sphere' || selectedTab === 'cylinder' || selectedTab === 'prism') {
      const typeMap: Record<string, Solid3DType> = {
        cube: 'cube',
        sphere: 'sphere',
        cylinder: 'cylinder',
        prism: 'prism',
      };
      if (onAddSolid3D) {
        onAddSolid3D(typeMap[selectedTab]);
      }
      onClose();
      return;
    }

    // 2D Geometri Nesneleri
    if (selectedTab === 'point') {
      const newPt: PointObject = {
        id: `pt-${Date.now()}`,
        type: 'point',
        label: name,
        showLabel: true,
        isIndependent: true,
        x,
        y,
        color: '#2563eb',
        visible: true,
        createdAt: Date.now(),
      };
      addObject(newPt, `${name} noktası eklendi`);
    } else if (selectedTab === 'disk' || selectedTab === 'circle') {
      const centerId = `pt-${Date.now()}`;
      const centerPt: PointObject = {
        id: centerId,
        type: 'point',
        label: `${name}M`,
        showLabel: true,
        isIndependent: true,
        x,
        y,
        color: '#2563eb',
        visible: true,
        createdAt: Date.now(),
      };
      addObject(centerPt, `${name} merkez noktası eklendi`);

      const newCirc: CircleObject = {
        id: `circ-${Date.now() + 1}`,
        type: 'circle',
        label: name,
        showLabel: true,
        centerPointId: centerId,
        fixedRadius: r,
        color: '#8b5cf6',
        fillOpacity: selectedTab === 'disk' ? 0.12 : 0,
        visible: true,
        showArea: selectedTab === 'disk',
        createdAt: Date.now() + 1,
      };
      addObject(newCirc, `${name} eklendi`);
    } else if (selectedTab === 'square' || selectedTab === 'rectangle') {
      const p1Id = `pt-${Date.now()}`;
      const p2Id = `pt-${Date.now() + 1}`;
      const p3Id = `pt-${Date.now() + 2}`;
      const p4Id = `pt-${Date.now() + 3}`;
      const sideH = selectedTab === 'square' ? w : h;

      const p1: PointObject = { id: p1Id, type: 'point', label: 'A', showLabel: true, isIndependent: true, x, y, color: '#3b82f6', visible: true, createdAt: Date.now() };
      const p2: PointObject = { id: p2Id, type: 'point', label: 'B', showLabel: true, isIndependent: true, x: x + w, y, color: '#3b82f6', visible: true, createdAt: Date.now() };
      const p3: PointObject = { id: p3Id, type: 'point', label: 'C', showLabel: true, isIndependent: true, x: x + w, y: y + sideH, color: '#3b82f6', visible: true, createdAt: Date.now() };
      const p4: PointObject = { id: p4Id, type: 'point', label: 'D', showLabel: true, isIndependent: true, x, y: y + sideH, color: '#3b82f6', visible: true, createdAt: Date.now() };

      addObject(p1);
      addObject(p2);
      addObject(p3);
      addObject(p4);

      const poly: PolygonObject = {
        id: `poly-${Date.now() + 4}`,
        type: 'polygon',
        label: name,
        showLabel: true,
        pointIds: [p1Id, p2Id, p3Id, p4Id],
        color: '#f59e0b',
        fillColor: '#f59e0b25',
        visible: true,
        showArea: true,
        createdAt: Date.now() + 4,
      };
      addObject(poly, `${name} eklendi`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col select-none">
        {/* Üst Başlık & Kapatma Butonu */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Nesne ekle
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ana Gövde: Sol Sekmeler + Sağ Form */}
        <div className="flex flex-col sm:flex-row min-h-[420px]">
          {/* Sol Sekmeler Listesi */}
          <div className="w-full sm:w-52 p-3 bg-slate-50/60 dark:bg-slate-950/40 border-r border-slate-100 dark:border-slate-800/80 flex flex-row sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto max-h-[460px] scrollbar-thin shrink-0">
            {TABS.map((tab) => {
              const isSelected = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200/60 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'text-primary' : 'text-slate-400'
                    }`}
                  >
                    {tab.icon}
                  </div>
                  <span className="font-extrabold">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sağ Form Parametre Alanı */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[460px] scrollbar-thin">
            {/* Ad Alanı */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">Ad</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            {/* Oluşturma Biçimi Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                Oluşturma biçimi
              </label>
              <select
                value={creationMode}
                onChange={(e) => setCreationMode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
              >
                <option value="Ölçü gir">Ölçü gir</option>
                <option value="Koordinat gir">Koordinat gir</option>
                <option value="Nokta seç">Nokta seç</option>
              </select>
            </div>

            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              Kesin ölçüleri girin; gerekli noktalar otomatik oluşur.
            </p>

            {/* Dinamik Form Alanları */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Başlangıç x
                </label>
                <input
                  type="number"
                  value={startX}
                  onChange={(e) => setStartX(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Başlangıç y
                </label>
                <input
                  type="number"
                  value={startY}
                  onChange={(e) => setStartY(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>

            {/* Çember / Daire / Küre için Yarıçap */}
            {(selectedTab === 'disk' || selectedTab === 'circle' || selectedTab === 'sphere' || selectedTab === 'cylinder') && (
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">Yarıçap</label>
                <input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            )}

            {/* Kare / Dikdörtgen / Prizma / Küp için Ölçüler */}
            {(selectedTab === 'square' || selectedTab === 'rectangle' || selectedTab === 'triangle' || selectedTab === 'cube' || selectedTab === 'prism') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {selectedTab === 'square' || selectedTab === 'cube' ? 'Kenar' : 'Genişlik'}
                  </label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                {selectedTab !== 'square' && selectedTab !== 'cube' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">Yükseklik</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Komut Önizleme Kutusu */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                KOMUT ÖNİZLEME
              </label>
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {commandPreview}
              </div>
            </div>

            {/* Ekle Butonu */}
            <div className="pt-2">
              <button
                onClick={handleAdd}
                className="w-full py-3.5 rounded-2xl bg-[#5865f2] hover:bg-[#4752c4] text-white font-black text-xs shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Ekle</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
