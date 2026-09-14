import type { PointObject } from '@/types/math';
import type { CommandHandler } from '../../types';
import type { Clause } from '../../text';
import { COLORS, type CommandScene, fail, trNum } from '../../scene';
import {
  type LineSpec, type Ref, isPointRef, joinTr, lineFromRef, named, newPointNames, pointFromRef, refPoints, refsOf, requestedName, requireKnownRefs,
} from './refs';
import {
  MEASURE_NOUN, MEETING, MEETING_AS_SOURCE, PLURAL_ALL, applyClauseColor, countBefore, focusedPoint, foreignVerb, meetingPoint, notationVertices, triangleOf,
  triangleWithSide, triangleWithVertex,
} from './common';
import { distanceToLine, ensureBisectorRay, ensureDirectionLine, ensureFoot, ensureMidpoint, ensurePerpBisector, footOutside, helperName } from './build';
import { functionLineSpec, namedFunctions } from './functions';

type LineRef = { ref: Ref; spec: LineSpec };

/** Cümledeki doğru adları (BC, [BC], d) ve tek nokta adları. */
function split(scene: CommandScene, refs: Ref[]) {
  const lines: LineRef[] = [];
  const points: Ref[] = [];
  // "B C doğrusuna": art arda iki tek nokta adı + doğru adı
  const merged = new Set<Ref>();
  for (let i = 0; i + 1 < refs.length; i++) {
    const [x, y] = [refs[i], refs[i + 1]];
    if (x.kind !== 'label' || y.kind !== 'label' || y.pos !== x.pos + 1 || x.noun || x.label!.suffix || !y.noun || !['line', 'segment', 'side', 'ray'].includes(y.noun)) continue;
    const a = scene.pointsFromLabel(x.label!.text), b = scene.pointsFromLabel(y.label!.text);
    if (a?.length === 1 && b?.length === 1 && a[0].id !== b[0].id) {
      lines.push({ ref: y, spec: { a: a[0], b: b[0], name: `${a[0].label}${b[0].label}` } });
      merged.add(x).add(y);
    }
  }
  for (const r of refs) {
    if (merged.has(r)) continue;
    if (isPointRef(scene, r)) { points.push(r); continue; }
    const spec = lineFromRef(scene, r);
    if (spec) lines.push({ ref: r, spec });
  }
  return { lines, points };
}

const preferRole = <T extends { role: Ref['role'] }>(items: T[], roles: Ref['role'][]) => {
  const preferred = items.filter(i => roles.includes(i.role));
  return preferred.length ? preferred : items;
};

function pickLine(c: Clause, scene: CommandScene, lines: LineRef[], example: string): LineSpec {
  if (lines.length) {
    const preferred = lines.filter(l => ['to', 'with'].includes(l.ref.role));
    const list = preferred.length ? preferred : lines;
    if (list.length > 1) fail(`Birden fazla doğru yazıldı (${joinTr(list.map(l => l.spec.name))}). Hangisine göre çizileceğini tek doğru olarak yazın (ör. “${example}”).`);
    return list[0].spec;
  }
  const candidates = scene.ofType('line', 'segment', 'ray');
  if (!candidates.length) fail(`Hangi doğruya göre çizileceğini yazın (ör. “${example}”).`);
  const object = scene.target(c, { types: ['line', 'segment', 'ray'], noun: 'doğru', labels: [] });
  const [a, b] = scene.lineOf(object)!;
  return { a, b, object, name: object.type === 'segment' ? `${a.label}${b.label}` : object.label };
}

// ---------------------------------------------------------------------------------------------- paralel / dik doğru

