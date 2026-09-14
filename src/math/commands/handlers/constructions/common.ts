import type { MathObject, PointObject, PolygonObject } from '@/types/math';
import type { Clause } from '../../text';
import { COLORS, type CommandScene, colorIn, fail } from '../../scene';
import { type Ref, isPointRef, joinTr, refPoints } from './refs';

/** Başka ailelerin fiilleri: bu cümleler inşa değildir. */
export function foreignVerb(c: Clause): boolean {
  if (c.definition || c.assignment) return true;
  if (c.hasVerb('rotate', 'reflect', 'translate', 'scale', 'delete', 'hide', 'rename', 'move', 'copy', 'select', 'undo', 'redo', 'zoom', 'play', 'stop', 'lock', 'unlock')) return true;
  if (c.has(/\b(?:ayarla|degistir|guncelle|esitle)/)) return true;
  // "…'yi kırmızı yap / boya": düzenleme ailesinin işi
  if ((c.hasVerb('color') || colorIn(c)) && !c.has(/\b(?:ciz|olustur|kur|ekle|bul|indir|cek|isaretle)/)) return true;
  return false;
}

/** Ölçüm/soru adları: uzunluk, alan, çevre… ("çevrel" hariç). */
export const MEASURE_NOUN = /\b(?:uzunlug|uzunluk|olcu(?:su|sunu|leri|lerini|sunun)?\b|alan(?:i|ini|inin|lari|larini)?\b|cevre(?:si|sini|sinin)?\b|egim|mesafe|uzaklig|uzaklik|buyuklug)/;

export const PLURAL_ALL = /\b(?:tum|butun|hepsi|hepsini|her)\b/;

/** Kesişim cümlelerinde geçen üçgen doğrusu türleri (kenarortay, yükseklik/dikme, açıortay, orta dikme). */
const CEVIAN_KINDS: [string, RegExp][] = [
  ['median', /\bkenar ?ortay/], ['altitude', /\byukseklik|\byukseklig|(?<!orta )\bdikme/], ['bisector', /\baci ?ortay/], ['perpBisector', /\borta ?dikme/],
];
export const cevianKinds = (c: Clause) => CEVIAN_KINDS.filter(([, re]) => c.has(re)).map(([kind]) => kind);

/** "kesişim noktası", "kesiştiği nokta", "ortak nokta" ("kesişim noktasından …" kaynak göstermez). */
export const MEETING = /\bkesis|\bkesim noktas|\bortak nokta|\bkest(?:ig|ik)\w* (?:nokta|yer)/;
export const MEETING_AS_SOURCE = /\bkesi(?:s\w*|m) nokta\w*(?:dan|den)\b/;

/** "kesişim noktasından …": odaktaki/seçimdeki ya da çizimdeki tek kesişim noktası (yoksa undefined). */
export function meetingPoint(c: Clause, scene: CommandScene): PointObject | undefined {
  if (!c.has(MEETING_AS_SOURCE)) return undefined;
  const isMeeting = (o: MathObject | undefined): o is PointObject => o?.type === 'point'
    && (o.construction?.kind === 'intersection' || o.construction?.kind === 'triangleCenter' || (!o.construction && o.color === COLORS.intersection));
  for (const ids of [scene.focus, scene.selection]) {
    const pts = [...new Set(ids)].map(id => scene.get(id)).filter(isMeeting);
    if (pts.length === 1) return pts[0];
  }
  const all = scene.points().filter(isMeeting);
  if (all.length > 1) fail(`Birden fazla kesişim noktası var (${joinTr(all.map(p => p.label))}). Hangisi olduğunu adıyla yazın (ör. “${all[0].label} noktasından …”).`);
  return all[0];
}

/** "iç teğet", "içteğet", "içine teğet", "içten teğet" (çember). */
export const INNER_TANGENT = /\bic ?te[gy]et|\bic(?:ine|ten) te[gy]et/;

/** Addan hemen önce yazılan adet: "üç yüksekliğini", "3 tane kenarortay" (2 ve üzeri; yoksa undefined). */
export function countBefore(c: Clause, noun: string): number | undefined {
  const m = c.match(new RegExp(`#(\\d+)\\s+(?:tane\\s+|adet\\s+)?(?:ic\\s+|dis\\s+)?(?:${noun})`));
  if (!m) return undefined;
  const n = c.num(`#${m[1]}`);
  return Number.isInteger(n) && n >= 2 ? n : undefined;
}

/**
 * Ders kitabı gösterimi: h_a (yükseklik), V_a / m_a (kenarortay), n_a (açıortay) → A köşesi.
 * Alt çizgi zorunludur ("ha" gibi dolgu sözcükleri karışmasın).
 */
