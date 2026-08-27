'use client';

import React from 'react';
import { Solid3DObject } from '@/types/workspace3d';
import {
  calculate3DVolume,
  calculate3DSurfaceArea,
  getSolidPropertyCounts,
} from '@/math/geometry3d';
import {
  Sliders,
  Box,
  Palette,
  Layers,
  Sparkles,
  Maximize2,
  Trash2,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface Properties3DProps {
  selectedSolid: Solid3DObject | null;
  onUpdateSolid: (updates: Partial<Solid3DObject>) => void;
  onDeleteSolid: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', // Mavi
  '#8b5cf6', // Mor
  '#ec4899', // Pembe
  '#10b981', // Zümrüt
  '#f59e0b', // Kehribar
  '#06b6d4', // Camgöbeği
  '#6366f1', // İndigo
  '#ef4444', // Kırmızı
];

export function Properties3D({
  selectedSolid,
  onUpdateSolid,
  onDeleteSolid,
}: Properties3DProps) {
  if (!selectedSolid) {
    return (
      <div className="flex flex-col bg-card border-l border-border w-20 lg:w-72 shrink-0 h-full min-h-0 select-none overflow-y-auto p-4 space-y-4 text-center justify-center items-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center text-muted-foreground mb-2">
          <Box className="w-7 h-7" />
        </div>
        <h3 className="text-xs font-black text-foreground">3D Cisim Seçilmedi</h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Özelliklerini, boyutlarını, açınımını ve canlı hacim/alan formüllerini incelemek için bir 3D cisme tıklayın.
        </p>
      </div>
    );
  }

  const volume = calculate3DVolume(selectedSolid);
  const surfaceArea = calculate3DSurfaceArea(selectedSolid);
  const counts = getSolidPropertyCounts(selectedSolid.type);

  return (
    <div className="flex flex-col bg-card border-l border-border w-20 lg:w-80 shrink-0 h-full min-h-0 select-none overflow-y-auto p-4 space-y-4">
      {/* 1. BAŞLIK VE TÜR ROZETİ */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-primary" />
            <h3 className="font-black text-sm text-foreground">{selectedSolid.name}</h3>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            3D Katı Cisim
          </span>
        </div>
        <button
          onClick={onDeleteSolid}
          className="p-1.5 rounded-xl hover:bg-rose-500/10 text-destructive transition-colors cursor-pointer"
          title="Cismi Sil"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 2. CANLI MATEMATİKSEL DEĞERLER (HACİM & YÜZEY ALANI & EULER) */}
      <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-primary/20 space-y-2.5">
        <div className="flex items-center gap-1.5 font-black text-xs text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Matematiksel Ölçümler</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-card border border-border/80 text-center">
            <span className="text-[10px] font-bold text-muted-foreground block">Hacim (V)</span>
            <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
              {volume.toFixed(1)} br³
            </span>
          </div>

          <div className="p-2 rounded-xl bg-card border border-border/80 text-center">
            <span className="text-[10px] font-bold text-muted-foreground block">Yüzey Alanı (A)</span>
            <span className="font-mono font-black text-purple-600 dark:text-purple-400 text-sm">
              {surfaceArea.toFixed(1)} br²
            </span>
          </div>
        </div>

        {/* Euler Formülü: K - E + Y = 2 */}
        <div className="p-2.5 rounded-xl bg-card border border-border/80 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-foreground">Euler Karakteristiği:</span>
            {counts.eulerValid && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3" /> Doğrulandı
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>Köşe (K): <strong>{counts.vertices}</strong></span>
            <span>Ayrıt (E): <strong>{counts.edges}</strong></span>
            <span>Yüz (Y): <strong>{counts.faces}</strong></span>
          </div>
          {counts.eulerValid && (
            <div className="text-[10px] font-mono font-bold text-primary text-center pt-0.5">
              {counts.vertices} - {counts.edges} + {counts.faces} = 2
            </div>
          )}
        </div>
      </div>

      {/* 3. AÇINIM / KATLAMA (UNFOLDING) KAYDIRICI */}
      {(selectedSolid.type === 'cube' || selectedSolid.type === 'prism') && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
            <span>📖 Açınım / 2D Katlama</span>
            <span className="font-mono font-black">
              %{Math.round(selectedSolid.unfoldProgress * 100)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={selectedSolid.unfoldProgress}
            onChange={(e) => onUpdateSolid({ unfoldProgress: parseFloat(e.target.value) })}
            className="w-full accent-amber-600 cursor-pointer"
          />
        </div>
      )}

      {/* 4. BOYUT AYARLARI */}
      <div className="space-y-3 p-3 rounded-2xl bg-card border border-border/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-foreground">📐 Boyutlar</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {selectedSolid.dimensions.width} x {selectedSolid.dimensions.height} x {selectedSolid.dimensions.depth} br
          </span>
        </div>

        {/* KÜP: Kenar Uzunluğu (Tüm kenarlar eşit a) */}
        {selectedSolid.type === 'cube' && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold">
              <span>Küp Kenarı (a):</span>
              <span className="font-mono text-primary font-black">{selectedSolid.dimensions.width} br</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={selectedSolid.dimensions.width}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateSolid({
                  dimensions: { width: val, height: val, depth: val, radius: val / 2 },
                });
              }}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        )}

        {/* PRİZMA & PİRAMİT: Genişlik, Yükseklik, Derinlik */}
        {(selectedSolid.type === 'prism' || selectedSolid.type === 'pyramid' || selectedSolid.type === 'triangular_prism') && (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold">
                <span>Genişlik (En):</span>
                <span className="font-mono text-primary font-black">{selectedSolid.dimensions.width} br</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={selectedSolid.dimensions.width}
                onChange={(e) =>
                  onUpdateSolid({
                    dimensions: { ...selectedSolid.dimensions, width: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold">
                <span>Yükseklik (Boy):</span>
                <span className="font-mono text-primary font-black">{selectedSolid.dimensions.height} br</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={selectedSolid.dimensions.height}
                onChange={(e) =>
                  onUpdateSolid({
                    dimensions: { ...selectedSolid.dimensions, height: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold">
                <span>Derinlik:</span>
                <span className="font-mono text-primary font-black">{selectedSolid.dimensions.depth} br</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={selectedSolid.dimensions.depth}
                onChange={(e) =>
                  onUpdateSolid({
                    dimensions: { ...selectedSolid.dimensions, depth: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </>
        )}

        {/* SİLİNDİR, KONİ, KÜRE: Yarıçap & Yükseklik */}
        {(selectedSolid.type === 'sphere' || selectedSolid.type === 'cylinder' || selectedSolid.type === 'cone') && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold">
              <span>Yarıçap (r):</span>
              <span className="font-mono text-purple-600 font-black">
                {selectedSolid.dimensions.radius || selectedSolid.dimensions.width / 2} br
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={8}
              step={0.25}
              value={selectedSolid.dimensions.radius || selectedSolid.dimensions.width / 2}
              onChange={(e) => {
                const r = parseFloat(e.target.value);
                onUpdateSolid({
                  dimensions: {
                    ...selectedSolid.dimensions,
                    radius: r,
                    width: r * 2,
                    depth: r * 2,
                    ...(selectedSolid.type === 'sphere' ? { height: r * 2 } : {}),
                  },
                });
              }}
              className="w-full accent-purple-600 cursor-pointer"
            />
          </div>
        )}

        {(selectedSolid.type === 'cylinder' || selectedSolid.type === 'cone') && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold">
              <span>Yükseklik (h):</span>
              <span className="font-mono text-primary font-black">{selectedSolid.dimensions.height} br</span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              step={0.5}
              value={selectedSolid.dimensions.height}
              onChange={(e) =>
                onUpdateSolid({
                  dimensions: { ...selectedSolid.dimensions, height: parseFloat(e.target.value) },
                })
              }
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* 5. 3D KONUM (X, Y, Z) */}
      <div className="space-y-2.5 p-3 rounded-2xl bg-card border border-border/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-foreground">📍 3D Konum</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            ({selectedSolid.position.x}, {selectedSolid.position.y}, {selectedSolid.position.z})
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-rose-500">X (Kırmızı)</span>
            <input
              type="number"
              value={selectedSolid.position.x}
              onChange={(e) =>
                onUpdateSolid({
                  position: { ...selectedSolid.position, x: parseFloat(e.target.value) || 0 },
                })
              }
              className="w-full px-1.5 py-1 text-center font-mono font-bold bg-muted rounded-lg border border-border text-xs"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-500">Y (Yeşil)</span>
            <input
              type="number"
              value={selectedSolid.position.y}
              onChange={(e) =>
                onUpdateSolid({
                  position: { ...selectedSolid.position, y: parseFloat(e.target.value) || 0 },
                })
              }
              className="w-full px-1.5 py-1 text-center font-mono font-bold bg-muted rounded-lg border border-border text-xs"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-blue-500">Z (Mavi)</span>
            <input
              type="number"
              value={selectedSolid.position.z}
              onChange={(e) =>
                onUpdateSolid({
                  position: { ...selectedSolid.position, z: parseFloat(e.target.value) || 0 },
                })
              }
              className="w-full px-1.5 py-1 text-center font-mono font-bold bg-muted rounded-lg border border-border text-xs"
            />
          </div>
        </div>
      </div>

      {/* 5. RENK & SAYDAMLIK AYARLARI */}
      <div className="space-y-3 p-3 rounded-2xl bg-card border border-border/80">
        <span className="text-xs font-black text-foreground block">Renk ve Görünüm</span>

        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onUpdateSolid({ color: c })}
              className={`w-7 h-7 rounded-xl transition-all cursor-pointer ${
                selectedSolid.color === c ? 'scale-115 ring-2 ring-primary ring-offset-2' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span>Yüzey Saydamlığı (Opasite)</span>
            <span className="font-mono font-black">{Math.round(selectedSolid.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={selectedSolid.opacity}
            onChange={(e) => onUpdateSolid({ opacity: parseFloat(e.target.value) })}
            className="w-full accent-primary cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
