'use client';

import React, { useState } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { Point2D, PointObject, PolygonObject } from '@/types/math';
import { Hexagon, X, Check, Sparkles } from 'lucide-react';

interface RegularPolygonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetPos?: Point2D;
}

const PRESET_EDGES = [
  { count: 3, name: 'Eşkenar Üçgen', emoji: '▲' },
  { count: 4, name: 'Kare', emoji: '■' },
  { count: 5, name: 'Düzgün Beşgen', emoji: '⬟' },
  { count: 6, name: 'Düzgün Altıgen (Petek)', emoji: '⬡' },
  { count: 8, name: 'Düzgün Sekizgen', emoji: '🛑' },
  { count: 10, name: 'Düzgün Ongen', emoji: '🔟' },
  { count: 12, name: 'Düzgün Onikigen', emoji: '💠' },
];

function getPolygonName(n: number): string {
  if (n === 3) return 'Eşkenar Üçgen';
  if (n === 4) return 'Kare (Düzgün Dörtgen)';
  if (n === 5) return 'Düzgün Beşgen';
  if (n === 6) return 'Düzgün Altıgen (Petek)';
  if (n === 7) return 'Düzgün Yedigen';
  if (n === 8) return 'Düzgün Sekizgen';
  if (n === 9) return 'Düzgün Dokuzgen';
  if (n === 10) return 'Düzgün Ongen';
  if (n === 12) return 'Düzgün Onikigen';
  return `Düzgün ${n}-gen`;
}

export function RegularPolygonDialog({
  isOpen,
  onClose,
  targetPos = { x: 0, y: 0 },
}: RegularPolygonDialogProps) {
  const { addObject } = useWorkspace();
  const [sides, setSides] = useState<number>(6);
  const [radius, setRadius] = useState<number>(3);

  if (!isOpen) return null;

  const interiorAngle = Number((((sides - 2) * 180) / sides).toFixed(1));
  const exteriorAngle = Number((360 / sides).toFixed(1));
  const diagonalCount = (sides * (sides - 3)) / 2;
  const interiorSum = (sides - 2) * 180;
  const polyName = getPolygonName(sides);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sides < 3 || sides > 30) return;

    const pts: PointObject[] = [];
    const ptIds: string[] = [];

    for (let i = 0; i < sides; i++) {
      const ang = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const px = Number((targetPos.x + radius * Math.cos(ang)).toFixed(2));
      const py = Number((targetPos.y + radius * Math.sin(ang)).toFixed(2));
      const pId = `pt-${Date.now() + i}`;
      const label = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
      const p: PointObject = {
        id: pId,
        type: 'point',
        label,
        showLabel: true,
        x: px,
        y: py,
        color: '#10b981',
        visible: true,
        isIndependent: true,
        createdAt: Date.now() + i,
      };
      pts.push(p);
      ptIds.push(pId);
      addObject(p);
    }

    const poly: PolygonObject = {
      id: `poly-${Date.now() + sides}`,
      type: 'polygon',
      label: polyName,
      showLabel: true,
      pointIds: ptIds,
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 0.2,
      visible: true,
      showArea: true,
      showPerimeter: true,
      createdAt: Date.now() + sides,
    };

    addObject(poly, `${polyName} oluşturuldu (${sides} kenar)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Başlık */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Hexagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Düzgün Çokgen Çiz</h2>
              <p className="text-[11px] text-muted-foreground font-medium">
                Kenar sayısını belirleyerek eşit kenarlı çokgen oluşturun
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kenar Sayısı Girişi ve Stepper */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Kenar Sayısı (N)</span>
              <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                {polyName}
              </span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSides((s) => Math.max(3, s - 1))}
                className="w-10 h-10 rounded-xl bg-muted border border-border text-foreground font-black text-lg hover:bg-muted/80 transition-colors flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <input
                type="number"
                min={3}
                max={30}
                value={sides}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    setSides(Math.max(3, Math.min(30, val)));
                  }
                }}
                className="flex-1 text-center py-2 px-3 rounded-xl bg-input border border-border text-foreground font-mono text-lg font-bold focus:ring-2 focus:ring-primary outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setSides((s) => Math.min(30, s + 1))}
                className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg transition-colors flex items-center justify-center cursor-pointer shadow-sm"
              >
                +
              </button>
            </div>
          </div>

          {/* Hızlı Şablon Çipleri */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Sık Kullanılan Çokgenler
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_EDGES.map((p) => (
                <button
                  key={p.count}
                  type="button"
                  onClick={() => setSides(p.count)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                    sides === p.count
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm scale-102'
                      : 'bg-muted/60 hover:bg-muted text-foreground border-border/80'
                  }`}
                >
                  <span>{p.emoji}</span>
                  <span>{p.count} Gen</span>
                </button>
              ))}
            </div>
          </div>

          {/* Yarıçap / Boyut Ayarı */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground">Büyüklük (Yarıçap)</span>
              <span className="font-mono text-muted-foreground font-bold">{radius} br</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={radius}
              onChange={(e) => setRadius(parseFloat(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* MEB Eğitsel Matematik Özellikleri Kartı */}
          <div className="bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Matematiksel Özellikler:</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <div>
                • Bir İç Açı: <span className="font-bold text-foreground">{interiorAngle}°</span>
              </div>
              <div>
                • Bir Dış Açı: <span className="font-bold text-foreground">{exteriorAngle}°</span>
              </div>
              <div>
                • İç Açılar Toplamı: <span className="font-bold text-foreground">{interiorSum}°</span>
              </div>
              <div>
                • Köşegen Sayısı: <span className="font-bold text-foreground">{diagonalCount}</span>
              </div>
            </div>
          </div>

          {/* Düğmeler */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>⬡ Çokgeni Çiz</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
