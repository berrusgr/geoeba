'use client';

import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { ActivityPanel } from './ActivityPanel';
import { FunctionDialog } from './FunctionDialog';
import { SliderDialog } from './SliderDialog';
import { RegularPolygonDialog } from './RegularPolygonDialog';
import { CircleRadiusDialog } from './CircleRadiusDialog';
import { ValuePromptDialog } from './ValuePromptDialog';
import { AddObjectModal } from './AddObjectModal';
import { ConfirmClearModal } from './ConfirmClearModal';

// 3D Bileşenleri
import { Toolbar3D } from './Toolbar3D';
import { Canvas3D } from './Canvas3D';
import { Properties3D } from './Properties3D';
import { Solid3DObject, Solid3DType, Tool3DMode, Camera3D, Point3D } from '@/types/workspace3d';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { createId } from '@/state/ids';

const SCENE_STORAGE_KEY = 'matematik_3d_sahne_v1';
const HISTORY_LIMIT = 80;
const COALESCE_MS = 700;

const DEFAULT_CAMERA_3D: Camera3D = {
  rotX: 25,
  rotY: -40,
  zoom: 55,
  panX: 0,
  panY: 30,
  perspective: 700,
  showGrid: true,
  showAxes: true,
  showCoordinates: true,
};

const SOLID_NAMES: Record<Solid3DType, string> = {
  cube: 'Küp',
  sphere: 'Küre',
  cylinder: 'Silindir',
  prism: 'Prizma',
  triangular_prism: 'Üçgen Prizma',
  cone: 'Koni',
  pyramid: 'Kare Piramit',
};

const SOLID_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

/* ------------------------- 3D sahne geçmişi (undo/redo) ------------------------- */

interface SceneState {
  solids: Solid3DObject[];
  past: Solid3DObject[][];
  future: Solid3DObject[][];
  // Zaman penceresiyle birleşen güncellemeler (kaydırıcı, özellik alanı) için
  lastKey: string | null;
  lastTime: number;
  // Süren sürükleme oturumu; boyunca geçmişe YENİ kayıt yazılmaz
  dragKey: string | null;
}

type SceneUpdater = (prev: Solid3DObject[]) => Solid3DObject[];

type SceneAction =
  | { type: 'set'; updater: SceneUpdater; key?: string; now: number }
  | { type: 'drag'; updater: SceneUpdater; key: string }
  | { type: 'dragEnd' }
  | { type: 'dragCancel' }
  | { type: 'restore'; solids: Solid3DObject[] }
  | { type: 'undo' }
  | { type: 'redo' };

function pushPast(past: Solid3DObject[][], snapshot: Solid3DObject[]): Solid3DObject[][] {
  const next = [...past, snapshot];
  if (next.length > HISTORY_LIMIT) next.shift();
  return next;
}

