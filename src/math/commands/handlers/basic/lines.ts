import type { Point2D, PointObject, SegmentObject } from '@/types/math';
import type { Clause } from '../../text';
import { COLORS, type CommandScene, fail, trNum } from '../../scene';
import type { CommandHandler } from '../../types';
import {
  ANGLE_NOUN, FOREIGN, assertNumbersUsed, creationCount, repeatCreate, LINE_NOUN, ON_OBJECT, POINT_NOUN, RAY_NOUN, type Ref, SEGMENT_NOUN, SIGNED_STRICT, STRICT_CREATE, type Spec, add, checkLength, coordText,
  creationColor, degreesIn, directionWord, existingOf, expandRefs, foreignVerb, freeNear, hasLengthBars, isFromSuffix, isToSuffix, labelParts, lengthIn,
  lineEquation, listTr, materialize, placeGroup, pointAt, pointsNote, polar, scan, signedValue, stripTowards,
} from './shared';

const DEG = Math.PI / 180;
const JOIN = /\b(?:birlestir|bagla|birlestiren|baglayan|birlestirerek)/;
/** "seçtiğim noktaları birleştir": ayrıştırıcının seçim sözcüğü saymadığı biçimler. */
const SELECTED_VERB = /\bsec(?:tigim|tigin|tiginiz|tiklerim|tiklerimi)\b/;
const selectionMeant = (c: Clause) => c.refersToSelection || SELECTED_VERB.test(c.text);
/** Merkez başvurusu çözülemeyen cümlede çember sözcükleri başka aileye ait sayılmaz. */
/** "ağırlık merkezinden geçen doğru": üçgen merkezi önce inşa ailesiyle nokta olarak oluşturulmalı. */
const TRIANGLE_CENTER = /\b(agirlik|diklik|cevrel|ic teget)(?: cember\w*| daire\w*)? merkez\w*/;
const TRIANGLE_CENTER_NAME: Record<string, string> = { agirlik: 'ağırlık merkezini', diklik: 'diklik merkezini', cevrel: 'çevrel çemberinin merkezini', 'ic teget': 'iç teğet çemberinin merkezini' };
function triangleCenterHint(t: string, example: string): string | undefined {
  const m = t.match(TRIANGLE_CENTER);
  if (!m) return undefined;
  return `Üçgenin bu merkezi henüz bir nokta değil. Önce merkezi oluşturun, sonra onu kullanın: “ABC üçgeninin ${TRIANGLE_CENTER_NAME[m[1]]} bul ve ${example}”.`;
}
const withoutCenter = (t: string) => t.replace(/\b(?:cember|daire|elips|yay|dilim)\w*|\bmerkez\w*/g, ' ');
const clean = (n: number) => (Math.abs(n) < 1e-12 ? 0 : n);
const distance = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);

