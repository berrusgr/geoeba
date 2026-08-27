'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Solid3DObject, Solid3DType, Camera3D, Tool3DMode, Point3D } from '@/types/workspace3d';
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

interface Canvas3DProps {
  solids: Solid3DObject[];
  selectedSolidId: string | null;
  activeTool: Tool3DMode;
  camera: Camera3D;
  showGlobalVertices: boolean;
  showGlobalEdges: boolean;
  showGlobalFaces: boolean;
  setCamera: React.Dispatch<React.SetStateAction<Camera3D>>;
  onSelectSolid: (id: string | null) => void;
  onAddSolid?: (type: Solid3DType, customDim?: { width: number; height: number; depth: number; radius?: number }, customPos?: Point3D) => void;
  setActive3DTool?: (tool: Tool3DMode) => void;
  onUpdateSolidPosition: (id: string, newPos: Point3D) => void;
  onSwitchTo2D: () => void;
}

export function Canvas3D({
  solids,
  selectedSolidId,
  activeTool,
  camera,
  showGlobalVertices,
  showGlobalEdges,
  showGlobalFaces,
  setCamera,
  onSelectSolid,
  onAddSolid,
  setActive3DTool,
  onUpdateSolidPosition,
  onSwitchTo2D,
}: Canvas3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const isCreationMode = activeTool.startsWith('create_');

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

  // Fare Olayları (3D Orbit, Pan & Drag to Create Solid)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;

    if (isCreationMode) {
      setIsCreatingSolid(true);
      setDragSolidStart({ x: e.clientX, y: e.clientY });
      setDragSolidCurrent({ x: e.clientX, y: e.clientY });
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isCreatingSolid) {
        setDragSolidCurrent({ x: e.clientX, y: e.clientY });
        return;
      }

      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setDragStart({ x: e.clientX, y: e.clientY });

      if (activeTool === 'pan' || e.buttons === 2 || e.buttons === 4) {
        // Görünümü Kaydır (Pan)
        setCamera((prev) => ({
          ...prev,
          panX: prev.panX + dx,
          panY: prev.panY + dy,
        }));
      } else {
        // 3D Döndürme (Orbit)
        setCamera((prev) => ({
          ...prev,
          rotY: (prev.rotY + dx * 0.45) % 360,
          rotX: Math.max(-85, Math.min(85, prev.rotX - dy * 0.45)),
        }));
      }
    },
    [isDragging, isCreatingSolid, dragStart, activeTool, setCamera]
  );

  const handleMouseUp = () => {
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
        const dot = Math.max(0.25, Math.min(1, face.normal.x * lightDir.x + face.normal.y * lightDir.y + face.normal.z * lightDir.z));
        const baseColor = solid.color || '#3b82f6';

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
          fillColor: baseColor,
          strokeColor: isSelected ? '#ec4899' : '#1e293b',
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

            return (
              <g
                key={`face-${rf.solidId}-${rf.faceIdx}-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSolid(rf.solidId);
                }}
                className="pointer-events-auto cursor-pointer group"
              >
                <path
                  d={rf.pointsD}
                  fill={rf.fillColor}
                  fillOpacity={opacity}
                  stroke={rf.strokeColor}
                  strokeWidth={showGlobalEdges ? 1.8 : 0.5}
                  strokeLinejoin="round"
                  className="transition-colors group-hover:brightness-110"
                />
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
                      stroke={selectedSolidId === solid.id ? '#ec4899' : '#1e293b'}
                      strokeWidth={selectedSolidId === solid.id ? 3.5 : 2.2}
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
      </svg>

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