function sceneReducer(state: SceneState, action: SceneAction): SceneState {
  switch (action.type) {
    case 'set': {
      // Güncelleyici, REDUCER'IN kendi güncel durumuna uygulanır. Böylece aynı tick içinde
      // art arda gelen çağrılar (üç cismi hızlıca eklemek gibi) birbirini ezmez.
      const nextSolids = action.updater(state.solids);
      if (nextSolids === state.solids) return state;
      // Kaydırıcı gibi hızlı ardışık güncellemeler tek geçmiş adımında birleşir:
      // değişiklik öncesi durum zaten 'past'a yazıldı, burada yalnızca cisimler tazelenir.
      const coalesce = !!action.key && state.lastKey === action.key && action.now - state.lastTime < COALESCE_MS;
      if (coalesce) {
        return { ...state, solids: nextSolids, lastTime: action.now, dragKey: null };
      }
      return {
        solids: nextSolids,
        past: pushPast(state.past, state.solids),
        future: [],
        lastKey: action.key || null,
        lastTime: action.now,
        dragKey: null,
      };
    }
    case 'drag': {
      // Sürükleme TEK geçmiş adımıdır: başlangıç durumu bir kez 'past'a yazılır, sürükleme
      // boyunca (kaç cisim ve kaç fare karesi olursa olsun) yalnızca 'solids' güncellenir.
      const nextSolids = action.updater(state.solids);
      if (nextSolids === state.solids) return state;
      if (state.dragKey === action.key) {
        return { ...state, solids: nextSolids };
      }
      return {
        solids: nextSolids,
        past: pushPast(state.past, state.solids),
        future: [],
        lastKey: null,
        lastTime: 0,
        dragKey: action.key,
      };
    }
    case 'dragEnd': {
      // Fare bırakıldı: son konum artık geçerli durumdur, sonraki eylem yeni bir adım açar.
      if (state.dragKey === null) return state;
      return { ...state, dragKey: null };
    }
    case 'dragCancel': {
      // Sürükleme Esc ile iptal edildi: 'drag' aksiyonunun geçmişe yazdığı sürükleme öncesi
      // anlık görüntüyü geri yükle ve o kaydı geçmişten kaldır. Böylece iptalden sonra
      // Ctrl+Z hiçbir şey yapmayan boş bir adım harcamaz ve konumlar birebir eski değerine döner.
      if (state.dragKey === null || state.past.length === 0) {
        return state.dragKey === null ? state : { ...state, dragKey: null };
      }
      const restored = state.past[state.past.length - 1];
      return {
        ...state,
        solids: restored,
        past: state.past.slice(0, -1),
        dragKey: null,
      };
    }
    case 'restore': {
      // Kayıtlı sahnenin geri yüklenmesi bir kullanıcı eylemi DEĞİLDİR; geçmişe yazılmaz.
      // (StrictMode'da efekt iki kez çalışsa da past/future boş kalır.)
      return { solids: action.solids, past: [], future: [], lastKey: null, lastTime: 0, dragKey: null };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        solids: previous,
        past: state.past.slice(0, -1),
        future: [state.solids, ...state.future],
        lastKey: null,
        lastTime: 0,
        dragKey: null,
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        solids: next,
        past: [...state.past, state.solids],
        future: state.future.slice(1),
        lastKey: null,
        lastTime: 0,
        dragKey: null,
      };
    }
    default:
      return state;
  }
}

function loadSavedScene(): Solid3DObject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SCENE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.solids)) return [];
    return (parsed.solids as Solid3DObject[]).filter(
      (s) => s && typeof s.id === 'string' && typeof s.type === 'string' && s.position && s.dimensions
    );
  } catch {
    return [];
  }
}

