import { MathObject, PointObject, Point2D, SegmentObject, CircleObject, ArcObject, SectorObject, EllipseObject, PolygonObject, LineObject, RayObject } from '@/types/math';
import { getArcGeometry } from './geometry';

/** Bir turun varsayılan süresi (saniye). */
export const DEFAULT_PATH_TOUR_SECONDS = 8;

export interface PointAnimUpdate {
  x: number;
  y: number;
  progress: number;
  direction?: 1 | -1;
}

/**
 * Bir noktanın taşıyıcı nesne üzerindeki mevcut parametresini (0..1, açı veya mesafe) hesaplar.
 */
export function getPointPathParameter(point: PointObject, host: MathObject, scene: MathObject[]): number {
  const byId = new Map(scene.map(o => [o.id, o]));
  const nk = (id: string) => byId.get(id) as PointObject | undefined;

  switch (host.type) {
    case 'segment': {
      const seg = host as SegmentObject;
      const a = nk(seg.startPointId);
      const b = nk(seg.endPointId);
      if (!a || !b) return 0;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-12) return 0;
      const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq;
      return Math.max(0, Math.min(1, t));
    }
    case 'circle': {
      const circ = host as CircleObject;
      const c = nk(circ.centerPointId);
      if (!c) return 0;
      const angle = Math.atan2(point.y - c.y, point.x - c.x);
      return (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    }
    case 'arc':
    case 'sector': {
      const arc = host as ArcObject | SectorObject;
      const c = nk(arc.centerPointId);
      const s = nk(arc.startPointId);
      const e = nk(arc.directionPointId);
      if (!c || !s || !e) return 0;
      const geo = getArcGeometry(c, s, e);
      if (!geo) return 0;
      const rawAngle = Math.atan2(point.y - c.y, point.x - c.x);
      const relAngle = ((rawAngle - geo.startAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const sweep = Math.max(1e-4, geo.sweep);
      return Math.max(0, Math.min(1, relAngle / sweep));
    }
    case 'ellipse': {
      const elp = host as EllipseObject;
      const c = nk(elp.centerPointId);
      if (!c) return 0;
      const angle = Math.atan2((point.y - c.y) / (elp.radiusY || 1), (point.x - c.x) / (elp.radiusX || 1));
      return (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    }
    case 'polygon': {
      const poly = host as PolygonObject;
      const vertices = poly.pointIds.map(nk).filter(Boolean) as PointObject[];
      if (vertices.length < 2) return 0;
      let totalLen = 0;
      const edgeLengths: number[] = [];
      for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];
        const d = Math.hypot(v2.x - v1.x, v2.y - v1.y);
        edgeLengths.push(d);
        totalLen += d;
      }
      if (totalLen < 1e-9) return 0;

      // En yakın kenarı ve o kenar üzerindeki konumu bul
      let bestDist = Infinity;
      let bestS = 0;
      let accumulated = 0;

      for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];
        const edgeLen = edgeLengths[i];
        if (edgeLen < 1e-9) continue;
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const t = Math.max(0, Math.min(1, ((point.x - v1.x) * dx + (point.y - v1.y) * dy) / (edgeLen * edgeLen)));
        const px = v1.x + dx * t;
        const py = v1.y + dy * t;
        const dist = Math.hypot(point.x - px, point.y - py);
        if (dist < bestDist) {
          bestDist = dist;
          bestS = accumulated + t * edgeLen;
        }
        accumulated += edgeLen;
      }
      return bestS / totalLen;
    }
    case 'line':
    case 'ray': {
      const a = host.type === 'line' ? nk((host as LineObject).point1Id) : nk((host as RayObject).startPointId);
      const b = host.type === 'line' ? nk((host as LineObject).point2Id) : nk((host as RayObject).throughPointId);
      if (!a || !b) return 0;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-12) return 0;
      return ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq;
    }
    default:
      return 0;
  }
}

/**
 * Parametre değerine göre nokta koordinatlarını verir.
 */
