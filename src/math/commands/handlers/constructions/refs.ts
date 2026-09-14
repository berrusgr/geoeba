import type { MathObject, Point2D, PointObject, PolygonObject } from '@/types/math';
import type { Clause, LabelRef } from '../../text';
import { type CommandScene, fail, trNum } from '../../scene';

/**
 * İnşa cümlelerindeki adların (A, BC, c1, (1;2)) cümledeki görevini çıkarır.
 *   "A'dan" / "A noktasından"  → from   (kaynak, geçtiği nokta)
 *   "A noktasında" / "B'de"    → at     (üzerindeki nokta)
 *   "BC'ye" / "BC doğrusuna"   → to     (hedef doğru/çember)
 *   "AB'nin" / "ABC üçgeninin" → of     (sahip)
 *   "A ile"                    → with
 *   "A merkezli"               → li
 */
export type Role = 'from' | 'at' | 'to' | 'of' | 'with' | 'obj' | 'plain' | 'li';
export type NounTag = 'point' | 'vertex' | 'segment' | 'line' | 'ray' | 'side' | 'circle' | 'triangle' | 'polygon' | 'angle' | 'center' | 'arc' | 'ellipse' | 'sector';

const NOUN_STEMS: [RegExp, NounTag][] = [
  [/^(nokta)/, 'point'], [/^(kose)(?!gen)/, 'vertex'], [/^(parca)/, 'segment'], [/^(dogru)/, 'line'], [/^(isin)/, 'ray'],
  [/^(kenar)(?!ortay)/, 'side'], [/^(taban)/, 'side'], [/^(cember)/, 'circle'], [/^(daire)(?!\s*dilim)/, 'circle'], [/^(ucgen)/, 'triangle'],
  [/^(cokgen|kare(?!li)|dikdortgen|dortgen|besgen|altigen|paralelkenar|yamuk|deltoid)/, 'polygon'], [/^(aci)(?!ortay)/, 'angle'],
  [/^(merkez)/, 'center'], [/^(yay)/, 'arc'], [/^(elips)/, 'ellipse'], [/^(dilim)/, 'sector'],
];

const DETACHED_SUFFIX = new Set(['nin', 'nun', 'in', 'un', 'den', 'dan', 'ten', 'tan', 'ye', 'ya', 'de', 'da', 'yi', 'yu', 'ile', 'le', 'la']);

/** Katlanmış ek → görev. */
export function roleOf(rest: string): Role {
  if (!rest) return 'plain';
  if (/^l[iu]k?$|^s?[iu]?l[iu]$/.test(rest)) return 'li';
  if (/(?:d|t)[ae]n$/.test(rest)) return 'from';
  if (/(?:d|t)[ae](?:ki)?$/.test(rest)) return 'at';
  if (/[iu]n$/.test(rest)) return 'of';
  if (/ile$|y?l[ae]$/.test(rest)) return 'with';
  if (/[ae]$/.test(rest)) return 'to';
  if (/(?:s[iu]n[iu]|n[iu]|y[iu])$/.test(rest)) return 'obj';
  return 'plain';
}

export function nounOf(word: string | undefined, next?: string): { tag: NounTag; rest: string; plural: boolean; width: number } | null {
  if (!word) return null;
  if (/^dogru$/.test(word) && next && /^parca/.test(next)) {
    const rest = next.slice(5);
    return { tag: 'segment', rest, plural: /l[ae]r/.test(rest), width: 2 };
  }
  for (const [re, tag] of NOUN_STEMS) {
    const m = word.match(re);
    if (m) {
      const rest = word.slice(m[1].length);
      return { tag, rest, plural: /^(?:s?[iu])?l[ae]r/.test(rest) || /^l[ae]r/.test(rest), width: 1 };
    }
  }
  return null;
}

export interface Ref {
  kind: 'label' | 'coord';
  /** labels[index] ya da coords[index] */
  index: number;
  label?: LabelRef;
  coord?: Point2D;
  /** clause.words içindeki konum */
  pos: number;
  role: Role;
  noun?: NounTag;
  /** Addan sonra "geçen" var mı? ("A'dan geçen") */
  through: boolean;
}

