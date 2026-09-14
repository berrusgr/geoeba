import type { FunctionObject, MathObject, ObjectType, Point2D, PointObject } from '@/types/math';
import type { CommandHandler } from '../types';
import { shiftFunction } from './edit/geometry';
import { COLORS, type CommandScene, colorIn, fail, tidy, trNum } from '../scene';
import { type LabelRef, labelKey } from '../text';
import {
  type Anchor, Ctx, type Equation, type PointMap, ORIGIN, anchorFromLabel, createImages, defaultAnchor, describe, describeAll, dilateMap, dist,
  ensureLabeledPoint, equationText, findCenter, findTargets, fmt, imageNames, isEditSentence, nameImage, prepare, primeNote, reflectAxisMap, reflectLineMap,
  reflectPointMap, reuseNote, rotateMap, sentence, soft, takeImageName, transformInPlace, translateMap,
} from './transforms/core';

export const family = { id: 'transforms', title: 'Dönüşümler' };

/**
 * Canlı görüntüleri oluşturur, istenen adı verir ("… yansıtarak DEF üçgenini oluştur"), odaklar ve iletileri yazar:
 * ana cümle, yeniden kullanım notu ve fazladan üs konduysa nedeni.
 */
function emitImages(ctx: Ctx, targets: MathObject[], map: PointMap, imageName: string | undefined, message: (images: MathObject[]) => string) {
  const { scene } = ctx;
  const result = createImages(scene, targets, map, colorIn(ctx.c) ?? COLORS.image);
  nameImage(ctx, result, imageName);
  scene.setFocus(result.images.map(i => i.id));
  scene.say(message(result.images));
  scene.say(reuseNote(result));
  scene.say(primeNote(scene, result));
}

/** Görüntü yerine asıl şeklin değişmesi istendi mi? */
const IN_PLACE = /\b(?:yerinde|kendisini|kendini|kendilerini|asil\s+sekl[a-z]*|orijinal(?:i|ini|in)?\b|ozgun\s+sekl[a-z]*|kopya\s*(?:olusturmadan|olmadan|yapmadan|cikarmadan)|kopyalamadan|kopyasiz|goruntu\s+olusturmadan)/;

function finishNotes(ctx: Ctx) {
  for (const note of ctx.notes) ctx.scene.say(note);
}

/** Yerinde dönüşüm iletisi: noktalar için yeni konum da yazılır. */
function sayInPlace(scene: CommandScene, targets: MathObject[], before: string, how: string) {
  const after = targets.map(t => scene.must(t.id));
  const points = after.filter(t => t.type === 'point');
  scene.say(`${sentence(before, how)}${points.length ? `; yeni konum: ${imageNames(points)}` : ''}.`);
  scene.setFocus(after.map(t => t.id));
}

// ===========================================================================
// Yansıma
// ===========================================================================

interface Mirror { map: PointMap; phrase: string; exclude: string[] }

const dative = (phrase: string) => phrase === 'orijin' ? 'orijine' : /noktası$/.test(phrase) ? phrase.replace(/noktası$/, 'noktasına') : `${phrase} noktasına`;

function axisMirror(scene: CommandScene, axis: 'x' | 'y' | 'y=x' | 'y=-x'): Mirror {
  const phrase = { x: 'x eksenine', y: 'y eksenine', 'y=x': 'y = x doğrusuna', 'y=-x': 'y = -x doğrusuna' }[axis];
  return { map: reflectAxisMap(scene, axis), phrase, exclude: [] };
}
function pointMirror(scene: CommandScene, anchor: Anchor): Mirror {
  return { map: reflectPointMap(scene, anchor), phrase: dative(anchor.phrase), exclude: anchor.id ? [anchor.id] : [] };
}
function lineMirror(scene: CommandScene, line: { a: PointObject; b: PointObject; obj?: MathObject }, phrase?: string): Mirror {
  const named = line.obj && /^[\p{L}](?:_?\d+)?'*$/u.test(line.obj.label);
  return {
    map: reflectLineMap(scene, line.a.id, line.b.id),
    phrase: phrase ?? (named ? `${line.obj!.label} doğrusuna` : `${line.a.label}${line.b.label} doğrusuna`),
    exclude: [line.a.id, line.b.id, ...(line.obj ? [line.obj.id] : [])],
  };
}

function lineFromLabel(ctx: Ctx, ref: LabelRef, noun?: string): { a: PointObject; b: PointObject; obj?: MathObject } {
  const { scene } = ctx;
  const types: ObjectType[] = noun && /^isin/.test(noun) ? ['ray'] : noun && /^(?:dogru\s+parca|parca)/.test(noun) ? ['segment'] : ['line', 'segment', 'ray'];
  const pts = scene.pointsFromLabel(ref.text);
  const objs = scene.resolveLabel(ref, types);
  if (objs.length) {
    const pairs = objs.map(o => scene.lineOf(o)!);
    if (new Set(pairs.map(p => p.map(q => q.id).sort().join())).size > 1) {
      fail(`${ref.text} adıyla birden fazla doğru eşleşti (${objs.map(o => o.label).join(', ')}). Hangisine göre yansıtılacağını adıyla yazın.`);
    }
    return { a: pairs[0][0], b: pairs[0][1], obj: objs[0] };
  }
  if (pts && pts.length === 2 && pts[0].id !== pts[1].id) return { a: pts[0], b: pts[1] };
  fail(`${ref.text} doğrusu bulunamadı. Ekseni iki nokta ya da doğru adıyla yazın (ör. “AB doğrusuna göre”).`);
}

