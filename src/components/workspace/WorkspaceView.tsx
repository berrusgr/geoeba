'use client';

import React, { useState } from 'react';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { ActivityPanel } from './ActivityPanel';
import { FunctionDialog } from './FunctionDialog';
import { SliderDialog } from './SliderDialog';
import { AddObjectModal } from './AddObjectModal';

// 3D Bileşenleri
import { Toolbar3D } from './Toolbar3D';
import { Canvas3D } from './Canvas3D';
import { Properties3D } from './Properties3D';
import { Solid3DObject, Solid3DType, Tool3DMode, Camera3D, Point3D } from '@/types/workspace3d';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';

const INITIAL_SOLIDS: Solid3DObject[] = [];

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

import { useWorkspace } from '@/state/WorkspaceContext';

export function WorkspaceView() {
  // 2D & 3D Stüdyo Boyut Modu (Global Workspace State)
  const { studioDimension, setStudioDimension } = useWorkspace();

  // 2D & 3D Dialog ve Panel Durumları
  const [isFunctionDialogOpen, setIsFunctionDialogOpen] = useState(false);
  const [isSliderDialogOpen, setIsSliderDialogOpen] = useState(false);
  const [isAddObjectDialogOpen, setIsAddObjectDialogOpen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showProperties, setShowProperties] = useState(true);

  // 3D Stüdyo Durumları
  const [solids, setSolids] = useState<Solid3DObject[]>(INITIAL_SOLIDS);
  const [selectedSolidId, setSelectedSolidId] = useState<string | null>(null);
  const [active3DTool, setActive3DTool] = useState<Tool3DMode>('select_move');
  const [camera3D, setCamera3D] = useState<Camera3D>(DEFAULT_CAMERA_3D);
  const [showGlobalVertices, setShowGlobalVertices] = useState(true);
  const [showGlobalEdges, setShowGlobalEdges] = useState(true);
  const [showGlobalFaces, setShowGlobalFaces] = useState(true);

  // 3D Eylemler
  const handleAddSolid = (
    type: Solid3DType,
    customDimensions?: { width: number; height: number; depth: number; radius?: number },
    customPos?: Point3D
  ) => {
    const count = solids.filter((s) => s.type === type).length + 1;
    const names: Record<Solid3DType, string> = {
      cube: `Küp ${count}`,
      sphere: `Küre ${count}`,
      cylinder: `Silindir ${count}`,
      prism: `Prizma ${count}`,
      triangular_prism: `Üçgen Prizma ${count}`,
      cone: `Koni ${count}`,
      pyramid: `Kare Piramit ${count}`,
    };

    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    const randomColor = colors[solids.length % colors.length];

    // Yeni cismi biraz yana kaydır
    const offset = solids.length * 3.5;
    const defaultDim = { width: 3, height: 3, depth: 3, radius: 1.5 };

    const newSolid: Solid3DObject = {
      id: `solid-${type}-${Date.now()}`,
      type,
      name: names[type],
      position: customPos || { x: offset > 10 ? 0 : offset, y: 0, z: 0 },
      dimensions: customDimensions || defaultDim,
      rotation: { x: 0, y: 0, z: 0 },
      color: randomColor,
      opacity: 0.85,
      showWireframe: true,
      showVertices: true,
      showFaces: true,
      unfoldProgress: 0,
      selectedFaceIndex: null,
    };

    setSolids((prev) => [...prev, newSolid]);
    setSelectedSolidId(newSolid.id);
  };

  const handleUpdateSolid = (updates: Partial<Solid3DObject>) => {
    if (!selectedSolidId) return;
    setSolids((prev) =>
      prev.map((s) => (s.id === selectedSolidId ? { ...s, ...updates } : s))
    );
  };

  const handleDeleteSolid = () => {
    if (!selectedSolidId) return;
    setSolids((prev) => prev.filter((s) => s.id !== selectedSolidId));
    setSelectedSolidId(null);
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

  const handleSetCameraPreset = (
    preset: 'isometric' | 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left' | 'side'
  ) => {
    switch (preset) {
      case 'isometric':
        setCamera3D((prev) => ({ ...prev, rotX: 25, rotY: -40, panX: 0, panY: 30, zoom: 55 }));
        break;
      case 'front':
        setCamera3D((prev) => ({ ...prev, rotX: 0, rotY: 0, panX: 0, panY: 30, zoom: 55 }));
        break;
      case 'back':
        setCamera3D((prev) => ({ ...prev, rotX: 0, rotY: 180, panX: 0, panY: 30, zoom: 55 }));
        break;
      case 'top':
        setCamera3D((prev) => ({ ...prev, rotX: 85, rotY: 0, panX: 0, panY: 0, zoom: 55 }));
        break;
      case 'bottom':
        setCamera3D((prev) => ({ ...prev, rotX: -85, rotY: 0, panX: 0, panY: 0, zoom: 55 }));
        break;
      case 'right':
      case 'side':
        setCamera3D((prev) => ({ ...prev, rotX: 0, rotY: -90, panX: 0, panY: 30, zoom: 55 }));
        break;
      case 'left':
        setCamera3D((prev) => ({ ...prev, rotX: 0, rotY: 90, panX: 0, panY: 30, zoom: 55 }));
        break;
    }
  };

  const selectedSolid = solids.find((s) => s.id === selectedSolidId) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background text-foreground overflow-hidden">
      {/* 2D veya 3D Etkinlik / Müfredat Bilgi Başlığı */}
      {studioDimension === '2D' && <ActivityPanel />}

      {/* ANA ÇALIŞMA ALANI */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* SOL ARAÇ ÇUBUĞU (2D veya 3D) */}
        {showToolbar && (
          studioDimension === '2D' ? (
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
              onOpenAddObjectDialog={() => setIsAddObjectDialogOpen(true)}
              onAutoArrange={handleAutoArrange}
              onSetCameraPreset={handleSetCameraPreset}
            />
          )
        )}

        {/* Sol Panel Açma/Kapama Hızlı Butonu */}
        <button
          onClick={() => setShowToolbar(!showToolbar)}
          className="hidden lg:flex absolute left-2 top-3 z-30 p-1.5 rounded-lg bg-card/90 border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
          style={{ left: showToolbar ? (studioDimension === '2D' ? 'calc(16rem + 8px)' : 'calc(18rem + 8px)') : '8px' }}
          title={showToolbar ? 'Araç Çubuğunu Gizle' : 'Araç Çubuğunu Göster'}
        >
          {showToolbar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
        </button>

        {/* ORTA TUVAL (2D SVG veya 3D Katı Cisim & Uzay) */}
        {studioDimension === '2D' ? (
          <Canvas onSwitchTo3D={() => setStudioDimension('3D')} />
        ) : (
          <Canvas3D
            solids={solids}
            selectedSolidId={selectedSolidId}
            activeTool={active3DTool}
            camera={camera3D}
            showGlobalVertices={showGlobalVertices}
            showGlobalEdges={showGlobalEdges}
            showGlobalFaces={showGlobalFaces}
            setCamera={setCamera3D}
            onSelectSolid={setSelectedSolidId}
            onAddSolid={handleAddSolid}
            onDeleteSolid={(id) => {
              if (id) {
                setSolids((prev) => prev.filter((s) => s.id !== id));
                if (selectedSolidId === id) setSelectedSolidId(null);
              } else {
                handleDeleteSolid();
              }
            }}
            setActive3DTool={setActive3DTool}
            onUpdateSolidPosition={(id, newPos) => {
              setSolids((prev) =>
                prev.map((s) => (s.id === id ? { ...s, position: newPos } : s))
              );
            }}
            onSwitchTo2D={() => setStudioDimension('2D')}
          />
        )}

        {/* Sağ Panel Açma/Kapama Hızlı Butonu */}
        <button
          onClick={() => setShowProperties(!showProperties)}
          className="hidden lg:flex absolute right-2 top-3 z-30 p-1.5 rounded-lg bg-card/90 border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
          style={{ right: showProperties ? (studioDimension === '2D' ? 'calc(18rem + 8px)' : 'calc(20rem + 8px)') : '8px' }}
          title={showProperties ? 'Özellikler Panelini Gizle' : 'Özellikler Panelini Göster'}
        >
          {showProperties ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
        </button>

        {/* SAĞ ÖZELLİKLER PANELİ (2D veya 3D) */}
        {showProperties && (
          studioDimension === '2D' ? (
            <PropertiesPanel />
          ) : (
            <Properties3D
              selectedSolid={selectedSolid}
              onUpdateSolid={handleUpdateSolid}
              onDeleteSolid={handleDeleteSolid}
            />
          )
        )}
      </div>

      {/* 2D & 3D Modalları */}
      <AddObjectModal
        isOpen={isAddObjectDialogOpen}
        onClose={() => setIsAddObjectDialogOpen(false)}
        is3D={studioDimension === '3D'}
        onAddSolid3D={handleAddSolid}
      />
      <FunctionDialog
        isOpen={isFunctionDialogOpen}
        onClose={() => setIsFunctionDialogOpen(false)}
      />
      <SliderDialog
        isOpen={isSliderDialogOpen}
        onClose={() => setIsSliderDialogOpen(false)}
      />
    </div>
  );
}
