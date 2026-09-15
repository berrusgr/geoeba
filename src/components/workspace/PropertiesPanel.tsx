'use client';

import React, { useState } from 'react';
import { exportPng, exportSvg, exportPdf, exportWord } from '@/utils/exportCanvas';
import { StylePanel } from '@/components/workspace/StylePanel';
import { useWorkspace } from '@/state/WorkspaceContext';
import {
  PointObject,
  SegmentObject,
  LineObject,
  CircleObject,
  AngleObject,
  PolygonObject,
  SliderObject,
  FractionObject,
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
  Sliders,
  Grid,
  Maximize,
  Maximize2,
  Compass,
  Check,
  Download,
  LayoutGrid,
  Columns2,
  Box,
} from 'lucide-react';

export type LayoutMode = 'default' | 'algebra_2d' | '2d_3d' | 'three_col' | 'algebra_3d' | '2d_only' | '3d_only';

interface PropertiesPanelProps {
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
}

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

export function PropertiesPanel({ layoutMode = '2d_only', onLayoutModeChange }: PropertiesPanelProps) {
  /** Sağ panel sekmesi: nesne/görünüm özellikleri mi, çizim stili mi? */
  const [sekme, setSekme] = useState<'ozellikler' | 'stil'>('ozellikler');
  const [disaAktariliyor, setDisaAktariliyor] = useState<'png' | 'svg' | 'pdf' | 'word' | null>(null);
  const [disaAktarimHatasi, setDisaAktarimHatasi] = useState<string | null>(null);
  const {
    objects,
    selectedObjectId,
    viewport,
    updateObject,
    deleteObject,
    setViewport,
    handleSliderChange,
    recordHistory,
  } = useWorkspace();

  const selectedObject = objects.find((o) => o.id === selectedObjectId);
  const sliders = objects.filter((o) => o.type === 'slider') as SliderObject[];

  /**
   * Süren düzenlemelerin (sürgü sürükleme, etiket yazma) başlangıç durumunu tutar.
   * Anahtar -> düzenleme başlamadan önceki değerin metin özeti.
   * Böylece her tuş vuruşu / her sürgü adımı yerine, işlem bittiğinde
   * (bırakma, odak kaybı, Enter) TEK bir geçmiş adımı yazılır.
   */
  const pendingEditsRef = React.useRef<Record<string, string>>({});

  // Düzenleme başlat: yalnızca ilk değişiklikte önceki durumu kaydeder.
  const beginEdit = React.useCallback((key: string, snapshotBefore: string) => {
    if (pendingEditsRef.current[key] === undefined) {
      pendingEditsRef.current[key] = snapshotBefore;
    }
  }, []);

  // Düzenlemeyi bitir: gerçekten bir değişiklik olduysa tek bir geçmiş adımı yazar.
  const finishEdit = React.useCallback(
    (key: string, snapshotNow: string, description: string) => {
      const snapshotBefore = pendingEditsRef.current[key];
      if (snapshotBefore === undefined) return;
      delete pendingEditsRef.current[key];
      if (snapshotBefore !== snapshotNow) {
        recordHistory(description);
      }
    },
    [recordHistory]
  );

  /**
   * Range (sürgü) girişleri için bırakma olayları.
   * Fare + dokunma (onPointerUp), klavye ok tuşları (onKeyUp) ve
   * odak kaybı (onBlur) üçlüsü birlikte tüm etkileşim yollarını kapsar.
   */
  const sliderReleaseHandlers = React.useCallback(
    (key: string, snapshotNow: () => string, description: () => string) => {
      const finish = () => finishEdit(key, snapshotNow(), description());
      return { onPointerUp: finish, onKeyUp: finish, onBlur: finish };
    },
    [finishEdit]
  );

  // Seçim değişince yarım kalan düzenleme kayıtlarını temizle.
  React.useEffect(() => {
    pendingEditsRef.current = {};
  }, [selectedObjectId]);

  /** Tuvalin SVG düğümünü bulur (ekrandaki en geniş SVG çizim alanıdır). */
  const tuvaliBul = (): SVGSVGElement | null => {
    const hepsi = Array.from(document.querySelectorAll('svg'));
    if (hepsi.length === 0) return null;
    return hepsi.reduce((enGenis, cur) =>
      cur.getBoundingClientRect().width > enGenis.getBoundingClientRect().width ? cur : enGenis
    ) as SVGSVGElement;
  };

  const disaAktar = async (bicim: 'png' | 'svg' | 'pdf' | 'word') => {
    const svg = tuvaliBul();
    if (!svg) {
      setDisaAktarimHatasi('Çizim alanı bulunamadı.');
      return;
    }
    setDisaAktariliyor(bicim);
    setDisaAktarimHatasi(null);
    try {
      const baslik = 'GeoEBA Çizimi';
      if (bicim === 'png') await exportPng(svg, baslik);
      else if (bicim === 'svg') exportSvg(svg, baslik);
      else if (bicim === 'pdf') await exportPdf(svg, baslik);
      else await exportWord(svg, baslik);
    } catch (e) {
      // Sebebi göstermek şart: "başarısız oldu" tek başına ne kullanıcıya ne de
      // hata bildirimine yarıyor.
      const sebep = e instanceof Error ? e.message : String(e);
      setDisaAktarimHatasi(`Dışa aktarma başarısız: ${sebep}`);
      if (process.env.NODE_ENV !== 'production') console.error('Dışa aktarma hatası:', e);
    } finally {
      setDisaAktariliyor(null);
    }
  };

  const disaAktarimDugmeleri: { id: 'png' | 'svg' | 'pdf' | 'word'; etiket: string; ipucu: string; renk: string }[] = [
    { id: 'png', etiket: 'Görsel (PNG)', ipucu: 'Çizimi resim dosyası olarak indir', renk: 'text-sky-600 dark:text-sky-400' },
    { id: 'svg', etiket: 'Vektör (SVG)', ipucu: 'Kalitesi bozulmadan büyütülebilen vektör dosyası', renk: 'text-violet-600 dark:text-violet-400' },
    { id: 'pdf', etiket: 'PDF', ipucu: 'Yazdırmaya hazır PDF belgesi', renk: 'text-rose-600 dark:text-rose-400' },
    { id: 'word', etiket: 'Word (.doc)', ipucu: 'Word ile açılıp düzenlenebilen belge', renk: 'text-blue-700 dark:text-blue-400' },
  ];

  return (
    <div className="w-full lg:w-72 bg-card border-t lg:border-t-0 lg:border-l border-border p-4 space-y-6 overflow-y-auto shrink-0 h-full min-h-0 select-none">
      {/* SEKME ÇUBUĞU */}
      <div role="tablist" aria-label="Sağ panel sekmeleri" className="flex gap-1 p-1 rounded-2xl bg-muted/60 border border-border/70">
        {([
          { id: 'ozellikler' as const, ad: 'Özellikler' },
          { id: 'stil' as const, ad: 'Stil' },
        ]).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={sekme === t.id}
            onClick={() => setSekme(t.id)}
            className={`flex-1 px-3 py-1.5 rounded-xl text-[11px] font-black transition-colors cursor-pointer ${
              sekme === t.id
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.ad}
          </button>
        ))}
      </div>

      {sekme === 'stil' && <StylePanel />}

      {sekme === 'ozellikler' && (
        <div className="space-y-6">
          {/* GÖRÜNÜM DÜZENİ SEÇİCİ */}
          {onLayoutModeChange && (
            <div className="space-y-2.5 p-3 rounded-2xl bg-muted/40 border border-border/70">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                  <span>Görünüm Düzeni</span>
                </h3>
                <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                  {layoutMode === '2d_only'
                    ? '2D Grafik'
                    : layoutMode === '3d_only'
                    ? '3D Grafik'
                    : layoutMode === 'default'
                    ? 'Çoklu Görünüm'
                    : layoutMode === 'algebra_2d'
                    ? 'Cebir + 2D'
                    : layoutMode === '2d_3d'
                    ? '2D + 3D'
                    : layoutMode === 'three_col'
                    ? '3 Sütun'
                    : 'Cebir + 3D'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => onLayoutModeChange('2d_only')}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    layoutMode === '2d_only'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] truncate">Sadece 2D</span>
                </button>

                <button
                  type="button"
                  onClick={() => onLayoutModeChange('default')}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    layoutMode === 'default'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] truncate">2D + Cebir/3D</span>
                </button>

                <button
                  type="button"
                  onClick={() => onLayoutModeChange('algebra_2d')}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    layoutMode === 'algebra_2d'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] truncate">Cebir + 2D</span>
                </button>

                <button
                  type="button"
                  onClick={() => onLayoutModeChange('2d_3d')}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    layoutMode === '2d_3d'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                  <span className="text-[11px] truncate">2D + 3D</span>
                </button>

                <button
                  type="button"
                  onClick={() => onLayoutModeChange('three_col')}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    layoutMode === 'three_col'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] truncate">3 Sütun</span>
                </button>

                <button
                  type="button"
                  onClick={() => onLayoutModeChange('algebra_3d')}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    layoutMode === 'algebra_3d'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                  <span className="text-[11px] truncate">Cebir + 3D</span>
                </button>

                <button
                  type="button"
                  onClick={() => onLayoutModeChange('3d_only')}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer col-span-2 ${
                    layoutMode === '3d_only'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                  }`}
                >
                  <Box className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                  <span className="text-[11px] truncate">Sadece 3D Grafik</span>
                </button>
              </div>
            </div>
          )}

          {/* 0. ÇİZİMİ DIŞA AKTAR */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>Çizimi İndir</span>
            </h3>

        {/* Siyah–beyaz mod: ekranda ne görünüyorsa indirilen dosya da öyle olur */}
        <label className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-muted/40 border border-border/60 cursor-pointer">
          <input
            type="checkbox"
            checked={viewport.blackWhite === true}
            onChange={(e) => setViewport((prev) => ({ ...prev, blackWhite: e.target.checked }))}
            className="w-3.5 h-3.5 accent-slate-600 cursor-pointer"
          />
          <span className="text-[11px] font-bold text-foreground">Siyah–beyaz mod</span>
        </label>
        <p className="text-[10px] text-muted-foreground leading-snug px-1">
          {viewport.blackWhite
            ? 'Çizim gri tonlamada; indirilen PNG, SVG, PDF ve Word dosyaları da siyah–beyaz olacak.'
            : 'Açarsanız hem tuval hem de indirilen dosyalar renksiz (baskıya uygun) olur.'}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {disaAktarimDugmeleri.map((d) => (
            <button
              key={d.id}
              onClick={() => disaAktar(d.id)}
              disabled={disaAktariliyor !== null}
              title={d.ipucu}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-border/70 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${d.renk}`}
            >
              {disaAktariliyor === d.id ? (
                <span className="text-[10px] font-semibold text-muted-foreground">Hazırlanıyor…</span>
              ) : (
                <span className="truncate">{d.etiket}</span>
              )}
            </button>
          ))}
        </div>
        {disaAktarimHatasi && (
          <p role="alert" className="text-[11px] text-destructive font-semibold">
            {disaAktarimHatasi}
          </p>
        )}
      </div>

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
                  onChange={(e) => {
                    // Yazarken geçmişe yazma; düzenleme öncesi etiketi bir kez sakla.
                    beginEdit(`label-${selectedObject.id}`, selectedObject.label);
                    updateObject(selectedObject.id, { label: e.target.value }, false);
                  }}
                  onBlur={() =>
                    finishEdit(
                      `label-${selectedObject.id}`,
                      selectedObject.label,
                      'Etiket güncellendi'
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      finishEdit(
                        `label-${selectedObject.id}`,
                        selectedObject.label,
                        'Etiket güncellendi'
                      );
                    }
                  }}
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
                        // Sürükleme boyunca geçmişe yazma; bırakınca tek adım kaydedilir.
                        beginEdit(`circle-radius-${circ.id}`, String(radius));
                        if (circ.fixedRadius !== undefined) {
                          updateObject(circ.id, { fixedRadius: val }, false);
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
                          updateObject(circ.id, { fixedRadius: val }, false);
                        }
                      }}
                      {...sliderReleaseHandlers(
                        `circle-radius-${circ.id}`,
                        () => String(radius),
                        () => `Yarıçap ${formatTurkishNumber(radius)} br olarak ayarlandı`
                      )}
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

            const resizeKey = `polygon-size-${poly.id}`;
            const sizeSnapshot = () => `${curW}x${curH}`;

            const handleResize = (newW: number, newH: number) => {
              // Sürükleme boyunca geçmişe yazma; bırakınca tek adım kaydedilir.
              beginEdit(resizeKey, sizeSnapshot());
              const scaleX = newW / curW;
              const scaleY = newH / curH;
              polyPoints.forEach((p) => {
                const nx = Number((cx + (p.x - cx) * scaleX).toFixed(2));
                const ny = Number((cy + (p.y - cy) * scaleY).toFixed(2));
                updateObject(p.id, { x: nx, y: ny }, false);
              });
            };

            const isSquare = Math.abs(curW - curH) < 0.2 && polyPoints.length === 4;

            const resizeRelease = (description: () => string) =>
              sliderReleaseHandlers(resizeKey, sizeSnapshot, description);

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
                    <span className="text-[10px] text-muted-foreground font-mono">{formatTurkishNumber(curW)} x {formatTurkishNumber(curH)} br</span>
                  </div>

                  {isSquare ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-semibold">Kenar Uzunluğu:</span>
                        <span className="font-mono font-bold text-primary">{formatTurkishNumber(curW)} br</span>
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
                        {...resizeRelease(
                          () => `Kenar uzunluğu ${formatTurkishNumber(curW)} br olarak ayarlandı`
                        )}
                        className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground font-semibold">Genişlik (En):</span>
                          <span className="font-mono font-bold text-primary">{formatTurkishNumber(curW)} br</span>
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
                          {...resizeRelease(
                            () =>
                              `Şekil ${formatTurkishNumber(curW)} x ${formatTurkishNumber(curH)} br olarak boyutlandırıldı`
                          )}
                          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground font-semibold">Yükseklik (Boy):</span>
                          <span className="font-mono font-bold text-primary">{formatTurkishNumber(curH)} br</span>
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
                          {...resizeRelease(
                            () =>
                              `Şekil ${formatTurkishNumber(curW)} x ${formatTurkishNumber(curH)} br olarak boyutlandırıldı`
                          )}
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

          {/* KESİR MODELİ ÖZELLİKLERİ */}
          {selectedObject.type === 'fraction' && (() => {
            const frac = selectedObject as FractionObject;
            const num = frac.numerator ?? 1;
            const den = frac.denominator ?? 1;
            const decimalVal = den > 0 ? formatTurkishNumber(num / den, 2) : '0';
            const percentVal = den > 0 ? Math.round((num / den) * 100) : 0;

            const getFracType = () => {
              if (num === 1 && den > 1) return 'Birim Kesir';
              if (num < den) return 'Basit Kesir';
              if (num === den) return 'Tam Kesir (1 Tam)';
              return 'Bileşik Kesir';
            };

            const fractionKey = `fraction-${frac.id}`;
            const fractionSnapshot = () => `${num}/${den}`;

            /**
             * record=true: -/+ düğmeleri ve şablonlar gibi ayrık işlemler (her tık bir geçmiş adımı).
             * record=false: sürgü sürüklemesi - bırakıldığında tek bir adım yazılır.
             */
            const updateFraction = (newNum: number, newDen: number, record: boolean = true) => {
              const clampedNum = Math.max(0, Math.min(30, newNum));
              const clampedDen = Math.max(1, Math.min(30, newDen));
              updateObject(
                frac.id,
                {
                  numerator: clampedNum,
                  denominator: clampedDen,
                  label: `${clampedNum}/${clampedDen} Kesir Modeli`,
                },
                record
              );
            };

            const fractionRelease = sliderReleaseHandlers(
              fractionKey,
              fractionSnapshot,
              () => `${num}/${den} kesrine güncellendi`
            );

            return (
              <div className="space-y-4 text-xs">
                {/* Kesir Kartı ve Matematiksel Değerler */}
                <div className="p-3.5 bg-violet-500/10 dark:bg-violet-950/20 rounded-2xl border border-violet-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    {/* Görsel Kesir Çizgisi */}
                    <div className="flex flex-col items-center justify-center font-mono font-black text-lg text-violet-700 dark:text-violet-300 leading-tight">
                      <span>{num}</span>
                      <div className="w-8 h-0.5 bg-violet-700 dark:bg-violet-300 my-0.5 rounded-full" />
                      <span>{den}</span>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="font-bold text-xs text-foreground">
                        = {decimalVal} <span className="text-muted-foreground font-normal">({percentVal}%)</span>
                      </div>
                      <div className="inline-block px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[10px] font-bold">
                        {getFracType()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pay ve Payda Sürgüleri */}
                <div className="p-3 bg-muted/40 rounded-2xl space-y-4 border border-border/50">
                  {/* PAY SÜRGÜSÜ */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-foreground">Pay (Taranan Parça):</span>
                      <span className="font-mono font-black text-violet-600 dark:text-violet-400 text-sm">
                        {num}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateFraction(num - 1, den)}
                        className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center font-black hover:bg-muted cursor-pointer transition-colors shadow-sm"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(den, 20)}
                        step="1"
                        value={num}
                        onChange={(e) => {
                          beginEdit(fractionKey, fractionSnapshot());
                          updateFraction(parseInt(e.target.value) || 0, den, false);
                        }}
                        {...fractionRelease}
                        className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-violet-600"
                      />
                      <button
                        onClick={() => updateFraction(num + 1, den)}
                        className="w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center font-black cursor-pointer transition-colors shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* PAYDA SÜRGÜSÜ */}
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-foreground">Payda (Toplam Parça):</span>
                      <span className="font-mono font-black text-violet-600 dark:text-violet-400 text-sm">
                        {den}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateFraction(num, den - 1)}
                        className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center font-black hover:bg-muted cursor-pointer transition-colors shadow-sm"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="1"
                        max="24"
                        step="1"
                        value={den}
                        onChange={(e) => {
                          beginEdit(fractionKey, fractionSnapshot());
                          updateFraction(num, parseInt(e.target.value) || 1, false);
                        }}
                        {...fractionRelease}
                        className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-violet-600"
                      />
                      <button
                        onClick={() => updateFraction(num, den + 1)}
                        className="w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center font-black cursor-pointer transition-colors shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sık Kullanılan Kesir Şablonları */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Hızlı Kesir Şablonları
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { n: 1, d: 1 },
                      { n: 1, d: 2 },
                      { n: 1, d: 3 },
                      { n: 2, d: 3 },
                      { n: 1, d: 4 },
                      { n: 3, d: 4 },
                      { n: 2, d: 5 },
                      { n: 5, d: 8 },
                    ].map((item) => (
                      <button
                        key={`preset-${item.n}-${item.d}`}
                        onClick={() => updateFraction(item.n, item.d)}
                        className={`py-1 px-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          num === item.n && den === item.d
                            ? 'bg-violet-600 text-white border-violet-700 shadow-sm'
                            : 'bg-muted/60 hover:bg-muted text-foreground border-border/80'
                        }`}
                      >
                        {item.n}/{item.d}
                      </button>
                    ))}
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
                  onChange={(e) => {
                    // Sürükleme boyunca geçmişe yazma; bırakınca tek adım kaydedilir.
                    beginEdit(`slider-${s.id}`, String(s.value));
                    handleSliderChange(s.id, parseFloat(e.target.value));
                  }}
                  {...sliderReleaseHandlers(
                    `slider-${s.id}`,
                    () => String(s.value),
                    () => `${s.variableName} = ${formatTurkishNumber(s.value)} olarak değiştirildi`
                  )}
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
          <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 cursor-pointer transition-colors shadow-sm">
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

          <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 cursor-pointer transition-colors shadow-sm">
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

          <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 cursor-pointer transition-colors shadow-sm">
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

          <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 cursor-pointer transition-colors shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/20">I-IV</span>
              <span className="text-foreground font-bold">Bölge İsimleri (1, 2, 3, 4. Bölge)</span>
            </div>
            <input
              type="checkbox"
              checked={viewport.showQuadrants ?? false}
              onChange={(e) =>
                setViewport((prev) => ({ ...prev, showQuadrants: e.target.checked }))
              }
              className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 cursor-pointer transition-colors shadow-sm">
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
      )}
    </div>
  );
}