export function refsOf(c: Clause): Ref[] {
  const out: Ref[] = [];
  c.words.forEach((word, pos) => {
    const m = word.match(/^([$@])(\d+)([a-z]*)$/);
    if (!m) return;
    const kind = m[1] === '$' ? 'label' : 'coord';
    const index = Number(m[2]);
    const label = kind === 'label' ? c.labels[index] : undefined;
    if (kind === 'label' && !label) return;
    let suffix = kind === 'label' ? label!.suffix : m[3];
    let j = pos + 1;
    if (!suffix && DETACHED_SUFFIX.has(c.words[j] ?? '')) { suffix = c.words[j]; j++; }
    // Kendi eki olan ad ("P'den") ardından gelen adın başı olamaz: "P'den çembere".
    const noun = suffix ? null : nounOf(c.words[j], c.words[j + 1]);
    let role = roleOf(suffix);
    if (noun) {
      if (!suffix) role = roleOf(noun.rest);
      j += noun.width;
    }
    const through = /^gec(?:en|tig|ecek|sin)/.test(c.words[j] ?? '');
    out.push({ kind, index, label, coord: kind === 'coord' ? c.coords[index] : undefined, pos, role, noun: noun?.tag, through });
  });
  return out;
}

export const refText = (r: Ref) => r.label ? r.label.text : `(${trNum(r.coord!.x)}; ${trNum(r.coord!.y)})`;

/** Adın gösterdiği nokta dizisi (sahnedeki noktalardan). */
export function refPoints(scene: CommandScene, r: Ref): PointObject[] | null {
  if (!r.label) return null;
  return scene.pointsFromLabel(r.label.text);
}

/** Tek bir noktayı gösteren ad mı? (koordinat da olabilir) */
export function isPointRef(scene: CommandScene, r: Ref): boolean {
  if (r.kind === 'coord') return true;
  if (r.label!.bracket) return false;
  if (r.noun && !['point', 'vertex', 'center'].includes(r.noun)) return false;
  if (!r.noun) {
    // Büyük harfle yazılan "D" noktayı, küçük harfle yazılan "d" aynı adlı doğruyu gösterir.
    if (!r.label!.lowercase && scene.points().some(p => p.label === r.label!.text)) return true;
    const named = scene.resolveLabel(r.label!).filter(o => o.type !== 'point');
    if (named.some(o => labelMatchesName(o, r.label!.text))) return false;
  }
  const pts = refPoints(scene, r);
  return !!pts && pts.length === 1;
}

function labelMatchesName(o: MathObject, text: string) {
  const key = (s: string) => s.toLocaleLowerCase('tr').replace(/[\s[\]|]/g, '');
  return key(o.label) === key(text) || (o.type === 'slider' && key(o.variableName) === key(text));
}

/** Koordinat ya da ad → nokta; koordinatsa yeni nokta oluşturur. */
export function pointFromRef(scene: CommandScene, r: Ref): { point: PointObject; created: boolean } {
  if (r.kind === 'coord') {
    const existing = scene.points().find(p => Math.abs(p.x - r.coord!.x) < 1e-9 && Math.abs(p.y - r.coord!.y) < 1e-9);
    if (existing) return { point: existing, created: false };
    return { point: scene.addPoint(r.coord!), created: true };
  }
  const pts = refPoints(scene, r);
  if (!pts || pts.length !== 1) fail(`${r.label!.text} noktası bulunamadı.`);
  return { point: pts[0], created: false };
}

export interface LineSpec { a: PointObject; b: PointObject; object?: MathObject; name: string }

const LINE_TYPES = ['line', 'segment', 'ray'] as const;