export function evaluatePointOnPath(
  param: number,
  host: MathObject,
  scene: MathObject[]
): Point2D | null {
  const byId = new Map(scene.map(o => [o.id, o]));
  const nk = (id: string) => byId.get(id) as PointObject | undefined;

  switch (host.type) {
    case 'segment': {
      const seg = host as SegmentObject;
      const a = nk(seg.startPointId);
      const b = nk(seg.endPointId);
      if (!a || !b) return null;
      const t = Math.max(0, Math.min(1, param));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    case 'circle': {
      const circ = host as CircleObject;
      const c = nk(circ.centerPointId);
      if (!c) return null;
      let r = circ.fixedRadius ?? 0;
      if (!r && circ.radiusPointId) {
        const rp = nk(circ.radiusPointId);
        if (rp) r = Math.hypot(rp.x - c.x, rp.y - c.y);
      }
      if (r <= 0) return null;
      return { x: c.x + r * Math.cos(param), y: c.y + r * Math.sin(param) };
    }
    case 'arc':
    case 'sector': {
      const arc = host as ArcObject | SectorObject;
      const c = nk(arc.centerPointId);
      const s = nk(arc.startPointId);
      const e = nk(arc.directionPointId);
      if (!c || !s || !e) return null;
      const geo = getArcGeometry(c, s, e);
      if (!geo) return null;
      const t = Math.max(0, Math.min(1, param));
      const angle = geo.startAngle + t * geo.sweep;
      return { x: c.x + geo.radius * Math.cos(angle), y: c.y + geo.radius * Math.sin(angle) };
    }
    case 'ellipse': {
      const elp = host as EllipseObject;
      const c = nk(elp.centerPointId);
      if (!c) return null;
      const rx = elp.radiusX || 1;
      const ry = elp.radiusY || 1;
      return { x: c.x + rx * Math.cos(param), y: c.y + ry * Math.sin(param) };
    }
    case 'polygon': {
      const poly = host as PolygonObject;
      const vertices = poly.pointIds.map(nk).filter(Boolean) as PointObject[];
      if (vertices.length < 2) return null;
      let totalLen = 0;
      const edgeLengths: number[] = [];
      for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];
        const d = Math.hypot(v2.x - v1.x, v2.y - v1.y);
        edgeLengths.push(d);
        totalLen += d;
      }
      if (totalLen < 1e-9) return null;

      const normParam = ((param % 1) + 1) % 1;
      const targetS = normParam * totalLen;
      let accumulated = 0;

      for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];
        const edgeLen = edgeLengths[i];
        if (accumulated + edgeLen >= targetS || i === vertices.length - 1) {
          const tInEdge = edgeLen > 1e-9 ? Math.max(0, Math.min(1, (targetS - accumulated) / edgeLen)) : 0;
          return {
            x: v1.x + (v2.x - v1.x) * tInEdge,
            y: v1.y + (v2.y - v1.y) * tInEdge,
          };
        }
        accumulated += edgeLen;
      }
      return { x: vertices[0].x, y: vertices[0].y };
    }
    case 'line':
    case 'ray': {
      const a = host.type === 'line' ? nk((host as LineObject).point1Id) : nk((host as RayObject).startPointId);
      const b = host.type === 'line' ? nk((host as LineObject).point2Id) : nk((host as RayObject).throughPointId);
      if (!a || !b) return null;
      const t = host.type === 'ray' ? Math.max(0, param) : param;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    default:
      return null;
  }
}

/**
 * Canlandırılan noktayı bir sonraki kareye taşır.
 */
export function advancePointOnHost(
  point: PointObject,
  host: MathObject,
  scene: MathObject[],
  currentDir: 1 | -1,
  dtSeconds: number,
  tourSeconds: number = DEFAULT_PATH_TOUR_SECONDS
): PointAnimUpdate | null {
  const speed = point.animSpeed ?? 1;
  const mode = point.animMode ?? (host.type === 'circle' || host.type === 'ellipse' || host.type === 'polygon' ? 'increasing' : 'oscillating');
  
  // Mevcut parametre
  let p = point.animProgress !== undefined ? point.animProgress : getPointPathParameter(point, host, scene);
  let dir: 1 | -1 = currentDir;

  if (mode === 'increasing' || mode === 'increasing_once') dir = 1;
  if (mode === 'decreasing') dir = -1;

  const isCyclic = host.type === 'circle' || host.type === 'ellipse';
  const paramRange = isCyclic ? 2 * Math.PI : (host.type === 'line' ? 10 : 1);
  const minVal = host.type === 'line' ? -5 : 0;
  const maxVal = host.type === 'line' ? 5 : paramRange;

  let nextP = p + (dir * (maxVal - minVal) * dtSeconds * speed) / tourSeconds;

  if (isCyclic) {
    if (mode === 'oscillating') {
      if (nextP >= 2 * Math.PI) { nextP = 2 * Math.PI; dir = -1; }
      else if (nextP <= 0) { nextP = 0; dir = 1; }
    } else if (mode === 'increasing') {
      nextP = (nextP % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    } else if (mode === 'decreasing') {
      nextP = (nextP % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    } else if (mode === 'increasing_once') {
      if (nextP >= 2 * Math.PI) nextP = 2 * Math.PI;
    }
  } else {
    if (mode === 'oscillating') {
      if (nextP >= maxVal) { nextP = maxVal; dir = -1; }
      else if (nextP <= minVal) { nextP = minVal; dir = 1; }
    } else if (mode === 'increasing') {
      if (nextP >= maxVal) nextP = minVal + ((nextP - maxVal) % (maxVal - minVal));
    } else if (mode === 'decreasing') {
      if (nextP <= minVal) nextP = maxVal - ((minVal - nextP) % (maxVal - minVal));
    } else if (mode === 'increasing_once') {
      if (nextP >= maxVal) nextP = maxVal;
    }
  }

  const coords = evaluatePointOnPath(nextP, host, scene);
  if (!coords) return null;

  return {
    x: coords.x,
    y: coords.y,
    progress: nextP,
    direction: dir,
  };
}
