import type { FunctionObject, MathObject, Point2D, PointObject } from '@/types/math';
import { intersectShapes, intersectionShape } from '../../../commandBindings';
import { compileMathExpression } from '../../../parser';
import type { Clause } from '../../text';
import { COLORS, type CommandScene, fail, trNum } from '../../scene';
import { helperName } from './build';

/**
 * Fonksiyon grafikleri ve koordinat eksenleriyle çalışan inşalar.
 * Fonksiyonlar ve eksenler canlı inşa noktalarına bağlanamadığı için buradan çıkan noktalar SABİTTİR;
 * iletilerde bu açıkça söylenir.
 */

/** "fonksiyon", "grafik", "parabol", "eğri" (fonksiyonu gösteren adlar). */
export const FUNCTION_NOUN = /\bfonksiyon|\bgrafi[gk]|\bparabol|\begri(?:si|sini|sinin|nin|yi|ye|ler|leri|lerin|lerini)?\b/;
/** "kökleri", "sıfırları": x ekseniyle kesişim. */
export const ROOTS = /\bkok(?:u|unu|unun|leri|lerini|lerinin|ler)\b|\bsifir(?:lari|larini|yeri|yerleri|yerlerini)\b/;

export function functionName(fn: FunctionObject): string | undefined {
  return fn.label.match(/^\s*([A-Za-z][A-Za-z0-9_]{0,3})\s*\(\s*x\s*\)/)?.[1];
}
export function functionTitle(fn: FunctionObject): string {
  return functionName(fn) ?? fn.label;
}

/** Fonksiyonun güncel kaydırıcı değerleriyle hesaplanan hâli; derlenemezse null. */
export function evaluatorOf(scene: CommandScene, fn: FunctionObject): ((x: number) => number) | null {
  const compiled = compileMathExpression(fn.expression);
  if (!compiled) return null;
  const scope = Object.fromEntries(scene.sliders().map(s => [s.variableName, s.value]));
  return x => {
    const y = compiled(x, scope);
    return Number.isFinite(y) ? y : NaN;
  };
}

/**
 * Cümlede adıyla geçen fonksiyonlar ("f", "f nin", "f'nin", "f(x)", "g fonksiyonu") ve bu adların etiket sırası
 * (inşa adları arasında nokta/nesne sanılmasınlar diye).
 */
export function namedFunctions(c: Clause, scene: CommandScene): { fns: FunctionObject[]; labelIndexes: Set<number> } {
  const byName = new Map<string, FunctionObject>();
  for (const fn of scene.ofType('function')) {
    const name = functionName(fn);
    if (name) byName.set(name.toLocaleLowerCase('tr'), fn);
  }
  const fns: FunctionObject[] = [];
  const labelIndexes = new Set<number>();
  if (!byName.size) return { fns, labelIndexes };
  c.words.forEach(word => {
    const label = word.match(/^\$(\d+)/);
    if (label) {
      const ref = c.labels[Number(label[1])];
      const key = ref?.text.toLocaleLowerCase('tr') ?? '';
      // Büyük harfli "F" bir nokta olabilir; yalnızca küçük yazılmışsa ya da o adda nokta yoksa fonksiyon sayılır.
      if (ref && byName.has(key) && (ref.lowercase || !scene.findPoint(ref.text))) {
        fns.push(byName.get(key)!);
        labelIndexes.add(Number(label[1]));
      }
      return;
    }
    const plain = word.match(/^([a-z][a-z0-9]{0,3})$/)?.[1];
    if (plain && byName.has(plain)) fns.push(byName.get(plain)!);
  });
  return { fns: [...new Set(fns)], labelIndexes };
}

type Linear = { m: number; b: number } | { vertical: number };

/** Fonksiyon doğrusal mı? (y = mx + n) Değilse null. */
export function linearOf(f: ((x: number) => number) | null): { m: number; b: number } | null {
  if (!f) return null;
  const b = f(0), m = f(1) - b;
  if (!Number.isFinite(b) || !Number.isFinite(m)) return null;
  for (const x of [-7.3, -2.1, 0.5, 3.7, 9.2, 41]) {
    const y = f(x);
    if (!Number.isFinite(y) || Math.abs(y - (m * x + b)) > 1e-7 * (1 + Math.abs(y))) return null;
  }
  return { m, b };
}