/** "x eksenine paralel" → yatay, "y eksenine paralel" → dikey, "x ekseniyle 30 derecelik açı yapan" → "30 derece yönlü". */
export function normalizeAxes(text: string): string {
  return text
    .replace(/\bx ekseni\w* (?:ile )?(#\d+ derece)\w*(?: (?:lik|luk))? aci yapan/g, '$1 yonlu')
    .replace(/\b(?:x ekseni\w* paralel\w*|y ekseni\w* dik\w*)/g, 'yatay')
    .replace(/\b(?:y ekseni\w* paralel\w*|x ekseni\w* dik\w*)/g, 'dikey');
}

/**
 * Doğru ve ışın cümlelerinin ortak metni: eksen ifadeleri, "B'ye doğru" yönü, "yarı doğru" (ışının eski adı) → "ışını",
 * "[AB] doğru parçasını doğruya uzat" → "AB doğrusunu uzat".
 */
function lineText(text: string): string {
  return stripTowards(normalizeAxes(text))
    .replace(/\byari dogru\w*/g, 'isini')
    .replace(/\b(?:dogru )?parca\w* (?:dogruya|dogru olarak) (uzat\w*|tamamla\w*)/g, 'dogrusunu $1');
}

/** Nokta çiftinin 90°'lik dönüşleri: yeni uç için boş yer ararken kullanılır. */
function spread(o: Point2D): Point2D[] {
  const turns = [0, 90, 180, 270, 45, 135, 225, 315].map(d => d * DEG);
  return turns.map(a => ({ x: clean(o.x * Math.cos(a) - o.y * Math.sin(a)), y: clean(o.x * Math.sin(a) + o.y * Math.cos(a)) }));
}

/** İki uç nokta: var olanlar kullanılır, eksikler var olanın yanına (ya da ikisi birden boş bir yere) konur. */
export function endpoints(scene: CommandScene, specs: Spec[], offset: Point2D): [PointObject, PointObject] {
  const [sa, sb] = specs;
  const fixedA = !!(existingOf(scene, sa) || sa.coord), fixedB = !!(existingOf(scene, sb) || sb.coord);
  if (!fixedA && !fixedB) {
    const base = placeGroup(scene, [{ x: 0, y: 0 }, offset]);
    const a = materialize(scene, sa, () => base);
    return [a, materialize(scene, sb, () => add(base, offset))];
  }
  if (fixedA) {
    const a = materialize(scene, sa);
    return [a, materialize(scene, sb, () => freeNear(scene, a, spread(offset)))];
  }
  const b = materialize(scene, sb);
  return [materialize(scene, sa, () => freeNear(scene, b, spread({ x: -offset.x, y: -offset.y }))), b];
}

/** "AB ve CD doğru parçaları": her biri iki nokta adından oluşan birden çok etiket. */
function pairLabels(scene: CommandScene, refs: Ref[]): boolean {
  return refs.length >= 2 && refs.every(r => r.kind === 'label' && !r.coord && !scene.findPoint(r.label.text) && !!labelParts(scene, r.label.text, 2));
}

/** "AB'nin uzunluğu 5 olsun", "AB doğru parçası 5 birim olsun": var olan parçayı değiştirme (düzenleme ailesi). */
function setVerbWithLength(t: string): boolean {
  return /(?:\buzunlug\w* (?:= |: )?#\d+|#\d+ (?:birim|br|cm)\w*) ?(?:\w+ )?(?:yap|ayarla|degistir|olsun)/.test(t) && !/(?:\bolan\b|lik\b|luk\b|uzunlugunda|ciz|olustur)/.test(t);
}

// ------------------------------------------------------------------------------------------------ doğru parçası

/** "kırık çizgi", "çoklu doğru parçası": sırayla birleştirilen noktalar. */
const POLYLINE = /\bkirik cizgi|\bcoklu (?:dogru )?parca|\bpoligonal/;
/** "AB kenarını çiz": iki nokta adıyla kenar (şekil adı yoksa doğru parçasıdır). */
const EDGE_NOUN = /\bkenar(?:i|ini)?\b/;

/** "ABCD noktalarını birleştir": tek etiket birden çok noktaya açılıyor. */
function joinsOneLabel(scene: CommandScene, refs: Ref[]): boolean {
  return refs.length === 1 && refs[0].kind === 'label' && !refs[0].coord && expandRefs(scene, refs).length >= 2;
}

/** Adı yazılmadan "birleştir": önceki cümlede oluşturulan ya da seçili noktalar, yoksa sahnedeki iki nokta / "tüm noktalar". */
function joinPool(c: Clause, scene: CommandScene): PointObject[] {
  const pointsOf = (ids: string[]) => ids.map(id => scene.get(id)).filter((o): o is PointObject => o?.type === 'point');
  for (const ids of selectionMeant(c) ? [scene.selection] : [scene.focus, scene.selection]) {
    const list = pointsOf(ids);
    if (list.length >= 2) return list;
  }
  const all = scene.points();
  return all.length === 2 || (/\b(?:tum|butun|hepsi)/.test(c.text) && !selectionMeant(c)) ? all : [];
}

function polyline(t: string, scene: CommandScene, specs: Spec[], color?: string) {
  const pts = specs.map(sp => materialize(scene, sp));
  const closed = /\b(?:kapali|basa don\w*|ilk noktaya|baslangica don\w*|ilk noktayla)/.test(t);
  if (closed && pts.length < 3) fail('Kapalı bir yol için en az üç nokta gerekir.');
  const segments: SegmentObject[] = [];
  for (let i = 0; i + 1 < pts.length; i++) segments.push(scene.addSegment(pts[i].id, pts[i + 1].id, { color }));
  if (closed) segments.push(scene.addSegment(pts[pts.length - 1].id, pts[0].id, { color }));
  scene.setFocus(segments.map(s => s.id));
  scene.say(`${listTr(pts.map(p => p.label))} noktaları sırayla birleştirildi: ${segments.map(s => s.label).join(', ')}.${pointsNote(scene)}`);
}

export const segment: CommandHandler = {
  id: 'basic.segment',
  examples: [
    'AB doğru parçası çiz', '[AB] çiz', "A ile B'yi birleştir", "A'dan B'ye doğru parçası", '(0,0) ile (4,3) arasında doğru parçası çiz',
    "A'dan başlayan 5 birimlik doğru parçası", 'uzunluğu 7 cm olan doğru parçası çiz', "A'dan yukarı doğru 3 birimlik doğru parçası çiz",
    'A, B, C, D noktalarını sırayla birleştir', 'AB ve CD doğru parçalarını çiz', 'AB doğru parçasını çizer misin', 'A ve B noktalarını birleştir',
  ],
  match(c, scene) {
    if (hasLengthBars(c) || c.definition) return 0;
    const s = scan(c, scene);
    const t = stripTowards(s.text);
    if (isVectorRequest(c, t)) return 36;
    const allowed: ('bind' | 'select')[] = SELECTED_VERB.test(c.text) ? ['bind', 'select'] : ['bind'];
    if (s.centerProblem && (SEGMENT_NOUN.test(t) || JOIN.test(t)) && !FOREIGN.test(withoutCenter(t)) && !foreignVerb(c, allowed)) return 38;
    if (FOREIGN.test(t) || foreignVerb(c, allowed)) return 0;
    if (ON_OBJECT.test(t) && POINT_NOUN.test(t)) return 0;
    if (RAY_NOUN.test(t) || ANGLE_NOUN.test(t) || /\bvektor|\byari dogru/.test(t)) return 0;
    const edge = EDGE_NOUN.test(t) && STRICT_CREATE.test(t) && s.refs.length === 1 && s.refs[0].kind === 'label' && !!labelParts(scene, s.refs[0].label.text, 2);
    const noun = SEGMENT_NOUN.test(t) || edge;
    if (LINE_NOUN.test(t) && !noun) return 0;
    const bracket = c.labels.some(l => l.bracket === 'segment') && s.refs.length === 1 && s.words.length <= 4;
    const join = JOIN.test(t) && (s.refs.length >= 2 || joinsOneLabel(scene, s.refs));
    const lonelyJoin = JOIN.test(t) && s.refs.length === 1 && !joinsOneLabel(scene, s.refs) && !lengthIn(c, s);
    if (lonelyJoin && !FOREIGN.test(t)) return 38;
    const pooled = !s.refs.length && (/\bbirlestir/.test(t) || (/\bbagla/.test(t) && /\bnokta|\bonlari|\bbunlari|\bikisini/.test(t)));
    const towards = /%\d+(?:dan|den|tan|ten) %\d+(?:ye|ya|e|a|na|ne) yonunde\b/.test(t) && c.hasVerb('create');
    if (c.verbs.has('bind') && !join) return 0;
    if (!(noun || bracket || join || towards || pooled)) return 0;
    if (setVerbWithLength(t) && s.refs.some(r => r.kind === 'label' && scene.resolveLabel(r.label, ['segment']).length)) return 0;
    return noun || bracket ? 42 : join ? 41 : pooled ? 38 : 40;
  },
  run(c, scene) {
    const s = scan(c, scene);
    const t = stripTowards(s.text);
    if (isVectorRequest(c, t)) fail(VECTOR_MESSAGE);
    if (s.centerProblem && /\bmerkez/.test(t)) fail(s.centerProblem);
    assertNumbersUsed(c, s, '“5 birimlik doğru parçası çiz”');
    const length = lengthIn(c, s);
    if (length) checkLength(length.value);
    const towardRef = length
      ? s.refs.find(r => isToSuffix(r.suffix) && /^(?:dogru|yonunde|yonune)$/.test(s.words[r.at + 1] ?? '') && !/^parca/.test(s.words[r.at + 2] ?? ''))
      : undefined;
    const refs = s.refs.filter(r => r !== towardRef);
    const color = creationColor(c);

    // "iki nokta koy ve birleştir", "seçili noktaları birleştir": adı yazılmayan noktalar
    if (!refs.length && (JOIN.test(t) || /\bnokta\w* arasin/.test(t)) && !length) {
      const pool = joinPool(c, scene);
      if (pool.length < 2) fail('Hangi noktaları birleştireceğimi anlayamadım. Noktaları adlarıyla yazın (ör. “A ile B’yi birleştir”) ya da önce noktaları seçin.');
      if (pool.length > 2 || /\bkapali/.test(t)) { polyline(t, scene, pool.map(p => ({ label: p.label })), color); return; }
      const joined = scene.addSegment(pool[0].id, pool[1].id, { color });
      scene.setFocus([joined.id]);
      scene.say(scene.clauseCreated.includes(joined.id) ? `${pool[0].label} ve ${pool[1].label} noktaları birleştirildi: ${joined.label} doğru parçası çizildi.` : `${joined.label} doğru parçası zaten var.`);
      return;
    }

    if (refs.length === 1 && JOIN.test(t) && !length && expandRefs(scene, refs).length < 2) {
      const only = refs[0].kind === 'label' ? refs[0].label.text : 'Bu nokta';
      fail(`${only} noktasını hangi noktayla birleştireceğimi anlayamadım. İki noktayı da adıyla yazın (ör. “A ile ${only} noktasını birleştir”) ya da “onu” ile göstereceğiniz tek bir noktayı önce seçin.`);
    }
    if (pairLabels(scene, refs)) {
      const segments = refs.map(r => {
        const [a, b] = endpoints(scene, expandRefs(scene, [r]), { x: 4, y: 0 });
        return scene.addSegment(a.id, b.id, { unit: length?.unit, color });
      });
      scene.setFocus(segments.map(x => x.id));
      scene.say(`${listTr(segments.map(x => x.label))} doğru parçaları çizildi.${pointsNote(scene)}`);
      return;
    }

    let specs = expandRefs(scene, refs);
    if (specs.length >= 3) {
      if (!JOIN.test(t) && !/\bsira/.test(t) && !POLYLINE.test(t)) fail('Doğru parçası iki noktayla belirtilir. Birden çok noktayı birleştirmek için “A, B, C noktalarını sırayla birleştir” yazın.');
      polyline(t, scene, specs, color);
      return;
    }
    if (specs.length === 2 && specs[0].ref && specs[1].ref && specs[0].ref !== specs[1].ref
      && isToSuffix(specs[0].ref.suffix) && isFromSuffix(specs[1].ref.suffix)) specs = [specs[1], specs[0]];

    const degrees = degreesIn(c, s);
    const word = directionWord(t);
    const clockwise = /\bsaat yonunde/.test(t) && !/\btersi/.test(t);
    let angle = degrees !== undefined ? (clockwise ? -degrees : degrees) * DEG : word?.angle ?? 0;
    const L = length?.value ?? 4;
    // "üç doğru parçası çiz": birden çok adsız parça
    const count = specs.length ? 1 : creationCount(c, s, /dogru parca|parca|cizgi/);
    if (count > 1) {
      repeatCreate(scene, count, 'doğru parçası', () => {
        const base = placeGroup(scene, [{ x: 0, y: 0 }, polar(L, angle)]);
        const start = scene.addPoint(base);
        const end = scene.addPoint(add(start, polar(L, angle)));
        return scene.addSegment(start.id, end.id, { unit: length?.unit, color }).id;
      });
      return;
    }
    const notes: string[] = [];
    const endSpec = specs[1];
    const endFixed = endSpec ? !!(existingOf(scene, endSpec) || endSpec.coord) : false;
    let a: PointObject, b: PointObject;
    if (endSpec && (endFixed || !length)) {
      [a, b] = endpoints(scene, specs, polar(L, angle));
      if (length && Math.abs(distance(a, b) - L) > 1e-6) {
        fail(`${a.label} ile ${b.label} arası ${trNum(distance(a, b))} birim; ${trNum(L)} birimlik parça bu iki noktayla çizilemez. Uzunluğu değiştirmek için “${a.label}${b.label} uzunluğunu ${trNum(L)} yap” yazın.`);
      }
    } else {
      const startSpec = specs[0];
      const place = () => placeGroup(scene, [{ x: 0, y: 0 }, polar(L, angle)]);
      a = startSpec ? materialize(scene, startSpec, place) : scene.addPoint(place());
      if (towardRef) {
        const target = towardRef.kind === 'coord' ? pointAt(scene, towardRef.coord) ?? towardRef.coord : scene.findPoint(towardRef.label.text);
        if (!target) fail(`${towardRef.kind === 'label' ? towardRef.label.text : 'Yön'} noktası bulunamadı; yön için var olan bir nokta yazın.`);
        if (distance(target, a) < 1e-9) fail('Yön noktası başlangıç noktasıyla aynı yerde; başka bir nokta yazın.');
        angle = Math.atan2(target.y - a.y, target.x - a.x);
      }
      b = scene.addPoint(add(a, polar(L, angle)), { label: endSpec?.label, color: length ? COLORS.segment : undefined });
      if (!length) notes.push(`Uzunluk belirtilmediği için ${trNum(L)} birim alındı.`);
      else if (degrees === undefined && !word && !towardRef) notes.push('Parça sağa doğru çizildi; uç noktasını sürükleyerek döndürebilirsiniz.');
    }
    const seg = scene.addSegment(a.id, b.id, { unit: length?.unit, color });
    if (!scene.clauseCreated.includes(seg.id)) {
      scene.setFocus([seg.id]);
      scene.say(`${seg.label} doğru parçası zaten var.`);
      return;
    }
    const unitText = length ? ` (${trNum(L)} ${length.unit === 'cm' ? 'cm' : 'br'})` : '';
    scene.say(`${seg.label} doğru parçası çizildi${unitText}.${pointsNote(scene)}${notes.length ? ` ${notes.join(' ')}` : ''}`);
  },
};

// ------------------------------------------------------------------------------------------------ doğru

const SLOPE_FRACTION = [new RegExp(`\\begim(?:i|li)? (?:= |: |olarak )?${SIGNED_STRICT} \\/ (#\\d+)`), new RegExp(`${SIGNED_STRICT} \\/ (#\\d+) egimli`)];
const SLOPE_VALUE = [new RegExp(`\\begim(?:i|li)? (?:= |: |olarak )?${SIGNED_STRICT}( derece)?`), new RegExp(`${SIGNED_STRICT}( derece)? (?:egimli|yonlu)`)];
/** "x = 3", "x eşittir eksi iki" (konuşmada eşittir sözle gelir). */
const X_LEAD = '^(?:(?:simdi|lutfen|tamam|evet|hadi|sey|ayrica|bana|denklemi|denklem)\\s+)*';
const X_EQUALS = new RegExp(`${X_LEAD}x (?:=|esittir|esit) ${SIGNED_STRICT}(.*)$`);
/** Konuşmada "eşittir" düşmüş olabilir: "x 3 doğrusunu çiz". */
const X_BARE = new RegExp(`${X_LEAD}x ${SIGNED_STRICT}( dogru\\w*.*)$`);
const xEquals = (t: string) => t.match(X_EQUALS) ?? t.match(X_BARE);

function slopeIn(c: Clause, t: string): number | 'vertical' | undefined {
  let m = t.match(SLOPE_FRACTION[0]) ?? t.match(SLOPE_FRACTION[1]);
  if (m) {
    const q = c.num(m[2]);
    if (q === 0) fail('Eğimin paydası sıfır olamaz.');
    return signedValue(c, m[1]) / q;
  }
  m = t.match(SLOPE_VALUE[0]) ?? t.match(SLOPE_VALUE[1]);
  if (!m) return undefined;
  const value = signedValue(c, m[1]);
  if (!m[2]) return value;
  const r = ((value % 180) + 180) % 180;
  if (Math.abs(r - 90) < 1e-9) return 'vertical';
  return Math.tan(value * DEG);
}

function directedLine(scene: CommandScene, specs: Spec[], mode: { horizontal: boolean; vertical: boolean; slope: number | 'vertical' | undefined }, color?: string) {
  if (specs.length > 1) fail('Yatay, dikey ya da eğimi verilen doğru için yalnızca geçtiği noktayı yazın (ör. “A noktasından geçen yatay doğru”).');
  const notes: string[] = [];
  let through: PointObject;
  if (specs.length) through = materialize(scene, specs[0], () => scene.freeSpot());
  else if (typeof mode.slope === 'number' && !mode.horizontal && !mode.vertical) {
    through = pointAt(scene, { x: 0, y: 0 }) ?? scene.addPoint({ x: 0, y: 0 });
    notes.push('Geçtiği nokta yazılmadığı için orijinden geçirildi.');
  } else {
    through = scene.addPoint(scene.freeSpot());
    notes.push('Geçtiği nokta yazılmadığı için boş bir yere yeni nokta kondu.');
  }
  let vector: Point2D;
  let kind: string;
  if (mode.horizontal) { vector = { x: 2, y: 0 }; kind = 'yatay'; }
  else if (mode.vertical || mode.slope === 'vertical') { vector = { x: 0, y: 2 }; kind = 'dikey'; }
  else {
    const m = mode.slope as number;
    if (!Number.isFinite(m) || Math.abs(m) > 1e6) fail('Eğim hesaplanamadı. Eğimi sayı olarak yazın (ör. “eğimi 2 olan doğru”).');
    const k = Math.abs(m) <= 1 ? 2 : 2 / Math.abs(m);
    vector = { x: k, y: clean(k * m) };
    kind = `eğimi ${trNum(m)} olan`;
  }
  const helper = scene.addPoint(add(through, vector), { construction: { kind: 'translate', sourceId: through.id, vector }, color: COLORS.construction });
  const created = scene.addLine(through.id, helper.id, { color });
  scene.say(`${through.label} noktasından geçen ${kind} doğru çizildi (${lineEquation(through, helper)}).${pointsNote(scene, [helper.id])}${notes.length ? ` ${notes.join(' ')}` : ''} ${helper.label} yardımcı noktası ${through.label} noktasına bağlıdır; ${through.label} sürüklenince doğrunun yönü korunur.`);
  scene.setFocus([created.id]);
}

export const line: CommandHandler = {
  id: 'basic.line',
  examples: [
    'AB doğrusunu çiz', 'AB doğru çiz', "A ve B'den geçen doğru", "A'dan geçen yatay doğru", 'A noktasından geçen dikey doğru çiz',
    "eğimi 2 olan ve A'dan geçen doğru", '(1,2) noktasından geçen, eğimi -1/2 olan doğru', 'orijinden geçen eğimi 3 olan doğru',
    "A'dan geçen x eksenine paralel doğru", 'AB ve CD doğrularını çiz', "A ile B'yi birleştiren doğru",
  ],
  match(c, scene) {
    if (hasLengthBars(c) || c.definition) return 0;
    const s = scan(c, scene);
    const t = lineText(s.text);
    // "x = 3 doğrusu" dikey doğru işleyicisinindir; eşleşmese bile ilgisiz bir doğru çizilmez.
    if (xEquals(t) || /(?:^| )x (?:=|esittir) /.test(t)) return 0;
    if (s.centerProblem && LINE_NOUN.test(t) && !FOREIGN.test(withoutCenter(t)) && !foreignVerb(c)) return 38;
    if (TRIANGLE_CENTER.test(t) && LINE_NOUN.test(t) && /\bgecen/.test(t) && !SEGMENT_NOUN.test(t) && !RAY_NOUN.test(t) && !foreignVerb(c)) return 37;
    // "AB doğrusunu uzat", "[AB] doğru parçasını doğruya uzat": parçanın doğrusu (sayı verilirse düzenleme ailesinin uzatmasıdır)
    const extend = /\buzat\w*|\btamamla\w*/.test(t) && !c.numbers.length && !c.coords.length;
    if (!LINE_NOUN.test(t) || FOREIGN.test(t) || foreignVerb(c, extend ? ['scale'] : [])) return 0;
    if (SEGMENT_NOUN.test(t) || RAY_NOUN.test(t) || /\bvektor/.test(t) || ANGLE_NOUN.test(t)) return 0;
    if (ON_OBJECT.test(t) && POINT_NOUN.test(t)) return 0;
    if (/\begim|\bderece yonlu/.test(t)) return 43;
    if (/\b(?:yatay|dikey|dusey)/.test(t)) return 42;
    return 40;
  },
  run(c, scene) {
    const s = scan(c, scene);
    const t = lineText(s.text);
    if (s.centerProblem && /\bmerkez/.test(t)) fail(s.centerProblem);
    const centerHint = triangleCenterHint(t, 'ondan geçen doğru çiz');
    if (centerHint) fail(centerHint);
    const horizontal = /\byatay/.test(t), vertical = /\b(?:dikey|dusey)/.test(t);
    if (horizontal && vertical) fail('Doğru hem yatay hem dikey olamaz; birini yazın.');
    const slope = slopeIn(c, t);
    if (/\begim/.test(t) && slope === undefined) fail('Eğimi sayıyla yazın (ör. “eğimi 2 olan ve A noktasından geçen doğru”).');
    assertNumbersUsed(c, s, '“eğimi 2 olan doğru”');
    // "iki doğru çiz", "üç yatay doğru çiz": birden çok adsız doğru
    const count = s.refs.length ? 1 : creationCount(c, s, /dogru(?! parca)/);
    if (count > 1) {
      repeatCreate(scene, count, horizontal ? 'yatay doğru' : vertical ? 'dikey doğru' : 'doğru', () => {
        if (horizontal || vertical || slope !== undefined) {
          directedLine(scene, [{ coord: scene.freeSpot() }], { horizontal, vertical, slope }, creationColor(c));
          return scene.focus[0];
        }
        const base = placeGroup(scene, [{ x: 0, y: 0 }, { x: 4, y: 2 }]);
        return scene.addLine(scene.addPoint(base).id, scene.addPoint(add(base, { x: 4, y: 2 })).id, { color: creationColor(c) }).id;
      });
      return;
    }
    if (horizontal || vertical || slope !== undefined) {
      directedLine(scene, expandRefs(scene, s.refs), { horizontal, vertical, slope }, creationColor(c));
      return;
    }
    if (pairLabels(scene, s.refs)) {
      const lines = s.refs.map(r => {
        const [a, b] = endpoints(scene, expandRefs(scene, [r]), { x: 4, y: 2 });
        return scene.addLine(a.id, b.id, { color: creationColor(c) });
      });
      scene.setFocus(lines.map(l => l.id));
      scene.say(`${listTr(lines.map(l => l.label))} çizildi.${pointsNote(scene)}`);
      return;
    }
    const specs = expandRefs(scene, s.refs);
    if (specs.length >= 3) fail('Doğru iki noktayla belirtilir. Örneğin “AB doğrusunu çiz” ya da “A ve B noktalarından geçen doğru” yazın.');
    const notes: string[] = [];
    let a: PointObject, b: PointObject;
    if (specs.length === 2) [a, b] = endpoints(scene, specs, { x: 4, y: 2 });
    else if (specs.length === 1) {
      a = materialize(scene, specs[0], () => scene.freeSpot());
      b = scene.addPoint(freeNear(scene, a, [{ x: 3, y: 2 }, { x: 3, y: -2 }, { x: -3, y: 2 }, { x: -3, y: -2 }, { x: 4, y: 0 }, { x: 0, y: 4 }]));
      notes.push(`Yön belirtilmediği için ikinci nokta ${b.label}${coordText(b)} eklendi; bu noktayı sürükleyerek doğrunun yönünü değiştirebilirsiniz.`);
    } else {
      const base = placeGroup(scene, [{ x: 0, y: 0 }, { x: 4, y: 2 }]);
      a = scene.addPoint(base);
      b = scene.addPoint(add(base, { x: 4, y: 2 }));
    }
    const created = scene.addLine(a.id, b.id, { color: creationColor(c) });
    if (!scene.clauseCreated.includes(created.id)) {
      scene.setFocus([created.id]);
      scene.say(`${created.label} zaten var.`);
      return;
    }
    scene.say(`${created.label} çizildi (${lineEquation(a, b)}).${pointsNote(scene, notes.length ? [b.id] : [])}${notes.length ? ` ${notes.join(' ')}` : ''}`);
  },
};

export const verticalLine: CommandHandler = {
  id: 'basic.verticalLine',
  examples: ['x = 3 doğrusu', 'x = -2 doğrusunu çiz', 'x=4', 'x = 1,5 doğrusu', 'x = 0 doğrusunu oluştur', 'x = -3 dikey doğrusu'],
  match(c, scene) {
    const s = scan(c);
    const m = xEquals(s.text);
    if (!m || s.refs.length || c.numbers.length > 1) return 0;
    const rest = m[2];
    if (FOREIGN.test(rest) || foreignVerb(c) || /\b(?:parca|isin|aci|nokta|yatay)/.test(rest)) return 0;
    if (scene.sliders().some(sl => sl.variableName === 'x') && !/\bdogru/.test(rest)) return 0;
    return 96;
  },
  run(c, scene) {
    const k = signedValue(c, xEquals(scan(c).text)![1]);
    if (!Number.isFinite(k) || Math.abs(k) > 100000) fail('x değeri −100000 ile 100000 arasında olmalı.');
    const first = pointAt(scene, { x: k, y: 0 }) ?? scene.addPoint({ x: k, y: 0 });
    const vector = { x: 0, y: 2 };
    const helper = scene.addPoint(add(first, vector), { construction: { kind: 'translate', sourceId: first.id, vector }, color: COLORS.construction });
    const created = scene.addLine(first.id, helper.id, { label: `x = ${trNum(k)}` });
    scene.setFocus([created.id]);
    scene.say(`x = ${trNum(k)} doğrusu çizildi; ${first.label} ve ${helper.label} noktalarından geçer. ${helper.label} noktası ${first.label} noktasına bağlı olduğundan doğru hep dikey kalır.`);
  },
};

// ------------------------------------------------------------------------------------------------ ışın

export const ray: CommandHandler = {
  id: 'basic.ray',
  examples: [
    'AB ışını çiz', 'AB ışın çiz', "A noktasından başlayıp B'den geçen ışın", "A'dan başlayan ve B'den geçen ışın çiz",
    "başlangıç noktası A olan ve B'den geçen ışın", "B'den çıkan 30 derecelik ışın", "A'dan yukarı doğru ışın çiz", "B'den geçen ve A'dan başlayan ışın",
  ],
  match(c, scene) {
    if (hasLengthBars(c) || c.definition) return 0;
    const s = scan(c, scene);
    const t = lineText(s.text);
    if (s.centerProblem && RAY_NOUN.test(t) && !FOREIGN.test(withoutCenter(t)) && !foreignVerb(c)) return 38;
    if (TRIANGLE_CENTER.test(t) && RAY_NOUN.test(t) && /\b(?:baslayan|cikan|gecen)/.test(t) && !SEGMENT_NOUN.test(t) && !LINE_NOUN.test(t) && !foreignVerb(c)) return 37;
    if (!RAY_NOUN.test(t) || FOREIGN.test(t) || foreignVerb(c)) return 0;
    if (SEGMENT_NOUN.test(t) || LINE_NOUN.test(t) || ANGLE_NOUN.test(t) || /\bvektor/.test(t)) return 0;
    if (ON_OBJECT.test(t) && POINT_NOUN.test(t)) return 0;
    return 41;
  },
  run(c, scene) {
    const s = scan(c, scene);
    const t = lineText(s.text);
    if (s.centerProblem && /\bmerkez/.test(t)) fail(s.centerProblem);
    const centerHint = triangleCenterHint(t, 'ondan başlayan ışın çiz');
    if (centerHint) fail(centerHint);
    assertNumbersUsed(c, s, '“A noktasından başlayan 30 derecelik ışın”');
    // "AB ve CD ışınlarını çiz"
    if (pairLabels(scene, s.refs)) {
      const rays = s.refs.map(r => {
        const [a, b] = endpoints(scene, expandRefs(scene, [r]), { x: 4, y: 0 });
        return scene.addRay(a.id, b.id, { color: creationColor(c) });
      });
      scene.setFocus(rays.map(r => r.id));
      scene.say(`${listTr(rays.map(r => r.label))} çizildi.${pointsNote(scene)}`);
      return;
    }
    const specs = expandRefs(scene, s.refs);
    if (specs.length > 2) fail('Işın bir başlangıç noktası ve üzerindeki bir noktayla belirtilir (ör. “AB ışını çiz”).');
    const role = (sp: Spec): 'start' | 'through' | undefined => {
      if (!sp.ref) return undefined;
      const next = s.words.slice(sp.ref.at + 1, sp.ref.at + 3).join(' ');
      const prev = s.words.slice(Math.max(0, sp.ref.at - 2), sp.ref.at).join(' ');
      if (/^(?:nokta\w* )?(?:baslayan|baslayip|baslayarak|cikan|cikip|ciktigi|cikarak|uclu)/.test(next) || /\bbaslangic\w*(?: noktasi)?$/.test(prev)) return 'start';
      if (/^(?:nokta\w* )?(?:gecen|gecip|gecerek)/.test(next) || (isToSuffix(sp.ref.suffix) && /^yonunde/.test(next))) return 'through';
      return undefined;
    };
    let ordered = specs;
    if (specs.length === 2 && specs[0].ref !== specs[1].ref) {
      const r0 = role(specs[0]), r1 = role(specs[1]);
      if ((r0 === 'through' && r1 !== 'through') || (r1 === 'start' && r0 !== 'start')) ordered = [specs[1], specs[0]];
    }
    // "iki ışın çiz": birden çok adsız ışın
    const count = specs.length ? 1 : creationCount(c, s, /isin/);
    if (count > 1) {
      const degrees = degreesIn(c, s), word = directionWord(t);
      const direction = degrees !== undefined ? degrees * DEG : word?.angle ?? 0;
      repeatCreate(scene, count, 'ışın', () => {
        const base = placeGroup(scene, [{ x: 0, y: 0 }, polar(4, direction)]);
        const start = scene.addPoint(base);
        const through = scene.addPoint(add(start, polar(4, direction)));
        return scene.addRay(start.id, through.id, { color: creationColor(c) }).id;
      });
      return;
    }
    let a: PointObject, b: PointObject;
    const notes: string[] = [];
    if (ordered.length === 2) [a, b] = endpoints(scene, ordered, { x: 4, y: 0 });
    else {
      const degrees = degreesIn(c, s);
      const word = directionWord(t);
      const clockwise = /\bsaat yonunde/.test(t) && !/\btersi/.test(t);
      const explicit = degrees !== undefined || !!word;
      const angle = degrees !== undefined ? (clockwise ? -degrees : degrees) * DEG : word?.angle ?? 0;
      const place = () => placeGroup(scene, [{ x: 0, y: 0 }, polar(4, angle)]);
      a = ordered.length ? materialize(scene, ordered[0], place) : scene.addPoint(place());
      if (explicit) {
        const vector = { x: clean(3 * Math.cos(angle)), y: clean(3 * Math.sin(angle)) };
        b = scene.addPoint(add(a, vector), { construction: { kind: 'translate', sourceId: a.id, vector }, color: COLORS.construction });
        notes.push(`${b.label} yön noktası ${a.label} noktasına bağlıdır; ışının yönü korunur.`);
      } else {
        b = scene.addPoint(freeNear(scene, a, [{ x: 4, y: 0 }, { x: 0, y: 4 }, { x: -4, y: 0 }, { x: 0, y: -4 }]));
        notes.push(`Yön belirtilmediği için ${b.label} noktası eklendi; sürükleyerek ışının yönünü değiştirebilirsiniz.`);
      }
    }
    const created = scene.addRay(a.id, b.id, { color: creationColor(c) });
    if (!scene.clauseCreated.includes(created.id)) {
      scene.setFocus([created.id]);
      scene.say(`${created.label} zaten var.`);
      return;
    }
    scene.setFocus([created.id]);
    scene.say(`${created.label} çizildi: ${a.label} noktasından başlar, ${b.label} noktasından geçer.${pointsNote(scene, notes.length ? [b.id] : [])}${notes.length ? ` ${notes.join(' ')}` : ''}`);
  },
};

// ------------------------------------------------------------------------------------------------ vektör

/** "AB vektörü çiz": uygulamada vektör nesnesi yok; tahmin etmek yerine açıklanır (öteleme cümleleri dönüşüm ailesinindir). */
function isVectorRequest(c: Clause, text: string): boolean {
  if (!/\bvektor/.test(text) || c.hasVerb('translate', 'move') || /\b(?:otele|kadar|kaydir)/.test(text) || foreignVerb(c)) return false;
  return !FOREIGN.test(text.replace(/\bvektor\w*/g, ' '));
}
const VECTOR_MESSAGE = 'Bu uygulamada oklu vektör nesnesi yok. Yönlü bir çizim için “A noktasından başlayıp B’den geçen ışın” ya da “AB doğru parçası çiz” yazabilirsiniz; bir şekli vektörle kaydırmak için “ABC’yi AB vektörü kadar ötele” yazın.';
