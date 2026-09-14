import type { MathObject, ObjectType, Point2D, PolygonObject } from '@/types/math';
import { type CommandScene, fail } from '../../scene';

/** Üzerine nokta konabilen nesnelerin sade geometrisi (araçtaki "nesne üzerinde nokta" ile aynı türler). */
export type HostGeometry =
  | { kind: 'segment' | 'line' | 'ray'; a: Point2D; b: Point2D }
  | { kind: 'circle'; center: Point2D; radius: number; start?: number; sweep?: number }
  | { kind: 'ellipse'; center: Point2D; rx: number; ry: number; rotation: number }
  | { kind: 'polygon'; vertices: Point2D[]; edge?: number };

export const HOST_TYPES: ObjectType[] = ['segment', 'line', 'ray', 'circle', 'ellipse', 'arc', 'sector', 'polygon'];

/** Mesajlarda etiketten sonra gelen tamlama adı: "ABC çokgeni üzerine", "[AB] doğru parçası üzerine". */
export const HOST_NOUNS: Record<string, string> = {
  segment: 'doğru parçası', line: 'doğrusu', ray: 'ışını', circle: 'çemberi', ellipse: 'elipsi', arc: 'yayı', sector: 'daire dilimi', polygon: 'çokgeni',
};

export function hostGeometry(scene: CommandScene, obj: MathObject): HostGeometry {
  switch (obj.type) {
    case 'segment':
    case 'line':
    case 'ray': {
      const [a, b] = scene.lineOf(obj)!;
      if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-12) fail(`${obj.label} nesnesinin iki noktası çakışık; üzerine nokta konamaz.`);
      return { kind: obj.type, a, b };
    }
    case 'circle': {
      let g: { center: Point2D; radius: number } | null = null;
      try { g = scene.circleOf(obj); } catch { g = null; }
      if (!g || !(g.radius > 0)) fail(`${obj.label} çemberinin yarıçapı hesaplanamadı; üzerine nokta konamaz.`);
      return { kind: 'circle', center: g.center, radius: g.radius };
    }
    case 'arc':
    case 'sector': {
      const c = scene.point(obj.centerPointId), s = scene.point(obj.startPointId), d = scene.point(obj.directionPointId);
      const radius = Math.hypot(s.x - c.x, s.y - c.y);
      if (!(radius > 0)) fail(`${obj.label} yayının yarıçapı sıfır; üzerine nokta konamaz.`);
      const start = Math.atan2(s.y - c.y, s.x - c.x);
      let sweep = Math.atan2(d.y - c.y, d.x - c.x) - start;
      while (sweep < 0) sweep += 2 * Math.PI;
      while (sweep >= 2 * Math.PI) sweep -= 2 * Math.PI;
      return { kind: 'circle', center: { x: c.x, y: c.y }, radius, start, sweep: sweep || 2 * Math.PI };
    }
    case 'ellipse': {
      const c = scene.point(obj.centerPointId);
      return { kind: 'ellipse', center: { x: c.x, y: c.y }, rx: obj.radiusX, ry: obj.radiusY, rotation: ((obj.rotation ?? 0) * Math.PI) / 180 };
    }
    case 'polygon':
      return { kind: 'polygon', vertices: scene.vertices(obj as PolygonObject) };
    default:
      return fail(`${obj.label} üzerine nokta konamaz. Doğru parçası, doğru, ışın, çember, elips, yay, daire dilimi ya da çokgen seçin.`);
  }
}

const lerp = (a: Point2D, b: Point2D, t: number): Point2D => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const onCircle = (g: { center: Point2D; radius: number }, angle: number): Point2D => ({ x: g.center.x + g.radius * Math.cos(angle), y: g.center.y + g.radius * Math.sin(angle) });
const onEllipse = (g: { center: Point2D; rx: number; ry: number; rotation: number }, t: number): Point2D => {
  const x = g.rx * Math.cos(t), y = g.ry * Math.sin(t);
  return { x: g.center.x + x * Math.cos(g.rotation) - y * Math.sin(g.rotation), y: g.center.y + x * Math.sin(g.rotation) + y * Math.cos(g.rotation) };
};
const DEG = Math.PI / 180;

/**
 * count = 1 ise tercih sırasına göre aday konumlar (çağıran ilk boş olanı seçer);
 * count > 1 ise nesne boyunca eşit aralıklı count konum.
 */
