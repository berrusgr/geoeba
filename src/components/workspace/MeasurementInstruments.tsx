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
}

export function MeasurementInstruments({
  activeTool,
  viewport,
  onAddAngleFromProtractor,
  onAddSegmentFromRuler,
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

  const isVisible = ['measure_angle', 'ruler', 'setsquare', 'area_model', 'unit_measure'].includes(activeTool);
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

  return (
    <g className="measurement-instruments select-none">
      {/* 1. İNTERAKTİF AÇIÖLÇER (İLETKİ) */}
      {activeTool === 'measure_angle' && (
        <g transform={`translate(${protScreen.x}, ${protScreen.y})`}>
          {/* İletki Gövdesi (Yarı Saydam Akrilik) */}
          <path
            d={`M ${-protRadius} 0 A ${protRadius} ${protRadius} 0 0 1 ${protRadius} 0 Z`}
            fill="#38bdf8"
            fillOpacity="0.18"
            stroke="#0284c7"
            strokeWidth="2.5"
            className="cursor-move drop-shadow-lg"
          />

          {/* İç Boşluk / Yay */}
          <path
            d={`M ${-protRadius * 0.45} 0 A ${protRadius * 0.45} ${protRadius * 0.45} 0 0 1 ${protRadius * 0.45} 0 Z`}
            fill="none"
            stroke="#0284c7"
            strokeWidth="1.5"
            strokeDasharray="4,3"
            opacity="0.6"
          />

          {/* Taban Çizgisi */}
          <line
            x1={-protRadius}
            y1={0}
            x2={protRadius}
            y2={0}
            stroke="#0284c7"
            strokeWidth="2.5"
          />

          {/* Merkez Artı / Odak Noktası */}
          <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#0284c7" strokeWidth="1.5" />
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#0284c7" strokeWidth="1.5" />

          {/* Çentikler ve Derece Yazıları */}
          {ticks.map((t) => (
            <g key={`tick-${t.d}`}>
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
                  className="text-[9px] font-black font-sans pointer-events-none"
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
              fillOpacity="0.3"
              stroke="#d97706"
              strokeWidth="2"
            />
          )}

          {/* İnteraktif Açı İbresi (Kol) */}
          <line
            x1="0"
            y1="0"
            x2={Math.cos(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius + 18)}
            y2={-Math.sin(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius + 18)}
            stroke="#ea580c"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* İbre Tutamağı */}
          <circle
            cx={Math.cos(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius + 18)}
            cy={-Math.sin(((protractorAngle + protractorBaseAngle) * Math.PI) / 180) * (protRadius + 18)}
            r="8"
            fill="#f97316"
            stroke="#ffffff"
            strokeWidth="2.5"
            className="cursor-pointer shadow-md"
          />

          {/* Canlı Açı Değer Paneli */}
          <g transform={`translate(0, ${-protRadius - 28})`}>
            <rect
              x="-75"
              y="-14"
              width="150"
              height="28"
              rx="10"
              fill="#0f172a"
              fillOpacity="0.92"
              stroke="#38bdf8"
              strokeWidth="1.5"
              className="shadow-xl"
            />
            <text x="0" y="4" textAnchor="middle" fill="#ffffff" className="font-sans font-black text-xs">
              📐 {protractorAngle}° • {getAngleType(protractorAngle)}
            </text>
          </g>

          {/* Hızlı Açı Seçim Düğmeleri (30°, 45°, 60°, 90°, 120°, 180°) */}
          <g transform={`translate(-110, 24)`}>
            {[30, 45, 60, 90, 120, 135, 180].map((deg, i) => (
              <g
                key={`deg-btn-${deg}`}
                transform={`translate(${i * 32}, 0)`}
                className="cursor-pointer"
                onClick={() => setProtractorAngle(deg)}
              >
                <rect
                  width="28"
                  height="20"
                  rx="6"
                  fill={protractorAngle === deg ? '#0284c7' : '#ffffff'}
                  stroke="#0284c7"
                  strokeWidth="1.2"
                  className="shadow-xs"
                />
                <text
                  x="14"
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
          className="cursor-move"
        >
          {/* Cetvel Gövdesi */}
          <rect
            x="0"
            y="-22"
            width={rulerLength * viewport.zoom}
            height="44"
            rx="6"
            fill="#fef08a"
            fillOpacity="0.88"
            stroke="#ca8a04"
            strokeWidth="2"
            className="shadow-xl backdrop-blur-sm"
          />

          {/* Santimetre / Birim Çentikleri */}
          {Array.from({ length: rulerLength + 1 }).map((_, cm) => {
            const xPos = cm * viewport.zoom;
            return (
              <g key={`cm-${cm}`}>
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
                  [1, 2, 3, 4, 5, 6, 7, 8, 9].map((mm) => (
                    <line
                      key={`mm-${cm}-${mm}`}
                      x1={xPos + (mm * viewport.zoom) / 10}
                      y1="-22"
                      x2={xPos + (mm * viewport.zoom) / 10}
                      y2={mm === 5 ? '-10' : '-16'}
                      stroke="#a16207"
                      strokeWidth={mm === 5 ? 1.2 : 0.75}
                    />
                  ))}
              </g>
            );
          })}

          {/* Cetvel Bilgi Rozeti */}
          <g transform={`translate(${((rulerLength * viewport.zoom) / 2) - 45}, -40)`}>
            <rect
              width="90"
              height="24"
              rx="8"
              fill="#0f172a"
              fillOpacity="0.9"
              stroke="#ca8a04"
              strokeWidth="1"
            />
            <text x="45" y="16" textAnchor="middle" fill="#ffffff" className="font-bold text-[10px]">
              📏 {rulerLength} Birim (cm)
            </text>
          </g>
        </g>
      )}

      {/* 3. İNTERAKTİF GÖNYE (SET SQUARE - 90° & 45°/45°) */}
      {activeTool === 'setsquare' && (
        <g
          transform={`translate(${setsquareScreen.x}, ${setsquareScreen.y}) rotate(${setsquareRotation})`}
          className="cursor-move"
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

      {/* 4. ALAN MODELLEME IZGARASI (AREA MODEL) */}
      {activeTool === 'area_model' && (
        <g transform={`translate(${areaScreen.x}, ${areaScreen.y})`}>
          {/* Birim Kareler Izgarası */}
          {Array.from({ length: areaRows }).map((_, r) =>
            Array.from({ length: areaCols }).map((_, c) => (
              <rect
                key={`grid-${r}-${c}`}
                x={c * viewport.zoom}
                y={-r * viewport.zoom - viewport.zoom}
                width={viewport.zoom}
                height={viewport.zoom}
                fill={(r + c) % 2 === 0 ? '#6ee7b7' : '#a7f3d0'}
                fillOpacity="0.4"
                stroke="#059669"
                strokeWidth="1.2"
              />
            ))
          )}

          {/* Toplam Alan ve Boyut Göstergesi */}
          <g transform={`translate(${((areaCols * viewport.zoom) / 2) - 80}, ${-areaRows * viewport.zoom - 30})`}>
            <rect
              width="160"
              height="26"
              rx="8"
              fill="#065f46"
              stroke="#34d399"
              strokeWidth="1.5"
              className="shadow-lg"
            />
            <text x="80" y="17" textAnchor="middle" fill="#ffffff" className="font-black text-xs font-sans">
              🟩 {areaCols} × {areaRows} = {areaCols * areaRows} Birimkare (br²)
            </text>
          </g>
        </g>
      )}
    </g>
  );
}