/** Doğru, doğru parçası, ışın adı ya da iki noktalı ad ("BC", "[BC]", "d") → iki tanım noktası. */
export function lineFromRef(scene: CommandScene, r: Ref): LineSpec | null {
  if (!r.label) return null;
  const objects = scene.resolveLabel(r.label, [...LINE_TYPES]);
  if (objects.length) {
    const wanted = r.noun === 'segment' ? 'segment' : r.noun === 'ray' ? 'ray' : r.noun === 'line' ? 'line' : undefined;
    const order = ['line', 'segment', 'ray'];
    const sorted = [...objects].sort((x, y) => (x.type === wanted ? -1 : 0) - (y.type === wanted ? -1 : 0) || order.indexOf(x.type) - order.indexOf(y.type));
    const object = sorted[0];
    let [a, b] = scene.lineOf(object)!;
    const written = scene.pointsFromLabel(r.label.text);
    // "BA" yazıldıysa yön B'den A'ya (oranda bölme için önemli)
    if (written && written.length === 2 && written[0].id === b.id && written[1].id === a.id) [a, b] = [b, a];
    const byName = labelMatchesName(object, r.label.text) && !/^\[/.test(object.label);
    return { a, b, object, name: byName ? object.label : `${a.label}${b.label}` };
  }
  const pts = refPoints(scene, r);
  if (pts && pts.length === 2 && pts[0].id !== pts[1].id) return { a: pts[0], b: pts[1], name: `${pts[0].label}${pts[1].label}` };
  return null;
}

/** Kaynak/hedef görevindeki ("Z'den", "Z noktasına") ama sahnede olmayan adlar için açıklayıcı hata. */
export function requireKnownRefs(scene: CommandScene, refs: Ref[]) {
  const missing = refs.filter(r => isUnknownRef(scene, r) && ['from', 'at', 'to', 'of', 'with'].includes(r.role));
  if (missing.length) fail(`${missing.map(r => r.label!.text).join(', ')} adlı nokta ya da nesne bulunamadı.`);
}

/** "orta noktası M olsun", "adı K olan" gibi istenen ad (sahnede olsa da olmasa da). */
export function requestedName(c: Clause): LabelRef | undefined {
  // "ayağına H de": ek bitişik yazıldığı için "$1de" olarak gelir.
  const m = c.match(/\$(\d+)\s+(?:olsun|olarak|diyelim|adli|isimli|adiyla|de\b|da\b)|\b(?:adi|ismi)\s+\$(\d+)|\b(?:ayag(?:i|ina|ini)|adina|ismine)\s+\$(\d+)(?:de|da)?\b/);
  return m ? c.labels[Number(m[1] ?? m[2] ?? m[3])] : undefined;
}

/** Sahnede adın karşılığı hiç yok mu? (yeni nokta adı olabilir) */
export function isUnknownRef(scene: CommandScene, r: Ref): boolean {
  if (!r.label) return false;
  return !scene.resolveLabel(r.label).length && !scene.pointsFromLabel(r.label.text);
}

/** Yeni oluşturulacak nokta için cümlede verilmiş tek harfli adlar ("orta noktası M olsun"). */
export function newPointNames(scene: CommandScene, refs: Ref[]): string[] {
  return refs.filter(r => isUnknownRef(scene, r) && /^[\p{Lu}](?:_?\d+)?'*$/u.test(r.label!.text)).map(r => r.label!.text);
}

/** Verilen noktaları içeren çokgenler. */
export function polygonsWith(scene: CommandScene, ids: string[], size?: number): PolygonObject[] {
  return scene.ofType('polygon').filter(p => ids.every(id => p.pointIds.includes(id)) && (!size || p.pointIds.length === size));
}

/** Cümlede bir çokgeni gösteren adlar (ABC, "kare1"). */
export function polygonRefs(scene: CommandScene, refs: Ref[]): Ref[] {
  return refs.filter(r => r.label && scene.resolveLabel(r.label, ['polygon']).length > 0);
}

export const coord = (p: Point2D) => `(${trNum(p.x)}; ${trNum(p.y)})`;
export const named = (p: PointObject) => `${p.label}${coord(p)}`;
export const unique = <T,>(items: T[]) => [...new Set(items)];
export const joinTr = (items: string[]) => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`;