export function WorkspaceView() {
  const {
    objects,
    studioDimension,
    setStudioDimension,
    clearWorkspace,
    isConfirmClearOpen,
    confirmClearTargetDim,
    setIsConfirmClearOpen,
    requestClearAll,
    isRegularPolygonDialogOpen,
    regularPolygonPos,
    setIsRegularPolygonDialogOpen,
    valuePrompt,
    setValuePrompt,
    isCircleRadiusDialogOpen,
    circleRadiusPos,
    setIsCircleRadiusDialogOpen,
  } = useWorkspace();

  // 2D & 3D Dialog ve Panel Durumları
  const [isFunctionDialogOpen, setIsFunctionDialogOpen] = useState(false);
  const [isSliderDialogOpen, setIsSliderDialogOpen] = useState(false);
  const [isAddObjectDialogOpen, setIsAddObjectDialogOpen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showProperties, setShowProperties] = useState(true);

  // 3D Stüdyo Durumları (geçmiş destekli)
  const [scene, dispatch] = useReducer(sceneReducer, null, () => ({
    solids: [] as Solid3DObject[],
    past: [] as Solid3DObject[][],
    future: [] as Solid3DObject[][],
    lastKey: null,
    lastTime: 0,
    dragKey: null,
  }));
  const solids = scene.solids;
  const [sceneLoaded, setSceneLoaded] = useState(false);

  // Kayıtlı sahneyi geri yükle (geçmişe kayıt DÜŞMEZ; açılışta Geri Al sahneyi silmemeli)
  useEffect(() => {
    const saved = loadSavedScene();
    if (saved.length > 0) dispatch({ type: 'restore', solids: saved });
    setSceneLoaded(true);
  }, []);

  // Sahneyi kaydet (kısa gecikmeyle)
  useEffect(() => {
    if (!sceneLoaded) return;
    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify({ version: 1, solids }));
      } catch {
        /* depolama kapalı olabilir */
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [solids, sceneLoaded]);

  // Süren sürükleme oturumunun anahtarı (fare bırakılınca sıfırlanır)
  const dragKeyRef = useRef<string | null>(null);

  const setSolids = useCallback(
    (updater: Solid3DObject[] | SceneUpdater, key?: string) => {
      const fn: SceneUpdater = typeof updater === 'function' ? updater : () => updater;
      // Sürükleme dışı her değişiklik açık kalmış bir sürükleme oturumunu kapatır
      dragKeyRef.current = null;
      dispatch({ type: 'set', updater: fn, key, now: Date.now() });
    },
    []
  );

  // Sürükleme sırasındaki konum güncellemeleri. Canvas3D her fare karesinde SEÇİLİ HER CİSİM
  // için ayrı ayrı çağırır; hepsi aynı oturum anahtarını paylaştığı için sürükleme başına
  // geçmişe yalnızca TEK adım (sürükleme öncesi durum) yazılır.
  const dragSolids = useCallback((updater: SceneUpdater) => {
    if (dragKeyRef.current === null) dragKeyRef.current = createId('drag');
    dispatch({ type: 'drag', updater, key: dragKeyRef.current });
  }, []);

  const handleDragEnd = useCallback(() => {
    dragKeyRef.current = null;
    dispatch({ type: 'dragEnd' });
  }, []);

  // Esc ile iptal edilen sürükleme: konumlar sürükleme öncesine döner, geçmişte iz kalmaz
  const handleDragCancel = useCallback(() => {
    dragKeyRef.current = null;
    dispatch({ type: 'dragCancel' });
  }, []);

  const [selectedSolidIds, setSelectedSolidIds] = useState<string[]>([]);
  const selectedSolidId = selectedSolidIds[0] || null;
  const setSelectedSolidId = (id: string | null) => setSelectedSolidIds(id ? [id] : []);

  const [active3DTool, setActive3DTool] = useState<Tool3DMode>('select_move');
  const [camera3D, setCamera3D] = useState<Camera3D>(DEFAULT_CAMERA_3D);
  const [showGlobalVertices, setShowGlobalVertices] = useState(true);
  const [showGlobalEdges, setShowGlobalEdges] = useState(true);
  const [showGlobalFaces, setShowGlobalFaces] = useState(true);

  // Silinen cisimler seçimden düşsün
  useEffect(() => {
    setSelectedSolidIds((prev) => {
      const filtered = prev.filter((id) => solids.some((s) => s.id === id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [solids]);

  /* ------------------------------ 3D Eylemler ------------------------------ */

  const handleAddSolid = (
    type: Solid3DType,
    customDimensions?: { width?: number; height?: number; depth?: number; radius?: number },
    customPos?: Point3D
  ) => {
    const base = { width: 3, height: 3, depth: 3, radius: 1.5 };
    const dims = customDimensions
      ? {
          width: customDimensions.width ?? (customDimensions.radius ? customDimensions.radius * 2 : base.width),
          height: customDimensions.height ?? base.height,
          depth: customDimensions.depth ?? (customDimensions.radius ? customDimensions.radius * 2 : base.depth),
          radius: customDimensions.radius ?? (customDimensions.width ? customDimensions.width / 2 : base.radius),
        }
      : base;
    if (type === 'cube') {
      dims.height = dims.width;
      dims.depth = dims.width;
      dims.radius = dims.width / 2;
    }

    // Kimlik dışarıda üretilir (seçimi hemen ayarlayabilmek için); ad, renk ve konum
    // güncelleyicinin İÇİNDE hesaplanır, böylece aynı tick'te eklenen cisimler çakışmaz.
    const newId = createId(`solid-${type}`);

    setSolids((prev) => {
      const count = prev.filter((s) => s.type === type).length + 1;
      const color = SOLID_COLORS[prev.length % SOLID_COLORS.length];
      // Yeni cisimleri ızgara düzeninde yerleştir (üst üste binme olmaz)
      const idx = prev.length;
      const autoPos: Point3D = { x: ((idx % 4) - 1.5) * 4.5, y: -Math.floor(idx / 4) * 4.5, z: 0 };

      const newSolid: Solid3DObject = {
        id: newId,
        type,
        name: `${SOLID_NAMES[type]} ${count}`,
        position: customPos || autoPos,
        dimensions: dims,
        rotation: { x: 0, y: 0, z: 0 },
        color,
        opacity: 0.85,
        showWireframe: true,
        showVertices: true,
        showFaces: true,
        unfoldProgress: 0,
        selectedFaceIndex: null,
      };
      return [...prev, newSolid];
    });
    setSelectedSolidIds([newId]);
  };

  const updateSolidById = (id: string, updates: Partial<Solid3DObject>, key?: string) => {
    setSolids((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)), key);
  };

  const handleUpdateSolid = (updates: Partial<Solid3DObject>) => {
    if (!selectedSolidId) return;
    updateSolidById(selectedSolidId, updates, `prop:${selectedSolidId}:${Object.keys(updates).join(',')}`);
  };

  const handleDeleteSolid = () => {
    if (selectedSolidIds.length === 0) return;
    setSolids((prev) => prev.filter((s) => !selectedSolidIds.includes(s.id)));
    setSelectedSolidIds([]);
  };

  // Tek cismin sürükleme sırasındaki (mutlak) konumu
  const handleDragSolidPosition = useCallback(
    (id: string, newPos: Point3D) => {
      dragSolids((prev) => prev.map((s) => (s.id === id ? { ...s, position: newPos } : s)));
    },
    [dragSolids]
  );

  // Çoklu seçimin sürükleme sırasındaki artımlı kayması
  const handleDragSolidsPosition = useCallback(
    (ids: string[], delta: Point3D) => {
      dragSolids((prev) =>
        prev.map((s) =>
          ids.includes(s.id)
            ? {
                ...s,
                position: {
                  // Artımlı toplamada kayan nokta birikmesin diye her adımda 2 ondalığa yuvarla
                  x: Number((s.position.x + delta.x).toFixed(2)),
                  y: Number((s.position.y + delta.y).toFixed(2)),
                  z: Number((s.position.z + delta.z).toFixed(2)),
                },
              }
            : s
        )
      );
    },
    [dragSolids]
  );

  const handleClearAllSolids = () => {
    setSolids([]);
    setSelectedSolidIds([]);
  };

  const handleConfirmClear = () => {
    if (confirmClearTargetDim === '2D') clearWorkspace();
    else handleClearAllSolids();
    setIsConfirmClearOpen(false);
  };

  const handleAutoArrange = () => {
    setSolids((prev) =>
      prev.map((solid, idx) => ({
        ...solid,
        position: { x: (idx - (prev.length - 1) / 2) * 6, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      }))
    );
    setCamera3D((prev) => ({ ...prev, rotX: 25, rotY: -40, panX: 0, panY: 30, zoom: 45 }));
  };

  const handleSetCameraPreset = (preset: 'isometric' | 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left' | 'side') => {
    const presets: Record<typeof preset, Partial<Camera3D>> = {
      isometric: { rotX: 25, rotY: -40, panX: 0, panY: 30, zoom: 55 },
      front: { rotX: 0, rotY: 0, panX: 0, panY: 30, zoom: 55 },
      back: { rotX: 0, rotY: 180, panX: 0, panY: 30, zoom: 55 },
      top: { rotX: 85, rotY: 0, panX: 0, panY: 0, zoom: 55 },
      bottom: { rotX: -85, rotY: 0, panX: 0, panY: 0, zoom: 55 },
      right: { rotX: 0, rotY: -90, panX: 0, panY: 30, zoom: 55 },
      side: { rotX: 0, rotY: -90, panX: 0, panY: 30, zoom: 55 },
      left: { rotX: 0, rotY: 90, panX: 0, panY: 30, zoom: 55 },
    };
    setCamera3D((prev) => ({ ...prev, ...presets[preset] }));
  };

  const undo3D = () => dispatch({ type: 'undo' });
  const redo3D = () => dispatch({ type: 'redo' });

  const selectedSolid = solids.find((s) => s.id === selectedSolidId) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background text-foreground overflow-hidden">
      {studioDimension === '2D' && <ActivityPanel />}

      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* SOL ARAÇ ÇUBUĞU (2D veya 3D) + aç/kapa düğmesi (panel genişliğinden bağımsız konumlanır) */}
        <div className="relative flex shrink-0 h-full min-h-0">
          {showToolbar &&
            (studioDimension === '2D' ? (
              <Toolbar
                onOpenFunctionDialog={() => setIsFunctionDialogOpen(true)}
                onOpenSliderDialog={() => setIsSliderDialogOpen(true)}
              />
            ) : (
              <Toolbar3D
                activeTool={active3DTool}
                setActiveTool={setActive3DTool}
                showEdges={showGlobalEdges}
                showVertices={showGlobalVertices}
                showFaces={showGlobalFaces}
                toggleShowEdges={() => setShowGlobalEdges(!showGlobalEdges)}
                toggleShowVertices={() => setShowGlobalVertices(!showGlobalVertices)}
                toggleShowFaces={() => setShowGlobalFaces(!showGlobalFaces)}
                onAddSolid={handleAddSolid}
                onDeleteSelected={handleDeleteSolid}
                hasSelection={selectedSolidIds.length > 0}
                onOpenAddObjectDialog={() => setIsAddObjectDialogOpen(true)}
                onAutoArrange={handleAutoArrange}
                onSetCameraPreset={handleSetCameraPreset}
                onClearAll={() => requestClearAll('3D')}
              />
            ))}
          <button
            onClick={() => setShowToolbar(!showToolbar)}
            className="hidden lg:flex absolute top-3 z-30 p-1.5 rounded-lg bg-card/90 border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            style={{ left: showToolbar ? 'calc(100% + 8px)' : '8px' }}
            title={showToolbar ? 'Araç Çubuğunu Gizle' : 'Araç Çubuğunu Göster'}
          >
            {showToolbar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* ORTA TUVAL (2D SVG veya 3D three.js) */}
        {studioDimension === '2D' ? (
          <Canvas onSwitchTo3D={() => setStudioDimension('3D')} />
        ) : (
          <Canvas3D
            solids={solids}
            selectedSolidId={selectedSolidId}
            selectedSolidIds={selectedSolidIds}
            activeTool={active3DTool}
            camera={camera3D}
            showGlobalVertices={showGlobalVertices}
            showGlobalEdges={showGlobalEdges}
            showGlobalFaces={showGlobalFaces}
            setCamera={setCamera3D}
            onSelectSolid={setSelectedSolidId}
            onSelectSolids={setSelectedSolidIds}
            onAddSolid={handleAddSolid}
            onDeleteSolid={(id) => {
              if (id) {
                setSolids((prev) => prev.filter((s) => s.id !== id));
                setSelectedSolidIds((prev) => prev.filter((sid) => sid !== id));
              } else {
                handleDeleteSolid();
              }
            }}
            onDeleteSolids={handleDeleteSolid}
            onClearAll={() => requestClearAll('3D')}
            setActive3DTool={setActive3DTool}
            onUpdateSolid={(id, updates) => updateSolidById(id, updates, `prop:${id}:${Object.keys(updates).join(',')}`)}
            onUpdateSolidPosition={handleDragSolidPosition}
            onUpdateSolidsPosition={handleDragSolidsPosition}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            onSwitchTo2D={() => setStudioDimension('2D')}
            onUndo={scene.past.length > 0 ? undo3D : undefined}
            onRedo={scene.future.length > 0 ? redo3D : undefined}
          />
        )}

        {/* SAĞ ÖZELLİKLER PANELİ + aç/kapa düğmesi */}
        <div className="relative flex shrink-0 h-full min-h-0">
          <button
            onClick={() => setShowProperties(!showProperties)}
            className="hidden lg:flex absolute top-3 z-30 p-1.5 rounded-lg bg-card/90 border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            style={{ right: showProperties ? 'calc(100% + 8px)' : '8px' }}
            title={showProperties ? 'Özellikler Panelini Gizle' : 'Özellikler Panelini Göster'}
          >
            {showProperties ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </button>
          {showProperties &&
            (studioDimension === '2D' ? (
              <PropertiesPanel />
            ) : (
              <Properties3D selectedSolid={selectedSolid} onUpdateSolid={handleUpdateSolid} onDeleteSolid={handleDeleteSolid} />
            ))}
        </div>
      </div>

      {/* 2D & 3D Modalları */}
      <AddObjectModal
        isOpen={isAddObjectDialogOpen}
        onClose={() => setIsAddObjectDialogOpen(false)}
        is3D={studioDimension === '3D'}
        onAddSolid3D={handleAddSolid}
      />
      <FunctionDialog isOpen={isFunctionDialogOpen} onClose={() => setIsFunctionDialogOpen(false)} />
      <SliderDialog isOpen={isSliderDialogOpen} onClose={() => setIsSliderDialogOpen(false)} />
      <RegularPolygonDialog
        isOpen={isRegularPolygonDialogOpen}
        onClose={() => setIsRegularPolygonDialogOpen(false)}
        targetPos={regularPolygonPos}
      />
      {/* Araçların sayı/oran sorması için ortak pencere */}
      <ValuePromptDialog request={valuePrompt} onClose={() => setValuePrompt(null)} />

      <CircleRadiusDialog
        isOpen={isCircleRadiusDialogOpen}
        onClose={() => setIsCircleRadiusDialogOpen(false)}
        targetPos={circleRadiusPos}
      />
      <ConfirmClearModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={handleConfirmClear}
        targetDimension={confirmClearTargetDim}
        objectCount={confirmClearTargetDim === '2D' ? objects.length : solids.length}
      />
    </div>
  );
}
