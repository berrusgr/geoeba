// Koordinat Dönüşümleri ve Izgara Hesaplama Modülü

import { Point2D, ScreenPoint, ViewportTransform } from '@/types/math';

/**
 * Matematiksel dünya koordinatını (x, y) SVG ekran pikseline (px, py) dönüştürür.
 * Matematik koordinatında +Y yukarıdır, ekran koordinatında ise +Y aşağı doğrudur.
 */
export function worldToScreen(
  point: Point2D,
  transform: ViewportTransform
): ScreenPoint {
  const centerX = transform.width / 2 + transform.panX;
  const centerY = transform.height / 2 + transform.panY;

  return {
    x: centerX + point.x * transform.zoom,
    y: centerY - point.y * transform.zoom, // Y ekseni ters çevrilir
  };
}

/**
 * SVG ekran pikselini (px, py) matematiksel dünya koordinatına (x, y) dönüştürür.
 */
export function screenToWorld(
  screenPoint: ScreenPoint,
  transform: ViewportTransform
): Point2D {
  const centerX = transform.width / 2 + transform.panX;
  const centerY = transform.height / 2 + transform.panY;

  return {
    x: (screenPoint.x - centerX) / transform.zoom,
    y: -(screenPoint.y - centerY) / transform.zoom,
  };
}

/**
 * Koordinatı en yakın ızgara adımına yapıştırır (Snap to Grid).
 */
export function snapToGridPoint(point: Point2D, step: number = 0.5): Point2D {
  return {
    x: Math.round(point.x / step) * step,
    y: Math.round(point.y / step) * step,
  };
}

/**
 * Ekranın kapsadığı matematiksel dünya sınırlarını hesaplar.
 */
export function getVisibleWorldBounds(transform: ViewportTransform) {
  const topLeft = screenToWorld({ x: 0, y: 0 }, transform);
  const bottomRight = screenToWorld(
    { x: transform.width, y: transform.height },
    transform
  );

  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    maxX: Math.max(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxY: Math.max(topLeft.y, bottomRight.y),
  };
}

/**
 * Mevcut zoom düzeyine göre uygun ızgara adım aralığını (step) belirler.
 */
export function getAdaptiveGridStep(zoom: number): { step: number; subStep: number } {
  // zoom: 1 birim kaç piksel
  if (zoom >= 80) {
    return { step: 0.5, subStep: 0.1 };
  } else if (zoom >= 26) {
    return { step: 1, subStep: 0.5 };
  } else if (zoom >= 13) {
    return { step: 2, subStep: 1 };
  } else if (zoom >= 6) {
    return { step: 5, subStep: 1 };
  } else if (zoom >= 3) {
    return { step: 10, subStep: 2 };
  } else {
    return { step: 20, subStep: 5 };
  }
}

/**
 * Sayıyı Türkçe matematik standardında formatlar (Örn: 5,2 veya 12)
 */
export function formatTurkishNumber(val: number, maxDecimals: number = 2): string {
  if (Number.isInteger(val)) {
    return val.toString();
  }
  const rounded = Number(val.toFixed(maxDecimals));
  return rounded.toString().replace('.', ',');
}

/**
 * Koordinat gösterimi üretir: (x, y) -> "(2,5; -3)"
 */
export function formatCoordinate(point: Point2D, maxDecimals: number = 2): string {
  const xStr = formatTurkishNumber(point.x, maxDecimals);
  const yStr = formatTurkishNumber(point.y, maxDecimals);
  return `(${xStr}; ${yStr})`;
}
