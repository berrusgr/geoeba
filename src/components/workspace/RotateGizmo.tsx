'use client';

import React from 'react';
import { formatTurkishNumber } from '@/math/coordinates';

interface RotateGizmoProps {
  /** Döndürme merkezinin EKRAN koordinatı (piksel). */
  center: { x: number; y: number };
  /** Serbest sürükleme sırasında gösterilecek derece; sürükleme yoksa null. */
  feedbackDeg: number | null;
  /** 🔄 ikonuna basıldığında serbest döndürmeyi başlatır. */
  onFreeRotateStart: (e: React.MouseEvent) => void;
  /** Hazır derece düğmelerine tıklandığında çağrılır (saat yönü tersi pozitif). */
  onRotate: (deg: number) => void;
}

const HAZIR_DERECELER = [30, 45, 60, 90, 120, 135, 180, 270];

/**
 * Döndürme paleti: merkez pivotu, serbest döndürme kolu ve hazır derece düğmeleri.
 *
 * Yalnızca SEÇİLİ şekil için çizilir. Daha önce her çokgen kendi paletini çiziyordu;
 * birkaç şekil varken paletler üst üste binip tuvali okunmaz hâle getiriyordu.
 *
 * Çokgen, yay ve daire dilimi katmanlarının hepsi bu bileşeni kullanır; böylece
 * palet her şekilde aynı görünür ve tek yerden değişir.
 */
export function RotateGizmo({ center, feedbackDeg, onFreeRotateStart, onRotate }: RotateGizmoProps) {
  return (
    <g className="rotate-gizmo-layer select-none">
      {/* A) Merkez Döndürme Noktası (Pivot) */}
      <circle
        cx={center.x}
        cy={center.y}
        r={6}
        fill="#4f46e5"
        stroke="#ffffff"
        strokeWidth={2}
        className="shadow-sm"
      />
      <circle cx={center.x} cy={center.y} r={2} fill="#ffffff" />

      {/* B) Bağlantı Kolu */}
      <line
        x1={center.x}
        y1={center.y}
        x2={center.x}
        y2={center.y - 48}
        stroke="#4f46e5"
        strokeWidth={2}
        strokeDasharray="3,3"
      />

      {/* C) Serbest Döndür İkonu (basılı tutup sürükleyin; Shift 15°'ye yuvarlar) */}
      <g
        transform={`translate(${center.x}, ${center.y - 48})`}
        onMouseDown={onFreeRotateStart}
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

      {/* D) Canlı Sürükleme Derecesi */}
      {feedbackDeg !== null && (
        <g transform={`translate(${center.x}, ${center.y - 82})`}>
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
          <text x="0" y="5" textAnchor="middle" fill="#ffffff" className="font-black text-xs font-mono">
            🔄 {formatTurkishNumber(feedbackDeg)}°
          </text>
        </g>
      )}

      {/* E) Hazır Derece Düğmeleri */}
      <g transform={`translate(${center.x - 170}, ${center.y + 44})`}>
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
        {HAZIR_DERECELER.map((deg, i) => (
          <g
            key={`rot-deg-${deg}`}
            transform={`translate(${8 + i * 35}, 6)`}
            className="cursor-pointer group/deg"
            onClick={(e) => {
              e.stopPropagation();
              onRotate(deg);
            }}
          >
            <rect
              width={31}
              height={22}
              rx={6}
              fill="#1e293b"
              stroke="#4f46e5"
              strokeWidth={1}
              className="group-hover/deg:fill-indigo-600 transition-colors shadow-sm"
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
        {/* ↷ Saat yönünde 90° */}
        <g
          transform="translate(290, 6)"
          className="cursor-pointer group/deg"
          onClick={(e) => {
            e.stopPropagation();
            onRotate(-90);
          }}
        >
          <rect
            width={42}
            height={22}
            rx={6}
            fill="#4f46e5"
            className="group-hover/deg:fill-indigo-500 transition-colors shadow-sm"
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
  );
}