function equationMirror(ctx: Ctx, eq: Equation): Mirror {
  const { scene } = ctx;
  if (eq.kind === 'slope' && tidy(eq.n) === 0 && tidy(eq.m) === 1) return axisMirror(scene, 'y=x');
  if (eq.kind === 'slope' && tidy(eq.n) === 0 && tidy(eq.m) === -1) return axisMirror(scene, 'y=-x');
  if (eq.kind === 'slope' && tidy(eq.n) === 0 && tidy(eq.m) === 0) return axisMirror(scene, 'x');
  if (eq.kind === 'vertical' && tidy(eq.x) === 0) return axisMirror(scene, 'y');
  const text = equationText(eq);
  const on = (p: Point2D) => eq.kind === 'vertical' ? Math.abs(p.x - eq.x) < 1e-9 : Math.abs(p.y - (eq.m * p.x + eq.n)) < 1e-9;
  for (const o of scene.ofType('line', 'segment', 'ray')) {
    const pair = scene.lineOf(o)!;
    if (dist(pair[0], pair[1]) > 1e-9 && on(pair[0]) && on(pair[1])) return lineMirror(scene, { a: pair[0], b: pair[1], obj: o }, `${text} doğrusuna`);
  }
  // Eksen doğrusu yok: iki gizli yardımcı noktayla çizilir (harf sırasını kullanmayan adlarla).
  const helperLabel = () => { let k = 1; while (scene.points().some(p => labelKey(p.label) === labelKey(`Ek${k}`))) k++; return `Ek${k}`; };
  const [p1, p2] = eq.kind === 'vertical' ? [{ x: eq.x, y: 0 }, { x: eq.x, y: 1 }] : [{ x: 0, y: eq.n }, { x: 1, y: eq.m + eq.n }];
  const a = scene.addPoint(p1, { label: helperLabel(), visible: false, showLabel: false, color: COLORS.line });
  const b = scene.addPoint(p2, { label: helperLabel(), visible: false, showLabel: false, color: COLORS.line });
  const line = scene.addLine(a.id, b.id, { label: `${text} Doğrusu` });
  ctx.notes.push(`Eksen olarak ${text} doğrusu çizildi.`);
  return lineMirror(scene, { a, b, obj: line }, `${text} doğrusuna`);
}

const AXIS_WORD = String.raw`\b(x|ox|apsis|yatay|y|oy|ordinat|dikey)\s+eksen[a-z]*`;
const BISECTOR = String.raw`\b(birinci|ilk|ikinci)\s+aciortay[a-z]*(?:\s+dogru[a-z]*)?`;
const EQUATION_REF = String.raw`qqdenklem(\d+)qq[a-z]*(?:\s+(?:dogru[a-z]*|eksen[a-z]*))?`;
const ORIGIN_REF = String.raw`(?:\b(?:orijin(?!al)|orjin|origin)[a-z]*|\bbaslangic\s+nokta[a-z]*|\bkoordinat\s+baslangic[a-z]*)(?:\s+nokta[a-z]*)?`;
const MIRROR_REF = String.raw`(?:\$(\d+)\s*@(\d+)|\$(\d+)([a-z]*)|@(\d+))(?:\s+(?:nin|nun|in|un|e|a|ye|ya|ne|na))?(?:\s+(dogru\s+parca[a-z]*|dogru[a-z]*|kenar[a-z]*|isin[a-z]*|parca[a-z]*|nokta[a-z]*|eksen[a-z]*|merkez[a-z]*|kose[a-z]*|cember[a-z]*|daire[a-z]*|elips[a-z]*|yay[a-z]*))?`;

function refMirror(ctx: Ctx, m: RegExpExecArray): Mirror {
  const { scene } = ctx;
  const noun = m[6];
  const isPointNoun = !!noun && /^(?:nokta|merkez|kose)/.test(noun);
  if (m[5] !== undefined) {
    if (noun && !isPointNoun) fail('Yansıma doğrusunu koordinatla değil, iki nokta ya da doğru adıyla yazın (ör. “AB doğrusuna göre”).');
    const at = ctx.coord(m[5]);
    return pointMirror(scene, { at, phrase: `${fmt(at)} noktası` });
  }
  if (m[1] !== undefined) {
    const p = ensureLabeledPoint(ctx, ctx.label(m[1]), ctx.coord(m[2]));
    return pointMirror(scene, { id: p.id, at: { x: p.x, y: p.y }, phrase: `${p.label} noktası` });
  }
  const ref = ctx.label(m[3]);
  if (noun && /^(?:cember|daire|elips|yay)/.test(noun)) fail('Yalnızca bir doğruya ya da noktaya göre yansıtılabilir. Örneğin: “AB doğrusuna göre” ya da “O noktasına göre”.');
  if (isPointNoun) return pointMirror(scene, anchorFromLabel(ctx, ref));
  if (noun) return lineMirror(scene, lineFromLabel(ctx, ref, noun));
  if (scene.resolveLabel(ref, ['line', 'segment', 'ray']).length) return lineMirror(scene, lineFromLabel(ctx, ref));
  const p = scene.findPoint(ref.text);
  if (p) return pointMirror(scene, { id: p.id, at: { x: p.x, y: p.y }, phrase: `${p.label} noktası` });
  const pts = scene.pointsFromLabel(ref.text);
  if (pts && pts.length === 2) return lineMirror(scene, lineFromLabel(ctx, ref));
  if (labelKey(ref.text) === 'o') return pointMirror(scene, anchorFromLabel(ctx, ref));
  if (scene.resolveLabel(ref, ['circle', 'ellipse', 'arc', 'sector', 'polygon']).length) {
    fail('Yalnızca bir doğruya ya da noktaya göre yansıtılabilir. Örneğin: “AB doğrusuna göre” ya da “O noktasına göre”.');
  }
  fail(`${ref.text} adlı doğru ya da nokta bulunamadı.`);
}

