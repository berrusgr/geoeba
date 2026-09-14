import type { MathObject, PointObject, PolygonObject } from '@/types/math';
import type { CommandHandler } from '../../types';
import type { Clause } from '../../text';
import { triangleCenterPoint } from '../../../commandBindings';
import { COLORS, type CommandScene, fail, trNum } from '../../scene';
import {
  type Ref, isPointRef, isUnknownRef, joinTr, lineFromRef, named, newPointNames, nounOf, pointFromRef, refPoints, refsOf, requestedName, unique,
} from './refs';
import { INNER_TANGENT, MEASURE_NOUN, MEETING, MEETING_AS_SOURCE, PLURAL_ALL, cevianKinds, foreignVerb, polygonOf, triangleOf } from './common';
import { INTERSECTABLE, currentIntersections, ensureMidpoint, ensureRatioPoint, findConstructed, freeName, segmentParameter } from './build';
import {
  FUNCTION_NOUN, ROOTS, type Participant, axesIn, axisParticipant, fnParticipant, functionName, functionTitle, namedFunctions, searchRange, staticIntersections,
} from './functions';

// ---------------------------------------------------------------------------------------------- orta nokta

const MIDPOINT = /\borta ?nokta|\bortasi(?:ni|na|nda|nin)?\b|\borta yer|\b(?:ikiye|yariya) (?:bol|ayir)/;

/** Odakta (önceki cümlede oluşturulan) ya da seçimde yalnızca iki nokta varsa onlar. */
function focusedPair(c: Clause, scene: CommandScene): [PointObject, PointObject] | null {
  for (const ids of c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection]) {
    const objects = [...new Set(ids)].map(id => scene.get(id)).filter((o): o is MathObject => !!o);
    const pts = objects.filter((o): o is PointObject => o.type === 'point');
    if (objects.length === 2 && pts.length === 2) return [pts[0], pts[1]];
  }
  return null;
}

export const midpoint: CommandHandler = {
  id: 'constructions.midpoint',
  examples: [
    'AB orta noktasını oluştur',
    "AB'nin orta noktasını bul",
    "[AB]'nin orta noktası M olsun",
    "A ile B'nin ortasını bul",
    'ABC üçgeninin kenar orta noktalarını oluştur',
    'üçgenin kenar orta noktalarını birleştir',
    'doğru parçasının orta noktasını işaretle',
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN) || !c.has(MIDPOINT)) return 0;
    if (c.has(/\borta ?dikme|\bkenar ?ortay/)) return 0;
    // "açıyı ikiye bölen ışın" açıortaydır.
    if (c.hasNoun('angle') && !c.has(/\borta ?nokta/)) return 0;
    return 70;
  },
  run(c, scene) {
    const refs = refsOf(c);
    const wantedName = requestedName(c);
    if (wantedName && scene.findPoint(wantedName.text)) fail(`${wantedName.text} adlı nokta zaten var. Orta nokta için başka bir ad yazın.`);
    const names = newPointNames(scene, refs);
    const pairs: { a: PointObject; b: PointObject; segment: boolean }[] = [];
    const polygonRef = refs.find(r => r.label && scene.resolveLabel(r.label, ['polygon']).length && (refPoints(scene, r)?.length ?? 3) >= 3);
    const plural = c.has(/\borta ?noktalar/) || c.has(PLURAL_ALL);
    const lineRefs = refs.filter(r => !isPointRef(scene, r)).map(r => lineFromRef(scene, r)).filter(Boolean);
    const pointRefs = refs.filter(r => isPointRef(scene, r) && !(wantedName && r.label === wantedName));
    let polygon: PolygonObject | undefined;

    if (polygonRef || (!lineRefs.length && pointRefs.length < 2 && (c.has(/\bkenar/) || (plural && !c.has(/\bparca/))))) {
      polygon = polygonRef ? scene.resolveLabel(polygonRef.label!, ['polygon'])[0] as PolygonObject : polygonOf(c, scene, refs, { noun: 'çokgen' });
      const pts = polygon.pointIds.map(id => scene.point(id));
      pts.forEach((p, i) => pairs.push({ a: p, b: pts[(i + 1) % pts.length], segment: true }));
    } else if (lineRefs.length) {
      for (const l of lineRefs) pairs.push({ a: l!.a, b: l!.b, segment: true });
    } else if (pointRefs.length === 2) {
      pairs.push({ a: pointFromRef(scene, pointRefs[0]).point, b: pointFromRef(scene, pointRefs[1]).point, segment: false });
    } else if (pointRefs.length === 1) {
      fail(`Orta nokta için iki nokta gerekir. Örneğin “${refPoints(scene, pointRefs[0])?.[0]?.label ?? 'A'} ile B'nin orta noktasını bul” yazın.`);
    } else if (focusedPair(c, scene)) {
      // "A(0;0) ve B(4;0) noktalarını oluştur ve orta noktasını bul", "seçili noktaların orta noktası"
      const [a, b] = focusedPair(c, scene)!;
      pairs.push({ a, b, segment: false });
    } else {
      const unknown = refs.filter(r => r.label && isUnknownRef(scene, r) && r.label !== wantedName && !names.includes(r.label.text));
      if (unknown.length) fail(`${joinTr(unknown.map(r => r.label!.text))} adlı nokta ya da doğru parçası bulunamadı.`);
      if (!scene.ofType('segment').length) fail("Hangi iki noktanın orta noktasını istediğinizi yazın (ör. “AB'nin orta noktasını bul”).");
      const segment = scene.target(c, { types: ['segment'], noun: 'doğru parçası', labels: [] });
      const [a, b] = scene.lineOf(segment)!;
      pairs.push({ a, b, segment: true });
    }

    const made: PointObject[] = [];
    const reused: string[] = [];
    pairs.forEach(({ a, b }, i) => {
      const result = ensureMidpoint(scene, a.id, b.id, { name: freeName(scene, names[i]) ?? (names[i] ? fail(`${names[i]} adlı nokta zaten var. Başka bir ad yazın.`) : undefined) });
      made.push(result.object);
      if (!result.created) reused.push(result.object.label);
    });
    if (polygon) {
      scene.say(`${polygon.label} kenarlarının orta noktaları: ${joinTr(made.map(named))}.`);
      if (c.has(/\bbirlestir|\bcokgen olustur|\bucgen olustur/)) {
        const inner = scene.addPolygon(made.map(p => p.id), { kind: made.length === 3 ? 'triangle' : 'polygon' });
        scene.say(`Orta noktalar birleştirildi: ${inner.label}.`);
      }
    } else {
      pairs.forEach(({ a, b, segment }, i) => scene.say(segment
        ? `[${a.label}${b.label}] parçasının orta noktası ${named(made[i])}.`
        : `${a.label} ve ${b.label} noktalarının orta noktası ${named(made[i])}.`));
      if (c.has(/\bbirlestir/) && made.length === 2 && made[0].id !== made[1].id) {
        const joined = scene.addSegment(made[0].id, made[1].id);
        scene.say(`Orta noktalar birleştirildi: ${joined.label}.`);
      }
    }
    if (reused.length) scene.say(`(${joinTr(reused)} zaten vardı; yenisi oluşturulmadı.)`);
    if (!c.has(/\bbirlestir/)) scene.setFocus(made.map(p => p.id));
  },
};