/** Cümlede yazılmış doğru denklemi: "y = 2x + 1 doğrusuna", "f(x) = 3 - x doğrusuna", "x = 2 doğrusuna". */
function inlineLine(c: Clause): { coef: Linear; text: string } | null {
  const raw = c.raw.replace(/[−–—]/g, '-');
  const stop = String.raw`(?:\s*['’][a-zçğıöşü]+(?=\s|$)|\s+(?:do[gğ]ru|fonksiyon|grafi))`;
  const vertical = raw.match(new RegExp(String.raw`(?:^|\s)x\s*=\s*(-?\d+(?:[.,]\d+)?)${stop}`, 'i'));
  if (vertical) {
    const k = Number(vertical[1].replace(',', '.'));
    return { coef: { vertical: k }, text: `x = ${trNum(k)}` };
  }
  const slope = raw.match(new RegExp(String.raw`(?:^|\s)(y|[a-zA-Z]\s*\(\s*x\s*\))\s*=\s*([^'’=]+?)${stop}`, 'i'));
  if (!slope) return null;
  const expression = slope[2].trim().replace(/(\d),(\d)/g, '$1.$2');
  const compiled = compileMathExpression(expression);
  const coef = linearOf(compiled ? (x => compiled(x)) : null);
  if (!coef) fail(`“${slope[2].trim()}” bir doğru denklemi değil; paralel ya da dik doğru yalnızca y = mx + n biçimindeki doğrulara çizilebilir.`);
  return { coef, text: `${slope[1].replace(/\s+/g, '')} = ${slope[2].trim()}` };
}

const sameLinear = (x: Linear, y: Linear | null) => !!y && ('vertical' in x
  ? 'vertical' in y && Math.abs(x.vertical - y.vertical) < 1e-9
  : !('vertical' in y) && Math.abs(x.m - y.m) < 1e-9 && Math.abs(x.b - y.b) < 1e-9);

function hiddenPoint(scene: CommandScene, position: Point2D, base: string): PointObject {
  const existing = scene.points().find(p => !p.visible && !p.construction && Math.abs(p.x - position.x) < 1e-9 && Math.abs(p.y - position.y) < 1e-9);
  return existing ?? scene.addPoint(position, { label: helperName(scene, base), visible: false, showLabel: false, color: COLORS.construction });
}

/**
 * Paralel/dik doğrunun dayanağı bir doğrusal fonksiyon ya da yazılmış bir doğru denklemiyse iki gizli yardımcı nokta kurar.
 * Uygulanamıyorsa null (cümlede fonksiyon yok). Fonksiyon doğrusal değilse açıklamayla reddeder.
 */
export function functionLineSpec(c: Clause, scene: CommandScene): { a: PointObject; b: PointObject; name: string; note: string } | null {
  const functions = scene.ofType('function');
  const inline = inlineLine(c);
  let fn: FunctionObject | undefined;
  let coef: Linear;
  let name: string;
  if (inline) {
    coef = inline.coef;
    fn = functions.find(f => sameLinear(inline.coef, linearOf(evaluatorOf(scene, f))));
    name = fn ? fn.label : inline.text;
  } else {
    const named = namedFunctions(c, scene).fns;
    if (named.length > 1) fail(`Birden fazla fonksiyon yazıldı (${named.map(functionTitle).join(', ')}). Hangisine göre çizileceğini tek fonksiyon olarak yazın.`);
    fn = named[0];
    const mentioned = c.has(FUNCTION_NOUN) || c.has(/\bdogru/);
    if (!fn && mentioned) {
      const inFocus = [...new Set([...scene.focus, ...scene.selection])].map(id => scene.get(id)).filter((o): o is FunctionObject => o?.type === 'function');
      if (inFocus.length === 1) fn = inFocus[0];
      else if (c.has(FUNCTION_NOUN) || !scene.ofType('line', 'segment', 'ray').length) {
        if (functions.length === 1) fn = functions[0];
        else if (functions.length > 1 && c.has(FUNCTION_NOUN)) fail(`Birden fazla fonksiyon var (${functions.map(functionTitle).join(', ')}). Hangisi olduğunu adıyla yazın (ör. “A noktasından f ye dik çiz”).`);
      }
    }
    if (!fn) return null;
    name = fn.label;
    const linear = linearOf(evaluatorOf(scene, fn));
    if (!linear) fail(`${functionTitle(fn)} doğrusal bir fonksiyon değil (grafiği bir eğri); paralel ya da dik doğru yalnızca doğrulara çizilebilir. y = mx + n biçiminde bir fonksiyon ya da iki noktalı bir doğru kullanın.`);
    coef = linear;
  }
  const base = fn ? (functionName(fn) ?? 'f') : 'd';
  const [p, q] = 'vertical' in coef
    ? [{ x: coef.vertical, y: 0 }, { x: coef.vertical, y: 1 }]
    : [{ x: 0, y: coef.b }, { x: 1, y: coef.m + coef.b }];
  const a = hiddenPoint(scene, p, base), b = hiddenPoint(scene, q, base);
  if (!fn) scene.addLine(a.id, b.id, { label: name, showEquation: true });
  const note = fn ? ` (${functionTitle(fn)} fonksiyonu sonradan değişirse bu doğru kendiliğinden güncellenmez.)` : '';
  return { a, b, name, note };
}

