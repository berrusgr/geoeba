import type { MathObject, PointObject } from '@/types/math';
import type { Clause } from '../../text';
import { type CommandScene, fail } from '../../scene';
import { type TargetOptions, candidatesFor, cleanLabel, describeList, examplesOfNames, findTargets, pick } from './targets';
import { QUANTIFIER, clauseNouns, labelNoun, labelRole, labelWordIndex } from './words';

/**
 * Şeklin parçaları ve inşa ürünleri: "çemberin merkezi", "yüksekliğin ayağı", "kesişim noktaları", "teğetler",
 * "orta nokta", "kenarortaylar", "ABC'nin açıları". Bu nesnelerin çoğunun adı cümlede geçmez; ya önceki komutun
 * nesnesinden (odak/seçim) ya da sahnedeki inşa türünden bulunurlar.
 */

type PartKey = 'center' | 'triangleCenter' | 'foot' | 'midpoint' | 'intersection' | 'tangentPoint' | 'tangentLine' | 'altitude' | 'median' | 'bisector' | 'perpBisector' | 'angle';

interface PartDef {
  key: PartKey;
  noun: string;
  /** i. sözcük bu parçayı adlandırıyor mu (katlanmış sözcükler; önceki sözcük niteleyici olabilir) */
  at(words: string[], i: number): boolean;
  is(o: MathObject, s: CommandScene): boolean;
  of(owner: MathObject, s: CommandScene): MathObject[];
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(id => b.includes(id));
const pointsOf = (s: CommandScene) => s.points();
const construction = <K extends NonNullable<PointObject['construction']>['kind']>(p: MathObject, kind: K): Extract<NonNullable<PointObject['construction']>, { kind: K }> | undefined =>
  p.type === 'point' && p.construction?.kind === kind ? p.construction as Extract<NonNullable<PointObject['construction']>, { kind: K }> : undefined;
const ends = (o: MathObject): string[] => o.type === 'segment' ? [o.startPointId, o.endPointId] : o.type === 'line' ? [o.point1Id, o.point2Id] : o.type === 'ray' ? [o.startPointId, o.throughPointId] : [];
const POINTWORD = /^nokta/;

function altitudeFoot(o: MathObject, s: CommandScene): PointObject | undefined {
  if (o.type !== 'segment') return undefined;
  const [a, b] = ends(o).map(id => s.get(id));
  for (const [foot, source] of [[a, b], [b, a]]) {
    const k = foot && construction(foot, 'foot');
    if (k && source && k.sourceId === source.id) return foot as PointObject;
  }
  return undefined;
}
function tangentContact(o: MathObject, s: CommandScene): PointObject | undefined {
  if (o.type !== 'line' && o.type !== 'segment' && o.type !== 'ray') return undefined;
  const [a, b] = ends(o).map(id => s.get(id));
  for (const [contact, source] of [[a, b], [b, a]]) {
    const k = contact && construction(contact, 'tangent');
    if (k && source && k.sourceId === source.id) return contact as PointObject;
  }
  return undefined;
}
function medianMid(o: MathObject, s: CommandScene): PointObject | undefined {
  if (o.type !== 'segment') return undefined;
  const [a, b] = ends(o).map(id => s.get(id));
  for (const [mid, vertex] of [[a, b], [b, a]]) {
    const k = mid && construction(mid, 'midpoint');
    if (k && vertex && !k.pointIds.includes(vertex.id)) return mid as PointObject;
  }
  return undefined;
}
const vertexIds = (o: MathObject, s: CommandScene) => o.type === 'point' ? [o.id] : s.definingPointIds(o);

type CenterKind = Extract<NonNullable<PointObject['construction']>, { kind: 'triangleCenter' }>['center'];
const TRIANGLE_CENTERS: [string, CenterKind, string][] = [['agirlik', 'centroid', 'ağırlık merkezi'], ['diklik', 'orthocenter', 'diklik merkezi'], ['cevrel', 'circumcenter', 'çevrel merkez'], ['ic', 'incenter', 'iç merkez']];

export const PART_DEFS: PartDef[] = [
  // "ağırlık merkezini gizle", "diklik merkezini kırmızı yap"
  ...TRIANGLE_CENTERS.map(([word, kind, noun]): PartDef => ({
    key: 'triangleCenter', noun,
    at: (w, i) => /^merkez(?:ler)?(?:i|ini|in|inin|ine)$/.test(w[i]) && w[i - 1] === word,
    is: o => construction(o, 'triangleCenter')?.center === kind,
    of: (owner, s) => {
      const ids = vertexIds(owner, s);
      return pointsOf(s).filter(p => { const k = construction(p, 'triangleCenter'); return !!k && k.center === kind && k.pointIds.every(id => ids.includes(id)); });
    },
  })),
  {
    key: 'center', noun: 'merkez',
    at: (w, i) => (/^merkez(?:ler)?(?:i|ini|in|inin|ine)$/.test(w[i]) || (w[i] === 'merkez' && POINTWORD.test(w[i + 1] ?? ''))) && !/^(?:agirlik|diklik|cevrel|ic)$/.test(w[i - 1] ?? ''),
    is: (o, s) => o.type === 'point' && s.objects.some(x => (x.type === 'circle' && !x.throughPointIds?.length || x.type === 'arc' || x.type === 'sector' || x.type === 'ellipse') && x.centerPointId === o.id),
    of: (owner, s) => {
      if ((owner.type === 'circle' && !owner.throughPointIds?.length) || owner.type === 'arc' || owner.type === 'sector' || owner.type === 'ellipse') {
        const c = s.get(owner.centerPointId);
        return c ? [c] : [];
      }
      if (owner.type === 'polygon') return pointsOf(s).filter(p => { const k = construction(p, 'triangleCenter'); return !!k && k.pointIds.every(id => owner.pointIds.includes(id)); });
      return [];
    },
  },
  {
    key: 'foot', noun: 'dikme ayağı',
    at: (w, i) => /^ayag(?:i|ini|in|inin|ina|lari|larini|larin)$|^ayak(?:lar|lari|larini)?$/.test(w[i]),
    is: o => !!construction(o, 'foot'),
    of: (owner, s) => {
      const direct = altitudeFoot(owner, s);
      if (direct) return [direct];
      const ids = vertexIds(owner, s);
      return pointsOf(s).filter(p => {
        const k = construction(p, 'foot');
        if (!k) return false;
        if (owner.type === 'point') return k.sourceId === owner.id;
        if (owner.type === 'polygon') return ids.includes(k.sourceId) && k.linePointIds.every(id => ids.includes(id));
        return sameSet(k.linePointIds, ids);
      });
    },
  },
  {
    key: 'midpoint', noun: 'orta nokta',
    at: (w, i) => (POINTWORD.test(w[i]) && w[i - 1] === 'orta') || /^ortanokta/.test(w[i]),
    is: o => !!construction(o, 'midpoint'),
    of: (owner, s) => {
      const ids = vertexIds(owner, s);
      return pointsOf(s).filter(p => { const k = construction(p, 'midpoint'); return !!k && (owner.type === 'polygon' ? k.pointIds.every(id => ids.includes(id)) : sameSet(k.pointIds, ids)); });
    },
  },
  {
    key: 'intersection', noun: 'kesişim noktası',
    at: (w, i) => (POINTWORD.test(w[i]) && /^(?:kesisim|kesim|ortak)$/.test(w[i - 1] ?? '')) || /^kesisim(?:ler|leri|lerini|i|ini)$/.test(w[i]),
    is: o => !!construction(o, 'intersection'),
    of: (owner, s) => pointsOf(s).filter(p => construction(p, 'intersection')?.objectIds.includes(owner.id)),
  },
  {
    key: 'tangentPoint', noun: 'teğet noktası',
    at: (w, i) => POINTWORD.test(w[i]) && /^(?:teget|degme)$/.test(w[i - 1] ?? ''),
    is: o => !!construction(o, 'tangent'),
    of: (owner, s) => {
      const contact = tangentContact(owner, s);
      if (contact) return [contact];
      return pointsOf(s).filter(p => { const k = construction(p, 'tangent'); return !!k && (k.circleId === owner.id || k.sourceId === owner.id); });
    },
  },
  {
    key: 'tangentLine', noun: 'teğet',
    at: (w, i) => /^teget(?:ler)?(?:i|ini|in|inin|leri|lerini|lerin)?$/.test(w[i]) && !POINTWORD.test(w[i + 1] ?? '') && !/^(?:cember|daire)/.test(w[i + 1] ?? '') && w[i - 1] !== 'ic' && w[i - 1] !== 'ortak',
    is: (o, s) => (o.type === 'line' || o.type === 'segment' || o.type === 'ray') && (/^Teğet/.test(o.label) || !!tangentContact(o, s)),
    of: (owner, s) => s.objects.filter(o => {
      const contact = tangentContact(o, s);
      if (!contact) return false;
      const k = construction(contact, 'tangent')!;
      return k.circleId === owner.id || k.sourceId === owner.id;
    }),
  },
  {
    key: 'altitude', noun: 'yükseklik',
    at: (w, i) => /^yukseklik|^yukseklig/.test(w[i]) || (/^dikme(?:ler)?(?:i|si|sini|yi|nin|sinin|leri|lerini|lerin)?$/.test(w[i]) && w[i - 1] !== 'orta'),
    is: (o, s) => !!altitudeFoot(o, s),
    of: (owner, s) => {
      const ids = vertexIds(owner, s);
      return s.objects.filter(o => {
        const foot = altitudeFoot(o, s);
        if (!foot) return false;
        const k = construction(foot, 'foot')!;
        return owner.type === 'point' ? k.sourceId === owner.id : ids.includes(k.sourceId);
      });
    },
  },
  {
    key: 'median', noun: 'kenarortay',
    at: (w, i) => /^kenarortay/.test(w[i]) || (/^ortay/.test(w[i]) && w[i - 1] === 'kenar'),
    is: (o, s) => !!medianMid(o, s),
    of: (owner, s) => {
      const ids = vertexIds(owner, s);
      return s.objects.filter(o => { const m = medianMid(o, s); return !!m && ends(o).some(id => ids.includes(id)); });
    },
  },
  {
    key: 'bisector', noun: 'açıortay',
    at: (w, i) => /^aciortay/.test(w[i]) || (/^ortay/.test(w[i]) && w[i - 1] === 'aci'),
    is: o => (o.type === 'ray' || o.type === 'line') && /açıortay/i.test(o.label),
    of: (owner, s) => {
      const ids = vertexIds(owner, s);
      return s.objects.filter(o => (o.type === 'ray' || o.type === 'line') && /açıortay/i.test(o.label) && ends(o).some(id => ids.includes(id)));
    },
  },
  {
    key: 'perpBisector', noun: 'orta dikme',
    at: (w, i) => (/^dikme/.test(w[i]) && w[i - 1] === 'orta') || /^ortadikme/.test(w[i]),
    is: o => o.type === 'line' && /orta dikme/i.test(o.label),
    of: (owner, s) => s.objects.filter(o => o.type === 'line' && /orta dikme/i.test(o.label) && o.label.includes(owner.label)),
  },
  {
    key: 'angle', noun: 'açı',
    at: (w, i) => /^aci(?:lar)?(?:i|ini|si|sini|yi|lari|larini)$/.test(w[i]) && !/^(?:dis|ic|buyuk|kucuk|merkez|yansimali)$/.test(w[i - 1] ?? ''),
    is: o => o.type === 'angle',
    of: (owner, s) => {
      if (owner.type === 'point') return s.ofType('angle').filter(a => a.vertexPointId === owner.id);
      const ids = vertexIds(owner, s);
      if (!ids.length) return [];
      return s.ofType('angle').filter(a => [a.point1Id, a.vertexPointId, a.point3Id].every(id => ids.includes(id)));
    },
  },
];

export interface PartHit { def: PartDef; index: number; plural: boolean }

export function partWords(c: Clause): PartHit[] {
  const out: PartHit[] = [];
  for (let i = 0; i < c.words.length; i++) {
    if (/^[$#@"]/.test(c.words[i])) continue;
    const def = PART_DEFS.find(d => d.at(c.words, i));
    // "teğet doğrularını", "kesişim noktalarını": çoğul eki ardındaki adda olabilir
    if (def) out.push({ def, index: i, plural: /l[ae]r/.test(c.words[i]) || /^(?:dogru|nokta|parca|isin)\w*l[ae]r/.test(c.words[i + 1] ?? '') });
  }
  return out;
}

/** Cümlede şekil parçası / inşa ürünü adı var mı (açı hariç: açı ölçüm ailesinde de geçer). */
export function hasPartWord(c: Clause, withAngles = false): boolean {
  return partWords(c).some(h => withAngles || h.def.key !== 'angle');
}

/** MEASURE_WORDS gibi süzgeçlerden önce parça sözcüklerini metinden çıkarır ("kenarortay", "açıortay" ölçü değildir). */
export function withoutPartWords(c: Clause, withAngles = false): string {
  const skip = new Set(partWords(c).filter(h => withAngles || h.def.key !== 'angle').map(h => h.index));
  return c.words.filter((_, i) => !skip.has(i)).join(' ');
}

const unique = <T,>(items: T[]) => [...new Set(items)];
const MANY_WORDS = /\b(?:ikisini|ikisi|ucunu|ucu|dordunu|hepsini|hepsi)\b/;

/**
 * Tamlayan etiketin gösterdiği sahip: adıyla nesne ("c1'in", "ABC üçgeninin"), tek nokta ("B'nin açıları") ya da
 * çizilmemiş bir şeklin noktaları ("AB'nin orta noktası" — AB parçası yoksa A ve B'den geçici bir sahip).
 */
function ownerOf(c: Clause, s: CommandScene, i: number): MathObject {
  const ref = c.labels[i];
  const own = labelNoun(c, i);
  let list = own ? candidatesFor(s, ref, own.spec) : [];
  if (!list.length) list = candidatesFor(s, ref);
  if (list.length) return pick(ref, list);
  const pts = s.pointsFromLabel(ref.text);
  if (pts && pts.length === 2) {
    return { id: '', type: 'segment', label: `[${pts[0].label}${pts[1].label}]`, startPointId: pts[0].id, endPointId: pts[1].id, visible: true } as unknown as MathObject;
  }
  if (pts && pts.length > 2) return { id: '', type: 'polygon', label: pts.map(p => p.label).join(''), pointIds: pts.map(p => p.id), visible: true } as unknown as MathObject;
  fail(`${cleanLabel(ref.text)} adlı nesne bulunamadı.`);
}

/** Cümledeki (son) parça sahnede var mı: "ağırlık merkezini göster" yoksa oluşturma ailesine bırakılır. */
export function partExists(c: Clause, s: CommandScene): boolean {
  const hits = partWords(c);
  if (!hits.length) return false;
  const def = hits[hits.length - 1].def;
  return s.objects.some(o => def.is(o, s));
}

/**
 * Parça adı geçen cümlenin hedefleri; parça adı yoksa null (çağıran findTargets'e döner).
 * Sahip: tamlayan hâlindeki etiket/ad ("c1'in merkezi", "üçgenin yükseklikleri", "yüksekliğin ayağı").
 * Sahip yoksa: odaktaki/seçimdeki parçalar → odaktaki nesnenin parçaları → sahnedeki tüm parçalar (tekil adda tek olmalı).
 */
export function resolveParts(c: Clause, s: CommandScene, o: TargetOptions): MathObject[] | null {
  const hits = partWords(c);
  if (!hits.length) return null;
  const main = hits[hits.length - 1];
  const def = main.def;
  const allowed = o.labels ?? c.labels.map((_, i) => i);
  const wantsMany = o.many !== false && (main.plural || QUANTIFIER.test(c.text) || MANY_WORDS.test(c.text));
  const finish = (list: MathObject[]): MathObject[] => {
    const result = unique(list).filter(x => !o.filter || o.filter(x));
    if (!result.length) fail(`Sahnede ${def.noun} yok.`);
    if (o.many === false && result.length > 1) fail(`Birden fazla ${def.noun} var (${examplesOfNames(result)}). Hangisi olduğunu adıyla yazın ya da önce seçin.`);
    return result;
  };

  // Etiketler: parçanın hemen önündeki eksiz etiket parçanın adı olabilir ("B açısı", "ABC açısı"); tamlayan etiketler sahiptir.
  const owners: MathObject[] = [];
  const named: MathObject[] = [];
  let ownerFound = false;
  for (const i of allowed) {
    const at = labelWordIndex(c, i);
    if (at < 0 || at > main.index) continue;
    const ref = c.labels[i];
    const role = labelRole(c, i);
    const adjacent = at === main.index - 1 || (at === main.index - 2 && /^(?:orta|kesisim|teget|degme|kenar|aci)$/.test(c.words[main.index - 1]));
    if (adjacent && !ref.suffix) {
      const own = candidatesFor(s, ref).filter(x => def.is(x, s));
      if (own.length) { named.push(...own); continue; }
    }
    if (role === 'gen' || (adjacent && !ref.suffix)) {
      owners.push(ownerOf(c, s, i));
      ownerFound = true;
    }
  }
  if (named.length) return finish(named);

  if (!ownerFound) {
    // "yüksekliğin ayağı", "teğetlerin değme noktaları": sahibi de bir parça
    const ownerPart = hits.slice(0, -1).reverse().find(h => /(?:in|un|nin|nun)$/.test(c.words[h.index]));
    if (ownerPart) {
      const pool = s.objects.filter(x => ownerPart.def.is(x, s));
      const focused = [...s.focus, ...s.selection].map(id => s.get(id)).filter((x): x is MathObject => !!x && ownerPart.def.is(x, s));
      owners.push(...(focused.length ? focused : pool));
      ownerFound = true;
      if (!owners.length) fail(`Sahnede ${ownerPart.def.noun} yok.`);
    } else {
      const genitive = clauseNouns(c).filter(n => n.grammarCase === 'gen' && n.index < main.index && !hits.some(h => h.index === n.index));
      if (genitive.length) {
        owners.push(...findTargets(c, s, { ...o, labels: [], nouns: genitive.slice(-1), many: true, filter: undefined }));
        ownerFound = true;
      }
    }
  }
  if (ownerFound) {
    const parts = unique(owners).flatMap(owner => def.of(owner, s));
    if (!parts.length) fail(`${describeList(unique(owners))} için ${def.noun} bulunamadı.`);
    return finish(parts);
  }

  const context = (c.refersToSelection ? [s.selection, s.focus] : [s.focus, s.selection])
    .map(list => list.map(id => s.get(id)).filter((x): x is MathObject => !!x));
  for (const list of context) {
    const direct = list.filter(x => def.is(x, s));
    if (direct.length) return finish(direct);
  }
  for (const list of context) {
    const parts = list.flatMap(owner => def.of(owner, s));
    if (parts.length) return finish(parts);
  }
  const all = s.objects.filter(x => def.is(x, s) && (!o.filter || o.filter(x)));
  if (!all.length) fail(`Sahnede ${def.noun} yok.`);
  if (all.length > 1 && !wantsMany) {
    fail(`Birden fazla ${def.noun} var (${examplesOfNames(all)}). Hangisi olduğunu adıyla yazın ya da önce seçin.`);
  }
  return finish(all);
}