// ---------------------------------------------------------------------------------------------- oranda bölme

const DATIVE_NUMBERS: Record<string, number> = { bire: 1, ikiye: 2, uce: 3, dorde: 4, bese: 5, altiya: 6, yediye: 7, sekize: 8, dokuza: 9 };
/** "üçe böl", "dörde ayır", "beşe eşit parçaya böl" */
const DATIVE_PARTS = /\b(ikiye|uce|dorde|bese|altiya|yediye|sekize|dokuza) (?:esit )?(?:parca\w* )?(?:bol|ayir|parcala)/;
/** "3'e böl", "4 e eşit parçaya ayır" (rakamla yazılmış parça sayısı + yönelme eki) */
const NUMERIC_PARTS = /#(\d+) (?:e|a|ye|ya) (?:esit )?(?:parca\w* )?(?:bol|ayir|parcala)/;
const RATIO_SEPARATORS = new Set([':', '/', 'bolu', 'e', 'a', 'ye', 'ya']);

/** "2:1", "3/2", "2'ye 3", "iki bölü üç", "ikiye bir", "bire iki" → [m, n] */
function ratioPair(c: Clause): [number, number] | undefined {
  const value = (word: string | undefined): { v: number; dative: boolean } | undefined => {
    if (!word) return undefined;
    if (/^#\d+$/.test(word)) return { v: c.num(word), dative: false };
    if (word in DATIVE_NUMBERS) return { v: DATIVE_NUMBERS[word], dative: true };
    return word === 'bir' ? { v: 1, dative: false } : undefined;
  };
  const w = c.words;
  for (let i = 0; i < w.length; i++) {
    const first = value(w[i]);
    if (!first) continue;
    let j = i + 1;
    if (!first.dative) {
      if (!RATIO_SEPARATORS.has(w[j] ?? '')) continue;
      j++;
    }
    const second = value(w[j]);
    if (second && !second.dative) return [first.v, second.v];
  }
  return undefined;
}

export const ratio: CommandHandler = {
  id: 'constructions.ratio',
  examples: [
    "AB'yi 2:1 oranında böl",
    "AB'yi 3 eşit parçaya böl",
    "[AB] doğru parçasını 2'ye 3 oranında bölen P noktasını bul",
    'AB doğru parçasını dıştan 3:1 oranında böl',
    'AB yi dört eşit parçaya ayır',
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN) || c.hasNoun('angle')) return 0;
    const divide = c.has(/\bbol(?!um|ge|u\b)|\bayir|\bparcala/);
    if (!divide) return 0;
    if (c.has(/\boran/) || c.has(/\besit (?:parca|bol|aral[ig])/) || c.has(/#\d+\s*(?::|\/)\s*#\d+/) || c.has(DATIVE_PARTS) || c.has(NUMERIC_PARTS)) return 71;
    return 0;
  },
  run(c, scene) {
    const refs = refsOf(c);
    const names = newPointNames(scene, refs);
    const lineRef = refs.filter(r => !isPointRef(scene, r)).map(r => lineFromRef(scene, r)).find(Boolean);
    let a: PointObject, b: PointObject;
    if (lineRef) ({ a, b } = lineRef);
    else {
      if (!scene.ofType('segment').length) fail("Bölünecek doğru parçasını yazın (ör. “AB'yi 2:1 oranında böl”).");
      const segment = scene.target(c, { types: ['segment'], noun: 'doğru parçası', labels: [] });
      [a, b] = scene.lineOf(segment)!;
    }
    const parts = c.match(/#(\d+)\s*(?:esit\s+)?(?:parca|bol|aral[ig])/);
    const dative = c.match(DATIVE_PARTS);
    const numeric = c.match(NUMERIC_PARTS);
    if ((parts && c.has(/\besit/)) || dative || numeric) {
      const n = parts && c.has(/\besit/) ? c.num(`#${parts[1]}`) : dative ? DATIVE_NUMBERS[dative[1]] : c.num(`#${numeric![1]}`);
      if (n === 2) {
        const mid = ensureMidpoint(scene, a.id, b.id, { name: freeName(scene, names[0]) });
        scene.say(`[${a.label}${b.label}] iki eşit parçaya bölündü: orta nokta ${named(mid.object)}${mid.created ? '' : ' (zaten vardı)'}.`);
        scene.setFocus([mid.object.id]);
        return;
      }
      if (!Number.isInteger(n) || n < 2 || n > 100) fail('Eşit parça sayısı 2 ile 100 arasında bir tam sayı olmalı.');
      const made: PointObject[] = [];
      for (let k = 1; k < n; k++) made.push(ensureRatioPoint(scene, a.id, b.id, k / n, { name: freeName(scene, names[k - 1]) }).object);
      scene.say(`[${a.label}${b.label}] ${n} eşit parçaya bölündü: ${joinTr(made.map(named))}.`);
      scene.setFocus(made.map(p => p.id));
      return;
    }
    const pair = ratioPair(c);
    if (!pair) fail(`Oranı m:n biçiminde yazın (ör. “${a.label}${b.label}'yi 2:1 oranında böl”) ya da “3 eşit parçaya böl” deyin.`);
    const [x, y] = pair;
    if (!(x >= 0 && y >= 0)) fail('Oranın iki tarafı da negatif olmayan sayılar olmalı.');
    const external = c.has(/\bdistan\b/);
    let t: number;
    if (external) {
      if (Math.abs(x - y) < 1e-12) fail('Dıştan bölmede oranın iki tarafı eşit olamaz.');
      t = x / (x - y);
    } else {
      if (x + y < 1e-12) fail('Oran toplamı sıfır olamaz.');
      t = x / (x + y);
    }
    const result = ensureRatioPoint(scene, a.id, b.id, t, { name: freeName(scene, names[0]) });
    const p = result.object;
    scene.say(`[${a.label}${b.label}] ${external ? 'dıştan ' : ''}${trNum(x)}:${trNum(y)} oranında bölündü: ${named(p)} (|${a.label}${p.label}| : |${p.label}${b.label}| = ${trNum(x)} : ${trNum(y)}).${result.created ? '' : ' Bu nokta zaten vardı.'}`);
    scene.setFocus([p.id]);
  },
};

// ---------------------------------------------------------------------------------------------- üçgen merkezleri

type CenterKind = 'centroid' | 'orthocenter' | 'circumcenter' | 'incenter';
const MERKEZ = String.raw`merkez(?:i|ini|inin|ine|leri|lerini|lerinin)?\b`;
const MEET = String.raw`\w*\s+(?:kesis|kesim|ortak|kest)`;
const CENTER_PATTERNS: [CenterKind, RegExp, string, string][] = [
  ['centroid', new RegExp(String.raw`\bagirlik ${MERKEZ}|\bagirlik\b.*\b${MERKEZ}|\bkenar ?ortay${MEET}`), 'G', 'ağırlık merkezi'],
  ['orthocenter', new RegExp(String.raw`\bdiklik ${MERKEZ}|\bdiklik\b.*\b${MERKEZ}|\byukseklik${MEET}`), 'H', 'diklik merkezi'],
  ['circumcenter', new RegExp(String.raw`\bcevrel (?:cember(?:in)? |dairenin )?${MERKEZ}|\borta ?dikme${MEET}`), 'O', 'çevrel çemberinin merkezi'],
  ['incenter', new RegExp(String.raw`(?:${INNER_TANGENT.source}) (?:cember(?:in)? |dairenin )?${MERKEZ}|\bic ${MERKEZ}|\baci ?ortay${MEET}`), 'I', 'iç teğet çemberinin merkezi'],
];

export function ensureCenter(scene: CommandScene, ids: [string, string, string], kind: CenterKind, name?: string): { point: PointObject; created: boolean } {
  const existing = findConstructed(scene, 'triangleCenter', r => r.center === kind && r.pointIds.length === 3 && ids.every(id => r.pointIds.includes(id)));
  if (existing) return { point: existing, created: false };
  const conventional = CENTER_PATTERNS.find(p => p[0] === kind)![2];
  const [a, b, cc] = ids.map(id => scene.point(id));
  let position;
  try { position = triangleCenterPoint(a, b, cc, kind); } catch (error) { fail(error instanceof Error ? error.message : 'Üçgen merkezi hesaplanamadı.'); }
  const point = scene.addPoint(position, {
    label: name ?? freeName(scene, conventional), color: COLORS.construction, construction: { kind: 'triangleCenter', pointIds: ids, center: kind },
  });
  return { point, created: true };
}

/** "üçgenin tüm / dört merkezini bul" */
const ALL_CENTERS = /(?:\b(?:tum|butun)|#\d+) (?:ozel )?merkez(?:ler|ini\b)|\bmerkezlerin(?:in)? (?:hepsi|tum)/;
/** "karenin merkezi", "düzgün altıgenin merkezini bul" (üçgen dışındaki çokgenler) */
const POLYGON_CENTER = /\b(?:kare(?!li|kok)|dikdortgen|cokgen|dortgen|paralelkenar|(?:bes|alti|yedi|sekiz|dokuz|on|oniki)gen)\w* merkez(?:i|ini|inin)?\b/;
const VAGUE_TRIANGLE_CENTER = /\bucgen\w* (?:ozel )?merkez(?:i|ini|leri|lerini)?\b/;

/** Paralelkenarda köşegen orta noktası, kirişler çokgeninde çevrel merkez. */
function polygonCenter(c: Clause, scene: CommandScene, refs: Ref[], names: string[]) {
  const polygon = polygonOf(c, scene, refs, { noun: 'dörtgen ya da çokgen', minSize: 4 });
  const pts = polygon.pointIds.map(id => scene.point(id));
  if (names[0] && scene.findPoint(names[0])) fail(`${names[0]} adlı nokta zaten var. Başka bir ad yazın.`);
  const name = names[0] ?? freeName(scene, 'O');
  const [p, q, r, s] = pts;
  if (pts.length === 4 && Math.hypot(p.x + r.x - q.x - s.x, p.y + r.y - q.y - s.y) < 1e-9 * (1 + Math.hypot(r.x - p.x, r.y - p.y))) {
    const { object, created } = ensureMidpoint(scene, p.id, r.id, { name });
    scene.say(`${polygon.label} dörtgeninin merkezi (köşegenlerin kesişimi) ${named(object)}${created ? '' : ' (zaten vardı)'}.`);
    scene.setFocus([object.id]);
    return;
  }
  let center;
  try { center = triangleCenterPoint(p, q, r, 'circumcenter'); } catch { center = undefined; }
  const radius = center ? Math.hypot(p.x - center.x, p.y - center.y) : 0;
  if (!center || pts.some(x => Math.abs(Math.hypot(x.x - center.x, x.y - center.y) - radius) > 1e-6 * (1 + radius))) {
    fail(`${polygon.label} çokgeninin tek bir merkezi yok: köşeleri aynı çember üzerinde değil ve paralelkenar değil. Köşegenlerin kesişimi için “köşegenlerin kesişim noktasını bul” yazın.`);
  }
  const { point, created } = ensureCenter(scene, [p.id, q.id, r.id], 'circumcenter', name);
  scene.say(`${polygon.label} çokgeninin merkezi (köşelerinden geçen çemberin merkezi) ${named(point)}${created ? '' : ' (zaten vardı)'}.`);
  scene.setFocus([point.id]);
}

export const centers: CommandHandler = {
  id: 'constructions.centers',
  examples: [
    'ağırlık merkezini bul',
    'ABC üçgeninin diklik merkezini oluştur',
    'çevrel çemberin merkezini bul',
    'iç teğet çemberin merkezini işaretle',
    'kenarortayların kesişim noktasını bul',
    'A, B ve C noktalarının ağırlık merkezi',
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN)) return 0;
    // "orta dikme ile açıortayın kesişimi": farklı türden iki doğrunun kesişimi bir üçgen merkezi değildir.
    if (cevianKinds(c).length >= 2 && !c.has(/\bagirlik|\bdiklik|\bcevrel|\bmerkez/)) return 0;
    if (CENTER_PATTERNS.some(([, re]) => c.has(re))) return 74;
    if (c.coords.length || c.has(/\bcember|\bdaire|\belips|\bgecen|\bdogru|\bisin|\bmerkezli/)) return 0;
    return c.has(ALL_CENTERS) || c.has(POLYGON_CENTER) || c.has(VAGUE_TRIANGLE_CENTER) ? 74 : 0;
  },
  run(c, scene) {
    const refs = refsOf(c);
    const names = newPointNames(scene, refs);
    let kinds = CENTER_PATTERNS.filter(([, re]) => c.has(re));
    if (!kinds.length && c.has(POLYGON_CENTER)) return polygonCenter(c, scene, refs, names);
    if (!kinds.length && c.has(VAGUE_TRIANGLE_CENTER) && !c.has(ALL_CENTERS)) {
      fail('Üçgenin dört özel merkezi var: ağırlık merkezi, diklik merkezi, çevrel çemberin merkezi ve iç teğet çemberin merkezi. Hangisini istediğinizi yazın (ör. “ağırlık merkezini bul”).');
    }
    if (!kinds.length) kinds = CENTER_PATTERNS;
    const tri = triangleOf(c, scene, refs, { required: true })!;
    const focus: string[] = [];
    kinds.forEach(([kind, , , title], i) => {
      const name = names[i];
      if (name && scene.findPoint(name)) fail(`${name} adlı nokta zaten var. Başka bir ad yazın.`);
      const { point, created } = ensureCenter(scene, tri.ids, kind, name);
      focus.push(point.id);
      scene.say(`${tri.name} üçgeninin ${title} ${named(point)}${created ? '' : ' (zaten vardı)'}.`);
    });
    scene.setFocus(focus);
  },
};

// ---------------------------------------------------------------------------------------------- kesişim

const TYPE_OF_NOUN: Record<string, readonly MathObject['type'][]> = {
  line: ['line', 'segment', 'ray'], segment: ['segment'], ray: ['ray'], circle: ['circle'], arc: ['arc'], sector: ['sector'], ellipse: ['ellipse'], side: ['segment', 'line'],
};
const TYPE_ORDER: MathObject['type'][] = ['line', 'segment', 'ray', 'circle', 'arc', 'sector', 'ellipse'];
const NOUN_TR: Record<string, string> = { line: 'doğru', segment: 'doğru parçası', ray: 'ışın', circle: 'çember', arc: 'yay', sector: 'daire dilimi', ellipse: 'elips', side: 'kenar' };
const sameSet = (x: string[], y: string[]) => x.length === y.length && x.every(id => y.includes(id));

/**
 * Adın türü: hemen ardından gelen tür adı ("c1 çemberi", "A merkezli çember") ya da başka adlar ve "ve/ile" atlanarak
 * gelen ÇOĞUL tür adı ("AB ve CD doğrularının").
 */
function nounAfter(c: Clause, pos: number): { tag: string; at: number[] } | null {
  let j = pos + 1;
  if (/^(?:nin|nun|in|un|ye|ya|de|da|den|dan|yi|yu)$/.test(c.words[j] ?? '')) j++;
  const direct = nounOf(c.words[j], c.words[j + 1]);
  if (direct) {
    if (direct.tag === 'center') {
      const next = nounOf(c.words[j + 1], c.words[j + 2]);
      return next && next.tag in TYPE_OF_NOUN ? { tag: next.tag, at: [j, j + 1, j + 2].slice(0, 1 + next.width) } : null;
    }
    return direct.tag in TYPE_OF_NOUN ? { tag: direct.tag, at: [j, j + 1].slice(0, direct.width) } : null;
  }
  for (let k = pos + 1; k < c.words.length; k++) {
    const w = c.words[k];
    if (/^[$@]\d+/.test(w) || /^(?:ve|ile|,|nin|nun|in|un|ye|ya|de|da|den|dan|yi|yu)$/.test(w)) continue;
    const noun = nounOf(w, c.words[k + 1]);
    return noun && noun.plural && noun.tag in TYPE_OF_NOUN ? { tag: noun.tag, at: [k, k + 1].slice(0, noun.width) } : null;
  }
  return null;
}

function objectsFromClause(c: Clause, scene: CommandScene, refs: Ref[], skipWords: Set<number>) {
  const chosen: MathObject[] = [];
  const attached = new Set<number>(skipWords);
  const createLater: { a: PointObject; b: PointObject; tag: string }[] = [];
  // "kesişim noktası E olsun", "kesişim noktasını K olarak işaretle": yeni noktanın adı nesne değildir.
  const requested = requestedName(c);
  const naming = (r: Ref) => !!r.label && isUnknownRef(scene, r) && (r.label === requested || /^nokta/.test(c.words[r.pos - 1] ?? ''));
  for (const r of refs) {
    if (!r.label || naming(r)) continue;
    const noun = nounAfter(c, r.pos);
    if (noun) noun.at.forEach(i => attached.add(i));
    const types = (noun ? TYPE_OF_NOUN[noun.tag] : INTERSECTABLE) as MathObject['type'][];
    const found = scene.resolveLabel(r.label, types).filter(o => (INTERSECTABLE as readonly string[]).includes(o.type));
    if (found.length) {
      const sorted = [...found].sort((x, y) => TYPE_ORDER.indexOf(x.type) - TYPE_ORDER.indexOf(y.type));
      chosen.push(sorted[0]);
      continue;
    }
    const pts = refPoints(scene, r);
    if (pts && pts.length === 2 && (!noun || ['line', 'segment', 'ray', 'side'].includes(noun.tag))) {
      createLater.push({ a: pts[0], b: pts[1], tag: noun?.tag ?? 'line' });
      continue;
    }
    if (!pts) fail(`${r.label.text} adlı ${noun ? NOUN_TR[noun.tag] : 'nesne'} bulunamadı.`);
    if (pts.length === 1 && noun) fail(`${r.label.text} merkezli ya da adlı bir ${NOUN_TR[noun.tag]} bulunamadı.`);
  }
  // Adsız tür adları: "iki çemberin", "çember ile doğrunun"
  const wanted: { tag: string; count: number }[] = [];
  c.words.forEach((w, j) => {
    if (attached.has(j) || /^[$@]\d+/.test(w)) return;
    const noun = nounOf(w, c.words[j + 1]);
    if (!noun || !(noun.tag in TYPE_OF_NOUN) || noun.tag === 'side') return;
    if (j > 0 && /^dogru$/.test(c.words[j - 1]) && noun.tag === 'segment') return;
    const prev = c.words[j - 1] ?? '';
    const count = /^#\d+$/.test(prev) ? c.num(prev) : noun.plural ? 2 : 1;
    wanted.push({ tag: noun.tag, count });
  });
  return { chosen: unique(chosen), createLater, wanted };
}

// ----------------------------------------------------------------- inşa adlarıyla anılan doğrular ("orta dikme ile açıortay")

const pointAt = (scene: CommandScene, id: string) => { const p = scene.get(id); return p?.type === 'point' ? p : undefined; };
const isPerpBisector = (scene: CommandScene, o: MathObject) => {
  if (o.type !== 'line') return false;
  const m = pointAt(scene, o.point1Id), d = pointAt(scene, o.point2Id);
  return m?.construction?.kind === 'midpoint' && d?.construction?.kind === 'direction' && d.construction.mode === 'perpendicular' && d.construction.throughId === m.id;
};
const isBisectorLine = (scene: CommandScene, o: MathObject) => {
  if (o.type === 'ray') {
    const h = pointAt(scene, o.throughPointId);
    return h?.construction?.kind === 'bisector' && h.construction.pointIds[1] === o.startPointId;
  }
  if (o.type !== 'line') return false;
  const d = pointAt(scene, o.point2Id);
  return d?.construction?.kind === 'direction' && d.construction.linePointIds.some(id => pointAt(scene, id)?.construction?.kind === 'bisector');
};
const cevianEnd = (scene: CommandScene, o: MathObject, kind: 'foot' | 'midpoint') => {
  if (o.type !== 'segment') return false;
  return [[o.startPointId, o.endPointId], [o.endPointId, o.startPointId]].some(([v, e]) => {
    const rule = pointAt(scene, e)?.construction;
    return kind === 'foot' ? rule?.kind === 'foot' && rule.sourceId === v : rule?.kind === 'midpoint' && !rule.pointIds.includes(v) && !!pointAt(scene, v);
  });
};
const isDirectionLine = (mode: 'parallel' | 'perpendicular') => (scene: CommandScene, o: MathObject) => {
  if (o.type !== 'line' || isPerpBisector(scene, o) || isBisectorLine(scene, o)) return false;
  const d = pointAt(scene, o.point2Id);
  return d?.construction?.kind === 'direction' && d.construction.mode === mode;
};

const CONSTRUCTION_NOUNS: { title: string; example: string; at: (w: string[], i: number) => number; test: (scene: CommandScene, o: MathObject) => boolean }[] = [
  { title: 'orta dikme', example: "AB'nin orta dikmesini çiz", at: (w, i) => /^ortadikme/.test(w[i]) ? 1 : w[i] === 'orta' && /^dikme/.test(w[i + 1] ?? '') ? 2 : 0, test: isPerpBisector },
  { title: 'açıortay', example: 'B köşesinin açıortayını çiz', at: (w, i) => /^aciortay/.test(w[i]) ? 1 : w[i] === 'aci' && /^ortay/.test(w[i + 1] ?? '') ? 2 : 0, test: isBisectorLine },
  { title: 'yükseklik', example: 'C köşesinden yükseklik çiz', at: (w, i) => /^yukseklik|^yukseklig/.test(w[i]) || (/^dikme/.test(w[i]) && w[i - 1] !== 'orta') ? 1 : 0, test: (s, o) => cevianEnd(s, o, 'foot') },
  { title: 'kenarortay', example: "A'dan kenarortay çiz", at: (w, i) => /^kenarortay/.test(w[i]) ? 1 : w[i] === 'kenar' && /^ortay/.test(w[i + 1] ?? '') ? 2 : 0, test: (s, o) => cevianEnd(s, o, 'midpoint') },
  {
    title: 'teğet', example: 'P noktasından çembere teğet çiz',
    at: (w, i) => /^te[gy]et/.test(w[i]) && w[i - 1] !== 'ic' && !/^(?:cember|daire)/.test(w[i + 1] ?? '') ? 1 : 0,
    test: (s, o) => o.type === 'line' && [o.point1Id, o.point2Id].some(id => pointAt(s, id)?.construction?.kind === 'tangent'),
  },
  { title: 'paralel doğru', example: "C'den AB'ye paralel doğru çiz", at: (w, i) => /^paralel/.test(w[i]) && !/^kenar/.test(w[i + 1] ?? '') ? (/^dogru/.test(w[i + 1] ?? '') ? 2 : 1) : 0, test: isDirectionLine('parallel') },
  { title: 'dik doğru', example: "C'den AB'ye dik doğru çiz", at: (w, i) => w[i] === 'dik' && /^dogru/.test(w[i + 1] ?? '') ? 2 : 0, test: isDirectionLine('perpendicular') },
];

/** Tanım noktaları ve inşa kuralının dayandığı noktalar ("A'dan çizilen kenarortay" süzmesi için). */
function relatedPointIds(scene: CommandScene, o: MathObject): string[] {
  const ids = new Set(scene.definingPointIds(o));
  for (const id of [...ids]) {
    const rule = pointAt(scene, id)?.construction;
    if (!rule) continue;
    if (rule.kind === 'midpoint' || rule.kind === 'ratio' || rule.kind === 'bisector') rule.pointIds.forEach(x => ids.add(x));
    else if (rule.kind === 'foot') [rule.sourceId, ...rule.linePointIds].forEach(x => ids.add(x));
    else if (rule.kind === 'direction') [rule.throughId, ...rule.linePointIds].forEach(x => ids.add(x));
    else if (rule.kind === 'tangent') ids.add(rule.sourceId);
  }
  return [...ids];
}

function constructionObjects(c: Clause, scene: CommandScene, refs: Ref[]) {
  const objects: MathObject[] = [];
  const consumed = new Set<Ref>();
  const words = new Set<number>();
  const occurrences: { noun: typeof CONSTRUCTION_NOUNS[number]; pos: number }[] = [];
  for (let i = 0; i < c.words.length; i++) {
    for (const noun of CONSTRUCTION_NOUNS) {
      const width = noun.at(c.words, i);
      if (!width) continue;
      occurrences.push({ noun, pos: i });
      for (let k = 0; k < width; k++) words.add(i + k);
      i += width - 1;
      break;
    }
  }
  occurrences.forEach(({ noun, pos }, index) => {
    const previous = index > 0 ? occurrences[index - 1].pos : -1;
    let candidates = scene.objects.filter(o => !objects.includes(o) && noun.test(scene, o));
    for (const r of refs) {
      if (consumed.has(r) || r.pos <= previous || r.pos >= pos || pos - r.pos > 3) continue;
      const pts = refPoints(scene, r);
      if (!pts) continue;
      // Önce doğrudan tanım noktası ("A'dan çizilen kenarortay" → [AD]), yoksa kuralın dayandığı noktalar ("BC'ye ait kenarortay").
      const direct = candidates.filter(o => pts.every(p => scene.definingPointIds(o).includes(p.id)));
      const narrowed = direct.length ? direct : candidates.filter(o => { const related = relatedPointIds(scene, o); return pts.every(p => related.includes(p.id)); });
      if (narrowed.length) { candidates = narrowed; consumed.add(r); }
    }
    if (candidates.length > 1) {
      const focused = candidates.filter(o => scene.focus.includes(o.id) || scene.selection.includes(o.id));
      if (focused.length) candidates = focused;
    }
    if (!candidates.length) fail(`Çizimde ${noun.title} yok. Önce ${noun.title} çizin (ör. “${noun.example}”), sonra kesişimini isteyin.`);
    if (candidates.length > 1) fail(`Birden fazla ${noun.title} var (${joinTr(candidates.slice(0, 4).map(o => o.label))}). Hangisi olduğunu yazın (ör. “A'dan çizilen ${noun.title}”) ya da önce seçin.`);
    objects.push(candidates[0]);
  });
  return { objects, consumed, words };
}

/** Aynı üçgenin kenarortay, yükseklik, açıortay ya da orta dikmeleri (en az iki) → ortak merkez. */
function ceviansCenter(scene: CommandScene, objects: MathObject[]): { kind: CenterKind; ids: [string, string, string] } | null {
  const found: { kind: CenterKind; ids: string[] }[] = [];
  for (const o of objects) {
    const before = found.length;
    if (o.type === 'segment') {
      for (const [v, end] of [[o.startPointId, o.endPointId], [o.endPointId, o.startPointId]]) {
        const e = scene.get(end);
        if (e?.type !== 'point' || !e.construction) continue;
        if (e.construction.kind === 'midpoint' && !e.construction.pointIds.includes(v)) { found.push({ kind: 'centroid', ids: [v, ...e.construction.pointIds] }); break; }
        if (e.construction.kind === 'foot' && e.construction.sourceId === v) { found.push({ kind: 'orthocenter', ids: [v, ...e.construction.linePointIds] }); break; }
      }
    } else if (o.type === 'ray') {
      const h = scene.get(o.throughPointId);
      if (h?.type === 'point' && h.construction?.kind === 'bisector' && h.construction.pointIds[1] === o.startPointId) found.push({ kind: 'incenter', ids: [...h.construction.pointIds] });
    } else if (o.type === 'line') {
      const m = scene.get(o.point1Id), d = scene.get(o.point2Id);
      if (m?.type === 'point' && d?.type === 'point' && m.construction?.kind === 'midpoint' && d.construction?.kind === 'direction'
        && d.construction.mode === 'perpendicular' && d.construction.throughId === m.id) found.push({ kind: 'circumcenter', ids: [...m.construction.pointIds] });
    }
    if (found.length === before) return null;
  }
  const ids = unique(found.flatMap(f => f.ids));
  if (found.length < 2 || new Set(found.map(f => f.kind)).size !== 1 || ids.length !== 3) return null;
  return { kind: found[0].kind, ids: ids as [string, string, string] };
}

/** "A'dan BC'ye dik doğru çiz ve kesişim noktasını bul": dik doğrunun dayandığı doğru. */
function baseLineOf(scene: CommandScene, o: MathObject): MathObject | undefined {
  if (o.type !== 'line' || isPerpBisector(scene, o)) return undefined;
  const rule = pointAt(scene, o.point2Id)?.construction;
  if (rule?.kind !== 'direction' || rule.mode !== 'perpendicular') return undefined;
  return scene.objects
    .filter(x => (x.type === 'line' || x.type === 'segment' || x.type === 'ray') && x.id !== o.id && sameSet(scene.definingPointIds(x), rule.linePointIds))
    .sort((x, y) => TYPE_ORDER.indexOf(x.type) - TYPE_ORDER.indexOf(y.type))[0];
}

const INTERSECTS_QUESTION = /\bkesis\w*\s+m[iu]\w*\b|\bkesisir\w* mi/;

export const intersection: CommandHandler = {
  id: 'constructions.intersection',
  examples: [
    'AB ve CD doğrularının kesişim noktasını bul',
    'c1 ile BC doğrusunun kesişimi',
    'iki çemberin kesişim noktalarını bul',
    'çember ile doğrunun kesişim noktalarını işaretle',
    'M merkezli çember ile BC doğrusunu kesiştir',
    'seçili iki nesnenin kesişim noktalarını oluştur',
    'orta dikme ile açıortayın kesişim noktasını bul',
    'f ve g fonksiyonlarının kesişim noktalarını bul',
    'f nin x eksenini kestiği noktaları bul',
  ],
  match(c, scene) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN)) return 0;
    // "f'nin kökleri" (x ekseniyle kesişim); "9'un kökü" gibi sayı kökleri değil.
    const roots = c.has(ROOTS) && scene.ofType('function').length > 0 && !c.numbers.length;
    if (!c.has(MEETING) && !c.has(/\bkes(?:er|erler|iyor|iyorlar)\b/) && !roots) return 0;
    if (c.has(/\bkes(?:er|iyor)/) && !c.has(MEETING) && !roots && !axesIn(c).length && !c.has(FUNCTION_NOUN)) return 0;
    // Tek türden doğruların ("kenarortayların kesişimi") ortak noktası üçgen merkezidir; köşegenler de kendi işleyicisinde.
    if (cevianKinds(c).length <= 1 && c.has(/\b(?:kenar ?ortay|yukseklik|aci ?ortay|orta ?dikme)\w*\s+(?:kesis|kesim|ortak|kest)/)) return 0;
    if (c.has(/\bkosegen\w*\s+(?:kesis|kesim|ortak|kest)/)) return 0;
    // "kesişim noktasından AB'ye dik çiz": kesişim noktası kaynaktır, istenen iş başka.
    if (c.has(MEETING_AS_SOURCE)) return 0;
    return 70;
  },
  run(c, scene) {
    const refs = refsOf(c);
    const { fns: namedFns, labelIndexes } = namedFunctions(c, scene);
    const functionRefs = new Set(refs.filter(r => r.kind === 'label' && labelIndexes.has(r.index)));
    const construct = constructionObjects(c, scene, refs.filter(r => !functionRefs.has(r)));
    const rest = refs.filter(r => !functionRefs.has(r) && !construct.consumed.has(r));
    const names = newPointNames(scene, rest);
    const axes = axesIn(c);
    const fnNoun = c.has(FUNCTION_NOUN);
    const extras: Participant[] = [];
    if (fnNoun && !namedFns.length && !scene.ofType('function').length) {
      fail('Fonksiyon bulunamadı. Önce fonksiyonu tanımlayın (ör. “f(x) = x^2 - 4”), sonra kesişimini isteyin.');
    }
    // "f ve g nin kesişimi" ama çizimde bu adlarda fonksiyon yok
    const known = new Set(scene.ofType('function').map(functionName).filter(Boolean));
    const missingFns = [...new Set(c.words.filter(w => /^[fgh]$/.test(w)))].filter(n => !known.has(n));
    if (missingFns.length) fail(`${joinTr(missingFns)} adlı fonksiyon bulunamadı. Önce fonksiyonu tanımlayın (ör. “${missingFns[0]}(x) = x^2 - 4”), sonra kesişimini isteyin.`);
    namedFns.forEach(fn => extras.push(fnParticipant(scene, fn)));
    axes.forEach(axis => extras.push(axisParticipant(axis)));

    const { chosen, createLater, wanted } = objectsFromClause(c, scene, rest, construct.words);
    const objects: MathObject[] = unique([...construct.objects, ...chosen]);
    for (const { a, b, tag } of createLater) {
      objects.push(tag === 'segment' || tag === 'side' ? scene.addSegment(a.id, b.id) : tag === 'ray' ? scene.addRay(a.id, b.id) : scene.addLine(a.id, b.id));
    }
    if (fnNoun && !namedFns.length) {
      const count = c.match(/#(\d+) (?:fonksiyon|grafi|egri)/);
      const need = count ? c.num(`#${count[1]}`) : c.has(/\b(?:fonksiyon|grafik|grafig|egri)\w*l[ae]r/) ? 2 : Math.max(1, 2 - objects.length - extras.length - wanted.length);
      const all = scene.ofType('function');
      const inFocus = all.filter(fn => scene.focus.includes(fn.id) || scene.selection.includes(fn.id));
      const source = inFocus.length >= need ? inFocus : all;
      if (source.length < need) fail(`Yeterli fonksiyon yok (${all.length} tane var).`);
      if (source.length > need) fail(`Birden fazla fonksiyon var (${joinTr(source.map(functionTitle))}). Hangisi olduğunu adıyla yazın (ör. “f nin x eksenini kestiği noktaları bul”).`);
      source.slice(0, need).forEach(fn => extras.push(fnParticipant(scene, fn)));
    }
    const taken = () => objects.length + extras.length;
    for (const { tag, count } of wanted) {
      if (taken() >= 2 && wanted.length === 1 && count === 1) break;
      const types = TYPE_OF_NOUN[tag];
      const pool = scene.objects.filter(o => types.includes(o.type) && !objects.some(x => x.id === o.id));
      const inFocus = pool.filter(o => scene.focus.includes(o.id) || scene.selection.includes(o.id));
      const need = Math.min(count, Math.max(0, 2 - taken()) || count);
      const source = inFocus.length >= need ? inFocus : pool;
      if (source.length < need) fail(pool.length ? `Yeterli ${NOUN_TR[tag]} yok.` : `Sahnede ${NOUN_TR[tag]} yok. Önce ${NOUN_TR[tag]} oluşturun.`);
      if (source.length > need) fail(`Birden fazla ${NOUN_TR[tag]} var (${joinTr(source.slice(0, 4).map(o => o.label))}). Hangisi olduğunu adıyla yazın ya da önce seçin.`);
      objects.push(...source.slice(0, need));
    }
    const nothingNamed = !chosen.length && !createLater.length && !wanted.length && !construct.objects.length && !extras.length;
    if (taken() < 2 && nothingNamed) {
      // "kenarortayları çiz" ardından "kesişim noktasını bul": üçgenin özel merkezi
      for (const ids of c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection]) {
        const cevians = ceviansCenter(scene, ids.map(id => scene.get(id)).filter((o): o is MathObject => !!o));
        if (!cevians) continue;
        const title = CENTER_PATTERNS.find(p => p[0] === cevians.kind)![3];
        const { point, created } = ensureCenter(scene, cevians.ids, cevians.kind, freeName(scene, names[0]));
        scene.say(`Bu doğrular aynı noktada kesişir: ${title} ${named(point)}${created ? '' : ' (zaten vardı)'}.`);
        scene.setFocus([point.id]);
        return;
      }
    }
    if (taken() < 2) {
      const usable = (o: MathObject | undefined): o is MathObject => !!o && ((INTERSECTABLE as readonly string[]).includes(o.type) || (extras.length > 0 && o.type === 'function'))
        && !objects.some(x => x.id === o.id) && !extras.some(x => x.kind === 'fn' && x.fn.id === o.id);
      const pool = (list: string[]) => unique(list).map(id => scene.get(id)).filter(usable);
      const focusPool = pool(c.refersToSelection ? scene.selection : scene.focus);
      // Tek başına odaktaki dik doğru: dayandığı doğruyla kesiştirilir.
      const base = taken() === 0 && focusPool.length === 1 ? baseLineOf(scene, focusPool[0]) : undefined;
      const all = scene.objects.filter(usable);
      const need = 2 - taken();
      const candidates = base ? [focusPool[0], base] : [focusPool, pool(c.refersToSelection ? scene.focus : scene.selection), all].find(list => list.length === need);
      if (!candidates) {
        fail(extras.length
          ? `Hangi ${extras.some(x => x.kind === 'axis') ? 'fonksiyonun ya da nesnenin eksenle' : 'nesneyle'} kesişimini istediğinizi yazın (ör. “f nin x eksenini kestiği noktaları bul”).`
          : 'Hangi iki nesnenin kesişimini istediğinizi yazın (ör. “AB ve CD doğrularının kesişim noktasını bul”).');
      }
      for (const o of candidates) {
        if (o.type === 'function') extras.push(fnParticipant(scene, o));
        else objects.push(o);
      }
    }

    const participants: Participant[] = [...objects.map(obj => ({ kind: 'obj' as const, obj, title: obj.label })), ...extras];
    const pairs: [Participant, Participant][] = [];
    for (let i = 0; i < participants.length; i++) for (let j = i + 1; j < participants.length; j++) pairs.push([participants[i], participants[j]]);
    if (pairs.length > 15) fail('En fazla altı nesnenin kesişimleri birlikte bulunabilir.');

    const focus: string[] = [];
    let nameIndex = 0;
    let found = 0;
    let staticNote: 'function' | 'axis' | '' = '';
    const misses: string[] = [];
    const nextName = () => {
      const name = names[nameIndex++];
      if (name && scene.findPoint(name)) fail(`${name} adlı nokta zaten var. Başka bir ad yazın.`);
      return name;
    };
    for (const [p, q] of pairs) {
      if (p.kind === 'obj' && q.kind === 'obj') {
        const [first, second] = [p.obj, q.obj];
        const ellipse = [first, second].find(o => o.type === 'ellipse');
        if (ellipse && ellipse.type === 'ellipse' && ellipse.rotation) fail('Döndürülmüş elipsin kesişimi hesaplanamıyor.');
        const points = currentIntersections(scene, first, second);
        if (!points) fail(`${first.label} ile ${second.label} kesişimi hesaplanamıyor. Doğru–doğru, doğru–çember, çember–çember ve doğru–elips kesişimleri desteklenir.`);
        if (!points.length) {
          const parallel = scene.lineOf(first) && scene.lineOf(second);
          misses.push(`${first.label} ile ${second.label} şu anda kesişmiyor${parallel ? ' (paraleller)' : ''}.`);
          continue;
        }
        const made: string[] = [];
        points.forEach((position, index) => {
          found++;
          const same = scene.points().find(pt => pt.construction?.kind === 'intersection' && pt.construction.index === index
            && pt.construction.objectIds[0] === first.id && pt.construction.objectIds[1] === second.id)
            // Kesişimde zaten bir tanım noktası duruyorsa (teğetin değme noktası, orta dikmenin orta noktası, kenarortayın ayağı) yenisi eklenmez.
            ?? scene.points().find(pt => pt.visible && Math.hypot(pt.x - position.x, pt.y - position.y) < 1e-9
              && (scene.definingPointIds(first).includes(pt.id) || scene.definingPointIds(second).includes(pt.id)));
          if (same) { focus.push(same.id); made.push(`${named(same)} (zaten vardı)`); return; }
          const point = scene.addPoint(position, { label: nextName(), color: COLORS.intersection, construction: { kind: 'intersection', objectIds: [first.id, second.id], index } });
          focus.push(point.id);
          const outside = [first, second].filter(o => {
            const t = segmentParameter(scene, o, point);
            return t !== null && ((o.type === 'segment' && (t < -1e-9 || t > 1 + 1e-9)) || (o.type === 'ray' && t < -1e-9));
          }).map(o => o.label);
          made.push(`${named(point)}${outside.length ? ` (${joinTr(outside)} uzantısında)` : ''}`);
        });
        scene.say(points.length === 1
          ? `${first.label} ile ${second.label} kesişim noktası: ${made[0]}.`
          : `${first.label} ile ${second.label} ${points.length} noktada kesişiyor: ${joinTr(made)}.`);
        continue;
      }

      // Fonksiyon ya da eksen içeren çift: sayısal, sabit noktalar
      const points = staticIntersections(scene, p, q);
      if (!points) fail(`${p.title} ile ${q.title} kesişimi hesaplanamıyor. Fonksiyon–fonksiyon, fonksiyon–doğru, fonksiyon–çember ve eksenlerle kesişim desteklenir.`);
      const fnInvolved = p.kind === 'fn' || q.kind === 'fn';
      if (!staticNote || fnInvolved) staticNote = fnInvolved ? 'function' : 'axis';
      const [lo, hi] = searchRange(scene);
      const fn = [p, q].find(x => x.kind === 'fn');
      const axis = [p, q].find((x): x is Extract<Participant, { kind: 'axis' }> => x.kind === 'axis');
      if (!points.length) {
        misses.push(`${p.title} ile ${q.title} ${fnInvolved && !(axis?.axis === 'y') ? `x = ${trNum(lo)} … ${trNum(hi)} aralığında ` : ''}kesişmiyor.`);
        continue;
      }
      const view = scene.viewCenter();
      const limited = points.length > 20
        ? [...points].sort((u, v) => Math.hypot(u.x - view.x, u.y - view.y) - Math.hypot(v.x - view.x, v.y - view.y)).slice(0, 20).sort((u, v) => u.x - v.x)
        : points;
      const made = limited.map(position => {
        found++;
        const same = scene.points().find(pt => pt.visible && Math.hypot(pt.x - position.x, pt.y - position.y) < 1e-9);
        if (same) { focus.push(same.id); return `${named(same)} (zaten vardı)`; }
        const point = scene.addPoint(position, { label: nextName(), color: COLORS.intersection });
        focus.push(point.id);
        return named(point);
      });
      const more = points.length > limited.length ? ` (${points.length} noktadan görünüme en yakın 20'si)` : '';
      if (fn && axis && [p, q].every(x => x.kind !== 'obj')) {
        const rootsWord = axis.axis === 'x' && c.has(ROOTS) ? ' (kökleri)' : '';
        scene.say(`${fn.title} fonksiyonunun ${axis.title}ni kestiği ${made.length === 1 ? 'nokta' : 'noktalar'}${rootsWord}: ${joinTr(made)}${more}.`);
      } else {
        scene.say(made.length === 1 ? `${p.title} ile ${q.title} kesişim noktası: ${made[0]}${more}.` : `${p.title} ile ${q.title} ${made.length} noktada kesişiyor: ${joinTr(made)}${more}.`);
      }
    }
    if (!found) {
      const message = misses.join(' ') || 'Kesişim noktası bulunamadı.';
      if (c.has(INTERSECTS_QUESTION) || c.hasVerb('question')) { scene.say(message); return; }
      fail(message);
    }
    misses.forEach(m => scene.say(m));
    if (staticNote === 'function') scene.say('Fonksiyonlu kesişim noktaları sayısal olarak bulundu ve sabittir; fonksiyon değişirse yeniden bulun.');
    else if (staticNote === 'axis') scene.say('Eksenler çizimde nesne olmadığı için bu noktalar sabittir; şekil değişirse yeniden bulun.');
    scene.setFocus(focus);
  },
};