// ------------------------------------------------------------------------------------------------ sayısal kesişim

export type Participant =
  | { kind: 'fn'; fn: FunctionObject; f: (x: number) => number; title: string }
  | { kind: 'axis'; axis: 'x' | 'y'; title: string }
  | { kind: 'obj'; obj: MathObject; title: string };

export function fnParticipant(scene: CommandScene, fn: FunctionObject): Participant {
  const f = evaluatorOf(scene, fn);
  if (!f) fail(`${functionTitle(fn)} fonksiyonunun ifadesi hesaplanamıyor.`);
  return { kind: 'fn', fn, f, title: functionTitle(fn) };
}
export const axisParticipant = (axis: 'x' | 'y'): Participant => ({ kind: 'axis', axis, title: `${axis} ekseni` });

/** Cümlede geçen eksenler: "x eksenini", "y ekseniyle", "apsis", "ordinat", "kökleri" (x ekseni). */
export function axesIn(c: Clause): ('x' | 'y')[] {
  const axes: ('x' | 'y')[] = [];
  for (const m of c.text.matchAll(/\b(x|y) eksen\w*|\b(apsis|ordinat)\w*/g)) axes.push(m[1] === 'y' || m[2] === 'ordinat' ? 'y' : 'x');
  if (c.has(ROOTS) && !axes.includes('x')) axes.push('x');
  return [...new Set(axes)];
}

/** Görünüm aralığı (yoksa −20 … 20): fonksiyon köklerinin arandığı x aralığı. */
export function searchRange(scene: CommandScene): [number, number] {
  const view = scene.viewBounds();
  if (!view) return [-20, 20];
  const width = Math.max(1, view.maxX - view.minX);
  return [view.minX - width, view.maxX + width];
}

function bisect(h: (x: number) => number, lo: number, hi: number): number {
  let flo = h(lo);
  for (let i = 0; i < 200 && hi - lo > 1e-14 * (1 + Math.abs(lo)); i++) {
    const mid = (lo + hi) / 2, fm = h(mid);
    if (fm === 0) return mid;
    if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else hi = mid;
  }
  return (lo + hi) / 2;
}

function minimizeAbs(h: (x: number) => number, lo: number, hi: number): number {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = lo, b = hi, x1 = b - g * (b - a), x2 = a + g * (b - a), f1 = Math.abs(h(x1)), f2 = Math.abs(h(x2));
  for (let i = 0; i < 120; i++) {
    if (f1 < f2) { b = x2; x2 = x1; f2 = f1; x1 = b - g * (b - a); f1 = Math.abs(h(x1)); }
    else { a = x1; x1 = x2; f1 = f2; x2 = a + g * (b - a); f2 = Math.abs(h(x2)); }
  }
  return (a + b) / 2;
}