const PARALLEL = /\bparalel(?:i|ini|ine|lik|ligi)?\b(?!\s*kenar)/;
// "dik (bir) açı", "dik açılı üçgen" gibi ifadeler dik doğru değil, açı/şekil oluşturmadır.
const PERPENDICULAR = /\bdik\b(?!\s+(?:bir\s+)?(?:ucgen|acili|aci\b|acisi|acida|kenar|koordinat|yamuk|prizma|dortgen|indir|in\b|cek|ayag|izdusum|dogru parca))|\bdikme dogru/;
const FOOT_WORDS = /\bindir|\bdikme(?!\s+dogru)|\byukseklig|\byukseklik|\bizdusum|\bayag|\borta dikme|\bdik dogru parca/;
/** "iki paralel doğru", "birbirine dik iki doğru": adsız yeni doğru çifti. */
const FREE_PAIR = /\bbirbirine (?:paralel|dik)\b|#\d+ (?:tane )?(?:paralel|dik) dogru|\b(?:paralel|dik) #\d+ dogru/;

export const directionLine: CommandHandler = {
  id: 'constructions.directionLine',
  examples: [
    "A'dan BC'ye dik doğru çiz",
    'd doğrusuna A noktasından paralel çiz',
    "AB'ye C'den geçen paralel doğru çiz",
    'A noktasından geçen ve BC doğrusuna paralel doğru çiz',
    'AB doğrusuna B noktasında dik doğru çiz',
    "(1; 2) noktasından AB'ye paralel doğru çiz",
    'C noktasından [AB] doğru parçasına dik doğru çizer misin',
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN) || c.has(/eksen/)) return 0;
    // "paralel doğru ile AB'nin kesişimi": kesişim işi
    if (c.has(MEETING) && !c.has(MEETING_AS_SOURCE)) return 0;
    const parallel = c.has(PARALLEL);
    const perpendicular = c.has(PERPENDICULAR) && !c.has(FOOT_WORDS);
    if (!parallel && !perpendicular) return 0;
    return c.labels.length || c.coords.length ? 70 : 66;
  },
  run(c, scene) {
    const mode = c.has(PARALLEL) ? 'parallel' : 'perpendicular';
    const word = mode === 'parallel' ? 'paralel' : 'dik';
    // "f'nin grafiğine" gibi fonksiyon adları nokta/doğru adı değildir.
    const functionLabels = namedFunctions(c, scene).labelIndexes;
    const refs = refsOf(c).filter(r => !(r.kind === 'label' && functionLabels.has(r.index)));
    if (!refs.length && c.has(FREE_PAIR)) return freePair(c, scene, mode);
    requireKnownRefs(scene, refs);
    const { lines, points } = split(scene, refs);
    const example = `C noktasından AB'ye ${word} doğru çiz`;
    // Dayanak doğrusal bir fonksiyon ya da yazılmış denklem olabilir: "A noktasından y = 2x + 1 doğrusuna dik çiz"
    const functionLine = lines.length ? null : functionLineSpec(c, scene);
    const line: LineSpec = functionLine ?? pickLine(c, scene, lines, example);
    let throughRefs = points.filter(r => ['from', 'at'].includes(r.role) || r.through);
    if (!throughRefs.length) throughRefs = points;
    const throughPoints: PointObject[] = throughRefs.map(r => pointFromRef(scene, r).point);
    if (!throughPoints.length) {
      // "D'den BC'ye paralel ve AB'ye dik doğrular çiz": önceki cümlenin doğrusunun geçtiği nokta
      const focused = meetingPoint(c, scene) ?? focusedPoint(scene) ?? focusedDirectionSource(scene);
      if (!focused) fail(`${word === 'dik' ? 'Dik' : 'Paralel'} doğrunun hangi noktadan geçeceğini yazın (ör. “C noktasından ${line.name} doğrusuna ${word} doğru çiz”).`);
      throughPoints.push(focused);
    }
    const made: string[] = [];
    for (const p of throughPoints) {
      if (mode === 'parallel' && distanceToLine(p, line.a, line.b) < 1e-9) {
        fail(`${p.label} noktası zaten ${line.name} doğrusu üzerinde; ona paralel çizilen doğru ${line.name} doğrusunun kendisi olur. Doğrunun dışındaki bir nokta yazın.`);
      }
      const result = ensureDirectionLine(scene, p.id, [line.a.id, line.b.id], mode, line.name);
      made.push(result.object.id);
      scene.say(result.created
        ? `${p.label} noktasından geçen ve ${line.name} doğrusuna ${word} doğru çizildi (${result.object.label}).`
        : `${p.label} noktasından ${line.name} doğrusuna ${word} doğru zaten var (${result.object.label}).`);
    }
    if (functionLine?.note) scene.say(functionLine.note.trim());
    applyClauseColor(c, scene);
    scene.setFocus(made);
  },
};

