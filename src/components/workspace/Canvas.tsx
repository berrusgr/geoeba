'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useCurriculum } from '@/state/CurriculumContext';
import {
  PointObject,
  SegmentObject,
  LineObject,
  RayObject,
  CircleObject,
  AngleObject,
  PolygonObject,
  FunctionObject,
  SliderObject,
  FractionObject,
  PenStrokeObject,
  TextObject,
  ImageObject,
  Point2D,
} from '@/types/math';
import {
  worldToScreen,
  screenToWorld,
  getVisibleWorldBounds,
  getAdaptiveGridStep,
  formatTurkishNumber,
  formatCoordinate,
} from '@/math/coordinates';
import {
  calculateDistance,
  calculateMidpoint,
  calculateAngleDegrees,
  calculatePolygonArea,
  calculateLineEquation,
  calculateCircleArea,
  calculateCircleCircumference,
} from '@/math/geometry';
import { compileMathExpression } from '@/math/parser';
import {
  Plus,
  Minus,
  Focus,
  Grid,
  Magnet,
  RotateCcw,
  RotateCw,
  Hand,
  Home,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  FileEdit,
  Trash2,
  Settings,
  Check,
  Shapes,
  ChevronDown,
} from 'lucide-react';

interface CanvasProps {
  onSwitchTo3D?: () => void;
}