// ---------------------------------------------------------------------------------------------- köşegenler

export const diagonals: CommandHandler = {
  id: 'constructions.diagonals',
  examples: [
    'karenin köşegenlerini çiz',
    'ABCD dörtgeninin köşegenlerini çiz',
    'köşegenlerin kesişim noktasını bul',
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN) || !c.has(/\bkosegen/)) return 0;
    // "karenin köşegenini ölç", "köşegeni kaç birim": uzunluk ölçümü (ölçme ailesi); kesişim ve çizim burada kalır.
    if (c.has(/\b(?:olc(?!ek|u)|hesapla|kac\b|kactir|nedir|ne kadar)/) && !c.has(/\bkesis|\bkesim|\bortak nokta|\bciz|\bolustur|\bekle/)) return 0;
    // "köşegeni 6 olan kare", "köşegenleri 6 ve 8 olan eşkenar dörtgen": ölçü verilen şekil oluşturma (çokgenler ailesi).
    if (c.has(/\bkosegen\w*\s+(?:uzunlu\w+\s+)?[=:]?\s*#\d+/) && !c.has(/\bkesis|\bkesim|\bortak nokta/)) return 0;
    return c.has(/\bkesis|\bkesim|\bortak nokta/) ? 74 : 68;
  },
  run(c, scene) {
    const refs = refsOf(c);
    const names = newPointNames(scene, refs);
    const polygon = polygonOf(c, scene, refs, { noun: 'dörtgen ya da çokgen', minSize: 4 });
    const ids = polygon.pointIds, n = ids.length;
    const wanted = refs.map(r => refPoints(scene, r)).filter((pts): pts is PointObject[] => !!pts && pts.length === 2);
    const segments = [];
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (wanted.length && !wanted.some(([a, b]) => [a.id, b.id].sort().join() === [ids[i], ids[j]].sort().join())) continue;
      segments.push(scene.addSegment(ids[i], ids[j]));
    }
    if (!segments.length) fail(`${joinTr(wanted.map(([a, b]) => a.label + b.label))} ${polygon.label} çokgeninin köşegeni değil.`);
    scene.say(`${polygon.label} köşegenleri: ${joinTr(segments.map(s => s.label))}.`);
    if (c.has(/\bkesis|\bkesim|\bortak nokta/)) {
      if (segments.length !== 2) fail('Köşegenlerin tek kesişim noktası yalnızca dörtgende bulunur.');
      const [first, second] = segments;
      const pts = currentIntersections(scene, first, second);
      if (!pts || !pts.length) fail('Köşegenler kesişmiyor.');
      const existing = scene.points().find(p => p.construction?.kind === 'intersection' && p.construction.objectIds.includes(first.id) && p.construction.objectIds.includes(second.id));
      const point = existing ?? scene.addPoint(pts[0], { label: freeName(scene, names[0]), color: COLORS.intersection, construction: { kind: 'intersection', objectIds: [first.id, second.id], index: 0 } });
      scene.say(`Köşegenlerin kesişim noktası ${named(point)}.`);
      scene.setFocus([point.id]);
    }
  },
};
