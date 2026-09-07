'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useCurriculum } from '@/state/CurriculumContext';
import {
  MathObject,
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
  snapToGridPoint,
  getVisibleWorldBounds,
  getAdaptiveGridStep,
  formatTurkishNumber,
  formatCoordinate,
} from '@/math/coordinates';
import { MeasurementInstruments } from './MeasurementInstruments';
import { TextNoteDialog } from './TextNoteDialog';
import {
  calculateDistance,
  calculateMidpoint,
  calculateAngleDegrees,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateLineEquation,
  calculateCircleArea,
  calculateCircleCircumference,
  reflectPointAcrossLine,
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
  Eye,
  EyeOff,
  FileEdit,
  Trash2,
  Eraser,
  Settings,
  Check,
  Shapes,
  ChevronDown,
} from 'lucide-react';

// Çoklu Seçim Kutusu ile Kesişim / İçerilme Kontrolü
const isObjectInMarquee = (
  obj: MathObject,
  allObjects: MathObject[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): boolean => {
  if (obj.type === 'point') {
    const pt = obj as PointObject;
    return pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
  }
  if (obj.type === 'polygon') {
    const poly = obj as PolygonObject;
    const pts = poly.pointIds
      .map((id) => allObjects.find((o) => o.id === id) as PointObject)
      .filter(Boolean);
    if (pts.length === 0) return false;
    const anyInside = pts.some((p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
    if (anyInside) return true;
    const avgX = pts.reduce((acc, p) => acc + p.x, 0) / pts.length;
    const avgY = pts.reduce((acc, p) => acc + p.y, 0) / pts.length;
    return avgX >= minX && avgX <= maxX && avgY >= minY && avgY <= maxY;
  }
  if (obj.type === 'segment') {
    const seg = obj as SegmentObject;
    const p1 = allObjects.find((o) => o.id === seg.startPointId) as PointObject;
    const p2 = allObjects.find((o) => o.id === seg.endPointId) as PointObject;
    if (!p1 || !p2) return false;
    return (
      (p1.x >= minX && p1.x <= maxX && p1.y >= minY && p1.y <= maxY) ||
      (p2.x >= minX && p2.x <= maxX && p2.y >= minY && p2.y <= maxY) ||
      ((p1.x + p2.x) / 2 >= minX &&
        (p1.x + p2.x) / 2 <= maxX &&
        (p1.y + p2.y) / 2 >= minY &&
        (p1.y + p2.y) / 2 <= maxY)
    );
  }
  if (obj.type === 'line' || obj.type === 'ray') {
    const p1 = allObjects.find(
      (o) => o.id === (obj as any).point1Id || o.id === (obj as any).startPointId
    ) as PointObject;
    const p2 = allObjects.find(
      (o) => o.id === (obj as any).point2Id || o.id === (obj as any).throughPointId
    ) as PointObject;
    if (!p1 || !p2) return false;
    return (
      (p1.x >= minX && p1.x <= maxX && p1.y >= minY && p1.y <= maxY) ||
      (p2.x >= minX && p2.x <= maxX && p2.y >= minY && p2.y <= maxY)
    );
  }
  if (obj.type === 'circle') {
    const circ = obj as CircleObject;
    const center = allObjects.find((o) => o.id === circ.centerPointId) as PointObject;
    if (!center) return false;
    return center.x >= minX && center.x <= maxX && center.y >= minY && center.y <= maxY;
  }
  if (obj.type === 'text') {
    const txt = obj as TextObject;
    return txt.x >= minX && txt.x <= maxX && txt.y >= minY && txt.y <= maxY;
  }
  if (obj.type === 'fraction') {
    const frac = obj as FractionObject;
    return frac.x >= minX && frac.x <= maxX && frac.y >= minY && frac.y <= maxY;
  }
  if (obj.type === 'image') {
    const img = obj as ImageObject;
    return img.x >= minX && img.x <= maxX && img.y >= minY && img.y <= maxY;
  }
  if (obj.type === 'pen') {
    const pen = obj as PenStrokeObject;
    return pen.points.some((p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
  }
  return false;
};

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
    selectedObjectIds,
    activeTool,
    setActiveTool,
    viewport,
    pendingPointIds,
    setViewport,
    setSelectedObjectId,
    setSelectedObjectIds,
    handlePointClick,
    handleCanvasClick,
    handlePointDrag,
    deleteObject,
    moveObject,
    moveObjects,
    recordHistory,
    addObject,
    updateObject,
    studioDimension,
    setStudioDimension,
    undo,
    redo,
    canUndo,
    canRedo,
    cancelPendingAction,
    requestClearAll,
  } = useWorkspace();

  // Yazı / Metin Notu Düzenleme Durumu
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [editingTextObj, setEditingTextObj] = useState<TextObject | null>(null);
  const [pendingTextWorldPos, setPendingTextWorldPos] = useState<Point2D | null>(null);

  // Sürükleme ve Kaydırma (Pan/Drag) Durumları
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingObjState, setDraggingObjState] = useState<{
    objectIds: string[];
    startWorld: Point2D;
    lastWorld: Point2D;
    hasMoved: boolean;
  } | null>(null);
  const [selectionMarquee, setSelectionMarquee] = useState<{
    startWorld: Point2D;
    currentWorld: Point2D;
  } | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState<Point2D>({ x: 0, y: 0 });
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Sürükleyerek Şekil Boyutlandırma ve Oluşturma Durumu
  const [dragCreateStart, setDragCreateStart] = useState<Point2D | null>(null);
  const [dragCreateCurrent, setDragCreateCurrent] = useState<Point2D | null>(null);
  const [rotatingFeedback, setRotatingFeedback] = useState<{ polyId: string; deg: number } | null>(null);
  const [reflectTargetPolyId, setReflectTargetPolyId] = useState<string | null>(null);
  const [reflectAxisLine, setReflectAxisLine] = useState<{ id: string; p1: Point2D; p2: Point2D; name: string } | null>(null);

  // Serbest Çizim (Kalem) Durumu
  const [isDrawingPen, setIsDrawingPen] = useState(false);
  const [currentPenStroke, setCurrentPenStroke] = useState<Point2D[]>([]);

  // 2D Üst Seçenekler (Referans Görsel: Geometri / Dik Koordinat / Sade)
  const [activeDomain, setActiveDomain] = useState<'Geometri' | 'Analitik' | 'Cebir' | 'Serbest'>('Geometri');
  const [planeType, setPlaneType] = useState<'dik_koordinat' | 'kareli_duzlem' | 'bos_duzlem'>('dik_koordinat');
  const [styleMode, setStyleMode] = useState<'Sade' | 'Ayrıntılı'>('Ayrıntılı');
  const [openDropdown, setOpenDropdown] = useState<'domain' | 'plane' | 'style' | null>(null);

  const isSade = styleMode === 'Sade';
  const showDetails = !isSade && viewport.showMeasurements !== false;

  // Ekran boyutu senkronizasyonu
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewport((prev) => {
          if (prev.width === rect.width && prev.height === rect.height) return prev;
          return { ...prev, width: rect.width, height: rect.height };
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [setViewport]);

  // Klavye Kısayolu (Delete / Backspace ile seçili nesneleri silme)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObjectIds.length > 0) {
        e.preventDefault();
        selectedObjectIds.forEach((id) => deleteObject(id));
        setSelectedObjectIds([]);
        recordHistory(`${selectedObjectIds.length} seçili nesne silindi`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectIds, deleteObject, setSelectedObjectIds, recordHistory]);

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

    if (selectionMarquee) {
      setSelectionMarquee((prev) => (prev ? { ...prev, currentWorld: world } : null));

      const minX = Math.min(selectionMarquee.startWorld.x, world.x);
      const maxX = Math.max(selectionMarquee.startWorld.x, world.x);
      const minY = Math.min(selectionMarquee.startWorld.y, world.y);
      const maxY = Math.max(selectionMarquee.startWorld.y, world.y);

      if (Math.hypot(maxX - minX, maxY - minY) > 0.05) {
        const enclosedIds = objects
          .filter((o) => isObjectInMarquee(o, objects, minX, maxX, minY, maxY))
          .map((o) => o.id);
        setSelectedObjectIds(enclosedIds);
      }
      return;
    }

    if (draggingObjState) {
      const currentWorld = viewport.snapToGrid
        ? snapToGridPoint(world, viewport.gridStep)
        : world;
      const dx = currentWorld.x - draggingObjState.lastWorld.x;
      const dy = currentWorld.y - draggingObjState.lastWorld.y;

      if (dx !== 0 || dy !== 0) {
        moveObjects(draggingObjState.objectIds, { x: dx, y: dy }, false);
        setDraggingObjState((prev) =>
          prev
            ? {
                ...prev,
                lastWorld: currentWorld,
                hasMoved: true,
              }
            : null
        );
      }
      return;
    }

    if (isPanning) {
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

    if (activeTool === 'text') {
      setPendingTextWorldPos(world);
      setEditingTextObj(null);
      setIsTextDialogOpen(true);
      return;
    }

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
        if (!e.shiftKey && !e.ctrlKey) {
          setSelectedObjectIds([]);
        }
        setSelectionMarquee({
          startWorld: world,
          currentWorld: world,
        });
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

    if (selectionMarquee) {
      setSelectionMarquee(null);
    }

    if (draggingObjState) {
      if (draggingObjState.hasMoved) {
        recordHistory(`${draggingObjState.objectIds.length} nesne taşındı`);
      }
      setDraggingObjState(null);
    }

    setIsPanning(false);
  };

  // Nesne veya Nokta Sürükleme Başlat (Seç ve Taşı)
  const handleObjectMouseDown = (e: React.MouseEvent, obj: MathObject) => {
    if (e.button !== 0) return; // Sadece sol tık
    e.stopPropagation();

    if (activeTool === 'delete') {
      deleteObject(obj.id);
      return;
    }

    if (activeTool === 'measure_distance' || activeTool === 'unit_measure') {
      if (obj.type === 'segment') {
        const seg = obj as SegmentObject;
        const p1 = objects.find((o) => o.id === seg.startPointId) as PointObject;
        const p2 = objects.find((o) => o.id === seg.endPointId) as PointObject;
        if (p1 && p2) {
          const isCm = activeTool === 'measure_distance';
          const unit = isCm ? 'cm' : 'br';
          const dist = calculateDistance(p1, p2);
          const distStr = formatTurkishNumber(dist);
          updateObject(
            seg.id,
            {
              showLength: true,
              unit: isCm ? 'cm' : 'br',
              label: `|${p1.label}${p2.label}| = ${distStr} ${unit}`,
            },
            true
          );
          cancelPendingAction();
          return;
        }
      } else if (obj.type === 'point') {
        handlePointClick(obj.id);
        return;
      }
    }

    if (activeTool === 'measure_perimeter') {
      if (obj.type === 'polygon') {
        const poly = obj as PolygonObject;
        const polyPoints = poly.pointIds
          .map((id) => objects.find((o) => o.id === id) as PointObject)
          .filter(Boolean);
        const perim = calculatePolygonPerimeter(polyPoints);
        updateObject(
          poly.id,
          {
            showPerimeter: true,
            label: `${poly.label || 'Çokgen'} (Çevre = ${formatTurkishNumber(perim)} br)`,
          },
          true
        );
        recordHistory(`Çokgen çevresi hesaplandı (${formatTurkishNumber(perim)} br)`);
        return;
      } else if (obj.type === 'circle') {
        const circ = obj as CircleObject;
        updateObject(circ.id, { showPerimeter: true }, true);
        recordHistory('Çember çevresi hesaplandı');
        return;
      }
    }

    if (activeTool === 'measure_area') {
      if (obj.type === 'polygon') {
        const poly = obj as PolygonObject;
        const polyPoints = poly.pointIds
          .map((id) => objects.find((o) => o.id === id) as PointObject)
          .filter(Boolean);
        const area = calculatePolygonArea(polyPoints);
        updateObject(
          poly.id,
          {
            showArea: true,
            label: `${poly.label || 'Çokgen'} (Alan = ${formatTurkishNumber(area)} br²)`,
          },
          true
        );
        recordHistory(`Çokgen alanı hesaplandı (${formatTurkishNumber(area)} br²)`);
        return;
      } else if (obj.type === 'circle') {
        const circ = obj as CircleObject;
        updateObject(circ.id, { showArea: true }, true);
        recordHistory('Daire alanı hesaplandı');
        return;
      }
    }

    if (activeTool === 'rotate') {
      setSelectedObjectId(obj.id);
      return;
    }

    if (activeTool === 'reflect' || activeTool === 'symmetry') {
      if (obj.type === 'segment') {
        const seg = obj as SegmentObject;
        const p1 = objects.find((o) => o.id === seg.startPointId) as PointObject;
        const p2 = objects.find((o) => o.id === seg.endPointId) as PointObject;
        if (p1 && p2) {
          const axis = { id: seg.id, p1: { x: p1.x, y: p1.y }, p2: { x: p2.x, y: p2.y }, name: `[${p1.label}${p2.label}] Doğrusu` };
          setReflectAxisLine(axis);

          const targetPoly = (reflectTargetPolyId
            ? objects.find((o) => o.id === reflectTargetPolyId)
            : objects.find((o) => o.type === 'polygon')) as PolygonObject;

          if (targetPoly) {
            reflectPolygonAcrossSymmetryLine(targetPoly, axis.p1, axis.p2, axis.name);
            setReflectAxisLine(null);
            setReflectTargetPolyId(null);
          }
          return;
        }
      } else if (obj.type === 'polygon') {
        const poly = obj as PolygonObject;
        setReflectTargetPolyId(poly.id);

        if (reflectAxisLine) {
          reflectPolygonAcrossSymmetryLine(poly, reflectAxisLine.p1, reflectAxisLine.p2, reflectAxisLine.name);
          setReflectAxisLine(null);
          setReflectTargetPolyId(null);
        }
        return;
      }
    }

    if (activeTool === 'select') {
      const isAlreadySelected = selectedObjectIds.includes(obj.id);
      let targetIds: string[];

      if (e.shiftKey || e.ctrlKey) {
        targetIds = isAlreadySelected
          ? selectedObjectIds.filter((id) => id !== obj.id)
          : [...selectedObjectIds, obj.id];
        setSelectedObjectIds(targetIds);
      } else if (isAlreadySelected) {
        targetIds = selectedObjectIds;
      } else {
        targetIds = [obj.id];
        setSelectedObjectIds(targetIds);
      }

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = screenToWorld({ x: screenX, y: screenY }, viewport);
      const startWorld = viewport.snapToGrid ? snapToGridPoint(world, viewport.gridStep) : world;

      setDraggingObjState({
        objectIds: targetIds,
        startWorld,
        lastWorld: startWorld,
        hasMoved: false,
      });
    } else {
      if (obj.type === 'point') {
        handlePointClick(obj.id);
      } else {
        setSelectedObjectId(obj.id);
      }
    }
  };

  // Zoom Hızlı Eylemleri
  const rotatePolygonByAngle = (poly: PolygonObject, deg: number) => {
    const polyPoints = poly.pointIds
      .map((id) => objects.find((o) => o.id === id) as PointObject)
      .filter(Boolean);
    if (polyPoints.length === 0) return;

    const cx = polyPoints.reduce((s, p) => s + p.x, 0) / polyPoints.length;
    const cy = polyPoints.reduce((s, p) => s + p.y, 0) / polyPoints.length;
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    polyPoints.forEach((pt) => {
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      const nx = Number((cx + dx * cos - dy * sin).toFixed(2));
      const ny = Number((cy + dx * sin + dy * cos).toFixed(2));
      updateObject(pt.id, { x: nx, y: ny }, false);
    });

    recordHistory(`${poly.label || 'Şekil'} ${deg}° döndürüldü`);
  };

  const handleStartRotatePolygon = (e: React.MouseEvent, poly: PolygonObject) => {
    e.stopPropagation();
    e.preventDefault();

    const polyPoints = poly.pointIds
      .map((id) => objects.find((o) => o.id === id) as PointObject)
      .filter(Boolean);
    if (polyPoints.length === 0) return;

    const initialPositions = polyPoints.map((p) => ({ id: p.id, x: p.x, y: p.y }));
    const cx = polyPoints.reduce((s, p) => s + p.x, 0) / polyPoints.length;
    const cy = polyPoints.reduce((s, p) => s + p.y, 0) / polyPoints.length;
    const centerScreen = worldToScreen({ x: cx, y: cy }, viewport);

    const svgEl = svgRef.current;
    const rect = svgEl?.getBoundingClientRect() || { left: 0, top: 0 };

    const startClientX = e.clientX - rect.left;
    const startClientY = e.clientY - rect.top;
    const startAngle = Math.atan2(-(startClientY - centerScreen.y), startClientX - centerScreen.x);

    let lastDeg = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const curClientX = moveEvent.clientX - rect.left;
      const curClientY = moveEvent.clientY - rect.top;
      const currentAngle = Math.atan2(-(curClientY - centerScreen.y), curClientX - centerScreen.x);

      const deltaAngle = currentAngle - startAngle;
      let deg = Math.round((deltaAngle * 180) / Math.PI);

      if (moveEvent.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }

      lastDeg = deg;
      setRotatingFeedback({ polyId: poly.id, deg });

      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      initialPositions.forEach((pt) => {
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        const nx = Number((cx + dx * cos - dy * sin).toFixed(2));
        const ny = Number((cy + dx * sin + dy * cos).toFixed(2));
        updateObject(pt.id, { x: nx, y: ny }, false);
      });
    };

    const handleMouseUp = () => {
      setRotatingFeedback(null);
      if (lastDeg !== 0) {
        recordHistory(`${poly.label || 'Şekil'} ${lastDeg}° döndürüldü`);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Yansıtma Fonksiyonu: Herhangi bir simetri doğrusuna (p1, p2) göre nesneyi yansıt
  const reflectPolygonAcrossSymmetryLine = (
    targetPoly: PolygonObject,
    p1: Point2D,
    p2: Point2D,
    axisName: string
  ) => {
    const polyPoints = objects.filter(
      (o) => o.type === 'point' && targetPoly.pointIds.includes(o.id)
    ) as PointObject[];

    if (polyPoints.length < 3) return;

    const newPts: PointObject[] = [];
    const newIds: string[] = [];

    polyPoints.forEach((p, idx) => {
      const symId = `pt-${Date.now() + idx}`;
      const reflected = reflectPointAcrossLine({ x: p.x, y: p.y }, p1, p2);
      newIds.push(symId);
      const newPt: PointObject = {
        id: symId,
        type: 'point',
        label: `${p.label}'`,
        showLabel: true,
        x: reflected.x,
        y: reflected.y,
        color: '#9333ea',
        visible: true,
        isIndependent: true,
        createdAt: Date.now() + idx,
      };
      newPts.push(newPt);
      addObject(newPt);
    });

    const symPoly: PolygonObject = {
      id: `poly-${Date.now() + 10}`,
      type: 'polygon',
      label: `${targetPoly.label || 'Çokgen'} Yansıması (${axisName})`,
      showLabel: true,
      pointIds: newIds,
      color: '#9333ea',
      fillColor: '#9333ea',
      fillOpacity: 0.2,
      visible: true,
      showArea: true,
      showPerimeter: true,
      createdAt: Date.now() + 10,
    };

    addObject(symPoly, `${targetPoly.label || 'Çokgen'}, ${axisName} eksenine göre yansıtıldı`);
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
                {(['Ayrıntılı', 'Sade'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStyleMode(s);
                      if (s === 'Sade') {
                        setViewport((prev) => ({
                          ...prev,
                          showCoordinates: false,
                          showMeasurements: false,
                        }));
                      } else {
                        setViewport((prev) => ({
                          ...prev,
                          showCoordinates: true,
                          showMeasurements: true,
                        }));
                      }
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

                <button
                  onClick={() => setViewport((prev) => ({ ...prev, showQuadrants: !prev.showQuadrants }))}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted font-bold text-foreground cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/20">I-IV</span>
                    <span>Bölge İsimleri (1, 2, 3, 4)</span>
                  </span>
                  {viewport.showQuadrants && <Check className="w-3.5 h-3.5 text-primary" />}
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

        {/* 2. DÖRT BÖLGE (I, II, III, IV) İSİMLERİ (MEB Analitik Düzlem) */}
        {viewport.showQuadrants && viewport.showAxes && !isSade && (
          <g className="quadrant-badges select-none pointer-events-none font-black text-xs">
            {/* I. Bölge (Sağ Üst: +, +) */}
            <g transform={`translate(${Math.max(originScreen.x + 30, Math.min(viewport.width - 130, (viewport.width + originScreen.x) / 2 - 50))}, ${Math.min(originScreen.y - 45, Math.max(30, originScreen.y / 2 - 12))})`}>
              <rect width="100" height="26" rx="8" fill="#10b981" fillOpacity="0.18" stroke="#10b981" strokeWidth="1.5" className="shadow-xs backdrop-blur-xs" />
              <text x="50" y="17" textAnchor="middle" fill="#047857" className="font-bold text-[11px] font-sans">
                I. Bölge (+, +)
              </text>
            </g>
            {/* II. Bölge (Sol Üst: -, +) */}
            <g transform={`translate(${Math.min(originScreen.x - 130, Math.max(30, originScreen.x / 2 - 50))}, ${Math.min(originScreen.y - 45, Math.max(30, originScreen.y / 2 - 12))})`}>
              <rect width="100" height="26" rx="8" fill="#f59e0b" fillOpacity="0.18" stroke="#f59e0b" strokeWidth="1.5" className="shadow-xs backdrop-blur-xs" />
              <text x="50" y="17" textAnchor="middle" fill="#b45309" className="font-bold text-[11px] font-sans">
                II. Bölge (-, +)
              </text>
            </g>
            {/* III. Bölge (Sol Alt: -, -) */}
            <g transform={`translate(${Math.min(originScreen.x - 130, Math.max(30, originScreen.x / 2 - 50))}, ${Math.max(originScreen.y + 30, Math.min(viewport.height - 45, (viewport.height + originScreen.y) / 2 - 12))})`}>
              <rect width="100" height="26" rx="8" fill="#8b5cf6" fillOpacity="0.18" stroke="#8b5cf6" strokeWidth="1.5" className="shadow-xs backdrop-blur-xs" />
              <text x="50" y="17" textAnchor="middle" fill="#6d28d9" className="font-bold text-[11px] font-sans">
                III. Bölge (-, -)
              </text>
            </g>
            {/* IV. Bölge (Sağ Alt: +, -) */}
            <g transform={`translate(${Math.max(originScreen.x + 30, Math.min(viewport.width - 130, (viewport.width + originScreen.x) / 2 - 50))}, ${Math.max(originScreen.y + 30, Math.min(viewport.height - 45, (viewport.height + originScreen.y) / 2 - 12))})`}>
              <rect width="100" height="26" rx="8" fill="#0284c7" fillOpacity="0.18" stroke="#0284c7" strokeWidth="1.5" className="shadow-xs backdrop-blur-xs" />
              <text x="50" y="17" textAnchor="middle" fill="#0369a1" className="font-bold text-[11px] font-sans">
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

            // Alan, Çevre ve Ağırlık Merkezi (Centroid)
            const area = calculatePolygonArea(polyPoints);
            const perimeter = calculatePolygonPerimeter(polyPoints);
            const centroidScreen = {
              x: screenCoords.reduce((acc, p) => acc + p.x, 0) / screenCoords.length,
              y: screenCoords.reduce((acc, p) => acc + p.y, 0) / screenCoords.length,
            };

            const isSelected = selectedObjectIds.includes(poly.id);
            const hasArea = poly.showArea && showDetails;
            const hasPerimeter = poly.showPerimeter && showDetails;

            return (
              <g
                key={poly.id}
                onMouseDown={(e) => handleObjectMouseDown(e, poly)}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
              >
                <polygon
                  points={pointsAttr}
                  fill={poly.fillColor || poly.color || '#10b981'}
                  fillOpacity={poly.fillOpacity || 0.15}
                  stroke={isSelected ? '#ec4899' : poly.color || '#10b981'}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-colors"
                />
                {(hasArea || hasPerimeter) && (
                  <g
                    transform={`translate(${centroidScreen.x}, ${centroidScreen.y})`}
                    className="pointer-events-none drop-shadow-sm select-none"
                  >
                    {hasArea && hasPerimeter ? (
                      <>
                        <rect
                          x="-65"
                          y="-22"
                          width="130"
                          height="44"
                          rx="8"
                          fill="#ffffff"
                          fillOpacity={0.92}
                          stroke={poly.color || '#10b981'}
                          strokeWidth="1.2"
                          className="shadow-sm dark:fill-slate-900"
                        />
                        <text
                          x="0"
                          y="-4"
                          textAnchor="middle"
                          className="fill-emerald-700 dark:fill-emerald-400 font-bold text-[11px] font-sans"
                        >
                          Alan = {formatTurkishNumber(area)} br²
                        </text>
                        <text
                          x="0"
                          y="13"
                          textAnchor="middle"
                          className="fill-indigo-700 dark:fill-indigo-400 font-bold text-[11px] font-sans"
                        >
                          Çevre = {formatTurkishNumber(perimeter)} br
                        </text>
                      </>
                    ) : hasPerimeter ? (
                      <>
                        <rect
                          x="-62"
                          y="-12"
                          width="124"
                          height="24"
                          rx="7"
                          fill="#ffffff"
                          fillOpacity={0.92}
                          stroke="#6366f1"
                          strokeWidth="1.2"
                          className="shadow-sm dark:fill-slate-900"
                        />
                        <text
                          x="0"
                          y="5"
                          textAnchor="middle"
                          className="fill-indigo-700 dark:fill-indigo-400 font-bold text-[11px] font-sans"
                        >
                          Çevre = {formatTurkishNumber(perimeter)} br
                        </text>
                      </>
                    ) : (
                      <>
                        <rect
                          x="-62"
                          y="-12"
                          width="124"
                          height="24"
                          rx="7"
                          fill="#ffffff"
                          fillOpacity={0.92}
                          stroke="#10b981"
                          strokeWidth="1.2"
                          className="shadow-sm dark:fill-slate-900"
                        />
                        <text
                          x="0"
                          y="5"
                          textAnchor="middle"
                          className="fill-emerald-700 dark:fill-emerald-400 font-bold text-[11px] font-sans"
                        >
                          Alan = {formatTurkishNumber(area)} br²
                        </text>
                      </>
                    )}
                  </g>
                )}

                {/* 🔄 ÜNİVERSAL DÖNDÜRME GİZMO VE DERECE PANELİ (Şekli Döndür Aracı) */}
                {activeTool === 'rotate' && (
                  <g className="rotate-gizmo-layer select-none">
                    {/* A) Merkez Döndürme Noktası (Pivot Point) */}
                    <circle
                      cx={centroidScreen.x}
                      cy={centroidScreen.y}
                      r={6}
                      fill="#4f46e5"
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="shadow-sm"
                    />
                    <circle cx={centroidScreen.x} cy={centroidScreen.y} r={2} fill="#ffffff" />

                    {/* B) Bağlantı Kolu */}
                    <line
                      x1={centroidScreen.x}
                      y1={centroidScreen.y}
                      x2={centroidScreen.x}
                      y2={centroidScreen.y - 48}
                      stroke="#4f46e5"
                      strokeWidth={2}
                      strokeDasharray="3,3"
                    />

                    {/* C) Üniversel Döndür İkonu (Tutulup Sağa/Sola Serbestçe Sürüklenebilir) */}
                    <g
                      transform={`translate(${centroidScreen.x}, ${centroidScreen.y - 48})`}
                      onMouseDown={(e) => handleStartRotatePolygon(e, poly)}
                      className="cursor-grab active:cursor-grabbing group/rot-btn"
                    >
                      <circle
                        cx={0}
                        cy={0}
                        r={16}
                        fill="#4f46e5"
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        className="drop-shadow-xl group-hover/rot-btn:scale-125 transition-transform"
                      />
                      {/* 🔄 Üniversel Döndür İkon Okları */}
                      <path
                        d="M -7 -1 A 7.5 7.5 0 0 1 6 -4 L 6 -8 M 6 -4 L 2 -4"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 7 1 A 7.5 7.5 0 0 1 -6 4 L -6 8 M -6 4 L -2 4"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>

                    {/* D) Canlı Sürükleme Derecesi Geri Bildirimi */}
                    {rotatingFeedback && rotatingFeedback.polyId === poly.id && (
                      <g transform={`translate(${centroidScreen.x}, ${centroidScreen.y - 82})`}>
                        <rect
                          x="-35"
                          y="-13"
                          width="70"
                          height="26"
                          rx="8"
                          fill="#0f172a"
                          fillOpacity={0.96}
                          stroke="#818cf8"
                          strokeWidth="1.5"
                          className="shadow-2xl"
                        />
                        <text
                          x="0"
                          y="5"
                          textAnchor="middle"
                          fill="#ffffff"
                          className="font-black text-xs font-mono"
                        >
                          🔄 {rotatingFeedback.deg}°
                        </text>
                      </g>
                    )}

                    {/* E) Açıölçer Stili Hazır Derece Düğmeleri (30°, 45°, 60°, 90°, 120°, 135°, 180°, 270°) */}
                    <g transform={`translate(${centroidScreen.x - 170}, ${centroidScreen.y + 44})`}>
                      <rect
                        width={340}
                        height={34}
                        rx={10}
                        fill="#0f172a"
                        fillOpacity={0.96}
                        stroke="#4f46e5"
                        strokeWidth={1.2}
                        className="shadow-2xl"
                      />
                      {[30, 45, 60, 90, 120, 135, 180, 270].map((deg, i) => (
                        <g
                          key={`rot-deg-${deg}`}
                          transform={`translate(${8 + i * 35}, 6)`}
                          className="cursor-pointer group/deg"
                          onClick={(e) => {
                            e.stopPropagation();
                            rotatePolygonByAngle(poly, deg);
                          }}
                        >
                          <rect
                            width={31}
                            height={22}
                            rx={6}
                            fill="#1e293b"
                            stroke="#4f46e5"
                            strokeWidth={1}
                            className="group-hover/deg:fill-indigo-600 transition-colors shadow-xs"
                          />
                          <text
                            x={15.5}
                            y={15}
                            textAnchor="middle"
                            fill="#ffffff"
                            className="font-black text-[9px] font-sans pointer-events-none"
                          >
                            {deg}°
                          </text>
                        </g>
                      ))}
                      {/* ↷ Sağa 90° */}
                      <g
                        transform="translate(290, 6)"
                        className="cursor-pointer group/deg"
                        onClick={(e) => {
                          e.stopPropagation();
                          rotatePolygonByAngle(poly, 90);
                        }}
                      >
                        <rect
                          width={42}
                          height={22}
                          rx={6}
                          fill="#4f46e5"
                          className="group-hover/deg:fill-indigo-500 transition-colors shadow-xs"
                        />
                        <text
                          x={21}
                          y={15}
                          textAnchor="middle"
                          fill="#ffffff"
                          className="font-black text-[9px] font-sans pointer-events-none"
                        >
                          ↷ 90°
                        </text>
                      </g>
                    </g>
                  </g>
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
            const isSelected = selectedObjectIds.includes(circ.id);

            const circArea = calculateCircleArea(radius);
            const circPerimeter = calculateCircleCircumference(radius);
            const hasCircArea = circ.showArea && showDetails;
            const hasCircPerimeter = circ.showPerimeter && showDetails;

            return (
              <g
                key={circ.id}
                onMouseDown={(e) => handleObjectMouseDown(e, circ)}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
              >
                <circle
                  cx={centerScreen.x}
                  cy={centerScreen.y}
                  r={pixelRadius}
                  fill={circ.color || '#8b5cf6'}
                  fillOpacity={circ.fillOpacity || 0.08}
                  stroke={isSelected ? '#ec4899' : circ.color || '#8b5cf6'}
                  strokeWidth={isSelected ? 3 : 2}
                />
                {(hasCircArea || hasCircPerimeter) && (
                  <g
                    transform={`translate(${centerScreen.x}, ${centerScreen.y + 18})`}
                    className="pointer-events-none drop-shadow-sm select-none"
                  >
                    <rect
                      x="-80"
                      y="-12"
                      width="160"
                      height={hasCircArea && hasCircPerimeter ? 40 : 24}
                      rx="7"
                      fill="#ffffff"
                      fillOpacity={0.92}
                      stroke={circ.color || '#8b5cf6'}
                      strokeWidth="1.2"
                      className="shadow-sm dark:fill-slate-900"
                    />
                    {hasCircArea && hasCircPerimeter ? (
                      <>
                        <text
                          x="0"
                          y="-2"
                          textAnchor="middle"
                          className="fill-purple-700 dark:fill-purple-400 text-[10px] font-bold font-sans"
                        >
                          r = {formatTurkishNumber(radius)} br | A = {formatTurkishNumber(circArea)} br²
                        </text>
                        <text
                          x="0"
                          y="15"
                          textAnchor="middle"
                          className="fill-indigo-700 dark:fill-indigo-400 text-[10px] font-bold font-sans"
                        >
                          Çevre (2πr) = {formatTurkishNumber(circPerimeter)} br
                        </text>
                      </>
                    ) : hasCircPerimeter ? (
                      <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        className="fill-indigo-700 dark:fill-indigo-400 text-[10px] font-bold font-sans"
                      >
                        Çevre (2πr) = {formatTurkishNumber(circPerimeter)} br
                      </text>
                    ) : (
                      <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        className="fill-purple-700 dark:fill-purple-400 text-[10px] font-bold font-sans"
                      >
                        r = {formatTurkishNumber(radius)} br | A = {formatTurkishNumber(circArea)} br²
                      </text>
                    )}
                  </g>
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
              <g
                key={ang.id}
                onMouseDown={(e) => handleObjectMouseDown(e, ang)}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
              >
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
                {showDetails && (
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
                )}
              </g>
            );
          })}

        {/* 7. DOĞRULAR, IŞINLAR VE DOĞRU PARÇALARI KATMANI */}
        {objects
          .filter((o) => ['segment', 'line', 'ray'].includes(o.type) && o.visible)
          .map((obj) => {
            const isSelected = selectedObjectIds.includes(obj.id);

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
                <g
                  key={seg.id}
                  onMouseDown={(e) => handleObjectMouseDown(e, seg)}
                  className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
                >
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={isSelected ? '#ec4899' : seg.color || '#0284c7'}
                    strokeWidth={isSelected ? (seg.thickness || 2.5) + 1.5 : seg.thickness || 2.5}
                    strokeLinecap="round"
                    className="hover:opacity-80 transition-all"
                  />
                  {seg.showLength && showDetails && (() => {
                    const unit = seg.unit || (seg.label?.includes('cm') ? 'cm' : 'br');
                    return (
                      <g className="pointer-events-none">
                        <rect
                          x={midpointScreen.x - 26}
                          y={midpointScreen.y - 18}
                          width={52}
                          height={20}
                          rx={6}
                          className="fill-background/95 stroke-border/80 shadow-xs"
                          strokeWidth={1}
                        />
                        <text
                          x={midpointScreen.x}
                          y={midpointScreen.y - 4}
                          textAnchor="middle"
                          className="fill-foreground font-bold text-[11px]"
                        >
                          {formatTurkishNumber(length)} {unit}
                        </text>
                      </g>
                    );
                  })()}
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
                <g
                  key={line.id}
                  onMouseDown={(e) => handleObjectMouseDown(e, line)}
                  className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
                >
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={isSelected ? '#ec4899' : line.color || '#0284c7'}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {line.showEquation && showDetails && (
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
                <g
                  key={ray.id}
                  onMouseDown={(e) => handleObjectMouseDown(e, ray)}
                  className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
                >
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={isSelected ? '#ec4899' : ray.color || '#0284c7'}
                    strokeWidth={isSelected ? 3 : 2}
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
            const isSelected = selectedObjectIds.includes(pt.id);
            const isPending = pendingPointIds.includes(pt.id);

            // Sade modda harfler ve noktalar gizlenir
            if (isSade && !isSelected && !isPending && !['point', 'measure_distance', 'unit_measure'].includes(activeTool)) {
              return null;
            }

            return (
              <g
                key={pt.id}
                className="cursor-grab active:cursor-grabbing group select-none"
                onMouseDown={(e) => handleObjectMouseDown(e, pt)}
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

                {/* Nokta Gövdesi (Sade modda seçili değilse gizli) */}
                {(!isSade || isSelected || isPending || activeTool === 'point') && (
                  <circle
                    cx={sPos.x}
                    cy={sPos.y}
                    r={(pt.size || 6) + (isSelected ? 1.5 : 0)}
                    fill={pt.color || '#2563eb'}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all pointer-events-none drop-shadow-sm"
                  />
                )}

                {/* Nokta Etiketi (Harf) ve Koordinat (Sade modda tamamen gizli) */}
                {pt.showLabel && !isSade && (
                  <text
                    x={sPos.x + 10}
                    y={sPos.y - 10}
                    className="fill-foreground font-bold text-xs select-none pointer-events-none drop-shadow"
                  >
                    {pt.label}
                    {viewport.showCoordinates && showDetails && (
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
            const isSelected = selectedObjectIds.includes(stroke.id);

            return (
              <g
                key={stroke.id}
                onMouseDown={(e) => handleObjectMouseDown(e, stroke)}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
              >
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
            const isSelected = selectedObjectIds.includes(frac.id);
            const n = frac.numerator ?? 1;
            const d = frac.denominator ?? 1;

            // Daire dilimleri oluştur
            const slices = [];
            if (d <= 1) {
              const isFilled = n >= 1;
              slices.push(
                <circle
                  key="slice-full"
                  cx={center.x}
                  cy={center.y}
                  r={rPx}
                  fill={isFilled ? frac.color || '#8b5cf6' : '#ffffff'}
                  fillOpacity={isFilled ? 0.45 : 0.8}
                  stroke={frac.color || '#8b5cf6'}
                  strokeWidth={1.5}
                />
              );
            } else {
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
            }

            return (
              <g
                key={frac.id}
                onMouseDown={(e) => handleObjectMouseDown(e, frac)}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer select-none'}
              >
                {slices}
                <circle
                  cx={center.x}
                  cy={center.y}
                  r={rPx}
                  fill="none"
                  stroke={isSelected ? '#ec4899' : frac.color || '#8b5cf6'}
                  strokeWidth={isSelected ? 3 : 2}
                />
                {showDetails && (
                  <g className="pointer-events-none drop-shadow-sm select-none">
                    <rect
                      x={center.x - 30}
                      y={center.y + rPx + 8}
                      width={60}
                      height={26}
                      rx={8}
                      fill="#0f172a"
                      fillOpacity={0.94}
                      stroke={frac.color || '#8b5cf6'}
                      strokeWidth={1.2}
                    />
                    <text
                      x={center.x}
                      y={center.y + rPx + 25}
                      textAnchor="middle"
                      fill="#ffffff"
                      className="font-black text-xs font-mono tracking-wide"
                    >
                      {n}/{d}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

        {/* 11. METİN VE NOTLAR KATMANI */}
        {objects
          .filter((o) => o.type === 'text' && o.visible)
          .map((obj) => {
            const txt = obj as TextObject;
            const sPos = worldToScreen({ x: txt.x, y: txt.y }, viewport);
            const isSelected = selectedObjectIds.includes(txt.id);
            const fontSize = txt.fontSize || 14;
            const textWidth = Math.max(70, txt.text.length * (fontSize * 0.62) + 28);
            const textHeight = fontSize + 16;

            return (
              <g
                key={txt.id}
                onMouseDown={(e) => handleObjectMouseDown(e, txt)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingTextObj(txt);
                  setPendingTextWorldPos({ x: txt.x, y: txt.y });
                  setIsTextDialogOpen(true);
                }}
                className={activeTool === 'select' ? 'cursor-move select-none group/txt' : 'cursor-pointer select-none group/txt'}
              >
                {/* Not Arka Plan Kartı */}
                <rect
                  x={sPos.x - 10}
                  y={sPos.y - textHeight + 6}
                  width={textWidth}
                  height={textHeight}
                  rx={8}
                  fill={isSelected ? '#eff6ff' : '#ffffff'}
                  stroke={isSelected ? '#2563eb' : '#cbd5e1'}
                  strokeWidth={isSelected ? 2 : 1.2}
                  className="shadow-xs transition-all group-hover/txt:stroke-blue-400 dark:fill-slate-800 dark:stroke-slate-700"
                />

                {/* Not Metni */}
                <text
                  x={sPos.x}
                  y={sPos.y}
                  fill={txt.color || '#1e293b'}
                  fontSize={fontSize}
                  className="font-bold font-sans dark:fill-slate-100"
                >
                  {txt.text}
                </text>

                {/* Düzenleme Kalem İkonu (Hover'da Görünür) */}
                <g
                  transform={`translate(${sPos.x + textWidth - 24}, ${sPos.y - textHeight + 10})`}
                  className="opacity-0 group-hover/txt:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTextObj(txt);
                    setPendingTextWorldPos({ x: txt.x, y: txt.y });
                    setIsTextDialogOpen(true);
                  }}
                >
                  <circle cx="6" cy="6" r="8" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1" />
                  <text x="6" y="9.5" textAnchor="middle" fontSize="9" className="font-sans">
                    ✏️
                  </text>
                </g>
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
            const isSelected = selectedObjectIds.includes(img.id);

            return (
              <g
                key={img.id}
                onMouseDown={(e) => handleObjectMouseDown(e, img)}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer select-none'}
              >
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

        {/* 13. CANLI ÖLÇÜM ÖNİZLEMESİ (Uzunluk Ölç / Birimle Ölç) */}
        {['measure_distance', 'unit_measure'].includes(activeTool) && pendingPointIds.length === 1 && (() => {
          const p1 = objects.find((o) => o.id === pendingPointIds[0]) as PointObject | undefined;
          if (!p1) return null;
          const s1 = worldToScreen(p1, viewport);
          const s2 = worldToScreen(mouseWorldPos, viewport);
          const dist = calculateDistance(p1, mouseWorldPos);
          const isCm = activeTool === 'measure_distance';
          const midX = (s1.x + s2.x) / 2;
          const midY = (s1.y + s2.y) / 2;

          return (
            <g className="pointer-events-none measurement-live-preview">
              {/* 1. Nokta Vurgu Halkası */}
              <circle
                cx={s1.x}
                cy={s1.y}
                r={16}
                fill="none"
                stroke={isCm ? '#0284c7' : '#059669'}
                strokeWidth={2.5}
                strokeDasharray="3,3"
                className="animate-spin"
              />
              {/* Canlı Ölçüm Çizgisi */}
              <line
                x1={s1.x}
                y1={s1.y}
                x2={s2.x}
                y2={s2.y}
                stroke={isCm ? '#0284c7' : '#059669'}
                strokeWidth={2.5}
                strokeDasharray="5,4"
              />
              {/* Çizgi Uç Çentikleri */}
              <circle cx={s2.x} cy={s2.y} r={4} fill={isCm ? '#0284c7' : '#059669'} stroke="#ffffff" strokeWidth={1.5} />
              {/* Canlı Ölçüm Rozeti */}
              <g transform={`translate(${midX}, ${midY - 14})`}>
                <rect
                  x="-36"
                  y="-12"
                  width="72"
                  height="24"
                  rx="7"
                  fill="#0f172a"
                  fillOpacity="0.95"
                  stroke={isCm ? '#38bdf8' : '#34d399'}
                  strokeWidth="1.2"
                  className="shadow-md"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#ffffff"
                  className="font-bold text-xs font-sans tracking-wide"
                >
                  {formatTurkishNumber(dist)} {isCm ? 'cm' : 'br'}
                </text>
              </g>
            </g>
          );
        })()}

        {/* SEÇİM ALANI / KUTUYLA ÇOKLU SEÇİM MARQUEE KATMANI */}
        {selectionMarquee && (() => {
          const s1 = worldToScreen(selectionMarquee.startWorld, viewport);
          const s2 = worldToScreen(selectionMarquee.currentWorld, viewport);
          const boxX = Math.min(s1.x, s2.x);
          const boxY = Math.min(s1.y, s2.y);
          const boxW = Math.abs(s1.x - s2.x);
          const boxH = Math.abs(s1.y - s2.y);

          return (
            <g className="pointer-events-none marquee-selection-box">
              <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={boxH}
                fill="#3b82f6"
                fillOpacity={0.12}
                stroke="#2563eb"
                strokeWidth={1.5}
                strokeDasharray="5,4"
                rx={4}
              />
              {selectedObjectIds.length > 0 && boxW > 40 && boxH > 40 && (
                <g transform={`translate(${boxX + boxW / 2}, ${Math.max(16, boxY - 14)})`}>
                  <rect
                    x="-50"
                    y="-11"
                    width="100"
                    height="22"
                    rx="6"
                    fill="#1e293b"
                    fillOpacity="0.95"
                    stroke="#3b82f6"
                    strokeWidth="1"
                    className="shadow-md"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    className="font-bold text-[10px] font-sans"
                  >
                    ✨ {selectedObjectIds.length} nesne seçildi
                  </text>
                </g>
              )}
            </g>
          );
        })()}

        {/* 14. İNTERAKTİF ÖLÇME ARAÇLARI KATMANI (Açıölçer / İletki, Cetvel, Gönye, Alan Modeli) */}
        <MeasurementInstruments
          activeTool={activeTool}
          viewport={viewport}
          onAddPolygonFromAreaModel={(pos, cols, rows) => {
            const x1 = pos.x;
            const y1 = pos.y;
            const x2 = pos.x + cols;
            const y2 = pos.y - rows;

            const p1: PointObject = { id: `pt-${Date.now()}`, type: 'point', label: 'A', showLabel: true, x: x1, y: y1, color: '#10b981', visible: true, isIndependent: true, createdAt: Date.now() };
            const p2: PointObject = { id: `pt-${Date.now() + 1}`, type: 'point', label: 'B', showLabel: true, x: x2, y: y1, color: '#10b981', visible: true, isIndependent: true, createdAt: Date.now() + 1 };
            const p3: PointObject = { id: `pt-${Date.now() + 2}`, type: 'point', label: 'C', showLabel: true, x: x2, y: y2, color: '#10b981', visible: true, isIndependent: true, createdAt: Date.now() + 2 };
            const p4: PointObject = { id: `pt-${Date.now() + 3}`, type: 'point', label: 'D', showLabel: true, x: x1, y: y2, color: '#10b981', visible: true, isIndependent: true, createdAt: Date.now() + 3 };

            const poly: PolygonObject = {
              id: `poly-${Date.now() + 4}`,
              type: 'polygon',
              label: `Alan Modeli (${cols}x${rows})`,
              showLabel: true,
              pointIds: [p1.id, p2.id, p3.id, p4.id],
              color: '#059669',
              fillColor: '#10b981',
              fillOpacity: 0.22,
              visible: true,
              showArea: true,
              showPerimeter: true,
              createdAt: Date.now() + 4,
            };

            addObject(p1);
            addObject(p2);
            addObject(p3);
            addObject(p4);
            addObject(poly, `Alan Modeli (${cols}x${rows} = ${cols * rows} br²) oluşturuldu`);
          }}
        />
      </svg>

      {/* 🪞 YANSITMA VE SİMETRİ EKSENİ SEÇİM ÇUBUĞU */}
      {['reflect', 'symmetry'].includes(activeTool) && (() => {
        const targetPoly = (reflectTargetPolyId
          ? objects.find((o) => o.id === reflectTargetPolyId)
          : selectedObjectId
          ? objects.find((o) => o.id === selectedObjectId && o.type === 'polygon')
          : objects.find((o) => o.type === 'polygon')) as PolygonObject | undefined;

        return (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-card/95 backdrop-blur-md text-white border border-purple-500/40 shadow-2xl px-5 py-3 rounded-2xl flex flex-col md:flex-row items-center gap-3.5 z-30 select-none animate-in slide-in-from-top-3 duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs font-bold text-purple-200">
                {targetPoly
                  ? `🪞 "${targetPoly.label || 'Çokgen'}" için simetri ekseni seçin:`
                  : '🪞 Yansıtılacak şekli veya simetri eksenini seçin:'}
              </span>
            </div>

            {/* Hızlı Eksen Seçim Düğmeleri */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (targetPoly) {
                    reflectPolygonAcrossSymmetryLine(targetPoly, { x: 0, y: 0 }, { x: 1, y: 0 }, 'x Ekseni');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>↔</span>
                <span>x Eksenine Göre</span>
              </button>

              <button
                onClick={() => {
                  if (targetPoly) {
                    reflectPolygonAcrossSymmetryLine(targetPoly, { x: 0, y: 0 }, { x: 0, y: 1 }, 'y Ekseni');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>↕</span>
                <span>y Eksenine Göre</span>
              </button>

              <button
                onClick={() => {
                  if (targetPoly) {
                    reflectPolygonAcrossSymmetryLine(targetPoly, { x: 0, y: 0 }, { x: 1, y: 1 }, 'y = x Doğrusu');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>↗</span>
                <span>y = x Doğrusu</span>
              </button>

              <button
                onClick={() => {
                  if (targetPoly) {
                    reflectPolygonAcrossSymmetryLine(targetPoly, { x: 0, y: 0 }, { x: 1, y: -1 }, 'y = -x Doğrusu');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>↘</span>
                <span>y = -x Doğrusu</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* 4. AÇIÖLÇER VE ÖLÇÜM REHBER KAPSÜLÜ */}
      {['measure_angle', 'angle', 'measure_distance', 'measure_area', 'measure_perimeter', 'unit_measure', 'area_model', 'ruler', 'setsquare', 'rotate', 'reflect', 'symmetry'].includes(activeTool) && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-card/95 backdrop-blur-md text-white border border-border shadow-2xl px-4 py-2.5 rounded-2xl flex items-center gap-3 z-30 select-none animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black">
              {activeTool === 'measure_angle' && '📐 Açıölçer: Açıyı ölçmek için gövdeyi taşıyın veya turuncu ibreyi sürükleyin.'}
              {activeTool === 'angle' && `📐 Açı Oluştur: 3 nokta seçin (${pendingPointIds.length}/3 seçildi).`}
              {activeTool === 'measure_distance' && `📏 Uzunluk Ölç (cm): 2 köşe/nokta veya doğru parçası seçin (${pendingPointIds.length}/2 seçildi).`}
              {activeTool === 'measure_area' && '🟩 Alanı Bul: Alanını görmek istediğiniz çokgene veya şekle dokunun.'}
              {activeTool === 'measure_perimeter' && '🔄 Çevre Tahmin: Çevresini görmek istediğiniz çokgene dokunun.'}
              {activeTool === 'unit_measure' && `🔢 Birimle Ölç (br): 2 köşe/nokta veya doğru parçası seçin (${pendingPointIds.length}/2 seçildi).`}
              {activeTool === 'area_model' && '🟩 Alanı Modelle: Mavi tutamaçtan çekerek satır ve sütunları boyutlandırın veya modeli sürükleyin.'}
              {activeTool === 'ruler' && '📏 Cetvel: Gövdeden tutarak taşıyın, sağ kenardaki turuncu tutamaçtan çekerek uzunluğunu ayarlayın.'}
              {activeTool === 'setsquare' && '📐 Gönye: Gövdeden tutarak taşıyın ve dik açıları inceleyin.'}
              {activeTool === 'rotate' && '🔄 Şekli Döndür: Şeklin üzerindeki üniversel döndür ikonunu (🔄) basılı tutarak sürükleyin veya altındaki hazır derecelere (30°, 45°, 60°, 90°...) tıklayın.'}
              {['reflect', 'symmetry'].includes(activeTool) && '🪞 Yansıtma: Yansıtılacak şekli seçin, ardından tuvaldeki bir doğruya veya yukarıdaki eksen düğmelerine (x / y / y=x) tıklayın.'}
            </span>
          </div>

          {pendingPointIds.length > 0 && (
            <button
              onClick={cancelPendingAction}
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              ✕ Temizle
            </button>
          )}
        </div>
      )}

      {/* 5. ÇOKGEN OLUŞTURMA YARDIMCI VE TAMAMLAMA KAPSÜLÜ */}
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

      {/* 6. ÇOKLU SEÇİM EYLEM KAPSÜLÜ (2D) */}
      {selectedObjectIds.length > 0 && activeTool === 'select' && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-card/95 backdrop-blur-md text-white border border-border shadow-2xl px-4 py-2.5 rounded-2xl flex items-center gap-3 z-30 select-none animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-black">
              ✨ {selectedObjectIds.length} nesne seçildi (Taşımak için sürükleyin)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                selectedObjectIds.forEach((id) => deleteObject(id));
                setSelectedObjectIds([]);
                recordHistory(`${selectedObjectIds.length} seçili nesne silindi`);
              }}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Seçilenleri Sil</span>
            </button>

            <button
              onClick={() => setSelectedObjectIds([])}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              ✕ Seçimi Kaldır
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

        {/* 10. Ölçüm ve Ayrıntıları Göster/Gizle (Alan, Uzunluk, Açı vb.) */}
        <button
          onClick={() =>
            setViewport((prev) => ({
              ...prev,
              showMeasurements: prev.showMeasurements === false ? true : false,
            }))
          }
          title={
            viewport.showMeasurements !== false
              ? 'Ayrıntıları Gizle (Alan, Uzunluk, Açı vb.)'
              : 'Ayrıntıları Göster (Alan, Uzunluk, Açı vb.)'
          }
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            viewport.showMeasurements !== false
              ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 ring-1 ring-amber-400/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-bold'
          }`}
        >
          {viewport.showMeasurements !== false ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </button>

        {/* 11. Bölge İsimleri Göster/Gizle (I, II, III, IV) */}
        <button
          onClick={() =>
            setViewport((prev) => ({
              ...prev,
              showQuadrants: !prev.showQuadrants,
            }))
          }
          title={
            viewport.showQuadrants
              ? 'Bölge İsimlerini Gizle (1, 2, 3, 4. Bölge)'
              : 'Bölge İsimlerini Göster (1, 2, 3, 4. Bölge)'
          }
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            viewport.showQuadrants
              ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-400/40 font-black text-[10px]'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-black text-[10px]'
          }`}
        >
          <span>I-IV</span>
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
            if (selectedObjectIds.length > 0) {
              selectedObjectIds.forEach((id) => deleteObject(id));
              setSelectedObjectIds([]);
            }
          }}
          title={
            selectedObjectIds.length > 0
              ? `${selectedObjectIds.length} seçili nesneyi sil`
              : 'Silmek için önce nesne seçin'
          }
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            selectedObjectIds.length > 0
              ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
              : 'text-red-400/60 hover:bg-red-50/50'
          }`}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>

        <div className="w-6 h-px bg-slate-200 dark:bg-slate-700 my-0.5" />

        {/* 12. Tümünü Sil (Tüm Ekranı Temizle) */}
        <button
          onClick={() => requestClearAll('2D')}
          title="Tümünü Sil (Tüm ekranı ve şekilleri temizle)"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer text-rose-600 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 hover:shadow-md hover:shadow-rose-500/30 group"
        >
          <Eraser className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      </div>

      {/* 6. YAZI VE MATEMATİK NOTU DÜZENLEME DİYALOĞU */}
      <TextNoteDialog
        isOpen={isTextDialogOpen}
        onClose={() => {
          setIsTextDialogOpen(false);
          setEditingTextObj(null);
        }}
        initialText={editingTextObj?.text || ''}
        initialColor={editingTextObj?.color || '#0f172a'}
        initialFontSize={editingTextObj?.fontSize || 14}
        onSave={(text, color, fontSize) => {
          if (editingTextObj) {
            updateObject(editingTextObj.id, { text, color, fontSize });
          } else if (pendingTextWorldPos) {
            const newTextObj: TextObject = {
              id: `txt-${Date.now()}`,
              type: 'text',
              label: text.slice(0, 20),
              showLabel: true,
              text,
              x: pendingTextWorldPos.x,
              y: pendingTextWorldPos.y,
              fontSize,
              color,
              visible: true,
              createdAt: Date.now(),
            };
            addObject(newTextObj, `"${text}" notu eklendi`);
          }
          setIsTextDialogOpen(false);
          setEditingTextObj(null);
        }}
        onDelete={
          editingTextObj
            ? () => {
                deleteObject(editingTextObj.id);
                setIsTextDialogOpen(false);
                setEditingTextObj(null);
              }
            : undefined
        }
      />
    </div>
  );
}