export function Canvas({ onSwitchTo3D }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { selectedLevel, selectedGrade, isFreeSandbox, selectedActivity } = useCurriculum();
  const isPrimary = selectedLevel?.id === 'ilkokul' || (selectedGrade && selectedGrade.gradeNumber <= 4);
  const showQuadrants = !isPrimary && (selectedGrade ? selectedGrade.gradeNumber >= 7 : true);

  const {
    objects,
    selectedObjectId,
    activeTool,
    setActiveTool,
    viewport,
    pendingPointIds,
    setViewport,
    setSelectedObjectId,
    handlePointClick,
    handleCanvasClick,
    handlePointDrag,
    deleteObject,
    addObject,
    studioDimension,
    setStudioDimension,
    undo,
    redo,
    canUndo,
    canRedo,
    cancelPendingAction,
  } = useWorkspace();

  // Sürükleme ve Kaydırma (Pan/Drag) Durumları
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState<Point2D>({ x: 0, y: 0 });
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Sürükleyerek Şekil Boyutlandırma ve Oluşturma Durumu
  const [dragCreateStart, setDragCreateStart] = useState<Point2D | null>(null);
  const [dragCreateCurrent, setDragCreateCurrent] = useState<Point2D | null>(null);

  // Serbest Çizim (Kalem) Durumu
  const [isDrawingPen, setIsDrawingPen] = useState(false);
  const [currentPenStroke, setCurrentPenStroke] = useState<Point2D[]>([]);

  // 2D Üst Seçenekler (Referans Görsel: Geometri / Dik Koordinat / Sade)
  const [activeDomain, setActiveDomain] = useState<'Geometri' | 'Analitik' | 'Cebir' | 'Serbest'>('Geometri');
  const [planeType, setPlaneType] = useState<'dik_koordinat' | 'kareli_duzlem' | 'bos_duzlem'>('dik_koordinat');
  const [styleMode, setStyleMode] = useState<'Sade' | 'Ayrıntılı'>('Sade');
  const [openDropdown, setOpenDropdown] = useState<'domain' | 'plane' | 'style' | null>(null);

  // Ekran boyutu senkronizasyonu
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewport((prev) => {
          if (prev.width === rect.width && prev.height === rect.height) return prev;
          return {
            ...prev,
            width: rect.width,
            height: rect.height,
          };
        });
      }
    };

    updateSize();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setViewport((prev) => {
            if (prev.width === width && prev.height === height) return prev;
            return {
              ...prev,
              width,
              height,
            };
          });
        }
      }
    });

    observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [setViewport]);

  // Aktif Kaydırıcı Değişkenleri Haritası (Fonksiyon grafikleri için)
  const sliderScope = useMemo(() => {
    const scope: Record<string, number> = {};
    for (const obj of objects) {
      if (obj.type === 'slider') {
        const s = obj as SliderObject;
        scope[s.variableName] = s.value;
      }
    }
    return scope;
  }, [objects]);

  // Tuvali sayfanın tam ortasında (0, 0) büyük ve dengeli + haç şeklinde başlat
  useEffect(() => {
    if (selectedActivity?.initialViewport) {
      setViewport((prev) => ({
        ...prev,
        ...selectedActivity.initialViewport,
      }));
    } else {
      setViewport((prev) => ({
        ...prev,
        panX: 0,
        panY: 0,
        zoom: 42,
      }));
    }
  }, [isFreeSandbox, selectedActivity, setViewport]);

  // Görünür dünya sınırları ve ızgara çizgileri
  const worldBounds = useMemo(() => getVisibleWorldBounds(viewport), [viewport]);
  const gridInfo = useMemo(() => getAdaptiveGridStep(viewport.zoom), [viewport.zoom]);

  // Izgara çizgilerini ve eksen çentiklerini hesapla (Tam Ekran Kapsamı)
  const gridLines = useMemo(() => {
    if (!viewport.showGrid && !viewport.showAxes) return { xLines: [], yLines: [] };

    const { minX, maxX, minY, maxY } = worldBounds;
    const step = gridInfo.step;
    const buffer = step * 16; // Genişletilmiş sınır ile tüm yönlerde (özellikle -Y yönünde) tam ekran kapsar

    const startX = Math.floor((minX - buffer) / step) * step;
    const endX = Math.ceil((maxX + buffer) / step) * step;
    const startY = Math.floor((minY - buffer) / step) * step;
    const endY = Math.ceil((maxY + buffer) / step) * step;

    const xLines: number[] = [];
    for (let x = startX; x <= endX; x += step) {
      xLines.push(Number(x.toFixed(4)));
    }

    const yLines: number[] = [];
    for (let y = startY; y <= endY; y += step) {
      yLines.push(Number(y.toFixed(4)));
    }

    return { xLines, yLines };
  }, [worldBounds, gridInfo.step, viewport.showGrid, viewport.showAxes]);

  // Fare Koordinatını Güncelleme
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const world = screenToWorld({ x: screenX, y: screenY }, viewport);
    setMouseWorldPos(world);

    if (isDrawingPen) {
      setCurrentPenStroke((prev) => [...prev, world]);
      return;
    }

    if (dragCreateStart) {
      setDragCreateCurrent(world);
      return;
    }

    if (draggingPointId) {
      handlePointDrag(draggingPointId, world);
    } else if (isPanning) {
      const dx = screenX - panStart.x;
      const dy = screenY - panStart.y;
      setViewport((prev) => ({
        ...prev,
        panX: prev.panX + dx,
        panY: prev.panY + dy,
      }));
      setPanStart({ x: screenX, y: screenY });
    }
  };

  // Fare Tekerleği ile Yakınlaştırma (Passive: false ile tarayıcı hatasını önleme)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorScreenX = e.clientX - rect.left;
      const cursorScreenY = e.clientY - rect.top;

      // Yakınlaştırma katsayısı
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;

      setViewport((prev) => {
        const newZoom = Math.max(5, Math.min(300, prev.zoom * zoomFactor));
        // Fare imlecinin altındaki dünya koordinatını sabit tut
        const worldAtCursor = screenToWorld({ x: cursorScreenX, y: cursorScreenY }, prev);

        const targetPanX = cursorScreenX - prev.width / 2 - worldAtCursor.x * newZoom;
        const targetPanY = cursorScreenY - prev.height / 2 + worldAtCursor.y * newZoom;

        return {
          ...prev,
          zoom: newZoom,
          panX: targetPanX,
          panY: targetPanY,
        };
      });
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, [setViewport]);

  // Tuvale Basıldığında
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld({ x: screenX, y: screenY }, viewport);

    if (activeTool === 'pen') {
      setIsDrawingPen(true);
      setCurrentPenStroke([world]);
      return;
    }

    if (['square', 'rectangle', 'circle', 'segment'].includes(activeTool)) {
      setDragCreateStart(world);
      setDragCreateCurrent(world);
      return;
    }

    if (e.button === 1 || e.altKey || activeTool === 'pan') {
      // Orta tuş veya Pan aracı ile kaydırma
      setIsPanning(true);
      setPanStart({ x: screenX, y: screenY });
      return;
    }

    if (e.target === svgRef.current || (e.target as HTMLElement).id === 'grid-background') {
      if (activeTool === 'select') {
        // Tuval boşluğuna tıklandıysa kaydırma başlat
        setIsPanning(true);
        setPanStart({ x: screenX, y: screenY });
        handleCanvasClick(world);
      } else {
        handleCanvasClick(world);
      }
    }
  };

  // Fare Bırakıldığında
  const handleMouseUp = () => {
    if (isDrawingPen) {
      if (currentPenStroke.length > 1) {
        const newStroke: PenStrokeObject = {
          id: `pen-${Date.now()}`,
          type: 'pen',
          label: 'Serbest Çizim',
          showLabel: false,
          points: currentPenStroke,
          thickness: 3,
          color: '#e11d48',
          visible: true,
          createdAt: Date.now(),
        };
        addObject(newStroke, 'Serbest çizim eklendi');
      }
      setIsDrawingPen(false);
      setCurrentPenStroke([]);
    }

    if (dragCreateStart) {
      const endWorld = dragCreateCurrent || dragCreateStart;
      const dx = Math.abs(endWorld.x - dragCreateStart.x);
      const dy = Math.abs(endWorld.y - dragCreateStart.y);
      const dist = Math.hypot(dx, dy);

      if (dist < 0.4) {
        // Tıklamayla standart boyutlu oluştur
        handleCanvasClick(dragCreateStart);
      } else {
        const x1 = Math.min(dragCreateStart.x, endWorld.x);
        const y1 = Math.min(dragCreateStart.y, endWorld.y);
        const x2 = Math.max(dragCreateStart.x, endWorld.x);
        const y2 = Math.max(dragCreateStart.y, endWorld.y);

        if (activeTool === 'square') {
          const side = Number(Math.max(dx, dy).toFixed(1));
          const sx2 = x1 + side;
          const sy2 = y1 + side;

          const p1: PointObject = { id: `pt-${Date.now()}`, type: 'point', label: 'A', showLabel: true, x: x1, y: y1, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() };
          const p2: PointObject = { id: `pt-${Date.now() + 1}`, type: 'point', label: 'B', showLabel: true, x: sx2, y: y1, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 1 };
          const p3: PointObject = { id: `pt-${Date.now() + 2}`, type: 'point', label: 'C', showLabel: true, x: sx2, y: sy2, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 2 };
          const p4: PointObject = { id: `pt-${Date.now() + 3}`, type: 'point', label: 'D', showLabel: true, x: x1, y: sy2, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 3 };

          const poly: PolygonObject = {
            id: `poly-${Date.now() + 4}`,
            type: 'polygon',
            label: `Kare (${side} br)`,
            showLabel: true,
            pointIds: [p1.id, p2.id, p3.id, p4.id],
            color: '#f43f5e',
            fillColor: '#f43f5e',
            fillOpacity: 0.18,
            visible: true,
            showArea: true,
            showPerimeter: true,
            createdAt: Date.now() + 4,
          };

          addObject(p1);
          addObject(p2);
          addObject(p3);
          addObject(p4);
          addObject(poly, 'Kare oluşturuldu');
        } else if (activeTool === 'rectangle') {
          const rw = Number(dx.toFixed(1));
          const rh = Number(dy.toFixed(1));
          const p1: PointObject = { id: `pt-${Date.now()}`, type: 'point', label: 'A', showLabel: true, x: x1, y: y1, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() };
          const p2: PointObject = { id: `pt-${Date.now() + 1}`, type: 'point', label: 'B', showLabel: true, x: x2, y: y1, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 1 };
          const p3: PointObject = { id: `pt-${Date.now() + 2}`, type: 'point', label: 'C', showLabel: true, x: x2, y: y2, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 2 };
          const p4: PointObject = { id: `pt-${Date.now() + 3}`, type: 'point', label: 'D', showLabel: true, x: x1, y: y2, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 3 };

          const poly: PolygonObject = {
            id: `poly-${Date.now() + 4}`,
            type: 'polygon',
            label: `Dikdörtgen (${rw}x${rh} br)`,
            showLabel: true,
            pointIds: [p1.id, p2.id, p3.id, p4.id],
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.18,
            visible: true,
            showArea: true,
            showPerimeter: true,
            createdAt: Date.now() + 4,
          };

          addObject(p1);
          addObject(p2);
          addObject(p3);
          addObject(p4);
          addObject(poly, 'Dikdörtgen oluşturuldu');
        } else if (activeTool === 'circle') {
          const radius = Number(dist.toFixed(1));
          const centerPt: PointObject = { id: `pt-${Date.now()}`, type: 'point', label: 'M', showLabel: true, x: dragCreateStart.x, y: dragCreateStart.y, color: '#8b5cf6', visible: true, isIndependent: true, createdAt: Date.now() };
          const circ: CircleObject = {
            id: `circ-${Date.now() + 1}`,
            type: 'circle',
            label: `Çember (r = ${radius} br)`,
            showLabel: true,
            centerPointId: centerPt.id,
            fixedRadius: radius,
            color: '#8b5cf6',
            visible: true,
            showArea: true,
            showPerimeter: true,
            fillOpacity: 0.1,
            createdAt: Date.now() + 1,
          };
          addObject(centerPt);
          addObject(circ, 'Çember oluşturuldu');
        } else if (activeTool === 'segment') {
          const p1: PointObject = { id: `pt-${Date.now()}`, type: 'point', label: 'A', showLabel: true, x: dragCreateStart.x, y: dragCreateStart.y, color: '#0284c7', visible: true, isIndependent: true, createdAt: Date.now() };
          const p2: PointObject = { id: `pt-${Date.now() + 1}`, type: 'point', label: 'B', showLabel: true, x: endWorld.x, y: endWorld.y, color: '#0284c7', visible: true, isIndependent: true, createdAt: Date.now() + 1 };
          const seg: SegmentObject = {
            id: `seg-${Date.now() + 2}`,
            type: 'segment',
            label: 'Doğru Parçası',
            showLabel: true,
            startPointId: p1.id,
            endPointId: p2.id,
            color: '#0284c7',
            visible: true,
            showLength: true,
            thickness: 2.5,
            createdAt: Date.now() + 2,
          };
          addObject(p1);
          addObject(p2);
          addObject(seg, 'Doğru Parçası oluşturuldu');
        }
      }
      setDragCreateStart(null);
      setDragCreateCurrent(null);
    }

    setIsPanning(false);
    setDraggingPointId(null);
  };

  // Nokta Sürükleme Başlat
  const handlePointMouseDown = (e: React.MouseEvent, point: PointObject) => {
    e.stopPropagation();

    if (activeTool === 'delete') {
      deleteObject(point.id);
      return;
    }

    if (activeTool === 'select') {
      setSelectedObjectId(point.id);
      if (point.isIndependent !== false) {
        setDraggingPointId(point.id);
      }
    } else {
      handlePointClick(point.id);
    }
  };

  // Zoom Hızlı Eylemleri
  const zoomIn = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(300, prev.zoom * 1.2),
    }));
  };

  const zoomOut = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(5, prev.zoom / 1.2),
    }));
  };

  const centerOrigin = () => {
    setViewport((prev) => ({
      ...prev,
      panX: 0,
      panY: 0,
      zoom: 44,
    }));
  };

  // Eksen Çizgileri ve Merkez
  const originScreen = useMemo(
    () => worldToScreen({ x: 0, y: 0 }, viewport),
    [viewport]
  );

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 min-h-0 h-full w-full bg-[#fdfbf7] dark:bg-[#14151a] overflow-hidden select-none cursor-crosshair"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 1. ÜST 2D / 3D DÜZLEM VE SEÇENEKLER ŞERİDİ (Referans Görsel Birebir) */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Sol Alan: 3 Seçenek Açılır Menü Hapları (Geometri / Dik koordinat sistemi / Sade) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* 1. Seçenek: Geometri */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'domain' ? null : 'domain')}
              className="flex items-center gap-1.5 p-1 pr-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-sm text-xs font-black text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <div className="w-6 h-6 rounded-xl bg-[#1e2337] dark:bg-slate-800 text-white flex items-center justify-center shadow-2xs">
                <Shapes className="w-3.5 h-3.5" />
              </div>
              <span>{activeDomain}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {openDropdown === 'domain' && (
              <div className="absolute left-0 top-11 w-44 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-30 space-y-1 text-xs">
                {(['Geometri', 'Analitik Geometri', 'Cebir & Grafikler', 'Serbest Çizim'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setActiveDomain(d as any);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      activeDomain === d
                        ? 'bg-[#2563eb] text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Seçenek: Dik koordinat sistemi / Kareli düzlem / Boş düzlem */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'plane' ? null : 'plane')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-teal-600/70 dark:border-teal-500/80 shadow-sm text-xs font-black text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <span>
                {planeType === 'dik_koordinat'
                  ? 'Dik koordinat sistemi'
                  : planeType === 'kareli_duzlem'
                  ? 'Kareli düzlem'
                  : 'Boş düzlem'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {openDropdown === 'plane' && (
              <div className="absolute left-0 top-11 w-52 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-30 space-y-1 text-xs">
                <button
                  onClick={() => {
                    setPlaneType('dik_koordinat');
                    setViewport((prev) => ({ ...prev, showGrid: true, showAxes: true, showCoordinates: true }));
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    planeType === 'dik_koordinat'
                      ? 'bg-[#2563eb] text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Dik koordinat sistemi
                </button>

                <button
                  onClick={() => {
                    setPlaneType('kareli_duzlem');
                    setViewport((prev) => ({ ...prev, showGrid: true, showAxes: false, showCoordinates: false }));
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    planeType === 'kareli_duzlem'
                      ? 'bg-[#2563eb] text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Kareli düzlem
                </button>

                <button
                  onClick={() => {
                    setPlaneType('bos_duzlem');
                    setViewport((prev) => ({ ...prev, showGrid: false, showAxes: false, showCoordinates: false }));
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    planeType === 'bos_duzlem'
                      ? 'bg-[#2563eb] text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Boş düzlem
                </button>
              </div>
            )}
          </div>

          {/* 3. Seçenek: Sade */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'style' ? null : 'style')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-sm text-xs font-black text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <span>{styleMode}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {openDropdown === 'style' && (
              <div className="absolute left-0 top-11 w-36 p-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-30 space-y-1 text-xs">
                {(['Sade', 'Ayrıntılı'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStyleMode(s);
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      styleMode === s
                        ? 'bg-[#2563eb] text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ Alan: 2D/3D Geçiş ve Ayarlar Butonu */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* 2D ve 3D DÜZLEM GEÇİŞ BUTONU */}
          <div className="flex items-center p-1 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-md">
            <button
              onClick={() => setStudioDimension('2D')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                studioDimension === '2D'
                  ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm dark:from-blue-600 dark:to-indigo-600'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>📐</span>
              <span>2D</span>
            </button>

            <button
              onClick={() => setStudioDimension('3D')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                studioDimension === '3D'
                  ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm dark:from-blue-600 dark:to-indigo-600'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>🧊</span>
              <span>3D</span>
            </button>
          </div>

          {/* Ayarlar Butonu */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              title="Çalışma Alanı Ayarları"
              className="p-2.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Ayarlar Açılır Menüsü */}
            {showSettingsMenu && (
              <div className="absolute right-0 top-12 w-56 p-2 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-2xl z-30 space-y-1 text-xs">
                <button
                  onClick={() => setViewport((prev) => ({ ...prev, showGrid: !prev.showGrid }))}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted font-bold text-foreground cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Grid className="w-3.5 h-3.5 text-primary" />
                    <span>Izgara Çizgileri</span>
                  </span>
                  {viewport.showGrid && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => setViewport((prev) => ({ ...prev, showAxes: !prev.showAxes }))}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted font-bold text-foreground cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-500">XY</span>
                    <span>Koordinat Eksenleri</span>
                  </span>
                  {viewport.showAxes && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => setViewport((prev) => ({ ...prev, showCoordinates: !prev.showCoordinates }))}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted font-bold text-foreground cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-500">(x,y)</span>
                    <span>Nokta Koordinatları</span>
                  </span>
                  {viewport.showCoordinates && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full block"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
      >
        {/* Arka Plan Yakalayıcı */}
        <rect
          id="grid-background"
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill="transparent"
        />

        {/* 1. IZGARA KATMANI (NET VE BELİRGİN GRAFİK KAĞIDI IZGARASI) */}
        {viewport.showGrid && (
          <g className="grid-lines select-none pointer-events-none">
            {gridLines.xLines.map((xVal) => {
              const p = worldToScreen({ x: xVal, y: 0 }, viewport);
              const isMainAxis = xVal === 0;
              const isMajor = Math.abs(xVal % 5) < 0.001;
              const isInteger = Math.abs(Math.round(xVal) - xVal) < 0.001;

              if (isMainAxis) return null; // Ana eksenler aşağıda ayrıca çiziliyor

              return (
                <line
                  key={`gx-${xVal}`}
                  x1={p.x}
                  y1={-1000}
                  x2={p.x}
                  y2={Math.max(viewport.height, 2000) + 1000}
                  className={
                    isMajor
                      ? 'stroke-slate-400/80 dark:stroke-slate-500/60'
                      : isInteger
                      ? 'stroke-slate-300/90 dark:stroke-slate-600/60'
                      : 'stroke-slate-200/90 dark:stroke-slate-700/50'
                  }
                  strokeWidth={isMajor ? 1.4 : isInteger ? 1.0 : 0.7}
                />
              );
            })}

            {gridLines.yLines.map((yVal) => {
              const p = worldToScreen({ x: 0, y: yVal }, viewport);
              const isMainAxis = yVal === 0;
              const isMajor = Math.abs(yVal % 5) < 0.001;
              const isInteger = Math.abs(Math.round(yVal) - yVal) < 0.001;

              if (isMainAxis) return null; // Ana eksenler aşağıda ayrıca çiziliyor

              return (
                <line
                  key={`gy-${yVal}`}
                  x1={-1000}
                  y1={p.y}
                  x2={Math.max(viewport.width, 3000) + 1000}
                  y2={p.y}
                  className={
                    isMajor
                      ? 'stroke-slate-400/80 dark:stroke-slate-500/60'
                      : isInteger
                      ? 'stroke-slate-300/90 dark:stroke-slate-600/60'
                      : 'stroke-slate-200/90 dark:stroke-slate-700/50'
                  }
                  strokeWidth={isMajor ? 1.4 : isInteger ? 1.0 : 0.7}
                />
              );
            })}
          </g>
        )}

        {/* 2. DÖRT BÖLGE (I, II, III, IV) SU İŞARETLERİ — SADECE 7+ VE LİSE İÇİN KÖŞELERDE */}
        {showQuadrants && viewport.showAxes && originScreen.x > 80 && originScreen.x < viewport.width - 80 && originScreen.y > 80 && originScreen.y < viewport.height - 80 && (
          <g className="quadrant-badges select-none pointer-events-none opacity-40 font-black text-xs">
            {/* I. Bölge (Sağ Üst: +, +) */}
            <g transform={`translate(${Math.min(viewport.width - 110, originScreen.x + 90)}, ${Math.max(25, originScreen.y - 70)})`}>
              <rect width="84" height="22" rx="8" fill="#10b981" fillOpacity="0.12" stroke="#10b981" strokeWidth="1" strokeDasharray="3,2" />
              <text x="42" y="15" textAnchor="middle" fill="#059669" className="font-bold text-[10px]">
                I. Bölge (+, +)
              </text>
            </g>
            {/* II. Bölge (Sol Üst: -, +) */}
            <g transform={`translate(${Math.max(20, originScreen.x - 170)}, ${Math.max(25, originScreen.y - 70)})`}>
              <rect width="84" height="22" rx="8" fill="#f59e0b" fillOpacity="0.12" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,2" />
              <text x="42" y="15" textAnchor="middle" fill="#d97706" className="font-bold text-[10px]">
                II. Bölge (-, +)
              </text>
            </g>
            {/* III. Bölge (Sol Alt: -, -) */}
            <g transform={`translate(${Math.max(20, originScreen.x - 170)}, ${Math.min(viewport.height - 40, originScreen.y + 55)})`}>
              <rect width="84" height="22" rx="8" fill="#8b5cf6" fillOpacity="0.12" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="3,2" />
              <text x="42" y="15" textAnchor="middle" fill="#7c3aed" className="font-bold text-[10px]">
                III. Bölge (-, -)
              </text>
            </g>
            {/* IV. Bölge (Sağ Alt: +, -) */}
            <g transform={`translate(${Math.min(viewport.width - 110, originScreen.x + 90)}, ${Math.min(viewport.height - 40, originScreen.y + 55)})`}>
              <rect width="84" height="22" rx="8" fill="#0284c7" fillOpacity="0.12" stroke="#0284c7" strokeWidth="1" strokeDasharray="3,2" />
              <text x="42" y="15" textAnchor="middle" fill="#0284c7" className="font-bold text-[10px]">
                IV. Bölge (+, -)
              </text>
            </g>
          </g>
        )}

        {/* 3. EKSENLER VE SAYISAL ÇENTİKLER KATMANI */}
        {viewport.showAxes && (
          <g className="axes text-muted-foreground font-mono text-[10px]">
            {/* X Ekseni */}
            {originScreen.y >= -1000 && originScreen.y <= Math.max(viewport.height, 2000) + 1000 && (
              <>
                <line
                  x1={-1000}
                  y1={originScreen.y}
                  x2={Math.max(viewport.width, 3000) + 1000}
                  y2={originScreen.y}
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                />
                {/* X Eksen Sağ Ok (+x) */}
                <polygon
                  points={`${viewport.width - 12},${originScreen.y - 6} ${viewport.width - 2},${originScreen.y} ${viewport.width - 12},${originScreen.y + 6}`}
                  fill="#3b82f6"
                />
                {/* X Eksen Sol Ok (-x) */}
                <polygon
                  points={`12,${originScreen.y - 6} 2,${originScreen.y} 12,${originScreen.y + 6}`}
                  fill="#3b82f6"
                />
                {/* X Eksen Etiketi */}
                <g transform={`translate(${viewport.width - 46}, ${Math.max(14, Math.min(viewport.height - 30, originScreen.y - 24))})`}>
                  <rect width="36" height="20" rx="6" fill="#3b82f6" className="shadow-xs" />
                  <text x="18" y="14" textAnchor="middle" fill="#ffffff" className="font-black text-[11px] font-sans">
                    +x
                  </text>
                </g>
              </>
            )}

            {/* Y Ekseni */}
            {originScreen.x >= -1000 && originScreen.x <= Math.max(viewport.width, 3000) + 1000 && (
              <>
                <line
                  x1={originScreen.x}
                  y1={-1000}
                  x2={originScreen.x}
                  y2={Math.max(viewport.height, 2000) + 1000}
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                />
                {/* Y Eksen Üst Ok (+y) */}
                <polygon
                  points={`${originScreen.x - 6},12 ${originScreen.x},2 ${originScreen.x + 6},12`}
                  fill="#06b6d4"
                />
                {/* Y Eksen Alt Ok (-y) — Aşağıya doğru tam genişleme */}
                <polygon
                  points={`${originScreen.x - 6},${viewport.height - 12} ${originScreen.x},${viewport.height - 2} ${originScreen.x + 6},${viewport.height - 12}`}
                  fill="#06b6d4"
                />
                {/* Y Eksen Üst Etiketi (+y) */}
                <g transform={`translate(${Math.max(10, Math.min(viewport.width - 46, originScreen.x + 10))}, 10)`}>
                  <rect width="36" height="20" rx="6" fill="#06b6d4" className="shadow-xs" />
                  <text x="18" y="14" textAnchor="middle" fill="#ffffff" className="font-black text-[11px] font-sans">
                    +y
                  </text>
                </g>
                {/* Y Eksen Alt Etiketi (-y) */}
                <g transform={`translate(${Math.max(10, Math.min(viewport.width - 46, originScreen.x + 10))}, ${viewport.height - 30})`}>
                  <rect width="36" height="20" rx="6" fill="#06b6d4" className="shadow-xs" />
                  <text x="18" y="14" textAnchor="middle" fill="#ffffff" className="font-black text-[11px] font-sans">
                    -y
                  </text>
                </g>
              </>
            )}

            {/* Sayısal Değerler (Çentikler) */}
            {gridLines.xLines.map((xVal) => {
              if (xVal === 0) return null;
              const p = worldToScreen({ x: xVal, y: 0 }, viewport);
              const clampedOriginY = Math.max(8, Math.min(viewport.height - 8, originScreen.y));
              const labelY = Math.max(16, Math.min(viewport.height - 8, originScreen.y + 14));
              return (
                <g key={`tx-${xVal}`}>
                  <line
                    x1={p.x}
                    y1={clampedOriginY - 3}
                    x2={p.x}
                    y2={clampedOriginY + 3}
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                  />
                  <text
                    x={p.x}
                    y={labelY}
                    textAnchor="middle"
                    className="fill-foreground/80 select-none font-bold text-[10px]"
                  >
                    {formatTurkishNumber(xVal)}
                  </text>
                </g>
              );
            })}

            {gridLines.yLines.map((yVal) => {
              if (yVal === 0) return null;
              const p = worldToScreen({ x: 0, y: yVal }, viewport);
              const clampedOriginX = Math.max(8, Math.min(viewport.width - 8, originScreen.x));
              const labelX = Math.max(8, Math.min(viewport.width - 24, originScreen.x - 8));
              return (
                <g key={`ty-${yVal}`}>
                  <line
                    x1={clampedOriginX - 3}
                    y1={p.y}
                    x2={clampedOriginX + 3}
                    y2={p.y}
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                  />
                  <text
                    x={labelX}
                    y={p.y + 3.5}
                    textAnchor="end"
                    className="fill-foreground/80 select-none font-bold text-[10px]"
                  >
                    {formatTurkishNumber(yVal)}
                  </text>
                </g>
              );
            })}

            {/* O (Orijin 0,0) Rozeti ve Odak Halkası */}
            {originScreen.x >= -30 && originScreen.x <= viewport.width + 30 && originScreen.y >= -30 && originScreen.y <= viewport.height + 30 && (
              <g transform={`translate(${originScreen.x}, ${originScreen.y})`}>
                <circle cx="0" cy="0" r="14" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,2" />
                <circle cx="0" cy="0" r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                <g transform="translate(8, 8)">
                  <rect width="48" height="20" rx="6" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.5" className="shadow-xs" />
                  <text x="24" y="14" textAnchor="middle" fill="#2563eb" className="font-mono font-black text-[10px]">
                    (0; 0)
                  </text>
                </g>
              </g>
            )}
          </g>
        )}

        {/* 3. FONKSİYON GRAFİKLERİ KATMANI */}
        {objects
          .filter((o) => o.type === 'function' && o.visible)
          .map((obj) => {
            const fn = obj as FunctionObject;
            const compiled = compileMathExpression(fn.expression);
            if (!compiled) return null;

            const pointsCount = Math.min(800, Math.max(200, Math.floor(viewport.width / 2)));
            const dx = (worldBounds.maxX - worldBounds.minX) / pointsCount;

            let pathD = '';
            let isDrawing = false;

            for (let i = 0; i <= pointsCount; i++) {
              const xVal = worldBounds.minX + i * dx;
              const yVal = compiled(xVal, sliderScope);

              if (isNaN(yVal) || !isFinite(yVal) || Math.abs(yVal) > 1000) {
                isDrawing = false;
                continue;
              }

              const sPoint = worldToScreen({ x: xVal, y: yVal }, viewport);

              if (!isDrawing) {
                pathD += `M ${sPoint.x} ${sPoint.y} `;
                isDrawing = true;
              } else {
                pathD += `L ${sPoint.x} ${sPoint.y} `;
              }
            }

            return (
              <g key={fn.id} className="function-plot">
                <path
                  d={pathD}
                  fill="none"
                  stroke={fn.color || '#2563eb'}
                  strokeWidth={fn.thickness || 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

        {/* 4. ÇOKGENLER KATMANI */}
        {objects
          .filter((o) => o.type === 'polygon' && o.visible)
          .map((obj) => {
            const poly = obj as PolygonObject;
            const polyPoints = poly.pointIds
              .map((id) => objects.find((o) => o.id === id) as PointObject)
              .filter(Boolean);

            if (polyPoints.length < 3) return null;

            const screenCoords = polyPoints.map((p) => worldToScreen(p, viewport));
            const pointsAttr = screenCoords.map((p) => `${p.x},${p.y}`).join(' ');

            // Alan ve Ağırlık Merkezi (Centroid)
            const area = calculatePolygonArea(polyPoints);
            const centroidScreen = {
              x: screenCoords.reduce((acc, p) => acc + p.x, 0) / screenCoords.length,
              y: screenCoords.reduce((acc, p) => acc + p.y, 0) / screenCoords.length,
            };

            const isSelected = selectedObjectId === poly.id;

            return (
              <g key={poly.id} onClick={() => setSelectedObjectId(poly.id)}>
                <polygon
                  points={pointsAttr}
                  fill={poly.fillColor || poly.color || '#10b981'}
                  fillOpacity={poly.fillOpacity || 0.15}
                  stroke={isSelected ? '#ec4899' : poly.color || '#10b981'}
                  strokeWidth={isSelected ? 3 : 2}
                  className="cursor-pointer transition-colors"
                />
                {poly.showArea && (
                  <text
                    x={centroidScreen.x}
                    y={centroidScreen.y}
                    textAnchor="middle"
                    className="fill-foreground font-bold text-xs pointer-events-none drop-shadow"
                  >
                    Alan = {formatTurkishNumber(area)} br²
                  </text>
                )}
              </g>
            );
          })}

        {/* 5. ÇEMBERLER KATMANI */}
        {objects
          .filter((o) => o.type === 'circle' && o.visible)
          .map((obj) => {
            const circ = obj as CircleObject;
            const center = objects.find((o) => o.id === circ.centerPointId) as PointObject;
            if (!center) return null;

            let radius = circ.fixedRadius ?? 0;
            if (circ.radiusPointId) {
              const rPoint = objects.find((o) => o.id === circ.radiusPointId) as PointObject;
              if (rPoint) {
                radius = calculateDistance(center, rPoint);
              }
            }

            const centerScreen = worldToScreen(center, viewport);
            const pixelRadius = radius * viewport.zoom;
            const isSelected = selectedObjectId === circ.id;

            return (
              <g key={circ.id} onClick={() => setSelectedObjectId(circ.id)}>
                <circle
                  cx={centerScreen.x}
                  cy={centerScreen.y}
                  r={pixelRadius}
                  fill={circ.color || '#8b5cf6'}
                  fillOpacity={circ.fillOpacity || 0.08}
                  stroke={isSelected ? '#ec4899' : circ.color || '#8b5cf6'}
                  strokeWidth={isSelected ? 3 : 2}
                  className="cursor-pointer"
                />
                {circ.showArea && (
                  <text
                    x={centerScreen.x}
                    y={centerScreen.y + 16}
                    textAnchor="middle"
                    className="fill-foreground text-[11px] font-medium pointer-events-none drop-shadow"
                  >
                    r = {formatTurkishNumber(radius)} br | A = {formatTurkishNumber(calculateCircleArea(radius))} br²
                  </text>
                )}
              </g>
            );
          })}

        {/* 6. AÇILAR KATMANI */}
        {objects
          .filter((o) => o.type === 'angle' && o.visible)
          .map((obj) => {
            const ang = obj as AngleObject;
            const p1 = objects.find((o) => o.id === ang.point1Id) as PointObject;
            const vertex = objects.find((o) => o.id === ang.vertexPointId) as PointObject;
            const p3 = objects.find((o) => o.id === ang.point3Id) as PointObject;

            if (!p1 || !vertex || !p3) return null;

            const deg = calculateAngleDegrees(p1, vertex, p3);
            const vScreen = worldToScreen(vertex, viewport);

            // Açı etiketi konumu (Açıortay yönünde)
            const angle1 = Math.atan2(-(p1.y - vertex.y), p1.x - vertex.x);
            const angle2 = Math.atan2(-(p3.y - vertex.y), p3.x - vertex.x);
            const midAngle = (angle1 + angle2) / 2;

            const labelDist = 28;
            const labelX = vScreen.x + labelDist * Math.cos(midAngle);
            const labelY = vScreen.y + labelDist * Math.sin(midAngle);

            const isRightAngle = Math.abs(deg - 90) < 1;

            return (
              <g key={ang.id} onClick={() => setSelectedObjectId(ang.id)}>
                {/* Açı Yayı */}
                <circle
                  cx={vScreen.x}
                  cy={vScreen.y}
                  r={22}
                  fill="none"
                  stroke={ang.color || '#f59e0b'}
                  strokeWidth={2}
                  strokeDasharray={isRightAngle ? '4,2' : undefined}
                  className="opacity-70"
                />
                {/* Açı Değer Rozeti */}
                <g className="pointer-events-none">
                  <rect
                    x={labelX - 16}
                    y={labelY - 10}
                    width={32}
                    height={20}
                    rx={6}
                    className="fill-background/90 stroke-border"
                    strokeWidth={1}
                  />
                  <text
                    x={labelX}
                    y={labelY + 4}
                    textAnchor="middle"
                    className="fill-foreground font-bold text-[10px]"
                  >
                    {Math.round(deg)}°
                  </text>
                </g>
              </g>
            );
          })}

        {/* 7. DOĞRULAR, IŞINLAR VE DOĞRU PARÇALARI KATMANI */}
        {objects
          .filter((o) => ['segment', 'line', 'ray'].includes(o.type) && o.visible)
          .map((obj) => {
            const isSelected = selectedObjectId === obj.id;

            if (obj.type === 'segment') {
              const seg = obj as SegmentObject;
              const p1 = objects.find((o) => o.id === seg.startPointId) as PointObject;
              const p2 = objects.find((o) => o.id === seg.endPointId) as PointObject;
              if (!p1 || !p2) return null;

              const s1 = worldToScreen(p1, viewport);
              const s2 = worldToScreen(p2, viewport);
              const length = calculateDistance(p1, p2);
              const midpointScreen = { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 };

              return (
                <g key={seg.id} onClick={() => setSelectedObjectId(seg.id)}>
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={isSelected ? '#ec4899' : seg.color || '#0284c7'}
                    strokeWidth={isSelected ? (seg.thickness || 2.5) + 1.5 : seg.thickness || 2.5}
                    strokeLinecap="round"
                    className="cursor-pointer hover:opacity-80 transition-all"
                  />
                  {seg.showLength && (
                    <g className="pointer-events-none">
                      <rect
                        x={midpointScreen.x - 22}
                        y={midpointScreen.y - 18}
                        width={44}
                        height={18}
                        rx={5}
                        className="fill-background/90 stroke-border/70"
                        strokeWidth={0.75}
                      />
                      <text
                        x={midpointScreen.x}
                        y={midpointScreen.y - 5}
                        textAnchor="middle"
                        className="fill-foreground font-semibold text-[10px]"
                      >
                        {formatTurkishNumber(length)}
                      </text>
                    </g>
                  )}
                </g>
              );
            }

            if (obj.type === 'line') {
              const line = obj as LineObject;
              const p1 = objects.find((o) => o.id === line.point1Id) as PointObject;
              const p2 = objects.find((o) => o.id === line.point2Id) as PointObject;
              if (!p1 || !p2) return null;

              // Sonsuz doğruyu ekran sınırlarına genişlet
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const pStart = { x: p1.x - dx * 100, y: p1.y - dy * 100 };
              const pEnd = { x: p2.x + dx * 100, y: p2.y + dy * 100 };

              const s1 = worldToScreen(pStart, viewport);
              const s2 = worldToScreen(pEnd, viewport);
              const eq = calculateLineEquation(p1, p2);

              return (
                <g key={line.id} onClick={() => setSelectedObjectId(line.id)}>
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={isSelected ? '#ec4899' : line.color || '#0284c7'}
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-pointer"
                  />
                  {line.showEquation && (
                    <text
                      x={worldToScreen(p2, viewport).x + 12}
                      y={worldToScreen(p2, viewport).y - 8}
                      className="fill-foreground text-xs font-semibold drop-shadow"
                    >
                      {eq.equationText}
                    </text>
                  )}
                </g>
              );
            }

            if (obj.type === 'ray') {
              const ray = obj as RayObject;
              const p1 = objects.find((o) => o.id === ray.startPointId) as PointObject;
              const p2 = objects.find((o) => o.id === ray.throughPointId) as PointObject;
              if (!p1 || !p2) return null;

              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const pEnd = { x: p1.x + dx * 100, y: p1.y + dy * 100 };

              const s1 = worldToScreen(p1, viewport);
              const s2 = worldToScreen(pEnd, viewport);

              return (
                <g key={ray.id} onClick={() => setSelectedObjectId(ray.id)}>
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={isSelected ? '#ec4899' : ray.color || '#0284c7'}
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-pointer"
                  />
                </g>
              );
            }

            return null;
          })}

        {/* 8. NOKTALAR KATMANI */}
        {objects
          .filter((o) => o.type === 'point' && o.visible)
          .map((obj) => {
            const pt = obj as PointObject;
            const sPos = worldToScreen(pt, viewport);
            const isSelected = selectedObjectId === pt.id;
            const isPending = pendingPointIds.includes(pt.id);

            return (
              <g
                key={pt.id}
                className="cursor-grab active:cursor-grabbing group"
                onMouseDown={(e) => handlePointMouseDown(e, pt)}
              >
                {/* Geniş Tıklama ve Tutma Yakalama Alanı (Görünmez Kolay Yakalayıcı) */}
                <circle
                  cx={sPos.x}
                  cy={sPos.y}
                  r={18}
                  fill="transparent"
                  className="cursor-grab active:cursor-grabbing"
                />

                {/* Seçim veya Bekleme Halkası */}
                {(isSelected || isPending) && (
                  <circle
                    cx={sPos.x}
                    cy={sPos.y}
                    r={12}
                    fill="none"
                    stroke={isPending ? '#f59e0b' : '#ec4899'}
                    strokeWidth={2}
                    strokeDasharray={isPending ? '3,3' : undefined}
                    className="animate-pulse pointer-events-none"
                  />
                )}

                {/* Nokta Gövdesi */}
                <circle
                  cx={sPos.x}
                  cy={sPos.y}
                  r={(pt.size || 6) + (isSelected ? 1.5 : 0)}
                  fill={pt.color || '#2563eb'}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all pointer-events-none drop-shadow-sm"
                />

                {/* Nokta Etiketi ve Koordinat */}
                {pt.showLabel && (
                  <text
                    x={sPos.x + 10}
                    y={sPos.y - 10}
                    className="fill-foreground font-bold text-xs select-none pointer-events-none drop-shadow"
                  >
                    {pt.label}
                    {viewport.showCoordinates && (
                      <tspan className="font-normal text-[10px] fill-muted-foreground ml-1">
                        {' '}
                        {formatCoordinate(pt, 1)}
                      </tspan>
                    )}
                  </text>
                )}
              </g>
            );
          })}

        {/* 9. SERBEST ÇİZİMLER (KALEM) KATMANI */}
        {objects
          .filter((o) => o.type === 'pen' && o.visible)
          .map((obj) => {
            const stroke = obj as PenStrokeObject;
            if (stroke.points.length < 2) return null;
            const pts = stroke.points.map((p) => worldToScreen(p, viewport));
            const pathData = pts.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
            const isSelected = selectedObjectId === stroke.id;

            return (
              <g key={stroke.id} onClick={() => setSelectedObjectId(stroke.id)}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#ec4899' : stroke.color || '#e11d48'}
                  strokeWidth={stroke.thickness || 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="cursor-pointer hover:opacity-80"
                />
              </g>
            );
          })}

        {/* Aktif Kalem Çizimi Önizlemesi */}
        {isDrawingPen && currentPenStroke.length > 1 && (
          <path
            d={currentPenStroke
              .map((p) => worldToScreen(p, viewport))
              .reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '')}
            fill="none"
            stroke="#e11d48"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none"
          />
        )}

        {/* 10. KESİR MODELLERİ KATMANI */}
        {objects
          .filter((o) => o.type === 'fraction' && o.visible)
          .map((obj) => {
            const frac = obj as FractionObject;
            const center = worldToScreen({ x: frac.x, y: frac.y }, viewport);
            const rPx = frac.radius * viewport.zoom;
            const isSelected = selectedObjectId === frac.id;
            const n = frac.numerator || 3;
            const d = frac.denominator || 4;

            // Daire dilimleri oluştur
            const slices = [];
            for (let i = 0; i < d; i++) {
              const startAngle = (i * 2 * Math.PI) / d - Math.PI / 2;
              const endAngle = ((i + 1) * 2 * Math.PI) / d - Math.PI / 2;
              const x1 = center.x + rPx * Math.cos(startAngle);
              const y1 = center.y + rPx * Math.sin(startAngle);
              const x2 = center.x + rPx * Math.cos(endAngle);
              const y2 = center.y + rPx * Math.sin(endAngle);
              const isFilled = i < n;

              slices.push(
                <path
                  key={`slice-${i}`}
                  d={`M ${center.x} ${center.y} L ${x1} ${y1} A ${rPx} ${rPx} 0 0 1 ${x2} ${y2} Z`}
                  fill={isFilled ? frac.color || '#8b5cf6' : '#ffffff'}
                  fillOpacity={isFilled ? 0.45 : 0.8}
                  stroke={frac.color || '#8b5cf6'}
                  strokeWidth={1.5}
                />
              );
            }

            return (
              <g key={frac.id} onClick={() => setSelectedObjectId(frac.id)} className="cursor-pointer">
                {slices}
                <circle
                  cx={center.x}
                  cy={center.y}
                  r={rPx}
                  fill="none"
                  stroke={isSelected ? '#ec4899' : frac.color || '#8b5cf6'}
                  strokeWidth={isSelected ? 3 : 2}
                />
                <g className="pointer-events-none">
                  <rect
                    x={center.x - 24}
                    y={center.y + rPx + 6}
                    width={48}
                    height={22}
                    rx={6}
                    className="fill-background/95 stroke-border"
                    strokeWidth={1}
                  />
                  <text
                    x={center.x}
                    y={center.y + rPx + 21}
                    textAnchor="middle"
                    className="fill-foreground font-black text-xs"
                  >
                    {n}/{d}
                  </text>
                </g>
              </g>
            );
          })}

        {/* 11. METİN VE NOTLAR KATMANI */}
        {objects
          .filter((o) => o.type === 'text' && o.visible)
          .map((obj) => {
            const txt = obj as TextObject;
            const sPos = worldToScreen({ x: txt.x, y: txt.y }, viewport);
            const isSelected = selectedObjectId === txt.id;

            return (
              <g
                key={txt.id}
                onClick={() => setSelectedObjectId(txt.id)}
                className="cursor-pointer select-none"
              >
                <rect
                  x={sPos.x - 8}
                  y={sPos.y - 18}
                  width={txt.text.length * 8 + 16}
                  height={26}
                  rx={6}
                  fill={isSelected ? '#fdf2f8' : '#ffffff'}
                  stroke={isSelected ? '#ec4899' : '#cbd5e1'}
                  strokeWidth={1.5}
                  className="shadow-2xs"
                />
                <text
                  x={sPos.x}
                  y={sPos.y}
                  fill={txt.color || '#1e293b'}
                  className="font-bold text-xs font-sans"
                >
                  {txt.text}
                </text>
              </g>
            );
          })}

        {/* 12. GÖRSEL VE ŞEMALAR KATMANI */}
        {objects
          .filter((o) => o.type === 'image' && o.visible)
          .map((obj) => {
            const img = obj as ImageObject;
            const sPos = worldToScreen({ x: img.x, y: img.y }, viewport);
            const wPx = img.width * viewport.zoom;
            const hPx = img.height * viewport.zoom;
            const isSelected = selectedObjectId === img.id;

            return (
              <g key={img.id} onClick={() => setSelectedObjectId(img.id)} className="cursor-pointer">
                <image
                  href={img.src}
                  x={sPos.x - wPx / 2}
                  y={sPos.y - hPx / 2}
                  width={wPx}
                  height={hPx}
                  preserveAspectRatio="xMidYMid meet"
                  className={isSelected ? 'ring-2 ring-pink-500' : ''}
                />
              </g>
            );
          })}

        {/* 13. SÜRÜKLEYEREK ŞEKİL OLUŞTURMA CANLI ÖNİZLEMESİ */}
        {dragCreateStart && dragCreateCurrent && (() => {
          const s1 = worldToScreen(dragCreateStart, viewport);
          const s2 = worldToScreen(dragCreateCurrent, viewport);
          const minSx = Math.min(s1.x, s2.x);
          const minSy = Math.min(s1.y, s2.y);
          const wPx = Math.abs(s2.x - s1.x);
          const hPx = Math.abs(s2.y - s1.y);
          const dxWorld = Math.abs(dragCreateCurrent.x - dragCreateStart.x);
          const dyWorld = Math.abs(dragCreateCurrent.y - dragCreateStart.y);
          const distWorld = Math.hypot(dxWorld, dyWorld);

          if (activeTool === 'square') {
            const sidePx = Math.max(wPx, hPx);
            const sideWorld = Number(Math.max(dxWorld, dyWorld).toFixed(1));
            return (
              <g className="pointer-events-none">
                <rect
                  x={minSx}
                  y={minSy}
                  width={sidePx}
                  height={sidePx}
                  fill="#f43f5e"
                  fillOpacity={0.15}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
                <rect x={minSx + sidePx / 2 - 36} y={minSy + sidePx / 2 - 12} width={72} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={minSx + sidePx / 2} y={minSy + sidePx / 2 + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {sideWorld} x {sideWorld} br
                </text>
              </g>
            );
          } else if (activeTool === 'rectangle') {
            return (
              <g className="pointer-events-none">
                <rect
                  x={minSx}
                  y={minSy}
                  width={wPx}
                  height={hPx}
                  fill="#f59e0b"
                  fillOpacity={0.15}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
                <rect x={minSx + wPx / 2 - 40} y={minSy + hPx / 2 - 12} width={80} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={minSx + wPx / 2} y={minSy + hPx / 2 + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {Number(dxWorld.toFixed(1))} x {Number(dyWorld.toFixed(1))} br
                </text>
              </g>
            );
          } else if (activeTool === 'circle') {
            const rPx = distWorld * viewport.zoom;
            return (
              <g className="pointer-events-none">
                <circle
                  cx={s1.x}
                  cy={s1.y}
                  r={rPx}
                  fill="#8b5cf6"
                  fillOpacity={0.12}
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                />
                <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="2,2" />
                <rect x={s1.x - 30} y={s1.y - 12} width={60} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={s1.x} y={s1.y + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  r = {Number(distWorld.toFixed(1))} br
                </text>
              </g>
            );
          } else if (activeTool === 'segment') {
            return (
              <g className="pointer-events-none">
                <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#0284c7" strokeWidth={2.5} strokeDasharray="4,4" />
                <rect x={(s1.x + s2.x) / 2 - 25} y={(s1.y + s2.y) / 2 - 12} width={50} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={(s1.x + s2.x) / 2} y={(s1.y + s2.y) / 2 + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {Number(distWorld.toFixed(1))} br
                </text>
              </g>
            );
          }
          return null;
        })()}
      </svg>

      {/* 4. ÇOKGEN OLUŞTURMA YARDIMCI VE TAMAMLAMA KAPSÜLÜ */}
      {activeTool === 'polygon' && pendingPointIds.length > 0 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-card/95 backdrop-blur-md text-white border border-border shadow-2xl px-4 py-2.5 rounded-2xl flex items-center gap-3 z-30 select-none animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-black">
              🔷 Çokgen: {pendingPointIds.length} Köşe Belirlendi
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pendingPointIds.length >= 3 && (
              <button
                onClick={() => {
                  const newPolygon: PolygonObject = {
                    id: `poly-${Date.now()}`,
                    type: 'polygon',
                    label: `${pendingPointIds.length} Köşeli Çokgen`,
                    showLabel: true,
                    pointIds: [...pendingPointIds],
                    color: '#10b981',
                    fillColor: '#10b981',
                    fillOpacity: 0.18,
                    visible: true,
                    showArea: true,
                    showPerimeter: true,
                    createdAt: Date.now(),
                  };
                  addObject(newPolygon, 'Çokgen oluşturuldu');
                  cancelPendingAction();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Çokgeni Kapat ve Tamamla</span>
              </button>
            )}

            <button
              onClick={cancelPendingAction}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              ✕ İptal
            </button>
          </div>
        </div>
      )}

      {/* Alt Bilgi / Telemetri Çubuğu (Canlı & Renkli Ortaokul Stili) */}
      <div className="absolute bottom-3 left-3 bg-card/95 backdrop-blur-md border border-border/80 px-3.5 py-2 rounded-2xl text-xs shadow-md flex items-center gap-3 select-none pointer-events-none z-10">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
          <span>📍 İmleç:</span>
          <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-lg font-black">{formatCoordinate(mouseWorldPos)}</span>
        </div>
        <div className="w-[1px] h-4 bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
          <span>🔍 Ölçek:</span>
          <span className="font-mono font-bold text-foreground">%{Math.round((viewport.zoom / 32) * 100)}</span>
        </div>
        <div className="w-[1px] h-4 bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
          <span>🎨 Nesne Sayısı:</span>
          <span className="font-bold text-foreground px-2 py-0.5 rounded-lg bg-muted">{objects.length}</span>
        </div>
      </div>

      {/* 2. SAĞ DİKEY YÜZEN HIZLI NAVİGASYON VE ARAÇ ÇUBUĞU (Referans Görsel Birebir) */}
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 p-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-xl select-none">
        {/* 1. Geri Al (Undo) */}
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Geri Al (Ctrl+Z)"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            canUndo
              ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              : 'text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* 2. İleri Al (Redo) */}
        <button
          onClick={redo}
          disabled={!canRedo}
          title="İleri Al (Ctrl+Y)"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            canRedo
              ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              : 'text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed'
          }`}
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* 3. Görünümü Kaydır / Pan */}
        <button
          onClick={() => setActiveTool(activeTool === 'pan' ? 'select' : 'pan')}
          title="Görünümü Kaydır (El Aracı)"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            activeTool === 'pan'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Hand className="w-4 h-4" />
        </button>

        {/* 4. Izgaraya Yapış (Magnet - Aktifken Canlı Sarı Rozet) */}
        <button
          onClick={() => setViewport((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }))}
          title={viewport.snapToGrid ? 'Izgaraya Yapışmayı Kapat' : 'Izgaraya Yapışmayı Aç'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            viewport.snapToGrid
              ? 'bg-[#fde047] text-slate-950 shadow-md ring-2 ring-yellow-400/40 font-bold'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Magnet className="w-4 h-4" />
        </button>

        {/* 5. Merkeze Dön / Sıfırla (Home) */}
        <button
          onClick={centerOrigin}
          title="Orijini Ortala / Sıfırla (0, 0)"
          className="w-9 h-9 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer"
        >
          <Home className="w-4 h-4" />
        </button>

        {/* 6. Yakınlaştır (+) */}
        <button
          onClick={zoomIn}
          title="Yakınlaştır (+)"
          className="w-9 h-9 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* 7. Uzaklaştır (-) */}
        <button
          onClick={zoomOut}
          title="Uzaklaştır (-)"
          className="w-9 h-9 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* 8. Ekrana Sığdır / Tam Görünüm */}
        <button
          onClick={centerOrigin}
          title="Görünümü Ekrana Sığdır"
          className="w-9 h-9 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* 9. Katmanlar / Izgara Geçişi */}
        <button
          onClick={() => setViewport((prev) => ({ ...prev, showGrid: !prev.showGrid }))}
          title={viewport.showGrid ? 'Izgarayı Gizle' : 'Izgarayı Göster'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            viewport.showGrid
              ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* 10. Düzenle / Seçilen Nesne Ayarları */}
        <button
          onClick={() => {
            if (selectedObjectId) setActiveTool('select');
          }}
          title="Seçilen Nesneyi Düzenle"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            selectedObjectId
              ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileEdit className="w-4 h-4" />
        </button>

        {/* 11. Seçiliyi Sil (Kırmızı Çöp Kutusu) */}
        <button
          onClick={() => {
            if (selectedObjectId) deleteObject(selectedObjectId);
          }}
          title={selectedObjectId ? 'Seçili Nesneyi Sil' : 'Silmek için önce bir nesne seçin'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            selectedObjectId
              ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
              : 'text-red-400/60 hover:bg-red-50/50'
          }`}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
}