/** h(t) = 0 çözümleri: işaret değişimi (ikiye bölme) ve teğet dokunma (|h| yerel en küçüğü). */
export function findRoots(h: (t: number) => number, lo: number, hi: number, samples = 8000): number[] {
  const step = (hi - lo) / samples;
  const ts = Array.from({ length: samples + 1 }, (_, i) => lo + i * step);
  const ys = ts.map(h);
  const tolerance = (t: number, value: number) => Math.abs(value) <= 1e-7 * (1 + Math.abs(t));
  const roots: number[] = [];
  const accept = (t: number) => {
    let best = t, value = h(t);
    if (!Number.isFinite(value)) return;
    const snapped = Math.round(t * 1e6) / 1e6, snappedValue = h(snapped);
    if (Number.isFinite(snappedValue) && Math.abs(snappedValue) <= Math.abs(value) + 1e-12) { best = snapped; value = snappedValue; }
    if (tolerance(best, value)) roots.push(best === 0 ? 0 : best);
  };
  for (let i = 0; i <= samples; i++) {
    const y = ys[i];
    if (!Number.isFinite(y)) continue;
    if (y === 0) { accept(ts[i]); continue; }
    const prev = ys[i - 1];
    if (i > 0 && Number.isFinite(prev) && prev !== 0 && Math.sign(prev) !== Math.sign(y)) accept(bisect(h, ts[i - 1], ts[i]));
    const next = ys[i + 1];
    if (i > 0 && i < samples && Number.isFinite(prev) && Number.isFinite(next) && Math.sign(prev) === Math.sign(y) && Math.sign(next) === Math.sign(y)
      && Math.abs(y) <= Math.abs(prev) && Math.abs(y) <= Math.abs(next)) {
      const t = minimizeAbs(h, ts[i - 1], ts[i + 1]);
      if (Math.abs(h(t)) < 1e-9) accept(t);
    }
  }
  roots.sort((x, y) => x - y);
  return roots.filter((t, i) => i === 0 || Math.abs(t - roots[i - 1]) > Math.max(1e-6, step / 4));
}

const shapeOf = (scene: CommandScene, obj: MathObject) => intersectionShape(obj, id => scene.point(id));
const AXIS_SHAPE = { x: { kind: 'line' as const, a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }, y: { kind: 'line' as const, a: { x: 0, y: 0 }, b: { x: 0, y: 1 } } };

/**
 * İki katılımcının kesişim noktaları (en az biri fonksiyon ya da eksen). Desteklenmeyen çiftte null.
 * Nesne–nesne çifti burada hesaplanmaz (canlı kesişim olarak ayrıca kurulur).
 */
export function staticIntersections(scene: CommandScene, first: Participant, second: Participant): Point2D[] | null {
  const [p, q] = first.kind === 'fn' || (first.kind === 'axis' && second.kind === 'obj') ? [first, second] : [second, first];
  const [lo, hi] = searchRange(scene);
  if (p.kind === 'axis' && q.kind === 'axis') return p.axis === q.axis ? null : [{ x: 0, y: 0 }];
  if (p.kind === 'axis' && q.kind === 'obj') {
    const shape = shapeOf(scene, q.obj);
    return shape ? intersectShapes(shape, AXIS_SHAPE[p.axis]) : null;
  }
  if (p.kind !== 'fn') return null;
  const f = p.f;
  const on = (xs: number[]) => xs.map(x => ({ x, y: f(x) })).filter(pt => Number.isFinite(pt.y));
  if (q.kind === 'axis') {
    if (q.axis === 'y') return on([0]);
    return findRoots(f, lo, hi).map(x => ({ x, y: 0 }));
  }
  if (q.kind === 'fn') {
    const g = q.f;
    return on(findRoots(x => f(x) - g(x), lo, hi));
  }
  const obj = q.obj;
  const shape = shapeOf(scene, obj);
  if (!shape) return null;
  if (shape.kind === 'line') {
    const dx = shape.b.x - shape.a.x, dy = shape.b.y - shape.a.y;
    if (Math.abs(dx) < 1e-12) return on([shape.a.x]);
    const s = dy / dx;
    return on(findRoots(x => f(x) - (shape.a.y + (x - shape.a.x) * s), lo, hi));
  }
  const rx = shape.kind === 'circle' ? shape.radius : shape.radiusX;
  const ry = shape.kind === 'circle' ? shape.radius : shape.radiusY;
  if (shape.kind === 'ellipse' && obj.type === 'ellipse' && obj.rotation) return null;
  const at = (t: number) => ({ x: shape.center.x + rx * Math.cos(t), y: shape.center.y + ry * Math.sin(t) });
  const points = findRoots(t => { const pt = at(t); return f(pt.x) - pt.y; }, 0, 2 * Math.PI, 4000).map(at);
  return points.filter((pt, i) => points.findIndex(o => Math.hypot(o.x - pt.x, o.y - pt.y) < 1e-6) === i);
}
