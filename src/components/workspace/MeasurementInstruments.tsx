'use client';

import React, { useState, useRef } from 'react';
import { Point2D, ViewportTransform } from '@/types/math';
import { worldToScreen, screenToWorld } from '@/math/coordinates';
import { ToolMode } from '@/types/workspace';
import { Compass, Ruler as RulerIcon, Triangle, Check, X, RotateCw } from 'lucide-react';

interface MeasurementInstrumentsProps {
  activeTool: ToolMode;
  viewport: ViewportTransform;
  onAddAngleFromProtractor?: (center: Point2D, angleDeg: number) => void;
  onAddSegmentFromRuler?: (p1: Point2D, p2: Point2D) => void;
  onAddPolygonFromAreaModel?: (pos: Point2D, cols: number, rows: number) => void;
}

export function MeasurementInstruments({
  activeTool,
  viewport,
  onAddAngleFromProtractor,
  onAddSegmentFromRuler,
  onAddPolygonFromAreaModel,
}: MeasurementInstrumentsProps) {
  // Açıölçer (İletki) Durumu
  const [protractorPos, setProtractorPos] = useState<Point2D>({ x: 0, y: 0 });
  const [protractorAngle, setProtractorAngle] = useState<number>(60);
  const [protractorBaseAngle, setProtractorBaseAngle] = useState<number>(0);
  const [isDraggingProtractor, setIsDraggingProtractor] = useState(false);
  const [isRotatingArm, setIsRotatingArm] = useState(false);

  // Cetvel Durumu
  const [rulerPos, setRulerPos] = useState<Point2D>({ x: -4, y: 2 });
  const [rulerRotation, setRulerRotation] = useState<number>(0); // Derece
  const [rulerLength, setRulerLength] = useState<number>(8); // Birim
  const [isDraggingRuler, setIsDraggingRuler] = useState(false);

  // Gönye Durumu
  const [setsquarePos, setSetsquarePos] = useState<Point2D>({ x: 2, y: -2 });
  const [setsquareRotation, setSetsquareRotation] = useState<number>(0);
  const [isDraggingSetsquare, setIsDraggingSetsquare] = useState(false);

  // Alan Modeli Durumu
  const [areaCols, setAreaCols] = useState(4);
  const [areaRows, setAreaRows] = useState(3);
  const [areaModelPos, setAreaModelPos] = useState<Point2D>({ x: -2, y: -1 });
  const [isDraggingAreaModel, setIsDraggingAreaModel] = useState(false);
  const [isResizingAreaModel, setIsResizingAreaModel] = useState(false);

  const isVisible = ['measure_angle', 'setsquare', 'area_model', 'ruler'].includes(activeTool);
  if (!isVisible) return null;

  // Ekran Koordinatları
  const protScreen = worldToScreen(protractorPos, viewport);
  const rulerScreen = worldToScreen(rulerPos, viewport);
  const setsquareScreen = worldToScreen(setsquarePos, viewport);
  const areaScreen = worldToScreen(areaModelPos, viewport);

  const protRadius = 140; // piksel

  // Açıölçer Derece Çentikleri (0° - 180°)
  const ticks = [];
  for (let d = 0; d <= 180; d += 5) {
    const isMajor = d % 10 === 0;
    const isSpecial = d === 90 || d === 45 || d === 135 || d === 0 || d === 180;
    const rad = ((d + protractorBaseAngle) * Math.PI) / 180;
    const r1 = protRadius;
    const r2 = isSpecial ? protRadius - 16 : isMajor ? protRadius - 12 : protRadius - 7;
    const x1 = Math.cos(rad) * r1;
    const y1 = -Math.sin(rad) * r1;
    const x2 = Math.cos(rad) * r2;
    const y2 = -Math.sin(rad) * r2;

    const labelR = protRadius - 26;
    const lx = Math.cos(rad) * labelR;
    const ly = -Math.sin(rad) * labelR;

    ticks.push({
      d,
      x1,
      y1,
      x2,
      y2,
      isMajor,
      isSpecial,
      labelPos: isMajor ? { x: lx, y: ly } : null,
    });
  }

  // Açı Sınıflandırması (Türkçe MEB Müfredatı)
  const getAngleType = (deg: number) => {
    if (deg === 0) return 'Sıfır Açı';
    if (deg < 90) return 'Dar Açı';
    if (deg === 90) return 'Dik Açı';
    if (deg < 180) return 'Geniş Açı';
    if (deg === 180) return 'Doğru Açı';
    return 'Tam Açı';
  };

  // Açıölçer Sürükleme Başlat
  const handleProtractorMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingProtractor(true);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPos = { ...protractorPos };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dxScreen = moveEvent.clientX - startClientX;
      const dyScreen = moveEvent.clientY - startClientY;
      const dxWorld = dxScreen / viewport.zoom;
      const dyWorld = -dyScreen / viewport.zoom;

      setProtractorPos({
        x: Number((startPos.x + dxWorld).toFixed(2)),
        y: Number((startPos.y + dyWorld).toFixed(2)),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingProtractor(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // İbre Döndürme Başlat
  const handleNeedleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsRotatingArm(true);

    const svgEl = (e.target as SVGElement).closest('svg');
    const rect = svgEl?.getBoundingClientRect() || { left: 0, top: 0 };

    const updateAngle = (moveEvent: MouseEvent) => {
      const currentProtScreen = worldToScreen(protractorPos, viewport);
      const curScreenX = moveEvent.clientX - rect.left;
      const curScreenY = moveEvent.clientY - rect.top;

      const dx = curScreenX - currentProtScreen.x;
      const dy = -(curScreenY - currentProtScreen.y); // SVG y ekseni ters

      let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI) - protractorBaseAngle;
      if (deg < 0) {
        deg = dx >= 0 ? 0 : 180;
      }
      const clamped = Math.max(0, Math.min(180, deg));
      setProtractorAngle(clamped);
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateAngle(moveEvent);
    };

    const handleMouseUp = () => {
      setIsRotatingArm(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Gönye Sürükleme Başlat
  const handleSetsquareMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingSetsquare(true);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPos = { ...setsquarePos };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dxScreen = moveEvent.clientX - startClientX;
      const dyScreen = moveEvent.clientY - startClientY;
      const dxWorld = dxScreen / viewport.zoom;
      const dyWorld = -dyScreen / viewport.zoom;

      setSetsquarePos({
        x: Number((startPos.x + dxWorld).toFixed(2)),
        y: Number((startPos.y + dyWorld).toFixed(2)),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingSetsquare(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Cetvel Sürükleme Başlat
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingRuler(true);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPos = { ...rulerPos };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dxScreen = moveEvent.clientX - startClientX;
      const dyScreen = moveEvent.clientY - startClientY;
      const dxWorld = dxScreen / viewport.zoom;
      const dyWorld = -dyScreen / viewport.zoom;

      setRulerPos({
        x: Number((startPos.x + dxWorld).toFixed(2)),
        y: Number((startPos.y + dyWorld).toFixed(2)),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingRuler(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Cetvel Uzunluğu Boyutlandırma (Sağ Kenar Tutamaç)
  const handleRulerResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const svgEl = (e.target as SVGElement).closest('svg');
    const rect = svgEl?.getBoundingClientRect() || { left: 0, top: 0 };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentRulerScreen = worldToScreen(rulerPos, viewport);
      const curScreenX = moveEvent.clientX - rect.left;
      const curScreenY = moveEvent.clientY - rect.top;

      const dx = curScreenX - currentRulerScreen.x;
      const dy = curScreenY - currentRulerScreen.y;

      const rad = (rulerRotation * Math.PI) / 180;
      // Cetvel ekseni üzerindeki izdüşüm
      const distAlongRuler = (dx * Math.cos(rad) + dy * Math.sin(rad)) / viewport.zoom;

      const computedLength = Math.max(2, Math.min(35, Math.round(distAlongRuler * 2) / 2));
      setRulerLength(computedLength);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Cetvel Döndürme Tutamacı
  const handleRulerRotateMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const svgEl = (e.target as SVGElement).closest('svg');
    const rect = svgEl?.getBoundingClientRect() || { left: 0, top: 0 };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentRulerScreen = worldToScreen(rulerPos, viewport);
      const curScreenX = moveEvent.clientX - rect.left;
      const curScreenY = moveEvent.clientY - rect.top;

      const dx = curScreenX - currentRulerScreen.x;
      const dy = curScreenY - currentRulerScreen.y;

      let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      if (moveEvent.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }
      setRulerRotation(deg);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Alan Modeli Sürükleme Başlat
  const handleAreaModelMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingAreaModel(true);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPos = { ...areaModelPos };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dxScreen = moveEvent.clientX - startClientX;
      const dyScreen = moveEvent.clientY - startClientY;
      const dxWorld = dxScreen / viewport.zoom;
      const dyWorld = -dyScreen / viewport.zoom;

      setAreaModelPos({
        x: Number((startPos.x + dxWorld).toFixed(2)),
        y: Number((startPos.y + dyWorld).toFixed(2)),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingAreaModel(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Alan Modeli Boyutlandırma Başlat (Köşe Tutamaç)
  const handleAreaResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizingAreaModel(true);

    const svgEl = (e.target as SVGElement).closest('svg');
    const rect = svgEl?.getBoundingClientRect() || { left: 0, top: 0 };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentAreaScreen = worldToScreen(areaModelPos, viewport);
      const curScreenX = moveEvent.clientX - rect.left;
      const curScreenY = moveEvent.clientY - rect.top;

      const dxPx = curScreenX - currentAreaScreen.x;
      const dyPx = currentAreaScreen.y - curScreenY; // SVG Y ekseni ters

      const computedCols = Math.max(1, Math.min(15, Math.round(dxPx / viewport.zoom)));
      const computedRows = Math.max(1, Math.min(15, Math.round(dyPx / viewport.zoom)));

      setAreaCols(computedCols);
      setAreaRows(computedRows);
    };

    const handleMouseUp = () => {
      setIsResizingAreaModel(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <g className="measurement-instruments select-none">
      {/* 1. İNTERAKTİF AÇIÖLÇER (İLETKİ) */}
      {activeTool === 'measure_angle' && (
        <g transform={`translate(${protScreen.x}, ${protScreen.y})`}>
          {/* İletki Gövdesi (Yarı Saydam Akrilik - Sürüklenebilir) */}
          <path
            d={`M ${-protRadius} 0 A ${protRadius} ${protRadius} 0 0 1 ${protRadius} 0 Z`}
            fill="#38bdf8"
            fillOpacity="0.22"
            stroke="#0284c7"
            strokeWidth="2.5"
            onMouseDown={handleProtractorMouseDown}
            className="cursor-grab active:cursor-grabbing drop-shadow-xl hover:fill-opacity-30 transition-colors"
          />

          {/* İç Boşluk / Yay */}
          <path
            d={`M ${-protRadius * 0.45} 0 A ${protRadius * 0.45} ${protRadius * 0.45} 0 0 1 ${protRadius * 0.45} 0 Z`}
            fill="none"
            stroke="#0284c7"
            strokeWidth="1.5"
            strokeDasharray="4,3"
            opacity="0.6"
            onMouseDown={handleProtractorMouseDown}
            className="cursor-grab active:cursor-grabbing"
          />

          {/* Taban Çizgisi */}
          <line
            x1={-protRadius}
            y1={0}
            x2={protRadius}
            y2={0}
            stroke="#0284c7"
            strokeWidth="2.5"
            onMouseDown={handleProtractorMouseDown}
            className="cursor-grab active:cursor-grabbing"
          />

          {/* Merkez Artı / Odak Noktası */}
          <circle
            cx="0"
            cy="0"
            r="12"
            fill="#ffffff"
            stroke="#0284c7"
            strokeWidth="2"
            onMouseDown={handleProtractorMouseDown}
            className="cursor-grab active:cursor-grabbing shadow-sm"
          />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#0284c7" strokeWidth="1.5" className="pointer-events-none" />
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#0284c7" strokeWidth="1.5" className="pointer-events-none" />

          {/* Çentikler ve Derece Yazıları */}
          {ticks.map((t) => (
            <g key={`tick-${t.d}`} className="pointer-events-none">
              <line
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke="#0369a1"
                strokeWidth={t.isSpecial ? 2 : t.isMajor ? 1.5 : 0.8}
              />
              {t.labelPos && (
                <text
                  x={t.labelPos.x}
                  y={t.labelPos.y + 3}
                  textAnchor="middle"
                  fill="#0c4a6e"
                  className="text-[9px] font-black font-sans"
                >
                  {t.d}°
                </text>
              )}
            </g>
          ))}

          {/* Ölçülen Açı Sektörü (Renkli Dolgu) */}
          {protractorAngle > 0 && (
            <path
              d={`M 0 0 L ${Math.cos(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius - 5)} ${-Math.sin(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius - 5)} A ${protRadius - 5} ${protRadius - 5} 0 0 0 ${Math.cos((protractorBaseAngle * Math.PI) / 180) * (protRadius - 5)} ${-Math.sin((protractorBaseAngle * Math.PI) / 180) * (protRadius - 5)} Z`}
              fill="#f59e0b"
              fillOpacity="0.32"
              stroke="#d97706"
              strokeWidth="2"
              onMouseDown={handleProtractorMouseDown}
              className="cursor-grab active:cursor-grabbing"
            />
          )}

          {/* İbre Geniş Tıklama/Tutma Alanı */}
          <line
            x1="0"
            y1="0"
            x2={Math.cos(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius + 22)}
            y2={-Math.sin(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius + 22)}
            stroke="transparent"
            strokeWidth="28"
            onMouseDown={handleNeedleMouseDown}
            className="cursor-pointer"
          />

          {/* İnteraktif Açı İbresi (Kol) */}
          <line
            x1="0"
            y1="0"
            x2={Math.cos(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius + 18)}
            y2={-Math.sin(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius + 18)}
            stroke="#ea580c"
            strokeWidth="4"
            strokeLinecap="round"
            onMouseDown={handleNeedleMouseDown}
            className="cursor-pointer pointer-events-none drop-shadow-md"
          />

          {/* İbre Tutamağı (Döner İbre Başlığı) */}
          <g
            transform={`translate(${Math.cos(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius + 18)}, ${-Math.sin(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius + 18)})`}
            onMouseDown={handleNeedleMouseDown}
            className="cursor-grab active:cursor-grabbing group/knob"
          >
            <circle
              cx="0"
              cy="0"
              r="12"
              fill="#ea580c"
              stroke="#ffffff"
              strokeWidth="2.5"
              className="shadow-xl group-hover/knob:scale-125 transition-transform"
            />
            <circle cx="0" cy="0" r="4" fill="#ffffff" />
          </g>

          {/* Canlı Açı Değer Paneli */}
          <g transform={`translate(0, ${-protRadius - 32})`}>
            <rect
              x="-85"
              y="-15"
              width="170"
              height="30"
              rx="12"
              fill="#0f172a"
              fillOpacity="0.95"
              stroke="#38bdf8"
              strokeWidth="1.5"
              className="shadow-2xl"
              onMouseDown={handleProtractorMouseDown}
            />
            <text x="0" y="5" textAnchor="middle" fill="#ffffff" className="font-sans font-black text-xs pointer-events-none">
              📐 {protractorAngle}° • {getAngleType(protractorAngle)}
            </text>
          </g>

          {/* Hızlı Açı Seçim Düğmeleri (0°, 30°, 45°, 60°, 90°, 120°, 135°, 150°, 180°) */}
          <g transform={`translate(-130, 24)`}>
            {[0, 30, 45, 60, 90, 120, 135, 150, 180].map((deg, i) => (
              <g
                key={`deg-btn-${deg}`}
                transform={`translate(${i * 29}, 0)`}
                className="cursor-pointer"
                onClick={() => setProtractorAngle(deg)}
              >
                <rect
                  width="26"
                  height="20"
                  rx="6"
                  fill={protractorAngle === deg ? '#0284c7' : '#ffffff'}
                  stroke="#0284c7"
                  strokeWidth="1.2"
                  className="shadow-xs hover:opacity-90"
                />
                <text
                  x="13"
                  y="14"
                  textAnchor="middle"
                  fill={protractorAngle === deg ? '#ffffff' : '#0369a1'}
                  className="text-[9px] font-black font-sans"
                >
                  {deg}°
                </text>
              </g>
            ))}
          </g>
        </g>
      )}

      {/* 2. İNTERAKTİF CETVEL (RULER) */}
      {activeTool === 'ruler' && (
        <g
          transform={`translate(${rulerScreen.x}, ${rulerScreen.y}) rotate(${rulerRotation})`}
          className="ruler-instrument select-none"
        >
          {/* A) Cetvel Gövdesi (Sürüklenebilir) */}
          <rect
            x="0"
            y="-22"
            width={rulerLength * viewport.zoom}
            height="44"
            rx="6"
            fill="#fef08a"
            fillOpacity="0.92"
            stroke="#ca8a04"
            strokeWidth="2.5"
            onMouseDown={handleRulerMouseDown}
            className="cursor-grab active:cursor-grabbing shadow-2xl backdrop-blur-sm hover:fill-opacity-98 transition-colors"
          />

          {/* B) Santimetre / Birim Çentikleri ve Sayıları */}
          {Array.from({ length: Math.floor(rulerLength) + 1 }).map((_, cm) => {
            const xPos = cm * viewport.zoom;
            return (
              <g key={`cm-${cm}`} className="pointer-events-none">
                {/* Ana CM Çizgisi */}
                <line
                  x1={xPos}
                  y1="-22"
                  x2={xPos}
                  y2="-4"
                  stroke="#854d0e"
                  strokeWidth="1.8"
                />
                {/* Rakam */}
                <text
                  x={xPos}
                  y="12"
                  textAnchor="middle"
                  fill="#713f12"
                  className="text-[10px] font-black font-mono select-none"
                >
                  {cm}
                </text>

                {/* Milimetre Alt Çentikleri */}
                {cm < rulerLength &&
                  [1, 2, 3, 4, 5, 6, 7, 8, 9].map((mm) => {
                    const mmX = xPos + (mm * viewport.zoom) / 10;
                    if (mmX > rulerLength * viewport.zoom) return null;
                    return (
                      <line
                        key={`mm-${cm}-${mm}`}
                        x1={mmX}
                        y1="-22"
                        x2={mmX}
                        y2={mm === 5 ? '-10' : '-16'}
                        stroke="#a16207"
                        strokeWidth={mm === 5 ? 1.2 : 0.75}
                      />
                    );
                  })}
              </g>
            );
          })}

          {/* C) Sağ Kenar Uzunluk Boyutlandırma Tutamacı (Sağ Kenarı Basılı Tutup Çekerek Uzat/Kısalt) */}
          <g
            transform={`translate(${rulerLength * viewport.zoom}, 0)`}
            onMouseDown={handleRulerResizeMouseDown}
            className="cursor-ew-resize group/ruler-resize"
          >
            {/* Geniş tutma çizgisi */}
            <line
              x1="0"
              y1="-24"
              x2="0"
              y2="24"
              stroke="#ea580c"
              strokeWidth="5"
              strokeLinecap="round"
              className="group-hover/ruler-resize:stroke-orange-600 transition-colors"
            />
            {/* Döner/çeker topuz */}
            <circle
              cx="0"
              cy="0"
              r="13"
              fill="#ea580c"
              stroke="#ffffff"
              strokeWidth="2.5"
              className="drop-shadow-lg group-hover/ruler-resize:scale-125 transition-transform"
            />
            <circle cx="0" cy="0" r="4" fill="#ffffff" />
          </g>

          {/* D) Döndürme Tutamacı (Sağ Üst Mavi Topuz) */}
          <g
            transform={`translate(${rulerLength * viewport.zoom + 22}, -20)`}
            onMouseDown={handleRulerRotateMouseDown}
            className="cursor-grab active:cursor-grabbing group/ruler-rotate"
          >
            <title>Cetveli Döndür (Shift ile 15° adımlarla)</title>
            <circle
              cx="0"
              cy="0"
              r="11"
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth="2"
              className="drop-shadow-md group-hover/ruler-rotate:scale-125 transition-transform"
            />
            <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
          </g>

          {/* E) Üst Cetvel Bilgi ve Hızlı Ayar Paneli */}
          <g transform={`translate(${((rulerLength * viewport.zoom) / 2) - 105}, -46)`}>
            <rect
              width="210"
              height="28"
              rx="10"
              fill="#0f172a"
              fillOpacity="0.96"
              stroke="#ca8a04"
              strokeWidth="1.2"
              className="shadow-2xl"
              onMouseDown={handleRulerMouseDown}
            />
            <text x="50" y="18" textAnchor="middle" fill="#ffffff" className="font-black text-xs font-sans pointer-events-none">
              📏 {rulerLength} cm (br)
            </text>

            {/* Uzunluk [-] [+] Düğmeleri */}
            <g
              transform="translate(105, 4)"
              className="cursor-pointer"
              onClick={() => setRulerLength((l) => Math.max(2, l - 1))}
            >
              <rect width="20" height="20" rx="5" fill="#334155" />
              <text x="10" y="14" textAnchor="middle" fill="#ffffff" className="font-black text-xs">-</text>
            </g>
            <g
              transform="translate(130, 4)"
              className="cursor-pointer"
              onClick={() => setRulerLength((l) => Math.min(35, l + 1))}
            >
              <rect width="20" height="20" rx="5" fill="#ca8a04" />
              <text x="10" y="14" textAnchor="middle" fill="#ffffff" className="font-black text-xs">+</text>
            </g>
            {/* 0° Yatay Yap Butonu */}
            <g
              transform="translate(155, 4)"
              className="cursor-pointer"
              onClick={() => setRulerRotation(0)}
            >
              <title>Açıyı Sıfırla (Yatay)</title>
              <rect width="46" height="20" rx="5" fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />
              <text x="23" y="13" textAnchor="middle" fill="#94a3b8" className="font-bold text-[9px]">0° Yatay</text>
            </g>
          </g>

          {/* F) Hızlı Uzunluk Şablonları (5, 8, 10, 12, 15, 20 cm) */}
          <g transform={`translate(${((rulerLength * viewport.zoom) / 2) - 110}, 30)`}>
            {[5, 8, 10, 12, 15, 20].map((len, i) => (
              <g
                key={`rlen-${len}`}
                transform={`translate(${i * 37}, 0)`}
                className="cursor-pointer"
                onClick={() => setRulerLength(len)}
              >
                <rect
                  width="33"
                  height="18"
                  rx="5"
                  fill={rulerLength === len ? '#ca8a04' : '#1e293b'}
                  stroke="#ca8a04"
                  strokeWidth="0.8"
                  className="shadow-xs hover:opacity-90"
                />
                <text
                  x="16.5"
                  y="12"
                  textAnchor="middle"
                  fill="#ffffff"
                  className="font-bold text-[8.5px] font-sans"
                >
                  {len} cm
                </text>
              </g>
            ))}
          </g>
        </g>
      )}

      {/* 3. İNTERAKTİF GÖNYE (SET SQUARE - 90° & 45°/45°) */}
      {activeTool === 'setsquare' && (
        <g
          transform={`translate(${setsquareScreen.x}, ${setsquareScreen.y}) rotate(${setsquareRotation})`}
          onMouseDown={handleSetsquareMouseDown}
          className="cursor-grab active:cursor-grabbing"
        >
          {/* Gönye Üçgen Gövdesi */}
          <polygon
            points={`0,0 ${6 * viewport.zoom},0 0,${-6 * viewport.zoom}`}
            fill="#a7f3d0"
            fillOpacity="0.82"
            stroke="#059669"
            strokeWidth="2.5"
            className="shadow-2xl"
          />

          {/* İç Üçgen Boşluğu */}
          <polygon
            points={`${1.2 * viewport.zoom},${-0.8 * viewport.zoom} ${4.2 * viewport.zoom},${-0.8 * viewport.zoom} ${1.2 * viewport.zoom},${-3.8 * viewport.zoom}`}
            fill="#f0fdf4"
            fillOpacity="0.95"
            stroke="#059669"
            strokeWidth="1.5"
          />

          {/* 90° Dik Açı İşareti (Köşede) */}
          <rect
            x="0"
            y={-0.6 * viewport.zoom}
            width={0.6 * viewport.zoom}
            height={0.6 * viewport.zoom}
            fill="none"
            stroke="#047857"
            strokeWidth="2"
          />
          <circle
            cx={0.3 * viewport.zoom}
            cy={-0.3 * viewport.zoom}
            r="2.5"
            fill="#047857"
          />

          {/* Açı Değerleri */}
          <text
            x={0.8 * viewport.zoom}
            y={-0.8 * viewport.zoom}
            className="text-[11px] font-black fill-emerald-900"
          >
            90°
          </text>
          <text
            x={4.6 * viewport.zoom}
            y={-0.2 * viewport.zoom}
            className="text-[10px] font-bold fill-emerald-800"
          >
            45°
          </text>
          <text
            x={0.2 * viewport.zoom}
            y={-4.6 * viewport.zoom}
            className="text-[10px] font-bold fill-emerald-800"
          >
            45°
          </text>
        </g>
      )}

      {/* 4. İNTERAKTİF ALAN MODELLEME IZGARASI (GEOGEBRA AREA MODEL) */}
      {activeTool === 'area_model' && (
        <g transform={`translate(${areaScreen.x}, ${areaScreen.y})`} className="area-model-instrument">
          {/* A) Model Gövdesi ve Birim Kareler Izgarası (Sürüklenebilir) */}
          <g onMouseDown={handleAreaModelMouseDown} className="cursor-grab active:cursor-grabbing">
            {/* Arka Plan Gölge ve Sınır Çerçevesi */}
            <rect
              x={0}
              y={-areaRows * viewport.zoom}
              width={areaCols * viewport.zoom}
              height={areaRows * viewport.zoom}
              fill="#10b981"
              fillOpacity={0.08}
              stroke="#059669"
              strokeWidth={3}
              rx={6}
              className="drop-shadow-2xl"
            />

            {/* Birim Kare Hücreleri */}
            {Array.from({ length: areaRows }).map((_, r) =>
              Array.from({ length: areaCols }).map((_, c) => {
                const cellIndex = (areaRows - 1 - r) * areaCols + c + 1;
                const cellX = c * viewport.zoom;
                const cellY = -r * viewport.zoom - viewport.zoom;
                const isEven = (r + c) % 2 === 0;

                return (
                  <g key={`cell-${r}-${c}`}>
                    <rect
                      x={cellX}
                      y={cellY}
                      width={viewport.zoom}
                      height={viewport.zoom}
                      fill={isEven ? '#34d399' : '#6ee7b7'}
                      fillOpacity={0.45}
                      stroke="#059669"
                      strokeWidth={1.2}
                      className="hover:fill-opacity-70 transition-colors"
                    />
                    {viewport.zoom >= 26 && (
                      <text
                        x={cellX + viewport.zoom / 2}
                        y={cellY + viewport.zoom / 2 + 4}
                        textAnchor="middle"
                        fill="#065f46"
                        className="font-black text-[11px] font-mono pointer-events-none select-none opacity-80"
                      >
                        {cellIndex}
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {/* B) Üst Boyut Etiketi (Genişlik / W) */}
            <g transform={`translate(0, ${-areaRows * viewport.zoom - 14})`} className="pointer-events-none">
              <line
                x1={2}
                y1={0}
                x2={areaCols * viewport.zoom - 2}
                y2={0}
                stroke="#047857"
                strokeWidth={2}
                markerEnd="url(#arrow)"
              />
              <rect
                x={(areaCols * viewport.zoom) / 2 - 45}
                y={-10}
                width={90}
                height={20}
                rx={6}
                fill="#ffffff"
                stroke="#059669"
                strokeWidth={1}
                className="shadow-xs dark:fill-slate-900"
              />
              <text
                x={(areaCols * viewport.zoom) / 2}
                y={4}
                textAnchor="middle"
                fill="#047857"
                className="font-black text-[10px] font-sans dark:fill-emerald-400"
              >
                ⟵ {areaCols} Birim (W) ⟶
              </text>
            </g>

            {/* C) Sol Boyut Etiketi (Yükseklik / H) */}
            <g transform={`translate(-14, 0)`} className="pointer-events-none">
              <line
                x1={0}
                y1={-2}
                x2={0}
                y2={-areaRows * viewport.zoom + 2}
                stroke="#047857"
                strokeWidth={2}
              />
              <rect
                x={-55}
                y={(-areaRows * viewport.zoom) / 2 - 10}
                width={50}
                height={20}
                rx={6}
                fill="#ffffff"
                stroke="#059669"
                strokeWidth={1}
                className="shadow-xs dark:fill-slate-900"
              />
              <text
                x={-30}
                y={(-areaRows * viewport.zoom) / 2 + 4}
                textAnchor="middle"
                fill="#047857"
                className="font-black text-[10px] font-sans dark:fill-emerald-400"
              >
                {areaRows} br (H)
              </text>
            </g>
          </g>

          {/* D) Sağ Üst Köşe Boyutlandırma Tutamağı (Resize Handle) */}
          <g
            transform={`translate(${areaCols * viewport.zoom}, ${-areaRows * viewport.zoom})`}
            onMouseDown={handleAreaResizeMouseDown}
            className="cursor-nesw-resize group/handle"
          >
            <circle
              cx={0}
              cy={0}
              r={14}
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth={3}
              className="drop-shadow-lg group-hover/handle:scale-125 transition-transform"
            />
            <circle cx={0} cy={0} r={4} fill="#ffffff" />
          </g>

          {/* E) Üst Formül ve Canlı Çözüm Başlığı */}
          <g transform={`translate(${((areaCols * viewport.zoom) / 2) - 130}, ${-areaRows * viewport.zoom - 52})`}>
            <rect
              width={260}
              height={32}
              rx={12}
              fill="#064e3b"
              fillOpacity={0.96}
              stroke="#34d399"
              strokeWidth={1.5}
              className="shadow-2xl cursor-grab active:cursor-grabbing"
              onMouseDown={handleAreaModelMouseDown}
            />
            <text x={130} y={16} textAnchor="middle" fill="#ffffff" className="font-black text-xs font-sans pointer-events-none">
              🟩 {areaCols} × {areaRows} = {areaCols * areaRows} br² (Alan)
            </text>
            <text x={130} y={27} textAnchor="middle" fill="#a7f3d0" className="font-bold text-[9px] font-sans pointer-events-none">
              Çevre: 2 × ({areaCols} + {areaRows}) = {2 * (areaCols + areaRows)} br
            </text>
          </g>

          {/* F) İnteraktif Hızlı Kontrol ve Boyutlandırma Çubuğu (W + / -, H + / -, Şekli Ekle) */}
          <g transform={`translate(${((areaCols * viewport.zoom) / 2) - 150}, 16)`}>
            <rect
              width={300}
              height={38}
              rx={12}
              fill="#0f172a"
              fillOpacity={0.96}
              stroke="#059669"
              strokeWidth={1.5}
              className="shadow-2xl"
            />

            {/* Genişlik (W) [-] [+] */}
            <g transform="translate(10, 8)">
              <text x="0" y="16" fill="#a7f3d0" className="font-bold text-[10px] font-sans">
                W:
              </text>
              <g
                transform="translate(18, 0)"
                className="cursor-pointer"
                onClick={() => setAreaCols((c) => Math.max(1, c - 1))}
              >
                <rect width="20" height="22" rx="5" fill="#334155" />
                <text x="10" y="15" textAnchor="middle" fill="#ffffff" className="font-black text-xs">
                  -
                </text>
              </g>
              <text x="48" y="16" textAnchor="middle" fill="#ffffff" className="font-black text-xs font-mono">
                {areaCols}
              </text>
              <g
                transform="translate(58, 0)"
                className="cursor-pointer"
                onClick={() => setAreaCols((c) => Math.min(15, c + 1))}
              >
                <rect width="20" height="22" rx="5" fill="#059669" />
                <text x="10" y="15" textAnchor="middle" fill="#ffffff" className="font-black text-xs">
                  +
                </text>
              </g>
            </g>

            {/* Yükseklik (H) [-] [+] */}
            <g transform="translate(100, 8)">
              <text x="0" y="16" fill="#a7f3d0" className="font-bold text-[10px] font-sans">
                H:
              </text>
              <g
                transform="translate(16, 0)"
                className="cursor-pointer"
                onClick={() => setAreaRows((r) => Math.max(1, r - 1))}
              >
                <rect width="20" height="22" rx="5" fill="#334155" />
                <text x="10" y="15" textAnchor="middle" fill="#ffffff" className="font-black text-xs">
                  -
                </text>
              </g>
              <text x="46" y="16" textAnchor="middle" fill="#ffffff" className="font-black text-xs font-mono">
                {areaRows}
              </text>
              <g
                transform="translate(56, 0)"
                className="cursor-pointer"
                onClick={() => setAreaRows((r) => Math.min(15, r + 1))}
              >
                <rect width="20" height="22" rx="5" fill="#059669" />
                <text x="10" y="15" textAnchor="middle" fill="#ffffff" className="font-black text-xs">
                  +
                </text>
              </g>
            </g>

            {/* Şekil Olarak Tuvale Ekle Butonu */}
            <g
              transform="translate(190, 6)"
              className="cursor-pointer group/btn"
              onClick={() => {
                if (onAddPolygonFromAreaModel) {
                  onAddPolygonFromAreaModel(areaModelPos, areaCols, areaRows);
                }
              }}
            >
              <rect
                width="100"
                height="26"
                rx="8"
                fill="#10b981"
                className="group-hover/btn:fill-emerald-400 transition-colors shadow-sm"
              />
              <text x="50" y="17" textAnchor="middle" fill="#ffffff" className="font-black text-[10px] font-sans">
                ✨ Tuvale Ekle
              </text>
            </g>
          </g>

          {/* G) Hızlı Çarpma Şablon Butonları (2x3, 3x4, 4x5, 5x6, 6x8, 10x10) */}
          <g transform={`translate(${((areaCols * viewport.zoom) / 2) - 140}, 62)`}>
            {[
              { w: 2, h: 3 },
              { w: 3, h: 4 },
              { w: 4, h: 5 },
              { w: 5, h: 6 },
              { w: 6, h: 8 },
              { w: 10, h: 10 },
            ].map((p, i) => (
              <g
                key={`preset-${p.w}-${p.h}`}
                transform={`translate(${i * 48}, 0)`}
                className="cursor-pointer"
                onClick={() => {
                  setAreaCols(p.w);
                  setAreaRows(p.h);
                }}
              >
                <rect
                  width="44"
                  height="22"
                  rx="6"
                  fill={areaCols === p.w && areaRows === p.h ? '#059669' : '#1e293b'}
                  stroke="#059669"
                  strokeWidth="1"
                  className="shadow-sm hover:opacity-90"
                />
                <text
                  x="22"
                  y="15"
                  textAnchor="middle"
                  fill="#ffffff"
                  className="font-black text-[9px] font-sans"
                >
                  {p.w}×{p.h}
                </text>
              </g>
            ))}
          </g>
        </g>
      )}
    </g>
  );
}