export function hostSpots(g: HostGeometry, count: number): Point2D[] {
  const even = (i: number) => (i + 1) / (count + 1);
  switch (g.kind) {
    case 'segment':
      return count === 1 ? [0.25, 0.75, 0.4, 0.6, 0.1, 0.9].map(t => lerp(g.a, g.b, t)) : Array.from({ length: count }, (_, i) => lerp(g.a, g.b, even(i)));
    case 'line':
      return count === 1 ? [0.25, 0.75, -0.5, 1.5, 0.4, 0.6].map(t => lerp(g.a, g.b, t)) : Array.from({ length: count }, (_, i) => lerp(g.a, g.b, even(i)));
    case 'ray':
      return count === 1 ? [0.5, 1.5, 2, 0.25].map(t => lerp(g.a, g.b, t)) : Array.from({ length: count }, (_, i) => lerp(g.a, g.b, 2 * even(i)));
    case 'circle': {
      if (g.start !== undefined && g.sweep !== undefined) {
        const at = (f: number) => onCircle(g, g.start! + g.sweep! * f);
        return count === 1 ? [0.5, 0.25, 0.75, 0.4, 0.6].map(at) : Array.from({ length: count }, (_, i) => at(even(i)));
      }
      return count === 1 ? [90, 0, 180, 270, 45, 135, 225, 315, 60, 120].map(d => onCircle(g, d * DEG)) : Array.from({ length: count }, (_, i) => onCircle(g, (90 + (360 * i) / count) * DEG));
    }
    case 'ellipse':
      return count === 1 ? [90, 0, 180, 270, 45, 135, 225, 315].map(d => onEllipse(g, d * DEG)) : Array.from({ length: count }, (_, i) => onEllipse(g, (90 + (360 * i) / count) * DEG));
    case 'polygon': {
      const v = g.vertices, n = v.length;
      const edges = g.edge !== undefined ? [g.edge] : v.map((_, i) => i);
      if (count === 1) return [0.5, 0.25, 0.75].flatMap(t => edges.map(i => lerp(v[i], v[(i + 1) % n], t)));
      if (g.edge !== undefined) return Array.from({ length: count }, (_, i) => lerp(v[g.edge!], v[(g.edge! + 1) % n], even(i)));
      const lengths = v.map((p, i) => Math.hypot(v[(i + 1) % n].x - p.x, v[(i + 1) % n].y - p.y));
      const total = lengths.reduce((a, b) => a + b, 0);
      return Array.from({ length: count }, (_, k) => {
        let s = ((k + 0.5) / count) * total;
        for (let i = 0; i < n; i++) {
          if (s <= lengths[i] || i === n - 1) return lerp(v[i], v[(i + 1) % n], lengths[i] ? Math.min(1, s / lengths[i]) : 0);
          s -= lengths[i];
        }
        return v[0];
      });
    }
  }
}

function projectToSegment(p: Point2D, a: Point2D, b: Point2D, clamp: [number, number]): { point: Point2D; distance: number } {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  const raw = len2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
  const t = Math.max(clamp[0], Math.min(clamp[1], raw));
  const point = lerp(a, b, t);
  return { point, distance: Math.hypot(point.x - p.x, point.y - p.y) };
}

/** Verilen konuma nesne üzerindeki en yakın nokta (araçtaki iz düşürmeyle aynı mantık). */
export function projectOnto(g: HostGeometry, p: Point2D): Point2D {
  switch (g.kind) {
    case 'segment': return projectToSegment(p, g.a, g.b, [0, 1]).point;
    case 'ray': return projectToSegment(p, g.a, g.b, [0, Infinity]).point;
    case 'line': return projectToSegment(p, g.a, g.b, [-Infinity, Infinity]).point;
    case 'circle': {
      const dx = p.x - g.center.x, dy = p.y - g.center.y, d = Math.hypot(dx, dy);
      return d < 1e-12 ? onCircle(g, Math.PI / 2) : { x: g.center.x + (dx / d) * g.radius, y: g.center.y + (dy / d) * g.radius };
    }
    case 'ellipse': {
      const distance = (t: number) => { const q = onEllipse(g, t); return Math.hypot(q.x - p.x, q.y - p.y); };
      let best = 0;
      for (let i = 1; i < 720; i++) if (distance((i * Math.PI) / 360) < distance(best)) best = (i * Math.PI) / 360;
      let lo = best - Math.PI / 360, hi = best + Math.PI / 360;
      for (let i = 0; i < 60; i++) {
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        if (distance(m1) < distance(m2)) hi = m2; else lo = m1;
      }
      return onEllipse(g, (lo + hi) / 2);
    }
    case 'polygon': {
      const v = g.vertices, n = v.length;
      const edges = g.edge !== undefined ? [g.edge] : v.map((_, i) => i);
      return edges.map(i => projectToSegment(p, v[i], v[(i + 1) % n], [0, 1])).sort((a, b) => a.distance - b.distance)[0].point;
    }
  }
}
