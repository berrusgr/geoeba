// Deterministik Geometrik Hesaplama ve Analiz Modülü

import { Point2D } from '@/types/math';
import { formatTurkishNumber } from './coordinates';

/**
 * İki nokta arasındaki Öklid mesafesini hesaplar.
 */
export function calculateDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * İki noktanın orta noktasını hesaplar.
 */
export function calculateMidpoint(p1: Point2D, p2: Point2D): Point2D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Üç nokta arasındaki açıyı (derece cinsinden) hesaplar.
 * vertex: Açının köşe noktası (B)
 * p1: Birinci kol üzerindeki nokta (A)
 * p2: İkinci kol üzerindeki nokta (C)
 * Döndürülen açı [0, 180] derece arasındadır.
 */
export function calculateAngleDegrees(
  p1: Point2D,
  vertex: Point2D,
  p2: Point2D
): number {
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;
  const v2x = p2.x - vertex.x;
  const v2y = p2.y - vertex.y;

  const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (len1 === 0 || len2 === 0) return 0;

  const dot = v1x * v2x + v1y * v2y;
  let cosTheta = dot / (len1 * len2);
  // Hassasiyet taşmalarını engelle
  cosTheta = Math.max(-1, Math.min(1, cosTheta));

  const rad = Math.acos(cosTheta);
  return (rad * 180) / Math.PI;
}

/**
 * Açının başlangıç ve bitiş radyan açılarını (ekran/saat yönü referanslı) hesaplar.
 * SVG yay (arc) çizimi için kullanılır.
 */
export function getAngleArcAngles(
  p1: Point2D,
  vertex: Point2D,
  p2: Point2D
): { startAngle: number; endAngle: number; sweepAngle: number; isClockwise: boolean } {
  // Matematiksel açılar (radyan)
  const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
  const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);

  let diff = angle2 - angle1;
  while (diff < 0) diff += 2 * Math.PI;
  while (diff >= 2 * Math.PI) diff -= 2 * Math.PI;

  return {
    startAngle: angle1,
    endAngle: angle2,
    sweepAngle: diff,
    isClockwise: diff > Math.PI,
  };
}

/**
 * Sıralı köşe noktalarına sahip çokgenin alanını (Shoelace / Gauss formülü) hesaplar.
 */
export function calculatePolygonArea(points: Point2D[]): number {
  const n = points.length;
  if (n < 3) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    sum += current.x * next.y - next.x * current.y;
  }

  return Math.abs(sum) / 2;
}

/**
 * Sıralı köşe noktalarına sahip çokgenin çevresini hesaplar.
 */
export function calculatePolygonPerimeter(points: Point2D[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    perimeter += calculateDistance(current, next);
  }

  return perimeter;
}

/**
 * Çemberin alanını (pi * r^2) hesaplar.
 */
export function calculateCircleArea(radius: number): number {
  return Math.PI * radius * radius;
}

/**
 * Çemberin çevresini (2 * pi * r) hesaplar.
 */
export function calculateCircleCircumference(radius: number): number {
  return 2 * Math.PI * radius;
}

/**
 * İki noktadan geçen doğrunun denklemini ve eğimini hesaplar.
 */
export function calculateLineEquation(
  p1: Point2D,
  p2: Point2D
): { slope: number | null; intercept: number | null; equationText: string } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Düşey doğru (x = sabit)
  if (Math.abs(dx) < 1e-6) {
    const xVal = formatTurkishNumber(p1.x);
    return {
      slope: null,
      intercept: null,
      equationText: `x = ${xVal}`,
    };
  }

  const slope = dy / dx;
  const intercept = p1.y - slope * p1.x;

  const mStr = Math.abs(slope - 1) < 1e-6 ? '' : Math.abs(slope + 1) < 1e-6 ? '-' : formatTurkishNumber(slope);
  const nStr = formatTurkishNumber(Math.abs(intercept));

  let eq = 'y = ';
  if (Math.abs(slope) < 1e-6) {
    eq += formatTurkishNumber(intercept);
  } else {
    eq += `${mStr}x`;
    if (Math.abs(intercept) > 1e-6) {
      eq += intercept > 0 ? ` + ${nStr}` : ` - ${nStr}`;
    }
  }

  return {
    slope,
    intercept,
    equationText: eq,
  };
}

/**
 * Bir noktanın doğru parçasına en yakın mesafesini ve projeksiyonunu bulur.
 */
export function distanceToSegment(
  point: Point2D,
  segStart: Point2D,
  segEnd: Point2D
): { distance: number; projection: Point2D } {
  const l2 =
    (segEnd.x - segStart.x) * (segEnd.x - segStart.x) +
    (segEnd.y - segStart.y) * (segEnd.y - segStart.y);

  if (l2 === 0) {
    return {
      distance: calculateDistance(point, segStart),
      projection: segStart,
    };
  }

  let t =
    ((point.x - segStart.x) * (segEnd.x - segStart.x) +
      (point.y - segStart.y) * (segEnd.y - segStart.y)) /
    l2;
  t = Math.max(0, Math.min(1, t));

  const projection: Point2D = {
    x: segStart.x + t * (segEnd.x - segStart.x),
    y: segStart.y + t * (segEnd.y - segStart.y),
  };

  return {
    distance: calculateDistance(point, projection),
    projection,
  };
}

/**
 * Yeni oluşturulacak nokta için sıradaki harf etiketini (A, B, C ... Z, A1, B1 ...) üretir.
 */
export function generateNextPointLabel(existingLabels: string[]): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const labelSet = new Set(existingLabels);

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    if (!labelSet.has(letter)) {
      return letter;
    }
  }

  let suffix = 1;
  while (true) {
    for (let i = 0; i < letters.length; i++) {
      const candidate = `${letters[i]}_${suffix}`;
      if (!labelSet.has(candidate)) {
        return candidate;
      }
    }
    suffix++;
  }
}