function findMirror(ctx: Ctx): Mirror {
  const { scene } = ctx;
  for (const withGore of [true, false]) {
    const G = withGore ? String.raw`\s+(?:gore|uzerinden|boyunca)` : '';
    let m = ctx.take(new RegExp(EQUATION_REF + G));
    if (m) return equationMirror(ctx, ctx.p.equations[Number(m[1])]);
    m = ctx.take(new RegExp(AXIS_WORD + G));
    if (m) return axisMirror(scene, /^(?:x|ox|apsis|yatay)$/.test(m[1]) ? 'x' : 'y');
    m = ctx.take(new RegExp(BISECTOR + G));
    if (m) return axisMirror(scene, m[1] === 'ikinci' ? 'y=-x' : 'y=x');
    m = ctx.take(new RegExp(ORIGIN_REF + G));
    if (m) return pointMirror(scene, ORIGIN);
    if (withGore) {
      m = ctx.take(new RegExp(MIRROR_REF + G));
      if (m) return refMirror(ctx, m);
    }
  }
  if (ctx.take(/\b(?:ona|buna|suna)\s+gore/)) {
    const pool = [...scene.focus, ...scene.selection].map(id => scene.get(id)).filter((o): o is MathObject => !!o);
    const line = pool.find(o => o.type === 'line' || o.type === 'segment' || o.type === 'ray');
    if (line) { const [a, b] = scene.lineOf(line)!; return lineMirror(scene, { a, b, obj: line }); }
    const p = pool.find((o): o is PointObject => o.type === 'point');
    if (p) return pointMirror(scene, { id: p.id, at: { x: p.x, y: p.y }, phrase: `${p.label} noktası` });
  }
  fail('Yansıma eksenini ya da merkezini yazın. Örneğin: “ABC\'yi x eksenine göre yansıt”, “AB doğrusuna göre yansıt” ya da “O noktasına göre simetriğini al”.');
}

const reflect: CommandHandler = {
  id: 'transforms.reflect',
  examples: [
    'ABC üçgenini x eksenine göre yansıt',
    'A noktasının y eksenine göre simetriğini al',
    "ABC'yi AB doğrusuna göre yansıt",
    "ABC'nin d doğrusuna göre simetriğini çiz",
    'ABC üçgenini y = x doğrusuna göre yansıt',
    "y = -x doğrusuna göre ABC'yi yansıt",
    "ABC'yi x = 3 doğrusuna göre yansıt",
    "ABC'nin O noktasına göre simetriğini çiz",
    "[AB]'yi orijine göre yansıt",
    "A'nın x eksenine göre simetriği nedir?",
    '(2, 3) noktasının orijine göre simetriğini bul',
    'seçili şekli y eksenine göre yansıt',
    'çemberi y eksenine göre yansıt',
    "ABC'yi yerinde x eksenine göre yansıt",
  ],
  match(clause, scene) {
    const p = prepare(clause, scene);
    const t = p.t;
    if (!/\b(?:yansit|aynala|simetri|yansima)/.test(t)) return 0;
    const strong = /\bgore\b|\byansit|\baynala/.test(t);
    if (/\b(?:donme|donel|eksen)\s+simetri|\bsimetrik\b|\bsimetri\s+eksen/.test(t) && !strong) return 0;
    if (isEditSentence(p, /\byansit|\baynala|\bciz|\bolustur/, !!colorIn(p.c))) return 0;
    if (/\b(?:alan|cevre|uzunlug|egim|yaricap|koordinat)/.test(t) && !strong) return 0;
    return strong ? 82 : 78;
  },
  run(clause, scene) {
    const ctx = new Ctx(prepare(clause, scene), scene);
    const mirror = findMirror(ctx);
    const inPlace = IN_PLACE.test(ctx.t);
    const imageName = inPlace ? undefined : takeImageName(ctx);
    const targets = findTargets(ctx, { exclude: mirror.exclude, action: 'yansıtılacak', example: '“ABC üçgenini x eksenine göre yansıt”' });
    if (inPlace) {
      const before = describeAll(targets);
      transformInPlace(scene, targets, mirror.map, 'yansıtılamaz');
      sayInPlace(scene, targets, before, `${mirror.phrase} göre yerinde yansıtıldı`);
    } else {
      emitImages(ctx, targets, mirror.map, imageName, images => {
        if (targets.length === 1 && targets[0].type === 'point') {
          const t = targets[0];
          return `${t.label}${fmt(t)} noktasının ${mirror.phrase} göre simetriği ${imageNames(images)}.`;
        }
        return `${sentence(describeAll(targets), `${mirror.phrase} göre yansıtıldı`)}: ${imageNames(images)}.`;
      });
    }
    finishNotes(ctx);
  },
};

// ===========================================================================
// Döndürme
// ===========================================================================