/** Odaktaki tek paralel/dik doğrunun (ya da orta dikmenin) geçtiği nokta. */
function focusedDirectionSource(scene: CommandScene): PointObject | undefined {
  const sources = [...new Set(scene.focus.flatMap(id => {
    const o = scene.get(id);
    if (o?.type !== 'line') return [];
    const helper = scene.get(o.point2Id);
    return helper?.type === 'point' && helper.construction?.kind === 'direction' ? [helper.construction.throughId] : [];
  }))];
  return sources.length === 1 && scene.get(sources[0])?.type === 'point' ? scene.point(sources[0]) : undefined;
}

/** Boş yerde yeni bir doğru ve ona paralel/dik, canlı ikinci doğru. */
function freePair(c: Clause, scene: CommandScene, mode: 'parallel' | 'perpendicular') {
  const count = c.match(/#(\d+) (?:tane )?(?:paralel|dik) dogru|\b(?:paralel|dik) #(\d+) dogru/);
  const n = count ? c.num(`#${count[1] ?? count[2]}`) : 2;
  if (n !== 2) fail('Şimdilik birbirine paralel ya da dik iki doğru çizebilirim (ör. “iki paralel doğru çiz”).');
  const center = scene.placeShape(8, 6);
  const [n1, n2, n3] = scene.nextPointLabels(3);
  const p1 = scene.addPoint({ x: center.x - 3, y: center.y - 1 }, { label: n1 });
  const p2 = scene.addPoint({ x: center.x + 3, y: center.y + 1 }, { label: n2 });
  const base = scene.addLine(p1.id, p2.id);
  const p3 = scene.addPoint(mode === 'parallel' ? { x: center.x - 2, y: center.y + 2 } : { x: center.x - 1, y: center.y + 3 }, { label: n3 });
  const made = ensureDirectionLine(scene, p3.id, [p1.id, p2.id], mode, `${n1}${n2}`);
  const word = mode === 'parallel' ? 'paralel' : 'dik';
  scene.say(`${base.label} ve ${p3.label} noktasından geçen, ona ${word} doğru çizildi (${made.object.label}). ${n1}, ${n2} ya da ${n3} noktasını sürükleseniz de doğrular ${word} kalır.`);
  applyClauseColor(c, scene);
  scene.setFocus([base.id, made.object.id]);
}

// ---------------------------------------------------------------------------------------------- dikme / yükseklik / izdüşüm

const ALTITUDE = /\byukseklig|\byukseklik/;
const FOOT = /\bdik(?:me(?:yi|si|sini|ler|leri|lerini)?)?\s+(?:indir|cek|in\b)|\bdikme(?:si|sini|sinin|yi|nin|ye|den|ler|leri|lerini)?\b(?!\s+dogru)|\bizdusum|\bdik ayag|\bdik dogru parca/;
const ALTITUDE_NOUN = 'yukseklik|yukseklig|dikme';

export const altitude: CommandHandler = {
  id: 'constructions.altitude',
  examples: [
    'C noktasından dik indir',
    "B'den AC'ye dikme indir",
    'C köşesinden yükseklik çiz',
    'üçgenin tüm yüksekliklerini çiz',
    'BC kenarına ait yüksekliği çiz',
    "A noktasının BC doğrusu üzerindeki izdüşümünü bul",
    "B'den tabana yükseklik çek",
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN) || c.has(/\borta dikme/)) return 0;
    const alt = c.has(ALTITUDE), foot = c.has(FOOT);
    if (!alt && !foot) return 0;
    // "kenarortay ile dikmenin kesişimi": kesişim işi
    if (c.has(MEETING) && !c.has(MEETING_AS_SOURCE)) return 0;
    // "tabanı 6 yüksekliği 4 olan üçgen" ölçüdür; "üç yüksekliğini çiz" ise adettir.
    const countOnly = c.numbers.length === 1 && countBefore(c, ALTITUDE_NOUN) !== undefined;
    if (alt && ((c.numbers.length && !countOnly) || c.has(/\bkesis|\bkesim|\bortak nokta/))) return 0;
    return 72;
  },
  run(c, scene) {
    // "ayağına H de", "ayağı H olsun": ayağın adı nokta aranmaz.
    const footName = requestedName(c);
    const refs = refsOf(c).filter(r => !footName || r.label !== footName);
    requireKnownRefs(scene, refs);
    const { lines, points } = split(scene, refs);
    const projection = c.has(/\bizdusum|\bayag/) && !c.has(/\bdikme|\bindir|\byukseklik|\byukseklig/);
    const isAltitude = c.has(ALTITUDE);
    const plural = c.has(/yukseklikler|dikmeler/) || c.has(PLURAL_ALL) || countBefore(c, ALTITUDE_NOUN) !== undefined;
    const names = footName ? [footName.text] : newPointNames(scene, refs);
    const example = 'C noktasından AB doğrusuna dik indir';
    const jobs: { p: PointObject; line: [PointObject, PointObject]; lineName: string }[] = [];

    const sourceRefs = preferRole(points, ['from', 'at', 'of', 'obj']);
    // "kesişim noktasından AB'ye dikme indir"
    const meeting = sourceRefs.length ? undefined : meetingPoint(c, scene);
    const lineRef = lines.length ? pickLine(c, scene, lines, example) : undefined;
    if (lineRef && (sourceRefs.length || meeting)) {
      for (const r of sourceRefs) jobs.push({ p: pointFromRef(scene, r).point, line: [lineRef.a, lineRef.b], lineName: lineRef.name });
      if (meeting) jobs.push({ p: meeting, line: [lineRef.a, lineRef.b], lineName: lineRef.name });
    } else if (sourceRefs.length) {
      for (const r of sourceRefs) {
        const p = pointFromRef(scene, r).point;
        const tri = triangleWithVertex(c, scene, refs, p, example);
        const others = tri.ids.filter(id => id !== p.id).map(id => scene.point(id)) as [PointObject, PointObject];
        jobs.push({ p, line: others, lineName: `${others[0].label}${others[1].label}` });
      }
    } else if (lineRef) {
      const tri = triangleWithSide(scene, lineRef.a, lineRef.b, `C noktasından ${lineRef.name} doğrusuna dik indir`);
      const p = scene.point(tri.ids.find(id => id !== lineRef.a.id && id !== lineRef.b.id)!);
      jobs.push({ p, line: [lineRef.a, lineRef.b], lineName: lineRef.name });
    } else {
      const focused = focusedPoint(scene);
      const noted = notationVertices(c, scene, 'hH');
      if (noted.length) {
        for (const p of noted) {
          const tri = triangleWithVertex(c, scene, refs, p, example);
          const others = tri.ids.filter(id => id !== p.id).map(id => scene.point(id)) as [PointObject, PointObject];
          jobs.push({ p, line: others, lineName: `${others[0].label}${others[1].label}` });
        }
      } else if (focused && !plural) {
        const tri = triangleWithVertex(c, scene, refs, focused, example);
        const others = tri.ids.filter(id => id !== focused.id).map(id => scene.point(id)) as [PointObject, PointObject];
        jobs.push({ p: focused, line: others, lineName: `${others[0].label}${others[1].label}` });
      } else if (plural) {
        const tri = triangleOf(c, scene, refs, { required: true });
        const [A, B, C] = tri!.ids.map(id => scene.point(id));
        jobs.push({ p: A, line: [B, C], lineName: `${B.label}${C.label}` }, { p: B, line: [C, A], lineName: `${C.label}${A.label}` }, { p: C, line: [A, B], lineName: `${A.label}${B.label}` });
      } else {
        fail(isAltitude
          ? 'Yüksekliğin hangi köşeden çizileceğini yazın (ör. “C köşesinden yükseklik çiz” ya da “üçgenin tüm yüksekliklerini çiz”).'
          : `Dikmenin hangi noktadan indirileceğini yazın (ör. “${example}”).`);
      }
    }

    const focus: string[] = [];
    jobs.forEach((job, i) => {
      const { p, line, lineName } = job;
      if (line.some(q => q.id === p.id) || distanceToLine(p, line[0], line[1]) < 1e-9) {
        fail(`${p.label} noktası zaten ${lineName} doğrusu üzerinde; dikme uzunluğu sıfır olur.`);
      }
      const lineIds: [string, string] = [line[0].id, line[1].id];
      const foot = ensureFoot(scene, p.id, lineIds, { name: names[i] });
      const outside = footOutside(scene, foot.object, lineIds) ? ` Ayak, [${lineName}] kenarının uzantısında.` : '';
      if (projection) {
        focus.push(foot.object.id);
        scene.say(`${p.label} noktasının ${lineName} doğrusu üzerindeki dik izdüşümü ${named(foot.object)}${foot.created ? ' oluşturuldu' : ' (zaten vardı)'}.`);
        return;
      }
      const segment = scene.addSegment(p.id, foot.object.id, { color: COLORS.construction });
      focus.push(segment.id);
      const length = trNum(Math.hypot(p.x - foot.object.x, p.y - foot.object.y));
      scene.say(isAltitude
        ? `${p.label} köşesinden ${lineName} kenarına yükseklik çizildi: ayak ${named(foot.object)}, |${p.label}${foot.object.label}| = ${length} br.${outside}`
        : `${p.label} noktasından ${lineName} doğrusuna dikme indirildi: ayak ${named(foot.object)}, |${p.label}${foot.object.label}| = ${length} br.${outside}`);
    });
    applyClauseColor(c, scene);
    scene.setFocus(focus);
  },
};

