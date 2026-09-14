import type { CircleObject, LineObject, MathObject, PointObject, RayObject, SegmentObject } from '@/types/math';
import { intersectShapes, intersectionShape } from '../../../commandBindings';
import { COLORS, type CommandScene, fail } from '../../scene';

type Construction = NonNullable<PointObject['construction']>;
type Kind = Construction['kind'];

const sameSet = (x: string[], y: string[]) => x.length === y.length && x.every(id => y.includes(id));

/** Aynı kurala sahip, sahnede zaten bulunan inşa noktası. */
export function findConstructed<K extends Kind>(scene: CommandScene, kind: K, test: (rule: Extract<Construction, { kind: K }>) => boolean): PointObject | undefined {
  return scene.points().find(p => p.construction?.kind === kind && test(p.construction as Extract<Construction, { kind: K }>));
}

/** Tercih edilen ad boşsa onu, değilse sıradaki adı verir. */
export function freeName(scene: CommandScene, preferred?: string): string | undefined {
  if (!preferred) return undefined;
  return scene.findPoint(preferred) ? undefined : preferred;
}

/** Gizli yardımcı nokta adı: görünen adları (D, E…) tüketmesin. */
export function helperName(scene: CommandScene, base: string): string {
  const clean = base.replace(/[^\p{L}\p{N}_]/gu, '') || 'Y';
  let name = `${clean}_y`;
  for (let i = 2; scene.findPoint(name); i++) name = `${clean}_y${i}`;
  return name;
}

export interface Made<T> { object: T; created: boolean }

