'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useWorkspace, createId, DEFAULT_ZOOM } from '@/state/WorkspaceContext';
import { useCurriculum } from '@/state/CurriculumContext';
import {
  MathObject,
  PointObject,
  SegmentObject,
  LineObject,
  RayObject,
  CircleObject,
  ArcObject,
  SectorObject,
  AngleObject,
  PolygonObject,
  FunctionObject,
  SliderObject,
  FractionObject,
  PenStrokeObject,
  TextObject,
  ImageObject,
  Point2D,
  EllipseObject,
  CheckboxObject,
  ButtonObject,
  InputBoxObject,
  MeasurementObject,
  MeasurementKind,
  edgeLabelKey,
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
import { ToolCursor } from './ToolCursor';
import { TextNoteDialog } from './TextNoteDialog';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { useSliderPlayback } from '@/hooks/useSliderPlayback';
import { Solid3DObject, Point3D } from '@/types/workspace3d';
import { projectSolidFor2D, SolidProjectionMode } from '@/math/solidProjection2D';

/** Etiketi olmayan nesneler için menü başlığında gösterilecek tür adları. */
/** 'distance' ölçüm etiketinin yazısı: "|AP| = 2 br". */
function mesafeEtiketMetni(a: PointObject, b: PointObject): string {
  return `|${a.label}${b.label}| = ${formatTurkishNumber(calculateDistance(a, b))} br`;
}

const TYPE_LABELS: Record<string, string> = {
  point: 'Nokta',
  segment: 'Doğru Parçası',
  line: 'Doğru',
  ray: 'Işın',
  circle: 'Çember',
  ellipse: 'Elips',
  arc: 'Yay',
  sector: 'Daire Dilimi',
  angle: 'Açı',
  polygon: 'Çokgen',
  function: 'Fonksiyon',
  slider: 'Sürgü',
  fraction: 'Kesir Modeli',
  pen: 'Serbest Çizim',
  text: 'Metin Notu',
  image: 'Görsel',
};
import { isAnyModalOpen } from '@/components/ui/modalState';
import { objectDependencies } from '@/state/WorkspaceContext';
import { RotateGizmo } from '@/components/workspace/RotateGizmo';
import {
  CanvasCheckbox,
  CanvasButton,
  CanvasInputBox,
  sliderDegerMetni,
} from '@/components/workspace/CanvasWidgets';
import {
  calculateDistance,
  findNearestEdgeIndex,
  calculateAngleDegrees,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateLineEquation,
  calculateCircleArea,
  calculateCircleCircumference,
  calculateEllipseArea,
  calculateEllipsePerimeter,
  calculateSlope,
  rightTriangleRatios,
  angleTrigRatios,
  calculateCircumcircle,
  intersectLines,
  intersectLineCircle,
  intersectCircles,
  intersectLineEllipse,
  closestPointOnPolygonEdge,
  distanceToSegment,
  getArcGeometry,
  calculateArcLength,
  calculateSectorArea,
  reflectPointAcrossLine,
  generateNextPointLabels,
} from '@/math/geometry';
import { compileMathExpression } from '@/math/parser';
import { copyObjects, pasteObjects, ObjectClipboard } from '@/math/objectClipboard';
import { contextMenuSelection } from './contextMenuSelection';
import { pointLockCandidates, isPointLocked } from '@/math/pointLock';
import { pointAngleAction } from '@/math/pointAngles';
import {
  distanceLabelLevel,
  isLengthShown,
  lengthOptionsAtPoint,
  samePair,
  straightEnds,
  straightLengthOptions,
  type LengthOption,
} from '@/math/partialLengths';
import {
  Grid,
  Contrast,
  Magnet,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Hand,
  MousePointer,
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
  ChevronDown,
  GripVertical,
  GripHorizontal,
} from 'lucide-react';

// Derlenmiş fonksiyon ifadeleri önbelleği (ifade başına tek derleme)
const compiledExpressionCache = new Map<string, ((x: number, scope?: Record<string, number>) => number) | null>();
const getCompiledExpression = (expression: string) => {
  if (compiledExpressionCache.has(expression)) return compiledExpressionCache.get(expression) ?? null;
  let compiled: ((x: number, scope?: Record<string, number>) => number) | null = null;
  try {
    compiled = compileMathExpression(expression);
  } catch (e) {
    compiled = null;
  }
  if (compiledExpressionCache.size > 200) compiledExpressionCache.clear();
  compiledExpressionCache.set(expression, compiled);
  return compiled;
};

// Çoklu Seçim Kutusu ile Kesişim / İçerilme Kontrolü
const isObjectInMarquee = (
  obj: MathObject,
  pointsById: Map<string, PointObject>,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): boolean => {
  const inside = (p: Point2D | undefined) =>
    !!p && p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;

  if (obj.type === 'point') {
    return inside(obj as PointObject);
  }
  if (obj.type === 'ellipse') {
    return inside(pointsById.get((obj as EllipseObject).centerPointId));
  }
  if (obj.type === 'arc' || obj.type === 'sector') {
    // Yay ve daire dilimi merkezinden yakalanır; üç tanım noktasından biri kutuya girse de yeter
    const sh = obj as ArcObject | SectorObject;
    return [sh.centerPointId, sh.startPointId, sh.directionPointId].some((id) =>
      inside(pointsById.get(id))
    );
  }
  if (obj.type === 'polygon') {
    const poly = obj as PolygonObject;
    const pts = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
    if (pts.length === 0) return false;
    if (pts.some(inside)) return true;
    const avgX = pts.reduce((acc, p) => acc + p.x, 0) / pts.length;
    const avgY = pts.reduce((acc, p) => acc + p.y, 0) / pts.length;
    return inside({ x: avgX, y: avgY });
  }
  if (obj.type === 'segment') {
    const seg = obj as SegmentObject;
    const p1 = pointsById.get(seg.startPointId);
    const p2 = pointsById.get(seg.endPointId);
    if (!p1 || !p2) return false;
    return inside(p1) || inside(p2) || inside({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
  }
  if (obj.type === 'line') {
    const line = obj as LineObject;
    return inside(pointsById.get(line.point1Id)) || inside(pointsById.get(line.point2Id));
  }
  if (obj.type === 'ray') {
    const ray = obj as RayObject;
    return inside(pointsById.get(ray.startPointId)) || inside(pointsById.get(ray.throughPointId));
  }
  if (obj.type === 'circle') {
    const circ = obj as CircleObject;
    return inside(pointsById.get(circ.centerPointId));
  }
  if (obj.type === 'angle') {
    const ang = obj as AngleObject;
    return inside(pointsById.get(ang.vertexPointId));
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
  solids?: Solid3DObject[];
  selectedSolidId?: string | null;
  selectedSolidIds?: string[];
  onSelectSolid?: (id: string | null) => void;
  onSelectSolids?: (ids: string[]) => void;
  onUpdateSolidPosition?: (id: string, pos: Point3D) => void;
  onDeleteSolid?: (id: string) => void;
  onDragEnd?: () => void;
}

export function Canvas({
  onSwitchTo3D,
  solids = [],
  selectedSolidId = null,
  selectedSolidIds = [],
  onSelectSolid,
  onSelectSolids,
  onUpdateSolidPosition,
  onDeleteSolid,
  onDragEnd,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { selectedLevel, selectedGrade, isFreeSandbox, selectedActivity } = useCurriculum();
  const isPrimary = selectedLevel?.id === 'ilkokul' || (selectedGrade && selectedGrade.gradeNumber <= 4);

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
    deleteObject,
    deleteObjects,
    moveObjects,
    recordHistory,
    addObject,
    addObjects,
    updateObject,
    commit,
    studioDimension,
    setStudioDimension,
    undo,
    redo,
    canUndo,
    canRedo,
    cancelPendingAction,
    requestClearAll,
    hintMessage,
    setHintMessage,
    isConfirmClearOpen,
    isRegularPolygonDialogOpen,
    handleSliderChange,
    setSliderValues,
    measureLength,
    measureArea,
    measurePerimeter,
    measureAngleAtPoint,
    measureArcAngle,
    hideMeasurement,
    setLabelOffset,
    measureArcLength,
    styleSettings,
    splitPolygon,
    splitSegmentAtPoint,
    splitCircleAtPoints,
    splitArcAtPoint,
    toggleCheckbox,
    runButton,
    applyInputBox,
    connectPoints,
    disconnectPoints,
    fitPolynomialToPoints,
    togglePolygonEdgeLabel,
    setAllPolygonEdgeLabels,
    toggleAngleReflex,
    setSegmentLength,
    setAngleDegrees,
    bindAngleToSlider,
    unbindAngleFromSlider,
    setCircleRadius,
    setLengthMeasurement,
  } = useWorkspace();

  // Görsel dosyası seçimi (Görsel Ekle aracı)
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageWorldPosRef = useRef<Point2D | null>(null);

  // Sağ tık bağlam menüsü hedefi (nesne + ekran konumu)
  const [contextTarget, setContextTarget] = useState<{
    obj: MathObject | null;
    x: number;
    y: number;
    /** Çokgene sağ tıklandıysa imlece EN YAKIN kenarın dizini (yoksa null). */
    edgeIndex: number | null;
  } | null>(null);
  const [objectClipboard, setObjectClipboard] = useState<ObjectClipboard | null>(null);
  // Dokunmatik uzun basma durumu
  const longPressRef = useRef<{ timer: number; startX: number; startY: number; obj: MathObject } | null>(null);

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
    // Izgaraya yapıştırma için referans (çapa) nokta: sürüklenen ilk noktanın kimliği ve tutma ofseti
    anchorId: string | null;
    anchorOffset: Point2D;
    /** Çapanın kilit olmasaydı bulunacağı yer (son hedef): seçimin geri kalanı farenin gerçek adımını buradan alır. */
    virtualAnchor?: Point2D | null;
  } | null>(null);

  const [draggingSolidState, setDraggingSolidState] = useState<{
    solidId: string;
    startWorld: Point2D;
    initialPos: Point3D;
    hasMoved: boolean;
  } | null>(null);
  const [solidProjectionMode, setSolidProjectionMode] = useState<SolidProjectionMode>('top');
  const [selectionMarquee, setSelectionMarquee] = useState<{
    startWorld: Point2D;
    currentWorld: Point2D;
    // Shift/Ctrl ile başlatılan kutu seçiminde korunacak mevcut seçim
    baseIds: string[];
  } | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState<Point2D>({ x: 0, y: 0 });
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Sürükleyerek Şekil Boyutlandırma ve Oluşturma Durumu
  const [dragCreateStart, setDragCreateStart] = useState<Point2D | null>(null);

  // Yüzen Hızlı Menü Kenar Konumu (alt, sol, sağ, üst)
  type DockPosition = 'right' | 'left' | 'bottom' | 'top';
  const [dockPosition, setDockPosition] = useState<DockPosition>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('geoeba_canvas_dock_pos');
      if (saved === 'left' || saved === 'right' || saved === 'bottom' || saved === 'top') return saved;
    }
    return 'right';
  });
  const [isDraggingDock, setIsDraggingDock] = useState(false);
  const [dockPreview, setDockPreview] = useState<DockPosition | null>(null);

  const cycleDockPosition = useCallback(() => {
    setDockPosition((prev) => {
      const next: DockPosition =
        prev === 'right' ? 'bottom' : prev === 'bottom' ? 'left' : prev === 'left' ? 'top' : 'right';
      if (typeof window !== 'undefined') localStorage.setItem('geoeba_canvas_dock_pos', next);
      return next;
    });
  }, []);

  const handleDockDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDock(true);

    const onPointerMove = (moveEv: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, moveEv.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, moveEv.clientY - rect.top));
      const relX = x / rect.width;
      const relY = y / rect.height;

      const distLeft = relX;
      const distRight = 1 - relX;
      const distTop = relY;
      const distBottom = 1 - relY;
      const minDist = Math.min(distLeft, distRight, distTop, distBottom);

      let target: DockPosition = 'right';
      if (minDist === distLeft) target = 'left';
      else if (minDist === distRight) target = 'right';
      else if (minDist === distTop) target = 'top';
      else if (minDist === distBottom) target = 'bottom';

      setDockPreview(target);
    };

    const onPointerUp = (upEv: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setIsDraggingDock(false);

      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, upEv.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, upEv.clientY - rect.top));
        const relX = x / rect.width;
        const relY = y / rect.height;

        const distLeft = relX;
        const distRight = 1 - relX;
        const distTop = relY;
        const distBottom = 1 - relY;
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        let finalPos: DockPosition = 'right';
        if (minDist === distLeft) finalPos = 'left';
        else if (minDist === distRight) finalPos = 'right';
        else if (minDist === distTop) finalPos = 'top';
        else if (minDist === distBottom) finalPos = 'bottom';

        setDockPosition(finalPos);
        if (typeof window !== 'undefined') localStorage.setItem('geoeba_canvas_dock_pos', finalPos);
      }
      setDockPreview(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, []);
  const [dragCreateCurrent, setDragCreateCurrent] = useState<Point2D | null>(null);
  const [rotatingFeedback, setRotatingFeedback] = useState<{ shapeId: string; deg: number } | null>(null);
  const [reflectTargetPolyId, setReflectTargetPolyId] = useState<string | null>(null);
  const [reflectAxisLine, setReflectAxisLine] = useState<{ id: string; p1: Point2D; p2: Point2D; name: string } | null>(null);

  // Serbest Çizim (Kalem) Durumu
  const [isDrawingPen, setIsDrawingPen] = useState(false);
  const [currentPenStroke, setCurrentPenStroke] = useState<Point2D[]>([]);

  // 2D üst seçenekler: düzlem ve ayrıntı görünümü
  const [planeType, setPlaneType] = useState<'dik_koordinat' | 'kareli_duzlem' | 'bos_duzlem'>('dik_koordinat');
  const [styleMode, setStyleMode] = useState<'Sade' | 'Ayrıntılı'>('Ayrıntılı');
  const [openDropdown, setOpenDropdown] = useState<'plane' | 'style' | null>(null);

  useEffect(() => {
    const show = () => setStyleMode('Ayrıntılı');
    window.addEventListener('geoeba:show-measurements', show);
    return () => window.removeEventListener('geoeba:show-measurements', show);
  }, []);

  // Yazılı komut: "sade görünüm" / "ayrıntılı görünüm" — açılır menüdeki seçimle aynı etki
  useEffect(() => {
    const onStyleMode = (event: Event) => {
      const mode = (event as CustomEvent<unknown>).detail;
      if (mode !== 'Sade' && mode !== 'Ayrıntılı') return;
      setStyleMode(mode);
      setViewport((prev) => mode === 'Sade'
        ? { ...prev, showCoordinates: false, showMeasurements: false }
        : { ...prev, showMeasurements: true });
    };
    window.addEventListener('geoeba:style-mode', onStyleMode);
    return () => window.removeEventListener('geoeba:style-mode', onStyleMode);
  }, [setViewport]);

  // Yazılı komut: "kareli düzlem", "boş düzlem", "dik koordinat sistemi" — açılır menüdeki seçimle aynı etki
  useEffect(() => {
    const onPlaneType = (event: Event) => {
      const plane = (event as CustomEvent<unknown>).detail;
      if (plane === 'dik_koordinat') {
        setPlaneType('dik_koordinat');
        setViewport((prev) => ({ ...prev, showGrid: true, showAxes: true }));
      } else if (plane === 'kareli_duzlem') {
        setPlaneType('kareli_duzlem');
        setViewport((prev) => ({ ...prev, showGrid: true, showAxes: false, showCoordinates: false }));
      } else if (plane === 'bos_duzlem') {
        setPlaneType('bos_duzlem');
        setViewport((prev) => ({ ...prev, showGrid: false, showAxes: false, showCoordinates: false }));
      }
    };
    window.addEventListener('geoeba:plane-type', onPlaneType);
    return () => window.removeEventListener('geoeba:plane-type', onPlaneType);
  }, [setViewport]);

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

  /**
   * PERGEL — gerçek pergel gibi çalışır ve ARA NOKTA ÜRETMEZ.
   *
   * 1. Tıklama: iğne (merkez) saplanır.
   * 2. Fare yatayda hareket eder, açıklık (yarıçap) belirlenir; 2. tıklama sabitler.
   * 3. Fare merkez çevresinde döndükçe yay taranır; 3. tıklama çizimi bitirir.
   *    Tam tura ulaşılırsa çember olarak kaydedilir.
   */
  const [pergel, setPergel] = useState<{
    merkez: Point2D;
    /** null iken AÇIKLIK (yarıçap) belirleniyor */
    yaricap: number | null;
    /** null iken yayın BAŞLANGIÇ açısı belirleniyor (radyan, dünya yönü: 0 = sağ, CCW +) */
    baslangic: number | null;
    /**
     * Aşamaya göre: yarıçap, başlangıç açısı ya da TARAMA.
     * Tarama İŞARETLİDİR: pozitif saat yönünün tersi, negatif saat yönü.
     * Böylece kullanıcı yayı istediği yöne çizebilir.
     */
    tarama: number;
    /** Tarama sırasında imlecin bir önceki ham açısı (sürekli toplama için) */
    sonHamAci: number;
  } | null>(null);

  /** Kesiştir aracında tıklanan İLK şeklin kimliği (ikincisi gelince kesişim üretilir) */
  const kesistirIlkRef = useRef<string | null>(null);

  /**
   * Bir şekli "doğru" (iki nokta) veya "çember" (merkez + yarıçap) olarak tanımlar.
   * Kesişim hesabı yalnızca bu iki temsili tanır; elips şu an desteklenmiyor.
   */
  const kesisimBicimi = (
    o: MathObject
  ):
    | { tur: 'dogru'; a: Point2D; b: Point2D; sinirli: boolean }
    | { tur: 'cember'; merkez: Point2D; r: number }
    | { tur: 'elips'; merkez: Point2D; rx: number; ry: number }
    | null => {
    const nk = (id: string) => pointsById.get(id);
    if (o.type === 'segment') {
      const a = nk(o.startPointId);
      const b = nk(o.endPointId);
      return a && b ? { tur: 'dogru', a, b, sinirli: true } : null;
    }
    if (o.type === 'line') {
      const a = nk(o.point1Id);
      const b = nk(o.point2Id);
      return a && b ? { tur: 'dogru', a, b, sinirli: false } : null;
    }
    if (o.type === 'ray') {
      const a = nk(o.startPointId);
      const b = nk(o.throughPointId);
      return a && b ? { tur: 'dogru', a, b, sinirli: false } : null;
    }
    if (o.type === 'circle') {
      const c = o as CircleObject;
      if (c.throughPointIds && c.throughPointIds.length === 3) {
        const [p1, p2, p3] = c.throughPointIds.map(nk);
        if (!p1 || !p2 || !p3) return null;
        const cc = calculateCircumcircle(p1, p2, p3);
        return cc ? { tur: 'cember', merkez: cc.center, r: cc.radius } : null;
      }
      const merkez = nk(c.centerPointId);
      if (!merkez) return null;
      const yari = c.radiusPointId ? nk(c.radiusPointId) : undefined;
      const r = c.fixedRadius ?? (yari ? calculateDistance(merkez, yari) : 0);
      return r > 0 ? { tur: 'cember', merkez, r } : null;
    }
    if (o.type === 'arc' || o.type === 'sector') {
      const merkez = nk(o.centerPointId);
      const bas = nk(o.startPointId);
      if (!merkez || !bas) return null;
      const r = calculateDistance(merkez, bas);
      return r > 0 ? { tur: 'cember', merkez, r } : null;
    }
    if (o.type === 'ellipse') {
      const e = o as EllipseObject;
      const merkez = nk(e.centerPointId);
      if (!merkez) return null;
      return { tur: 'elips', merkez, rx: Math.abs(e.radiusX), ry: Math.abs(e.radiusY) };
    }
    return null;
  };

  /**
   * Pergel çizimini kalıcı nesneye çevirir.
   * Tarama tam tura yakınsa ÇEMBER (yalnızca merkez noktası), değilse YAY üretilir.
   * Yay için uçları temsil eden iki nokta gerekir; bunlar yayın kendi uç noktalarıdır,
   * eski sürümdeki gibi yarıçap ölçmek için kullanılıp ortada kalan artık noktalar değil.
   */
  const pergeliTamamla = (merkez: Point2D, yaricap: number, baslangic: number, tarama: number) => {
    const TAM_TUR_ESIGI = 0.12; // ~7°: bu kadar yaklaşınca tam çember sayılır
    const mutlakTarama = Math.abs(tarama);
    const tamTur = mutlakTarama < TAM_TUR_ESIGI || mutlakTarama > 2 * Math.PI - TAM_TUR_ESIGI;
    const labels = existingPointLabels();

    if (tamTur) {
      const [ad] = generateNextPointLabels(labels, 1);
      const merkezNokta: PointObject = {
        id: createId('pt'),
        type: 'point',
        label: ad,
        showLabel: true,
        x: merkez.x,
        y: merkez.y,
        color: '#8b5cf6',
        visible: true,
        isIndependent: true,
        createdAt: Date.now(),
      };
      const cember: CircleObject = {
        id: createId('circ'),
        type: 'circle',
        label: `${ad} Merkezli Çember`,
        showLabel: true,
        centerPointId: merkezNokta.id,
        fixedRadius: yaricap,
        color: '#8b5cf6',
        fillOpacity: 0,
        visible: true,
        createdAt: Date.now(),
      };
      addObjects([merkezNokta, cember], `Pergelle çember çizildi (r = ${formatTurkishNumber(yaricap)} br)`);
      setHintMessage(`Çember tamamlandı: r = ${formatTurkishNumber(yaricap)} br`);
      return;
    }

    const [adM, adB, adS] = generateNextPointLabels(labels, 3);
    const nokta = (ad: string, x: number, y: number): PointObject => ({
      id: createId('pt'),
      type: 'point',
      label: ad,
      showLabel: true,
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      color: '#8b5cf6',
      visible: true,
      isIndependent: true,
      createdAt: Date.now(),
    });
    const m = nokta(adM, merkez.x, merkez.y);
    // Yay nesnesi her zaman saat yönünün TERSİNE taranır. Kullanıcı saat yönünde
    // çizdiyse (tarama < 0) uçları yer değiştiririz; böylece ekranda gördüğü yay
    // ile kaydedilen yay birebir aynı olur.
    const acilar =
      tarama >= 0 ? [baslangic, baslangic + tarama] : [baslangic + tarama, baslangic];
    const uc = (ad: string, a: number) =>
      nokta(ad, merkez.x + yaricap * Math.cos(a), merkez.y + yaricap * Math.sin(a));
    const bas = uc(adB, acilar[0]);
    const bit = uc(adS, acilar[1]);
    const yay: ArcObject = {
      id: createId('arc'),
      type: 'arc',
      label: `${adB}${adS} Yayı`,
      showLabel: true,
      centerPointId: m.id,
      startPointId: bas.id,
      directionPointId: bit.id,
      thickness: 3,
      color: '#8b5cf6',
      showArcLength: true,
      visible: true,
      createdAt: Date.now(),
    };
    const derece = Math.round((mutlakTarama * 180) / Math.PI);
    addObjects([m, bas, bit, yay], `Pergelle yay çizildi (${derece}°)`);
    setHintMessage(`Yay tamamlandı: r = ${formatTurkishNumber(yaricap)} br, ${derece}°`);
  };

  /** İki şeklin kesişim noktalarını hesaplar ve tuvale ekler. */
  const kesisimNoktalariOlustur = (o1: MathObject, o2: MathObject) => {
    const b1 = kesisimBicimi(o1);
    const b2 = kesisimBicimi(o2);
    if (!b1 || !b2) {
      setHintMessage('Bu iki şeklin kesişimi hesaplanamıyor. Doğru, ışın, doğru parçası, çember ve yay desteklenir.');
      return;
    }

    let noktalar: Point2D[] = [];
    if (b1.tur === 'dogru' && b2.tur === 'dogru') {
      const k = intersectLines(b1.a, b1.b, b2.a, b2.b);
      noktalar = k ? [k] : [];
    } else if (b1.tur === 'dogru' && b2.tur === 'cember') {
      noktalar = intersectLineCircle(b1.a, b1.b, b2.merkez, b2.r);
    } else if (b1.tur === 'cember' && b2.tur === 'dogru') {
      noktalar = intersectLineCircle(b2.a, b2.b, b1.merkez, b1.r);
    } else if (b1.tur === 'cember' && b2.tur === 'cember') {
      noktalar = intersectCircles(b1.merkez, b1.r, b2.merkez, b2.r);
    } else if (b1.tur === 'dogru' && b2.tur === 'elips') {
      noktalar = intersectLineEllipse(b1.a, b1.b, b2.merkez, b2.rx, b2.ry);
    } else if (b1.tur === 'elips' && b2.tur === 'dogru') {
      noktalar = intersectLineEllipse(b2.a, b2.b, b1.merkez, b1.rx, b1.ry);
    } else {
      // Elips–çember ve elips–elips kesişimi dördüncü dereceden denklem gerektirir;
      // henüz desteklenmiyor. Kullanıcıyı boş sonuçla baş başa bırakmayalım.
      setHintMessage(
        'Elipsin yalnızca DOĞRULARLA kesişimi hesaplanabiliyor. Elips–çember ve elips–elips henüz desteklenmiyor.'
      );
      return;
    }

    if (noktalar.length === 0) {
      setHintMessage(`${o1.label || 'Şekil'} ile ${o2.label || 'şekil'} kesişmiyor.`);
      return;
    }

    const mevcut = existingPointLabels();
    const adlar = generateNextPointLabels(mevcut, noktalar.length);
    const yeniler: PointObject[] = noktalar.map((p, i) => ({
      id: createId('pt'),
      type: 'point',
      label: adlar[i],
      showLabel: true,
      x: Number(p.x.toFixed(4)),
      y: Number(p.y.toFixed(4)),
      color: '#dc2626',
      visible: true,
      // Kesişim noktası bağımlı bir noktadır: serbestçe sürüklenmesi anlamsızdır
      isIndependent: false,
      createdAt: Date.now(),
    }));
    addObjects(
      yeniler,
      noktalar.length === 1
        ? `${adlar[0]} kesişim noktası oluşturuldu`
        : `${noktalar.length} kesişim noktası oluşturuldu`
    );
    setHintMessage(
      `${o1.label || 'Şekil'} ile ${o2.label || 'şekil'} ${noktalar.length === 1 ? 'tek noktada (teğet)' : noktalar.length + ' noktada'} kesişiyor: ${adlar.join(', ')}`
    );
  };

  /** Pergelin O ANKİ durumu: tıklama işleyicileri eski kapanışa takılmasın */
  const pergelRef = useRef(pergel);
  pergelRef.current = pergel;

  /** Escape pergel çizimini de iptal etsin (klavye dinleyicisi ref üzerinden çağırır) */
  const pergelIptalRef = useRef<() => void>(() => {});
  pergelIptalRef.current = () => setPergel(null);

  /** Ok tuşuyla taşıma sürüyor mu? (tuş bırakılınca tek geçmiş adımı yazılır) */
  const okTasimaRef = useRef(false);

  // Klavye kısayolları için güncel değer referansı (her render'da yeniden abone olmayı önler)
  const keyboardRef = useRef({
    selectedObjectIds,
    deleteObjects,
    setSelectedObjectIds,
    undo,
    redo,
    canUndo,
    canRedo,
    cancelPendingAction,
    dialogOpen: isTextDialogOpen || isConfirmClearOpen || isRegularPolygonDialogOpen,
    setActiveTool,
    moveObjects,
    recordHistory,
    gridStep: viewport.gridStep,
    zoom: viewport.zoom,
    selectedSolidId,
    selectedSolidIds,
    onDeleteSolid,
    onSelectSolid,
    onSelectSolids,
  });
  keyboardRef.current = {
    selectedObjectIds,
    deleteObjects,
    setSelectedObjectIds,
    undo,
    redo,
    canUndo,
    canRedo,
    cancelPendingAction,
    dialogOpen: isTextDialogOpen || isConfirmClearOpen || isRegularPolygonDialogOpen,
    setActiveTool,
    moveObjects,
    recordHistory,
    gridStep: viewport.gridStep,
    zoom: viewport.zoom,
    selectedSolidId,
    selectedSolidIds,
    onDeleteSolid,
    onSelectSolid,
    onSelectSolids,
  };

  // Klavye Kısayolları (Delete/Backspace: sil, Ctrl+Z: geri al, Ctrl+Y / Ctrl+Shift+Z: yinele, Esc: iptal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }
      const k = keyboardRef.current;
      // Canvas'ın kendi diyalogları + Modal tabanlı tüm diyaloglar
      // (Fonksiyon, Kaydırıcı, Nesne Ekle, Düzgün Çokgen, Tuvali Temizle...)
      if (k.dialogOpen || isAnyModalOpen()) return;
      // Odak bir diyalog içindeyken de kısayollar tuvale ulaşmamalı
      if (target instanceof Element && target.closest('[role="dialog"]')) return;

      const isMod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isMod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (k.canUndo) k.undo();
        return;
      }
      if (isMod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (k.canRedo) k.redo();
        return;
      }
      if (e.key === 'Escape') {
        pergelIptalRef.current();
        k.cancelPendingAction();
        k.onSelectSolid?.(null);
        k.onSelectSolids?.([]);
        return;
      }

      // Ok tuşları: seçili nesneleri (pivot noktaları dâhil) ince ayarla.
      // Shift ile 5 adım birden, Alt ile ızgaranın onda biri kadar hassas.
      const OKLAR: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, 1],
        ArrowDown: [0, -1],
      };
      if (OKLAR[e.key] && k.selectedObjectIds.length > 0 && !isMod) {
        e.preventDefault();
        const [ix, iy] = OKLAR[e.key];
        const taban = k.gridStep || 1;
        const adim = e.altKey ? taban / 10 : e.shiftKey ? taban * 5 : taban;
        k.moveObjects(k.selectedObjectIds, { x: ix * adim, y: iy * adim }, false);
        okTasimaRef.current = true;
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (k.selectedObjectIds.length > 0) {
          e.preventDefault();
          const count = k.selectedObjectIds.length;
          k.deleteObjects(k.selectedObjectIds, count === 1 ? undefined : `${count} seçili nesne silindi`);
          k.setSelectedObjectIds([]);
        } else if (k.selectedSolidIds.length > 0 || k.selectedSolidId) {
          e.preventDefault();
          const toDelete = k.selectedSolidIds.length > 0 ? k.selectedSolidIds : (k.selectedSolidId ? [k.selectedSolidId] : []);
          toDelete.forEach((sid) => k.onDeleteSolid?.(sid));
          k.onSelectSolid?.(null);
          k.onSelectSolids?.([]);
        }
      }
    };

    /**
     * Ok tuşuyla taşıma sırasında her basış geçmişe yazılsaydı 20 kez ok'a basan
     * kullanıcı 20 geri alma adımı biriktirirdi. Bu yüzden tuş BIRAKILDIĞINDA
     * tek bir adım kaydedilir.
     */
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!okTasimaRef.current) return;
      if (!e.key.startsWith('Arrow')) return;
      okTasimaRef.current = false;
      const sayi = keyboardRef.current.selectedObjectIds.length;
      keyboardRef.current.recordHistory(sayi === 1 ? 'Nesne taşındı' : `${sayi} nesne taşındı`);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Kimliğe göre nokta haritası (render sırasında tekrarlı aramaları önler)
  const pointsById = useMemo(() => {
    const map = new Map<string, PointObject>();
    for (const obj of objects) {
      if (obj.type === 'point') map.set(obj.id, obj as PointObject);
    }
    return map;
  }, [objects]);

  // Mesafe etiketlerinin katları ORTAK bir kutu genişliğiyle dizilir (en az 120 px): uzun bir etiket komşu katla çakışmasın
  const mesafeEtiketiYariGenislik = useMemo(() => {
    let enGenis = 120;
    for (const o of objects) {
      if (o.type !== 'measurement' || o.kind !== 'distance' || o.showValue === false || o.visible === false) continue;
      const a = pointsById.get(o.pointIds[0]);
      const b = pointsById.get(o.pointIds[1]);
      if (a && b) enGenis = Math.max(enGenis, mesafeEtiketMetni(a, b).length * 6.4 + 14);
    }
    return enGenis / 2;
  }, [objects, pointsById]);

  // Aktif Kaydırıcı Değişkenleri Haritası (Fonksiyon grafikleri için)
  // Sahnedeki kaydırıcılar (oynatma ve tuval üstü çizim için)
  const sliders = useMemo(
    () => objects.filter((o) => o.type === 'slider' && o.visible) as SliderObject[],
    [objects]
  );

  // Sahnedeki canlandırılan noktalar
  const animatingPoints = useMemo(
    () =>
      objects.filter(
        (o) =>
          o.type === 'point' &&
          (o as PointObject).animating &&
          o.visible &&
          (o as PointObject).onObjectId
      ) as PointObject[],
    [objects]
  );

  const { isPlaying: sliderPlaying, toggle: toggleSliderPlayback } = useSliderPlayback({
    sliders,
    animatingPoints,
    allObjects: objects,
    onValues: setSliderValues,
  });

  // İz bırakma (GeoGebra Trace) durumu
  const [traces, setTraces] = useState<Record<string, { points: Point2D[]; color: string }>>({});
  const clearTraces = useCallback(() => setTraces({}), []);

  // showTrace: true olan nesnelerin hareket izlerini kaydet
  useEffect(() => {
    const traceObjects = objects.filter((o) => o.showTrace && o.visible);
    if (traceObjects.length === 0) return;

    setTraces((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const obj of traceObjects) {
        if (obj.type === 'point') {
          const pt = obj as PointObject;
          const curList = next[pt.id]?.points ?? [];
          const last = curList[curList.length - 1];
          if (!last || Math.hypot(last.x - pt.x, last.y - pt.y) > 0.02) {
            next[pt.id] = {
              color: pt.color || '#2563eb',
              points: [...curList.slice(-600), { x: pt.x, y: pt.y }],
            };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [objects]);

  // Yazılı komut / düğme: animasyon başlat/durdur ve iz temizleme dinleyicileri
  useEffect(() => {
    const onPlayback = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail;
      const mode = typeof detail === 'string' ? detail : detail?.mode ?? 'toggle';
      const targetId = typeof detail === 'object' ? detail?.targetId : undefined;

      if (targetId) {
        const obj = latestObjectsRef.current.find((o) => o.id === targetId || o.label === targetId);
        if (obj?.type === 'point') {
          const pt = obj as PointObject;
          const nextAnim = mode === 'play' ? true : mode === 'stop' ? false : !pt.animating;
          updateObject(pt.id, { animating: nextAnim } as Partial<MathObject>, true);
        } else if (obj?.type === 'slider') {
          if (mode === 'toggle' || (mode === 'play' && !sliderPlaying) || (mode === 'stop' && sliderPlaying)) {
            toggleSliderPlayback();
          }
        }
        return;
      }

      if (mode === 'toggle' || (mode === 'play' && !sliderPlaying) || (mode === 'stop' && sliderPlaying)) {
        toggleSliderPlayback();
      }
    };

    const onClearTraces = () => clearTraces();

    window.addEventListener('geoeba:slider-playback', onPlayback);
    window.addEventListener('geoeba:animation-playback', onPlayback);
    window.addEventListener('geoeba:clear-traces', onClearTraces);
    return () => {
      window.removeEventListener('geoeba:slider-playback', onPlayback);
      window.removeEventListener('geoeba:animation-playback', onPlayback);
      window.removeEventListener('geoeba:clear-traces', onClearTraces);
    };
  }, [sliderPlaying, toggleSliderPlayback, updateObject, clearTraces]);

  /**
   * Sürükleme biter bitmez tarayıcı bir 'click' olayı da gönderir. mouseup, click'ten ÖNCE
   * çalıştığı için sürükleme durumu o ana kadar temizlenmiş olur; bu bayrak olmasaydı
   * taşınan etiket hemen ardından "tıklandı" sayılıp gizlenirdi.
   */
  const labelJustDraggedRef = useRef(false);

  // Ölçüm etiketi sürükleme durumu (etiketler şekle GÖRE kaydırılır)
  const labelDragRef = useRef<{
    objectId: string;
    kind: MeasurementKind | string;
    startClient: Point2D;
    startOffset: Point2D;
    moved: boolean;
  } | null>(null);

  // Tuval üstü kaydırıcı tutamağının sürüklenmesi
  const sliderDragRef = useRef<{ id: string } | null>(null);
  // Pencere dinleyicileri her zaman güncel nesne/görünüm değerlerini görsün
  const latestObjectsRef = useRef(objects);
  latestObjectsRef.current = objects;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = sliderDragRef.current;
      if (!drag || !svgRef.current) return;
      const s = (latestObjectsRef.current.find((o) => o.id === drag.id) as SliderObject | undefined);
      if (!s || s.x === undefined || s.y === undefined) return;
      const rect = svgRef.current.getBoundingClientRect();
      const world = screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewportRef.current);
      const uzunluk = s.length ?? 4;
      // Fare konumunu çubuk üzerinde [0, 1] orana çevir
      const t = Math.max(0, Math.min(1, (world.x - s.x) / (uzunluk || 1)));
      let deger = s.min + t * (s.max - s.min);
      if (s.step > 0) deger = Math.round(deger / s.step) * s.step;
      deger = Math.max(s.min, Math.min(s.max, Number(deger.toFixed(4))));
      handleSliderChange(s.id, deger);
    };
    const onUp = () => {
      if (!sliderDragRef.current) return;
      const id = sliderDragRef.current.id;
      sliderDragRef.current = null;
      // Sürükleme bitince TEK geçmiş adımı yaz (her fare karesi değil)
      const s = latestObjectsRef.current.find((o) => o.id === id) as SliderObject | undefined;
      recordHistory(s ? `${s.variableName} = ${formatTurkishNumber(s.value)}` : 'Kaydırıcı değiştirildi');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [handleSliderChange, recordHistory]);

  // Ölçüm etiketi sürükleme: fare hareketi boyunca geçmişe yazmadan güncelle,
  // bırakıldığında TEK adım kaydet. Kayıklık dünya biriminde tutulur; şekil taşındığında
  // etiket de onunla birlikte gider (çapa şeklin kendi noktalarından hesaplanır).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = labelDragRef.current;
      if (!d) return;
      const dxPx = e.clientX - d.startClient.x;
      const dyPx = e.clientY - d.startClient.y;
      if (!d.moved && Math.hypot(dxPx, dyPx) < 3) return;
      d.moved = true;
      const z = viewportRef.current.zoom || 1;
      setLabelOffset(
        d.objectId,
        d.kind,
        { x: d.startOffset.x + dxPx / z, y: d.startOffset.y - dyPx / z },
        false
      );
    };
    const onUp = () => {
      const d = labelDragRef.current;
      if (!d) return;
      labelDragRef.current = null;
      if (d.moved) {
        labelJustDraggedRef.current = true;
        // Sürükleme tuval dışında biterse 'click' hiç gelmeyebilir; bayrak asılı kalmasın
        window.setTimeout(() => {
          labelJustDraggedRef.current = false;
        }, 300);
        recordHistory('Ölçüm etiketi taşındı');
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [setLabelOffset, recordHistory]);

  /**
   * Yazı boyutu: temel değer, genel `fontScale` ve gruba ait ayrıntılı ölçekle çarpılır.
   * Böylece "hepsini birden büyüt" ile "yalnızca ölçüm kutularını büyüt" aynı anda mümkün.
   */
  const fs = useCallback(
    (base: number, kind: 'label' | 'measure' | 'axis' = 'measure') => {
      const grup =
        kind === 'label'
          ? styleSettings.pointLabelScale
          : kind === 'axis'
          ? styleSettings.axisScale
          : styleSettings.measurementScale;
      return Number((base * styleSettings.fontScale * grup).toFixed(2));
    },
    [styleSettings]
  );

  /** Şekil çizgisi kalınlığı: temel kalınlık x kullanıcı çarpanı. Izgara ve arayüz etkilenmez. */
  const sw = useCallback(
    (base: number) => Number((base * styleSettings.strokeScale).toFixed(2)),
    [styleSettings.strokeScale]
  );

  /**
   * Taşınabilir ve tıklanabilir bir ölçüm etiketi için ortak SVG özellikleri.
   * - transform: şekle göre kayıklığı uygular
   * - sürükle: etiketi taşır (tek geçmiş adımı)
   * - tıkla: etiketi gizler (sağ tık menüsünden geri getirilebilir)
   */
  const olcumEtiketi = useCallback(
    (
      objectId: string,
      kind: MeasurementKind | string,
      /**
       * Tıklayınca gizlensin mi? Nokta ADI gizlenemez: kullanıcı onu taşımak
       * isterken yanlışlıkla kaybetmemeli, adı kaldırmanın yeri özellikler paneli.
       */
      gizlenebilir = true
    ) => {
      const obj = objects.find((o) => o.id === objectId);
      const off = obj?.labelOffsets?.[kind];
      const z = viewport.zoom || 1;
      const dx = off ? off.x * z : 0;
      const dy = off ? -off.y * z : 0;
      // Etiketler artık şeklin GÖVDESİNİN DIŞINDA duruyor (çokgende alt kenarın altı,
      // çemberde çemberin altı, yay/dilimde yayın dışı, açıda 40 px ötede). Bu yüzden
      // her zaman tıklanabilir olabilirler: şekli sürüklerken etiketi yakalama riski yok.
      // Önceki "yalnızca seçiliyken tıklanabilir" kuralı, hiç seçilemeyen açı rozetinin
      // asla gizlenememesine yol açıyordu.
      return {
        transform: `translate(${dx}, ${dy})`,
        style: {
          cursor: 'move' as const,
          pointerEvents: 'auto' as const,
          // Dokunmatik cihazda parmak hareketini tarayıcı kaydırma sanmasın
          touchAction: 'none' as const,
        },
        // POINTER olayları kullanılır: fare, DOKUNMATİK ve kalem aynı yoldan geçer.
        // Yalnızca onMouseDown varken tablet ve akıllı tahtada etiket sürüklenemiyordu
        // (parmak touchmove üretir, mousemove üretmez) — kullanıcı "taşıyamıyorum" diyordu.
        onPointerDown: (e: React.PointerEvent) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          e.stopPropagation();
          try {
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          } catch {
            /* yakalama desteklenmiyorsa sürükleme yine window dinleyicisiyle yürür */
          }
          labelJustDraggedRef.current = false;
          labelDragRef.current = {
            objectId,
            kind,
            startClient: { x: e.clientX, y: e.clientY },
            startOffset: off ? { ...off } : { x: 0, y: 0 },
            moved: false,
          };
        },
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          // Taşıma yapıldıysa bu tıklama sürüklemenin devamıdır; etiketi gizleme.
          if (labelJustDraggedRef.current || labelDragRef.current?.moved) {
            labelJustDraggedRef.current = false;
            return;
          }
          if (!gizlenebilir) return;
          hideMeasurement(objectId, kind);
        },
      };
    },
    [objects, viewport.zoom, selectedObjectIds, hideMeasurement]
  );

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
        zoom: DEFAULT_ZOOM,
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

  // Izgaraya yapıştırma (çizilen uyarlanabilir ızgara adımıyla)
  const snapIfEnabled = (p: Point2D): Point2D =>
    viewport.snapToGrid ? snapToGridPoint(p, gridInfo.step) : p;

  // Yeni nokta nesnesi üretici
  const makePoint = (label: string, x: number, y: number, color: string): PointObject => ({
    id: createId('pt'),
    type: 'point',
    label,
    showLabel: true,
    x,
    y,
    color,
    visible: true,
    isIndependent: true,
    createdAt: Date.now(),
  });

  const existingPointLabels = () =>
    (objects.filter((o) => o.type === 'point') as PointObject[]).map((p) => p.label);

  // Sürükleme çapası: bir nesnenin ızgaraya yapıştırılacak referans noktası
  const getAnchorId = (obj: MathObject): string | null => {
    switch (obj.type) {
      case 'point':
      case 'text':
      case 'fraction':
      case 'image':
      case 'pen':
        return obj.id;
      case 'polygon':
        return obj.pointIds[0] ?? null;
      case 'segment':
        return obj.startPointId;
      case 'line':
        return obj.point1Id;
      case 'ray':
        return obj.startPointId;
      case 'circle':
        return obj.centerPointId;
      case 'ellipse':
        return obj.centerPointId;
      case 'arc':
      case 'sector':
        // Izgaraya yapıştırma yayın MERKEZİNE göre yapılır: sürüklerken merkez tam kareye oturur
        return obj.centerPointId;
      case 'angle':
        return obj.vertexPointId;
      default:
        return null;
    }
  };

  const getAnchorPosition = (id: string | null): Point2D | null => {
    if (!id) return null;
    const pt = pointsById.get(id);
    if (pt) return { x: pt.x, y: pt.y };
    const obj = objects.find((o) => o.id === id);
    if (!obj) return null;
    if (obj.type === 'text' || obj.type === 'fraction' || obj.type === 'image') return { x: obj.x, y: obj.y };
    if (obj.type === 'pen') return obj.points[0] ?? null;
    return null;
  };

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
      setDragCreateCurrent(snapIfEnabled(world));
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
          .filter((o) => isObjectInMarquee(o, pointsById, minX, maxX, minY, maxY))
          .map((o) => o.id);
        // Shift/Ctrl ile başlatıldıysa önceki seçim korunur (ekleyerek seçim)
        setSelectedObjectIds(
          selectionMarquee.baseIds.length > 0
            ? Array.from(new Set([...selectionMarquee.baseIds, ...enclosedIds]))
            : enclosedIds
        );
      }
      return;
    }

    // PERGEL önizlemesi: açıklık yatayda ölçülür, sonra yay taranır
    if (activeTool === 'compass' && pergel) {
      const ham = Math.atan2(world.y - pergel.merkez.y, world.x - pergel.merkez.x);
      const aci = ham < 0 ? ham + 2 * Math.PI : ham;
      if (pergel.yaricap === null) {
        // Açıklık aşaması: iğne ile imleç arasındaki GERÇEK uzaklık ölçülür.
        // Yalnızca yatay bileşen alınınca fareyi yukarı-aşağı oynatmak hiçbir şey
        // yapmıyor, kullanıcı açıklığı istediği gibi ayarlayamıyordu. Ekranda
        // açıklık yine yatay bir çubuk olarak gösterilir.
        setPergel((p) =>
          p ? { ...p, tarama: Math.hypot(world.x - p.merkez.x, world.y - p.merkez.y) } : p
        );
      } else if (pergel.baslangic === null) {
        // Başlangıç aşaması: kalemin çember üzerindeki yeri
        setPergel((p) => (p ? { ...p, tarama: aci } : p));
      } else {
        // Tarama aşaması: imlecin GİTTİĞİ yöne göre işaretli olarak birikir.
        // Böylece kullanıcı yayı saat yönünde de, tersinde de çizebilir; tek yöne
        // zorlamak, başlangıç noktasından geriye doğru yay çizmeyi imkânsız kılıyordu.
        setPergel((p) => {
          if (!p) return p;
          let fark = aci - p.sonHamAci;
          // En kısa dönüşü al: (-π, π]. Aksi hâlde 359° -> 1° geçişinde sıçrar.
          while (fark <= -Math.PI) fark += 2 * Math.PI;
          while (fark > Math.PI) fark -= 2 * Math.PI;
          const ham = Math.max(-2 * Math.PI, Math.min(2 * Math.PI, p.tarama + fark));
          return { ...p, tarama: ham, sonHamAci: aci };
        });
      }
      return;
    }

    // Etiket sürükleniyorsa şekil sürüklemesi devreye girmemeli
    if (labelDragRef.current) return;

    if (draggingSolidState) {
      const dx = world.x - draggingSolidState.startWorld.x;
      const dy = world.y - draggingSolidState.startWorld.y;
      if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4) {
        onUpdateSolidPosition?.(draggingSolidState.solidId, {
          x: Number((draggingSolidState.initialPos.x + dx).toFixed(2)),
          y: Number((draggingSolidState.initialPos.y + dy).toFixed(2)),
          z: draggingSolidState.initialPos.z,
        });
        if (!draggingSolidState.hasMoved) {
          setDraggingSolidState((prev) => (prev ? { ...prev, hasMoved: true } : null));
        }
      }
      return;
    }

    if (draggingObjState) {
      // Çapa noktasının SON konumunu hesapla (delta değil, hedef konum ızgaraya yapıştırılır)
      const anchorPos = getAnchorPosition(draggingObjState.anchorId);
      let delta: Point2D;
      let capa: { id: string; delta: Point2D } | undefined;
      let hedef: Point2D | null = null;
      if (anchorPos) {
        const target = snapIfEnabled({
          x: world.x + draggingObjState.anchorOffset.x,
          y: world.y + draggingObjState.anchorOffset.y,
        });
        hedef = target;
        // Kilit yüzünden çapa hedefe tam gidemeyebilir. Seçimin geri kalanı farenin GERÇEK adımını (hedef − çapanın
        // kısıtsız olsaydı bulunacağı yer) alır; çapanın grubu eksik kalan kısmı da yeniden ister ki taşıyıcısı
        // boyunca imleci izlesin. Aksi hâlde kilitli noktadan tutulunca serbest şekiller her karede fazla kayıyordu.
        const sanalCapa = draggingObjState.virtualAnchor ?? anchorPos;
        delta = { x: target.x - sanalCapa.x, y: target.y - sanalCapa.y };
        // İnşa noktası (orta nokta, kesişim…) çapaysa konumunu bağlı olduğu nesneler belirler: eksik kısmı yeniden
        // istemek onu her karede daha ileri itmeye çalışıp grubunu kaçırıyordu; o zaman grup da farenin adımını alır.
        if (draggingObjState.anchorId && !pointsById.get(draggingObjState.anchorId)?.construction) {
          capa = { id: draggingObjState.anchorId, delta: { x: target.x - anchorPos.x, y: target.y - anchorPos.y } };
        }
      } else {
        delta = { x: world.x - draggingObjState.lastWorld.x, y: world.y - draggingObjState.lastWorld.y };
      }

      if (Math.abs(delta.x) > 1e-9 || Math.abs(delta.y) > 1e-9) {
        moveObjects(draggingObjState.objectIds, delta, false, capa);
        setDraggingObjState((prev) =>
          prev
            ? {
                ...prev,
                lastWorld: world,
                hasMoved: true,
                virtualAnchor: hedef,
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

  // Belirli bir ekran noktası etrafında yakınlaştırma (tekerlek, +/- düğmeleri ortak yol)
  // screenPoint verilmezse görünümün merkezi kullanılır.
  const zoomAt = useCallback(
    (screenPoint: Point2D | null, factor: number) => {
      setViewport((prev) => {
        const newZoom = Math.max(5, Math.min(300, prev.zoom * factor));
        if (newZoom === prev.zoom) return prev;
        const sp = screenPoint ?? { x: prev.width / 2, y: prev.height / 2 };
        // İmlecin (veya merkezin) altındaki dünya koordinatını sabit tut
        const worldAt = screenToWorld(sp, prev);
        return {
          ...prev,
          zoom: newZoom,
          panX: sp.x - prev.width / 2 - worldAt.x * newZoom,
          panY: sp.y - prev.height / 2 + worldAt.y * newZoom,
        };
      });
    },
    [setViewport]
  );

  // Fare Tekerleği ile Yakınlaştırma (Passive: false ile tarayıcı hatasını önleme)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt({ x: e.clientX - rect.left, y: e.clientY - rect.top }, e.deltaY < 0 ? 1.12 : 0.89);
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, [zoomAt]);

  // Görsel dosyası seçildiğinde tuvale ekle
  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const worldPos = pendingImageWorldPosRef.current;
    e.target.value = '';
    if (!file || !worldPos) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : null;
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        const naturalW = img.naturalWidth || 400;
        const naturalH = img.naturalHeight || 400;
        const maxWidthUnits = 6;
        const width = Math.min(maxWidthUnits, Math.max(1, naturalW / 100));
        const height = width * (naturalH / naturalW);
        const label = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Görsel';
        const imgObj: ImageObject = {
          id: createId('img'),
          type: 'image',
          label,
          showLabel: true,
          src,
          x: worldPos.x,
          y: worldPos.y,
          width,
          height,
          color: '#3b82f6',
          visible: true,
          createdAt: Date.now(),
        };
        addObject(imgObj, `"${label}" görseli eklendi`);
        setSelectedObjectId(imgObj.id);
      };
      img.onerror = () => setHintMessage('Görsel okunamadı');
      img.src = src;
    };
    reader.onerror = () => setHintMessage('Görsel okunamadı');
    reader.readAsDataURL(file);
    pendingImageWorldPosRef.current = null;
  };

  // Tuvale Basıldığında
  /**
   * Pergelin bir adımını ilerletir: iğne -> açıklık -> başlangıç -> yay.
   *
   * Ayrı bir işlev olması şart: tıklama boş tuvale de, var olan bir nesnenin
   * üzerine de gelebilir. Nesne üstündeki tıklama `handleObjectMouseDown` ile
   * yutulduğunda pergel adım atlamıyor, kullanıcı ikinci kez tıklayınca
   * başlangıç bambaşka bir yere düşüyordu.
   *
   * Durum `pergelRef` üzerinden okunur: hızlı arka arkaya tıklamalarda kapanışta
   * kalan eski `pergel` değeri yüzünden yanlış aşama ilerlemesin.
   */
  const pergelAdimi = (world: Point2D) => {
    const p = pergelRef.current;
    const d = snapIfEnabled(world);

    // 1) İğne
    if (!p) {
      setPergel({ merkez: d, yaricap: null, baslangic: null, tarama: 0, sonHamAci: 0 });
      setHintMessage('Açıklığı ayarlayın: imleci iğneden uzaklaştırıp tıklayın.');
      return;
    }

    // 2) Açıklık: iğne ile imleç arasındaki gerçek uzaklık
    if (p.yaricap === null) {
      const r = Number(Math.hypot(d.x - p.merkez.x, d.y - p.merkez.y).toFixed(2));
      if (r < 0.05) {
        setHintMessage('Açıklık çok küçük. İğneden uzaklaşıp tıklayın.');
        return;
      }
      // Kalem, açıklığı ayarlarken imlecin bulunduğu yönde durur: başlangıç
      // önizlemesi ilk karede 0°'a sıçramasın, kullanıcı nereye bırakacağını görsün.
      const yon = Math.atan2(world.y - p.merkez.y, world.x - p.merkez.x);
      setPergel({
        ...p,
        yaricap: r,
        tarama: yon < 0 ? yon + 2 * Math.PI : yon,
        sonHamAci: 0,
      });
      setHintMessage(
        `Açıklık ${formatTurkishNumber(r)} br. Şimdi yayın BAŞLANGICINI istediğiniz yere bırakın: imleci çemberin çevresinde gezdirip tıklayın.`
      );
      return;
    }

    // 3) Başlangıç açısı — sabit bir yön dayatılmaz, kullanıcı seçer
    if (p.baslangic === null) {
      const aci = Math.atan2(world.y - p.merkez.y, world.x - p.merkez.x);
      const bas = aci < 0 ? aci + 2 * Math.PI : aci;
      // Tarama buradan itibaren İŞARETLİ olarak birikir; ilk ham açı başlangıçtır
      setPergel({ ...p, baslangic: bas, tarama: 0, sonHamAci: bas });
      setHintMessage(
        `Başlangıç ${Math.round((bas * 180) / Math.PI)}° konuldu. Şimdi istediğiniz yöne dönerek yayı çizin; tam tura getirirseniz çember olur.`
      );
      return;
    }

    // 4) Bitiş: taranan açı kadar yay
    pergeliTamamla(p.merkez, p.yaricap, p.baslangic, p.tarama);
    setPergel(null);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld({ x: screenX, y: screenY }, viewport);

    // Orta tuş, Alt veya Pan aracı: her araçta görünümü kaydırma
    if (e.button === 1 || e.altKey || activeTool === 'pan') {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: screenX, y: screenY });
      return;
    }

    // Çizim ve seçim yalnızca sol tuşla
    if (e.button !== 0) return;

    const isBackground =
      e.target === svgRef.current || (e.target as HTMLElement).id === 'grid-background';

    if (activeTool === 'text') {
      setPendingTextWorldPos(snapIfEnabled(world));
      setEditingTextObj(null);
      setIsTextDialogOpen(true);
      return;
    }

    if (activeTool === 'pen') {
      setIsDrawingPen(true);
      setCurrentPenStroke([world]);
      return;
    }

    if (activeTool === 'image') {
      if (!isBackground) return;
      pendingImageWorldPosRef.current = snapIfEnabled(world);
      imageInputRef.current?.click();
      return;
    }

    if (['square', 'rectangle', 'circle', 'ellipse', 'segment'].includes(activeTool)) {
      const start = snapIfEnabled(world);
      setDragCreateStart(start);
      setDragCreateCurrent(start);
      return;
    }

    // PERGEL: kendi akışı var; boş tuval tıklaması NOKTA ÜRETMEZ.
    if (activeTool === 'compass') {
      pergelAdimi(world);
      return;
    }

    if (isBackground) {
      if (activeTool === 'select') {
        const keepSelection = e.shiftKey || e.ctrlKey;
        if (!keepSelection) {
          setSelectedObjectIds([]);
          onSelectSolid?.(null);
          onSelectSolids?.([]);
        }
        setSelectionMarquee({
          startWorld: world,
          currentWorld: world,
          baseIds: keepSelection ? selectedObjectIds : [],
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
          id: createId('pen'),
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
        const round1 = (v: number) => Number(v.toFixed(1));
        const labels = existingPointLabels();

        if (activeTool === 'square') {
          const side = round1(Math.max(dx, dy));
          const [la, lb, lc, ld] = generateNextPointLabels(labels, 4);
          const color = '#3b82f6';
          const pts = [
            makePoint(la, x1, y1, color),
            makePoint(lb, x1 + side, y1, color),
            makePoint(lc, x1 + side, y1 + side, color),
            makePoint(ld, x1, y1 + side, color),
          ];

          const poly: PolygonObject = {
            id: createId('poly'),
            type: 'polygon',
            label: 'Kare',
            showLabel: true,
            pointIds: pts.map((p) => p.id),
            color: '#f43f5e',
            fillColor: '#f43f5e',
            fillOpacity: 0.18,
            visible: true,
            showArea: true,
            showPerimeter: true,
            createdAt: Date.now(),
          };

          addObjects([...pts, poly], `Kare oluşturuldu (a = ${formatTurkishNumber(side)} br)`);
        } else if (activeTool === 'rectangle') {
          // Köşe konumları, gösterilen (yuvarlanmış) boyutlarla birebir eşleşir
          const rw = round1(dx);
          const rh = round1(dy);
          const [la, lb, lc, ld] = generateNextPointLabels(labels, 4);
          const color = '#3b82f6';
          const pts = [
            makePoint(la, x1, y1, color),
            makePoint(lb, x1 + rw, y1, color),
            makePoint(lc, x1 + rw, y1 + rh, color),
            makePoint(ld, x1, y1 + rh, color),
          ];

          const poly: PolygonObject = {
            id: createId('poly'),
            type: 'polygon',
            label: 'Dikdörtgen',
            showLabel: true,
            pointIds: pts.map((p) => p.id),
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.18,
            visible: true,
            showArea: true,
            showPerimeter: true,
            createdAt: Date.now(),
          };

          addObjects(
            [...pts, poly],
            `Dikdörtgen oluşturuldu (${formatTurkishNumber(rw)} x ${formatTurkishNumber(rh)} br)`
          );
        } else if (activeTool === 'ellipse') {
          // Sürüklenen kutuya İÇTEN teğet elips: yarıçaplar kutunun yarı kenarlarıdır
          const ra = round1(dx / 2);
          const rb = round1(dy / 2);
          const [centerLabel] = generateNextPointLabels(labels, 1);
          const merkez = makePoint(centerLabel, round1(x1 + dx / 2), round1(y1 + dy / 2), '#0ea5e9');
          const elips: EllipseObject = {
            id: createId('elp'),
            type: 'ellipse',
            label: `${centerLabel} Merkezli Elips`,
            showLabel: true,
            centerPointId: merkez.id,
            radiusX: ra,
            radiusY: rb,
            color: '#0ea5e9',
            fillColor: '#0ea5e9',
            fillOpacity: 0.12,
            visible: true,
            showArea: true,
            showPerimeter: true,
            createdAt: Date.now(),
          };
          addObjects(
            [merkez, elips],
            `Elips oluşturuldu (a = ${formatTurkishNumber(ra)} br, b = ${formatTurkishNumber(rb)} br)`
          );
        } else if (activeTool === 'circle') {
          const radius = round1(dist);
          const [centerLabel] = generateNextPointLabels(labels, 1);
          const centerPt = makePoint(centerLabel, dragCreateStart.x, dragCreateStart.y, '#8b5cf6');
          const circ: CircleObject = {
            id: createId('circ'),
            type: 'circle',
            label: `${centerLabel} Merkezli Çember`,
            showLabel: true,
            centerPointId: centerPt.id,
            fixedRadius: radius,
            color: '#8b5cf6',
            visible: true,
            showArea: true,
            showPerimeter: true,
            fillOpacity: 0.1,
            createdAt: Date.now(),
          };
          addObjects([centerPt, circ], `Çember oluşturuldu (r = ${formatTurkishNumber(radius)} br)`);
        } else if (activeTool === 'segment') {
          const [la, lb] = generateNextPointLabels(labels, 2);
          // Uç nokta, önizlemede gösterilen yuvarlanmış uzunluğa oturtulur (kare/dikdörtgen/çemberle tutarlı).
          // Izgaraya Yapış açıkken uç nokta ızgarada kalmalıdır, o yüzden dokunulmaz.
          const endPos = viewport.snapToGrid
            ? endWorld
            : (() => {
                const targetLen = round1(dist);
                return {
                  x: dragCreateStart.x + ((endWorld.x - dragCreateStart.x) / dist) * targetLen,
                  y: dragCreateStart.y + ((endWorld.y - dragCreateStart.y) / dist) * targetLen,
                };
              })();
          const p1 = makePoint(la, dragCreateStart.x, dragCreateStart.y, '#0284c7');
          const p2 = makePoint(lb, endPos.x, endPos.y, '#0284c7');
          const seg: SegmentObject = {
            id: createId('seg'),
            type: 'segment',
            label: `[${la}${lb}]`,
            showLabel: true,
            startPointId: p1.id,
            endPointId: p2.id,
            color: '#0284c7',
            visible: true,
            showLength: true,
            thickness: 2.5,
            createdAt: Date.now(),
          };
          addObjects([p1, p2, seg], `[${la}${lb}] doğru parçası oluşturuldu`);
        }
      }
      setDragCreateStart(null);
      setDragCreateCurrent(null);
    }

    if (selectionMarquee) {
      setSelectionMarquee(null);
    }

    if (draggingSolidState) {
      if (draggingSolidState.hasMoved) {
        onDragEnd?.();
      }
      setDraggingSolidState(null);
    }

    if (draggingObjState) {
      if (draggingObjState.hasMoved) {
        const moved = draggingObjState.objectIds
          .map((id) => objects.find((o) => o.id === id))
          .filter(Boolean) as MathObject[];
        const desc =
          moved.length === 1
            ? `${moved[0].label || 'Nesne'} taşındı`
            : `${draggingObjState.objectIds.length} nesne taşındı`;
        recordHistory(desc);
      }
      setDraggingObjState(null);
    }

    setIsPanning(false);
  };

  // Nesne veya Nokta Sürükleme Başlat (Seç ve Taşı)
  /**
   * Nesneye sağ tıklandığında bağlam menüsünü açar.
   * Menü açılmadan önce nesne seçilir; böylece "menü hangi nesneyi konuşuyor" görsel olarak bellidir.
   */
  /**
   * Çokgende, verilen EKRAN noktasına en yakın kenarın dizinini döndürür.
   * Kullanıcı "şu kenarı ölç" derken tıkladığı yeri kastettiği için karşılaştırma
   * dünya biriminde değil, gördüğü ekran pikselinde yapılır.
   */
  const enYakinKenar = useCallback(
    (poly: PolygonObject, ekran: Point2D): number | null => {
      const kose = poly.pointIds
        .map((id) => pointsById.get(id))
        .filter((p): p is PointObject => p !== undefined);
      if (kose.length !== poly.pointIds.length || kose.length < 3) return null;
      const ekranKose = kose.map((p) => worldToScreen(p, viewport));
      // Şeklin ORTASINA tıklandığında "hangi kenar?" belirsizdir; o yüzden
      // yalnızca imleç bir kenara makul yakınlıktaysa (60 px) kenar maddesi gösterilir.
      return findNearestEdgeIndex(ekranKose, ekran, 60);
    },
    [pointsById, viewport]
  );

  /**
   * Noktaların 18 px'lik görünmez yakalayıcı daireleri üst üste biner; SONRA çizilen komşu nokta sağ
   * tıklamayı / uzun basmayı çalıyordu (gri kilitli noktaya sağ tıklayınca komşunun "Kilitle" menüsü
   * açılıyordu). İmlecin altındaki noktalardan GÖVDESİ en yakın olanı döndürür.
   */
  const imlecinNoktasi = useCallback(
    (clientX: number, clientY: number, obj: MathObject): MathObject => {
      if (obj.type !== 'point' || !svgRef.current) return obj;
      const rect = svgRef.current.getBoundingClientRect();
      const uzaklik = (p: PointObject) => {
        const s = worldToScreen(p, viewport);
        return Math.hypot(s.x - (clientX - rect.left), s.y - (clientY - rect.top));
      };
      let enYakin = obj as PointObject;
      for (const el of document.elementsFromPoint(clientX, clientY)) {
        const id = el.closest('[data-object-id]')?.getAttribute('data-object-id');
        const aday = id ? pointsById.get(id) : undefined;
        if (aday && uzaklik(aday) < uzaklik(enYakin)) enYakin = aday;
      }
      return enYakin;
    },
    [pointsById, viewport]
  );

  const openContextMenu = useCallback(
    (e: React.MouseEvent, tiklanan: MathObject) => {
      e.preventDefault();
      e.stopPropagation();
      // Yalnızca noktanın yakalayıcı dairesine tıklandıysa hedef düzeltilir; ad etiketine tıklama olduğu gibi kalır.
      const obj = (e.target as Element).tagName.toLowerCase() === 'circle' ? imlecinNoktasi(e.clientX, e.clientY, tiklanan) : tiklanan;
      // Sağ tıklanan nesne ZATEN çoklu seçimin parçasıysa seçim korunur.
      // Aksi hâlde "5 noktayı birleştir" gibi çoklu seçim maddeleri, menü açılır
      // açılmaz seçim tek nesneye indiği için hiç görünmüyordu.
      // (setSelectedObjectId burada ÇAĞRILMAZ: o da seçimi tek nesneye indirir.)
      setSelectedObjectIds(contextMenuSelection(selectedObjectIds, obj.id));
      let edgeIndex: number | null = null;
      if (obj.type === 'polygon' && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        edgeIndex = enYakinKenar(obj as PolygonObject, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      setContextTarget({ obj, x: e.clientX, y: e.clientY, edgeIndex });
    },
    [setSelectedObjectIds, selectedObjectIds, enYakinKenar, imlecinNoktasi]
  );

  /** Dokunmatik cihazlarda 600 ms basılı tutmak menüyü açar; 12 px'ten fazla kayma sürükleme sayılır. */
  const handleTouchStartOnObject = useCallback(
    (e: React.TouchEvent, obj: MathObject) => {
      const t = e.touches[0];
      if (!t) return;
      const startX = t.clientX;
      const startY = t.clientY;
      // Sağ tıklamadaki gibi yalnızca noktanın yakalayıcı dairesine basıldıysa hedef düzeltilir (ad etiketi olduğu gibi kalır)
      const yakalayici = (e.target as Element).tagName.toLowerCase() === 'circle';
      const timer = window.setTimeout(() => {
        // Üst üste binen yakalayıcılarda parmağın altındaki noktanın menüsü açılır
        const hedef = yakalayici ? imlecinNoktasi(startX, startY, obj) : obj;
        // Parmağın altındaki nesne çoklu seçimdeyse seçim korunur; zamanlayıcı eski seçimi görmesin diye güncel değerden
        setSelectedObjectIds((onceki) => contextMenuSelection(onceki, hedef.id));
        let edgeIndex: number | null = null;
        if (hedef.type === 'polygon' && svgRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          edgeIndex = enYakinKenar(hedef as PolygonObject, { x: startX - rect.left, y: startY - rect.top });
        }
        setContextTarget({ obj: hedef, x: startX, y: startY, edgeIndex });
        longPressRef.current = null;
      }, 600);
      longPressRef.current = { timer, startX, startY, obj };
    },
    [setSelectedObjectId, setSelectedObjectIds, enYakinKenar, imlecinNoktasi]
  );

  const cancelLongPress = useCallback((e?: React.TouchEvent) => {
    const lp = longPressRef.current;
    if (!lp) return;
    if (e) {
      const t = e.touches[0];
      if (t && Math.hypot(t.clientX - lp.startX, t.clientY - lp.startY) <= 12) return;
    }
    window.clearTimeout(lp.timer);
    longPressRef.current = null;
  }, []);

  useEffect(() => () => {
    if (longPressRef.current) window.clearTimeout(longPressRef.current.timer);
  }, []);

  /**
   * Verilen nesnenin ÜZERİNDE duran noktalar (nesnenin kendi tanım noktaları hariç).
   * "Şu noktadan böl" maddelerini kurmak için gerekir.
   */
  const uzerindekiNoktalar = useCallback(
    (obj: MathObject): PointObject[] => {
      const ESIK = 1e-3;
      const tanim = new Set(objectDependencies(obj));
      const aday = objects.filter(
        (o): o is PointObject => o.type === 'point' && !tanim.has(o.id) && o.visible !== false
      );
      const nk = (id: string) => pointsById.get(id);

      // Nesneye BAĞLI doğmuş noktalar her zaman üzerindedir; geometrik eşiğe
      // bakmaya gerek yok (yuvarlama yüzünden eşiği kıl payı kaçırabilirler).
      const bagli = aday.filter((p) => p.onObjectId === obj.id);
      const birlestir = (geometrik: PointObject[]): PointObject[] => {
        const gorulen = new Set(bagli.map((p) => p.id));
        return [...bagli, ...geometrik.filter((p) => !gorulen.has(p.id))];
      };

      if (obj.type === 'segment') {
        const a = nk(obj.startPointId);
        const b = nk(obj.endPointId);
        if (!a || !b) return [];
        return birlestir(aday.filter((p) => distanceToSegment(p, a, b).distance < ESIK));
      }
      if (obj.type === 'circle') {
        const c = obj as CircleObject;
        const merkez = nk(c.centerPointId);
        if (!merkez) return [];
        const yari = c.radiusPointId ? nk(c.radiusPointId) : undefined;
        const r = c.fixedRadius ?? (yari ? calculateDistance(merkez, yari) : 0);
        if (!(r > 0)) return [];
        return birlestir(aday.filter((p) => Math.abs(calculateDistance(merkez, p) - r) < ESIK));
      }
      if (obj.type === 'arc') {
        const merkez = nk(obj.centerPointId);
        const bas = nk(obj.startPointId);
        const bit = nk(obj.directionPointId);
        if (!merkez || !bas || !bit) return [];
        const r = calculateDistance(merkez, bas);
        const geo = getArcGeometry(merkez, bas, bit);
        return birlestir(
          aday.filter((p) => {
          if (Math.abs(calculateDistance(merkez, p) - r) >= ESIK) return false;
          if (!geo) return true;
          // Nokta yayın TARANAN bölümünde mi?
          const aci = Math.atan2(p.y - merkez.y, p.x - merkez.x);
          const fark = ((aci - geo.startAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
          return fark > 1e-6 && fark < geo.sweep - 1e-6;
          })
        );
      }
      return bagli;
    },
    [objects, pointsById]
  );

  /** Sağ tıklanan nesnenin türüne göre menü maddelerini üretir. */
  const contextMenuItems = useMemo<ContextMenuItem[]>(() => {
    const hedef = objects.find(o => o.id === contextTarget?.obj?.id);
    const pasteItem: ContextMenuItem = {
      id: 'yapistir', label: 'Yapıştır', disabled: !objectClipboard?.objects.length,
      onSelect: () => {
        if (!objectClipboard || !contextTarget || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const location = screenToWorld({ x: contextTarget.x - rect.left, y: contextTarget.y - rect.top }, viewport);
        const pasted = pasteObjects(objectClipboard, objects, location);
        addObjects(pasted.objects, 'Nesneler yapıştırıldı');
        setSelectedObjectIds(pasted.selectedIds);
        setActiveTool('select');
      },
    };
    if (!hedef) {
      const bostaMaddeler = [pasteItem];
      if (Object.keys(traces).length > 0) {
        bostaMaddeler.push({
          id: 'izleri-temizle',
          label: 'İzleri Temizle',
          separatorBefore: true,
          onSelect: () => clearTraces(),
        });
      }
      return bostaMaddeler;
    }
    const targetIds = selectedObjectIds.includes(hedef.id) ? selectedObjectIds : [hedef.id];
    const maddeler: ContextMenuItem[] = [
      { id: 'kopyala', label: 'Kopyala', onSelect: () => {
        setObjectClipboard(copyObjects(objects, targetIds));
        setHintMessage('Kopyalandı. Yapıştırmak istediğiniz yere sağ tıklayın.');
      } },
      pasteItem,
    ];
    if (activeTool !== 'select') {
      maddeler.unshift({ id: 'tasi', label: 'Taşı (V)', onSelect: () => {
        setSelectedObjectIds(targetIds);
        setActiveTool('select');
      } });
    }

    // PARÇALI UZUNLUK: "[AB] baştan sona" + aradaki her nokta için "[AP] P noktasına kadar" /
    // "[PB] P noktasından sona". Metin ölçümün EKRANDAKİ durumunu söyler (ölç ↔ gizle); ayrıntılar
    // kapalıyken etiket görünmediği için "ölç" yazar (seçilince ayrıntılar açılır).
    const uzunlukMaddesi = (o: LengthOption, ayiriciOnce: boolean, ekGoster: boolean): ContextMenuItem => {
      const ad = `[${pointsById.get(o.fromId)?.label ?? '?'}${pointsById.get(o.toId)?.label ?? '?'}]`;
      const ara = o.viaId ? pointsById.get(o.viaId)?.label ?? '?' : '';
      const ek = !ekGoster
        ? ''
        : o.role === 'whole'
        ? ' (baştan sona)'
        : o.role === 'piece'
        ? ' (bu parça)'
        : o.role === 'toPoint'
        ? ` (${ara} noktasına kadar)`
        : o.role === 'fromPoint'
        ? ` (${ara} noktasından sona kadar)`
        : ` (${pointsById.get(o.fromId)?.label ?? '?'} ile ${pointsById.get(o.toId)?.label ?? '?'} arası)`;
      const acik = showDetails && isLengthShown(objects, o.fromId, o.toId);
      return {
        id: `olc-uzunluk-${o.fromId}-${o.toId}`,
        label: `${ad} uzunluğunu ${acik ? 'gizle' : 'ölç'}${ek}`,
        separatorBefore: ayiriciOnce,
        onSelect: () => setLengthMeasurement(o.fromId, o.toId, !acik),
      };
    };

    if (hedef.type === 'segment') {
      const seg = hedef as SegmentObject;
      const ustunde = uzerindekiNoktalar(seg);
      if (ustunde.length > 0) {
        const p = ustunde.find((o) => selectedObjectIds.includes(o.id)) || ustunde[0];
        maddeler.push({
          id: 'parcaya-ayir',
          label: `${p.label} noktasından ikiye ayır`,
          onSelect: () => splitSegmentAtPoint(seg.id, p.id),
        });
      }
      const a = pointsById.get(seg.startPointId);
      const b = pointsById.get(seg.endPointId);
      const uzunluk = a && b ? calculateDistance(a, b) : 0;
      const { options: uzunluklar } = straightLengthOptions(objects, seg.id);
      if (uzunluklar.length === 0) {
        maddeler.push({ id: 'olc-uzunluk', label: 'Uzunluğunu ölç', onSelect: () => measureLength(seg.id) });
      }
      uzunluklar.forEach((o, i) => maddeler.push(uzunlukMaddesi(o, i === 0, uzunluklar.length > 1)));
      maddeler.push({
        id: 'ayarla-uzunluk',
        label: 'Uzunluğu ayarla…',
        prompt: {
          scope: sliderScope,
          label: 'Uzunluk',
          unit: 'br',
          initial: formatTurkishNumber(uzunluk),
          onSubmit: (v) => setSegmentLength(seg.id, v),
        },
      });
    } else if (hedef.type === 'line' || hedef.type === 'ray') {
      maddeler.push({ id: 'olc-uzunluk', label: hedef.showLength ? 'İki nokta arasındaki mesafeyi gizle' : 'İki nokta arasındaki mesafeyi ölç',
        onSelect: () => hedef.showLength ? hideMeasurement(hedef.id, 'length') : measureLength(hedef.id) });
      // Üzerine nokta konmuş doğru/ışın: tanım noktaları dışındaki çiftler için kısmi uzunluklar
      const tanimCifti = straightEnds(hedef);
      straightLengthOptions(objects, hedef.id)
        .options.filter((o) => !samePair([o.fromId, o.toId], tanimCifti))
        .forEach((o) => maddeler.push(uzunlukMaddesi(o, false, true)));
      if (hedef.type === 'line') maddeler.push({ id: 'denklem', label: hedef.showEquation ? 'Denklemi gizle' : 'Denklemi göster',
        onSelect: () => updateObject(hedef.id, { showEquation: !hedef.showEquation } as Partial<MathObject>, true) });
    } else if (hedef.type === 'point') {
      // Menü, gri çizim ve "Kilitle" adayları AYNI yargıdan türer (isPointLocked): taşıyıcısı
      // silinmiş bir bağ kilit sayılmaz. "Kilit çöz", "Kilitle"nin tam tersidir: kilitlenirken
      // yarıçap noktası olmaktan çıkarılan nokta, kilidi çözülünce çemberin yarıçapını yeniden belirler.
      if (isPointLocked(hedef, objects)) {
        maddeler.push({ id: 'kilit-coz', label: 'Kilit çöz', separatorBefore: true,
          onSelect: () => commit(prev => prev.map(object => {
            if (object.id === hedef.id) return { ...object, onObjectId: undefined, locked: undefined, isIndependent: !hedef.construction } as MathObject;
            if (object.id === hedef.onObjectId && object.type === 'circle' && object.releasedRadiusPointId === hedef.id) {
              const { releasedRadiusPointId: _birakilan, fixedRadius: _sabit, ...cember } = object;
              return { ...cember, radiusPointId: hedef.id } as MathObject;
            }
            return object;
          }), `${hedef.label} noktasının kilidi çözüldü`) });
      } else {
        const candidates = pointLockCandidates(hedef, objects, viewport.zoom);
        for (const candidate of candidates) maddeler.push({
          id: `kilitle-${candidate.host.id}`,
          label: candidates.length === 1 ? 'Kilitle' : `Kilitle: ${candidate.host.label}`,
          separatorBefore: candidate === candidates[0],
          onSelect: () => commit(prev => prev.map(object => {
            if (object.id === hedef.id) return { ...object, onObjectId: candidate.host.id, x: candidate.position.x, y: candidate.position.y } as MathObject;
            if (object.id === candidate.host.id && object.type === 'circle' && candidate.fixedRadius !== undefined) {
              return { ...object, radiusPointId: undefined, fixedRadius: candidate.fixedRadius, releasedRadiusPointId: hedef.id };
            }
            return object;
          }), 'Nokta çizgiye kilitlendi'),
        });
      }
      // ÇOKLU SEÇİM: birden çok nokta seçiliyken bağlama / ayırma / uydurma sunulur.
      // (Seçim "Seç ve Taşı" ile Shift veya Ctrl basılı tutularak yapılır.)
      const seciliNoktalar = selectedObjectIds.filter((id) =>
        objects.some((o) => o.id === id && o.type === 'point')
      );
      if (seciliNoktalar.length >= 2) {
        maddeler.push({
          id: 'noktalari-birlestir',
          label: `Seçili ${seciliNoktalar.length} noktayı birleştir`,
          onSelect: () => connectPoints(seciliNoktalar),
        });
        maddeler.push({
          id: 'noktalari-ayir',
          label: 'Aralarındaki bağlantıları kaldır',
          onSelect: () => disconnectPoints(seciliNoktalar),
        });
        maddeler.push({
          id: 'polinom-uydur',
          label: `Noktalara polinom uydur… (${seciliNoktalar.length} nokta)`,
          separatorBefore: true,
          prompt: {
            scope: sliderScope,
            label: 'Polinomun derecesi',
            unit: '.',
            initial: String(Math.min(3, Math.max(1, seciliNoktalar.length - 1))),
            onSubmit: (d) => fitPolynomialToPoints(seciliNoktalar, Math.round(d)),
          },
        });
      }

      // ÜZERİNDE DURDUĞU NESNEYİ BURADAN PARÇALA
      // Bölme maddeleri şimdiye dek yalnızca şeklin kendisine sağ tıklayınca
      // çıkıyordu; çemberin ince çizgisine isabet ettirmek zordu. Nokta zaten
      // nesneye bağlı olduğuna göre madde noktanın menüsünde de olmalı.
      const tasiyiciId = (hedef as PointObject).onObjectId;
      const tasiyici = tasiyiciId ? objects.find((o) => o.id === tasiyiciId) : undefined;
      if (tasiyici) {
        const ustundekiler = uzerindekiNoktalar(tasiyici);
        const digerleri = ustundekiler.filter((o) => o.id !== hedef.id);
        // Eş nokta: kullanıcı ikincisini de seçtiyse o, yoksa üzerindeki ilk nokta
        const es = digerleri.find((o) => selectedObjectIds.includes(o.id)) || digerleri[0];
        const ad = tasiyici.label || 'Nesne';

        if (tasiyici.type === 'segment') {
          maddeler.push({
            id: 'tasiyiciyi-bol',
            label: `${ad} kenarını ${hedef.label} noktasından ikiye ayır`,
            separatorBefore: true,
            onSelect: () => splitSegmentAtPoint(tasiyici.id, hedef.id),
          });
        } else if (tasiyici.type === 'arc') {
          maddeler.push({
            id: 'tasiyiciyi-bol',
            label: `${ad} yayını ${hedef.label} noktasından ikiye ayır`,
            separatorBefore: true,
            onSelect: () => splitArcAtPoint(tasiyici.id, hedef.id),
          });
        } else if (tasiyici.type === 'circle') {
          maddeler.push({
            id: 'tasiyiciyi-bol',
            label: es
              ? `${ad} çemberini ${hedef.label}–${es.label} yaylarına ayır`
              : `${ad} çemberini ayırmak için üzerine ikinci bir nokta koyun`,
            separatorBefore: true,
            disabled: !es,
            onSelect: es
              ? () => splitCircleAtPoints(tasiyici.id, [hedef.id, es.id])
              : undefined,
          });
        } else if (tasiyici.type === 'polygon') {
          maddeler.push({
            id: 'tasiyiciyi-bol',
            label: es
              ? `${ad} alanını ${hedef.label}–${es.label} kirişinden böl`
              : `${ad} alanını bölmek için başka bir kenara da nokta koyun`,
            separatorBefore: true,
            disabled: !es,
            onSelect: es
              ? () => splitPolygon(tasiyici.id, [hedef.id, es.id])
              : undefined,
          });
        }
      }

      // Nokta bir parçanın/doğrunun ARASINDA (ya da bölünmüş zincirin eklem yerinde) duruyorsa
      // "baştan sona" ve "noktaya kadar" uzunlukları noktanın kendi menüsünde de sunulur.
      const noktaUzunluklari = lengthOptionsAtPoint(objects, hedef.id)?.options ?? [];
      noktaUzunluklari.forEach((o, i) => maddeler.push(uzunlukMaddesi(o, i === 0, noktaUzunluklari.length > 1)));

      // "Açısını ölç" YALNIZCA noktada gerçekten bir açı varsa sunulur: en az iki farklı komşu kenar
      // (parça/doğru/ışın/çokgen kenarı) ya da yay/dilim merkezi. Düz çember merkezi, yalnız nokta veya
      // yarıçap noktası için madde çıkmaz; karar measureAngleAtPoint ile AYNI yardımcıdan gelir.
      // Nokta bir yay/dilimin MERKEZİ ise madde o şeklin merkez açısını açıp kapatır; menü de bunu söyler.
      const aciEylemi = pointAngleAction(hedef.id, objects);
      if (aciEylemi) {
        // Bölünmüş çemberin merkezinde birden çok yay olabilir: herhangi birinin açısı görünüyorsa "gizle"
        const merkezAcisiGorunur = aciEylemi.kind === 'central' && aciEylemi.shapes.some((s) => s.visible !== false && s.showCentralAngle !== false);
        maddeler.push({
          id: 'olc-aci',
          label: aciEylemi.kind === 'central'
            ? merkezAcisiGorunur
              ? 'Merkez açıyı gizle'
              : 'Açısını ölç (merkez açı)'
            : 'Açısını ölç',
          onSelect: () => measureAngleAtPoint(hedef.id),
        });
      }
      const iliskiliAci = objects.find((o) => o.type === 'angle' && o.vertexPointId === hedef.id) as
        | AngleObject
        | undefined;
      if (iliskiliAci) {
        maddeler.push({
          id: 'ic-dis-aci',
          label: 'İç açı / dış açı',
          onSelect: () => toggleAngleReflex(iliskiliAci.id),
        });
      }

      if ((hedef as PointObject).onObjectId) {
        const isAnim = (hedef as PointObject).animating;
        maddeler.push({
          id: 'canlandirma',
          label: isAnim ? 'Animasyonu Durdur' : 'Animasyonu Başlat',
          separatorBefore: true,
          onSelect: () => updateObject(hedef.id, { animating: !isAnim } as Partial<MathObject>, true),
        });
      }
    } else if (hedef.type === 'slider') {
      maddeler.push({
        id: 'canlandirma-slider',
        label: sliderPlaying ? 'Animasyonu Durdur' : 'Animasyonu Başlat',
        onSelect: () => toggleSliderPlayback(),
      });
    } else if (hedef.type === 'circle') {
      const circ = hedef as CircleObject;
      const merkez = pointsById.get(circ.centerPointId);
      const yariNokta = circ.radiusPointId ? pointsById.get(circ.radiusPointId) : undefined;
      const r = merkez && yariNokta ? calculateDistance(merkez, yariNokta) : circ.fixedRadius ?? 0;
      maddeler.push({ id: 'olc-alan', label: 'Alanını ölç', onSelect: () => measureArea(circ.id) });
      maddeler.push({ id: 'olc-cevre', label: 'Çevresini ölç', onSelect: () => measurePerimeter(circ.id) });
      const ustundeC = uzerindekiNoktalar(circ);
      if (ustundeC.length >= 2) {
        const secili = ustundeC.filter((o) => selectedObjectIds.includes(o.id));
        const ikisi = secili.length === 2 ? secili : ustundeC.slice(0, 2);
        maddeler.push({
          id: 'cemberi-ayir',
          label: `${ikisi.map((o) => o.label).join(' – ')} noktalarından iki yaya ayır`,
          onSelect: () => splitCircleAtPoints(circ.id, ikisi.map((o) => o.id)),
        });
      }

      maddeler.push({
        id: 'ayarla-yaricap',
        label: 'Yarıçapı ayarla…',
        prompt: {
          scope: sliderScope,
          label: 'Yarıçap',
          unit: 'br',
          initial: formatTurkishNumber(r),
          onSubmit: (v) => setCircleRadius(circ.id, v),
        },
      });
    } else if (hedef.type === 'ellipse') {
      const elp = hedef as EllipseObject;
      maddeler.push({ id: 'olc-alan', label: 'Alanını ölç', onSelect: () => measureArea(elp.id) });
      maddeler.push({ id: 'olc-cevre', label: 'Çevresini ölç', onSelect: () => measurePerimeter(elp.id) });
      maddeler.push({
        id: 'elips-a',
        label: 'Yatay yarıçapı (a) ayarla…',
        separatorBefore: true,
        prompt: {
          scope: sliderScope,
          label: 'Yatay yarıçap (a)',
          unit: 'br',
          initial: formatTurkishNumber(elp.radiusX),
          onSubmit: (v) => updateObject(elp.id, { radiusX: Math.abs(v) } as Partial<MathObject>, true),
        },
      });
      maddeler.push({
        id: 'elips-b',
        label: 'Dikey yarıçapı (b) ayarla…',
        prompt: {
          scope: sliderScope,
          label: 'Dikey yarıçap (b)',
          unit: 'br',
          initial: formatTurkishNumber(elp.radiusY),
          onSubmit: (v) => updateObject(elp.id, { radiusY: Math.abs(v) } as Partial<MathObject>, true),
        },
      });
    } else if (hedef.type === 'polygon') {
      const poly = hedef as PolygonObject;
      const kenarNo = contextTarget?.edgeIndex ?? null;
      if (kenarNo !== null) {
        // Tıklanan kenarın adı ([AB]) ve şu anki uzunluğu, menüde doğrudan görünsün
        const a = pointsById.get(poly.pointIds[kenarNo]);
        const b = pointsById.get(poly.pointIds[(kenarNo + 1) % poly.pointIds.length]);
        const ad = a && b ? `[${a.label || '?'}${b.label || '?'}]` : 'Bu kenar';
        const uzunluk = a && b ? calculateDistance(a, b) : 0;
        const acik = (poly.edgeLabels || []).includes(kenarNo);
        maddeler.push({
          id: 'olc-kenar',
          label: acik
            ? `${ad} kenar uzunluğunu gizle`
            : `${ad} kenarını ölç (${formatTurkishNumber(uzunluk)} br)`,
          onSelect: () => togglePolygonEdgeLabel(poly.id, kenarNo),
        });
      }
      // Kenarları üzerinde duran noktalar: alanı bunlardan geçen kirişle bölebiliriz
      const koseler = poly.pointIds
        .map((id) => pointsById.get(id))
        .filter(Boolean) as PointObject[];
      const kenardakiNoktalar =
        koseler.length === poly.pointIds.length
          ? objects.filter((o) => {
              if (o.type !== 'point') return false;
              if (poly.pointIds.includes(o.id)) return false; // köşenin kendisi değil
              const y = closestPointOnPolygonEdge(koseler, o as PointObject);
              return !!y && y.distance < 1e-3;
            })
          : [];

      if (kenardakiNoktalar.length >= 2) {
        const secili = kenardakiNoktalar.filter((o) => selectedObjectIds.includes(o.id));
        const kullanilacak = secili.length === 2 ? secili : kenardakiNoktalar.slice(0, 2);
        const adlar = kullanilacak.map((o) => o.label).join(' – ');
        maddeler.push({
          id: 'alani-bol',
          label: `Alanı böl (${adlar})`,
          separatorBefore: true,
          onSelect: () => splitPolygon(poly.id, kullanilacak.map((o) => o.id)),
        });
      }

      const hepsiAcik = (poly.edgeLabels || []).length === poly.pointIds.length;
      maddeler.push({
        id: 'olc-tum-kenarlar',
        label: hepsiAcik ? 'Kenar uzunluklarını gizle' : 'Tüm kenarları ölç',
        onSelect: () => setAllPolygonEdgeLabels(poly.id, !hepsiAcik),
      });
      maddeler.push({ id: 'olc-alan', label: 'Alanını ölç', separatorBefore: true, onSelect: () => measureArea(hedef.id) });
      maddeler.push({ id: 'olc-cevre', label: 'Çevresini ölç', onSelect: () => measurePerimeter(hedef.id) });
    } else if (hedef.type === 'arc' || hedef.type === 'sector') {
      // Yay / daire dilimi: merkez açı her ikisinde de anlamlıdır (yarım çemberde 180°)
      const merkezAciAcik = (hedef as ArcObject | SectorObject).showCentralAngle !== false;
      maddeler.push({
        id: 'olc-merkez-aci',
        label: merkezAciAcik ? 'Merkez açıyı gizle' : 'Açısını ölç (merkez açı)',
        onSelect: () => measureArcAngle(hedef.id),
      });
      maddeler.push({ id: 'olc-yay', label: hedef.showArcLength ? 'Yay uzunluğunu gizle' : 'Yay uzunluğunu ölç', onSelect: () => hedef.showArcLength ? hideMeasurement(hedef.id, 'arcLength') : measureArcLength(hedef.id) });
      maddeler.push({ id: 'olc-yaricap', label: hedef.showRadius ? 'Yarıçap uzunluğunu gizle' : 'Yarıçap uzunluğunu ölç', onSelect: () => updateObject(hedef.id, { showRadius: !hedef.showRadius } as Partial<MathObject>, true) });
      maddeler.push({ id: 'olc-kiris', label: hedef.showChordLength ? 'Kiriş uzunluğunu gizle' : 'Kiriş / çap uzunluğunu ölç', onSelect: () => updateObject(hedef.id, { showChordLength: !hedef.showChordLength } as Partial<MathObject>, true) });
      if (hedef.type === 'sector') maddeler.push({ id: 'olc-cevre', label: hedef.showPerimeter ? 'Çevre uzunluğunu gizle' : 'Çevresini ölç', onSelect: () => hedef.showPerimeter ? hideMeasurement(hedef.id, 'perimeter') : measurePerimeter(hedef.id) });
      if (hedef.type === 'arc') {
        const ustundeY = uzerindekiNoktalar(hedef);
        if (ustundeY.length > 0) {
          const p = ustundeY.find((o) => selectedObjectIds.includes(o.id)) || ustundeY[0];
          maddeler.push({
            id: 'yayi-ayir',
            label: `${p.label} noktasından ikiye ayır`,
            onSelect: () => splitArcAtPoint(hedef.id, p.id),
          });
        }

      } else {
        maddeler.push({ id: 'olc-alan', label: 'Alanını ölç', onSelect: () => measureArea(hedef.id) });
      }
    } else if (hedef.type === 'angle') {
      const ang = hedef as AngleObject;
      const p1 = pointsById.get(ang.point1Id);
      const v = pointsById.get(ang.vertexPointId);
      const p3 = pointsById.get(ang.point3Id);
      const derece = p1 && v && p3 ? calculateAngleDegrees(p1, v, p3) : 0;
      const rotateConstruction = p3?.construction?.kind === 'rotate' ? p3.construction : undefined;
      const boundSlider = rotateConstruction?.sliderId
        ? (objects.find((o) => o.id === rotateConstruction.sliderId && o.type === 'slider') as SliderObject | undefined)
        : undefined;

      maddeler.push({
        id: 'ayarla-aci',
        label: 'Açıyı ayarla…',
        prompt: {
          scope: sliderScope,
          label: 'Açı (derece)',
          unit: '°',
          initial: formatTurkishNumber(Math.round(derece)),
          onSubmit: (val) => setAngleDegrees(ang.id, val),
        },
      });

      if (boundSlider) {
        maddeler.push({
          id: 'canlandir-aci',
          label: sliderPlaying ? 'Animasyonu Durdur' : `Animasyonu Başlat (${boundSlider.variableName})`,
          onSelect: () => toggleSliderPlayback(),
        });
        maddeler.push({
          id: 'surguyu-degistir-aci',
          label: `Sürgü Değişkenini Değiştir (${boundSlider.variableName})…`,
          prompt: {
            label: 'Sürgü Değişkeni / Adı',
            placeholder: 'ör. a, α, aci',
            initial: boundSlider.variableName,
            onSubmitText: (name) => bindAngleToSlider(ang.id, name),
          },
        });
        maddeler.push({
          id: 'surgu-baglantisini-kaldir',
          label: 'Sürgü Bağlantısını Kaldır',
          onSelect: () => unbindAngleFromSlider(ang.id),
        });
      } else {
        maddeler.push({
          id: 'surguye-bagla-canlandir',
          label: 'Canlandır (Sürgüye Bağla)…',
          prompt: {
            label: 'Sürgü Değişkeni / Adı',
            placeholder: 'ör. a, α, aci',
            initial: 'α',
            onSubmitText: (name) => bindAngleToSlider(ang.id, name),
          },
        });
      }

      maddeler.push({ id: 'ic-dis-aci', label: 'İç açı / dış açı', onSelect: () => toggleAngleReflex(ang.id) });
      // Rozete tıklamak dışında garantili bir çıkış yolu: menüden de gizlenebilsin
      maddeler.push({
        id: 'aci-deger-gorunurluk',
        label: ang.showValue === false ? 'Açı değerini göster' : 'Açı değerini gizle',
        onSelect: () =>
          ang.showValue === false
            ? updateObject(ang.id, { showValue: true } as Partial<MathObject>, true)
            : hideMeasurement(ang.id, 'angle'),
      });
    }

    if (hedef.type === 'text') maddeler.push({ id: 'metni-duzenle', label: 'Metni düzenle…', onSelect: () => { setEditingTextObj(hedef); setPendingTextWorldPos({ x: hedef.x, y: hedef.y }); setIsTextDialogOpen(true); } });
    if (hedef.type === 'measurement') maddeler.push({ id: 'olcum-goster', label: hedef.showValue === false ? 'Ölçümü göster' : 'Ölçümü gizle', onSelect: () => updateObject(hedef.id, { showValue: hedef.showValue === false } as Partial<MathObject>, true) });

    // İZ BIRAKMA (GeoGebra Show Trace)
    const traceDestekleyenler = ['point', 'segment', 'line', 'ray', 'circle', 'polygon', 'arc', 'sector', 'ellipse', 'function'];
    if (traceDestekleyenler.includes(hedef.type)) {
      maddeler.push({
        id: 'iz-birak',
        label: hedef.showTrace ? 'İzi Gizle (İz Açık)' : 'İzi Göster (İz Bırak)',
        separatorBefore: true,
        onSelect: () => updateObject(hedef.id, { showTrace: !hedef.showTrace } as Partial<MathObject>, true),
      });
    }

    if (Object.keys(traces).length > 0) {
      maddeler.push({
        id: 'izleri-temizle',
        label: 'Tüm İzleri Temizle',
        separatorBefore: true,
        onSelect: () => clearTraces(),
      });
    }

    // "Sil" her nesne türünde bulunur
    maddeler.push({
      id: 'sil',
      label: 'Sil',
      danger: true,
      separatorBefore: maddeler.length > 0,
      onSelect: () => deleteObject(hedef.id),
    });
    return maddeler.map(item => item.id.startsWith('olc-') && item.onSelect ? {
      ...item,
      onSelect: () => {
        setStyleMode('Ayrıntılı');
        setViewport(prev => ({ ...prev, showMeasurements: true }));
        item.onSelect?.();
      },
    } : item);
  }, [
    objectClipboard, viewport, addObjects, setSelectedObjectIds, setActiveTool, activeTool, commit,
    contextTarget,
    objects,
    pointsById,
    measureLength,
    measureArea,
    measurePerimeter,
    measureAngleAtPoint,
    measureArcAngle,
    measureArcLength,
    togglePolygonEdgeLabel,
    setAllPolygonEdgeLabels,
    splitPolygon,
    splitSegmentAtPoint,
    splitCircleAtPoints,
    splitArcAtPoint,
    uzerindekiNoktalar,
    connectPoints,
    disconnectPoints,
    fitPolynomialToPoints,
    selectedObjectIds,
    toggleAngleReflex,
    updateObject,
    hideMeasurement,
    setSegmentLength,
    setAngleDegrees,
    bindAngleToSlider,
    unbindAngleFromSlider,
    setCircleRadius,
    setLengthMeasurement,
    showDetails,
    deleteObject,
    traces,
    clearTraces,
    sliderPlaying,
    toggleSliderPlayback,
  ]);

  const handleObjectMouseDown = (e: React.MouseEvent, obj: MathObject) => {
    if (e.button !== 0) return; // Sadece sol tık
    e.stopPropagation();

    // PERGEL çizerken tıklama nesnenin üzerine gelebilir (çember, eksen, nokta…).
    // Burada durursak pergel adım atlamaz ve kullanıcının bir sonraki tıklaması
    // başlangıcı bambaşka bir yere koyar. Bu yüzden tıklamayı pergele iletiriz.
    if (activeTool === 'compass' && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      pergelAdimi(screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewport));
      return;
    }

    if (activeTool === 'delete') {
      deleteObject(obj.id);
      return;
    }

    if (activeTool === 'measure_distance' || activeTool === 'unit_measure') {
      if (obj.type === 'arc' || obj.type === 'sector') { measureArcLength(obj.id); return; }
      if (obj.type === 'line' || obj.type === 'ray') { measureLength(obj.id); return; }
      if (obj.type === 'segment') {
        const seg = obj as SegmentObject;
        const p1 = pointsById.get(seg.startPointId);
        const p2 = pointsById.get(seg.endPointId);
        if (p1 && p2) {
          const isCm = activeTool === 'measure_distance';
          const unit = isCm ? 'cm' : 'br';
          const distStr = formatTurkishNumber(calculateDistance(p1, p2));
          const segLabel = `|${p1.label}${p2.label}|`;
          commit(
            (prev) =>
              prev.map((o) =>
                o.id === seg.id ? ({ ...o, showLength: true, unit, label: segLabel } as MathObject) : o
              ),
            `${segLabel} = ${distStr} ${unit} ölçüldü`
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
      if (obj.type === 'sector' || obj.type === 'ellipse') { measurePerimeter(obj.id); return; }
      if (obj.type === 'polygon') {
        const poly = obj as PolygonObject;
        const polyPoints = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
        const perim = calculatePolygonPerimeter(polyPoints);
        commit(
          (prev) => prev.map((o) => (o.id === poly.id ? ({ ...o, showPerimeter: true } as MathObject) : o)),
          `${poly.label || 'Çokgen'} çevresi hesaplandı (${formatTurkishNumber(perim)} br)`
        );
        return;
      } else if (obj.type === 'circle') {
        commit(
          (prev) => prev.map((o) => (o.id === obj.id ? ({ ...o, showPerimeter: true } as MathObject) : o)),
          `${obj.label || 'Çember'} çevresi hesaplandı`
        );
        return;
      }
    }

    if (activeTool === 'measure_area') {
      if (obj.type === 'sector' || obj.type === 'ellipse') { measureArea(obj.id); return; }
      if (obj.type === 'polygon') {
        const poly = obj as PolygonObject;
        const polyPoints = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
        const area = calculatePolygonArea(polyPoints);
        commit(
          (prev) => prev.map((o) => (o.id === poly.id ? ({ ...o, showArea: true } as MathObject) : o)),
          `${poly.label || 'Çokgen'} alanı hesaplandı (${formatTurkishNumber(area)} br²)`
        );
        return;
      } else if (obj.type === 'circle') {
        commit(
          (prev) => prev.map((o) => (o.id === obj.id ? ({ ...o, showArea: true } as MathObject) : o)),
          `${obj.label || 'Daire'} alanı hesaplandı`
        );
        return;
      }
    }

    // KESİŞTİR: iki şekle sırayla tıklanır; ortak noktaları oluşturulur.
    if (activeTool === 'intersect') {
      if (obj.type === 'point') {
        setHintMessage('Kesiştirmek için NOKTA değil, iki şekle (doğru, çember, elips…) tıklayın.');
        return;
      }
      const ilk = kesistirIlkRef.current;
      if (!ilk) {
        kesistirIlkRef.current = obj.id;
        setSelectedObjectId(obj.id);
        setSelectedObjectIds([obj.id]);
        setHintMessage(`${obj.label || 'Şekil'} seçildi. Şimdi kesiştirmek istediğiniz ikinci şekle tıklayın.`);
        return;
      }
      if (ilk === obj.id) {
        setHintMessage('İki FARKLI şekil seçmelisiniz.');
        return;
      }
      const a = objects.find((o) => o.id === ilk);
      kesistirIlkRef.current = null;
      if (!a) return;
      kesisimNoktalariOlustur(a, obj);
      return;
    }

    if (activeTool === 'rotate') {
      // Hem tekil hem çoklu seçim güncellenmeli: döndürme paleti `selectedObjectIds`e bakıyor
      setSelectedObjectId(obj.id);
      setSelectedObjectIds([obj.id]);
      if (!dondurulebilir(obj)) {
        setHintMessage(
          obj.type === 'circle'
            ? 'Çember döndürülünce aynı görünür; döndürmek için yay veya daire dilimi kullanın.'
            : 'Bu şekil döndürülemiyor. Çokgen, yay, daire dilimi ve doğru parçası döndürülebilir.'
        );
      }
      return;
    }

    if (activeTool === 'reflect' || activeTool === 'symmetry') {
      // Simetri ekseni: doğru parçası, doğru veya ışın
      let axisPointIds: [string, string] | null = null;
      if (obj.type === 'segment') axisPointIds = [obj.startPointId, obj.endPointId];
      else if (obj.type === 'line') axisPointIds = [obj.point1Id, obj.point2Id];
      else if (obj.type === 'ray') axisPointIds = [obj.startPointId, obj.throughPointId];

      if (axisPointIds) {
        const p1 = pointsById.get(axisPointIds[0]);
        const p2 = pointsById.get(axisPointIds[1]);
        if (p1 && p2) {
          const axis = {
            id: obj.id,
            p1: { x: p1.x, y: p1.y },
            p2: { x: p2.x, y: p2.y },
            name: obj.label || `${p1.label}${p2.label} Doğrusu`,
          };

          const targetId = reflectTargetPolyId || selectedObjectId;
          const targetPoly = objects.find((o) => o.id === targetId && o.type === 'polygon') as
            | PolygonObject
            | undefined;

          if (targetPoly) {
            reflectPolygonAcrossSymmetryLine(targetPoly, axis.p1, axis.p2, axis.name);
            setReflectAxisLine(null);
            setReflectTargetPolyId(null);
          } else {
            setReflectAxisLine(axis);
            setHintMessage('Önce bir şekil seçin');
          }
          return;
        }
      } else if (obj.type === 'polygon') {
        const poly = obj as PolygonObject;
        setReflectTargetPolyId(poly.id);
        setSelectedObjectId(poly.id);

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

      const anchorId = getAnchorId(obj);
      const anchorPos = getAnchorPosition(anchorId);
      const anchorOffset = anchorPos ? { x: anchorPos.x - world.x, y: anchorPos.y - world.y } : { x: 0, y: 0 };

      setDraggingObjState({
        objectIds: targetIds,
        startWorld: world,
        lastWorld: world,
        hasMoved: false,
        anchorId: anchorPos ? anchorId : null,
        anchorOffset,
        virtualAnchor: anchorPos,
      });
    } else {
      if (obj.type === 'point') {
        handlePointClick(obj.id);
        return;
      }

      // Nokta üreten bir araçla ŞEKLE tıklandıysa, nokta o şeklin KENARINA konur.
      // Şekil tıklamayı yuttuğu için eskiden kenar üzerine nokta koyulamıyordu;
      // oysa kesişimi işaretlemek ya da alanı bölmek için nokta tam kenarda olmalı.
      const NOKTA_URETEN = [
        'point',
        'segment',
        'line',
        'ray',
        'circle',
        'circle_3points',
        'arc',
        'sector',
        'angle',
        'polygon',
        'midpoint',
        'divide_ratio',
        'perp_bisector',
        'angle_bisector',
        'perpendicular',
        'parallel',
        'segment_length',
        'translate',
        'measure_slope',
        'trig_ratios',
      ];
      if (NOKTA_URETEN.includes(activeTool) && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        handleCanvasClick(
          screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewport)
        );
        return;
      }

      setSelectedObjectId(obj.id);
    }
  };

  const handleSolidMouseDown = useCallback(
    (solid: Solid3DObject, e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      const isAlreadySelected = selectedSolidIds.includes(solid.id) || selectedSolidId === solid.id;
      if (e.shiftKey || e.ctrlKey) {
        const next = isAlreadySelected
          ? selectedSolidIds.filter((id) => id !== solid.id)
          : [...selectedSolidIds, solid.id];
        onSelectSolids?.(next);
        onSelectSolid?.(next.length > 0 ? next[next.length - 1] : null);
      } else {
        onSelectSolid?.(solid.id);
        onSelectSolids?.([solid.id]);
      }

      if (!e.shiftKey && !e.ctrlKey) {
        setSelectedObjectId(null);
        setSelectedObjectIds([]);
      }

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = screenToWorld({ x: screenX, y: screenY }, viewport);

      setDraggingSolidState({
        solidId: solid.id,
        startWorld: world,
        initialPos: { ...solid.position },
        hasMoved: false,
      });
    },
    [selectedSolidId, selectedSolidIds, onSelectSolid, onSelectSolids, setSelectedObjectId, setSelectedObjectIds, viewport]
  );

  // Çokgeni belirli bir açıyla döndürme (pozitif: saat yönünün tersi, negatif: saat yönü)
  /**
   * Bir şeklin döndürme verisi: HANGİ noktalar döner ve HANGİ nokta etrafında.
   *
   * Çokgen ağırlık merkezi etrafında döner. Yay ve daire dilimi ise KENDİ MERKEZ
   * noktası etrafında döner: merkez yerinde kalır, başlangıç ve bitiş noktaları
   * döner; böylece yarıçap ve merkez açı korunur, şekil yerinde döner.
   * (Önceden yalnızca çokgen döndürülebiliyordu; yarım daire gibi yeni şekillerde
   * döndürme aracı hiçbir şey yapmıyordu.)
   */
  const donusVerisi = (obj: MathObject): { points: PointObject[]; pivot: Point2D } | null => {
    if (obj.type === 'polygon') {
      const pts = (obj as PolygonObject).pointIds
        .map((id) => pointsById.get(id))
        .filter(Boolean) as PointObject[];
      if (pts.length === 0) return null;
      return {
        points: pts,
        pivot: {
          x: pts.reduce((t, p) => t + p.x, 0) / pts.length,
          y: pts.reduce((t, p) => t + p.y, 0) / pts.length,
        },
      };
    }

    if (obj.type === 'arc' || obj.type === 'sector') {
      const sh = obj as ArcObject | SectorObject;
      const merkez = pointsById.get(sh.centerPointId);
      const bas = pointsById.get(sh.startPointId);
      const bit = pointsById.get(sh.directionPointId);
      if (!merkez || !bas || !bit) return null;
      return { points: [bas, bit], pivot: { x: merkez.x, y: merkez.y } };
    }

    // Elipsin biçimi noktalarla değil, iki yarıçap ve bir AÇIYLA tanımlıdır.
    // Bu yüzden döndürmek nokta kaydırmak değil, `rotation` alanını değiştirmektir.
    if (obj.type === 'ellipse') {
      const merkez = pointsById.get((obj as EllipseObject).centerPointId);
      if (!merkez) return null;
      return { points: [], pivot: { x: merkez.x, y: merkez.y } };
    }

    // Doğru parçası kendi ORTA noktası etrafında döner.
    // Sonsuz doğru ve ışın dışarıda: döndürülmüş hâlleri ekranda ayırt edilemez.
    if (obj.type === 'segment') {
      const seg = obj as SegmentObject;
      const pts = [seg.startPointId, seg.endPointId]
        .map((id) => pointsById.get(id))
        .filter(Boolean) as PointObject[];
      if (pts.length < 2) return null;
      return {
        points: pts,
        pivot: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      };
    }

    return null;
  };

  /** Bu şekil döndürme aracıyla çevrilebilir mi? (Tam çemberi döndürmek görsel olarak anlamsızdır.) */
  const dondurulebilir = (obj: MathObject) => donusVerisi(obj) !== null;

  const rotateShapeByAngle = (obj: MathObject, deg: number) => {
    const veri = donusVerisi(obj);
    if (!veri) {
      setHintMessage('Bu şekil döndürülemiyor.');
      return;
    }
    if (obj.type === 'ellipse') {
      const elp = obj as EllipseObject;
      const yeni = (((elp.rotation ?? 0) + deg) % 360 + 360) % 360;
      updateObject(elp.id, { rotation: Number(yeni.toFixed(2)) } as Partial<MathObject>, false);
      recordHistory(`${obj.label || 'Elips'} ${formatTurkishNumber(deg)}° döndürüldü`);
      return;
    }

    const { points, pivot } = veri;
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    points.forEach((pt) => {
      const dx = pt.x - pivot.x;
      const dy = pt.y - pivot.y;
      const nx = Number((pivot.x + dx * cos - dy * sin).toFixed(2));
      const ny = Number((pivot.y + dx * sin + dy * cos).toFixed(2));
      updateObject(pt.id, { x: nx, y: ny }, false);
    });

    recordHistory(`${obj.label || 'Şekil'} ${formatTurkishNumber(deg)}° döndürüldü`);
  };

  const handleStartRotateShape = (e: React.MouseEvent, obj: MathObject) => {
    e.stopPropagation();
    e.preventDefault();

    const veri = donusVerisi(obj);
    if (!veri) return;

    const elipsMi = obj.type === 'ellipse';
    const baslangicAcisi = elipsMi ? (obj as EllipseObject).rotation ?? 0 : 0;
    const initialPositions = veri.points.map((p) => ({ id: p.id, x: p.x, y: p.y }));
    const cx = veri.pivot.x;
    const cy = veri.pivot.y;
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
      setRotatingFeedback({ shapeId: obj.id, deg });

      if (elipsMi) {
        const yeni = (((baslangicAcisi + deg) % 360) + 360) % 360;
        updateObject(obj.id, { rotation: Number(yeni.toFixed(2)) } as Partial<MathObject>, false);
        return;
      }

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
        recordHistory(`${obj.label || 'Şekil'} ${formatTurkishNumber(lastDeg)}° döndürüldü`);
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
    const polyPoints = targetPoly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];

    if (polyPoints.length < 3) return;

    const newPts: PointObject[] = polyPoints.map((p) => {
      const reflected = reflectPointAcrossLine({ x: p.x, y: p.y }, p1, p2);
      return makePoint(`${p.label}'`, reflected.x, reflected.y, '#9333ea');
    });

    const symPoly: PolygonObject = {
      id: createId('poly'),
      type: 'polygon',
      label: `${targetPoly.label || 'Çokgen'} Yansıması`,
      showLabel: true,
      pointIds: newPts.map((p) => p.id),
      color: '#9333ea',
      fillColor: '#9333ea',
      fillOpacity: 0.2,
      visible: true,
      showArea: true,
      showPerimeter: true,
      createdAt: Date.now(),
    };

    addObjects([...newPts, symPoly], `${targetPoly.label || 'Çokgen'}, ${axisName} eksenine göre yansıtıldı`);
  };

  // Zoom Hızlı Eylemleri (görünüm merkezi etrafında)
  const zoomIn = () => zoomAt(null, 1.2);
  const zoomOut = () => zoomAt(null, 1 / 1.2);

  const centerOrigin = () => {
    setViewport((prev) => ({
      ...prev,
      panX: 0,
      panY: 0,
      zoom: DEFAULT_ZOOM,
    }));
  };

  // Tüm nesnelerin sınırlayıcı kutusunu ekrana sığdır (nesne yoksa orijini ortala)
  const fitToObjects = () => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const include = (x: number, y: number, pad = 0) => {
      minX = Math.min(minX, x - pad);
      maxX = Math.max(maxX, x + pad);
      minY = Math.min(minY, y - pad);
      maxY = Math.max(maxY, y + pad);
    };

    for (const obj of objects) {
      if (!obj.visible) continue;
      if (obj.type === 'point') include(obj.x, obj.y);
      else if (obj.type === 'text') include(obj.x, obj.y);
      else if (obj.type === 'fraction') include(obj.x, obj.y, obj.radius);
      else if (obj.type === 'image') include(obj.x, obj.y, Math.max(obj.width, obj.height) / 2);
      else if (obj.type === 'pen') obj.points.forEach((p) => include(p.x, p.y));
      else if (obj.type === 'circle') {
        const c = pointsById.get(obj.centerPointId);
        if (c) {
          const rPt = obj.radiusPointId ? pointsById.get(obj.radiusPointId) : undefined;
          const r = rPt ? calculateDistance(c, rPt) : obj.fixedRadius ?? 0;
          include(c.x, c.y, r);
        }
      }
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      centerOrigin();
      return;
    }

    setViewport((prev) => {
      const padding = 1.5; // dünya birimi
      const boxW = Math.max(maxX - minX + padding * 2, 2);
      const boxH = Math.max(maxY - minY + padding * 2, 2);
      const zoom = Math.max(5, Math.min(300, Math.min(prev.width / boxW, prev.height / boxH)));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      return {
        ...prev,
        zoom,
        panX: -cx * zoom,
        panY: cy * zoom,
      };
    });
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
        {/* Sol alan: düzlem ve ayrıntı menüleri */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            aria-label="Seç ve Taşı"
            aria-keyshortcuts="V"
            aria-pressed={activeTool === 'select'}
            title="Seç ve Taşı (V)"
            className={`relative w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border shadow-sm backdrop-blur-md transition-colors cursor-pointer ${
              activeTool === 'select'
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800'
            }`}
          >
            <MousePointer className="w-5 h-5" />
            <kbd className="absolute bottom-0.5 right-1 text-[8px] leading-none opacity-75">V</kbd>
          </button>
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
                    setViewport((prev) => ({ ...prev, showGrid: true, showAxes: true }));
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    planeType === 'dik_koordinat'
                      ? 'bg-[#2563eb] text-white shadow-sm'
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
                      ? 'bg-[#2563eb] text-white shadow-sm'
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
                      ? 'bg-[#2563eb] text-white shadow-sm'
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
                          showMeasurements: true,
                        }));
                      }
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      styleMode === s
                        ? 'bg-[#2563eb] text-white shadow-sm'
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
              onClick={() => (onSwitchTo3D ? onSwitchTo3D() : setStudioDimension('3D'))}
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

          {solids && solids.length > 0 && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <button
                type="button"
                onClick={() => setSolidProjectionMode('top')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  solidProjectionMode === 'top'
                    ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="3D cisimler 2D düzlemde üstten görünüm (kare, dikdörtgen, daire) olarak gösterilir"
              >
                <span>⏹</span>
                <span>Üstten Görünüm</span>
              </button>
              <button
                type="button"
                onClick={() => setSolidProjectionMode('axonometric')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  solidProjectionMode === 'axonometric'
                    ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="3D cisimler 2D düzlemde 3D hacimli aksonometrik izdüşümle gösterilir"
              >
                <span>🧊</span>
                <span>3D İzdüşüm</span>
              </button>
            </div>
          )}

        </div>
      </div>

      <ToolCursor tool={activeTool} surfaceRef={svgRef} />
      <svg
        ref={svgRef}
        className="w-full h-full block transition-colors duration-200"
        style={{ backgroundColor: viewport.backgroundColor || 'transparent' }}
        /* Süzgeç KÖKE uygulanır; böylece dışa aktarımda kök SVG kopyalandığında
           (PNG/SVG/PDF/Word) çıktı da kendiliğinden siyah–beyaz olur. */
        filter={viewport.blackWhite ? 'url(#geoeba-siyah-beyaz)' : undefined}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextTarget({ obj: null, x: e.clientX, y: e.clientY, edgeIndex: null });
        }}
      >
        <defs>
          {/* saturate=0: parlaklığı koruyarak renkleri gri tona indirger */}
          <filter id="geoeba-siyah-beyaz" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>

        {/* Arka Plan Yakalayıcı */}
        <rect
          id="grid-background"
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill={viewport.backgroundColor || 'transparent'}
        />

        {/* 1. IZGARA KATMANI (NET VE BELİRGİN GRAFİK KAĞIDI IZGARASI) */}
        {viewport.showGrid && (
          <g className="grid-lines select-none pointer-events-none">
            {gridLines.xLines.map((xVal) => {
              const p = worldToScreen({ x: xVal, y: 0 }, viewport);
              const isMainAxis = xVal === 0;
              const isMajor = Math.abs(xVal % 5) < 0.001;
              const isInteger = Math.abs(Math.round(xVal) - xVal) < 0.001;
              // Ana eksenler (x=0, y=0) yalnızca eksenler açıkken ayrıca çizilir;
              // Kareli düzlemde (eksenler kapalıyken) ızgara çizgisi olarak eksiksiz çizilir.
              if (isMainAxis && viewport.showAxes) return null;

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

              if (isMainAxis && viewport.showAxes) return null;

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
              <rect width="100" height="26" rx="8" fill="#10b981" fillOpacity="0.18" stroke="#10b981" strokeWidth="1.5" className="shadow-sm backdrop-blur-sm" />
              <text x="50" y="17" textAnchor="middle" fill="#047857" fontSize={fs(11, 'axis')} className="font-bold font-sans">
                I. Bölge (+, +)
              </text>
            </g>
            {/* II. Bölge (Sol Üst: -, +) */}
            <g transform={`translate(${Math.min(originScreen.x - 130, Math.max(30, originScreen.x / 2 - 50))}, ${Math.min(originScreen.y - 45, Math.max(30, originScreen.y / 2 - 12))})`}>
              <rect width="100" height="26" rx="8" fill="#f59e0b" fillOpacity="0.18" stroke="#f59e0b" strokeWidth="1.5" className="shadow-sm backdrop-blur-sm" />
              <text x="50" y="17" textAnchor="middle" fill="#b45309" fontSize={fs(11, 'axis')} className="font-bold font-sans">
                II. Bölge (-, +)
              </text>
            </g>
            {/* III. Bölge (Sol Alt: -, -) */}
            <g transform={`translate(${Math.min(originScreen.x - 130, Math.max(30, originScreen.x / 2 - 50))}, ${Math.max(originScreen.y + 30, Math.min(viewport.height - 45, (viewport.height + originScreen.y) / 2 - 12))})`}>
              <rect width="100" height="26" rx="8" fill="#8b5cf6" fillOpacity="0.18" stroke="#8b5cf6" strokeWidth="1.5" className="shadow-sm backdrop-blur-sm" />
              <text x="50" y="17" textAnchor="middle" fill="#6d28d9" fontSize={fs(11, 'axis')} className="font-bold font-sans">
                III. Bölge (-, -)
              </text>
            </g>
            {/* IV. Bölge (Sağ Alt: +, -) */}
            <g transform={`translate(${Math.max(originScreen.x + 30, Math.min(viewport.width - 130, (viewport.width + originScreen.x) / 2 - 50))}, ${Math.max(originScreen.y + 30, Math.min(viewport.height - 45, (viewport.height + originScreen.y) / 2 - 12))})`}>
              <rect width="100" height="26" rx="8" fill="#0284c7" fillOpacity="0.18" stroke="#0284c7" strokeWidth="1.5" className="shadow-sm backdrop-blur-sm" />
              <text x="50" y="17" textAnchor="middle" fill="#0369a1" fontSize={fs(11, 'axis')} className="font-bold font-sans">
                IV. Bölge (+, -)
              </text>
            </g>
          </g>
        )}

        {/* 3. EKSENLER VE SAYISAL ÇENTİKLER KATMANI */}
        {viewport.showAxes && (
          <g fontSize={fs(10, 'axis')} className="axes text-muted-foreground font-mono">
            {/* X Ekseni */}
            {originScreen.y >= -1000 && originScreen.y <= Math.max(viewport.height, 2000) + 1000 && (
              <>
                <line
                  x1={-1000}
                  y1={originScreen.y}
                  x2={Math.max(viewport.width, 3000) + 1000}
                  y2={originScreen.y}
                  stroke="#737373"
                  strokeWidth={2.5}
                />
                {/* X Eksen Sağ Ok (+x) */}
                <polygon
                  points={`${viewport.width - 12},${originScreen.y - 6} ${viewport.width - 2},${originScreen.y} ${viewport.width - 12},${originScreen.y + 6}`}
                  fill="#737373"
                />
                {/* X Eksen Sol Ok (-x) */}
                <polygon
                  points={`12,${originScreen.y - 6} 2,${originScreen.y} 12,${originScreen.y + 6}`}
                  fill="#737373"
                />
                {/* X Eksen Etiketi */}
                <g transform={`translate(${viewport.width - 46}, ${Math.max(14, Math.min(viewport.height - 30, originScreen.y - 24))})`}>
                  <rect width="36" height="20" rx="6" fill="#737373" className="shadow-sm" />
                  <text x="18" y="14" textAnchor="middle" fill="#ffffff" fontSize={fs(11, 'axis')} className="font-black font-sans">
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
                  stroke="#737373"
                  strokeWidth={2.5}
                />
                {/* Y Eksen Üst Ok (+y) */}
                <polygon
                  points={`${originScreen.x - 6},12 ${originScreen.x},2 ${originScreen.x + 6},12`}
                  fill="#737373"
                />
                {/* Y Eksen Alt Ok (-y) — Aşağıya doğru tam genişleme */}
                <polygon
                  points={`${originScreen.x - 6},${viewport.height - 12} ${originScreen.x},${viewport.height - 2} ${originScreen.x + 6},${viewport.height - 12}`}
                  fill="#737373"
                />
                {/* Y Eksen Üst Etiketi (+y) */}
                <g transform={`translate(${Math.max(10, Math.min(viewport.width - 46, originScreen.x + 10))}, 10)`}>
                  <rect width="36" height="20" rx="6" fill="#737373" className="shadow-sm" />
                  <text x="18" y="14" textAnchor="middle" fill="#ffffff" fontSize={fs(11, 'axis')} className="font-black font-sans">
                    +y
                  </text>
                </g>
                {/* Y Eksen Alt Etiketi (-y) */}
                <g transform={`translate(${Math.max(10, Math.min(viewport.width - 46, originScreen.x + 10))}, ${viewport.height - 30})`}>
                  <rect width="36" height="20" rx="6" fill="#737373" className="shadow-sm" />
                  <text x="18" y="14" textAnchor="middle" fill="#ffffff" fontSize={fs(11, 'axis')} className="font-black font-sans">
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
                    stroke="#737373"
                    strokeWidth={1.5}
                  />
                  <text
                    x={p.x}
                    y={labelY}
                    textAnchor="middle"
                    fontSize={fs(10, 'axis')} className="fill-foreground/80 select-none font-bold"
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
                    stroke="#737373"
                    strokeWidth={1.5}
                  />
                  <text
                    x={labelX}
                    y={p.y + 3.5}
                    textAnchor="end"
                    fontSize={fs(10, 'axis')} className="fill-foreground/80 select-none font-bold"
                  >
                    {formatTurkishNumber(yVal)}
                  </text>
                </g>
              );
            })}

            {/* O (Orijin 0,0) Rozeti ve Odak Halkası */}
            {originScreen.x >= -30 && originScreen.x <= viewport.width + 30 && originScreen.y >= -30 && originScreen.y <= viewport.height + 30 && (
              <g transform={`translate(${originScreen.x}, ${originScreen.y})`}>
                <circle cx="0" cy="0" r="14" fill="#737373" fillOpacity="0.15" stroke="#737373" strokeWidth="1.5" strokeDasharray="3,2" />
                <circle cx="0" cy="0" r="4" fill="#737373" stroke="#ffffff" strokeWidth="1.5" />
                <g transform="translate(8, 8)">
                  <rect width="48" height="20" rx="6" fill="#ffffff" stroke="#737373" strokeWidth="1.5" className="shadow-sm" />
                  <text x="24" y="14" textAnchor="middle" fill="#737373" fontSize={fs(10, 'axis')} className="font-mono font-black">
                    (0; 0)
                  </text>
                </g>
              </g>
            )}
          </g>
        )}

        {/* 2.5 İZLER (TRACES) KATMANI — GeoGebra Show Trace */}
        {Object.entries(traces).map(([id, trace]) => {
          if (!trace.points || trace.points.length < 2) return null;
          const ptsStr = trace.points
            .map((pt) => {
              const sp = worldToScreen(pt, viewport);
              return `${sp.x},${sp.y}`;
            })
            .join(' ');
          return (
            <g key={`trace-${id}`} className="pointer-events-none select-none">
              <polyline
                points={ptsStr}
                fill="none"
                stroke={trace.color || '#2563eb'}
                strokeWidth={2}
                strokeOpacity={0.65}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="3,3"
              />
              {trace.points.map((pt, idx) => {
                if (idx % 3 !== 0) return null;
                const sp = worldToScreen(pt, viewport);
                return (
                  <circle
                    key={`tr-pt-${id}-${idx}`}
                    cx={sp.x}
                    cy={sp.y}
                    r={2}
                    fill={trace.color || '#2563eb'}
                    fillOpacity={0.7}
                  />
                );
              })}
            </g>
          );
        })}

        {/* 3. FONKSİYON GRAFİKLERİ KATMANI */}
        {objects
          .filter((o) => o.type === 'function' && o.visible)
          .map((obj) => {
            const fn = obj as FunctionObject;
            const compiled = getCompiledExpression(fn.expression);
            if (!compiled) return null;

            const safeEval = (x: number): number => {
              try {
                const y = compiled(x, sliderScope);
                return typeof y === 'number' ? y : NaN;
              } catch (e) {
                return NaN;
              }
            };

            const pointsCount = Math.min(800, Math.max(200, Math.floor(viewport.width / 2)));
            const dx = (worldBounds.maxX - worldBounds.minX) / pointsCount;
            const rangeH = Math.max(worldBounds.maxY - worldBounds.minY, 1e-6);
            // Görünür alanın çok dışına taşan değerler kırpılır (kesikli çizgi değil, ekran dışına çıkış)
            const clampLimit = rangeH * 3;
            const clampY = (y: number) =>
              Math.max(worldBounds.minY - clampLimit, Math.min(worldBounds.maxY + clampLimit, y));

            let pathD = '';
            let isDrawing = false;
            let prevX = 0;
            let prevY: number | null = null;

            for (let i = 0; i <= pointsCount; i++) {
              const xVal = worldBounds.minX + i * dx;
              const yVal = safeEval(xVal);

              // Tanımsız / sonsuz örnek: yol burada kesilir (yeni parça 'M' ile başlar)
              if (!Number.isFinite(yVal)) {
                isDrawing = false;
                prevY = null;
                continue;
              }

              // Süreksizlik tespiti (tan x, 1/x gibi): işaret değişimi + görünür aralığa göre büyük sıçrama
              if (prevY !== null && isDrawing) {
                const signChanged = Math.sign(prevY) !== Math.sign(yVal) && prevY !== 0 && yVal !== 0;
                const bigJump = Math.abs(yVal - prevY) > rangeH * 0.5;
                if (signChanged && bigJump) {
                  // Kutup (dikey asimptot) doğrulaması: iki örneğin ortasına bak.
                  // Orta değer, KENDİ tarafındaki uç örnekten daha da büyümüşse
                  // arada sonsuza kaçan bir kutup vardır -> kop.
                  // Dik ama sürekli bir sıfır geçişinde (ör. 1000x) orta değer
                  // her zaman iki uç değerin arasında kalır -> kopma olmaz.
                  const midY = safeEval((prevX + xVal) / 2);
                  const sameSideRef =
                    Math.sign(midY) === Math.sign(prevY) ? Math.abs(prevY) : Math.abs(yVal);
                  const isPole = !Number.isFinite(midY) || Math.abs(midY) >= sameSideRef;
                  if (isPole) {
                    isDrawing = false;
                  }
                }
              }

              const sPoint = worldToScreen({ x: xVal, y: clampY(yVal) }, viewport);

              if (!isDrawing) {
                pathD += `M ${sPoint.x} ${sPoint.y} `;
                isDrawing = true;
              } else {
                pathD += `L ${sPoint.x} ${sPoint.y} `;
              }
              prevX = xVal;
              prevY = yVal;
            }

            return (
              <g key={fn.id} className="function-plot" data-object-id={fn.id} onContextMenu={(e) => openContextMenu(e, fn)} onMouseDown={(e) => handleObjectMouseDown(e, fn)} onTouchStart={(e) => handleTouchStartOnObject(e, fn)} onTouchMove={cancelLongPress} onTouchEnd={() => cancelLongPress()} onTouchCancel={() => cancelLongPress()}>
                <path d={pathD} fill="none" stroke="transparent" strokeWidth={14} />
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
            const polyPoints = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];

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
                data-object-id={poly.id} onContextMenu={(e) => openContextMenu(e, poly)}
                onTouchStart={(e) => handleTouchStartOnObject(e, poly)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
              >
                <polygon
                  points={pointsAttr}
                  fill={poly.fillColor || poly.color || '#10b981'}
                  fillOpacity={styleSettings.hideFills ? 0 : poly.fillOpacity || 0.15}
                  stroke={isSelected ? '#ec4899' : poly.color || '#10b981'}
                  strokeWidth={sw(isSelected ? 3 : 2)}
                  className="transition-colors"
                />

                {/* KENAR UZUNLUKLARI: sağ tık menüsünden tek tek veya toplu açılır.
                    Etiket kenarın ORTA noktasına, çokgenin DIŞINA doğru yerleştirilir. */}
                {showDetails &&
                  (poly.edgeLabels || []).map((i) => {
                    if (i < 0 || i >= polyPoints.length) return null;
                    const a = polyPoints[i];
                    const b = polyPoints[(i + 1) % polyPoints.length];
                    const uzunluk = calculateDistance(a, b);
                    const orta = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                    const ortaEkran = worldToScreen(orta, viewport);

                    // Kenara dik birim vektör; ağırlık merkezinden UZAKLAŞAN yönü seçilir
                    const sa = screenCoords[i];
                    const sb = screenCoords[(i + 1) % screenCoords.length];
                    const dx = sb.x - sa.x;
                    const dy = sb.y - sa.y;
                    const boy = Math.hypot(dx, dy) || 1;
                    let nx = -dy / boy;
                    let ny = dx / boy;
                    if ((ortaEkran.x - centroidScreen.x) * nx + (ortaEkran.y - centroidScreen.y) * ny < 0) {
                      nx = -nx;
                      ny = -ny;
                    }
                    const ex = ortaEkran.x + nx * 16;
                    const ey = ortaEkran.y + ny * 16;

                    const metin = `${formatTurkishNumber(uzunluk)} br`;
                    const genislik = Math.max(38, metin.length * 6.6 + 10);
                    const et = olcumEtiketi(poly.id, edgeLabelKey(i));

                    return (
                      <g
                        key={`kenar-${poly.id}-${i}`}
                        transform={et.transform}
                        style={et.style}
                        onPointerDown={et.onPointerDown}
                        onClick={et.onClick}
                        className="select-none"
                      >
                        <rect
                          x={ex - genislik / 2}
                          y={ey - 10}
                          width={genislik}
                          height={20}
                          rx="6"
                          fill="#ffffff"
                          fillOpacity={0.92}
                          style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
                          stroke={poly.color || '#10b981'}
                          strokeWidth="1.2"
                          className="dark:fill-slate-900"
                        />
                        <text
                          x={ex}
                          y={ey + 4}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="700"
                          fill={poly.color || '#10b981'}
                          className="dark:fill-emerald-300"
                        >
                          {metin}
                        </text>
                      </g>
                    );
                  })}

                {(hasArea || hasPerimeter) && (() => {
                  const et = olcumEtiketi(poly.id, hasArea ? 'area' : 'perimeter');
                  // Etiket şeklin GÖVDESİNİN DIŞINDA, alt kenarın altında durur.
                  // Ağırlık merkezindeyken kullanıcı şekli ortasından tutmak istediğinde
                  // etiketi yakalıyor ve şekil taşınamıyordu (açı rozetinde de aynı kural var).
                  const altY = Math.max(...screenCoords.map((c) => c.y));
                  const etiketMerkezi = { x: centroidScreen.x, y: altY + (hasArea && hasPerimeter ? 46 : 34) };
                  return (
                  <g
                    transform={`translate(${etiketMerkezi.x}, ${etiketMerkezi.y}) ${et.transform}`}
                    className="drop-shadow-sm select-none"
                    style={et.style}
                    onPointerDown={et.onPointerDown}
                    onClick={et.onClick}
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
                          style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
                          stroke={poly.color || '#10b981'}
                          strokeWidth="1.2"
                          className="shadow-sm dark:fill-slate-900"
                        />
                        <text
                          x="0"
                          y="-4"
                          textAnchor="middle"
                          fontSize={fs(11, 'measure')} className="fill-emerald-700 dark:fill-emerald-400 font-bold font-sans"
                        >
                          Alan = {formatTurkishNumber(area)} br²
                        </text>
                        <text
                          x="0"
                          y="13"
                          textAnchor="middle"
                          fontSize={fs(11, 'measure')} className="fill-indigo-700 dark:fill-indigo-400 font-bold font-sans"
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
                          style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
                          stroke="#6366f1"
                          strokeWidth="1.2"
                          className="shadow-sm dark:fill-slate-900"
                        />
                        <text
                          x="0"
                          y="5"
                          textAnchor="middle"
                          fontSize={fs(11, 'measure')} className="fill-indigo-700 dark:fill-indigo-400 font-bold font-sans"
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
                          style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
                          stroke="#10b981"
                          strokeWidth="1.2"
                          className="shadow-sm dark:fill-slate-900"
                        />
                        <text
                          x="0"
                          y="5"
                          textAnchor="middle"
                          fontSize={fs(11, 'measure')} className="fill-emerald-700 dark:fill-emerald-400 font-bold font-sans"
                        >
                          Alan = {formatTurkishNumber(area)} br²
                        </text>
                      </>
                    )}
                  </g>
                  );
                })()}

                {/* 🔄 DÖNDÜRME PALETİ (Şekli Döndür Aracı)
                    GENEL KURAL: palet yalnızca SEÇİLİ şekilde görünür. Aksi hâlde tuvaldeki
                    her çokgen kendi paletini çizip ekranı okunmaz hâle getiriyordu. */}
                {activeTool === 'rotate' && isSelected && (
                  <RotateGizmo
                    center={centroidScreen}
                    feedbackDeg={rotatingFeedback?.shapeId === poly.id ? rotatingFeedback.deg : null}
                    onFreeRotateStart={(e) => handleStartRotateShape(e, poly)}
                    onRotate={(deg) => rotateShapeByAngle(poly, deg)}
                  />
                )}
              </g>
            );
          })}

        {/* 4.1 3D KATI CİSİMLER KATMANI (Küp, Prizma, Silindir, Koni, Piramit, Küre) */}
        {solids && solids.length > 0 && (
          <g id="layer-solids-3d">
            {solids.map((solid) => {
              const isSelected = selectedSolidIds.includes(solid.id) || selectedSolidId === solid.id;
              const proj = projectSolidFor2D(solid, viewport, isSelected, solidProjectionMode);

              return (
                <g
                  key={solid.id}
                  id={`solid-${solid.id}`}
                  className="cursor-move group"
                  onMouseDown={(e) => handleSolidMouseDown(solid, e)}
                >
                  {/* ======================================================== */}
                  {/* A) ÜSTTEN GÖRÜNÜM MODU (Küp -> Kare, Prizma -> Dikdörtgen, vb.) */}
                  {/* ======================================================== */}
                  {solidProjectionMode === 'top' && proj.topView && (
                    <g id={`solid-topview-${solid.id}`}>
                      {/* 1. Çokgen Tabanlı Cisimler (Küp -> Kare, Prizma -> Dikdörtgen, Üçgen Prizma -> Üçgen) */}
                      {proj.topView.kind === 'polygon' && proj.topView.pointsAttr && (
                        <g>
                          <polygon
                            points={proj.topView.pointsAttr}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.20}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2.6 : 1.8}
                            strokeLinejoin="round"
                          />
                          {/* Köşe Noktaları */}
                          {proj.topView.points?.map((pt, pti) => (
                            <circle
                              key={pti}
                              cx={pt.x}
                              cy={pt.y}
                              r={isSelected ? 4 : 3}
                              fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            />
                          ))}
                        </g>
                      )}

                      {/* 2. Dairesel Cisimler (Silindir -> Daire, Küre -> Daire) */}
                      {proj.topView.kind === 'circle' && proj.topView.radius && (
                        <g>
                          <circle
                            cx={proj.topView.centerScreen.x}
                            cy={proj.topView.centerScreen.y}
                            r={proj.topView.radius}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.20}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2.6 : 1.8}
                          />
                          <circle
                            cx={proj.topView.centerScreen.x}
                            cy={proj.topView.centerScreen.y}
                            r={3}
                            fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                          />
                        </g>
                      )}

                      {/* 3. Koni (Daire + Tepe Noktası / Artı İşareti) */}
                      {proj.topView.kind === 'cone' && proj.topView.radius && (
                        <g>
                          <circle
                            cx={proj.topView.centerScreen.x}
                            cy={proj.topView.centerScreen.y}
                            r={proj.topView.radius}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.20}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2.6 : 1.8}
                          />
                          <line
                            x1={proj.topView.centerScreen.x - 6}
                            y1={proj.topView.centerScreen.y}
                            x2={proj.topView.centerScreen.x + 6}
                            y2={proj.topView.centerScreen.y}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={1.5}
                          />
                          <line
                            x1={proj.topView.centerScreen.x}
                            y1={proj.topView.centerScreen.y - 6}
                            x2={proj.topView.centerScreen.x}
                            y2={proj.topView.centerScreen.y + 6}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={1.5}
                          />
                          <circle
                            cx={proj.topView.centerScreen.x}
                            cy={proj.topView.centerScreen.y}
                            r={3}
                            fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                          />
                        </g>
                      )}

                      {/* 4. Piramit (Taban Dikdörtgeni + Tepeye Birleşen 4 Ayrıt) */}
                      {proj.topView.kind === 'pyramid' && proj.topView.pointsAttr && (
                        <g>
                          <polygon
                            points={proj.topView.pointsAttr}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.20}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2.6 : 1.8}
                            strokeLinejoin="round"
                          />
                          {proj.topView.diagEdges?.map((diag, di) => (
                            <line
                              key={di}
                              x1={diag.from.x}
                              y1={diag.from.y}
                              x2={diag.to.x}
                              y2={diag.to.y}
                              stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                              strokeWidth={1.6}
                              strokeDasharray="4 3"
                            />
                          ))}
                          <circle
                            cx={proj.topView.centerScreen.x}
                            cy={proj.topView.centerScreen.y}
                            r={3.5}
                            fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                          />
                          {proj.topView.points?.map((pt, pti) => (
                            <circle
                              key={pti}
                              cx={pt.x}
                              cy={pt.y}
                              r={isSelected ? 4 : 3}
                              fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            />
                          ))}
                        </g>
                      )}

                      {/* Kenar / Yarıçap Ölçü Etiketleri */}
                      {showDetails &&
                        proj.topView.dimensionLabels.map((lbl, li) => (
                          <g key={li} className="select-none pointer-events-none">
                            <rect
                              x={lbl.x - 30}
                              y={lbl.y - 11}
                              width="60"
                              height="20"
                              rx="5"
                              fill="#ffffff"
                              fillOpacity="0.92"
                              stroke="#cbd5e1"
                              strokeWidth="0.9"
                              className="dark:fill-slate-900 dark:stroke-slate-700 shadow-2xs"
                            />
                            <text
                              x={lbl.x}
                              y={lbl.y + 3}
                              textAnchor="middle"
                              fontSize="10"
                              className="font-mono font-bold fill-slate-800 dark:fill-slate-200"
                            >
                              {lbl.text}
                            </text>
                          </g>
                        ))}
                    </g>
                  )}

                  {/* ======================================================== */}
                  {/* B) AKSONOMETRİK / HACİMLİ 3D GÖRÜNÜM MODU */}
                  {/* ======================================================== */}
                  {solidProjectionMode === 'axonometric' && (
                    <g id={`solid-axon-${solid.id}`}>
                      {/* 1. Zemin İzdüşümü (Z=0 Düzlemindeki Taban İzi) */}
                      {proj.footprint.pointsAttr && (
                        <polygon
                          points={proj.footprint.pointsAttr}
                          fill={solid.color || '#3b82f6'}
                          fillOpacity={isSelected ? 0.22 : 0.08}
                          stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                          strokeWidth={isSelected ? 1.8 : 1.2}
                          strokeDasharray="4 3"
                        />
                      )}

                      {/* 2. Eğri Yüzeyli Cisimler (Silindir, Koni, Küre) */}
                      {proj.curves && proj.curves.kind === 'cylinder' && (
                        <g>
                          <ellipse
                            cx={proj.curves.bottomCenter.x}
                            cy={proj.curves.bottomCenter.y}
                            rx={proj.curves.rx}
                            ry={proj.curves.ry}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.22}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2 : 1.5}
                            strokeDasharray="4 3"
                          />
                          {proj.curves.topCenter && (
                            <path
                              d={`M ${proj.curves.bottomCenter.x - proj.curves.rx} ${proj.curves.bottomCenter.y}
                                  L ${proj.curves.topCenter.x - proj.curves.rx} ${proj.curves.topCenter.y}
                                  A ${proj.curves.rx} ${proj.curves.ry} 0 0 0 ${proj.curves.topCenter.x + proj.curves.rx} ${proj.curves.topCenter.y}
                                  L ${proj.curves.bottomCenter.x + proj.curves.rx} ${proj.curves.bottomCenter.y}
                                  A ${proj.curves.rx} ${proj.curves.ry} 0 0 1 ${proj.curves.bottomCenter.x - proj.curves.rx} ${proj.curves.bottomCenter.y} Z`}
                              fill={solid.color || '#3b82f6'}
                              fillOpacity={isSelected ? 0.3 : 0.18}
                              stroke="none"
                            />
                          )}
                          {proj.curves.sideLines?.map((sl, sli) => (
                            <line
                              key={sli}
                              x1={sl.from.x}
                              y1={sl.from.y}
                              x2={sl.to.x}
                              y2={sl.to.y}
                              stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                              strokeWidth={isSelected ? 2 : 1.5}
                            />
                          ))}
                          {proj.curves.topCenter && (
                            <ellipse
                              cx={proj.curves.topCenter.x}
                              cy={proj.curves.topCenter.y}
                              rx={proj.curves.rx}
                              ry={proj.curves.ry}
                              fill={solid.color || '#3b82f6'}
                              fillOpacity={isSelected ? 0.45 : 0.32}
                              stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                              strokeWidth={isSelected ? 2 : 1.5}
                            />
                          )}
                        </g>
                      )}

                      {proj.curves && proj.curves.kind === 'cone' && (
                        <g>
                          <ellipse
                            cx={proj.curves.bottomCenter.x}
                            cy={proj.curves.bottomCenter.y}
                            rx={proj.curves.rx}
                            ry={proj.curves.ry}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.3 : 0.18}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2 : 1.5}
                            strokeDasharray="4 3"
                          />
                          {proj.curves.topCenter && (
                            <polygon
                              points={`${proj.curves.bottomCenter.x - proj.curves.rx},${proj.curves.bottomCenter.y} ${proj.curves.topCenter.x},${proj.curves.topCenter.y} ${proj.curves.bottomCenter.x + proj.curves.rx},${proj.curves.bottomCenter.y}`}
                              fill={solid.color || '#3b82f6'}
                              fillOpacity={isSelected ? 0.32 : 0.2}
                              stroke="none"
                            />
                          )}
                          {proj.curves.sideLines?.map((sl, sli) => (
                            <line
                              key={sli}
                              x1={sl.from.x}
                              y1={sl.from.y}
                              x2={sl.to.x}
                              y2={sl.to.y}
                              stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                              strokeWidth={isSelected ? 2 : 1.5}
                            />
                          ))}
                          {proj.curves.topCenter && (
                            <circle
                              cx={proj.curves.topCenter.x}
                              cy={proj.curves.topCenter.y}
                              r={3.5}
                              fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            />
                          )}
                        </g>
                      )}

                      {proj.curves && proj.curves.kind === 'sphere' && (
                        <g>
                          <circle
                            cx={proj.curves.bottomCenter.x}
                            cy={proj.curves.bottomCenter.y}
                            r={proj.curves.sphereR}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.22}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2.2 : 1.6}
                          />
                          <ellipse
                            cx={proj.curves.bottomCenter.x}
                            cy={proj.curves.bottomCenter.y}
                            rx={proj.curves.rx}
                            ry={proj.curves.ry}
                            fill="none"
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={1.2}
                            strokeDasharray="4 3"
                            strokeOpacity={0.7}
                          />
                        </g>
                      )}

                      {/* 3. Çokyüzlü Cisimlerin Yüzeyleri (Küp, Prizma, Piramit) */}
                      {!proj.curves &&
                        proj.faces.map((face, fi) => (
                          <polygon
                            key={fi}
                            points={face.pointsAttr}
                            fill={face.fill}
                            fillOpacity={isSelected ? Math.min(1, face.fillOpacity + 0.15) : face.fillOpacity}
                            stroke={face.stroke}
                            strokeWidth={face.strokeWidth}
                            strokeLinejoin="round"
                          />
                        ))}

                      {/* 4. Çokyüzlü Cisimlerin Ayrıtları (Görünen düz, arkadaki kesikli) */}
                      {!proj.curves &&
                        proj.edges.map((edge, ei) => (
                          <line
                            key={ei}
                            x1={edge.from.x}
                            y1={edge.from.y}
                            x2={edge.to.x}
                            y2={edge.to.y}
                            stroke={edge.stroke}
                            strokeWidth={edge.strokeWidth}
                            strokeDasharray={edge.isHidden ? '4 3' : undefined}
                            strokeOpacity={edge.isHidden ? 0.6 : 1}
                            strokeLinecap="round"
                          />
                        ))}
                    </g>
                  )}

                  {/* 5. Cisim Bilgi Rozeti (Başlık, Boyut, Taban Alanı, Hacim) */}
                  {showDetails && (
                    <g
                      transform={`translate(${proj.badge.x}, ${proj.badge.y})`}
                      className="select-none pointer-events-none"
                    >
                      <rect
                        x="-60"
                        y="-19"
                        width="120"
                        height="38"
                        rx="8"
                        fill="#0f172a"
                        fillOpacity="0.90"
                        stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                        strokeWidth={isSelected ? '1.8' : '1.2'}
                        className="shadow-md backdrop-blur-xs"
                      />
                      <text
                        x="0"
                        y="-4"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#ffffff"
                        className="font-sans"
                      >
                        {proj.badge.title}
                      </text>
                      <text
                        x="0"
                        y="11"
                        textAnchor="middle"
                        fontSize="8.5"
                        fill="#cbd5e1"
                        className="font-mono"
                      >
                        {proj.topView
                          ? `A=${formatTurkishNumber(proj.topView.baseArea)} br² · V=${formatTurkishNumber(proj.badge.volume)} br³`
                          : `${proj.badge.dimText} · V=${formatTurkishNumber(proj.badge.volume)} br³`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* 4.25 ÖLÇÜM ETİKETLERİ — "AB eğimi = 5" gibi CANLI sonuç yazıları.
            Değer her karede noktalardan yeniden hesaplanır; noktalar taşınınca güncellenir. */}
        {objects
          .filter((o) => o.type === 'measurement' && o.visible !== false)
          .map((obj) => {
            const m = obj as MeasurementObject;
            const noktalar = m.pointIds.map((id) => pointsById.get(id));
            if (noktalar.some((p) => !p)) return null;
            if (!showDetails || m.showValue === false) return null;

            const et = olcumEtiketi(m.id, 'measure');

            // İKİ NOKTA ARASI UZUNLUK — parça üzerindeki nokta için |AP|, bölünmüş zincir için |AB|.
            // Ölçü çizgisiyle çizilir ki hangi aralığın ölçüldüğü görülsün; kapsayan (daha uzun) ölçüm
            // bir kat dışarıda durur. Bu dal trig'den ÖNCE olmalı: trig üç nokta bekler.
            if (m.kind === 'distance') {
              const [a, b] = noktalar as PointObject[];
              const sa = worldToScreen(a, viewport);
              const sb = worldToScreen(b, viewport);
              const dx = sb.x - sa.x;
              const dy = sb.y - sa.y;
              const boy = Math.hypot(dx, dy) || 1;
              // Normal ekranda YUKARI bakar; soldan sağa çizilmiş parçanın kendi uzunluk etiketi
              // altta durduğu için üst üste binmezler.
              let nx = -dy / boy;
              let ny = dx / boy;
              // Tam dikey çizgide (ny = 0) yön nokta sırasına kalmasın: etiketler hep sağa konur
              if (ny > 1e-9 || (Math.abs(ny) <= 1e-9 && nx < 0)) {
                nx = -nx;
                ny = -ny;
              }
              const metin = mesafeEtiketMetni(a, b);
              const genislik = Math.max(64, metin.length * 6.4 + 14);
              // Kutunun çizgiye dik yöndeki yarı uzanımı sahnedeki EN GENİŞ mesafe etiketiyle hesaplanır ki farklı
              // genişlikteki etiketlerin katları da çakışmasın. İlk kat çizgiden ve uç nokta harflerinden ~26 px açıkta
              // durur; her kat bir öncekinin dış kenarını 4 px aşar.
              const yariUzanim = Math.abs(nx) * mesafeEtiketiYariGenislik + Math.abs(ny) * 11;
              const ofs = 26 + yariUzanim + distanceLabelLevel(objects, m.id) * (2 * yariUzanim + 4);
              const ax = sa.x + nx * ofs;
              const ay = sa.y + ny * ofs;
              const bx = sb.x + nx * ofs;
              const by = sb.y + ny * ofs;
              const renk = m.color || '#0f766e';
              return (
                <g key={m.id} {...et} data-object-id={m.id} data-measurement="distance" onContextMenu={(e) => openContextMenu(e, m)} className="select-none">
                  <line x1={ax} y1={ay} x2={bx} y2={by} stroke={renk} strokeWidth={1.25} strokeDasharray="4 3" />
                  <line x1={ax - nx * 5} y1={ay - ny * 5} x2={ax + nx * 5} y2={ay + ny * 5} stroke={renk} strokeWidth={1.25} />
                  <line x1={bx - nx * 5} y1={by - ny * 5} x2={bx + nx * 5} y2={by + ny * 5} stroke={renk} strokeWidth={1.25} />
                  <rect
                    x={(ax + bx) / 2 - genislik / 2}
                    y={(ay + by) / 2 - 11}
                    width={genislik}
                    height={22}
                    rx={7}
                    className="fill-background/95 stroke-border"
                    strokeWidth={1}
                    style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
                  />
                  <text x={(ax + bx) / 2} y={(ay + by) / 2 + 4} textAnchor="middle" fontSize={fs(11, 'measure')} fill={renk} className="font-bold">
                    {metin}
                  </text>
                </g>
              );
            }

            if (m.kind === 'slope') {
              const [a, b] = noktalar as PointObject[];
              const egim = calculateSlope(a, b);
              const metin =
                egim === null
                  ? `${a.label}${b.label} eğimi tanımsız`
                  : `${a.label}${b.label} eğimi = ${formatTurkishNumber(Number(egim.toFixed(4)))}`;
              const sa = worldToScreen(a, viewport);
              const sb = worldToScreen(b, viewport);
              // Etiket doğrunun ORTA noktasının YANINA konur; üzerinde durursa
              // doğruyu sürüklemek isteyen kullanıcı etiketi yakalardı.
              const dx = sb.x - sa.x;
              const dy = sb.y - sa.y;
              const boy = Math.hypot(dx, dy) || 1;
              const ex = (sa.x + sb.x) / 2 + (-dy / boy) * 22;
              const ey = (sa.y + sb.y) / 2 + (dx / boy) * 22;
              const genislik = Math.max(70, metin.length * 6.4 + 14);

              return (
                <g key={m.id} {...et} data-object-id={m.id} onContextMenu={(e) => openContextMenu(e, m)} className="select-none">
                  <rect
                    x={ex - genislik / 2}
                    y={ey - 11}
                    width={genislik}
                    height={22}
                    rx={7}
                    className="fill-background/95 stroke-border"
                    strokeWidth={1}
                    style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
                  />
                  <text
                    x={ex}
                    y={ey + 4}
                    textAnchor="middle"
                    fontSize={fs(11, 'measure')}
                    fill={m.color || '#059669'}
                    className="font-bold"
                  >
                    {metin}
                  </text>
                </g>
              );
            }

            // TRİGONOMETRİK ORANLAR — sıra: kol, KÖŞE, kol
            const [kol1, kose, kol2] = noktalar as PointObject[];
            const o = angleTrigRatios(kol1, kose, kol2);
            if (!o) return null;
            const y4 = (v: number) => formatTurkishNumber(Number(v.toFixed(4)));
            // Üçgen dikse oranlar KENAR olarak da yazılır; değilse yalnızca değer.
            const k = o.kenarlar;
            const satirlar = [
              `${kose.label} = ${y4(o.derece)}°`,
              k
                ? `sin = ${y4(k.karsi)}/${y4(k.hipotenus)} = ${y4(o.sin)}`
                : `sin = ${y4(o.sin)}`,
              k
                ? `cos = ${y4(k.komsu)}/${y4(k.hipotenus)} = ${y4(o.cos)}`
                : `cos = ${y4(o.cos)}`,
              o.tan === null
                ? 'tan = tanımsız'
                : k
                ? `tan = ${y4(k.karsi)}/${y4(k.komsu)} = ${y4(o.tan)}`
                : `tan = ${y4(o.tan)}`,
            ];
            const sk = worldToScreen(kose, viewport);
            const genislik = Math.max(...satirlar.map((t) => t.length)) * 6.2 + 18;
            const ex = sk.x + 34;
            const ey = sk.y - 34;

            return (
              <g key={m.id} {...et} data-object-id={m.id} onContextMenu={(e) => openContextMenu(e, m)} className="select-none">
                <rect
                  x={ex}
                  y={ey - 14}
                  width={genislik}
                  height={satirlar.length * 16 + 8}
                  rx={8}
                  className="fill-background/95 stroke-border"
                  strokeWidth={1}
                  style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
                />
                {satirlar.map((t, i) => (
                  <text
                    key={i}
                    x={ex + 9}
                    y={ey + 2 + i * 16}
                    fontSize={fs(10, 'measure')}
                    fill={m.color || '#7c3aed'}
                    className="font-bold font-mono"
                  >
                    {t}
                  </text>
                ))}
              </g>
            );
          })}

        {/* 4.3 ETKİLEŞİM BİLEŞENLERİ: işaret kutusu, düğme, girdi kutusu
            Şekillerin ÜSTÜNDE çizilir ki tıklanabilsinler. */}
        {objects
          .filter(
            (o) =>
              (o.type === 'checkbox' || o.type === 'button' || o.type === 'input_box') &&
              o.visible !== false
          )
          .map((obj) => {
            const w = obj as CheckboxObject | ButtonObject | InputBoxObject;
            const ekran = worldToScreen({ x: w.x, y: w.y }, viewport);
            const ortak = {
              ekran,
              secili: selectedObjectIds.includes(w.id),
              onMouseDown: (e: React.MouseEvent) => handleObjectMouseDown(e, w),
              onContextMenu: (e: React.MouseEvent) => openContextMenu(e, w),
            };

            if (w.type === 'checkbox') {
              return (
                <CanvasCheckbox
                  key={w.id}
                  obj={w}
                  {...ortak}
                  onToggle={() => toggleCheckbox(w.id)}
                />
              );
            }

            if (w.type === 'button') {
              const act = w.action;
              return (
                <CanvasButton
                  key={w.id}
                  obj={w}
                  {...ortak}
                  onRun={() => {
                    if (act.kind === 'animate') {
                      if (act.play !== undefined) {
                        if (act.play && !sliderPlaying) toggleSliderPlayback();
                        else if (!act.play && sliderPlaying) toggleSliderPlayback();
                      } else {
                        toggleSliderPlayback();
                      }
                      if (act.targetIds?.length) {
                        for (const tid of act.targetIds) {
                          const o = objects.find((obj) => obj.id === tid);
                          if (o?.type === 'point') {
                            updateObject(
                              o.id,
                              { animating: act.play ?? !(o as PointObject).animating } as Partial<MathObject>,
                              true
                            );
                          }
                        }
                      }
                    } else if (act.kind === 'clearTraces') {
                      clearTraces();
                    } else if (act.kind === 'setValue') {
                      const tgt = objects.find((o) => o.id === act.targetId);
                      if (tgt?.type === 'slider') {
                        handleSliderChange(tgt.id, act.value);
                      }
                    } else {
                      runButton(w.id);
                    }
                  }}
                />
              );
            }

            const hedef = objects.find((o) => o.id === w.targetId);
            const deger =
              hedef?.type === 'slider'
                ? sliderDegerMetni((hedef as SliderObject).value)
                : hedef?.type === 'function'
                ? (hedef as FunctionObject).expression
                : '';
            return (
              <CanvasInputBox
                key={w.id}
                obj={w}
                {...ortak}
                deger={deger}
                onCommit={(raw) => applyInputBox(w.id, raw)}
              />
            );
          })}

        {/* 4.4 TUVAL ÜSTÜ KAYDIRICILAR (GeoGebra tarzı fiziksel çubuk) */}
        {sliders
          .filter((s) => s.x !== undefined && s.y !== undefined)
          .map((s) => {
            const uzunluk = s.length ?? 4;
            const sol = worldToScreen({ x: s.x as number, y: s.y as number }, viewport);
            const sag = worldToScreen({ x: (s.x as number) + uzunluk, y: s.y as number }, viewport);
            const aralik = s.max - s.min;
            const oran = aralik > 0 ? (s.value - s.min) / aralik : 0;
            const tutamakX = sol.x + (sag.x - sol.x) * oran;
            const isSelected = selectedObjectIds.includes(s.id);
            const renk = s.color || '#8b5cf6';

            return (
              <g
                key={s.id}
                data-object-id={s.id} onContextMenu={(e) => openContextMenu(e, s)}
                className="select-none"
              >
                {/* Taşıyıcı çizgi */}
                <line
                  x1={sol.x}
                  y1={sol.y}
                  x2={sag.x}
                  y2={sag.y}
                  stroke="#94a3b8"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Dolu kısım */}
                <line
                  x1={sol.x}
                  y1={sol.y}
                  x2={tutamakX}
                  y2={sol.y}
                  stroke={renk}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Uç bölmeleri */}
                <line x1={sol.x} y1={sol.y - 5} x2={sol.x} y2={sol.y + 5} stroke="#94a3b8" strokeWidth={2} />
                <line x1={sag.x} y1={sag.y - 5} x2={sag.x} y2={sag.y + 5} stroke="#94a3b8" strokeWidth={2} />
                {/* Uç değerleri */}
                <text
                  x={sol.x}
                  y={sol.y + 17}
                  textAnchor="middle"
                  fontSize={fs(9, 'measure')} className="fill-muted-foreground font-semibold pointer-events-none"
                >
                  {formatTurkishNumber(s.min)}{s.sliderType === 'angle' ? '°' : ''}
                </text>
                <text
                  x={sag.x}
                  y={sag.y + 17}
                  textAnchor="middle"
                  fontSize={fs(9, 'measure')} className="fill-muted-foreground font-semibold pointer-events-none"
                >
                  {formatTurkishNumber(s.max)}{s.sliderType === 'angle' ? '°' : ''}
                </text>
                {/* Etiket: a = 1,50 */}
                <text
                  x={sol.x}
                  y={sol.y - 12}
                  fontSize={fs(11, 'measure')} className="fill-foreground font-black font-mono pointer-events-none"
                >
                  {s.variableName} = {formatTurkishNumber(s.value)}{s.sliderType === 'angle' ? '°' : ''}
                </text>
                {/* Tutamak (sürüklenebilir) */}
                <circle
                  cx={tutamakX}
                  cy={sol.y}
                  r={9}
                  fill={renk}
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  className="cursor-grab active:cursor-grabbing drop-shadow-md"
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    setSelectedObjectId(s.id);
                    setSelectedObjectIds([s.id]);
                    sliderDragRef.current = { id: s.id };
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                  }}
                />
                {isSelected && (
                  <circle
                    cx={tutamakX}
                    cy={sol.y}
                    r={13}
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth={2}
                    className="pointer-events-none"
                  />
                )}
              </g>
            );
          })}

        {/* 4.5 YAYLAR VE DAİRE DİLİMLERİ KATMANI */}
        {objects
          .filter((o) => (o.type === 'arc' || o.type === 'sector') && o.visible)
          .map((obj) => {
            const isSector = obj.type === 'sector';
            const shape = obj as ArcObject | SectorObject;
            const center = pointsById.get(shape.centerPointId);
            const startP = pointsById.get(shape.startPointId);
            const dirP = pointsById.get(shape.directionPointId);
            if (!center || !startP || !dirP) return null;

            const geo = getArcGeometry(center, startP, dirP);
            if (!geo) return null;

            const cS = worldToScreen(center, viewport);
            const rPx = geo.radius * viewport.zoom;
            // Ekran uzayında y ters çevrildiği için açılar da negatiflenir
            const pt = (ang: number) => ({
              x: cS.x + rPx * Math.cos(ang),
              y: cS.y - rPx * Math.sin(ang),
            });
            const p0 = pt(geo.startAngle);
            const p1 = pt(geo.endAngle);
            const largeArc = geo.sweep > Math.PI ? 1 : 0;
            // Dünya uzayında saat yönü tersi = ekran uzayında saat yönü (sweep-flag 0)
            const arcSeg = `A ${rPx} ${rPx} 0 ${largeArc} 0 ${p1.x} ${p1.y}`;
            const d = isSector
              ? `M ${cS.x} ${cS.y} L ${p0.x} ${p0.y} ${arcSeg} Z`
              : `M ${p0.x} ${p0.y} ${arcSeg}`;

            const isSelected = selectedObjectIds.includes(shape.id);
            const stroke = isSelected ? '#ec4899' : shape.color || (isSector ? '#10b981' : '#0284c7');
            const derece = (geo.sweep * 180) / Math.PI;

            // Etiket: yayın orta noktasının biraz dışında
            const midAng = geo.startAngle + geo.sweep / 2;
            // Rozet her iki şekilde de yayın DIŞINDA durur; dilimin içindeyken
            // dilimi sürüklemek isteyen kullanıcı rozeti yakalıyordu.
            const labelR = rPx + 32;
            const labelPos = {
              x: cS.x + labelR * Math.cos(midAng),
              y: cS.y - labelR * Math.sin(midAng),
            };
            const olcumler: { kind: MeasurementKind; text: string }[] = [];
            if (shape.showArcLength) olcumler.push({ kind: 'arcLength', text: 'Yay: ' + formatTurkishNumber(calculateArcLength(geo.radius, geo.sweep)) + ' br' });
            if (isSector && (shape as SectorObject).showArea) olcumler.push({ kind: 'area', text: 'Alan: ' + formatTurkishNumber(calculateSectorArea(geo.radius, geo.sweep)) + ' br²' });
            if (isSector && (shape as SectorObject).showPerimeter) olcumler.push({ kind: 'perimeter', text: 'Çevre: ' + formatTurkishNumber(calculateArcLength(geo.radius, geo.sweep) + 2 * geo.radius) + ' br' });
            if (shape.showRadius) olcumler.push({ kind: 'radius', text: 'r: ' + formatTurkishNumber(geo.radius) + ' br' });
            if (shape.showChordLength) olcumler.push({ kind: 'chordLength', text: (Math.abs(geo.sweep - Math.PI) < 1e-6 ? 'Çap: ' : 'Kiriş: ') + formatTurkishNumber(2 * geo.radius * Math.sin(geo.sweep / 2)) + ' br' });

            return (
              <g
                key={shape.id}
                onMouseDown={(e) => handleObjectMouseDown(e, shape)}
                data-object-id={shape.id} onContextMenu={(e) => openContextMenu(e, shape)}
                onTouchStart={(e) => handleTouchStartOnObject(e, shape)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
              >
                {/* Görünmez kalın tutma alanı (ince yayı yakalamak zor olmasın) */}
                <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
                <path
                  d={d}
                  fill={isSector ? (shape as SectorObject).fillColor || '#10b981' : 'none'}
                  fillOpacity={styleSettings.hideFills ? 0 : isSector ? (shape as SectorObject).fillOpacity ?? 0.4 : 0}
                  stroke={stroke}
                  strokeWidth={sw(isSelected ? 4 : (shape as ArcObject).thickness ?? 3)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {showDetails && olcumler.map((m, index) => {
                  const y = labelPos.y + (Math.sin(midAng) >= 0 ? -1 : 1) * index * 26;
                  const width = Math.max(100, m.text.length * fs(6.5));
                  return <g key={m.kind} {...olcumEtiketi(shape.id, m.kind)} data-measurement={m.kind}>
                    <rect x={labelPos.x - width / 2} y={y - 11} width={width} height={22} rx={7} className="fill-background/90 stroke-border" style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined} />
                    <text x={labelPos.x} y={y + 4} textAnchor="middle" fontSize={fs(10)} className="fill-foreground font-bold">{m.text}</text>
                  </g>;
                })}

                {/* MERKEZ AÇI: kendi ölçüm türü ('centralAngle') ve kendi tıklama kutusu var.
                    Önceden alan/yay uzunluğu etiketiyle AYNI grubun içinde çıplak bir <text>'ti;
                    üzerine tıklamak ya hiçbir şey yapmıyor ya da alan etiketini de götürüyordu. */}
                {showDetails && shape.showCentralAngle !== false && (() => {
                  // Ölçüm rozeti varsa derece onun ALTINA, yoksa onun YERİNE geçer:
                  // iki etiket birbirinden bağımsız gizlenebildiği için boşluk kalmamalı.
                  // Rozetler birbirine çok yakınken kullanıcı '180°' yerine '6,28 br'
                  // etiketini yakalayabiliyordu; araya kutu yüksekliğinden fazla boşluk konur.
                  const dy = (Math.sin(midAng) >= 0 ? -1 : 1) * olcumler.length * 26;
                  return (
                  <g {...olcumEtiketi(shape.id, 'centralAngle')}>
                    <rect
                      x={labelPos.x - 20}
                      y={labelPos.y + dy - 9}
                      width={40}
                      height={18}
                      rx={6}
                      className="fill-background/90 stroke-border"
                      style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
                      strokeWidth={1}
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y + dy + 4}
                      textAnchor="middle"
                      fontSize={fs(9, 'measure')} className="fill-muted-foreground font-semibold"
                    >
                      {formatTurkishNumber(Math.round(derece))}°
                    </text>
                  </g>
                  );
                })()}

                {/* 🔄 DÖNDÜRME PALETİ — yay ve daire dilimi de çevrilebilir.
                    Merkez yerinde kalır; başlangıç ve bitiş noktaları merkez etrafında döner. */}
                {activeTool === 'rotate' && isSelected && (
                  <RotateGizmo
                    center={cS}
                    feedbackDeg={rotatingFeedback?.shapeId === shape.id ? rotatingFeedback.deg : null}
                    onFreeRotateStart={(e) => handleStartRotateShape(e, shape)}
                    onRotate={(deg) => rotateShapeByAngle(shape, deg)}
                  />
                )}
              </g>
            );
          })}

        {/* 4.6 ELİPSLER KATMANI */}
        {objects
          .filter((o) => o.type === 'ellipse' && o.visible)
          .map((obj) => {
            const elp = obj as EllipseObject;
            const merkez = pointsById.get(elp.centerPointId);
            if (!merkez) return null;

            const cS = worldToScreen(merkez, viewport);
            const rxPx = Math.abs(elp.radiusX) * viewport.zoom;
            const ryPx = Math.abs(elp.radiusY) * viewport.zoom;
            const isSelected = selectedObjectIds.includes(elp.id);
            const hasArea = elp.showArea && showDetails;
            const hasPerimeter = elp.showPerimeter && showDetails;
            const alan = calculateEllipseArea(elp.radiusX, elp.radiusY);
            const cevre = calculateEllipsePerimeter(elp.radiusX, elp.radiusY);

            return (
              <g
                key={elp.id}
                onMouseDown={(e) => handleObjectMouseDown(e, elp)}
                data-object-id={elp.id} onContextMenu={(e) => openContextMenu(e, elp)}
                onTouchStart={(e) => handleTouchStartOnObject(e, elp)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
                transform={elp.rotation ? `rotate(${-elp.rotation}, ${cS.x}, ${cS.y})` : undefined}
              >
                <ellipse
                  cx={cS.x}
                  cy={cS.y}
                  rx={rxPx}
                  ry={ryPx}
                  fill={elp.fillColor || elp.color || '#0ea5e9'}
                  fillOpacity={styleSettings.hideFills ? 0 : elp.fillOpacity ?? 0.12}
                  stroke={isSelected ? '#ec4899' : elp.color || '#0ea5e9'}
                  strokeWidth={sw(isSelected ? 3 : 2)}
                />
                {/* 🔄 DÖNDÜRME PALETİ — elips kendi merkezi etrafında döner */}
                {activeTool === 'rotate' && isSelected && (
                  <RotateGizmo
                    center={cS}
                    feedbackDeg={rotatingFeedback?.shapeId === elp.id ? rotatingFeedback.deg : null}
                    onFreeRotateStart={(e) => handleStartRotateShape(e, elp)}
                    onRotate={(deg) => rotateShapeByAngle(elp, deg)}
                  />
                )}

                {(hasArea || hasPerimeter) && (() => {
                  const et = olcumEtiketi(elp.id, hasArea ? 'area' : 'perimeter');
                  return (
                    <g
                      transform={`translate(${cS.x}, ${cS.y + ryPx + 26}) ${et.transform}`}
                      className="drop-shadow-sm select-none"
                      style={et.style}
                      onPointerDown={et.onPointerDown}
                      onClick={et.onClick}
                    >
                      <rect
                        x={-80}
                        y={hasArea && hasPerimeter ? -22 : -12}
                        width={160}
                        height={hasArea && hasPerimeter ? 44 : 24}
                        rx={8}
                        className="fill-background/90 stroke-border"
                      style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
                        strokeWidth={1}
                      />
                      {hasArea && (
                        <text
                          x={0}
                          y={hasArea && hasPerimeter ? -4 : 4}
                          textAnchor="middle"
                          fontSize={fs(11, 'measure')} className="fill-foreground font-bold"
                        >
                          Alan = {formatTurkishNumber(alan)} br²
                        </text>
                      )}
                      {hasPerimeter && (
                        <text
                          x={0}
                          y={hasArea && hasPerimeter ? 14 : 4}
                          textAnchor="middle"
                          fontSize={fs(11, 'measure')} className="fill-foreground font-bold"
                        >
                          Çevre = {formatTurkishNumber(cevre)} br
                        </text>
                      )}
                    </g>
                  );
                })()}
              </g>
            );
          })}

        {/* 5. ÇEMBERLER KATMANI */}
        {objects
          .filter((o) => o.type === 'circle' && o.visible)
          .map((obj) => {
            const circ = obj as CircleObject;

            // Üç noktadan geçen çemberde merkez ve yarıçap her karede noktalardan hesaplanır
            let center: Point2D | undefined;
            let radius = 0;
            if (circ.throughPointIds && circ.throughPointIds.length === 3) {
              const [ta, tb, tc] = circ.throughPointIds.map((id) => pointsById.get(id));
              if (!ta || !tb || !tc) return null;
              const cc = calculateCircumcircle(ta, tb, tc);
              // Noktalar doğrusallaştıysa çember tanımsızdır; sessizce çizilmez
              if (!cc) return null;
              center = cc.center;
              radius = cc.radius;
            } else {
              center = pointsById.get(circ.centerPointId);
              if (!center) return null;
              radius = circ.fixedRadius ?? 0;
              if (circ.radiusPointId) {
                const rPoint = pointsById.get(circ.radiusPointId);
                if (rPoint) {
                  radius = calculateDistance(center, rPoint);
                }
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
                data-object-id={circ.id} onContextMenu={(e) => openContextMenu(e, circ)}
                onTouchStart={(e) => handleTouchStartOnObject(e, circ)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
              >
                <circle
                  cx={centerScreen.x}
                  cy={centerScreen.y}
                  r={pixelRadius}
                  fill={circ.color || '#8b5cf6'}
                  fillOpacity={styleSettings.hideFills ? 0 : circ.fillOpacity || 0.08}
                  stroke={isSelected ? '#ec4899' : circ.color || '#8b5cf6'}
                  strokeWidth={sw(isSelected ? 3 : 2)}
                />
                {(hasCircArea || hasCircPerimeter) && (() => {
                  const et = olcumEtiketi(circ.id, hasCircArea ? 'area' : 'perimeter');
                  // Etiket çemberin İÇİNDE değil, ALTINDA: merkezdeyken çemberi
                  // ortasından sürüklemek isteyen kullanıcı etiketi yakalıyordu.
                  return (
                  <g
                    transform={`translate(${centerScreen.x}, ${centerScreen.y + pixelRadius + 26}) ${et.transform}`}
                    className="drop-shadow-sm select-none"
                    style={et.style}
                    onPointerDown={et.onPointerDown}
                    onClick={et.onClick}
                  >
                    <rect
                      x="-80"
                      y="-12"
                      width="160"
                      height={hasCircArea && hasCircPerimeter ? 40 : 24}
                      rx="7"
                      fill="#ffffff"
                      fillOpacity={0.92}
                      style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
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
                          fontSize={fs(10, 'measure')} className="fill-purple-700 dark:fill-purple-400 font-bold font-sans"
                        >
                          r = {formatTurkishNumber(radius)} br | A = {formatTurkishNumber(circArea)} br²
                        </text>
                        <text
                          x="0"
                          y="15"
                          textAnchor="middle"
                          fontSize={fs(10, 'measure')} className="fill-indigo-700 dark:fill-indigo-400 font-bold font-sans"
                        >
                          Çevre (2πr) = {formatTurkishNumber(circPerimeter)} br
                        </text>
                      </>
                    ) : hasCircPerimeter ? (
                      <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        fontSize={fs(10, 'measure')} className="fill-indigo-700 dark:fill-indigo-400 font-bold font-sans"
                      >
                        Çevre (2πr) = {formatTurkishNumber(circPerimeter)} br
                      </text>
                    ) : (
                      <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        fontSize={fs(10, 'measure')} className="fill-purple-700 dark:fill-purple-400 font-bold font-sans"
                      >
                        r = {formatTurkishNumber(radius)} br | A = {formatTurkishNumber(circArea)} br²
                      </text>
                    )}
                  </g>
                  );
                })()}
              </g>
            );
          })}

        {/* 6. AÇILAR KATMANI */}
        {objects
          .filter((o) => o.type === 'angle' && o.visible)
          .map((obj) => {
            const ang = obj as AngleObject;
            const p1 = pointsById.get(ang.point1Id);
            const vertex = pointsById.get(ang.vertexPointId);
            const p3 = pointsById.get(ang.point3Id);

            if (!p1 || !vertex || !p3) return null;
            const isAngleSelected = selectedObjectIds.includes(ang.id);

            const icDeg = calculateAngleDegrees(p1, vertex, p3);
            // reflex: iç açı yerine onu 360°'ye tamamlayan dış açı gösterilir
            const deg = ang.reflex ? 360 - icDeg : icDeg;
            const vScreen = worldToScreen(vertex, viewport);

            // Kolların ekran uzayındaki yönleri (y ekseni ters olduğu için negatiflendi)
            const angle1 = Math.atan2(-(p1.y - vertex.y), p1.x - vertex.x);
            const angle2 = Math.atan2(-(p3.y - vertex.y), p3.x - vertex.x);
            // angle1'den angle2'ye giden en kısa dönüş (-π, π]; iç açıyı tarar
            let delta = angle2 - angle1;
            while (delta <= -Math.PI) delta += 2 * Math.PI;
            while (delta > Math.PI) delta -= 2 * Math.PI;
            // Dış açıda ters yönden dolaşılır
            const sweepDelta = ang.reflex ? delta - Math.sign(delta || 1) * 2 * Math.PI : delta;
            // Açıortay: yayın tam ortası (±180° sınırında da doğru çalışır)
            const midAngle = angle1 + sweepDelta / 2;

            // Yay yolu (SVG arc): küçük yay iç açıyı, büyük yay dış açıyı çizer
            const arcR = 22;
            const arcStart = {
              x: vScreen.x + arcR * Math.cos(angle1),
              y: vScreen.y + arcR * Math.sin(angle1),
            };
            const arcEnd = {
              x: vScreen.x + arcR * Math.cos(angle1 + sweepDelta),
              y: vScreen.y + arcR * Math.sin(angle1 + sweepDelta),
            };
            const largeArcFlag = Math.abs(sweepDelta) > Math.PI ? 1 : 0;
            const sweepFlag = sweepDelta > 0 ? 1 : 0;
            const arcPath = `M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArcFlag} ${sweepFlag} ${arcEnd.x} ${arcEnd.y}`;

            // Etiket, açının r=22'lik tutma çemberinin DIŞINDA durmalı; aksi hâlde
            // açıyı sürüklemek isteyen kullanıcı etiketi yakalıyor ve açı taşınamıyordu.
            const labelDist = 40;
            const labelX = vScreen.x + labelDist * Math.cos(midAngle);
            const labelY = vScreen.y + labelDist * Math.sin(midAngle);

            // Etiket tam dereceye yuvarlanır; 90° görünen ölçü kare işareti kullanır.
            const isRightAngle = !ang.reflex && Math.round(deg) === 90;
            const squareSide = arcR / Math.SQRT2;
            const squareStart = { x: vScreen.x + squareSide * Math.cos(angle1), y: vScreen.y + squareSide * Math.sin(angle1) };
            const squareEnd = { x: vScreen.x + squareSide * Math.cos(angle2), y: vScreen.y + squareSide * Math.sin(angle2) };
            const markerPath = isRightAngle
              ? `M ${squareStart.x} ${squareStart.y} L ${squareStart.x + squareEnd.x - vScreen.x} ${squareStart.y + squareEnd.y - vScreen.y} L ${squareEnd.x} ${squareEnd.y}`
              : arcPath;

            return (
              <g
                key={ang.id}
                onMouseDown={(e) => handleObjectMouseDown(e, ang)}
                data-object-id={ang.id} onContextMenu={(e) => openContextMenu(e, ang)}
                onTouchStart={(e) => handleTouchStartOnObject(e, ang)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
              >
                {/* NOT: Burada eskiden r=22'lik DOLU görünmez bir disk vardı. Açı katmanı
                    çokgen ve çemberin ÜSTÜNDE çizildiği için bu disk, ölçülmüş köşenin
                    çevresindeki her basışı şekil yerine AÇIYA yönlendiriyordu; kullanıcı
                    şekli sürüklediğini sanırken yalnızca üç köşe kayıp şekil bozuluyordu.
                    Artık yalnızca yayın kendi üzerindeki kalın şerit yakalıyor. */}
                {/* Açı Yayı: iç açıda küçük, dış açıda büyük yay çizilir */}
                <path
                  d={markerPath}
                  data-angle-marker={isRightAngle ? 'right' : 'arc'}
                  fill="none"
                  stroke={isAngleSelected ? '#ec4899' : ang.color || '#f59e0b'}
                  strokeWidth={isAngleSelected ? 3 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="miter"
                  className="opacity-80"
                />
                {/* Yayın üzerinden de tutulabilsin diye görünmez kalın şerit */}
                <path
                  d={markerPath}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  pointerEvents={activeTool === 'select' || activeTool === 'delete' ? 'auto' : 'none'}
                />
                {/* Açı Değer Rozeti */}
                {showDetails && ang.showValue !== false && (
                  <g {...olcumEtiketi(ang.id, 'angle')}>
                    <rect
                      x={labelX - (deg >= 100 ? 21 : 16)}
                      y={labelY - 10}
                      width={deg >= 100 ? 42 : 32}
                      height={20}
                      rx={6}
                      className="fill-background/90 stroke-border"
                      style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
                      strokeWidth={1}
                    />
                    <text
                      x={labelX}
                      y={labelY + 4}
                      textAnchor="middle"
                      fontSize={fs(10, 'measure')} className="fill-foreground font-bold"
                    >
                      {formatTurkishNumber(Math.round(deg))}°
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
              const p1 = pointsById.get(seg.startPointId);
              const p2 = pointsById.get(seg.endPointId);
              if (!p1 || !p2) return null;

              const s1 = worldToScreen(p1, viewport);
              const s2 = worldToScreen(p2, viewport);
              const length = calculateDistance(p1, p2);
              const midpointScreen = { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 };

              return (
                <g
                  key={seg.id}
                  onMouseDown={(e) => handleObjectMouseDown(e, seg)}
                data-object-id={seg.id} onContextMenu={(e) => openContextMenu(e, seg)}
                onTouchStart={(e) => handleTouchStartOnObject(e, seg)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                  className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
                >
                  <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="transparent" strokeWidth={14} />
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={isSelected ? '#ec4899' : seg.color || '#0284c7'}
                    strokeWidth={sw(isSelected ? (seg.thickness || 2.5) + 1.5 : seg.thickness || 2.5)}
                    strokeLinecap="round"
                    className="hover:opacity-80 transition-all"
                  />
                  {seg.showLength && showDetails && (() => {
                    const unit = seg.unit || (seg.label?.includes('cm') ? 'cm' : 'br');
                    // Etiket doğrunun ÜZERİNDE değil, YANINDA durur: üzerindeyken
                    // doğruyu ortasından tutup sürüklemek isteyen kullanıcı etiketi yakalıyordu.
                    const dx = s2.x - s1.x;
                    const dy = s2.y - s1.y;
                    const boy = Math.hypot(dx, dy) || 1;
                    // Kısmi uzunluk ('distance') etiketleri ekranda yukarı bakan normale konur; parçanın kendi uzunluğu
                    // hep KARŞI tarafta durur. Eskiden çizim yönüne bağlıydı: sağdan sola ya da dikey çizilmiş parçada iki
                    // etiket üst üste biniyordu. Dikey parçada kutu çizgiyi örtmesin diye biraz daha açılır.
                    let nx = -dy / boy;
                    let ny = dx / boy;
                    // Mesafe etiketleriyle AYNI kural (tam dikeyde onlar sağda, bu etiket solda)
                    if (ny > 1e-9 || (Math.abs(ny) <= 1e-9 && nx < 0)) {
                      nx = -nx;
                      ny = -ny;
                    }
                    const aralik = 20 + Math.abs(nx) * 16;
                    const ex = midpointScreen.x - nx * aralik;
                    const ey = midpointScreen.y - ny * aralik;
                    return (
                      <g {...olcumEtiketi(seg.id, 'length')}>
                        <rect
                          x={ex - 26}
                          y={ey - 10}
                          width={52}
                          height={20}
                          rx={6}
                          className="fill-background/95 stroke-border/80 shadow-sm"
                          style={styleSettings.hideLabelBoxes ? { display: 'none' } : undefined}
                          strokeWidth={1}
                        />
                        <text
                          x={ex}
                          y={ey + 4}
                          textAnchor="middle"
                          fontSize={fs(11, 'measure')} className="fill-foreground font-bold"
                        >
                          {formatTurkishNumber(length)} {unit}
                        </text>
                      </g>
                    );
                  })()}

                  {/* 🔄 DÖNDÜRME PALETİ — doğru parçası kendi orta noktası etrafında döner */}
                  {activeTool === 'rotate' && selectedObjectIds.includes(seg.id) && (
                    <RotateGizmo
                      center={midpointScreen}
                      feedbackDeg={rotatingFeedback?.shapeId === seg.id ? rotatingFeedback.deg : null}
                      onFreeRotateStart={(e) => handleStartRotateShape(e, seg)}
                      onRotate={(deg) => rotateShapeByAngle(seg, deg)}
                    />
                  )}
                </g>
              );
            }

            if (obj.type === 'line') {
              const line = obj as LineObject;
              const p1 = pointsById.get(line.point1Id);
              const p2 = pointsById.get(line.point2Id);
              if (!p1 || !p2) return null;

              // Sonsuz doğruyu ekran sınırlarına genişlet
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const len = Math.hypot(dx, dy);
              if (len === 0) return null;
              const extendWorld = Math.max(viewport.width, viewport.height) * 2 / viewport.zoom;
              const pStart = { x: p1.x - (dx / len) * extendWorld, y: p1.y - (dy / len) * extendWorld };
              const pEnd = { x: p2.x + (dx / len) * extendWorld, y: p2.y + (dy / len) * extendWorld };

              const s1 = worldToScreen(pStart, viewport);
              const s2 = worldToScreen(pEnd, viewport);
              const eq = calculateLineEquation(p1, p2);

              return (
                <g
                  key={line.id}
                  onMouseDown={(e) => handleObjectMouseDown(e, line)}
                data-object-id={line.id} onContextMenu={(e) => openContextMenu(e, line)}
                onTouchStart={(e) => handleTouchStartOnObject(e, line)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                  className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
                >
                  <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="transparent" strokeWidth={14} />
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
                  {line.showLength && showDetails && (
                    <g {...olcumEtiketi(line.id, 'length')} data-measurement="length">
                      <text x={worldToScreen({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, viewport).x}
                        y={worldToScreen({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, viewport).y - 18}
                        textAnchor="middle" fontSize={fs(11)} stroke="hsl(var(--background))" strokeWidth={4} paintOrder="stroke" className="fill-foreground font-bold">
                        {'|' + p1.label + p2.label + '| = ' + formatTurkishNumber(calculateDistance(p1, p2)) + ' br'}
                      </text>
                    </g>
                  )}
                </g>
              );
            }

            if (obj.type === 'ray') {
              const ray = obj as RayObject;
              const p1 = pointsById.get(ray.startPointId);
              const p2 = pointsById.get(ray.throughPointId);
              if (!p1 || !p2) return null;

              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const len = Math.hypot(dx, dy);
              if (len === 0) return null;
              const extendWorld = Math.max(viewport.width, viewport.height) * 2 / viewport.zoom;
              const pEnd = { x: p1.x + (dx / len) * extendWorld, y: p1.y + (dy / len) * extendWorld };

              const s1 = worldToScreen(p1, viewport);
              const s2 = worldToScreen(pEnd, viewport);

              return (
                <g
                  key={ray.id}
                  onMouseDown={(e) => handleObjectMouseDown(e, ray)}
                data-object-id={ray.id} onContextMenu={(e) => openContextMenu(e, ray)}
                onTouchStart={(e) => handleTouchStartOnObject(e, ray)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                  className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer'}
                >
                  <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="transparent" strokeWidth={14} />
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={isSelected ? '#ec4899' : ray.color || '#0284c7'}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {ray.showLength && showDetails && (
                    <g {...olcumEtiketi(ray.id, 'length')} data-measurement="length">
                      <text x={worldToScreen({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, viewport).x}
                        y={worldToScreen({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, viewport).y - 18}
                        textAnchor="middle" fontSize={fs(11)} stroke="hsl(var(--background))" strokeWidth={4} paintOrder="stroke" className="fill-foreground font-bold">
                        {'|' + p1.label + p2.label + '| = ' + formatTurkishNumber(calculateDistance(p1, p2)) + ' br'}
                      </text>
                    </g>
                  )}
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

            // Sade modda nokta gövdesi ve harfi gizlenir (aşağıdaki koşullarda),
            // ancak grup render edilmeye devam eder: 18 px'lik görünmez yakalayıcı
            // korunur ki noktalar Sade modda da seçilebilsin / taşınabilsin.

            return (
              <g
                key={pt.id}
                className="cursor-grab active:cursor-grabbing group select-none"
                onMouseDown={(e) => handleObjectMouseDown(e, pt)}
                data-object-id={pt.id} onContextMenu={(e) => openContextMenu(e, pt)}
                onTouchStart={(e) => handleTouchStartOnObject(e, pt)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
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
                    r={(pt.size || styleSettings.pointRadius) + (isSelected ? 1.5 : 0)}
                    fill={isPointLocked(pt, objects) ? '#94a3b8' : pt.color || '#2563eb'}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all pointer-events-none drop-shadow-sm"
                  />
                )}

                {/* Nokta Etiketi (Harf) ve Koordinat (Sade modda tamamen gizli) */}
                {pt.showLabel && !isSade && (() => {
                  // Nokta adı sürüklenebilir: kalabalık çizimlerde adlar üst üste
                  // biniyordu. Kayıklık nesnenin kendi labelOffsets alanında tutulur,
                  // yani nokta taşınınca ad da onunla birlikte gider.
                  const et = olcumEtiketi(pt.id, 'pointLabel', false);
                  return (
                  <text
                    transform={et.transform}
                    style={et.style}
                    onPointerDown={et.onPointerDown}
                    onClick={et.onClick}
                    x={sPos.x + 10}
                    y={sPos.y - 10}
                    fontSize={fs(12, 'label')} className="fill-foreground font-bold select-none drop-shadow"
                  >
                    {pt.label}
                    {viewport.showCoordinates && showDetails && (
                      <tspan fontSize={fs(10, 'label')} className="font-normal fill-muted-foreground ml-1">
                        {' '}
                        {formatCoordinate(pt, 1)}
                      </tspan>
                    )}
                  </text>
                  );
                })()}
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
                data-object-id={stroke.id} onContextMenu={(e) => openContextMenu(e, stroke)}
                onTouchStart={(e) => handleTouchStartOnObject(e, stroke)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
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
            const fracColor = frac.color || '#8b5cf6';
            // Geçersiz payda (0 veya negatif) -> 0/1 olarak göster
            const rawN = Number.isFinite(frac.numerator) ? Math.max(0, Math.round(frac.numerator)) : 0;
            const rawD = Number.isFinite(frac.denominator) ? Math.round(frac.denominator) : 0;
            const isInvalid = rawD <= 0;
            const n = isInvalid ? 0 : rawN;
            const d = isInvalid ? 1 : rawD;
            // Bileşik kesir: her bütünde d parça, ceil(n/d) bütün çizilir
            const wholes = Math.max(1, Math.ceil(n / d));
            const isBar = frac.modelType === 'bar';

            const shapes: React.ReactNode[] = [];
            let totalWidthPx = 0;
            let totalHeightPx = 0;

            if (isBar) {
              // Çubuk modeli: her bütün, d eşit dikdörtgen parçaya bölünmüş bir çubuk
              const barW = rPx * 2;
              const barH = Math.max(18, rPx * 0.6);
              const gap = Math.max(6, rPx * 0.15);
              totalWidthPx = barW;
              totalHeightPx = wholes * barH + (wholes - 1) * gap;
              const top = center.y - totalHeightPx / 2;
              const left = center.x - barW / 2;

              for (let w = 0; w < wholes; w++) {
                const y = top + w * (barH + gap);
                for (let i = 0; i < d; i++) {
                  const globalIndex = w * d + i;
                  const isFilled = globalIndex < n;
                  shapes.push(
                    <rect
                      key={`bar-${w}-${i}`}
                      x={left + (i * barW) / d}
                      y={y}
                      width={barW / d}
                      height={barH}
                      fill={isFilled ? fracColor : '#ffffff'}
                      fillOpacity={isFilled ? 0.45 : 0.8}
                      stroke={fracColor}
                      strokeWidth={1.5}
                    />
                  );
                }
                shapes.push(
                  <rect
                    key={`bar-outline-${w}`}
                    x={left}
                    y={y}
                    width={barW}
                    height={barH}
                    fill="none"
                    stroke={isSelected ? '#ec4899' : fracColor}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                );
              }
            } else {
              // Daire (pasta) modeli: bütünler yan yana
              const gap = Math.max(8, rPx * 0.2);
              totalWidthPx = wholes * rPx * 2 + (wholes - 1) * gap;
              totalHeightPx = rPx * 2;
              const firstCx = center.x - totalWidthPx / 2 + rPx;

              for (let w = 0; w < wholes; w++) {
                const cx = firstCx + w * (rPx * 2 + gap);
                const cy = center.y;
                if (d <= 1) {
                  const isFilled = w < n;
                  shapes.push(
                    <circle
                      key={`slice-full-${w}`}
                      cx={cx}
                      cy={cy}
                      r={rPx}
                      fill={isFilled ? fracColor : '#ffffff'}
                      fillOpacity={isFilled ? 0.45 : 0.8}
                      stroke={fracColor}
                      strokeWidth={1.5}
                    />
                  );
                } else {
                  for (let i = 0; i < d; i++) {
                    const startAngle = (i * 2 * Math.PI) / d - Math.PI / 2;
                    const endAngle = ((i + 1) * 2 * Math.PI) / d - Math.PI / 2;
                    const x1 = cx + rPx * Math.cos(startAngle);
                    const y1 = cy + rPx * Math.sin(startAngle);
                    const x2 = cx + rPx * Math.cos(endAngle);
                    const y2 = cy + rPx * Math.sin(endAngle);
                    const isFilled = w * d + i < n;

                    shapes.push(
                      <path
                        key={`slice-${w}-${i}`}
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${rPx} ${rPx} 0 0 1 ${x2} ${y2} Z`}
                        fill={isFilled ? fracColor : '#ffffff'}
                        fillOpacity={isFilled ? 0.45 : 0.8}
                        stroke={fracColor}
                        strokeWidth={1.5}
                      />
                    );
                  }
                }
                shapes.push(
                  <circle
                    key={`outline-${w}`}
                    cx={cx}
                    cy={cy}
                    r={rPx}
                    fill="none"
                    stroke={isSelected ? '#ec4899' : fracColor}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                );
              }
            }

            const badgeY = center.y + totalHeightPx / 2 + 8;

            return (
              <g
                key={frac.id}
                onMouseDown={(e) => handleObjectMouseDown(e, frac)}
                data-object-id={frac.id} onContextMenu={(e) => openContextMenu(e, frac)}
                onTouchStart={(e) => handleTouchStartOnObject(e, frac)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer select-none'}
              >
                {shapes}
                {showDetails && (
                  <g className="pointer-events-none drop-shadow-sm select-none">
                    <rect
                      x={center.x - 30}
                      y={badgeY}
                      width={60}
                      height={26}
                      rx={8}
                      fill="#0f172a"
                      fillOpacity={0.94}
                      stroke={fracColor}
                      strokeWidth={1.2}
                    />
                    <text
                      x={center.x}
                      y={badgeY + 17}
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
                data-object-id={txt.id} onContextMenu={(e) => openContextMenu(e, txt)}
                onTouchStart={(e) => handleTouchStartOnObject(e, txt)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
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
                  className="shadow-sm transition-all group-hover/txt:stroke-blue-400 dark:fill-slate-800 dark:stroke-slate-700"
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
                data-object-id={img.id} onContextMenu={(e) => openContextMenu(e, img)}
                onTouchStart={(e) => handleTouchStartOnObject(e, img)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={activeTool === 'select' ? 'cursor-move select-none' : 'cursor-pointer select-none'}
              >
                <image
                  href={img.src}
                  x={sPos.x - wPx / 2}
                  y={sPos.y - hPx / 2}
                  width={wPx}
                  height={hPx}
                  preserveAspectRatio="xMidYMid meet"
                />
                {isSelected && (
                  <rect
                    x={sPos.x - wPx / 2 - 3}
                    y={sPos.y - hPx / 2 - 3}
                    width={wPx + 6}
                    height={hPx + 6}
                    rx={4}
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth={2.5}
                    strokeDasharray="6,3"
                    className="pointer-events-none"
                  />
                )}
              </g>
            );
          })}

        {/* 13. SÜRÜKLEYEREK ŞEKİL OLUŞTURMA CANLI ÖNİZLEMESİ
             Önizleme, handleMouseUp'taki oluşturma koduyla AYNI dünya matematiğinden türetilir:
             aynı yuvarlama (0,1) ve aynı çapa (dünyada sol-alt köşe). Aksi hâlde ekran y ekseni
             ters olduğu için kare/dikdörtgen önizlemesi imlecin altında görünür ama şekil
             yukarıda oluşurdu. */}
        {/* PERGEL ÖNİZLEMESİ */}
        {activeTool === 'compass' && pergel && (() => {
          const cS = worldToScreen(pergel.merkez, viewport);
          const rPx = (pergel.yaricap ?? pergel.tarama) * viewport.zoom;
          if (!(rPx > 0)) return null;
          const yatayUc = { x: cS.x + rPx, y: cS.y };
          /** Dünya açısını EKRAN noktasına çevirir (ekranda y ters olduğu için -sin). */
          const cemberde = (aci: number) => ({
            x: cS.x + rPx * Math.cos(aci),
            y: cS.y - rPx * Math.sin(aci),
          });

          if (pergel.yaricap === null) {
            // 1. aşama: açıklık YATAY bir çubuk olarak gösterilir, ama ölçü
            // imlecin iğneye gerçek uzaklığıdır; imleç nerede olursa olsun izlenir.
            return (
              <g className="pointer-events-none">
                <circle cx={cS.x} cy={cS.y} r={rPx} fill="none" stroke="#8b5cf6" strokeWidth={1.2} strokeDasharray="3,4" opacity={0.5} />
                <line x1={cS.x} y1={cS.y} x2={yatayUc.x} y2={yatayUc.y} stroke="#8b5cf6" strokeWidth={2.5} />
                <circle cx={cS.x} cy={cS.y} r={4} fill="#8b5cf6" />
                <circle cx={yatayUc.x} cy={yatayUc.y} r={4} fill="#ffffff" stroke="#8b5cf6" strokeWidth={2} />
                <rect x={(cS.x + yatayUc.x) / 2 - 36} y={cS.y - 26} width={72} height={20} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={(cS.x + yatayUc.x) / 2} y={cS.y - 12} textAnchor="middle" fill="#ffffff" className="font-bold" fontSize={11}>
                  r = {formatTurkishNumber(Number((rPx / viewport.zoom).toFixed(2)))} br
                </text>
              </g>
            );
          }

          // 2. aşama: BAŞLANGIÇ noktası seçiliyor.
          // İmleç çemberin üstünde olmak zorunda değil: hangi YÖNDEYSE kalem
          // çember üzerinde oraya gider. Böylece başlangıç istenen yere bırakılır.
          if (pergel.baslangic === null) {
            const kalem = cemberde(pergel.tarama);
            const derece = Math.round(((pergel.tarama * 180) / Math.PI) % 360);
            return (
              <g className="pointer-events-none">
                <circle cx={cS.x} cy={cS.y} r={rPx} fill="none" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.6} />
                <line x1={cS.x} y1={cS.y} x2={kalem.x} y2={kalem.y} stroke="#8b5cf6" strokeWidth={2} />
                <circle cx={cS.x} cy={cS.y} r={4} fill="#8b5cf6" />
                {/* Kalemin ineceği yer: büyük ve belirgin */}
                <circle cx={kalem.x} cy={kalem.y} r={7} fill="#8b5cf6" fillOpacity={0.25} />
                <circle cx={kalem.x} cy={kalem.y} r={5} fill="#ffffff" stroke="#8b5cf6" strokeWidth={2.5} />
                <rect x={kalem.x - 46} y={kalem.y - 30} width={92} height={20} rx={6} fill="#0f172a" fillOpacity={0.92} />
                <text x={kalem.x} y={kalem.y - 16} textAnchor="middle" fill="#ffffff" className="font-bold" fontSize={11}>
                  başlangıç {derece}°
                </text>
              </g>
            );
          }

          // 3. aşama: yay, seçilen BAŞLANGIÇTAN itibaren taranıyor (iki yöne de)
          const bas = cemberde(pergel.baslangic);
          const bitis = cemberde(pergel.baslangic + pergel.tarama);
          const mutlak = Math.abs(pergel.tarama);
          const buyukYay = mutlak > Math.PI ? 1 : 0;
          // Dünyada CCW = ekranda saat yönü (sweep-flag 0); CW ise tersi (1)
          const yon = pergel.tarama >= 0 ? 0 : 1;
          const d = `M ${bas.x} ${bas.y} A ${rPx} ${rPx} 0 ${buyukYay} ${yon} ${bitis.x} ${bitis.y}`;
          const derece = Math.round((mutlak * 180) / Math.PI);
          return (
            <g className="pointer-events-none">
              <circle cx={cS.x} cy={cS.y} r={rPx} fill="none" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="3,5" opacity={0.3} />
              <path d={d} fill="none" stroke="#8b5cf6" strokeWidth={3} strokeLinecap="round" />
              <line x1={cS.x} y1={cS.y} x2={bas.x} y2={bas.y} stroke="#8b5cf6" strokeWidth={1.2} strokeDasharray="2,3" opacity={0.6} />
              <line x1={cS.x} y1={cS.y} x2={bitis.x} y2={bitis.y} stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="3,3" opacity={0.7} />
              <circle cx={cS.x} cy={cS.y} r={4} fill="#8b5cf6" />
              <circle cx={bas.x} cy={bas.y} r={4} fill="#8b5cf6" stroke="#ffffff" strokeWidth={1.5} />
              <rect x={cS.x - 46} y={cS.y - 30} width={92} height={20} rx={6} fill="#0f172a" fillOpacity={0.9} />
              <text x={cS.x} y={cS.y - 16} textAnchor="middle" fill="#ffffff" className="font-bold" fontSize={11}>
                {derece}° {pergel.tarama < 0 ? '↻' : '↺'} {derece >= 353 ? '(tam tur)' : ''}
              </text>
            </g>
          );
        })()}

        {dragCreateStart && dragCreateCurrent && (() => {
          const s1 = worldToScreen(dragCreateStart, viewport);
          const s2 = worldToScreen(dragCreateCurrent, viewport);
          const dxWorld = Math.abs(dragCreateCurrent.x - dragCreateStart.x);
          const dyWorld = Math.abs(dragCreateCurrent.y - dragCreateStart.y);
          const distWorld = Math.hypot(dxWorld, dyWorld);
          const yuvarla = (v: number) => Number(v.toFixed(1));
          // Oluşturma kodundaki çapa: dünyada en küçük x ve y
          const x1w = Math.min(dragCreateStart.x, dragCreateCurrent.x);
          const y1w = Math.min(dragCreateStart.y, dragCreateCurrent.y);
          /** Dünya dikdörtgenini ekran dikdörtgenine çevirir (y ekseni ters olduğu için üst = y+h). */
          const dunyaKutu = (w: number, h: number) => {
            const solUst = worldToScreen({ x: x1w, y: y1w + h }, viewport);
            const sagAlt = worldToScreen({ x: x1w + w, y: y1w }, viewport);
            return { x: solUst.x, y: solUst.y, w: sagAlt.x - solUst.x, h: sagAlt.y - solUst.y };
          };

          if (activeTool === 'ellipse') {
            const ra = yuvarla(dxWorld / 2);
            const rb = yuvarla(dyWorld / 2);
            const kutu = dunyaKutu(ra * 2, rb * 2);
            const mx = kutu.x + kutu.w / 2;
            const my = kutu.y + kutu.h / 2;
            return (
              <g className="pointer-events-none">
                <ellipse
                  cx={mx}
                  cy={my}
                  rx={Math.abs(kutu.w) / 2}
                  ry={Math.abs(kutu.h) / 2}
                  fill="#0ea5e9"
                  fillOpacity={0.12}
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
                <rect x={mx - 52} y={my - 12} width={104} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={mx} y={my + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  a={formatTurkishNumber(ra)} b={formatTurkishNumber(rb)} br
                </text>
              </g>
            );
          } else if (activeTool === 'square') {
            const kenar = yuvarla(Math.max(dxWorld, dyWorld));
            const kutu = dunyaKutu(kenar, kenar);
            const mx = kutu.x + kutu.w / 2;
            const my = kutu.y + kutu.h / 2;
            return (
              <g className="pointer-events-none">
                <rect
                  x={kutu.x}
                  y={kutu.y}
                  width={kutu.w}
                  height={kutu.h}
                  fill="#f43f5e"
                  fillOpacity={0.15}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
                <rect x={mx - 36} y={my - 12} width={72} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={mx} y={my + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {formatTurkishNumber(kenar)} x {formatTurkishNumber(kenar)} br
                </text>
              </g>
            );
          } else if (activeTool === 'rectangle') {
            const gen = yuvarla(dxWorld);
            const yuk = yuvarla(dyWorld);
            const kutu = dunyaKutu(gen, yuk);
            const mx = kutu.x + kutu.w / 2;
            const my = kutu.y + kutu.h / 2;
            return (
              <g className="pointer-events-none">
                <rect
                  x={kutu.x}
                  y={kutu.y}
                  width={kutu.w}
                  height={kutu.h}
                  fill="#f59e0b"
                  fillOpacity={0.15}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
                <rect x={mx - 40} y={my - 12} width={80} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={mx} y={my + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {formatTurkishNumber(gen)} x {formatTurkishNumber(yuk)} br
                </text>
              </g>
            );
          } else if (activeTool === 'circle') {
            // Oluşan çemberin yarıçapı 0,1'e yuvarlanır; önizleme de aynı değeri çizmeli
            const yariCap = yuvarla(distWorld);
            const rPx = yariCap * viewport.zoom;
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
                  r = {formatTurkishNumber(yariCap)} br
                </text>
              </g>
            );
          } else if (activeTool === 'segment') {
            return (
              <g className="pointer-events-none">
                <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#0284c7" strokeWidth={2.5} strokeDasharray="4,4" />
                <rect x={(s1.x + s2.x) / 2 - 25} y={(s1.y + s2.y) / 2 - 12} width={50} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={(s1.x + s2.x) / 2} y={(s1.y + s2.y) / 2 + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {/* Oluşacak parçanın gerçek uzunluğu gösterilir (ızgaraya yapış açıkken yuvarlama yapılmaz) */}
                  {formatTurkishNumber(viewport.snapToGrid ? distWorld : Number(distWorld.toFixed(1)))} br
                </text>
              </g>
            );
          }
          return null;
        })()}

        {/* 13.b TIKLA-TIKLA ARAÇLARIN CANLI ÖNİZLEMESİ
             Kullanıcı ilk nokta(lar)ını koyduktan sonra imleci gezdirirken sonucu kesikli görür;
             böylece son tıklamayı "kör" yapmaz. */}
        {pendingPointIds.length > 0 && (() => {
          const bekleyen = pendingPointIds
            .map((id) => pointsById.get(id))
            .filter(Boolean) as PointObject[];
          if (bekleyen.length !== pendingPointIds.length) return null;
          const imlec = mouseWorldPos;
          const RENK = '#8b5cf6';

          // 1) Üç noktadan geçen çember
          if (activeTool === 'circle_3points' && bekleyen.length === 2) {
            const cc = calculateCircumcircle(bekleyen[0], bekleyen[1], imlec);
            if (!cc) return null;
            // İmleç iki noktanın doğrusuna yaklaşınca yarıçap patlar; devasa bir çember
            // çizmek yerine önizlemeyi gizle (üçüncü nokta oraya konursa zaten hata verilir).
            const enBuyukYaricapPx = Math.max(viewport.width, viewport.height) * 4;
            if (cc.radius * viewport.zoom > enBuyukYaricapPx) return null;
            const cS = worldToScreen(cc.center, viewport);
            return (
              <g className="pointer-events-none">
                <circle
                  cx={cS.x}
                  cy={cS.y}
                  r={cc.radius * viewport.zoom}
                  fill={RENK}
                  fillOpacity={0.08}
                  stroke={RENK}
                  strokeWidth={2}
                  strokeDasharray="5,4"
                />
                <circle cx={cS.x} cy={cS.y} r={3.5} fill={RENK} />
              </g>
            );
          }

          // 2) Yay ve daire dilimi
          if ((activeTool === 'arc' || activeTool === 'sector') && bekleyen.length === 2) {
            const geo = getArcGeometry(bekleyen[0], bekleyen[1], imlec);
            if (!geo) return null;
            const cS = worldToScreen(bekleyen[0], viewport);
            const rPx = geo.radius * viewport.zoom;
            const nokta = (a: number) => ({ x: cS.x + rPx * Math.cos(a), y: cS.y - rPx * Math.sin(a) });
            const p0 = nokta(geo.startAngle);
            const p1 = nokta(geo.endAngle);
            const buyukYay = geo.sweep > Math.PI ? 1 : 0;
            const yay = 'A ' + rPx + ' ' + rPx + ' 0 ' + buyukYay + ' 0 ' + p1.x + ' ' + p1.y;
            const d =
              activeTool === 'sector'
                ? 'M ' + cS.x + ' ' + cS.y + ' L ' + p0.x + ' ' + p0.y + ' ' + yay + ' Z'
                : 'M ' + p0.x + ' ' + p0.y + ' ' + yay;
            const derece = Math.round((geo.sweep * 180) / Math.PI);
            return (
              <g className="pointer-events-none">
                <path
                  d={d}
                  fill={activeTool === 'sector' ? '#10b981' : 'none'}
                  fillOpacity={activeTool === 'sector' ? 0.18 : 0}
                  stroke={activeTool === 'sector' ? '#10b981' : '#0284c7'}
                  strokeWidth={2}
                  strokeDasharray="5,4"
                  strokeLinecap="round"
                />
                <line x1={cS.x} y1={cS.y} x2={p0.x} y2={p0.y} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="3,3" />
                <line x1={cS.x} y1={cS.y} x2={p1.x} y2={p1.y} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="3,3" />
                {/* Bitiş noktası yayın ÜZERİNE oturacak; hedef konumu şimdiden göster */}
                <circle cx={p1.x} cy={p1.y} r={5} fill="#ffffff" stroke={activeTool === 'sector' ? '#10b981' : '#0284c7'} strokeWidth={2} />
                <rect x={cS.x - 22} y={cS.y - 30} width={44} height={20} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={cS.x} y={cS.y - 16} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {formatTurkishNumber(derece)}°
                </text>
              </g>
            );
          }

          // 3) Açı Oluştur
          if (activeTool === 'angle' && bekleyen.length === 2) {
            const p1w = bekleyen[0];
            const vw = bekleyen[1];
            const vS = worldToScreen(vw, viewport);
            const a1 = Math.atan2(-(p1w.y - vw.y), p1w.x - vw.x);
            const a2 = Math.atan2(-(imlec.y - vw.y), imlec.x - vw.x);
            let fark = a2 - a1;
            while (fark <= -Math.PI) fark += 2 * Math.PI;
            while (fark > Math.PI) fark -= 2 * Math.PI;
            const R = 22;
            const b0 = { x: vS.x + R * Math.cos(a1), y: vS.y + R * Math.sin(a1) };
            const b1 = { x: vS.x + R * Math.cos(a1 + fark), y: vS.y + R * Math.sin(a1 + fark) };
            const derece = Math.round(Math.abs((fark * 180) / Math.PI));
            const iS = worldToScreen(imlec, viewport);
            const yayYolu =
              'M ' + b0.x + ' ' + b0.y + ' A ' + R + ' ' + R + ' 0 0 ' + (fark > 0 ? 1 : 0) + ' ' + b1.x + ' ' + b1.y;
            return (
              <g className="pointer-events-none">
                <line x1={vS.x} y1={vS.y} x2={iS.x} y2={iS.y} stroke={RENK} strokeWidth={1.5} strokeDasharray="4,4" />
                <path d={yayYolu} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="4,3" />
                <rect x={vS.x + 26} y={vS.y - 32} width={44} height={20} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={vS.x + 48} y={vS.y - 18} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {formatTurkishNumber(derece)}°
                </text>
              </g>
            );
          }

          // 4) Doğru parçası / doğru / ışın / çember — tıkla-tıkla modunda lastik bant
          if (['segment', 'line', 'ray', 'circle'].includes(activeTool) && bekleyen.length === 1) {
            const p1w = bekleyen[0];
            const s1 = worldToScreen(p1w, viewport);
            const s2 = worldToScreen(imlec, viewport);
            const uzunluk = calculateDistance(p1w, imlec);
            if (activeTool === 'circle') {
              return (
                <g className="pointer-events-none">
                  <circle
                    cx={s1.x}
                    cy={s1.y}
                    r={uzunluk * viewport.zoom}
                    fill={RENK}
                    fillOpacity={0.08}
                    stroke={RENK}
                    strokeWidth={2}
                    strokeDasharray="5,4"
                  />
                  <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={RENK} strokeWidth={1.4} strokeDasharray="3,3" />
                  <rect x={s1.x - 32} y={s1.y - 12} width={64} height={22} rx={6} fill="#0f172a" fillOpacity={0.9} />
                  <text x={s1.x} y={s1.y + 3} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                    r = {formatTurkishNumber(uzunluk)} br
                  </text>
                </g>
              );
            }
            return (
              <g className="pointer-events-none">
                <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={RENK} strokeWidth={2} strokeDasharray="5,4" />
                <rect
                  x={(s1.x + s2.x) / 2 - 30}
                  y={(s1.y + s2.y) / 2 - 24}
                  width={60}
                  height={20}
                  rx={6}
                  fill="#0f172a"
                  fillOpacity={0.9}
                />
                <text
                  x={(s1.x + s2.x) / 2}
                  y={(s1.y + s2.y) / 2 - 10}
                  textAnchor="middle"
                  fill="#ffffff"
                  className="font-bold text-[11px]"
                >
                  {formatTurkishNumber(uzunluk)} br
                </text>
              </g>
            );
          }

          // 5) Çokgen — konan köşeler + imlece uzanan kenar + kapanış ipucu
          if (activeTool === 'polygon' && bekleyen.length >= 1) {
            const ekran = bekleyen.map((pt) => worldToScreen(pt, viewport));
            const iS = worldToScreen(imlec, viewport);
            const yol = ekran.map((pt, i) => (i === 0 ? 'M ' : 'L ') + pt.x + ' ' + pt.y).join(' ');
            const son = ekran[ekran.length - 1];
            return (
              <g className="pointer-events-none">
                {ekran.length >= 2 && <path d={yol} fill="none" stroke="#10b981" strokeWidth={2} strokeDasharray="5,4" />}
                <line x1={son.x} y1={son.y} x2={iS.x} y2={iS.y} stroke="#10b981" strokeWidth={2} strokeDasharray="4,4" />
                {ekran.length >= 2 && (
                  <line
                    x1={iS.x}
                    y1={iS.y}
                    x2={ekran[0].x}
                    y2={ekran[0].y}
                    stroke="#10b981"
                    strokeWidth={1.2}
                    strokeDasharray="2,4"
                    strokeOpacity={0.6}
                  />
                )}
              </g>
            );
          }

          return null;
        })()}

        {/* 13. CANLI ÖLÇÜM ÖNİZLEMESİ (Uzunluk Ölç / Birimle Ölç) */}
        {['measure_distance', 'unit_measure'].includes(activeTool) && pendingPointIds.length === 1 && (() => {
          const p1 = pointsById.get(pendingPointIds[0]);
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
            // Izgara ekranda çapanın ÜSTÜNE doğru çiziliyor (worldToScreen y'yi ters çevirir),
            // bu yüzden çokgen de [pos.y, pos.y + rows] aralığında kurulmalı.
            const x1 = pos.x;
            const y1 = pos.y;
            const x2 = pos.x + cols;
            const y2 = pos.y + rows;
            const [la, lb, lc, ld] = generateNextPointLabels(existingPointLabels(), 4);
            const color = '#10b981';

            const pts = [
              makePoint(la, x1, y1, color),
              makePoint(lb, x2, y1, color),
              makePoint(lc, x2, y2, color),
              makePoint(ld, x1, y2, color),
            ];

            const poly: PolygonObject = {
              id: createId('poly'),
              type: 'polygon',
              label: 'Alan Modeli',
              showLabel: true,
              pointIds: pts.map((p) => p.id),
              color: '#059669',
              fillColor: '#10b981',
              fillOpacity: 0.22,
              visible: true,
              showArea: true,
              showPerimeter: true,
              createdAt: Date.now(),
            };

            addObjects(
              [...pts, poly],
              `Alan modeli oluşturuldu (${formatTurkishNumber(cols)} x ${formatTurkishNumber(rows)} = ${formatTurkishNumber(cols * rows)} br²)`
            );
          }}
        />
      </svg>

      {/* 🪞 YANSITMA VE SİMETRİ EKSENİ SEÇİM ÇUBUĞU */}
      {['reflect', 'symmetry'].includes(activeTool) && (() => {
        const reflectTargetId = reflectTargetPolyId || selectedObjectId;
        const targetPoly = objects.find((o) => o.id === reflectTargetId && o.type === 'polygon') as
          | PolygonObject
          | undefined;
        const reflectWithAxis = (p1: Point2D, p2: Point2D, axisName: string) => {
          if (targetPoly) {
            reflectPolygonAcrossSymmetryLine(targetPoly, p1, p2, axisName);
          } else {
            setHintMessage('Önce bir şekil seçin');
          }
        };

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
                onClick={() => reflectWithAxis({ x: 0, y: 0 }, { x: 1, y: 0 }, 'x Ekseni')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>↔</span>
                <span>x Eksenine Göre</span>
              </button>

              <button
                onClick={() => reflectWithAxis({ x: 0, y: 0 }, { x: 0, y: 1 }, 'y Ekseni')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>↕</span>
                <span>y Eksenine Göre</span>
              </button>

              <button
                onClick={() => reflectWithAxis({ x: 0, y: 0 }, { x: 1, y: 1 }, 'y = x Doğrusu')}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>↗</span>
                <span>y = x Doğrusu</span>
              </button>

              <button
                onClick={() => reflectWithAxis({ x: 0, y: 0 }, { x: 1, y: -1 }, 'y = -x Doğrusu')}
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
      {['measure_angle', 'angle', 'measure_distance', 'measure_area', 'measure_perimeter', 'unit_measure', 'area_model', 'ruler', 'setsquare', 'rotate', 'reflect', 'symmetry', 'circle_radius', 'circle_3points', 'arc', 'sector', 'ellipse',
        'midpoint', 'divide_ratio', 'perp_bisector', 'angle_bisector', 'perpendicular', 'parallel',
        'segment_length', 'compass', 'intersect', 'translate', 'measure_slope', 'trig_ratios',
        'checkbox', 'button', 'input_box'].includes(activeTool) && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-card/95 backdrop-blur-md text-white border border-border shadow-2xl px-4 py-2.5 rounded-2xl flex items-center gap-3 z-30 select-none animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black">
              {activeTool === 'measure_angle' && '📐 Açıölçer: Açıyı ölçmek için gövdeyi taşıyın veya turuncu ibreyi sürükleyin.'}
              {activeTool === 'angle' && `📐 Açı Oluştur: 3 nokta seçin${pendingPointIds.length > 0 ? ` (${pendingPointIds.length}/3 seçildi)` : ''}.`}
              {activeTool === 'measure_distance' && `📏 Uzunluk Ölç (cm): 2 köşe/nokta veya doğru parçası seçin${pendingPointIds.length > 0 ? ` (${pendingPointIds.length}/2 seçildi)` : ''}.`}
              {activeTool === 'measure_area' && '🟩 Alanı Bul: Alanını görmek istediğiniz çokgene veya şekle dokunun.'}
              {activeTool === 'measure_perimeter' && '🔄 Çevre Hesapla: Çevresini görmek istediğiniz çokgene dokunun.'}
              {activeTool === 'unit_measure' && `🔢 Birimle Ölç (br): 2 köşe/nokta veya doğru parçası seçin${pendingPointIds.length > 0 ? ` (${pendingPointIds.length}/2 seçildi)` : ''}.`}
              {activeTool === 'area_model' && '🟩 Alanı Modelle: Mavi tutamaçtan çekerek satır ve sütunları boyutlandırın veya modeli sürükleyin.'}
              {activeTool === 'ruler' && '📏 Cetvel: Gövdeden tutarak taşıyın, sağ kenardaki turuncu tutamaçtan çekerek uzunluğunu ayarlayın.'}
              {activeTool === 'setsquare' && '📐 Gönye: Gövdeden tutarak taşıyın ve dik açıları inceleyin.'}
              {activeTool === 'circle_radius' && '⭕ Yarıçapla Çember: Merkez olacak yere tıklayın; açılan pencereye yarıçapı yazın.'}
              {activeTool === 'circle_3points' &&
                `⭕ Üç Noktadan Çember: Üç noktaya tıklayın; bu üç noktadan geçen çember çizilir (${pendingPointIds.length}/3 seçildi).`}
              {activeTool === 'arc' &&
                `◠ Yay: Önce MERKEZ, sonra BAŞLANGIÇ, sonra BİTİŞ noktasına tıklayın; yay saat yönünün tersine çizilir (${pendingPointIds.length}/3 seçildi).`}
              {activeTool === 'sector' &&
                `🥧 Daire Dilimi: Önce MERKEZ, sonra BAŞLANGIÇ, sonra BİTİŞ noktasına tıklayın; içi dolu dilim çizilir (${pendingPointIds.length}/3 seçildi).`}
              {activeTool === 'checkbox' &&
                '☑️ İşaret Kutusu: Önce gösterip gizleyeceğiniz nesneleri seçin (Seç ve Taşı + Shift), sonra kutunun duracağı yere tıklayın. Kutuyu kapatmak nesneleri SİLMEZ, yalnızca gizler.'}
              {activeTool === 'button' &&
                '🔘 Düğme: Önce etkileyeceği nesneleri veya kaydırıcıları seçin, sonra düğmenin yerine tıklayın. Kaydırıcı seçtiyseniz düğme canlandırmayı başlatıp durdurur.'}
              {activeTool === 'input_box' &&
                '⌨️ Girdi Kutusu: Önce bir kaydırıcı veya fonksiyon seçin, sonra kutunun yerine tıklayın. Değeri yazıp Enter’a basın.'}
              {activeTool === 'midpoint' && '📍 Orta Nokta: İki noktaya tıklayın; aralarındaki orta nokta oluşur.'}
              {activeTool === 'divide_ratio' &&
                '✂️ Oranda Böl: İki noktaya tıklayın, sonra m:n oranını girin (örn. 2:1). İlk tıkladığınız uç "m" tarafıdır.'}
              {activeTool === 'perp_bisector' &&
                '📏 Orta Dikme: İki noktaya tıklayın; orta noktalarından geçen dik doğru çizilir. Üzerindeki her nokta iki uca eşit uzaklıktadır.'}
              {activeTool === 'angle_bisector' &&
                '🔀 Açıortay: Sırayla bir kola, AÇININ KÖŞESİNE ve diğer kola tıklayın; açıyı iki eş parçaya bölen ışın çizilir.'}
              {activeTool === 'perpendicular' &&
                '⊥ Dik Doğru: İlk iki nokta doğrultuyu belirler, üçüncü nokta doğrunun geçtiği yerdir.'}
              {activeTool === 'parallel' &&
                '∥ Paralel Doğru: İlk iki nokta doğrultuyu belirler, üçüncü nokta doğrunun geçtiği yerdir.'}
              {activeTool === 'segment_length' &&
                '📐 Uzunluğu Verilen Doğru Parçası: Başlangıç noktasına tıklayın, sonra uzunluğu girin.'}
              {activeTool === 'compass' &&
                '🧭 Pergel: 1) İğneyi saplayın. 2) İmleci iğneden uzaklaştırıp açıklığı ayarlayın, tıklayın. 3) Yayın BAŞLANGICINI istediğiniz yere bırakın (imleç çemberin üstünde olmak zorunda değil, yönü yeter). 4) İSTEDİĞİNİZ YÖNE dönerek yayı çizin; tam tura getirirseniz çember olur. Esc ile vazgeçin.'}
              {activeTool === 'intersect' &&
                '✖️ Kesiştir: İki şekle sırayla tıklayın; ortak noktaları oluşturulur (doğru–çember, çember–çember…).'}
              {activeTool === 'translate' &&
                '➡️ Öteleme: Önce şekli "Seç ve Taşı" ile seçin; sonra öteleme vektörünün başlangıç ve bitiş noktasına tıklayın.'}
              {activeTool === 'measure_slope' &&
                '📈 Eğim: İki noktaya tıklayın; aradaki doğrunun eğimi m = Δy/Δx olarak gösterilir.'}
              {activeTool === 'trig_ratios' &&
                '📊 Trigonometrik Oranlar: Sırayla bir kola, AÇININ KÖŞESİNE ve diğer kola tıklayın. Üçgenin dik olması gerekmez; dikse kenar oranları da yazılır.'}
              {activeTool === 'ellipse' &&
                '🥚 Elips: Tuvalde bir köşeden diğerine sürükleyin; sürüklediğiniz kutuya içten teğet elips çizilir. Yarıçapları sonra sağ tık menüsünden değiştirebilirsiniz.'}
              {activeTool === 'rotate' && '🔄 Şekli Döndür: Önce bir şekil seçin; üzerindeki serbest döndür ikonunu (🔄) basılı tutarak sürükleyin veya altındaki hazır derecelere (30°, 45°, 60°, 90°...) tıklayın.'}
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
                  const names = pendingPointIds
                    .map((id) => pointsById.get(id)?.label)
                    .filter(Boolean)
                    .join('');
                  const newPolygon: PolygonObject = {
                    id: createId('poly'),
                    type: 'polygon',
                    label: names ? `${names} Çokgeni` : 'Çokgen',
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
                  addObject(newPolygon, `${newPolygon.label} oluşturuldu`);
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
                deleteObjects(
                  selectedObjectIds,
                  selectedObjectIds.length === 1 ? undefined : `${selectedObjectIds.length} seçili nesne silindi`
                );
                setSelectedObjectIds([]);
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
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
          <span>📍 İmleç:</span>
          <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-lg font-black">{formatCoordinate(mouseWorldPos)}</span>
        </div>
        <div className="w-[1px] h-4 bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
          <span>🔍 Ölçek:</span>
          <span className="font-mono font-bold text-foreground">%{Math.round((viewport.zoom / DEFAULT_ZOOM) * 100)}</span>
        </div>
        <div className="w-[1px] h-4 bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
          <span>🎨 Nesne Sayısı:</span>
          <span className="font-bold text-foreground px-2 py-0.5 rounded-lg bg-muted">{objects.length}</span>
        </div>
      </div>

      {/* SÜRÜKLEME SIRASINDA KENAR KENETLEME KILAVUZLARI */}
      {isDraggingDock && (
        <div className="absolute inset-0 z-30 pointer-events-none p-2 grid grid-cols-3 grid-rows-3 gap-2">
          {/* Üst Kılavuz */}
          <div
            className={`col-span-3 h-12 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center text-xs font-bold ${
              (dockPreview ?? dockPosition) === 'top'
                ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 bg-slate-500/5 text-muted-foreground'
            }`}
          >
            ⬆ Üst Kenara Sabitle
          </div>

          {/* Sol Kılavuz */}
          <div
            className={`row-span-1 w-14 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center text-xs font-bold [writing-mode:vertical-rl] rotate-180 self-center h-48 justify-self-start ${
              (dockPreview ?? dockPosition) === 'left'
                ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 bg-slate-500/5 text-muted-foreground'
            }`}
          >
            ⬅ Sol Kenara Sabitle
          </div>

          <div />

          {/* Sağ Kılavuz */}
          <div
            className={`row-span-1 w-14 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center text-xs font-bold [writing-mode:vertical-rl] self-center h-48 justify-self-end ${
              (dockPreview ?? dockPosition) === 'right'
                ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 bg-slate-500/5 text-muted-foreground'
            }`}
          >
            ➡ Sağ Kenara Sabitle
          </div>

          {/* Alt Kılavuz */}
          <div
            className={`col-span-3 h-12 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center text-xs font-bold self-end ${
              (dockPreview ?? dockPosition) === 'bottom'
                ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 bg-slate-500/5 text-muted-foreground'
            }`}
          >
            ⬇ Alt Kenara Sabitle
          </div>
        </div>
      )}

      {/* 2. DÖRT KENARA KENETLENEBİLİR / YÜZEN HIZLI ARAÇ ÇUBUĞU */}
      {(() => {
        const activeDock = dockPreview ?? dockPosition;
        const isVert = activeDock === 'right' || activeDock === 'left';
        const posClass =
          activeDock === 'right'
            ? 'right-3.5 top-1/2 -translate-y-1/2 flex-col'
            : activeDock === 'left'
            ? 'left-3.5 top-1/2 -translate-y-1/2 flex-col'
            : activeDock === 'top'
            ? 'top-14 left-1/2 -translate-x-1/2 flex-row'
            : 'bottom-3.5 left-1/2 -translate-x-1/2 flex-row';

        return (
          <div
            className={`absolute z-30 flex items-center gap-1.5 p-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-xl select-none transition-all duration-200 ${posClass} ${
              isDraggingDock ? 'ring-2 ring-blue-500 shadow-2xl opacity-90 scale-105' : ''
            }`}
          >
            {/* Tutma / Sürükleme ve Kenar Değiştirme Kolu */}
            <div
              onPointerDown={handleDockDragStart}
              onDoubleClick={cycleDockPosition}
              title="Sürükleyerek kenara taşıyın veya çift tıklayarak konumu değiştirin (Sağ / Alt / Sol / Üst)"
              className={`p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-grab active:cursor-grabbing transition-colors flex items-center justify-center ${
                isVert ? 'w-8 h-4 my-0.5' : 'h-8 w-4 mx-0.5'
              }`}
            >
              {isVert ? <GripHorizontal className="w-3.5 h-3.5" /> : <GripVertical className="w-3.5 h-3.5" />}
            </div>

            <div className={isVert ? 'w-5 h-px bg-slate-200 dark:bg-slate-700 my-0.5' : 'h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5'} />

            {/* 0. Kaydırıcı Oynat / Durdur — yalnızca sahnede kaydırıcı varken görünür */}
            {sliders.length > 0 && (
              <>
                <button
                  onClick={toggleSliderPlayback}
                  title={
                    sliderPlaying
                      ? 'Kaydırıcı animasyonunu durdur'
                      : 'Kaydırıcıları oynat (değerler uçtan uca gidip gelir)'
                  }
                  aria-pressed={sliderPlaying}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    sliderPlaying
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  {sliderPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className={isVert ? 'w-5 h-px bg-slate-200 dark:bg-slate-700 my-0.5' : 'h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5'} />
              </>
            )}

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

            {/* 2. Yinele (Redo) */}
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Yinele (Ctrl+Y)"
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
              onClick={fitToObjects}
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
                  deleteObjects(
                    selectedObjectIds,
                    selectedObjectIds.length === 1 ? undefined : `${selectedObjectIds.length} seçili nesne silindi`
                  );
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

            <div className={isVert ? 'w-6 h-px bg-slate-200 dark:bg-slate-700 my-0.5' : 'h-6 w-px bg-slate-200 dark:bg-slate-700 mx-0.5'} />

            {/* 12. Tümünü Sil (Tüm Ekranı Temizle) */}
            <button
              onClick={() => requestClearAll('2D')}
              title="Tümünü Sil (Tüm ekranı ve şekilleri temizle)"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer text-rose-600 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 hover:shadow-md hover:shadow-rose-500/30 group"
            >
              <Eraser className="w-4 h-4 transition-transform group-hover:scale-110" />
            </button>
          </div>
        );
      })()}

      {/* İPUCU MESAJI KAPSÜLÜ (Örn: "Önce bir şekil seçin") */}
      {hintMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-amber-500 text-slate-950 border border-amber-300 shadow-2xl px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-black select-none animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          <span>💡</span>
          <span>{hintMessage}</span>
        </div>
      )}

      {/* Görsel Ekle aracı için gizli dosya seçici */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelected}
      />

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
              id: createId('txt'),
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

      {/* SAĞ TIK BAĞLAM MENÜSÜ */}
      <ContextMenu
        open={contextTarget !== null}
        x={contextTarget?.x ?? 0}
        y={contextTarget?.y ?? 0}
        title={
          contextTarget
            ? contextTarget.obj ? contextTarget.obj.label || TYPE_LABELS[contextTarget.obj.type] || 'Nesne' : 'Çizim alanı'
            : ''
        }
        items={contextMenuItems}
        onClose={() => setContextTarget(null)}
      />
    </div>
  );
}
