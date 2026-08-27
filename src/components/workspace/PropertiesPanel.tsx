'use client';

import React from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import {
  PointObject,
  SegmentObject,
  LineObject,
  CircleObject,
  AngleObject,
  PolygonObject,
  FunctionObject,
  SliderObject,
} from '@/types/math';
import {
  calculateDistance,
  calculateAngleDegrees,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateCircleArea,
  calculateCircleCircumference,
  calculateLineEquation,
} from '@/math/geometry';
import { formatTurkishNumber, formatCoordinate } from '@/math/coordinates';
import {
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Palette,
  Sliders,
  Grid,
  Maximize,
  Compass,
  Check,
} from 'lucide-react';

const COLOR_PRESETS = [
  '#2563eb', // Mavi
  '#0284c7', // Açık Mavi
  '#8b5cf6', // Mor
  '#ec4899', // Pembe
  '#ef4444', // Kırmızı
  '#f59e0b', // Turuncu
  '#10b981', // Yeşil
  '#6b7280', // Gri
];

export function PropertiesPanel() {
  const {
    objects,
    selectedObjectId,
    viewport,
    setSelectedObjectId,
    updateObject,
    deleteObject,
    setViewport,
    handleSliderChange,
  } = useWorkspace();

  const selectedObject = objects.find((o) => o.id === selectedObjectId);
  const sliders = objects.filter((o) => o.type === 'slider') as SliderObject[];

  return (
    <div className="w-full lg:w-72 bg-card border-t lg:border-t-0 lg:border-l border-border p-4 space-y-6 overflow-y-auto shrink-0 h-full min-h-0 select-none">
      {/* 1. SEÇİLİ NESNE BİLGİ VE ÖZELLİK PANELİ */}
      {selectedObject ? (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: selectedObject.color || '#2563eb' }}
              />
              <h3 className="font-bold text-sm text-foreground truncate">
                {selectedObject.label || 'Nesne Özellikleri'}
              </h3>
            </div>
            <button
              onClick={() => deleteObject(selectedObject.id)}
              className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              title="Nesneyi Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* NOKTA ÖZELLİKLERİ */}
          {selectedObject.type === 'point' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/40">
                <div className="text-muted-foreground font-medium">Koordinat:</div>
                <div className="font-mono text-sm font-bold text-foreground">
                  {formatCoordinate(selectedObject as PointObject)}
                </div>
              </div>

              {/* Etiket Adı */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Etiket Adı</label>
                <input
                  type="text"
                  value={selectedObject.label}
                  onChange={(e) => updateObject(selectedObject.id, { label: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-input border border-border text-foreground text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          )}

          {/* DOĞRU PARÇASI ÖZELLİKLERİ */}
          {selectedObject.type === 'segment' && (() => {
            const seg = selectedObject as SegmentObject;
            const p1 = objects.find((o) => o.id === seg.startPointId) as PointObject;
            const p2 = objects.find((o) => o.id === seg.endPointId) as PointObject;
            const length = p1 && p2 ? calculateDistance(p1, p2) : 0;

            return (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/40">
                  <div className="text-muted-foreground font-medium">Uzunluk:</div>
                  <div className="font-mono text-sm font-bold text-foreground">
                    |{p1?.label || 'A'}{p2?.label || 'B'}| = {formatTurkishNumber(length)} birim
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Uzunluğu Göster</span>
                  <input
                    type="checkbox"
                    checked={seg.showLength ?? true}
                    onChange={(e) => updateObject(seg.id, { showLength: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                </div>
              </div>
            );
          })()}

          {/* DOĞRU ÖZELLİKLERİ */}
          {selectedObject.type === 'line' && (() => {
            const line = selectedObject as LineObject;
            const p1 = objects.find((o) => o.id === line.point1Id) as PointObject;
            const p2 = objects.find((o) => o.id === line.point2Id) as PointObject;
            const eq = p1 && p2 ? calculateLineEquation(p1, p2) : null;

            return (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/40">
                  <div className="text-muted-foreground font-medium">Doğru Denklemi:</div>
                  <div className="font-mono text-sm font-bold text-foreground">
                    {eq?.equationText || 'y = mx + n'}
                  </div>
                  {eq?.slope !== null && eq?.slope !== undefined && (
                    <div className="text-muted-foreground text-[11px]">
                      Eğim (m): <span className="font-bold text-foreground">{formatTurkishNumber(eq.slope)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ÇEMBER ÖZELLİKLERİ */}
          {selectedObject.type === 'circle' && (() => {
            const circ = selectedObject as CircleObject;
            const center = objects.find((o) => o.id === circ.centerPointId) as PointObject;
            let radius = circ.fixedRadius ?? 0;
            if (circ.radiusPointId) {
              const rPoint = objects.find((o) => o.id === circ.radiusPointId) as PointObject;
              if (center && rPoint) radius = calculateDistance(center, rPoint);
            }

            return (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/40">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Yarıçap (r):</span>
                    <span className="font-bold text-foreground">{formatTurkishNumber(radius)} br</span>
                  </div>

                  {/* Canlı Yarıçap Ayarı */}
                  <div className="space-y-1 pt-1">
                    <input
                      type="range"
                      min="0.5"
                      max="15"
                      step="0.5"
                      value={radius}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (circ.fixedRadius !== undefined) {
                          updateObject(circ.id, { fixedRadius: val });
                        } else if (circ.radiusPointId && center) {
                          const rPoint = objects.find((o) => o.id === circ.radiusPointId) as PointObject;
                          if (rPoint) {
                            const curDist = calculateDistance(center, rPoint) || 1;
                            const ratio = val / curDist;
                            const nx = Number((center.x + (rPoint.x - center.x) * ratio).toFixed(2));
                            const ny = Number((center.y + (rPoint.y - center.y) * ratio).toFixed(2));
                            updateObject(rPoint.id, { x: nx, y: ny }, false);
                          }
                        } else {
                          updateObject(circ.id, { fixedRadius: val });
                        }
                      }}
                      className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="flex justify-between pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Çevre (2πr):</span>
                    <span className="font-bold text-foreground">{formatTurkishNumber(calculateCircleCircumference(radius))} br</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Alan (πr²):</span>
                    <span className="font-bold text-foreground">{formatTurkishNumber(calculateCircleArea(radius))} br²</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ÇOKGEN ÖZELLİKLERİ & EN/BOY AYARI */}
          {selectedObject.type === 'polygon' && (() => {
            const poly = selectedObject as PolygonObject;
            const polyPoints = poly.pointIds
              .map((id) => objects.find((o) => o.id === id) as PointObject)
              .filter(Boolean);
            const area = calculatePolygonArea(polyPoints);
            const perimeter = calculatePolygonPerimeter(polyPoints);

            const xs = polyPoints.map((p) => p.x);
            const ys = polyPoints.map((p) => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const curW = Number(Math.max(0.1, maxX - minX).toFixed(1));
            const curH = Number(Math.max(0.1, maxY - minY).toFixed(1));
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;

            const handleResize = (newW: number, newH: number) => {
              const scaleX = newW / curW;
              const scaleY = newH / curH;
              polyPoints.forEach((p) => {
                const nx = Number((cx + (p.x - cx) * scaleX).toFixed(2));
                const ny = Number((cy + (p.y - cy) * scaleY).toFixed(2));
                updateObject(p.id, { x: nx, y: ny }, false);
              });
            };

            const isSquare = Math.abs(curW - curH) < 0.2 && polyPoints.length === 4;

            return (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/40">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Köşe Sayısı:</span>
                    <span className="font-bold text-foreground">{polyPoints.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Alan:</span>
                    <span className="font-bold text-foreground">{formatTurkishNumber(area)} br²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Çevre:</span>
                    <span className="font-bold text-foreground">{formatTurkishNumber(perimeter)} br</span>
                  </div>
                </div>

                {/* En / Boy / Kenar Boyutlandırma Kontrolleri */}
                <div className="p-3 bg-muted/30 rounded-xl space-y-3 border border-border/50">
                  <div className="font-black text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
                    <span>📐 Boyutları Ayarla</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{curW} x {curH} br</span>
                  </div>

                  {isSquare ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-semibold">Kenar Uzunluğu:</span>
                        <span className="font-mono font-bold text-primary">{curW} br</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.5"
                        value={curW}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleResize(val, val);
                        }}
                        className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground font-semibold">Genişlik (En):</span>
                          <span className="font-mono font-bold text-primary">{curW} br</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="25"
                          step="0.5"
                          value={curW}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            handleResize(val, curH);
                          }}
                          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground font-semibold">Yükseklik (Boy):</span>
                          <span className="font-mono font-bold text-primary">{curH} br</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="25"
                          step="0.5"
                          value={curH}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            handleResize(curW, val);
                          }}
                          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* AÇI ÖZELLİKLERİ */}
          {selectedObject.type === 'angle' && (() => {
            const ang = selectedObject as AngleObject;
            const p1 = objects.find((o) => o.id === ang.point1Id) as PointObject;
            const vertex = objects.find((o) => o.id === ang.vertexPointId) as PointObject;
            const p3 = objects.find((o) => o.id === ang.point3Id) as PointObject;
            const deg = p1 && vertex && p3 ? calculateAngleDegrees(p1, vertex, p3) : 0;

            return (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/40">
                  <div className="text-muted-foreground font-medium">Açı Ölçüsü:</div>
                  <div className="font-mono text-sm font-bold text-foreground">
                    {formatTurkishNumber(deg)}° ({Math.round(deg)} derece)
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Renk Seçimi */}
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <label className="text-[11px] font-semibold text-muted-foreground">Renk</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_PRESETS.map((col) => (
                <button
                  key={col}
                  onClick={() => updateObject(selectedObject.id, { color: col })}
                  className="w-5 h-5 rounded-full border border-black/10 flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: col }}
                >
                  {selectedObject.color === col && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground text-center py-2 border-b border-border pb-4">
          Özelliklerini görüntülemek ve düzenlemek için tuvaldeki bir nesneye tıklayın.
        </div>
      )}

      {/* 2. DİNAMİK KAYDIRICILAR (Varsa) */}
      {sliders.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <span>Parametre Kaydırıcıları</span>
          </div>

          <div className="space-y-3">
            {sliders.map((s) => (
              <div key={s.id} className="p-3 bg-muted/40 rounded-xl border border-border/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground">{s.variableName} =</span>
                  <span className="font-mono text-primary font-bold">{formatTurkishNumber(s.value)}</span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={s.value}
                  onChange={(e) => handleSliderChange(s.id, parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{s.min}</span>
                  <span>{s.max}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. GÖRÜNÜM VE IZGARA AYARLARI */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase tracking-wider">
          <Settings className="w-3.5 h-3.5 text-primary" />
          <span>Görünüm & Koordinat Ayarları</span>
        </div>

        <div className="space-y-2 text-xs">
          <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 cursor-pointer transition-colors shadow-2xs">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-foreground font-bold">Izgara Çizgileri</span>
            </div>
            <input
              type="checkbox"
              checked={viewport.showGrid}
              onChange={(e) => setViewport((prev) => ({ ...prev, showGrid: e.target.checked }))}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 cursor-pointer transition-colors shadow-2xs">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-foreground font-bold">Koordinat Eksenleri (x, y)</span>
            </div>
            <input
              type="checkbox"
              checked={viewport.showAxes}
              onChange={(e) => setViewport((prev) => ({ ...prev, showAxes: e.target.checked }))}
              className="w-4 h-4 accent-cyan-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 cursor-pointer transition-colors shadow-2xs">
            <div className="flex items-center gap-2">
              <Maximize className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-foreground font-bold">Nokta Koordinatları</span>
            </div>
            <input
              type="checkbox"
              checked={viewport.showCoordinates}
              onChange={(e) =>
                setViewport((prev) => ({ ...prev, showCoordinates: e.target.checked }))
              }
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 cursor-pointer transition-colors shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-sm">🧲</span>
              <span className="text-foreground font-bold">Izgaraya Yapış (Snap)</span>
            </div>
            <input
              type="checkbox"
              checked={viewport.snapToGrid}
              onChange={(e) => setViewport((prev) => ({ ...prev, snapToGrid: e.target.checked }))}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
