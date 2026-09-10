'use client';

import React, { useEffect, useState } from 'react';
import { Solid3DObject } from '@/types/workspace3d';
import { calculate3DVolume, calculate3DSurfaceArea, getSolidPropertyCounts, generateSolidMesh, computeFaceArea } from '@/math/geometry3d';
import { formatTurkishNumber } from '@/math/coordinates';
import { Box, Sparkles, Trash2, CheckCircle2, RotateCw, ScanSearch } from 'lucide-react';

interface Properties3DProps {
  selectedSolid: Solid3DObject | null;
  onUpdateSolid: (updates: Partial<Solid3DObject>) => void;
  onDeleteSolid: () => void;
}

const PRESET_COLORS = [
  { hex: '#3b82f6', name: 'Mavi' },
  { hex: '#8b5cf6', name: 'Mor' },
  { hex: '#ec4899', name: 'Pembe' },
  { hex: '#10b981', name: 'Zümrüt' },
  { hex: '#f59e0b', name: 'Kehribar' },
  { hex: '#06b6d4', name: 'Camgöbeği' },
  { hex: '#6366f1', name: 'İndigo' },
  { hex: '#ef4444', name: 'Kırmızı' },
];

/** Ham metin tutan sayı alanı: "-" ve çok haneli değerler yazılabilir; blur/Enter'da uygulanır */
function NumberField({
  value,
  onCommit,
  className,
  step = 0.5,
  min,
  max,
}: {
  value: number;
  onCommit: (v: number) => void;
  className?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = () => {
    const parsed = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      let v = parsed;
      if (typeof min === 'number') v = Math.max(min, v);
      if (typeof max === 'number') v = Math.min(max, v);
      v = Number(v.toFixed(2));
      onCommit(v);
      setText(String(v));
    } else {
      setText(String(value));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      step={step}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === 'Escape') {
          setText(String(value));
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit = 'br',
  accent = 'accent-primary',
  valueClass = 'text-primary',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  accent?: string;
  valueClass?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[11px] font-bold gap-2">
        <span>{label}</span>
        <div className="flex items-center gap-1">
          <NumberField
            value={value}
            min={min}
            max={max}
            step={step}
            onCommit={onChange}
            className="w-14 px-1 py-0.5 text-right font-mono font-black bg-muted rounded-md border border-border text-[11px]"
          />
          <span className={`font-mono font-black ${valueClass}`}>{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full ${accent} cursor-pointer`}
      />
    </div>
  );
}

export function Properties3D({ selectedSolid, onUpdateSolid, onDeleteSolid }: Properties3DProps) {
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
  const dims = selectedSolid.dimensions;
  const rotation = selectedSolid.rotation || { x: 0, y: 0, z: 0 };
  const unfold = selectedSolid.unfoldProgress || 0;
  const radius = dims.radius || dims.width / 2;

  const selectedFace =
    selectedSolid.selectedFaceIndex !== null && selectedSolid.selectedFaceIndex !== undefined
      ? (() => {
          const mesh = generateSolidMesh(selectedSolid);
          const face = mesh.faces[selectedSolid.selectedFaceIndex];
          if (!face) return null;
          return {
            index: selectedSolid.selectedFaceIndex,
            label: face.label || `Yüz ${selectedSolid.selectedFaceIndex + 1}`,
            area: computeFaceArea(mesh.vertices, face.vertexIndices),
            color: selectedSolid.faceColors?.[selectedSolid.selectedFaceIndex] || null,
          };
        })()
      : null;

  const updateDims = (patch: Partial<Solid3DObject['dimensions']>) => {
    onUpdateSolid({ dimensions: { ...dims, ...patch } });
  };

  const isRadial = selectedSolid.type === 'sphere' || selectedSolid.type === 'cylinder' || selectedSolid.type === 'cone';
  const hasBox = selectedSolid.type === 'prism' || selectedSolid.type === 'pyramid' || selectedSolid.type === 'triangular_prism';

  return (
    <div className="flex flex-col bg-card border-l border-border w-20 lg:w-80 shrink-0 h-full min-h-0 select-none overflow-y-auto p-4 space-y-4">
      {/* 1. BAŞLIK */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-primary" />
            <h3 className="font-black text-sm text-foreground">{selectedSolid.name}</h3>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">3D Katı Cisim</span>
        </div>
        <button
          onClick={onDeleteSolid}
          className="p-1.5 rounded-xl hover:bg-rose-500/10 text-destructive transition-colors cursor-pointer"
          title="Cismi Sil"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 2. CANLI ÖLÇÜMLER */}
      <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-primary/20 space-y-2.5">
        <div className="flex items-center gap-1.5 font-black text-xs text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Matematiksel Ölçümler</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-card border border-border/80 text-center">
            <span className="text-[10px] font-bold text-muted-foreground block">Hacim (V)</span>
            <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">{formatTurkishNumber(volume, 1)} br³</span>
          </div>
          <div className="p-2 rounded-xl bg-card border border-border/80 text-center">
            <span className="text-[10px] font-bold text-muted-foreground block">Yüzey Alanı (A)</span>
            <span className="font-mono font-black text-purple-600 dark:text-purple-400 text-sm">{formatTurkishNumber(surfaceArea, 1)} br²</span>
          </div>
        </div>

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
            <span>
              Köşe (K): <strong>{counts.vertices}</strong>
            </span>
            <span>
              Ayrıt (E): <strong>{counts.edges}</strong>
            </span>
            <span>
              Yüz (Y): <strong>{counts.faces}</strong>
            </span>
          </div>
          {counts.eulerValid && (
            <div className="text-[10px] font-mono font-bold text-primary text-center pt-0.5">
              {counts.vertices} - {counts.edges} + {counts.faces} = 2
            </div>
          )}
        </div>
      </div>

      {/* 2b. SEÇİLİ YÜZ */}
      {selectedFace && (
        <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-sky-700 dark:text-sky-300">
            <span className="flex items-center gap-1.5">
              <ScanSearch className="w-3.5 h-3.5" />
              <span>Seçili Yüz: {selectedFace.label}</span>
            </span>
            <span className="font-mono">{formatTurkishNumber(selectedFace.area, 2)} br²</span>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() =>
                  onUpdateSolid({ faceColors: { ...(selectedSolid.faceColors || {}), [selectedFace.index]: c.hex } })
                }
                title={`Yüzü ${c.name} yap`}
                aria-label={`Yüzü ${c.name} yap`}
                className={`w-6 h-6 rounded-lg transition-all cursor-pointer ${
                  selectedFace.color === c.hex ? 'scale-110 ring-2 ring-sky-600 ring-offset-1' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            <button
              onClick={() => {
                const next = { ...(selectedSolid.faceColors || {}) };
                delete next[selectedFace.index];
                onUpdateSolid({ faceColors: next });
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-card border border-border hover:bg-muted cursor-pointer"
            >
              Rengi sıfırla
            </button>
            <button
              onClick={() => onUpdateSolid({ selectedFaceIndex: null })}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-card border border-border hover:bg-muted cursor-pointer"
            >
              Seçimi bırak
            </button>
          </div>
        </div>
      )}

      {/* 3. AÇINIM */}
      {selectedSolid.type !== 'sphere' && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-1.5">
              <span>📖</span>
              <span>Açınım / Yüzeyleri Ayır</span>
            </span>
            <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">%{Math.round(unfold * 100)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={unfold}
            onChange={(e) => onUpdateSolid({ unfoldProgress: parseFloat(e.target.value) })}
            className="w-full h-2 bg-amber-200 dark:bg-amber-950 rounded-lg appearance-none cursor-pointer accent-amber-600"
          />
          <div className="flex items-center justify-between gap-1 pt-1">
            {[
              { v: 0, label: '🔒 %0 Kapalı' },
              { v: 0.5, label: '%50 Yarı Açık' },
              { v: 1, label: '📖 %100 Tam Açık' },
            ].map((b) => (
              <button
                key={b.v}
                onClick={() => onUpdateSolid({ unfoldProgress: b.v })}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  Math.abs(unfold - b.v) < 0.03 ? 'bg-amber-600 text-white border-amber-700' : 'bg-card text-foreground border-border hover:bg-muted'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. BOYUTLAR */}
      <div className="space-y-3 p-3 rounded-2xl bg-card border border-border/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-foreground">📐 Boyutlar</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {formatTurkishNumber(dims.width)} × {formatTurkishNumber(dims.height)} × {formatTurkishNumber(dims.depth)} br
          </span>
        </div>

        {selectedSolid.type === 'cube' && (
          <SliderRow
            label="Küp Kenarı (a):"
            value={dims.width}
            min={0.5}
            max={10}
            step={0.5}
            onChange={(val) => onUpdateSolid({ dimensions: { width: val, height: val, depth: val, radius: val / 2 } })}
          />
        )}

        {hasBox && (
          <>
            <SliderRow label="Genişlik (En):" value={dims.width} min={0.5} max={12} step={0.5} onChange={(v) => updateDims({ width: v })} />
            <SliderRow label="Yükseklik (Boy):" value={dims.height} min={0.5} max={12} step={0.5} onChange={(v) => updateDims({ height: v })} />
            <SliderRow label="Derinlik:" value={dims.depth} min={0.5} max={12} step={0.5} onChange={(v) => updateDims({ depth: v })} />
          </>
        )}

        {isRadial && (
          <SliderRow
            label="Yarıçap (r):"
            value={radius}
            min={0.25}
            max={8}
            step={0.25}
            accent="accent-purple-600"
            valueClass="text-purple-600"
            onChange={(r) =>
              updateDims({ radius: r, width: r * 2, depth: r * 2, ...(selectedSolid.type === 'sphere' ? { height: r * 2 } : {}) })
            }
          />
        )}

        {(selectedSolid.type === 'cylinder' || selectedSolid.type === 'cone') && (
          <SliderRow label="Yükseklik (h):" value={dims.height} min={0.5} max={12} step={0.5} onChange={(v) => updateDims({ height: v })} />
        )}
      </div>

      {/* 5. KONUM */}
      <div className="space-y-2.5 p-3 rounded-2xl bg-card border border-border/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-foreground">📍 3D Konum</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            ({formatTurkishNumber(selectedSolid.position.x)}; {formatTurkishNumber(selectedSolid.position.y)}; {formatTurkishNumber(selectedSolid.position.z)})
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {(
            [
              { key: 'x', label: 'X (Kırmızı)', cls: 'text-rose-500' },
              { key: 'y', label: 'Y (Yeşil)', cls: 'text-emerald-500' },
              { key: 'z', label: 'Z (Mavi)', cls: 'text-blue-500' },
            ] as { key: 'x' | 'y' | 'z'; label: string; cls: string }[]
          ).map((axis) => (
            <div key={axis.key} className="space-y-1">
              <span className={`text-[10px] font-bold ${axis.cls}`}>{axis.label}</span>
              <NumberField
                value={selectedSolid.position[axis.key]}
                min={-50}
                max={50}
                onCommit={(v) => onUpdateSolid({ position: { ...selectedSolid.position, [axis.key]: v } })}
                className="w-full px-1.5 py-1 text-center font-mono font-bold bg-muted rounded-lg border border-border text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 6. DÖNDÜRME */}
      <div className="space-y-2.5 p-3 rounded-2xl bg-card border border-border/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-foreground flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5 text-primary" />
            Cismi Döndür
          </span>
          <button
            onClick={() => onUpdateSolid({ rotation: { x: 0, y: 0, z: 0 } })}
            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted hover:bg-muted/70 border border-border cursor-pointer"
          >
            Sıfırla
          </button>
        </div>
        {(['x', 'y', 'z'] as const).map((axis) => (
          <SliderRow
            key={axis}
            label={`${axis.toUpperCase()} ekseni:`}
            value={rotation[axis]}
            min={-180}
            max={180}
            step={5}
            unit="°"
            onChange={(v) => onUpdateSolid({ rotation: { ...rotation, [axis]: v } })}
          />
        ))}
      </div>

      {/* 7. RENK & SAYDAMLIK */}
      <div className="space-y-3 p-3 rounded-2xl bg-card border border-border/80">
        <span className="text-xs font-black text-foreground block">Renk ve Görünüm</span>

        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => onUpdateSolid({ color: c.hex })}
              title={c.name}
              aria-label={`Renk: ${c.name}`}
              className={`w-7 h-7 rounded-xl transition-all cursor-pointer ${
                selectedSolid.color === c.hex ? 'scale-110 ring-2 ring-primary ring-offset-2' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span>Yüzey Saydamlığı (Opasite)</span>
            <span className="font-mono font-black">%{Math.round(selectedSolid.opacity * 100)}</span>
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
