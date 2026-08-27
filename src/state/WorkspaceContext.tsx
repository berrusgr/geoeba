'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  TextObject,
  PenStrokeObject,
  ImageObject,
  Point2D,
  ViewportTransform,
} from '@/types/math';
import { ToolMode, WorkspaceHistoryStep } from '@/types/workspace';
import {
  calculateDistance,
  calculateAngleDegrees,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateCircleArea,
  calculateCircleCircumference,
  generateNextPointLabel,
} from '@/math/geometry';
import { snapToGridPoint } from '@/math/coordinates';
import { useCurriculum } from './CurriculumContext';
import confetti from 'canvas-confetti';

interface WorkspaceContextType {
  objects: MathObject[];
  selectedObjectId: string | null;
  activeTool: ToolMode;
  viewport: ViewportTransform;
  pendingPointIds: string[];
  history: WorkspaceHistoryStep[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  activityCompleted: boolean;
  activeSuccessMessage: string | null;
  studioDimension: '2D' | '3D';

  // Eylemler
  setStudioDimension: (dim: '2D' | '3D') => void;
  setActiveTool: (tool: ToolMode) => void;
  setSelectedObjectId: (id: string | null) => void;
  setViewport: React.Dispatch<React.SetStateAction<ViewportTransform>>;
  addObject: (obj: MathObject, historyLabel?: string) => void;
  updateObject: (id: string, updates: Partial<MathObject>, recordHistory?: boolean) => void;
  deleteObject: (id: string) => void;
  clearWorkspace: () => void;
  resetViewport: () => void;
  handlePointClick: (pointId: string) => void;
  handleCanvasClick: (worldPos: Point2D) => void;
  handlePointDrag: (pointId: string, newWorldPos: Point2D) => void;
  handleSliderChange: (sliderId: string, value: number) => void;
  addFunction: (expression: string, label?: string) => void;
  addSlider: (name: string, min: number, max: number, step: number, initialValue: number) => void;
  undo: () => void;
  redo: () => void;
  cancelPendingAction: () => void;
  restartCurrentActivity: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WORKSPACE_STORAGE_KEY = 'matematik_calisma_alani_v1';

const DEFAULT_VIEWPORT: ViewportTransform = {
  zoom: 44,
  panX: 0,
  panY: 0,
  width: 1200,
  height: 700,
  showGrid: true,
  showAxes: true,
  showCoordinates: true,
  snapToGrid: false,
  gridStep: 1,
};

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { selectedActivity } = useCurriculum();

  const [objects, setObjects] = useState<MathObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [viewport, setViewport] = useState<ViewportTransform>(DEFAULT_VIEWPORT);
  const [pendingPointIds, setPendingPointIds] = useState<string[]>([]);
  const [history, setHistory] = useState<WorkspaceHistoryStep[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [activityCompleted, setActivityCompleted] = useState<boolean>(false);
  const [activeSuccessMessage, setActiveSuccessMessage] = useState<string | null>(null);
  const [studioDimension, setStudioDimension] = useState<'2D' | '3D'>('2D');

  // Etkinlik değiştiğinde nesneleri yükle
  useEffect(() => {
    if (selectedActivity) {
      const initial = JSON.parse(JSON.stringify(selectedActivity.initialObjects)) as MathObject[];
      setObjects(initial);
      setSelectedObjectId(null);
      setPendingPointIds([]);
      setActivityCompleted(false);
      setActiveSuccessMessage(null);
      setActiveTool('select');

      if (selectedActivity.initialViewport) {
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

      setHistory([
        {
          objects: initial,
          description: `${selectedActivity.title} etkinliği yüklendi`,
          timestamp: Date.now(),
        },
      ]);
      setHistoryIndex(0);
    } else {
      // Serbest Çalışma Masası - Her zaman boş/temiz başlat
      setObjects([]);
      setHistory([]);
      setHistoryIndex(-1);
    }
  }, [selectedActivity]);

  // Geçmiş kaydı ekleme
  const pushHistory = useCallback(
    (newObjects: MathObject[], description: string) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, { objects: newObjects, description, timestamp: Date.now() }];
      });
      setHistoryIndex((prev) => prev + 1);

      // Serbest çalışma masasında LocalStorage'a kaydet
      if (!selectedActivity) {
        try {
          localStorage.setItem(
            WORKSPACE_STORAGE_KEY,
            JSON.stringify({ objects: newObjects, version: 1 })
          );
        } catch (e) {}
      }
    },
    [historyIndex, selectedActivity]
  );

  // Etkinlik doğrulaması (Deterministik Kural Motoru)
  useEffect(() => {
    if (!selectedActivity || selectedActivity.validationRules.length === 0) return;

    for (const rule of selectedActivity.validationRules) {
      if (rule.type === 'segment_length_equals') {
        const targetSeg = objects.find(
          (o) => o.type === 'segment' && (!rule.targetIds || rule.targetIds.includes(o.id))
        ) as SegmentObject | undefined;

        if (targetSeg) {
          const p1 = objects.find((o) => o.id === targetSeg.startPointId) as PointObject;
          const p2 = objects.find((o) => o.id === targetSeg.endPointId) as PointObject;
          if (p1 && p2) {
            const dist = calculateDistance(p1, p2);
            if (rule.expectedValue !== undefined && Math.abs(dist - rule.expectedValue) <= (rule.tolerance ?? 0.15)) {
              if (!activityCompleted) {
                setActivityCompleted(true);
                setActiveSuccessMessage(rule.successMessage);
                try {
                  confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
                } catch (e) {}
              }
              return;
            }
          }
        }
      } else if (rule.type === 'angle_sum_equals') {
        const angles = objects.filter((o) => o.type === 'angle') as AngleObject[];
        if (angles.length >= 3) {
          let sum = 0;
          let valid = true;
          for (const ang of angles) {
            const p1 = objects.find((o) => o.id === ang.point1Id) as PointObject;
            const vertex = objects.find((o) => o.id === ang.vertexPointId) as PointObject;
            const p3 = objects.find((o) => o.id === ang.point3Id) as PointObject;
            if (p1 && vertex && p3) {
              sum += calculateAngleDegrees(p1, vertex, p3);
            } else {
              valid = false;
            }
          }
          if (valid && rule.expectedValue !== undefined && Math.abs(sum - rule.expectedValue) <= (rule.tolerance ?? 2)) {
            if (!activityCompleted) {
              setActivityCompleted(true);
              setActiveSuccessMessage(rule.successMessage);
              try {
                confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
              } catch (e) {}
            }
            return;
          }
        }
      } else if (rule.type === 'circle_radius_equals') {
        const circ = objects.find(
          (o) => o.type === 'circle' && (!rule.targetIds || rule.targetIds.includes(o.id))
        ) as CircleObject | undefined;
        if (circ) {
          const center = objects.find((o) => o.id === circ.centerPointId) as PointObject;
          let radius = circ.fixedRadius ?? 0;
          if (circ.radiusPointId) {
            const rPoint = objects.find((o) => o.id === circ.radiusPointId) as PointObject;
            if (center && rPoint) {
              radius = calculateDistance(center, rPoint);
            }
          }
          if (rule.expectedValue !== undefined && Math.abs(radius - rule.expectedValue) <= (rule.tolerance ?? 0.15)) {
            if (!activityCompleted) {
              setActivityCompleted(true);
              setActiveSuccessMessage(rule.successMessage);
              try {
                confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
              } catch (e) {}
            }
            return;
          }
        }
      } else if (rule.type === 'custom') {
        // Kaydırıcı veya genel kural kontrolü
        const sliders = objects.filter((o) => o.type === 'slider') as SliderObject[];
        const targetSlider = sliders.find((s) => s.variableName === 'a');
        if (targetSlider && rule.expectedValue !== undefined) {
          if (Math.abs(targetSlider.value - rule.expectedValue) <= (rule.tolerance ?? 0.1)) {
            if (!activityCompleted) {
              setActivityCompleted(true);
              setActiveSuccessMessage(rule.successMessage);
              try {
                confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
              } catch (e) {}
            }
            return;
          }
        }
      }
    }
  }, [objects, selectedActivity, activityCompleted]);

  // Nesne Ekleme
  const addObject = (obj: MathObject, historyLabel?: string) => {
    setObjects((prev) => {
      const next = [...prev, obj];
      pushHistory(next, historyLabel ?? `${obj.label || 'Yeni nesne'} eklendi`);
      return next;
    });
  };

  // Nesne Güncelleme
  const updateObject = (id: string, updates: Partial<MathObject>, recordHistory = true) => {
    setObjects((prev) => {
      const next = prev.map((o) => (o.id === id ? ({ ...o, ...updates } as MathObject) : o));
      if (recordHistory) {
        pushHistory(next, `${id} nesnesi güncellendi`);
      }
      return next;
    });
  };

  // Nesne Silme
  const deleteObject = (id: string) => {
    setObjects((prev) => {
      // Nokta silinirse ona bağlı doğruları, çemberleri vb. de temizle
      const next = prev.filter((o) => {
        if (o.id === id) return false;
        if (o.type === 'segment' && (o.startPointId === id || o.endPointId === id)) return false;
        if (o.type === 'line' && (o.point1Id === id || o.point2Id === id)) return false;
        if (o.type === 'ray' && (o.startPointId === id || o.throughPointId === id)) return false;
        if (o.type === 'circle' && (o.centerPointId === id || o.radiusPointId === id)) return false;
        if (o.type === 'angle' && (o.point1Id === id || o.vertexPointId === id || o.point3Id === id)) return false;
        if (o.type === 'polygon' && o.pointIds.includes(id)) return false;
        return true;
      });
      pushHistory(next, 'Nesne silindi');
      return next;
    });
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
    }
  };

  // Tuvali Temizleme
  const clearWorkspace = () => {
    setObjects([]);
    setSelectedObjectId(null);
    setPendingPointIds([]);
    pushHistory([], 'Çalışma alanı temizlendi');
  };

  // Görünümü Sıfırlama
  const resetViewport = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: 40,
      panX: 0,
      panY: 0,
    }));
  };

  // Nokta sürükleme
  const handlePointDrag = (pointId: string, newWorldPos: Point2D) => {
    const pos = viewport.snapToGrid ? snapToGridPoint(newWorldPos, viewport.gridStep) : newWorldPos;
    setObjects((prev) =>
      prev.map((o) => (o.id === pointId && o.type === 'point' ? { ...o, x: pos.x, y: pos.y } : o))
    );
  };

  // Kaydırıcı değişimi
  const handleSliderChange = (sliderId: string, value: number) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === sliderId && o.type === 'slider' ? { ...o, value } : o))
    );
  };

  // Fonksiyon ekleme
  const addFunction = (expression: string, label?: string) => {
    const newFn: FunctionObject = {
      id: `fn-${Date.now()}`,
      type: 'function',
      label: label ?? `f(x) = ${expression}`,
      showLabel: true,
      expression,
      color: '#2563eb',
      thickness: 2.5,
      visible: true,
      createdAt: Date.now(),
    };
    addObject(newFn, `f(x) = ${expression} fonksiyon grafiği eklendi`);
  };

  // Kaydırıcı ekleme
  const addSlider = (
    name: string,
    min: number,
    max: number,
    step: number,
    initialValue: number
  ) => {
    const newSlider: SliderObject = {
      id: `slider-${Date.now()}`,
      type: 'slider',
      label: `${name} Parametresi`,
      showLabel: true,
      variableName: name,
      min,
      max,
      step,
      value: initialValue,
      color: '#8b5cf6',
      visible: true,
      createdAt: Date.now(),
    };
    addObject(newSlider, `${name} kaydırıcısı eklendi`);
  };

  // Noktaya tıklanması durumu (Araç oluşturma adımları)
  const handlePointClick = (pointId: string) => {
    if (activeTool === 'select') {
      setSelectedObjectId(pointId);
      return;
    }

    if (activeTool === 'delete') {
      deleteObject(pointId);
      return;
    }

    if (activeTool === 'segment') {
      const nextPending = [...pendingPointIds, pointId];
      if (nextPending.length === 1) {
        setPendingPointIds(nextPending);
      } else if (nextPending.length === 2) {
        if (nextPending[0] !== nextPending[1]) {
          const p1 = objects.find((o) => o.id === nextPending[0]) as PointObject;
          const p2 = objects.find((o) => o.id === nextPending[1]) as PointObject;
          const label = p1 && p2 ? `${p1.label}${p2.label} Doğru Parçası` : 'Doğru Parçası';

          const newSegment: SegmentObject = {
            id: `seg-${Date.now()}`,
            type: 'segment',
            label,
            showLabel: true,
            startPointId: nextPending[0],
            endPointId: nextPending[1],
            color: '#0284c7',
            visible: true,
            showLength: true,
            thickness: 2.5,
            createdAt: Date.now(),
          };
          addObject(newSegment, `${label} oluşturuldu`);
        }
        setPendingPointIds([]);
      }
    } else if (activeTool === 'line') {
      const nextPending = [...pendingPointIds, pointId];
      if (nextPending.length === 1) {
        setPendingPointIds(nextPending);
      } else if (nextPending.length === 2) {
        if (nextPending[0] !== nextPending[1]) {
          const newLine: LineObject = {
            id: `line-${Date.now()}`,
            type: 'line',
            label: 'Doğru',
            showLabel: true,
            point1Id: nextPending[0],
            point2Id: nextPending[1],
            color: '#0284c7',
            visible: true,
            showEquation: true,
            thickness: 2,
            createdAt: Date.now(),
          };
          addObject(newLine, 'Doğru oluşturuldu');
        }
        setPendingPointIds([]);
      }
    } else if (activeTool === 'ray') {
      const nextPending = [...pendingPointIds, pointId];
      if (nextPending.length === 1) {
        setPendingPointIds(nextPending);
      } else if (nextPending.length === 2) {
        if (nextPending[0] !== nextPending[1]) {
          const newRay: RayObject = {
            id: `ray-${Date.now()}`,
            type: 'ray',
            label: 'Işın',
            showLabel: true,
            startPointId: nextPending[0],
            throughPointId: nextPending[1],
            color: '#0284c7',
            visible: true,
            thickness: 2,
            createdAt: Date.now(),
          };
          addObject(newRay, 'Işın oluşturuldu');
        }
        setPendingPointIds([]);
      }
    } else if (activeTool === 'circle') {
      const nextPending = [...pendingPointIds, pointId];
      if (nextPending.length === 1) {
        setPendingPointIds(nextPending);
      } else if (nextPending.length === 2) {
        if (nextPending[0] !== nextPending[1]) {
          const newCircle: CircleObject = {
            id: `circ-${Date.now()}`,
            type: 'circle',
            label: 'Çember',
            showLabel: true,
            centerPointId: nextPending[0],
            radiusPointId: nextPending[1],
            color: '#8b5cf6',
            visible: true,
            showArea: true,
            showPerimeter: true,
            fillOpacity: 0.1,
            createdAt: Date.now(),
          };
          addObject(newCircle, 'Çember oluşturuldu');
        }
        setPendingPointIds([]);
      }
    } else if (activeTool === 'angle') {
      const nextPending = [...pendingPointIds, pointId];
      if (nextPending.length < 3) {
        setPendingPointIds(nextPending);
      } else if (nextPending.length === 3) {
        const p1 = objects.find((o) => o.id === nextPending[0]) as PointObject;
        const vertex = objects.find((o) => o.id === nextPending[1]) as PointObject;
        const p3 = objects.find((o) => o.id === nextPending[2]) as PointObject;
        const label = p1 && vertex && p3 ? `∠${p1.label}${vertex.label}${p3.label}` : 'Açı';

        const newAngle: AngleObject = {
          id: `ang-${Date.now()}`,
          type: 'angle',
          label,
          showLabel: true,
          point1Id: nextPending[0],
          vertexPointId: nextPending[1],
          point3Id: nextPending[2],
          color: '#f59e0b',
          visible: true,
          showValue: true,
          createdAt: Date.now(),
        };
        addObject(newAngle, `${label} oluşturuldu`);
        setPendingPointIds([]);
      }
    } else if (activeTool === 'polygon') {
      // İlk noktaya tekrar tıklandıysa çokgeni kapat
      if (pendingPointIds.length >= 3 && pendingPointIds[0] === pointId) {
        const newPolygon: PolygonObject = {
          id: `poly-${Date.now()}`,
          type: 'polygon',
          label: `${pendingPointIds.length} Köşeli Çokgen`,
          showLabel: true,
          pointIds: [...pendingPointIds],
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.15,
          visible: true,
          showArea: true,
          showPerimeter: true,
          createdAt: Date.now(),
        };
        addObject(newPolygon, 'Çokgen oluşturuldu');
        setPendingPointIds([]);
      } else if (!pendingPointIds.includes(pointId)) {
        setPendingPointIds([...pendingPointIds, pointId]);
      }
    }
  };

  // Tuval boşluğuna tıklandığında
  const handleCanvasClick = (rawWorldPos: Point2D) => {
    const worldPos = viewport.snapToGrid ? snapToGridPoint(rawWorldPos, viewport.gridStep) : rawWorldPos;

    // 1. NOKTA ARACI
    if (activeTool === 'point') {
      const existingPoints = objects.filter((o) => o.type === 'point') as PointObject[];
      const label = generateNextPointLabel(existingPoints.map((p) => p.label));

      const newPoint: PointObject = {
        id: `pt-${Date.now()}`,
        type: 'point',
        label,
        showLabel: true,
        x: worldPos.x,
        y: worldPos.y,
        color: '#2563eb',
        visible: true,
        isIndependent: true,
        createdAt: Date.now(),
      };
      addObject(newPoint, `${label} noktası oluşturuldu`);
      return;
    }

    // 2. KARE ARACI
    if (activeTool === 'square') {
      const side = 4;
      const x1 = worldPos.x - side / 2;
      const y1 = worldPos.y - side / 2;
      const x2 = x1 + side;
      const y2 = y1 + side;

      const p1: PointObject = { id: `pt-${Date.now()}`, type: 'point', label: 'A', showLabel: true, x: x1, y: y1, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() };
      const p2: PointObject = { id: `pt-${Date.now() + 1}`, type: 'point', label: 'B', showLabel: true, x: x2, y: y1, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 1 };
      const p3: PointObject = { id: `pt-${Date.now() + 2}`, type: 'point', label: 'C', showLabel: true, x: x2, y: y2, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 2 };
      const p4: PointObject = { id: `pt-${Date.now() + 3}`, type: 'point', label: 'D', showLabel: true, x: x1, y: y2, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 3 };

      const poly: PolygonObject = {
        id: `poly-${Date.now() + 4}`,
        type: 'polygon',
        label: 'Kare (a = 4 br)',
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

      setObjects((prev) => {
        const next = [...prev, p1, p2, p3, p4, poly];
        pushHistory(next, 'Kare oluşturuldu');
        return next;
      });
      return;
    }

    // 3. DİKDÖRTGEN ARACI
    if (activeTool === 'rectangle') {
      const w = 6;
      const h = 4;
      const x1 = worldPos.x - w / 2;
      const y1 = worldPos.y - h / 2;
      const x2 = x1 + w;
      const y2 = y1 + h;

      const p1: PointObject = { id: `pt-${Date.now()}`, type: 'point', label: 'A', showLabel: true, x: x1, y: y1, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() };
      const p2: PointObject = { id: `pt-${Date.now() + 1}`, type: 'point', label: 'B', showLabel: true, x: x2, y: y1, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 1 };
      const p3: PointObject = { id: `pt-${Date.now() + 2}`, type: 'point', label: 'C', showLabel: true, x: x2, y: y2, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 2 };
      const p4: PointObject = { id: `pt-${Date.now() + 3}`, type: 'point', label: 'D', showLabel: true, x: x1, y: y2, color: '#3b82f6', visible: true, isIndependent: true, createdAt: Date.now() + 3 };

      const poly: PolygonObject = {
        id: `poly-${Date.now() + 4}`,
        type: 'polygon',
        label: 'Dikdörtgen (6x4 br)',
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

      setObjects((prev) => {
        const next = [...prev, p1, p2, p3, p4, poly];
        pushHistory(next, 'Dikdörtgen oluşturuldu');
        return next;
      });
      return;
    }

    // 4. DÜZGÜN ÇOKGEN (ALTIGEN)
    if (activeTool === 'regular_polygon') {
      const sides = 6;
      const radius = 3;
      const pts: PointObject[] = [];
      const ptIds: string[] = [];

      for (let i = 0; i < sides; i++) {
        const ang = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const px = Number((worldPos.x + radius * Math.cos(ang)).toFixed(2));
        const py = Number((worldPos.y + radius * Math.sin(ang)).toFixed(2));
        const pId = `pt-${Date.now() + i}`;
        const p: PointObject = {
          id: pId,
          type: 'point',
          label: String.fromCharCode(65 + i),
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
      }

      const poly: PolygonObject = {
        id: `poly-${Date.now() + sides}`,
        type: 'polygon',
        label: 'Düzgün Altıgen',
        showLabel: true,
        pointIds: ptIds,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.18,
        visible: true,
        showArea: true,
        showPerimeter: true,
        createdAt: Date.now() + sides,
      };

      setObjects((prev) => {
        const next = [...prev, ...pts, poly];
        pushHistory(next, 'Düzgün Çokgen oluşturuldu');
        return next;
      });
      return;
    }

    // 5. KESİR MODELİ
    if (activeTool === 'fraction') {
      const fractionObj: FractionObject = {
        id: `frac-${Date.now()}`,
        type: 'fraction',
        label: '3/4 Kesir Modeli',
        showLabel: true,
        numerator: 3,
        denominator: 4,
        x: worldPos.x,
        y: worldPos.y,
        radius: 2.5,
        modelType: 'pie',
        color: '#8b5cf6',
        visible: true,
        createdAt: Date.now(),
      };
      addObject(fractionObj, '3/4 Kesir modeli eklendi');
      return;
    }

    // 6. METİN NOTU EKLE
    if (activeTool === 'text') {
      const textObj: TextObject = {
        id: `txt-${Date.now()}`,
        type: 'text',
        label: 'Not',
        showLabel: true,
        text: 'Matematik Notu',
        x: worldPos.x,
        y: worldPos.y,
        fontSize: 14,
        color: '#1e293b',
        visible: true,
        createdAt: Date.now(),
      };
      addObject(textObj, 'Metin notu eklendi');
      return;
    }

    // 7. GÖRSEL / MEDYA EKLE
    if (activeTool === 'image') {
      const imgObj: ImageObject = {
        id: `img-${Date.now()}`,
        type: 'image',
        label: 'Geometri Grafiği',
        showLabel: true,
        src: '/images/grades/hazirlik-h-icon.png',
        x: worldPos.x,
        y: worldPos.y,
        width: 4,
        height: 4,
        color: '#3b82f6',
        visible: true,
        createdAt: Date.now(),
      };
      addObject(imgObj, 'Görsel eklendi');
      return;
    }

    // 8. CETVEL / UZUNLUK ÖLÇÜMÜ
    if (activeTool === 'ruler' || activeTool === 'measure_distance' || activeTool === 'unit_measure') {
      const p1: PointObject = { id: `pt-${Date.now()}`, type: 'point', label: 'A', showLabel: true, x: worldPos.x - 3, y: worldPos.y, color: '#059669', visible: true, isIndependent: true, createdAt: Date.now() };
      const p2: PointObject = { id: `pt-${Date.now() + 1}`, type: 'point', label: 'B', showLabel: true, x: worldPos.x + 3, y: worldPos.y, color: '#059669', visible: true, isIndependent: true, createdAt: Date.now() + 1 };
      const seg: SegmentObject = {
        id: `seg-${Date.now() + 2}`,
        type: 'segment',
        label: 'Ölçüm Çizgisi (6 br)',
        showLabel: true,
        startPointId: p1.id,
        endPointId: p2.id,
        color: '#059669',
        visible: true,
        showLength: true,
        thickness: 3,
        createdAt: Date.now() + 2,
      };
      setObjects((prev) => {
        const next = [...prev, p1, p2, seg];
        pushHistory(next, 'Ölçüm çizgisi eklendi');
        return next;
      });
      return;
    }

    // 9. GÖNYE / AÇIÖLÇER
    if (activeTool === 'setsquare' || activeTool === 'measure_angle') {
      const p1: PointObject = { id: `pt-${Date.now()}`, type: 'point', label: 'A', showLabel: true, x: worldPos.x + 4, y: worldPos.y, color: '#d97706', visible: true, isIndependent: true, createdAt: Date.now() };
      const pVertex: PointObject = { id: `pt-${Date.now() + 1}`, type: 'point', label: 'B', showLabel: true, x: worldPos.x, y: worldPos.y, color: '#d97706', visible: true, isIndependent: true, createdAt: Date.now() + 1 };
      const p3: PointObject = { id: `pt-${Date.now() + 2}`, type: 'point', label: 'C', showLabel: true, x: worldPos.x, y: worldPos.y + 4, color: '#d97706', visible: true, isIndependent: true, createdAt: Date.now() + 2 };

      const ang: AngleObject = {
        id: `ang-${Date.now() + 3}`,
        type: 'angle',
        label: '90° Dik Açı (Gönye)',
        showLabel: true,
        point1Id: p1.id,
        vertexPointId: pVertex.id,
        point3Id: p3.id,
        color: '#d97706',
        visible: true,
        showValue: true,
        createdAt: Date.now() + 3,
      };
      setObjects((prev) => {
        const next = [...prev, p1, pVertex, p3, ang];
        pushHistory(next, '90° Dik Açı eklendi');
        return next;
      });
      return;
    }

    // 10. DÖNDÜRME (ROTATE)
    if (activeTool === 'rotate') {
      const targetPoly = (objects.find((o) => o.id === selectedObjectId && o.type === 'polygon') ||
        objects.find((o) => o.type === 'polygon')) as PolygonObject | undefined;

      if (targetPoly) {
        const polyPoints = objects.filter((o) => o.type === 'point' && targetPoly.pointIds.includes(o.id)) as PointObject[];
        if (polyPoints.length > 0) {
          const cx = polyPoints.reduce((s, p) => s + p.x, 0) / polyPoints.length;
          const cy = polyPoints.reduce((s, p) => s + p.y, 0) / polyPoints.length;
          const rad = Math.PI / 4; // 45 derece
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);

          setObjects((prev) => {
            const next = prev.map((o) => {
              if (o.type === 'point' && targetPoly.pointIds.includes(o.id)) {
                const pt = o as PointObject;
                const dx = pt.x - cx;
                const dy = pt.y - cy;
                const nx = Number((cx + dx * cos - dy * sin).toFixed(2));
                const ny = Number((cy + dx * sin + dy * cos).toFixed(2));
                return { ...pt, x: nx, y: ny };
              }
              return o;
            });
            pushHistory(next, 'Şekil 45° döndürüldü');
            return next;
          });
        }
      }
      return;
    }

    // 11. YANSITMA / SİMETRİ (REFLECT / SYMMETRY)
    if (activeTool === 'reflect' || activeTool === 'symmetry') {
      const targetPoly = (objects.find((o) => o.id === selectedObjectId && o.type === 'polygon') ||
        objects.find((o) => o.type === 'polygon')) as PolygonObject | undefined;

      if (targetPoly) {
        const polyPoints = objects.filter((o) => o.type === 'point' && targetPoly.pointIds.includes(o.id)) as PointObject[];
        if (polyPoints.length > 0) {
          const newPts: PointObject[] = [];
          const newIds: string[] = [];

          polyPoints.forEach((p, idx) => {
            const symId = `pt-${Date.now() + idx}`;
            newIds.push(symId);
            newPts.push({
              id: symId,
              type: 'point',
              label: `${p.label}'`,
              showLabel: true,
              x: -p.x,
              y: p.y,
              color: '#9333ea',
              visible: true,
              isIndependent: true,
              createdAt: Date.now() + idx,
            });
          });

          const symPoly: PolygonObject = {
            id: `poly-${Date.now() + 10}`,
            type: 'polygon',
            label: `${targetPoly.label} Yansıması`,
            showLabel: true,
            pointIds: newIds,
            color: '#9333ea',
            fillColor: '#9333ea',
            fillOpacity: 0.18,
            visible: true,
            showArea: true,
            showPerimeter: true,
            createdAt: Date.now() + 10,
          };

          setObjects((prev) => {
            const next = [...prev, ...newPts, symPoly];
            pushHistory(next, 'Şekil yansıtıldı (Simetri)');
            return next;
          });
        }
      }
      return;
    }

    // 12. DOĞRU, IŞIN, ÇEMBER, AÇI, ÇOKGEN
    if (['segment', 'line', 'ray', 'circle', 'angle', 'polygon'].includes(activeTool)) {
      const existingPoints = objects.filter((o) => o.type === 'point') as PointObject[];
      const label = generateNextPointLabel(existingPoints.map((p) => p.label));

      const newPoint: PointObject = {
        id: `pt-${Date.now()}`,
        type: 'point',
        label,
        showLabel: true,
        x: worldPos.x,
        y: worldPos.y,
        color: '#2563eb',
        visible: true,
        isIndependent: true,
        createdAt: Date.now(),
      };

      setObjects((prev) => [...prev, newPoint]);
      handlePointClick(newPoint.id);
      return;
    }

    if (activeTool === 'select') {
      setSelectedObjectId(null);
    }
  };

  // Bekleyen işlemi iptal etme (Esc veya araç değişimi)
  const cancelPendingAction = () => {
    setPendingPointIds([]);
  };

  // Geri Al
  const undo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setObjects(history[nextIndex].objects);
      setSelectedObjectId(null);
      setPendingPointIds([]);
    }
  };

  // Yinele
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setObjects(history[nextIndex].objects);
      setSelectedObjectId(null);
      setPendingPointIds([]);
    }
  };

  // Etkinliği Yeniden Başlat
  const restartCurrentActivity = () => {
    if (selectedActivity) {
      const initial = JSON.parse(JSON.stringify(selectedActivity.initialObjects)) as MathObject[];
      setObjects(initial);
      setSelectedObjectId(null);
      setPendingPointIds([]);
      setActivityCompleted(false);
      setActiveSuccessMessage(null);
      pushHistory(initial, 'Etkinlik sıfırlandı');
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        objects,
        selectedObjectId,
        activeTool,
        viewport,
        pendingPointIds,
        history,
        historyIndex,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        activityCompleted,
        activeSuccessMessage,
        studioDimension,
        setStudioDimension,
        setActiveTool: (tool) => {
          setActiveTool(tool);
          cancelPendingAction();
        },
        setSelectedObjectId,
        setViewport,
        addObject,
        updateObject,
        deleteObject,
        clearWorkspace,
        resetViewport,
        handlePointClick,
        handleCanvasClick,
        handlePointDrag,
        handleSliderChange,
        addFunction,
        addSlider,
        undo,
        redo,
        cancelPendingAction,
        restartCurrentActivity,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace, WorkspaceProvider içinde kullanılmalıdır.');
  }
  return context;
}
