'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Solid3DObject, Solid3DType, Camera3D, Tool3DMode, Point3D } from '@/types/workspace3d';
import { Point2D } from '@/types/math';
import { project3DToScreen, generateSolidMesh } from '@/math/geometry3d';
import {
  RotateCw,
  Hand,
  Focus,
  Plus,
  Minus,
  Grid,
  Maximize2,
  Trash2,
  Box,
  Eye,
  Sparkles,
} from 'lucide-react';
import { ViewCube3D } from './ViewCube3D';

function shadeHexColor(hex: string, factor: number): string {
  if (!hex || !hex.startsWith('#')) return hex || '#3b82f6';
  let cleanHex = hex.slice(1);
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleanHex.slice(0, 2), 16) || 59;
  const g = parseInt(cleanHex.slice(2, 4), 16) || 130;
  const b = parseInt(cleanHex.slice(4, 6), 16) || 246;
  const nr = Math.min(255, Math.max(0, Math.round(r * factor)));
  const ng = Math.min(255, Math.max(0, Math.round(g * factor)));
  const nb = Math.min(255, Math.max(0, Math.round(b * factor)));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

interface Canvas3DProps {
  solids: Solid3DObject[];
  selectedSolidId: string | null;
  selectedSolidIds?: string[];
  activeTool: Tool3DMode;
  camera: Camera3D;
  showGlobalVertices: boolean;
  showGlobalEdges: boolean;
  showGlobalFaces: boolean;
  setCamera: React.Dispatch<React.SetStateAction<Camera3D>>;
  onSelectSolid: (id: string | null) => void;
  onSelectSolids?: (ids: string[]) => void;
  onAddSolid?: (type: Solid3DType, customDim?: { width: number; height: number; depth: number; radius?: number }, customPos?: Point3D) => void;
  onDeleteSolid?: (id?: string) => void;
  onDeleteSolids?: () => void;
  onClearAll?: () => void;
  setActive3DTool?: (tool: Tool3DMode) => void;
  onUpdateSolid?: (id: string, updates: Partial<Solid3DObject>) => void;
  onUpdateSolidPosition: (id: string, newPos: Point3D) => void;
  onUpdateSolidsPosition?: (ids: string[], delta: Point3D) => void;
  onSwitchTo2D: () => void;
}