// ---------------------------------------------------------------------------------------------- orta dikme

export const perpBisector: CommandHandler = {
  id: 'constructions.perpBisector',
  examples: [
    "AB'nin orta dikmesini çiz",
    '[AB] doğru parçasının orta dikmesi',
    'A ile B noktalarının orta dikmesini çiz',
    'üçgenin kenar orta dikmelerini çiz',
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN) || !c.has(/\borta ?dikme/)) return 0;
    if (c.has(/\bkesis|\bkesim|\bortak nokta/)) return 0;
    return 73;
  },
  run(c, scene) {
    const refs = refsOf(c);
    const { lines, points } = split(scene, refs);
    const pairs: [PointObject, PointObject][] = [];
    const polygonWanted = c.has(/\borta ?dikmeler|\bkenar(?:lar|ler)?\w* orta|\bucgen|\bkare|\bcokgen|\bdortgen/) || c.has(PLURAL_ALL);
    if (lines.length && !(polygonWanted && refs.some(r => (refPoints(scene, r)?.length ?? 0) >= 3))) {
      for (const l of lines) pairs.push([l.spec.a, l.spec.b]);
    } else if (points.length === 2 && !polygonWanted) {
      pairs.push([pointFromRef(scene, points[0]).point, pointFromRef(scene, points[1]).point]);
    } else if (polygonWanted) {
      const polygonRef = refs.find(r => r.label && scene.resolveLabel(r.label, ['polygon']).length);
      const polygon = polygonRef
        ? scene.resolveLabel(polygonRef.label!, ['polygon'])[0]
        : scene.target(c, { types: ['polygon'], noun: 'çokgen', labels: [] });
      if (polygon.type !== 'polygon') fail('Orta dikmeleri çizilecek çokgeni yazın.');
      const pts = polygon.pointIds.map(id => scene.point(id));
      pts.forEach((p, i) => pairs.push([p, pts[(i + 1) % pts.length]]));
    } else {
      const segments = scene.ofType('segment');
      if (!segments.length) fail("Hangi doğru parçasının orta dikmesini istediğinizi yazın (ör. “AB'nin orta dikmesini çiz”).");
      const segment = scene.target(c, { types: ['segment'], noun: 'doğru parçası', labels: [] });
      const [a, b] = scene.lineOf(segment)!;
      pairs.push([a, b]);
    }
    const focus: string[] = [];
    for (const [a, b] of pairs) {
      const made = ensurePerpBisector(scene, a.id, b.id);
      focus.push(made.object.id);
      scene.say(made.created
        ? `[${a.label}${b.label}] orta dikmesi çizildi (orta nokta ${named(made.mid)}).`
        : `[${a.label}${b.label}] orta dikmesi zaten var.`);
    }
    applyClauseColor(c, scene);
    scene.setFocus(focus);
  },
};