export function notationVertices(c: Clause, scene: CommandScene, letters: string): PointObject[] {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])[${letters}]_\\{?(\\p{L})\\}?(?![\\p{L}\\p{N}])`, 'gu');
  return [...c.raw.matchAll(re)].map(m => {
    const label = m[1].toLocaleUpperCase('tr');
    return scene.findPoint(label) ?? fail(`${m[0]} gösterimindeki ${label} köşesi bulunamadı.`);
  });
}

/** Oluşturma cümlesinde renk verilmişse ("kırmızı açıortay çiz") bu cümlede oluşan şekillere uygular. */
export function applyClauseColor(c: Clause, scene: CommandScene) {
  const color = colorIn(c);
  if (!color) return;
  for (const id of scene.clauseCreated) {
    const o = scene.get(id);
    if (!o || o.type === 'point') continue;
    scene.update(id, { color, ...('fillColor' in o && o.fillColor ? { fillColor: color } : {}) });
  }
}

export interface Triangle { ids: [string, string, string]; polygon?: PolygonObject; name: string }

/**
 * Cümlenin gösterdiği üçgen: "ABC" (çokgen ya da üç nokta), "A, B ve C noktaları",
 * yoksa odak/seçim/sahnedeki tek üçgen.
 */
export function triangleOf(c: Clause, scene: CommandScene, refs: Ref[], o: { noun?: string; required?: boolean; polygonOnly?: boolean } = {}): Triangle | null {
  for (const r of refs) {
    if (!r.label) continue;
    const named = scene.resolveLabel(r.label, ['polygon']) as PolygonObject[];
    const triangles = named.filter(p => p.pointIds.length === 3);
    if (triangles.length === 1) return fromPolygon(scene, triangles[0]);
    if (named.length && !triangles.length) fail(`${r.label.text} bir üçgen değil; bu işlem üçgen için yapılır.`);
    const pts = refPoints(scene, r);
    if (!o.polygonOnly && pts && pts.length === 3 && new Set(pts.map(p => p.id)).size === 3) {
      return { ids: [pts[0].id, pts[1].id, pts[2].id], name: pts.map(p => p.label).join('') };
    }
  }
  const singles = refs.filter(r => r.kind === 'label' && isPointRef(scene, r)).map(r => refPoints(scene, r)![0]);
  if (!o.polygonOnly && singles.length === 3 && new Set(singles.map(p => p.id)).size === 3 && c.has(/\bnokta/)) {
    return { ids: [singles[0].id, singles[1].id, singles[2].id], name: singles.map(p => p.label).join('') };
  }
  const triangles = scene.ofType('polygon').filter(p => p.pointIds.length === 3);
  if (!o.required && !triangles.length) return null;
  const polygon = scene.target(c, { types: ['polygon'], noun: o.noun ?? 'üçgen', filter: obj => obj.type === 'polygon' && obj.pointIds.length === 3, labels: [] }) as PolygonObject;
  return fromPolygon(scene, polygon);
}

export function fromPolygon(scene: CommandScene, polygon: PolygonObject): Triangle {
  const ids = polygon.pointIds as [string, string, string];
  return { ids, polygon, name: ids.map(id => scene.point(id).label).join('') };
}

/** Herhangi bir çokgen hedefi (köşegen, kenar orta noktaları…). */
export function polygonOf(c: Clause, scene: CommandScene, refs: Ref[], o: { noun: string; minSize?: number }): PolygonObject {
  const ok = (p: MathObject) => p.type === 'polygon' && p.pointIds.length >= (o.minSize ?? 3);
  for (const r of refs) {
    if (!r.label) continue;
    const named = scene.resolveLabel(r.label, ['polygon']).filter(ok) as PolygonObject[];
    if (named.length === 1) return named[0];
    if (named.length > 1) fail(`Birden fazla çokgen eşleşti (${named.map(p => p.label).join(', ')}). Hangisi olduğunu belirtin.`);
  }
  return scene.target(c, { types: ['polygon'], noun: o.noun, filter: ok, labels: [] }) as PolygonObject;
}

/** Noktayı içeren tek üçgen (köşeden yükseklik, kenarortay, açıortay için). */
export function triangleWithVertex(c: Clause, scene: CommandScene, refs: Ref[], vertex: PointObject, example: string): Triangle {
  const preferred = triangleOf(c, scene, refs.filter(r => r.label && (refPoints(scene, r)?.length ?? 0) >= 3), { polygonOnly: false });
  if (preferred && preferred.ids.includes(vertex.id)) return preferred;
  const candidates = scene.ofType('polygon').filter(p => p.pointIds.length === 3 && p.pointIds.includes(vertex.id));
  if (candidates.length === 1) return fromPolygon(scene, candidates[0]);
  const focused = candidates.filter(p => scene.focus.includes(p.id) || scene.selection.includes(p.id));
  if (focused.length === 1) return fromPolygon(scene, focused[0]);
  if (!candidates.length) fail(`${vertex.label} köşesi olan bir üçgen yok. Karşı doğruyu da yazın (ör. “${example}”).`);
  fail(`${vertex.label} birden fazla üçgenin köşesi (${joinTr(candidates.map(p => p.label))}). Üçgeni de yazın (ör. “${candidates[0].label} üçgeninde ${vertex.label} köşesinden…”).`);
}

/** İki noktayı (kenar) içeren tek üçgen. */
export function triangleWithSide(scene: CommandScene, a: PointObject, b: PointObject, example: string): Triangle {
  const candidates = scene.ofType('polygon').filter(p => p.pointIds.length === 3 && p.pointIds.includes(a.id) && p.pointIds.includes(b.id));
  if (candidates.length === 1) return fromPolygon(scene, candidates[0]);
  const focused = candidates.filter(p => scene.focus.includes(p.id) || scene.selection.includes(p.id));
  if (focused.length === 1) return fromPolygon(scene, focused[0]);
  if (!candidates.length) fail(`${a.label}${b.label} kenarı olan bir üçgen yok. Hangi noktadan çizileceğini de yazın (ör. “${example}”).`);
  fail(`${a.label}${b.label} birden fazla üçgenin kenarı (${joinTr(candidates.map(p => p.label))}). Üçgeni de yazın.`);
}

/** Odakta ya da seçimde tek bir nokta varsa o. */
export function focusedPoint(scene: CommandScene): PointObject | undefined {
  for (const ids of [scene.focus, scene.selection]) {
    const pts = ids.map(id => scene.get(id)).filter((o): o is PointObject => o?.type === 'point');
    if (pts.length === 1) return pts[0];
  }
  return undefined;
}