export function ensureMidpoint(scene: CommandScene, aId: string, bId: string, o: { name?: string; color?: string } = {}): Made<PointObject> {
  if (aId === bId) fail('Orta nokta için iki farklı nokta gerekir.');
  const existing = findConstructed(scene, 'midpoint', r => sameSet(r.pointIds, [aId, bId]));
  if (existing) return { object: existing, created: false };
  const a = scene.point(aId), b = scene.point(bId);
  const point = scene.addPoint({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, {
    label: o.name, color: o.color ?? COLORS.construction, construction: { kind: 'midpoint', pointIds: [aId, bId] },
  });
  return { object: point, created: true };
}

export function ensureRatioPoint(scene: CommandScene, aId: string, bId: string, t: number, o: { name?: string } = {}): Made<PointObject> {
  if (!Number.isFinite(t)) fail('Bölme oranı hesaplanamadı.');
  const existing = findConstructed(scene, 'ratio', r => r.pointIds[0] === aId && r.pointIds[1] === bId && Math.abs(r.t - t) < 1e-12)
    ?? (Math.abs(t - 0.5) < 1e-12 ? findConstructed(scene, 'midpoint', r => sameSet(r.pointIds, [aId, bId])) : undefined);
  if (existing) return { object: existing, created: false };
  const a = scene.point(aId), b = scene.point(bId);
  const point = scene.addPoint({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, {
    label: o.name, color: COLORS.construction, construction: { kind: 'ratio', pointIds: [aId, bId], t },
  });
  return { object: point, created: true };
}

export function ensureFoot(scene: CommandScene, sourceId: string, line: [string, string], o: { name?: string; hidden?: boolean; color?: string } = {}): Made<PointObject> {
  const existing = findConstructed(scene, 'foot', r => r.sourceId === sourceId && sameSet(r.linePointIds, line));
  if (existing) return { object: existing, created: false };
  const p = scene.point(sourceId), a = scene.point(line[0]), b = scene.point(line[1]);
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) fail(`${a.label} ve ${b.label} aynı konumda; doğru tanımsız.`);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  const point = scene.addPoint({ x: a.x + t * dx, y: a.y + t * dy }, {
    label: o.hidden ? helperName(scene, p.label) : o.name, color: o.color ?? COLORS.construction,
    construction: { kind: 'foot', sourceId, linePointIds: line }, ...(o.hidden ? { visible: false, showLabel: false } : {}),
  });
  return { object: point, created: true };
}

/** Ayağın doğru parçasının dışında (uzantıda) kalıp kalmadığı. */
export function footOutside(scene: CommandScene, foot: PointObject, line: [string, string]): boolean {
  const a = scene.point(line[0]), b = scene.point(line[1]);
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  const t = ((foot.x - a.x) * dx + (foot.y - a.y) * dy) / len2;
  return t < -1e-9 || t > 1 + 1e-9;
}

/** Noktanın doğruya uzaklığı. */
export function distanceToLine(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  return len < 1e-12 ? Math.hypot(p.x - a.x, p.y - a.y) : Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

/** throughId'den geçen, AB'ye paralel/dik doğru (Dik Doğru / Paralel Doğru araçlarıyla aynı alanlar, ama canlı). */
export function ensureDirectionLine(scene: CommandScene, throughId: string, line: [string, string], mode: 'parallel' | 'perpendicular', lineName: string, o: { color?: string; label?: string } = {}): Made<LineObject> & { helper: PointObject } {
  const helpers = scene.points().filter(p => p.construction?.kind === 'direction' && p.construction.mode === mode
    && p.construction.throughId === throughId && sameSet(p.construction.linePointIds, line));
  for (const helper of helpers) {
    const existing = scene.ofType('line').find(l => sameSet([l.point1Id, l.point2Id], [throughId, helper.id]));
    if (existing) return { object: existing, created: false, helper };
  }
  const through = scene.point(throughId);
  const a = scene.point(line[0]), b = scene.point(line[1]);
  const dx = b.x - a.x, dy = b.y - a.y;
  if (dx * dx + dy * dy < 1e-12) fail(`${a.label} ve ${b.label} aynı konumda; doğrultu tanımsız.`);
  const color = o.color ?? COLORS.parallel;
  const helper = scene.addPoint(mode === 'parallel' ? { x: through.x + dx, y: through.y + dy } : { x: through.x - dy, y: through.y + dx }, {
    color, construction: { kind: 'direction', throughId, linePointIds: line, mode },
  });
  const label = o.label ?? `${mode === 'parallel' ? 'Paralel doğru' : 'Dik doğru'}: ${through.label} / ${lineName}`;
  const object = scene.addLine(throughId, helper.id, { label, color, showEquation: false, reuse: false });
  return { object, created: true, helper };
}

/** [AB] orta dikmesi: canlı orta nokta + canlı dik doğrultu noktası + doğru. */
export function ensurePerpBisector(scene: CommandScene, aId: string, bId: string): Made<LineObject> & { mid: PointObject } {
  const a = scene.point(aId), b = scene.point(bId);
  if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-12) fail('Orta dikme kurulamadı: noktalar çakışık.');
  const mid = ensureMidpoint(scene, aId, bId, { color: COLORS.perpBisector }).object;
  const made = ensureDirectionLine(scene, mid.id, [aId, bId], 'perpendicular', `${a.label}${b.label}`, {
    color: COLORS.perpBisector, label: `[${a.label}${b.label}] Orta Dikmesi`,
  });
  return { object: made.object, created: made.created, mid };
}

/** ∠(P1, V, P3) açıortay ışını (Açıortay aracı gibi, canlı). */
export function ensureBisectorRay(scene: CommandScene, p1: string, v: string, p3: string): Made<RayObject> & { helper: PointObject } {
  if (new Set([p1, v, p3]).size !== 3) fail('Açıortay için üç farklı nokta gerekir.');
  const helpers = scene.points().filter(p => p.construction?.kind === 'bisector' && p.construction.pointIds[1] === v
    && sameSet([p.construction.pointIds[0], p.construction.pointIds[2]], [p1, p3]));
  for (const helper of helpers) {
    const ray = scene.ofType('ray').find(r => r.startPointId === v && r.throughPointId === helper.id);
    if (ray) return { object: ray, created: false, helper };
  }
  const [A, V, C] = [p1, v, p3].map(id => scene.point(id));
  const helper = scene.addPoint(V, { color: COLORS.bisector, construction: { kind: 'bisector', pointIds: [p1, v, p3] } });
  const object = scene.addRay(v, helper.id, { label: `${A.label}${V.label}${C.label} Açıortayı`, color: COLORS.bisector });
  return { object, created: true, helper };
}

export type Intersectable = Extract<MathObject, { type: 'segment' | 'line' | 'ray' | 'circle' | 'arc' | 'sector' | 'ellipse' }>;
export const INTERSECTABLE = ['line', 'segment', 'ray', 'circle', 'arc', 'sector', 'ellipse'] as const;

/** İki nesnenin şu anki kesişim noktaları (araçtaki sırayla). Desteklenmeyen çiftte null. */
export function currentIntersections(scene: CommandScene, first: MathObject, second: MathObject) {
  const point = (id: string) => scene.point(id);
  const s1 = intersectionShape(first, point), s2 = intersectionShape(second, point);
  if (!s1 || !s2) return null;
  return intersectShapes(s1, s2);
}

export function segmentParameter(scene: CommandScene, object: MathObject, p: { x: number; y: number }): number | null {
  const line = scene.lineOf(object);
  if (!line) return null;
  const [a, b] = line;
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  return len2 < 1e-12 ? null : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
}

export type SegmentLike = SegmentObject | LineObject | RayObject;
export type CircleLike = CircleObject;