// ---------------------------------------------------------------------------------------------- açıortay

/** "açıortay", konuşmada ayrık yazılan "açı ortay". */
const BISECTOR = /\baci ?ortay/;
/** "ABC açısını ikiye / iki eşit parçaya bölen ışın" */
const HALVE_ANGLE = /\baci(?:yi|sini|larini)? (?:ikiye|yariya|#\d+ esit parca\w*) (?:bol|ayir)/;

export const angleBisector: CommandHandler = {
  id: 'constructions.angleBisector',
  examples: [
    'ABC açısının açıortayını çiz',
    'B köşesinin açıortayını çiz',
    'üçgenin açıortaylarını çiz',
    'ABC üçgeninin B köşesindeki açıortayı',
    "A'dan açıortay çiz",
    'ABC açısının dış açıortayını çiz',
    'ABC açısını ikiye bölen ışını çiz',
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN) || !(c.has(BISECTOR) || c.has(HALVE_ANGLE))) return 0;
    if (c.has(/\bkesis|\bkesim|\bortak nokta/)) return 0;
    return 72;
  },
  run(c, scene) {
    const refs = refsOf(c);
    const exterior = c.has(/\bdis aci ?ortay/);
    const plural = c.has(/\baci ?ortaylar/) || c.has(PLURAL_ALL) || countBefore(c, 'aci ?ortay') !== undefined;
    const triples: [string, string, string][] = [];
    const pushVertex = (polygonIds: string[], vertexId: string) => {
      const i = polygonIds.indexOf(vertexId), n = polygonIds.length;
      triples.push([polygonIds[(i - 1 + n) % n], vertexId, polygonIds[(i + 1) % n]]);
    };
    // "B açısının açıortayı": tek harfli açı adı köşe demektir.
    const pointRefs = refs.filter(r => r.kind === 'label' && (isPointRef(scene, r) || (r.noun === 'angle' && refPoints(scene, r)?.length === 1)));
    const tripleRefs = refs.filter(r => r.label && (refPoints(scene, r)?.length ?? 0) === 3);
    const angleRefs = refs.filter(r => r.label && scene.resolveLabel(r.label, ['angle']).some(a => a.label.replace('∠', '').toLocaleLowerCase('tr') === r.label!.text.replace('∠', '').toLocaleLowerCase('tr')));

    for (const r of angleRefs) {
      const angle = scene.resolveLabel(r.label!, ['angle'])[0];
      if (angle.type === 'angle') triples.push([angle.point1Id, angle.vertexPointId, angle.point3Id]);
    }
    if (!triples.length && tripleRefs.length) {
      for (const r of tripleRefs) {
        const pts = refPoints(scene, r)!;
        const polygon = scene.resolveLabel(r.label!, ['polygon'])[0];
        const asPolygon = polygon?.type === 'polygon' && (r.noun === 'triangle' || r.noun === 'polygon' || (plural && r.noun !== 'angle') || (pointRefs.length > 0 && r.noun !== 'angle'));
        if (asPolygon && polygon.type === 'polygon') {
          const vertices = pointRefs.map(p => refPoints(scene, p)![0]).filter(p => polygon.pointIds.includes(p.id));
          if (vertices.length) vertices.forEach(v => pushVertex(polygon.pointIds, v.id));
          else polygon.pointIds.forEach(id => pushVertex(polygon.pointIds, id));
        } else {
          triples.push([pts[0].id, pts[1].id, pts[2].id]);
        }
      }
    }
    const noted = triples.length || pointRefs.length ? [] : notationVertices(c, scene, 'n');
    if (!triples.length && (pointRefs.length || noted.length)) {
      for (const v of [...pointRefs.map(r => refPoints(scene, r)![0]), ...noted]) {
        const polygons = scene.ofType('polygon').filter(p => p.pointIds.includes(v.id));
        const focused = polygons.filter(p => scene.focus.includes(p.id) || scene.selection.includes(p.id));
        const angles = scene.ofType('angle').filter(a => a.vertexPointId === v.id);
        if (polygons.length === 1 || focused.length === 1) pushVertex((focused.length === 1 ? focused[0] : polygons[0]).pointIds, v.id);
        else if (!polygons.length && angles.length === 1) triples.push([angles[0].point1Id, v.id, angles[0].point3Id]);
        else if (polygons.length > 1) fail(`${v.label} birden fazla çokgenin köşesi (${joinTr(polygons.map(p => p.label))}). Açıyı üç harfle yazın (ör. “${scene.point(polygons[0].pointIds[(polygons[0].pointIds.indexOf(v.id) + polygons[0].pointIds.length - 1) % polygons[0].pointIds.length]).label}${v.label}${scene.point(polygons[0].pointIds[(polygons[0].pointIds.indexOf(v.id) + 1) % polygons[0].pointIds.length]).label} açısının açıortayını çiz”).`);
        else fail(`${v.label} köşesinin hangi açısı olduğu belli değil. Açıyı üç harfle yazın (ör. “A${v.label}C açısının açıortayını çiz”).`);
      }
    }
    if (!triples.length) {
      if (plural) {
        const polygon = scene.target(c, { types: ['polygon'], noun: 'çokgen', labels: [] });
        if (polygon.type === 'polygon') polygon.pointIds.forEach(id => pushVertex(polygon.pointIds, id));
      } else {
        const angles = scene.ofType('angle');
        if (!angles.length) fail('Hangi açının açıortayını istediğinizi yazın (ör. “ABC açısının açıortayını çiz” ya da “B köşesinin açıortayını çiz”).');
        const angle = scene.target(c, { types: ['angle'], noun: 'açı', labels: [] });
        if (angle.type === 'angle') triples.push([angle.point1Id, angle.vertexPointId, angle.point3Id]);
      }
    }

    const focus: string[] = [];
    for (const [p1, v, p3] of triples) {
      const [A, V, C] = [p1, v, p3].map(id => scene.point(id));
      const name = `${A.label}${V.label}${C.label}`;
      if (exterior) {
        const helpers = scene.points().filter(p => p.construction?.kind === 'bisector' && p.construction.pointIds.join() === [p1, v, p3].join());
        const helper = helpers[0] ?? scene.addPoint(V, { label: helperName(scene, V.label), color: COLORS.bisector, visible: false, showLabel: false, construction: { kind: 'bisector', pointIds: [p1, v, p3] } });
        const made = ensureDirectionLine(scene, v, [v, helper.id], 'perpendicular', name, { color: COLORS.bisector, label: `${name} Dış Açıortayı` });
        focus.push(made.object.id);
        scene.say(made.created ? `∠${name} dış açıortayı çizildi (${V.label} köşesinden geçen doğru).` : `∠${name} dış açıortayı zaten var.`);
      } else {
        const made = ensureBisectorRay(scene, p1, v, p3);
        focus.push(made.object.id);
        scene.say(made.created ? `∠${name} açıortayı çizildi (${V.label} köşesinden çıkan ışın).` : `∠${name} açıortayı zaten var.`);
      }
    }
    applyClauseColor(c, scene);
    scene.setFocus(focus);
  },
};