function findAngle(ctx: Ctx): { degrees: number; defaulted: boolean } {
  const neg = (s?: string) => (s ? -1 : 1);
  let deg: number | undefined;
  let m: RegExpExecArray | null;
  if ((m = ctx.take(/(eksi\s+)?#(\d+)(?!\d)(?:\s*(?:\/|\bbolu\b)\s*#(\d+)(?!\d))?\s*derece[a-z]*/))) deg = neg(m[1]) * ctx.num(m[2]) / (m[3] ? ctx.num(m[3]) : 1);
  else if ((m = ctx.take(/(eksi\s+)?(?:#(\d+)(?!\d)\s*)?(?:\bpi\b|π)(?:\s*(?:\/|\bbolu\b)\s*#(\d+)(?!\d))?(?:\s*radyan[a-z]*)?/))) deg = neg(m[1]) * (m[2] ? ctx.num(m[2]) : 1) * 180 / (m[3] ? ctx.num(m[3]) : 1);
  else if ((m = ctx.take(/(eksi\s+)?#(\d+)(?!\d)\s*radyan[a-z]*/))) deg = neg(m[1]) * ctx.num(m[2]) * 180 / Math.PI;
  else if ((m = ctx.take(/\bceyrek\s+tur[a-z]*/))) deg = 90;
  else if ((m = ctx.take(/(eksi\s+)?#(\d+)(?!\d)\s*tur[a-z]*/))) deg = neg(m[1]) * ctx.num(m[2]) * 360;
  else if ((m = ctx.take(/\b(?:tam|bir)\s+tur[a-z]*/))) deg = 360;
  else if ((m = ctx.take(/\bdik\s+aci\s+kadar/))) deg = 90;
  else {
    const bare = ctx.findAll(/(eksi\s+)?#(\d+)(?!\d)/);
    if (bare.length > 1) fail('Dönme açısını tek bir sayıyla yazın. Örneğin: “ABC\'yi A etrafında 90 derece döndür”.');
    if (bare.length === 1) { ctx.consume(bare[0]); deg = neg(bare[0][1]) * ctx.num(bare[0][2]); }
  }
  let sign = 0;
  if (ctx.take(/\bsaat(?:in)?\s+(?:yon[a-z]*\s+)?(?:ters|aksi|zit)[a-z]*(?:\s+yon[a-z]*)?|\bpozitif\s+yon[a-z]*|\bsola\b/)) sign = 1;
  else if (ctx.take(/\bsaat\s+yon[a-z]*(?:\s+dogru)?|\bnegatif\s+yon[a-z]*|\bsaga\b/)) sign = -1;
  const defaulted = deg === undefined;
  let degrees = deg ?? 90;
  if (sign) degrees = sign * Math.abs(degrees);
  degrees = soft(degrees);
  if (!Number.isFinite(degrees) || Math.abs(degrees) > 36000) fail('Dönme açısı geçerli bir sayı olmalı.');
  if (Math.abs(degrees) < 1e-9) fail('Dönme açısı 0’dan farklı olmalı.');
  return { degrees, defaulted };
}

const rotate: CommandHandler = {
  id: 'transforms.rotate',
  examples: [
    'ABC üçgenini A etrafında 90 derece döndür',
    "ABC'yi orijin etrafında 180° döndür",
    "[AB]'yi saat yönünde 45° döndür",
    "ABC'yi (2, 1) noktası etrafında 60 derece döndür",
    "ABC'yi B etrafında saat yönünün tersine çeyrek tur döndür",
    'A noktasını O merkezli 120 derece döndür',
    "ABCD'yi dönme merkezi C olmak üzere 45 derece döndür",
    'elipsi merkezi etrafında 30 derece döndür',
    'seçili şekli kendi merkezi etrafında yarım tur döndür',
    "ABC'yi yerinde 90 derece döndür",
  ],
  match(clause, scene) {
    const p = prepare(clause, scene);
    const t = p.t;
    if (!/\b(?:dondur|cevir|donme|donmus|donel)/.test(t)) return 0;
    // "45 derece döndürülmüş elips çiz": eğik elips oluşturma (çember ailesi), dönüşüm değil.
    if (/\b(?:dondurulmus|dondurulen|donmus)\s+(?:bir\s+)?elips/.test(t) && /\b(?:ciz|olustur|ekle)/.test(t)) return 0;
    const imperative = /\bdondur/;
    const hint = /derece|radyan|\btur[a-z]*\b|saat\s+yon|etraf|merkez|\bpi\b|π/;
    if (!imperative.test(t) && !hint.test(t)) return 0;
    if (/\b(?:gorunum|ekran|tuval|kamera|sayfa|kaydirici)/.test(t)) return 0;
    if (/simetri/.test(t) && !imperative.test(t)) return 0;
    if (isEditSentence(p, /\bdondur|\bcevir/, !!colorIn(p.c))) return 0;
    return 80;
  },
  run(clause, scene) {
    const ctx = new Ctx(prepare(clause, scene), scene);
    const center = findCenter(ctx);
    const angle = findAngle(ctx);
    if (ctx.find(/#\d+/)) fail('Dönme açısını tek bir sayıyla yazın. Örneğin: “ABC\'yi A etrafında 90 derece döndür”.');
    const inPlace = IN_PLACE.test(ctx.t);
    const imageName = inPlace ? undefined : takeImageName(ctx);
    const targets = findTargets(ctx, { exclude: center.anchor?.id ? [center.anchor.id] : [], action: 'döndürülecek', example: '“ABC üçgenini A etrafında 90 derece döndür”' });
    let anchor = center.anchor;
    if (!anchor) {
      const fallback = defaultAnchor(scene, targets);
      if (!fallback) fail('Bir noktayı döndürmek için dönme merkezini yazın. Örneğin: “A noktasını O etrafında 90 derece döndür”.');
      anchor = fallback;
      if (!center.own) ctx.notes.push('Dönme merkezi yazılmadığı için şeklin merkezi alındı.');
    }
    if (angle.defaulted) ctx.notes.push('Açı yazılmadığı için 90° kullanıldı.');
    const map = rotateMap(scene, anchor, angle.degrees);
    const how = `${anchor.phrase} etrafında ${angle.degrees > 0 ? 'saat yönünün tersine' : 'saat yönünde'} ${trNum(Math.abs(angle.degrees))}°`;
    if (inPlace) {
      const before = describeAll(targets);
      transformInPlace(scene, targets, map, 'döndürülemez');
      sayInPlace(scene, targets, before, `${how} yerinde döndürüldü`);
    } else {
      emitImages(ctx, targets, map, imageName, images => `${sentence(describeAll(targets), `${how} döndürüldü`)}: ${imageNames(images)}.`);
    }
    finishNotes(ctx);
  },
};

// ===========================================================================
// Öteleme
// ===========================================================================

interface Vector { map?: PointMap; phrase: string; exclude: string[]; destination?: Point2D; destinationPoint?: PointObject }

const DIRECTIONS: Record<string, Point2D> = {
  saga: { x: 1, y: 0 }, sola: { x: -1, y: 0 }, yukari: { x: 0, y: 1 }, asagi: { x: 0, y: -1 },
  doguya: { x: 1, y: 0 }, batiya: { x: -1, y: 0 }, kuzeye: { x: 0, y: 1 }, guneye: { x: 0, y: -1 },
};
const DIR_WORD = String.raw`\b(saga|sola|yukari|asagi|doguya|batiya|kuzeye|guneye)(?:ya)?(?:\s+dogru)?`;
const UNIT = String.raw`(?:\s*(?:br|birim|cm|santim|kare|adim)[a-z]*)?`;

function vectorPoints(ctx: Ctx, ref: LabelRef): [PointObject, PointObject] {
  const { scene } = ctx;
  const pts = scene.pointsFromLabel(ref.text);
  if (pts && pts.length === 2 && pts[0].id !== pts[1].id) return [pts[0], pts[1]];
  const objs = scene.resolveLabel(ref, ['segment', 'ray', 'line']);
  if (objs.length === 1) return scene.lineOf(objs[0])!;
  if (objs.length > 1) fail(`${ref.text} adıyla birden fazla nesne eşleşti. Vektörü iki nokta adıyla yazın (ör. “AB vektörü kadar ötele”).`);
  fail(`${ref.text} vektörü bulunamadı. Vektörü iki nokta adıyla yazın (ör. “AB vektörü kadar ötele”).`);
}

function directionVector(ctx: Ctx): Point2D | null {
  const A = new RegExp(String.raw`(eksi\s+)?#(\d+)(?!\d)${UNIT}(?:\s+kadar)?\s+${DIR_WORD}`);
  const B = new RegExp(String.raw`${DIR_WORD}\s+(eksi\s+)?#(\d+)(?!\d)${UNIT}`);
  const AXIS_A = /\b(x|yatay|y|dikey)\s+(?:ekseni\s+boyunca|yonunde|dogrultusunda|olarak)\s+(eksi\s+)?#(\d+)(?!\d)(?:\s*(?:br|birim|cm)[a-z]*)?/;
  const AXIS_B = /(eksi\s+)?#(\d+)(?!\d)(?:\s*(?:br|birim|cm)[a-z]*)?\s+(x|yatay|y|dikey)\s+(?:ekseni\s+boyunca|yonunde|dogrultusunda)/;
  const v = { x: 0, y: 0 };
  let found = false;
  const add = (dir: Point2D, amount: number) => { v.x += dir.x * amount; v.y += dir.y * amount; found = true; };
  const firstA = ctx.find(A), firstB = ctx.find(B);
  const useB = !!firstB && (!firstA || (firstB.index ?? 0) < (firstA.index ?? 0));
  let m: RegExpExecArray | null;
  if (useB) while ((m = ctx.take(B))) add(DIRECTIONS[m[1]], (m[2] ? -1 : 1) * ctx.num(m[3]));
  else while ((m = ctx.take(A))) add(DIRECTIONS[m[3]], (m[1] ? -1 : 1) * ctx.num(m[2]));
  while ((m = ctx.take(AXIS_A))) add(/^(?:x|yatay)$/.test(m[1]) ? { x: 1, y: 0 } : { x: 0, y: 1 }, (m[2] ? -1 : 1) * ctx.num(m[3]));
  while ((m = ctx.take(AXIS_B))) add(/^(?:x|yatay)$/.test(m[3]) ? { x: 1, y: 0 } : { x: 0, y: 1 }, (m[1] ? -1 : 1) * ctx.num(m[2]));
  return found ? { x: tidy(v.x), y: tidy(v.y) } : null;
}

function directionPhrase(v: Point2D): string {
  const parts: string[] = [];
  if (v.x) parts.push(`${trNum(Math.abs(v.x))} birim ${v.x > 0 ? 'sağa' : 'sola'}`);
  if (v.y) parts.push(`${trNum(Math.abs(v.y))} birim ${v.y > 0 ? 'yukarı' : 'aşağı'}`);
  return parts.join(' ve ');
}

function findVector(ctx: Ctx): Vector {
  const { scene } = ctx;
  // "ABC'yi vektör (3, 2) ile": belirtme/yönelme ekli etiket hedeftir, vektör adı değil.
  // ("da/de": prepare() durak sözcüğüne benzeyen etiketi "DE'da" yazımıyla korur.)
  const byLabel = ctx.take(/\$(\d+)(?!\d)(?:nin|nun|in|un|da|de)?\s+vektor[a-z]*(?:\s+(?:kadar|boyunca|ile|yonunde|dogrultusunda))?/)
    ?? ctx.take(/\bvektor[a-z]*\s+\$(\d+)(?!\d)[a-z]*(?:\s+(?:olan|kadar|ile))?/);
  if (byLabel) {
    const [a, b] = vectorPoints(ctx, ctx.label(byLabel[1]));
    if (dist(a, b) < 1e-12) fail('Öteleme vektörünün başlangıç ve bitiş noktaları farklı konumda olmalı.');
    return { map: translateMap(scene, { ids: [a.id, b.id] }), phrase: `${a.label}${b.label} vektörü kadar`, exclude: [a.id, b.id] };
  }
  const fromTo = ctx.find(/\$(\d+)(?!\d)(?:(?:dan|den|tan|ten)|\s+noktasindan)\s+\$(\d+)(?!\d)(?:ya|ye|a|e|na|ne)?(?:\s+noktasina)?(?:\s+(?:kadar|dogru))?/);
  if (fromTo) {
    const a = scene.findPoint(ctx.label(fromTo[1]).text), b = scene.findPoint(ctx.label(fromTo[2]).text);
    if (a && b) {
      ctx.consume(fromTo);
      if (a.id === b.id || dist(a, b) < 1e-12) fail('Öteleme vektörünün başlangıç ve bitiş noktaları farklı konumda olmalı.');
      return { map: translateMap(scene, { ids: [a.id, b.id] }), phrase: `${a.label}${b.label} vektörü kadar`, exclude: [a.id, b.id] };
    }
  }
  // "A noktası B noktasına gelecek şekilde ötele": AB vektörü
  const landing = ctx.find(/\$(\d+)(?!\d)(?:\s+noktasi(?:ni)?)?\s+\$(\d+)(?!\d)(?:ya|ye|a|e|na|ne)?(?:\s+noktasina|\s+uzerine|\s+konumuna)?\s+(?:gelecek|gidecek|cakisacak|oturacak|denk\s+gelecek|tasinacak|ulasacak)\s+(?:sekilde|bicimde)/);
  if (landing) {
    const a = scene.findPoint(ctx.label(landing[1]).text), b = scene.findPoint(ctx.label(landing[2]).text);
    if (a && b) {
      ctx.consume(landing);
      if (a.id === b.id || dist(a, b) < 1e-12) fail('Öteleme vektörünün başlangıç ve bitiş noktaları farklı konumda olmalı.');
      return { map: translateMap(scene, { ids: [a.id, b.id] }), phrase: `${a.label}${b.label} vektörü kadar`, exclude: [a.id, b.id] };
    }
  }
  const destinationLabel = ctx.find(/\$(\d+)(?!\d)(?:ya|ye|a|e|na|ne|da|de)?\s+(?:noktasina|konumuna|uzerine)/);
  if (destinationLabel) {
    const p = scene.findPoint(ctx.label(destinationLabel[1]).text);
    if (p) { ctx.consume(destinationLabel); return { phrase: '', exclude: [p.id], destinationPoint: p }; }
  }
  const destination = ctx.take(/(?<!\$\d+\s*)@(\d+)(?!\d)\s+(?:e|ye|a|ya|noktasina|konumuna)\b/);
  if (destination) return { phrase: '', exclude: [], destination: ctx.coord(destination[1]) };
  const coord = ctx.take(/(?<!\$\d+\s*)@(\d+)(?!\d)(?!\s+nokta)(?:\s+(?:vektor[a-z]*|kadar|ile|yle|boyunca|oteleme[a-z]*))*/);
  if (coord) {
    // "eksi (3, 2) vektörüyle": işaretin hangi bileşene ait olduğu belli değil; yanlış yöne ötelemek yerine sorulur.
    if (/\beksi\s*$/.test(ctx.rest().slice(0, coord.index ?? 0))) {
      const v = ctx.coord(coord[1]);
      fail(`“eksi” sözcüğünün vektörün hangi bileşenine ait olduğunu anlayamadım. İşareti koordinatın içine yazın: “(${trNum(-v.x)}, ${trNum(v.y)}) vektörüyle ötele” ya da “(${trNum(-v.x)}, ${trNum(-v.y)}) vektörüyle ötele”.`);
    }
    const v = ctx.coord(coord[1]);
    if (Math.hypot(v.x, v.y) < 1e-12) fail('Öteleme vektörü sıfır olamaz.');
    return { map: translateMap(scene, { v }), phrase: `${fmt(v)} vektörüyle`, exclude: [] };
  }
  const v = directionVector(ctx);
  if (v) {
    if (Math.hypot(v.x, v.y) < 1e-12) fail('Öteleme vektörü sıfır olamaz.');
    return { map: translateMap(scene, { v }), phrase: directionPhrase(v), exclude: [] };
  }
  fail('Öteleme vektörünü yazın. Örneğin: “ABC\'yi (3, 2) vektörüyle ötele”, “AB vektörü kadar ötele” ya da “3 birim sağa 2 birim yukarı ötele”.');
}

/** Adı yalnızca fonksiyon(lar)a çıkan etiket: "f yi", "g nin". */
function functionsOf(scene: CommandScene, label: LabelRef): FunctionObject[] {
  const found = scene.resolveLabel(label);
  return found.length && found.every(o => o.type === 'function') ? found as FunctionObject[] : [];
}

/** Ötelenecek fonksiyon adlarını metinden tüketir: görüntü üretmezler, grafikleri yerinde kaydırılır. */
function takeFunctionRefs(ctx: Ctx): FunctionObject[] {
  const found: FunctionObject[] = [];
  for (const m of ctx.findAll(/\$(\d+)(?!\d)[a-z]*/)) {
    const functions = functionsOf(ctx.scene, ctx.label(m[1]));
    if (!functions.length) continue;
    ctx.consume(m);
    found.push(...functions);
  }
  return found;
}

const translate: CommandHandler = {
  id: 'transforms.translate',
  examples: [
    "ABC'yi (3, 2) vektörüyle ötele",
    'ABC üçgenini AB vektörü kadar ötele',
    "ABC'yi 3 birim sağa 2 birim yukarı ötele",
    'A noktasını 4 birim sola ötele',
    'çemberi (-2; 1) kadar ötele',
    "ABCD'yi A'dan C'ye ötele",
    "A'yı (5, 5) noktasına ötele",
    "[AB]'nin (1, 1) ötelemesini çiz",
    "ABC'yi kendisini 2 birim aşağı ötele",
  ],
  match(clause, scene) {
    const p = prepare(clause, scene);
    if (!/\botele/.test(p.t)) return 0;
    if (isEditSentence(p, /\botele(?!n|me)/, !!colorIn(p.c))) return 0;
    // "f yi 2 birim sağa ötele": yalnızca fonksiyon anılıyorsa kaydırma düzenleme ailesindedir (edit.move).
    // "A noktasını ve f yi 2 birim sağa ötele" burada kalır: nokta ötelenir, fonksiyon aynı vektörle kaydırılır.
    const functionOnly = clause.labels.length
      ? clause.labels.every(l => functionsOf(scene, l).length > 0)
      : /\bfonksiyon/.test(p.t);
    if (functionOnly) return 0;
    return 80;
  },
  run(clause, scene) {
    const ctx = new Ctx(prepare(clause, scene), scene);
    const functions = takeFunctionRefs(ctx);
    const vector = findVector(ctx);
    const inPlace = IN_PLACE.test(ctx.t);
    const imageName = inPlace ? undefined : takeImageName(ctx);
    const targets = findTargets(ctx, { exclude: vector.exclude, action: 'ötelenecek', example: '“ABC üçgenini (3, 2) vektörüyle ötele”' });
    let map = vector.map, phrase = vector.phrase;
    if (vector.destination || vector.destinationPoint) {
      const target = targets[0];
      if (targets.length !== 1 || target.type !== 'point') {
        fail('“(3, 4) noktasına ötele” yalnızca tek bir nokta için kullanılabilir. Şekiller için vektör yazın: “ABC\'yi (3, 4) vektörüyle ötele” ya da “ABC\'yi AB vektörü kadar ötele”.');
      }
      const goal = vector.destinationPoint;
      if (goal) {
        if (goal.id === target.id || dist(goal, target) < 1e-12) fail(`${target.label} noktası zaten ${goal.label} noktasının konumunda.`);
        map = translateMap(scene, { ids: [target.id, goal.id] });
        phrase = `${target.label}${goal.label} vektörü kadar`;
      } else {
        const at = vector.destination!;
        const v = { x: tidy(at.x - target.x), y: tidy(at.y - target.y) };
        if (Math.hypot(v.x, v.y) < 1e-12) fail(`${target.label} noktası zaten ${fmt(at)} konumunda.`);
        map = translateMap(scene, { v });
        phrase = `${fmt(v)} vektörüyle`;
      }
    }
    // "A noktasını ve f yi 2 birim sağa ötele": fonksiyonun grafiği aynı vektörle yerinde kaydırılır.
    if (functions.length) {
      if (!map) fail('Fonksiyon bir konuma taşınamaz; yön ve miktar yazın (ör. “f fonksiyonunu 2 birim sağa ötele”).');
      const v = map.apply({ x: 0, y: 0 });
      for (const fn of functions) {
        const before = fn.label;
        shiftFunction(scene, fn, v);
        scene.say(`${before} fonksiyonu ${phrase} kaydırıldı: ${scene.get(fn.id)?.label ?? before}.`);
      }
    }
    if (inPlace) {
      const before = describeAll(targets);
      transformInPlace(scene, targets, map!, 'ötelenemez');
      sayInPlace(scene, targets, before, `${phrase} yerinde ötelendi`);
    } else {
      emitImages(ctx, targets, map!, imageName, images => `${sentence(describeAll(targets), `${phrase} ötelendi`)}: ${imageNames(images)}.`);
    }
    finishNotes(ctx);
  },
};

// ===========================================================================
// Homotete (büyütme / küçültme)
// ===========================================================================

const FRACTION_DENOMINATORS: Record<string, number> = { iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yuz: 100 };

function findFactor(ctx: Ctx): number | undefined {
  const neg = (s?: string) => (s ? -1 : 1);
  const frac = (a: string, b?: string) => ctx.num(a) / (b ? ctx.num(b) : 1);
  const k = ctx.find(/(?:\bk|\$(\d+))\s*=\s*(eksi\s+)?#(\d+)(?!\d)(?:\s*\/\s*#(\d+)(?!\d))?/);
  if (k && (k[1] === undefined || labelKey(ctx.label(k[1]).text) === 'k')) { ctx.consume(k); return neg(k[2]) * frac(k[3], k[4]); }
  let m: RegExpExecArray | null;
  if ((m = ctx.take(/\byuzde\s+#(\d+)(?!\d)(?:\s*(?:oran[a-z]*|kat[a-z]*))?/))) return ctx.num(m[1]) / 100;
  if ((m = ctx.take(/#(\d+)(?!\d)\s+(?:de|da|te|ta)\s+#(\d+)(?!\d)(?:\s*(?:oran[a-z]*|kat[a-z]*))?/))) return ctx.num(m[2]) / ctx.num(m[1]);
  // "dörtte bir", "üçte iki": sayı sözcüğü ekle bitişik yazıldığı için çözümleyici sayı saymaz.
  if ((m = ctx.take(/\b(iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|yuz)(?:de|da|te|ta)\s+(?:#(\d+)(?!\d)|bir\b)(?:\s*(?:oran[a-z]*|kat[a-z]*))?/))) {
    return (m[2] ? ctx.num(m[2]) : 1) / FRACTION_DENOMINATORS[m[1]];
  }
  if ((m = ctx.take(/(eksi\s+)?#(\d+)(?!\d)(?:\s*\/\s*#(\d+)(?!\d))?\s*(?:kat[a-z]*|oran[a-z]*|olcek[a-z]*|carpan[a-z]*)/))) return neg(m[1]) * frac(m[2], m[3]);
  if ((m = ctx.take(/\b(?:benzerlik\s+)?(?:oran[a-z]*|olcek(?:\s+carpan)?[a-z]*|carpan[a-z]*|katsayi[a-z]*)\s*(?:=|:)?\s*(?:olarak\s+|ise\s+)?(eksi\s+)?#(\d+)(?!\d)(?:\s*\/\s*#(\d+)(?!\d))?/))) return neg(m[1]) * frac(m[2], m[3]);
  if (ctx.take(/\byari\s+yariya|\byari(?:ya|sina|si)\b(?:\s+kadar)?/)) return 0.5;
  const bare = ctx.findAll(/(eksi\s+)?#(\d+)(?!\d)(?:\s*\/\s*#(\d+)(?!\d))?/);
  if (bare.length > 1) fail('Homotetinin oranını tek bir sayıyla yazın. Örneğin: “ABC\'yi A merkezli 2 kat büyüt”.');
  if (bare.length === 1) { ctx.consume(bare[0]); return neg(bare[0][1]) * frac(bare[0][2], bare[0][3]); }
  return undefined;
}

function factorText(k: number): string {
  const t = soft(k);
  if (Number.isInteger(t)) return String(t);
  const inverse = soft(1 / t);
  if (Number.isInteger(inverse)) return `${inverse < 0 ? '-' : ''}1/${Math.abs(inverse)}`;
  return trNum(t, 3);
}

const dilate: CommandHandler = {
  id: 'transforms.dilate',
  examples: [
    "ABC'yi A merkezli 2 kat büyüt",
    "ABC'yi O merkezli 1/2 oranında küçült",
    'ABC üçgenine k = 3 homotetisi uygula',
    "ABC'ye (1, 1) merkezli k = -2 homotetisi uygula",
    "ABC'yi orijin merkezli 3 kat küçült",
    "ABCD'yi C noktasına göre %150 oranında büyüt",
    'çemberi merkezine göre 3 kat büyüt',
    "ABC'yi yarıya küçült",
    "ABC'yi yerinde 2 kat büyüt",
  ],
  match(clause, scene) {
    const p = prepare(clause, scene);
    const t = p.t;
    // "iki katına çıkar", "A merkezli 2 katını çiz": büyütme fiili yazılmamış homotete.
    const doubling = /#\d+(?!\d)\s+katina\s+cikar/.test(t) || (/\bmerkezli\b/.test(t) && /#\d+(?!\d)\s+kat(?:i|ini|inin)\b/.test(t) && p.c.hasVerb('create'));
    if (!/\b(?:buyut|kucult|olcekle|homotet)/.test(t) && !doubling) return 0;
    const explicit = /homotet|merkezli/.test(t);
    if (/\b(?:yazi|metin|font|punto|harf|cizgi|kalinlik|dolgu|etiket|olcum|gorunum|ekran|tuval|izgara|arayuz|panel|simge|pencere|eksen|kaydirici|dugme|isaret|yaricap|uzunlug|kenar)/.test(t) && !explicit) return 0;
    if (/\bnokta(?:lari|lar|lara)\b/.test(t) && !p.c.labels.length && !explicit) return 0;
    if (isEditSentence(p, /\b(?:buyut|kucult|olcekle|homotet|katina\s+cikar)/, !!colorIn(p.c))) return 0;
    return /\bkat|oran|homotet|merkez|olcek|carpan|\bk\s*=|\byari|yuzde/.test(t) ? 80 : 76;
  },
  run(clause, scene) {
    const ctx = new Ctx(prepare(clause, scene), scene);
    const center = findCenter(ctx);
    let k = findFactor(ctx);
    if (ctx.find(/#\d+/)) fail('Homotetinin oranını tek bir sayıyla yazın. Örneğin: “ABC\'yi A merkezli 2 kat büyüt”.');
    const shrink = /\bkucult/.test(ctx.t), grow = /\bbuyut/.test(ctx.t);
    if (k === undefined) {
      if (shrink) { k = 0.5; ctx.notes.push('Oran yazılmadığı için k = 1/2 kullanıldı.'); }
      else if (grow) { k = 2; ctx.notes.push('Oran yazılmadığı için k = 2 kullanıldı.'); }
      else fail('Homotetinin oranını yazın. Örneğin: “ABC\'ye A merkezli k = 2 homotetisi uygula”.');
    } else if (shrink && Math.abs(k) > 1) {
      k = 1 / k;
    }
    if (!Number.isFinite(k) || Math.abs(k) < 1e-9) fail('Homotete oranı 0 olamaz.');
    k = soft(k);
    if (Math.abs(k) > 1000 || Math.abs(k) < 0.001) fail('Homotete oranı 0,001 ile 1000 arasında olmalı.');
    if (k === 1) fail('Oran 1 olursa şekil değişmez. Farklı bir oran yazın (ör. “2 kat büyüt”).');
    const inPlace = IN_PLACE.test(ctx.t);
    const imageName = inPlace ? undefined : takeImageName(ctx);
    const targets = findTargets(ctx, { exclude: center.anchor?.id ? [center.anchor.id] : [], action: 'büyütülecek', example: '“ABC üçgenini A merkezli 2 kat büyüt”' });
    let anchor = center.anchor;
    if (!anchor) {
      const fallback = defaultAnchor(scene, targets);
      if (!fallback) fail('Bir noktayı büyütmek için homotete merkezini yazın. Örneğin: “A noktasını O merkezli 2 kat büyüt”.');
      anchor = fallback;
      if (!center.own) ctx.notes.push('Merkez yazılmadığı için şeklin merkezi alındı.');
    }
    const map = dilateMap(scene, anchor, k);
    const verb = k < 0 ? 'homotetiyle dönüştürüldü' : Math.abs(k) > 1 ? 'büyütüldü' : 'küçültüldü';
    const how = `k = ${factorText(k)} oranında ${verb} (merkez: ${anchor.phrase})`;
    if (inPlace) {
      const before = describeAll(targets);
      transformInPlace(scene, targets, map, 'büyütülemez');
      sayInPlace(scene, targets, before, `yerinde ${how}`);
    } else {
      emitImages(ctx, targets, map, imageName, images => `${sentence(describeAll(targets), how)}: ${imageNames(images)}.`);
    }
    finishNotes(ctx);
  },
};

export const handlers: CommandHandler[] = [reflect, rotate, translate, dilate];