export function Canvas3D({
  solids,
  selectedSolidId,
  selectedSolidIds,
  activeTool,
  camera,
  showGlobalVertices,
  showGlobalEdges,
  showGlobalFaces,
  setCamera,
  onSelectSolid,
  onSelectSolids,
  onAddSolid,
  onDeleteSolid,
  onDeleteSolids,
  onClearAll,
  setActive3DTool,
  onUpdateSolid,
  onUpdateSolidPosition,
  onUpdateSolidsPosition,
  onSwitchTo2D,
}: Canvas3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectiveSelectedIds = selectedSolidIds || (selectedSolidId ? [selectedSolidId] : []);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 700,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 3D Sürükleyerek Cisim Boyutlandırma Durumu
  const [isCreatingSolid, setIsCreatingSolid] = useState(false);
  const [dragSolidStart, setDragSolidStart] = useState<{ x: number; y: number } | null>(null);
  const [dragSolidCurrent, setDragSolidCurrent] = useState<{ x: number; y: number } | null>(null);

  // 3D Kutuyla Çoklu Seçim (Marquee) Durumu
  const [selectionMarquee, setSelectionMarquee] = useState<{ start: Point2D; current: Point2D } | null>(null);

  // 3D Cisim Sürükleme (Drag & Move) Durumu
  const [draggingSolidId, setDraggingSolidId] = useState<string | null>(null);
  const dragSolidRef = useRef<{
    solidIds: string[];
    axis: 'x' | 'y' | 'z' | 'free';
    startClientX: number;
    startClientY: number;
    startPositions: Record<string, Point3D>;
  } | null>(null);

  const isCreationMode = activeTool.startsWith('create_');

  // Katı Cisme veya X/Y/Z Taşıma Oklarına Basıldığında Sürüklemeyi Başlat ya da Sil
  const handleSolidMouseDown = (
    solidId: string,
    e: React.MouseEvent,
    axis: 'x' | 'y' | 'z' | 'free' = 'free'
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    // Silme Modu Aktifse Tıklanan Cismi Doğrudan Sil
    if (activeTool === 'delete') {
      if (onDeleteSolid) onDeleteSolid(solidId);
      return;
    }

    // Orbit veya Pan araçlarında cisim üzerinden kamera döndürmeye izin ver
    if (activeTool === 'orbit' || activeTool === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const isAlreadySelected = effectiveSelectedIds.includes(solidId);
    let targetIds: string[];

    if (e.shiftKey || e.ctrlKey) {
      targetIds = isAlreadySelected
        ? effectiveSelectedIds.filter((id) => id !== solidId)
        : [...effectiveSelectedIds, solidId];
    } else if (isAlreadySelected) {
      targetIds = effectiveSelectedIds;
    } else {
      targetIds = [solidId];
    }

    if (onSelectSolids) {
      onSelectSolids(targetIds);
    } else {
      onSelectSolid(targetIds[0] || null);
    }

    const startPositions: Record<string, Point3D> = {};
    solids.forEach((s) => {
      if (targetIds.includes(s.id)) {
        startPositions[s.id] = { ...s.position };
      }
    });

    dragSolidRef.current = {
      solidIds: targetIds,
      axis,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPositions,
    };
    setDraggingSolidId(solidId);
  };

  // Ekran Boyutlarını İzle
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Klavye Kısayolu (Delete / Backspace ile 3D cisimleri silme)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && effectiveSelectedIds.length > 0) {
        e.preventDefault();
        if (onDeleteSolids) {
          onDeleteSolids();
        } else if (onDeleteSolid && selectedSolidId) {
          onDeleteSolid(selectedSolidId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveSelectedIds, onDeleteSolids, onDeleteSolid, selectedSolidId]);

  // Fare Olayları (3D Orbit, Pan, Kutuyla Çoklu Seçim & Drag to Create Solid)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const screenX = e.clientX - (rect?.left || 0);
    const screenY = e.clientY - (rect?.top || 0);

    if (isCreationMode) {
      setIsCreatingSolid(true);
      setDragSolidStart({ x: e.clientX, y: e.clientY });
      setDragSolidCurrent({ x: e.clientX, y: e.clientY });
      return;
    }

    // Seç ve Taşı modundayken boşluğa basıldığında: Kutuyla Çoklu Seçim Başlat
    if (activeTool === 'select_move' && e.button === 0) {
      if (!e.shiftKey && !e.ctrlKey) {
        if (onSelectSolids) onSelectSolids([]);
        else onSelectSolid(null);
      }
      setSelectionMarquee({
        start: { x: screenX, y: screenY },
        current: { x: screenX, y: screenY },
      });
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // 1. Kutuyla Çoklu Seçim (Marquee)
      if (selectionMarquee) {
        const rect = containerRef.current?.getBoundingClientRect();
        const screenX = e.clientX - (rect?.left || 0);
        const screenY = e.clientY - (rect?.top || 0);

        setSelectionMarquee((prev) => (prev ? { ...prev, current: { x: screenX, y: screenY } } : null));

        const minX = Math.min(selectionMarquee.start.x, screenX);
        const maxX = Math.max(selectionMarquee.start.x, screenX);
        const minY = Math.min(selectionMarquee.start.y, screenY);
        const maxY = Math.max(selectionMarquee.start.y, screenY);

        if (Math.hypot(maxX - minX, maxY - minY) > 8) {
          const enclosedIds = solids
            .filter((s) => {
              const sPos = project3DToScreen(s.position, camera, dimensions.width, dimensions.height);
              return sPos.x >= minX && sPos.x <= maxX && sPos.y >= minY && sPos.y <= maxY;
            })
            .map((s) => s.id);

          if (onSelectSolids) {
            onSelectSolids(enclosedIds);
          } else {
            onSelectSolid(enclosedIds[0] || null);
          }
        }
        return;
      }

      // 2. Cisim Sürükleme (X, Y, Z Eksen Okları veya Serbest Taşıma - Çoklu Seçim Destekli)
      if (dragSolidRef.current) {
        const dx = e.clientX - dragSolidRef.current.startClientX;
        const dy = e.clientY - dragSolidRef.current.startClientY;
        const axis = dragSolidRef.current.axis;
        const solidIds = dragSolidRef.current.solidIds;
        const firstId = solidIds[0];
        const initialPos = firstId ? dragSolidRef.current.startPositions[firstId] : { x: 0, y: 0, z: 0 };

        let deltaX = 0;
        let deltaY = 0;
        let deltaZ = 0;

        const center3D = { ...initialPos };
        const centerScreen = project3DToScreen(center3D, camera, dimensions.width, dimensions.height);

        if (axis === 'x') {
          const tip3D = { x: initialPos.x + 2.5, y: initialPos.y, z: initialPos.z };
          const tipScreen = project3DToScreen(tip3D, camera, dimensions.width, dimensions.height);
          const vx = tipScreen.x - centerScreen.x;
          const vy = tipScreen.y - centerScreen.y;
          const lenSq = Math.max(1, vx * vx + vy * vy);
          const t = (dx * vx + dy * vy) / lenSq;
          deltaX = t * 2.5;
        } else if (axis === 'y') {
          const tip3D = { x: initialPos.x, y: initialPos.y + 2.5, z: initialPos.z };
          const tipScreen = project3DToScreen(tip3D, camera, dimensions.width, dimensions.height);
          const vx = tipScreen.x - centerScreen.x;
          const vy = tipScreen.y - centerScreen.y;
          const lenSq = Math.max(1, vx * vx + vy * vy);
          const t = (dx * vx + dy * vy) / lenSq;
          deltaY = t * 2.5;
        } else if (axis === 'z') {
          const tip3D = { x: initialPos.x, y: initialPos.y, z: initialPos.z + 2.5 };
          const tipScreen = project3DToScreen(tip3D, camera, dimensions.width, dimensions.height);
          const vx = tipScreen.x - centerScreen.x;
          const vy = tipScreen.y - centerScreen.y;
          const lenSq = Math.max(1, vx * vx + vy * vy);
          const t = (dx * vx + dy * vy) / lenSq;
          deltaZ = t * 2.5;
        } else {
          const radYaw = (camera.rotY * Math.PI) / 180;
          const radPitch = (camera.rotX * Math.PI) / 180;
          const scale = Math.max(15, camera.zoom);

          const u = dx / scale;
          const v = -dy / scale;

          if (e.shiftKey) {
            deltaZ = v * 1.5;
          } else {
            const sinPitch = Math.sin(radPitch);
            const pitchFactor = Math.abs(sinPitch) > 0.15 ? 1 / Math.sin(radPitch) : 2.5;
            deltaX = u * Math.cos(radYaw) + (v * pitchFactor) * Math.sin(radYaw);
            deltaY = -u * Math.sin(radYaw) + (v * pitchFactor) * Math.cos(radYaw);
          }
        }

        // Tüm seçili 3D cisimleri birlikte kaydır
        solidIds.forEach((sId) => {
          const orig = dragSolidRef.current?.startPositions[sId];
          if (orig) {
            const newPos: Point3D = {
              x: Number((orig.x + deltaX).toFixed(2)),
              y: Number((orig.y + deltaY).toFixed(2)),
              z: Number((orig.z + deltaZ).toFixed(2)),
            };
            onUpdateSolidPosition(sId, newPos);
          }
        });
        return;
      }

      // 3. Yeni Cisim Boyutlandırma
      if (isCreatingSolid) {
        setDragSolidCurrent({ x: e.clientX, y: e.clientY });
        return;
      }

      // 4. Kamera Döndürme / Kaydırma
      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setDragStart({ x: e.clientX, y: e.clientY });

      if (activeTool === 'pan' || e.buttons === 2 || e.buttons === 4) {
        setCamera((prev) => ({
          ...prev,
          panX: prev.panX + dx,
          panY: prev.panY + dy,
        }));
      } else {
        setCamera((prev) => ({
          ...prev,
          rotY: (prev.rotY - dx * 0.45) % 360,
          rotX: Math.max(-85, Math.min(85, prev.rotX - dy * 0.45)),
        }));
      }
    },
    [
      isDragging,
      isCreatingSolid,
      selectionMarquee,
      dragStart,
      activeTool,
      camera,
      dimensions,
      solids,
      onSelectSolids,
      onSelectSolid,
      onUpdateSolidPosition,
      setCamera,
    ]
  );

  const handleMouseUp = () => {
    if (selectionMarquee) {
      setSelectionMarquee(null);
    }

    if (dragSolidRef.current) {
      dragSolidRef.current = null;
      setDraggingSolidId(null);
    }

    if (isCreatingSolid && dragSolidStart && dragSolidCurrent && onAddSolid) {
      const distPx = Math.hypot(dragSolidCurrent.x - dragSolidStart.x, dragSolidCurrent.y - dragSolidStart.y);
      const computedSize = Number(Math.max(2, Math.min(8, distPx / 20)).toFixed(1));

      const typeMap: Record<string, Solid3DType> = {
        create_cube: 'cube',
        create_sphere: 'sphere',
        create_cylinder: 'cylinder',
        create_prism: 'prism',
        create_cone: 'cone',
        create_pyramid: 'pyramid',
      };

      const solidType = typeMap[activeTool] || 'cube';
      onAddSolid(solidType, {
        width: computedSize,
        height: computedSize,
        depth: computedSize,
        radius: computedSize / 2,
      });

      if (setActive3DTool) {
        setActive3DTool('select_move');
      }

      setIsCreatingSolid(false);
      setDragSolidStart(null);
      setDragSolidCurrent(null);
      return;
    }

    setIsDragging(false);
  };

  // Fare Tekerleği ile Zoom (Passive: false ile tarayıcı hatasını önleme)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setCamera((prev) => ({
        ...prev,
        zoom: Math.max(15, Math.min(120, prev.zoom * factor)),
      }));
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, [setCamera]);

  // 1. Zemin Izgarası Noktaları (Z = 0, Tüm Ekranı Kaplayan 3D Zemin)
  const gridLines = useMemo(() => {
    const lines: { p1: { x: number; y: number }; p2: { x: number; y: number }; isAxis?: boolean; isMajor?: boolean }[] = [];
    const size = 24;

    for (let i = -size; i <= size; i++) {
      const p1 = project3DToScreen({ x: i, y: -size, z: 0 }, camera, dimensions.width, dimensions.height);
      const p2 = project3DToScreen({ x: i, y: size, z: 0 }, camera, dimensions.width, dimensions.height);
      lines.push({ p1, p2, isAxis: i === 0, isMajor: i % 5 === 0 });

      const p3 = project3DToScreen({ x: -size, y: i, z: 0 }, camera, dimensions.width, dimensions.height);
      const p4 = project3DToScreen({ x: size, y: i, z: 0 }, camera, dimensions.width, dimensions.height);
      lines.push({ p1: p3, p2: p4, isAxis: i === 0, isMajor: i % 5 === 0 });
    }
    return lines;
  }, [camera, dimensions]);

  // 2. 3D Eksenler (Kırmızı X, Yeşil Y, Mavi Z)
  const axesData = useMemo(() => {
    const origin = project3DToScreen({ x: 0, y: 0, z: 0 }, camera, dimensions.width, dimensions.height);
    const xPosEnd = project3DToScreen({ x: 16, y: 0, z: 0 }, camera, dimensions.width, dimensions.height);
    const xNegEnd = project3DToScreen({ x: -16, y: 0, z: 0 }, camera, dimensions.width, dimensions.height);

    const yPosEnd = project3DToScreen({ x: 0, y: 16, z: 0 }, camera, dimensions.width, dimensions.height);
    const yNegEnd = project3DToScreen({ x: 0, y: -16, z: 0 }, camera, dimensions.width, dimensions.height);

    const zPosEnd = project3DToScreen({ x: 0, y: 0, z: 14 }, camera, dimensions.width, dimensions.height);
    const zNegEnd = project3DToScreen({ x: 0, y: 0, z: -6 }, camera, dimensions.width, dimensions.height);

    const xTicks = [];
    for (let i = -14; i <= 14; i++) {
      if (i === 0) continue;
      const pt = project3DToScreen({ x: i, y: 0, z: 0 }, camera, dimensions.width, dimensions.height);
      xTicks.push({ val: i, pt });
    }

    const yTicks = [];
    for (let i = -14; i <= 14; i++) {
      if (i === 0) continue;
      const pt = project3DToScreen({ x: 0, y: i, z: 0 }, camera, dimensions.width, dimensions.height);
      yTicks.push({ val: i, pt });
    }

    const zTicks = [];
    for (let i = -4; i <= 13; i++) {
      if (i === 0) continue;
      const pt = project3DToScreen({ x: 0, y: 0, z: i }, camera, dimensions.width, dimensions.height);
      zTicks.push({ val: i, pt });
    }

    return { origin, xPosEnd, xNegEnd, yPosEnd, yNegEnd, zPosEnd, zNegEnd, xTicks, yTicks, zTicks };
  }, [camera, dimensions]);

  // 3. 3D Katı Cisimlerin Render Listesi (Painter's Algorithm: Derinliğe göre sıralama)
  const renderedSolids = useMemo(() => {
    const renderList: {
      solidId: string;
      solidName: string;
      faceIdx: number;
      pointsD: string;
      fillColor: string;
      strokeColor: string;
      avgDepth: number;
      label?: string;
      centerScreen: { x: number; y: number };
      verticesScreen: { x: number; y: number; id: number }[];
      edgesScreen: { p1: { x: number; y: number }; p2: { x: number; y: number } }[];
    }[] = [];

    // Işık kaynağı vektörü (Sağ-Üst-Ön)
    const lightDir = { x: 0.577, y: 0.577, z: 0.577 };

    solids.forEach((solid) => {
      const mesh = generateSolidMesh(solid);
      const projVertices = mesh.vertices.map((v) =>
        project3DToScreen(v, camera, dimensions.width, dimensions.height)
      );

      const isSelected = selectedSolidId === solid.id;

      // Yüzleri hazırla
      mesh.faces.forEach((face, fIdx) => {
        let avgZ = 0;
        let sumX = 0;
        let sumY = 0;
        let pathD = '';

        face.vertexIndices.forEach((vIdx, i) => {
          const p = projVertices[vIdx];
          if (p) {
            avgZ += p.zDepth;
            sumX += p.x;
            sumY += p.y;
            pathD += (i === 0 ? 'M ' : 'L ') + `${p.x} ${p.y} `;
          }
        });
        pathD += 'Z';
        avgZ /= face.vertexIndices.length;
        const centerScreen = {
          x: sumX / face.vertexIndices.length,
          y: sumY / face.vertexIndices.length,
        };

        // Işıklandırma faktörü (Lambertian diffuse)
        const dot = Math.max(0.2, Math.min(1, face.normal.x * lightDir.x + face.normal.y * lightDir.y + face.normal.z * lightDir.z));
        const baseColor = solid.color || '#3b82f6';

        const isCurved = solid.type === 'cylinder' || solid.type === 'cone' || solid.type === 'sphere';
        const isCircleCap = face.label === 'Alt Daire' || face.label === 'Üst Daire' || face.label === 'Daire Taban';

        let faceFill = baseColor;
        let faceStroke = isSelected ? '#ec4899' : '#1e293b';

        if (isCurved) {
          if (isCircleCap) {
            faceFill = shadeHexColor(baseColor, 0.8 + dot * 0.35);
            faceStroke = isSelected ? '#38bdf8' : shadeHexColor(baseColor, 0.65);
          } else {
            faceFill = shadeHexColor(baseColor, 0.55 + dot * 0.55);
            faceStroke = isSelected ? '#38bdf8' : 'none';
          }
        } else {
          // Çokgen prizmalar ve piramitler için belirgin kenar çizgili ve açılı yüzeyli görünüm
          faceFill = shadeHexColor(baseColor, 0.7 + dot * 0.4);
          faceStroke = isSelected ? '#38bdf8' : '#1e293b';
        }

        // Ayrıtlar
        const edgesScreen = mesh.edges.map((e) => ({
          p1: { x: projVertices[e.startIdx].x, y: projVertices[e.startIdx].y },
          p2: { x: projVertices[e.endIdx].x, y: projVertices[e.endIdx].y },
        }));

        // Köşeler
        const verticesScreen = projVertices.map((pv, idx) => ({
          x: pv.x,
          y: pv.y,
          id: idx,
        }));

        renderList.push({
          solidId: solid.id,
          solidName: solid.name,
          faceIdx: fIdx,
          pointsD: pathD,
          fillColor: faceFill,
          strokeColor: faceStroke,
          avgDepth: avgZ,
          label: face.label,
          centerScreen,
          verticesScreen,
          edgesScreen,
        });
      });
    });

    // En uzaktaki yüzey önce çizilir (Z-sort)
    return renderList.sort((a, b) => b.avgDepth - a.avgDepth);
  }, [solids, camera, dimensions, selectedSolidId]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      className="flex-1 w-full h-full min-h-0 relative select-none overflow-hidden bg-background cursor-grab active:cursor-grabbing"
    >
      {/* 1. ÜST KONTROL ŞERİDİ & 2D / 3D GEÇİŞ BUTONLARI (Referans Görsel Düzeni) */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Sol Dropdown Kontrolleri */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-3 py-1.5 rounded-2xl bg-card/90 backdrop-blur-md border border-border shadow-sm text-xs font-black text-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span>3D Katı Cisim &amp; Uzay</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-card/90 backdrop-blur-md border border-border shadow-sm text-xs font-bold text-muted-foreground">
            <span>3D Koordinat Sistemi (x, y, z)</span>
          </div>
        </div>

        {/* Sağ: 2D ve 3D DÜZLEM GEÇİŞ BUTONU (Referans Görsel 1 & 2) */}
        <div className="flex items-center p-1 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-md pointer-events-auto mr-10 sm:mr-12">
          <button
            onClick={onSwitchTo2D}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
          >
            <span>📐</span>
            <span>2D</span>
          </button>

          <button
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm cursor-pointer"
          >
            <span>🧊</span>
            <span>3D</span>
          </button>
        </div>
      </div>

      {/* TİNKERCAD STİLİ 3D NAVİGASYON KÜPÜ (Sol Üst) */}
      <ViewCube3D camera={camera} setCamera={setCamera} />

      {/* 2. ANA SVG 3D ÇİZİM TUVALİ */}
      <svg className="w-full h-full block pointer-events-none">
        {/* A) Zemin Izgarası (Z = 0, Tam Ekran Sonsuz Zemin) */}
        {camera.showGrid && (
          <g className="grid-lines">
            {gridLines.map((line, idx) => (
              <line
                key={`grid-${idx}`}
                x1={line.p1.x}
                y1={line.p1.y}
                x2={line.p2.x}
                y2={line.p2.y}
                stroke={line.isAxis ? '#475569' : line.isMajor ? '#64748b' : '#94a3b8'}
                strokeWidth={line.isAxis ? 1.8 : line.isMajor ? 1.3 : 0.9}
                strokeOpacity={line.isAxis ? 0.8 : line.isMajor ? 0.65 : 0.5}
              />
            ))}
          </g>
        )}

        {/* B) 3D Eksenler (Kırmızı X, Yeşil Y, Mavi Z) */}
        {camera.showAxes && (
          <g className="axes-3d">
            {/* X Ekseni (Kırmızı) - Negatif ve Pozitif */}
            <line
              x1={axesData.xNegEnd.x}
              y1={axesData.xNegEnd.y}
              x2={axesData.origin.x}
              y2={axesData.origin.y}
              stroke="#ef4444"
              strokeWidth={1.8}
              strokeDasharray="4,3"
              strokeOpacity={0.6}
            />
            <line
              x1={axesData.origin.x}
              y1={axesData.origin.y}
              x2={axesData.xPosEnd.x}
              y2={axesData.xPosEnd.y}
              stroke="#ef4444"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <text
              x={axesData.xPosEnd.x + 8}
              y={axesData.xPosEnd.y + 5}
              className="fill-rose-600 font-black text-sm font-sans select-none"
            >
              +x
            </text>
            <text
              x={axesData.xNegEnd.x - 14}
              y={axesData.xNegEnd.y + 5}
              className="fill-rose-400 font-bold text-xs font-sans select-none"
            >
              -x
            </text>
            {axesData.xTicks.map((t) => (
              <text
                key={`xt-${t.val}`}
                x={t.pt.x}
                y={t.pt.y + 12}
                textAnchor="middle"
                className="fill-rose-500 font-mono font-bold text-[9px] select-none"
              >
                {t.val}
              </text>
            ))}

            {/* Y Ekseni (Yeşil / Turkuaz Derinlik) - Negatif ve Pozitif */}
            <line
              x1={axesData.yNegEnd.x}
              y1={axesData.yNegEnd.y}
              x2={axesData.origin.x}
              y2={axesData.origin.y}
              stroke="#10b981"
              strokeWidth={1.8}
              strokeDasharray="4,3"
              strokeOpacity={0.6}
            />
            <line
              x1={axesData.origin.x}
              y1={axesData.origin.y}
              x2={axesData.yPosEnd.x}
              y2={axesData.yPosEnd.y}
              stroke="#10b981"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <text
              x={axesData.yPosEnd.x + 6}
              y={axesData.yPosEnd.y + 8}
              className="fill-emerald-600 font-black text-sm font-sans select-none"
            >
              +y
            </text>
            <text
              x={axesData.yNegEnd.x - 14}
              y={axesData.yNegEnd.y - 6}
              className="fill-emerald-400 font-bold text-xs font-sans select-none"
            >
              -y
            </text>
            {axesData.yTicks.map((t) => (
              <text
                key={`yt-${t.val}`}
                x={t.pt.x - 10}
                y={t.pt.y + 4}
                textAnchor="end"
                className="fill-emerald-600 font-mono font-bold text-[9px] select-none"
              >
                {t.val}
              </text>
            ))}

            {/* Z Ekseni (Mavi / Dikey Yükseklik) - Negatif ve Pozitif */}
            <line
              x1={axesData.zNegEnd.x}
              y1={axesData.zNegEnd.y}
              x2={axesData.origin.x}
              y2={axesData.origin.y}
              stroke="#3b82f6"
              strokeWidth={1.8}
              strokeDasharray="4,3"
              strokeOpacity={0.6}
            />
            <line
              x1={axesData.origin.x}
              y1={axesData.origin.y}
              x2={axesData.zPosEnd.x}
              y2={axesData.zPosEnd.y}
              stroke="#3b82f6"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <text
              x={axesData.zPosEnd.x + 6}
              y={axesData.zPosEnd.y - 8}
              className="fill-blue-600 font-black text-sm font-sans select-none"
            >
              +z
            </text>
            <text
              x={axesData.zNegEnd.x + 6}
              y={axesData.zNegEnd.y + 14}
              className="fill-blue-400 font-bold text-xs font-sans select-none"
            >
              -z
            </text>
            {axesData.zTicks.map((t) => (
              <text
                key={`zt-${t.val}`}
                x={t.pt.x - 10}
                y={t.pt.y + 3}
                textAnchor="end"
                className="fill-blue-600 font-mono font-bold text-[9px] select-none"
              >
                {t.val}
              </text>
            ))}

            {/* Orijin (0, 0, 0) */}
            <circle
              cx={axesData.origin.x}
              cy={axesData.origin.y}
              r={6}
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth={2}
            />
            <text
              x={axesData.origin.x - 10}
              y={axesData.origin.y + 18}
              className="fill-slate-800 dark:fill-slate-200 font-mono font-black text-[11px] select-none drop-shadow-xs"
            >
              (0; 0; 0)
            </text>
          </g>
        )}

        {/* C) 3D Katı Cisim Yüzeyleri (Depth-Sorted) */}
        {showGlobalFaces &&
          renderedSolids.map((rf, idx) => {
            const solid = solids.find((s) => s.id === rf.solidId);
            const opacity = solid?.opacity || 0.85;
            const isSelected = effectiveSelectedIds.includes(rf.solidId);

            return (
              <g
                key={`face-${rf.solidId}-${rf.faceIdx}-${idx}`}
                onMouseDown={(e) => handleSolidMouseDown(rf.solidId, e)}
                className="pointer-events-auto cursor-grab active:cursor-grabbing group"
              >
                <path
                  d={rf.pointsD}
                  fill={rf.fillColor}
                  fillOpacity={opacity}
                  stroke={isSelected ? '#38bdf8' : rf.strokeColor}
                  strokeWidth={isSelected ? 2.5 : rf.strokeColor === 'none' ? 0 : showGlobalEdges ? 1.8 : 0.5}
                  strokeLinejoin="round"
                  className="transition-colors group-hover:brightness-110"
                />
              </g>
            );
          })}

        {/* C.1) Seçili Cismin 3D Eksen Taşıma Okları (Sadece 'Cismi seç / taşı' aracı aktifken görünür) */}
        {activeTool === 'select_move' &&
          solids.map((solid) => {
            if (!effectiveSelectedIds.includes(solid.id)) return null;
          const solidHeight = solid.dimensions.height || solid.dimensions.width || 3;
          const arrowLen3D = 2.4;

          const center3D = {
            x: solid.position.x,
            y: solid.position.y,
            z: solid.position.z + (solidHeight / 2),
          };

          const groundPt = project3DToScreen(
            { x: solid.position.x, y: solid.position.y, z: 0 },
            camera,
            dimensions.width,
            dimensions.height
          );
          const centerPt = project3DToScreen(center3D, camera, dimensions.width, dimensions.height);

          // X, Y, Z Ok Uç Noktaları
          const xTipPt = project3DToScreen(
            { x: center3D.x + arrowLen3D, y: center3D.y, z: center3D.z },
            camera,
            dimensions.width,
            dimensions.height
          );
          const yTipPt = project3DToScreen(
            { x: center3D.x, y: center3D.y + arrowLen3D, z: center3D.z },
            camera,
            dimensions.width,
            dimensions.height
          );
          const zTipPt = project3DToScreen(
            { x: center3D.x, y: center3D.y, z: center3D.z + arrowLen3D },
            camera,
            dimensions.width,
            dimensions.height
          );

          // Ok Geometrisi Hesaplayıcı
          const calcArrow = (p0: { x: number; y: number }, p1: { x: number; y: number }) => {
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const px = -uy;
            const py = ux;
            const headLen = 12;
            const headW = 5.5;

            const tip = { x: p1.x, y: p1.y };
            const left = { x: p1.x - ux * headLen + px * headW, y: p1.y - uy * headLen + py * headW };
            const right = { x: p1.x - ux * headLen - px * headW, y: p1.y - uy * headLen - py * headW };
            const badge = { x: p1.x + ux * 15, y: p1.y + uy * 15 };

            return {
              lineEnd: { x: p1.x - ux * (headLen * 0.7), y: p1.y - uy * (headLen * 0.7) },
              headPoints: `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`,
              badge,
            };
          };

          const xArrow = calcArrow(centerPt, xTipPt);
          const yArrow = calcArrow(centerPt, yTipPt);
          const zArrow = calcArrow(centerPt, zTipPt);

          return (
            <g key={`move-gizmo-${solid.id}`} className="pointer-events-auto select-none">
              {/* Zemin İzdüşüm Çizgisi ve Zemin Noktası */}
              <line
                x1={groundPt.x}
                y1={groundPt.y}
                x2={centerPt.x}
                y2={centerPt.y}
                stroke="#64748b"
                strokeWidth={1.4}
                strokeDasharray="4,3"
                className="opacity-70"
              />
              <circle
                cx={groundPt.x}
                cy={groundPt.y}
                r={4.5}
                fill="#64748b"
                className="opacity-70"
              />

              {/* 1. X EKSENİ OKU (Kırmızı / Red) */}
              <g
                onMouseDown={(e) => handleSolidMouseDown(solid.id, e, 'x')}
                className="cursor-pointer group/xarrow"
              >
                <line
                  x1={centerPt.x}
                  y1={centerPt.y}
                  x2={xArrow.lineEnd.x}
                  y2={xArrow.lineEnd.y}
                  stroke="#ef4444"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  className="group-hover/xarrow:stroke-rose-600 transition-colors drop-shadow-sm"
                />
                <polygon
                  points={xArrow.headPoints}
                  fill="#ef4444"
                  className="group-hover/xarrow:fill-rose-600 transition-colors drop-shadow-sm"
                />
                <circle
                  cx={xArrow.badge.x}
                  cy={xArrow.badge.y}
                  r={9}
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  className="group-hover/xarrow:fill-rose-600 transition-colors drop-shadow-md"
                />
                <text
                  x={xArrow.badge.x}
                  y={xArrow.badge.y + 3}
                  textAnchor="middle"
                  fill="#ffffff"
                  className="text-[9px] font-black font-mono pointer-events-none"
                >
                  X
                </text>
              </g>

              {/* 2. Y EKSENİ OKU (Yeşil / Green) */}
              <g
                onMouseDown={(e) => handleSolidMouseDown(solid.id, e, 'y')}
                className="cursor-pointer group/yarrow"
              >
                <line
                  x1={centerPt.x}
                  y1={centerPt.y}
                  x2={yArrow.lineEnd.x}
                  y2={yArrow.lineEnd.y}
                  stroke="#10b981"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  className="group-hover/yarrow:stroke-emerald-600 transition-colors drop-shadow-sm"
                />
                <polygon
                  points={yArrow.headPoints}
                  fill="#10b981"
                  className="group-hover/yarrow:fill-emerald-600 transition-colors drop-shadow-sm"
                />
                <circle
                  cx={yArrow.badge.x}
                  cy={yArrow.badge.y}
                  r={9}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  className="group-hover/yarrow:fill-emerald-600 transition-colors drop-shadow-md"
                />
                <text
                  x={yArrow.badge.x}
                  y={yArrow.badge.y + 3}
                  textAnchor="middle"
                  fill="#ffffff"
                  className="text-[9px] font-black font-mono pointer-events-none"
                >
                  Y
                </text>
              </g>

              {/* 3. Z EKSENİ OKU (Mavi / Blue) */}
              <g
                onMouseDown={(e) => handleSolidMouseDown(solid.id, e, 'z')}
                className="cursor-pointer group/zarrow"
              >
                <line
                  x1={centerPt.x}
                  y1={centerPt.y}
                  x2={zArrow.lineEnd.x}
                  y2={zArrow.lineEnd.y}
                  stroke="#3b82f6"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  className="group-hover/zarrow:stroke-blue-600 transition-colors drop-shadow-sm"
                />
                <polygon
                  points={zArrow.headPoints}
                  fill="#3b82f6"
                  className="group-hover/zarrow:fill-blue-600 transition-colors drop-shadow-sm"
                />
                <circle
                  cx={zArrow.badge.x}
                  cy={zArrow.badge.y}
                  r={9}
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  className="group-hover/zarrow:fill-blue-600 transition-colors drop-shadow-md"
                />
                <text
                  x={zArrow.badge.x}
                  y={zArrow.badge.y + 3}
                  textAnchor="middle"
                  fill="#ffffff"
                  className="text-[9px] font-black font-mono pointer-events-none"
                >
                  Z
                </text>
              </g>

              {/* Merkez Bağlantı Noktası (Serbest Taşıma) */}
              <circle
                cx={centerPt.x}
                cy={centerPt.y}
                r={6}
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth={2.2}
                className="cursor-move hover:fill-sky-400 transition-colors drop-shadow-sm"
                onMouseDown={(e) => handleSolidMouseDown(solid.id, e, 'free')}
              />

              {/* Koordinat Rozeti */}
              <g
                transform={`translate(${centerPt.x}, ${centerPt.y - 30})`}
                className="cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => handleSolidMouseDown(solid.id, e, 'free')}
              >
                <rect
                  x={-55}
                  y={-12}
                  width={110}
                  height={24}
                  rx={12}
                  fill="rgba(15, 23, 42, 0.92)"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                />
                <text
                  textAnchor="middle"
                  y={4}
                  fill="#ffffff"
                  className="text-[11px] font-mono font-black select-none pointer-events-none"
                >
                  X:{solid.position.x} Y:{solid.position.y} Z:{solid.position.z}
                </text>
              </g>
            </g>
          );
        })}

        {/* D) 3D Ayrıt Çizgileri (Wireframe) */}
        {showGlobalEdges &&
          solids.map((solid) => {
            const mesh = generateSolidMesh(solid);
            const projVertices = mesh.vertices.map((v) =>
              project3DToScreen(v, camera, dimensions.width, dimensions.height)
            );

            return (
              <g key={`edges-${solid.id}`}>
                {mesh.edges.map((edge, eIdx) => {
                  const p1 = projVertices[edge.startIdx];
                  const p2 = projVertices[edge.endIdx];
                  if (!p1 || !p2) return null;

                  return (
                    <line
                      key={`e-${eIdx}`}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={effectiveSelectedIds.includes(solid.id) ? '#ec4899' : '#1e293b'}
                      strokeWidth={effectiveSelectedIds.includes(solid.id) ? 3.5 : 2.2}
                      strokeDasharray={solid.unfoldProgress > 0 ? '4,2' : undefined}
                      className="opacity-90"
                    />
                  );
                })}
              </g>
            );
          })}

        {/* E) 3D Köşe Noktaları (Vertices) */}
        {showGlobalVertices &&
          solids.map((solid) => {
            const mesh = generateSolidMesh(solid);
            const projVertices = mesh.vertices.map((v) =>
              project3DToScreen(v, camera, dimensions.width, dimensions.height)
            );

            return (
              <g key={`vertices-${solid.id}`}>
                {projVertices.map((pv, vIdx) => (
                  <g key={`v-${vIdx}`} transform={`translate(${pv.x}, ${pv.y})`}>
                    <circle
                      r={6.5}
                      fill="#8b5cf6"
                      stroke="#ffffff"
                      strokeWidth={2.5}
                      className="drop-shadow-md"
                    />
                  </g>
                ))}
              </g>
            );
          })}
        {/* 3D KUTUYLA ÇOKLU SEÇİM (MARQUEE) KATMANI */}
        {selectionMarquee && (() => {
          const boxX = Math.min(selectionMarquee.start.x, selectionMarquee.current.x);
          const boxY = Math.min(selectionMarquee.start.y, selectionMarquee.current.y);
          const boxW = Math.abs(selectionMarquee.start.x - selectionMarquee.current.x);
          const boxH = Math.abs(selectionMarquee.start.y - selectionMarquee.current.y);

          return (
            <g className="pointer-events-none marquee-3d-selection-box">
              <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={boxH}
                fill="#3b82f6"
                fillOpacity={0.15}
                stroke="#2563eb"
                strokeWidth={1.5}
                strokeDasharray="5,4"
                rx={4}
              />
              {effectiveSelectedIds.length > 0 && boxW > 40 && boxH > 40 && (
                <g transform={`translate(${boxX + boxW / 2}, ${Math.max(16, boxY - 14)})`}>
                  <rect
                    x="-55"
                    y="-11"
                    width="110"
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
                    ✨ {effectiveSelectedIds.length} cisim seçildi
                  </text>
                </g>
              )}
            </g>
          );
        })()}
      </svg>

      {/* 📖 3D AÇINIM / YÜZEYLERİ AYIR CANLI KONTROL ÇUBUĞU */}
      {(() => {
        const targetSolid = solids.find((s) => s.id === selectedSolidId) || (solids.length === 1 ? solids[0] : null);
        if (!targetSolid || targetSolid.type === 'sphere') return null;

        const progress = targetSolid.unfoldProgress || 0;

        return (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-card/95 backdrop-blur-md text-white border border-amber-500/40 shadow-2xl px-5 py-3 rounded-2xl flex flex-col md:flex-row items-center gap-4 z-30 select-none animate-in slide-in-from-top-3 duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-200">
                📖 {targetSolid.name || 'Cismin'} Açınımı:
              </span>
              <span className="font-mono font-black text-amber-300 text-xs px-2 py-0.5 rounded-md bg-amber-500/20">
                %{Math.round(progress * 100)}
              </span>
            </div>

            {/* Canlı Sürgü */}
            <div className="flex items-center gap-3 w-48 sm:w-64">
              <button
                onClick={() => {
                  const nextVal = Math.max(0, Number((progress - 0.1).toFixed(2)));
                  if (onUpdateSolid) onUpdateSolid(targetSolid.id, { unfoldProgress: nextVal });
                }}
                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-black cursor-pointer transition-colors"
                title="10% Kapat"
              >
                -
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={progress}
                onChange={(e) => {
                  const nextVal = parseFloat(e.target.value);
                  if (onUpdateSolid) onUpdateSolid(targetSolid.id, { unfoldProgress: nextVal });
                }}
                className="flex-1 h-2 bg-amber-950/80 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <button
                onClick={() => {
                  const nextVal = Math.min(1, Number((progress + 0.1).toFixed(2)));
                  if (onUpdateSolid) onUpdateSolid(targetSolid.id, { unfoldProgress: nextVal });
                }}
                className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 flex items-center justify-center text-xs font-black cursor-pointer transition-colors"
                title="10% Aç"
              >
                +
              </button>
            </div>

            {/* Hızlı Butonlar */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (onUpdateSolid) onUpdateSolid(targetSolid.id, { unfoldProgress: 0 });
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  progress === 0
                    ? 'bg-amber-500 text-slate-900 shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-white/90'
                }`}
              >
                🔒 Kapalı (0%)
              </button>
              <button
                onClick={() => {
                  if (onUpdateSolid) onUpdateSolid(targetSolid.id, { unfoldProgress: 1 });
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  progress >= 0.99
                    ? 'bg-amber-500 text-slate-900 shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-white/90'
                }`}
              >
                📖 Tam Açık (100%)
              </button>
            </div>
          </div>
        );
      })()}

      {/* 3D ÇOKLU SEÇİM EYLEM KAPSÜLÜ */}
      {effectiveSelectedIds.length > 0 && activeTool === 'select_move' && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-card/95 backdrop-blur-md text-white border border-border shadow-2xl px-4 py-2.5 rounded-2xl flex items-center gap-3 z-30 select-none animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-black">
              ✨ {effectiveSelectedIds.length} cisim seçildi (Taşımak için sürükleyin)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onDeleteSolids) onDeleteSolids();
                else if (onDeleteSolid && selectedSolidId) onDeleteSolid(selectedSolidId);
              }}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Seçilenleri Sil</span>
            </button>

            <button
              onClick={() => {
                if (onSelectSolids) onSelectSolids([]);
                else onSelectSolid(null);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              ✕ Seçimi Kaldır
            </button>
          </div>
        </div>
      )}

      {/* 3. SAĞ DİKEY 3D HIZLI ARAÇ ÇUBUĞU (Her Zaman Ortada ve Tam Görünür) */}
      <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-xl">
        <button
          onClick={() => setCamera((prev) => ({ ...prev, rotX: 25, rotY: -40, panX: 0, panY: 30, zoom: 55 }))}
          className="p-2.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer"
          title="İzometrik Görünüm (Sıfırla)"
        >
          <Focus className="w-4 h-4" />
        </button>

        <button
          onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.min(180, prev.zoom * 1.2) }))}
          className="p-2.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer"
          title="Yakınlaştır (+)"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.max(15, prev.zoom / 1.2) }))}
          className="p-2.5 rounded-xl hover:bg-muted text-foreground transition-all cursor-pointer"
          title="Uzaklaştır (-)"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="w-6 h-px bg-border my-0.5" />

        <button
          onClick={() => setCamera((prev) => ({ ...prev, showGrid: !prev.showGrid }))}
          className={`p-2.5 rounded-xl transition-all cursor-pointer ${
            camera.showGrid ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground'
          }`}
          title="Zemin Izgarasını Aç/Kapat"
        >
          <Grid className="w-4 h-4" />
        </button>

        <button
          onClick={() => setCamera((prev) => ({ ...prev, showAxes: !prev.showAxes }))}
          className={`p-2.5 rounded-xl transition-all cursor-pointer ${
            camera.showAxes ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground'
          }`}
          title="3D Eksenleri (x, y, z) Aç/Kapat"
        >
          <Box className="w-4 h-4" />
        </button>

        <div className="w-6 h-px bg-border my-0.5" />

        <button
          onClick={onClearAll}
          className="p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:text-rose-700 transition-all cursor-pointer group"
          title="Tüm 3D Cisimleri Sil (Sahneyi Temizle)"
        >
          <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      </div>

      {/* 3D Cisim Oluşturma Modu İpucu */}
      {isCreationMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-indigo-600/95 text-white shadow-xl flex items-center gap-2.5 text-xs font-black animate-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>3D Düzleme basıp sürükleyerek cismi istediğiniz boyutta oluşturun!</span>
          {setActive3DTool && (
            <button
              onClick={() => setActive3DTool('select_move')}
              className="ml-2 px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] cursor-pointer"
            >
              ✕ İptal
            </button>
          )}
        </div>
      )}

      {/* 4. SOL ALT KULLANIM İPUCU ROZETİ */}
      <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-2xl bg-card/85 backdrop-blur-md border border-border/80 text-[11px] text-muted-foreground font-semibold shadow-sm flex items-center gap-2">
        <RotateCw className="w-3.5 h-3.5 text-primary" />
        <span>Farenizi sürükleyerek 3D uzayı 360° döndürün • Tekerlek ile yakınlaştırın</span>
      </div>
    </div>
  );
}