// ---------------------------------------------------------------------------------------------- kenarortay

export const median: CommandHandler = {
  id: 'constructions.median',
  examples: [
    "A'dan kenarortay çiz",
    'üçgenin kenarortaylarını çiz',
    'BC kenarına ait kenarortayı çiz',
    'ABC üçgeninde B köşesinden kenarortay çiz',
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN) || !c.has(/\bkenar ?ortay/)) return 0;
    if (c.has(/\bkesis|\bkesim|\bortak nokta/)) return 0;
    return 72;
  },
  run(c, scene) {
    const refs = refsOf(c);
    const { lines, points } = split(scene, refs);
    const plural = c.has(/kenar ?ortaylar/) || c.has(PLURAL_ALL) || countBefore(c, 'kenar ?ortay') !== undefined;
    const example = "A köşesinden kenarortay çiz";
    const jobs: { vertex: PointObject; side: [PointObject, PointObject] }[] = [];
    const vertexJob = (vertex: PointObject) => {
      const tri = triangleWithVertex(c, scene, refs, vertex, example);
      const side = tri.ids.filter(id => id !== vertex.id).map(id => scene.point(id)) as [PointObject, PointObject];
      jobs.push({ vertex, side });
    };
    if (points.length) points.forEach(r => vertexJob(pointFromRef(scene, r).point));
    else if (lines.length) {
      for (const l of lines) {
        const tri = triangleWithSide(scene, l.spec.a, l.spec.b, example);
        jobs.push({ vertex: scene.point(tri.ids.find(id => id !== l.spec.a.id && id !== l.spec.b.id)!), side: [l.spec.a, l.spec.b] });
      }
    } else {
      const focused = focusedPoint(scene);
      const noted = notationVertices(c, scene, 'Vvm');
      if (noted.length) noted.forEach(vertexJob);
      else if (focused && !plural) vertexJob(focused);
      else if (plural) {
        const tri = triangleOf(c, scene, refs, { required: true })!;
        const [A, B, C] = tri.ids.map(id => scene.point(id));
        jobs.push({ vertex: A, side: [B, C] }, { vertex: B, side: [C, A] }, { vertex: C, side: [A, B] });
      } else fail('Kenarortayın hangi köşeden çizileceğini yazın (ör. “A köşesinden kenarortay çiz” ya da “üçgenin kenarortaylarını çiz”).');
    }
    const focus: string[] = [];
    for (const { vertex, side } of jobs) {
      const mid = ensureMidpoint(scene, side[0].id, side[1].id);
      const segment = scene.addSegment(vertex.id, mid.object.id, { color: COLORS.construction });
      focus.push(segment.id);
      scene.say(`${vertex.label} köşesinden kenarortay çizildi: [${vertex.label}${mid.object.label}] (${mid.object.label}, [${side[0].label}${side[1].label}] kenarının orta noktası).`);
    }
    applyClauseColor(c, scene);
    scene.setFocus(focus);
  },
};

