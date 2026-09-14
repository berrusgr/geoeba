import type { MathObject, ObjectType, Point2D, PointObject } from '@/types/math';
import { type Clause, type LabelRef, type VerbKind, fold } from '../../text';
import { type CommandScene, colorIn, fail, tidy, trNum } from '../../scene';

/**
 * Nokta ve doğru ailesinin ortak yardımcıları: cümleyi nokta başvurularına ayırma, nokta bulma/oluşturma,
 * yerleşim ve Türkçe mesaj biçimleri.
 */

// ---------------------------------------------------------------------------- başka ailelere ait sözcükler

const CONSTRUCTION_WORDS = ['orta ?nokta', 'orta dikme', 'ortadikme', 'orta\\b', 'ortas', 'oran', 'esit parca', 'parcaya', 'bol', 'dikme',
  'dik (?:indir|in|cek|ciz|dogru|isin|cizgi|parca|kesen)', 'dikligi', 'paralel', 'aciortay', 'yukseklik', 'kenarortay', 'agirlik', 'diklik',
  'cevrel', 'ic teget', 'teget', 'teyet', 'kesis', 'kesen', 'merkez'];
const TRANSFORM_WORDS = ['yansi', 'simetri', 'dondur', 'otele', 'homotete', 'goruntu', 'aynala'];
const SHAPE_WORDS = ['ucgen', 'kare(?!li)', 'dikdortgen', 'cokgen', 'dortgen', 'besgen', 'altigen', 'yedigen', 'sekizgen', 'paralelkenar', 'yamuk',
  'deltoid', 'cember', 'daire', 'elips', 'yay(?:i|in|ini|a|lar|lari)?\\b', 'dilim', 'pergel', 'yaricap', 'cap(?:i|li|ini)?\\b'];
const ALGEBRA_WORDS = ['fonksiyon', 'grafi', 'parabol', 'kaydirici', 'surgu', 'parametre', 'yazi(?!m)', 'metin', 'kesir', 'dugme', 'buton',
  'onay kutu', 'isaret kutu', 'girdi kutu', 'giris kutu', 'fdef', 'polinom', 'regresyon'];
const APP_WORDS = ['arac', 'kalem', 'cetvel', 'gonye', 'aciolcer', 'izgara', 'eksen', 'geri al', 'yinele', 'temizle', 'resim', 'gorsel', 'kalinlas',
  'incelt', 'yakinlas', 'uzaklas', 'gorunum'];
const MEASURE_WORDS = ['alan', 'cevre', 'denklem', 'egimini', 'egiminin', 'koordinatlarini', 'koordinatlarinin', 'uzunlugunu', 'uzunlugunun',
  'mesafe', 'uzaklig', 'sinus', 'kosinus', 'tanjant', 'trigonometri'];

const alternation = (words: string[]) => new RegExp(`\\b(?:${words.join('|')})`);
/** Başka bir aileye ait olduğunu gösteren sözcükler (tümü). */
export const FOREIGN = alternation([...CONSTRUCTION_WORDS, ...TRANSFORM_WORDS, ...SHAPE_WORDS, ...ALGEBRA_WORDS, ...APP_WORDS, ...MEASURE_WORDS, 'vektor']);
/** Nesne üzerinde nokta: şekil adları serbest. */
export const FOREIGN_EXCEPT_SHAPES = alternation([...CONSTRUCTION_WORDS, ...TRANSFORM_WORDS, ...ALGEBRA_WORDS, ...APP_WORDS, ...MEASURE_WORDS, 'vektor']);

/** Temel oluşturma cümlesinde bulunmaması gereken fiiller. */
const NOT_OURS: VerbKind[] = ['measure', 'delete', 'hide', 'show', 'color', 'move', 'rename', 'rotate', 'reflect', 'translate', 'scale', 'select',
  'copy', 'undo', 'redo', 'question', 'bind', 'play', 'stop', 'zoom', 'lock', 'unlock'];
/** "yap/olsun" dışındaki açık oluşturma fiilleri: "kırmızı AB doğrusu çiz" oluşturmadır, "AB doğrusunu kırmızı yap" düzenleme. */
export const STRICT_CREATE = /\b(?:ciz(?!g)|olustur|ekle|koy|cek(?!il)|yerlestir|tanimla|getir|birlestir|uret|isaretle|al\b|ist(?:iyor|ey|er\b)|lazim|gerek)/;
export function foreignVerb(c: Clause, allow: VerbKind[] = []): boolean {
  const creating = STRICT_CREATE.test(c.text);
  if (colorIn(c) && !creating) return true;
  return NOT_OURS.some(v => !allow.includes(v) && !(v === 'color' && creating) && c.verbs.has(v));
}
/** Oluşturma cümlesindeki renk ("kırmızı AB doğru parçası çiz"). */
export const creationColor = (c: Clause): string | undefined => colorIn(c);
export const hasLengthBars = (c: Clause) => c.labels.some(l => l.bracket === 'length');

export const ON_OBJECT = /\b(?:uzerinde|uzerine|ustunde|ustune|uzerindeki)\b/;
export const POINT_NOUN = /\bnokta/;
export const SEGMENT_NOUN = /\bdogru parca|\bparca(?:si|sini|yi|lar|lari|larini|sinin|siyla)?\b|\bcizgi/;
export const LINE_NOUN = /\bdogru(?:su|sunu|sunun|suna|yu|nun|ya|lar|lari|larini|larin)?\b(?! parca)/;
export const RAY_NOUN = /\bisin(?:i|in|ini|a|dan|lar|lari|larini)?\b/;
export const ANGLE_NOUN = /\baci(?:si|sini|sinin|nin|yi|ya|dan|lar|lari|larini|larinin)?\b|∠/;

/** "B'ye doğru", "sağa doğru" gibi yön bildiren "doğru" sözcüğünü ad olmaktan çıkarır. */
export function stripTowards(text: string): string {
  return text.replace(/(%\d+(?:ye|ya|e|a|na|ne)|\b(?:saga|sola|yukari(?:ya)?|asagi(?:ya)?|ileri|geri|disari|iceri|sag|sol)) dogru\b(?! parca)/g, '$1 yonunde');
}

// ---------------------------------------------------------------------------- cümle tarama

export type Ref =
  | { kind: 'label'; label: LabelRef; coord?: Point2D; suffix: string; at: number; pronoun?: boolean }
  /** bare: parantezsiz yazılmış ya da söylenmiş sayı çifti ("2 3 noktasına", "0 0 ile 4 3 arasında"). */
  | { kind: 'coord'; coord: Point2D; origin?: boolean; bare?: boolean; suffix: string; at: number };

export interface Scan {
  /** Başvurular "%i" + ek olarak yazılmış katlanmış metin. */
  text: string;
  words: string[];
  refs: Ref[];
  /** "çemberin merkezinden geçen doğru" gibi bir merkez başvurusu çözülemediyse açıklaması. */
  centerProblem?: string;
}

const SUFFIX_WORD = /^(?:n?in|n?un|y?i|y?u|y?e|y?a|n?d[ae]n|t[ae]n|n?d[ae]|t[ae]|y?l[ae]|n[ae])$/;
/**
 * Konuşmada tek başına anlamı olan harf adları ("o", "de", "e"…) ayrıştırıcıda etikete dönüşmez. İyelik ekli "noktası"
 * biçiminden hemen önce geldiklerinde işaret sıfatı olamazlar ("o nokta" denir, "o noktası" denmez): "de noktasından" → D.
 */
const SPOKEN_LETTER: Record<string, string> = { o: 'O', de: 'D', e: 'E', ne: 'N', ye: 'Y', u: 'U' };
/** Ayrıştırıcının küçük harfli etiket sandığı ama yön/ek olan sözcükler. */
const NOT_A_LABEL = /^(?:saga|sola|sag|sol|one|yana|ust|alt|lik|luk|li|lu|lk|ye|ya|da|de)$/;

/** Sayı çiftinden hemen önce gelirse çift koordinat değildir: "eğimi 2 3", "x = 2 3", "1 / 2". */
const NOT_BEFORE_PAIR = /^(?:=|:|\/|bolu|carpi|arti|kere|x|y|egim\w*|uzunlug\w*|boy\w*|olcu\w*|kol\w*|aci\w*|yaricap\w*|kenar\w*|deger\w*|buyuklug\w*)$/;
/** Sayı çiftinden hemen sonra gelirse çift koordinat değildir: birim, sayaç ("3 nokta"), işlem. */
const NOT_AFTER_PAIR = /^(?:birim\w*|br|cm|mm|santim\w*|metre\w*|derece\w*|tane|adet|kez|kere|defa|kat\w*|lik|luk|li|lu|kollu|nokta|noktalar|dogru|isin\w*|aci\w*|parca\w*|cizgi\w*|x|\/|bolu|carpi|arti|yeni|farkli|uzunlug\w*|boy\w*)$/;
const NUMBER_TOKEN = /^#\d+$/;

function signedAt(c: Clause, source: string[], i: number): { value: number; next: number } | undefined {
  if (NUMBER_TOKEN.test(source[i] ?? '')) return { value: c.num(source[i]), next: i + 1 };
  if (source[i] === 'eksi' && NUMBER_TOKEN.test(source[i + 1] ?? '')) return { value: -c.num(source[i + 1]), next: i + 2 };
  if (source[i] === 'eksi' && source[i + 1] === 'bir') return { value: -1, next: i + 2 };
  return undefined;
}

/** Parantezsiz sayı çifti: "2 3", "-2, 3", "eksi iki üç". Üç ya da daha çok sayı art arda geliyorsa belirsizdir (çift sayılmaz). */
function barePair(c: Clause, source: string[], i: number): { coord: Point2D; next: number } | undefined {
  const first = signedAt(c, source, i);
  if (!first) return undefined;
  const prev = source[i - 1] ?? '';
  if (NUMBER_TOKEN.test(prev) || (prev === ',' && NUMBER_TOKEN.test(source[i - 2] ?? '')) || NOT_BEFORE_PAIR.test(prev)) return undefined;
  let j = first.next;
  if (source[j] === ',') j++;
  const second = signedAt(c, source, j);
  if (!second) return undefined;
  const after = source[second.next] ?? '';
  if (signedAt(c, source, second.next) || (after === ',' && signedAt(c, source, second.next + 1)) || NOT_AFTER_PAIR.test(after)) return undefined;
  return { coord: { x: first.value, y: second.value }, next: second.next };
}

/** "onu, ondan, bunu…" ya da "seçili nokta" ile gösterilen TEK nokta (önceki cümlenin nesnesi ya da seçim). */
export function pointedPoint(scene: CommandScene, preferSelection: boolean): PointObject | undefined {
  for (const ids of preferSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection]) {
    const objects = ids.map(id => scene.get(id)).filter((o): o is MathObject => !!o);
    if (!objects.length) continue;
    const points = objects.filter((o): o is PointObject => o.type === 'point');
    if (preferSelection) return points.length === 1 ? points[0] : undefined;
    return objects.length === 1 && points.length === 1 ? points[0] : undefined;
  }
  return undefined;
}
const PRONOUN = /^(?:o|bu)(nu|na|nun|ndan|nda|nunla|nla)$/;
const SELECTED_WORD = /^(?:secili|secilen|secilmis|sectigim|sectigin|sectiginiz|isaretli)$/;

const CENTER_WORD = /^merkez(i|in|inin|inden|den|ine|e|inde|de|ini)?$/;
const CENTER_SUFFIX: Record<string, string> = { '': '', i: 'i', in: 'nin', inin: 'nin', inden: 'nden', den: 'den', ine: 'ne', e: 'e', inde: 'nde', de: 'de', ini: 'ni' };
const CENTER_SHAPE = /^(?:cember|daire|elips|yay|dilim)\w*$/;
const CENTER_LEAD = /^(?:ve|bir|simdi|lutfen|sonra|tamam|evet)$/;

/**
 * "çemberin merkezinden", "O çemberinin merkezine", "(çember çiz ve) merkezinden": merkez noktasının adıyla değiştirilir.
 * Üçgen merkezleri ("ağırlık merkezi") inşa ailesinindir; yalnızca çember/elips/yay/dilim merkezleri ya da adsız "merkez" çözülür.
 */
function replaceCenters(c: Clause, scene: CommandScene, source: string[]): { source: string[]; problem?: string } {
  const out = [...source];
  let problem: string | undefined;
  for (let i = out.length - 1; i >= 0; i--) {
    const m = out[i].match(CENTER_WORD);
    if (!m) continue;
    let start = i;
    let shapeWord = '';
    let name: LabelRef | undefined;
    if (CENTER_SHAPE.test(out[i - 1] ?? '')) {
      start = i - 1;
      shapeWord = out[i - 1];
      if (out[i - 2] === 'daire' && /^dilim/.test(shapeWord)) { start = i - 2; shapeWord = 'dilim'; }
      const labelToken = (out[start - 1] ?? '').match(/^\$(\d+)$/);
      if (labelToken) { name = c.labels[Number(labelToken[1])]; start -= 1; }
    } else if (/^(?:onun|bunun)$/.test(out[i - 1] ?? '')) start = i - 1;
    else if (i > 0 && !CENTER_LEAD.test(out[i - 1])) continue;
    const types: ObjectType[] = /^elips/.test(shapeWord) ? ['ellipse'] : /^yay/.test(shapeWord) ? ['arc'] : /^dilim/.test(shapeWord) ? ['sector']
      : /^daire/.test(shapeWord) ? ['circle', 'sector'] : /^cember/.test(shapeWord) ? ['circle'] : ['circle', 'ellipse', 'arc', 'sector'];
    const ok = (o: MathObject | undefined): o is MathObject => !!o && types.includes(o.type);
    let candidates: MathObject[] = name ? scene.resolveLabel(name, types) : [];
    if (!name) {
      for (const ids of c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection]) {
        const list = ids.map(id => scene.get(id)).filter(ok);
        if (list.length) { candidates = list; break; }
      }
      if (!candidates.length) candidates = scene.objects.filter(ok);
    }
    const noun = shapeWord ? { circle: 'çember', ellipse: 'elips', arc: 'yay', sector: 'daire dilimi' }[types[0] as 'circle'] ?? 'çember' : 'çember';
    if (candidates.length !== 1) {
      problem = candidates.length
        ? `Birden fazla ${noun} var; hangisinin merkezini kastettiğinizi adıyla yazın (ör. “O merkezli çemberin merkezinden geçen doğru”) ya da önce ${noun}i seçin.`
        : name ? `${name.text} adlı ${noun} bulunamadı.` : `Merkezi alınacak bir ${noun} yok. Önce bir ${noun} çizin (ör. “yarıçapı 3 olan çember çiz”).`;
      continue;
    }
    const shape = candidates[0] as MathObject & { centerPointId?: string };
    const center = shape.centerPointId ? scene.get(shape.centerPointId) : undefined;
    if (!center || center.type !== 'point') {
      problem = `${shape.label} için merkez noktası yok (üç noktadan geçen çemberin merkezi ayrı bir nokta değildir). Önce “${shape.label} merkezini bul” yazın.`;
      continue;
    }
    out.splice(start, i - start + 1, `&${center.id}|${CENTER_SUFFIX[m[1] ?? '']}`);
  }
  return { source: out, problem };
}

/**
 * Cümledeki nokta başvurularını (etiket, koordinat, orijin) sırasıyla çıkarır.
 * Sahne verilirse zamirler ("onu", "ondan"), "seçili nokta" ve çember merkezleri de nokta başvurusuna dönüşür.
 */
export function scan(c: Clause, scene?: CommandScene): Scan {
  const replaced = scene ? replaceCenters(c, scene, c.text.split(' ').filter(Boolean)) : undefined;
  const source = replaced?.source ?? c.text.split(' ').filter(Boolean);
  const words: string[] = [];
  const refs: Ref[] = [];
  const nextSuffix = (i: number) => (source[i + 1] && SUFFIX_WORD.test(source[i + 1]) ? source[i + 1] : '');
  const pushLabel = (text: string, suffix: string, pronoun = false) => {
    refs.push({ kind: 'label', label: { text, suffix }, suffix, at: words.length, ...(pronoun ? { pronoun } : {}) });
    words.push(`%${refs.length - 1}${suffix}`);
  };
  for (let i = 0; i < source.length; i++) {
    const w = source[i];
    const centerToken = w.match(/^&([^|]+)\|([a-z]*)$/);
    if (centerToken && scene) {
      const center = scene.get(centerToken[1]);
      if (center?.type === 'point') { pushLabel(center.label, centerToken[2]); continue; }
    }
    if (scene) {
      const pronoun = w.match(PRONOUN);
      const pointed = pronoun ? pointedPoint(scene, c.refersToSelection) : undefined;
      if (pronoun && pointed) { pushLabel(pointed.label, pronoun[1], true); continue; }
      const noun = source[i + 1] ?? '';
      const demonstrative = /^(?:o|bu|su)$/.test(w) && /^nokta(?!s|lar)[a-z]*$/.test(noun);
      if ((SELECTED_WORD.test(w) && /^nokta(?!lar)[a-z]*$/.test(noun)) || demonstrative) {
        const selected = pointedPoint(scene, SELECTED_WORD.test(w));
        if (selected) { pushLabel(selected.label, noun.replace(/^nokta(?:s(?=i))?/, ''), true); i++; continue; }
      }
    }
    if (w === 'koordinat' && /^baslangic(?:i|ina|inda|indan|indaki)?$/.test(source[i + 1] ?? '')) {
      const suffix = source[i + 1].replace(/^baslangici?/, '').replace(/^n?/, 'n').replace(/^n$/, '');
      refs.push({ kind: 'coord', coord: { x: 0, y: 0 }, origin: true, suffix, at: words.length });
      words.push(`%${refs.length - 1}${suffix}`);
      i++;
      continue;
    }
    if (w === 'baslangic' && /^noktas(?:ina|inda)$/.test(source[i + 1] ?? '') && !/\bisin|\bbasla(?!ngic)/.test(c.text)) {
      const suffix = source[i + 1].replace(/^noktasi/, '');
      refs.push({ kind: 'coord', coord: { x: 0, y: 0 }, origin: true, suffix, at: words.length });
      words.push(`%${refs.length - 1}${suffix}`);
      i++;
      continue;
    }
    const pair = barePair(c, source, i);
    if (pair) {
      i = pair.next - 1;
      const suffix = nextSuffix(i);
      if (suffix) i++;
      const previous = refs[refs.length - 1];
      if (previous?.kind === 'label' && previous.at === words.length - 1 && !previous.suffix && !previous.coord && !suffix && !previous.pronoun) {
        previous.coord = pair.coord;
        continue;
      }
      refs.push({ kind: 'coord', coord: pair.coord, bare: true, suffix, at: words.length });
      words.push(`%${refs.length - 1}${suffix}`);
      continue;
    }
    const labelMatch = w.match(/^\$(\d+)([a-z]*)$/);
    if (labelMatch) {
      const label = c.labels[Number(labelMatch[1])];
      const plain = fold(label.text).replace(/'/g, '');
      if (label.lowercase && !label.bracket && NOT_A_LABEL.test(plain + labelMatch[2])) { words.push(plain + labelMatch[2]); continue; }
      let suffix = labelMatch[2];
      let coord: Point2D | undefined;
      if (!suffix && /^@\d+$/.test(source[i + 1] ?? '')) { coord = c.coords[Number(source[i + 1].slice(1))]; i++; }
      if (!suffix) { const s = nextSuffix(i); if (s) { suffix = s; i++; } }
      refs.push({ kind: 'label', label, coord, suffix, at: words.length });
      words.push(`%${refs.length - 1}${suffix}`);
      continue;
    }
    const coordMatch = w.match(/^@(\d+)$/);
    if (coordMatch) {
      const suffix = nextSuffix(i);
      if (suffix) i++;
      refs.push({ kind: 'coord', coord: c.coords[Number(coordMatch[1])], suffix, at: words.length });
      words.push(`%${refs.length - 1}${suffix}`);
      continue;
    }
    const origin = w.match(/^(?:orijin|orjin|origin)([a-z]*)$/);
    if (origin) {
      refs.push({ kind: 'coord', coord: { x: 0, y: 0 }, origin: true, suffix: origin[1], at: words.length });
      words.push(`%${refs.length - 1}${origin[1]}`);
      continue;
    }
    // "O" tek harfi durak sözcüğü sayıldığı için etikete dönüşmez: "O noktası", "orijine O noktası koy"
    if (w === 'o' && /^nokta/.test(source[i + 1] ?? '') && /(?:^|[^\p{L}'’])O(?=\s|$|['’])/u.test(c.raw)) {
      refs.push({ kind: 'label', label: { text: 'O', suffix: '' }, suffix: '', at: words.length });
      words.push(`%${refs.length - 1}`);
      continue;
    }
    const previousRef = refs[refs.length - 1];
    const afterLabel = previousRef?.kind === 'label' && previousRef.at === words.length - 1;
    if (SPOKEN_LETTER[w] && /^noktas/.test(source[i + 1] ?? '') && !afterLabel) {
      refs.push({ kind: 'label', label: { text: SPOKEN_LETTER[w], suffix: '' }, suffix: '', at: words.length });
      words.push(`%${refs.length - 1}`);
      continue;
    }
    words.push(w);
  }
  const text = words.join(' ');
  return { text, words: text.split(' '), refs, ...(replaced?.problem ? { centerProblem: replaced.problem } : {}) };
}

// ---------------------------------------------------------------------------- kullanılmayan sayılar

const SIGNED_G = '(?:eksi )?(?:#\\d+|bir\\b)';
/** Temel ailenin sayıyı kullandığı kalıplar (koordinat, uzunluk, açı, eğim, sayaç…). */
const NUMBER_USES: RegExp[] = [
  new RegExp(`\\bkoordinat\\w* ${SIGNED_G} (?:ve |, |ile )?${SIGNED_G}`, 'g'),
  new RegExp(`\\bx (?:koordinati |degeri |i )?(?:= |: |esittir )?${SIGNED_G} (?:, )?(?:ve )?y (?:koordinati |degeri |si )?(?:= |: |esittir )?${SIGNED_G}`, 'g'),
  new RegExp(`\\bapsis\\w* ${SIGNED_G} (?:, )?(?:ve )?ordinat\\w* ${SIGNED_G}`, 'g'),
  new RegExp(`(?<!#\\d+ )${SIGNED_G} (?:ve |, |ile )?${SIGNED_G} koordinat`, 'g'),
  new RegExp(`%\\d+ ${SIGNED_G} (?:, |ve )?${SIGNED_G} nokta`, 'g'),
  new RegExp(`%\\d+ nokta(?!lar)\\w* ${SIGNED_G} (?:, |ve )?${SIGNED_G}(?= (?:koordinat|konum|olsun|yerine)|$)`, 'g'),
  new RegExp(`(?:^| )[a-wz] ${SIGNED_G} (?:, |ve )?${SIGNED_G} nokta`, 'g'),
  new RegExp(`\\b(?:uzunlug|boy|olcu|buyuklug|acisi|egim|kol|yaricap|x|y|apsis|ordinat|deger)\\w*(?: uzunlugu)? ?(?:= |: |esittir |esit |olarak |ise )?${SIGNED_G}(?: \\/ #\\d+)?`, 'g'),
  new RegExp(`(?:bir )?${SIGNED_G}(?: \\/ #\\d+)? ?(?:(?:tane|adet|yeni|farkli|yatay|dikey|dusey) )*(?:birim|br\\b|cm\\b|mm\\b|santim|metre|derece|tane\\b|adet\\b|kez\\b|kere\\b|defa\\b|kat\\b|lik\\b|luk\\b|kollu|uzunlug|boy|yonlu|egimli|nokta|dogru|isin|aci|parca|kirik|cizgi|yeni\\b|farkli\\b)`, 'g'),
];

/** Metinde hiçbir kalıba uymayan sayılar ("A noktasını 2 3 4 koordinatına koy" → 2): sessizce yok sayılmaz. */
export function unusedNumbers(c: Clause, s: Scan, extra: RegExp[] = []): number[] {
  let t = ` ${s.text} `;
  for (const re of [...extra, ...NUMBER_USES]) t = t.replace(re, ' ');
  return [...t.matchAll(/#(\d+)/g)].map(m => c.num(`#${m[1]}`));
}

/** Kullanılmayan sayı varsa açıklamayla durur. */
export function assertNumbersUsed(c: Clause, s: Scan, example: string, extra: RegExp[] = []) {
  const left = unusedNumbers(c, s, extra);
  if (!left.length) return;
  const list = listTr(left.map(n => trNum(n)));
  fail(`${list} ${left.length > 1 ? 'sayılarını' : 'sayısını'} nasıl kullanacağımı anlayamadım. Koordinatları parantezle yazın (ör. “A(2; 3) noktası”), uzunluk ve açıyı birimiyle yazın (ör. ${example}).`);
}

/** "iki doğru çiz", "3 tane ışın": adsız oluşturma sayısı (yoksa 1). */
export function creationCount(c: Clause, s: Scan, noun: RegExp, max = 10): number {
  const m = s.text.match(new RegExp(`(?:^| )(#\\d+) (?:tane |adet )?(?:yeni |farkli )?(?:(?:#\\d+ (?:birim|br|cm)\\w* |#\\d+ derece\\w* |yatay |dikey )?)(?:${noun.source})`));
  if (!m) return 1;
  const n = c.num(m[1]);
  if (!Number.isInteger(n) || n < 1) fail('Kaç tane çizileceğini pozitif bir tam sayıyla yazın.');
  if (n > max) fail(`Tek seferde en fazla ${max} tane çizebilirim.`);
  return n;
}

/** Aynı adsız nesneyi n kez oluşturur; tek tek mesajlar yerine özet yazar ve hepsini seçer. */
export function repeatCreate(scene: CommandScene, n: number, noun: string, draw: () => string) {
  const before = scene.messages.length;
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push(draw());
  scene.messages.splice(before);
  scene.setFocus(ids);
  scene.say(`${n} ${noun} çizildi: ${listTr(ids.map(id => scene.get(id)?.label ?? ''))}. Konumları belirtilmediği için boş yerlere kondu; noktaları sürükleyerek değiştirebilirsiniz.`);
}

export const refIndex = (s: Scan, ref: Ref) => s.refs.indexOf(ref);
/** Başvurudan sonraki sözcükler (başvurunun kendisi hariç). */
export function after(s: Scan, ref: Ref, count = 2): string {
  return s.words.slice(ref.at + 1, ref.at + 1 + count).join(' ');
}
export function before(s: Scan, ref: Ref, count = 2): string {
  return s.words.slice(Math.max(0, ref.at - count), ref.at).join(' ');
}
export const isFromSuffix = (suffix: string) => /^(?:n?d[ae]n|t[ae]n)$/.test(suffix);
export const isToSuffix = (suffix: string) => /^(?:y?[ae]|n[ae])$/.test(suffix);

// ---------------------------------------------------------------------------- sayılar

/** Sayı başvurusu: "#3" → değer. */
export const numAt = (c: Clause, ref: string) => c.num(ref);

/**
 * İşaretli sayı yakalayan düzenli ifade parçası (tek yakalama grubu): "#3", "eksi #3", "eksi bir".
 * Konuşmada eksi işareti sözle gelir; "eksi bir"deki "bir" ayrıştırıcıda tanımlık sayılıp sayıya dönüşmez.
 */
export const SIGNED = '((?:eksi )?(?:#\\d+|bir\\b))';
/** SIGNED gibi, ama tek başına tanımlık "bir"i sayı saymaz ("bir eğimli doğru"). */
export const SIGNED_STRICT = '((?:eksi )?#\\d+|eksi bir\\b)';
export function signedValue(c: Clause, token: string): number {
  const negative = token.startsWith('eksi ');
  const core = negative ? token.slice(5) : token;
  const value = core === 'bir' ? 1 : c.num(core);
  return negative ? -value : value;
}

/** "5 birimlik", "uzunluğu 5 cm", "5 br uzunluğunda" */
export function lengthIn(c: Clause, s: Scan): { value: number; unit?: 'cm' | 'br'; ref: string } | undefined {
  const t = s.text;
  const unitOf = (u?: string) => (u ? (/^(?:cm|santim)/.test(u) ? 'cm' as const : 'br' as const) : undefined);
  let m = t.match(/(#\d+) (birim|br|cm|santim)\w*(?: (?:uzunlugunda|boyunda|uzunlugundaki|boyundaki))?/);
  if (m) return { value: c.num(m[1]), unit: unitOf(m[2]), ref: m[1] };
  m = t.match(/\b(?:uzunlugu|uzunlugunda|boyu|boyunda|uzunluk)\w* (?:= |: )?(#\d+)(?: (birim|br|cm|santim)\w*)?/);
  if (m) return { value: c.num(m[1]), unit: unitOf(m[2]) ?? 'br', ref: m[1] };
  m = t.match(/(#\d+) (?:uzunlugunda|boyunda)/);
  if (m) return { value: c.num(m[1]), unit: 'br', ref: m[1] };
  m = t.match(/(#\d+) (?:lik|luk)\b/);
  if (m && !/derece/.test(t)) return { value: c.num(m[1]), unit: 'br', ref: m[1] };
  return undefined;
}

export function checkLength(value: number): number {
  if (!Number.isFinite(value) || value <= 0) fail('Uzunluk sıfırdan büyük olmalı.');
  if (value > 10000) fail('Uzunluk 10000 birimden küçük olmalı.');
  return value;
}

/** "30 derece", "30°", "30 derecelik", "ölçüsü 30" */
export function degreesIn(c: Clause, s: Scan): number | undefined {
  const t = s.text;
  let m = t.match(/(#\d+) derece/);
  if (m) return c.num(m[1]);
  m = t.match(/\b(?:olcusu|olculu|buyuklugu|acisi) (?:= |: )?(#\d+)/);
  if (m) return c.num(m[1]);
  m = t.match(/(#\d+) (?:lik|luk) aci/);
  if (m) return c.num(m[1]);
  return undefined;
}

/** Yön sözcükleri → radyan (x ekseninden saat yönünün tersine). */
export function directionWord(text: string): { angle: number; name: string } | undefined {
  if (/\bsag(?:a|dan)?\b/.test(text)) return { angle: 0, name: 'sağa' };
  if (/\bsol(?:a|dan)?\b/.test(text)) return { angle: Math.PI, name: 'sola' };
  if (/\byukari\w*|\bdikey\w*|\bdusey\w*/.test(text)) return { angle: Math.PI / 2, name: 'yukarı' };
  if (/\basagi\w*/.test(text)) return { angle: -Math.PI / 2, name: 'aşağı' };
  if (/\byatay\w*/.test(text)) return { angle: 0, name: 'sağa' };
  return undefined;
}

// ---------------------------------------------------------------------------- noktalar

export const EPS = 1e-9;
export function pointAt(scene: CommandScene, p: Point2D): PointObject | undefined {
  return scene.points().find(q => Math.abs(q.x - p.x) < EPS && Math.abs(q.y - p.y) < EPS);
}
export const coordText = (p: Point2D) => `(${trNum(p.x)}; ${trNum(p.y)})`;
export const named = (p: PointObject) => `${p.label}${coordText(p)}`;
export function listTr(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`;
}
export const add = (a: Point2D, b: Point2D): Point2D => ({ x: tidy(a.x + b.x), y: tidy(a.y + b.y) });
export const polar = (length: number, angle: number): Point2D => ({ x: tidy(length * Math.cos(angle)), y: tidy(length * Math.sin(angle)) });
export const round4 = (p: Point2D): Point2D => ({ x: Number(p.x.toFixed(4)), y: Number(p.y.toFixed(4)) });

/** Bir noktayı gösteren yazım: ad, koordinat ya da ikisi birden. */
export type Spec = { label?: string; coord?: Point2D; ref?: Ref };

/** Etiketi n tane nokta adına böler: önce sahnedeki noktalar ("A_1B"), yoksa yeni adlar ("PQ" → P, Q). */
export function labelParts(scene: CommandScene, text: string, n?: number): string[] | null {
  const existing = scene.pointsFromLabel(text);
  if (existing && (n === undefined || existing.length === n)) return existing.map(p => p.label);
  const parts = scene.splitNewLabels(text);
  if (parts && (n === undefined || parts.length === n)) {
    return parts.map(part => scene.findPoint(part)?.label ?? part);
  }
  return null;
}

/** Başvuruları nokta yazımlarına açar: "AB" → A, B; "A(1;2)" → ad + koordinat; "(1;2)" → koordinat. */
export function expandRefs(scene: CommandScene, refs: Ref[]): Spec[] {
  const out: Spec[] = [];
  for (const ref of refs) {
    if (ref.kind === 'coord') { out.push({ coord: ref.coord, ref }); continue; }
    const text = ref.label.text;
    if (ref.coord) { out.push({ label: text, coord: ref.coord, ref }); continue; }
    if (scene.findPoint(text)) { out.push({ label: scene.findPoint(text)!.label, ref }); continue; }
    const parts = labelParts(scene, text);
    if (parts && parts.length > 1) parts.forEach(label => out.push({ label, ref }));
    else out.push({ label: text, ref });
  }
  return out;
}

export function specText(spec: Spec): string {
  return spec.label ? spec.label + (spec.coord ? coordText(spec.coord) : '') : spec.coord ? coordText(spec.coord) : 'nokta';
}

/** Yazımın sahnedeki karşılığı (oluşturmadan). */
export function existingOf(scene: CommandScene, spec: Spec): PointObject | undefined {
  if (spec.label) {
    const found = scene.findPoint(spec.label);
    if (found && spec.coord && (Math.abs(found.x - spec.coord.x) > EPS || Math.abs(found.y - spec.coord.y) > EPS)) {
      fail(`${found.label} noktası zaten ${coordText(found)} konumunda. Taşımak için “${found.label} = ${coordText(spec.coord)}” yazın ya da başka bir ad kullanın.`);
    }
    return found;
  }
  return spec.coord ? pointAt(scene, spec.coord) : undefined;
}

/** Yazımın noktası: varsa o, yoksa verilen (ya da hesaplanan) konumda yeni nokta. */
export function materialize(scene: CommandScene, spec: Spec, position?: () => Point2D, color?: string): PointObject {
  const existing = existingOf(scene, spec);
  if (existing) return existing;
  if (spec.label && scene.splitNewLabels(spec.label) && scene.splitNewLabels(spec.label)!.length > 1 && !spec.coord) {
    fail(`${spec.label} tek bir nokta adı gibi görünmüyor. Noktaları ayrı yazın (ör. “A ve B noktaları”).`);
  }
  const at = spec.coord ?? position?.();
  if (!at) fail(`${spec.label ?? 'Nokta'} noktası bulunamadı. Önce noktayı oluşturun (ör. “${spec.label ?? 'A'}(2; 3) noktası”).`);
  return scene.addPoint(at, { label: spec.label, color });
}

export function isFree(scene: CommandScene, p: Point2D, tolerance = 0.75): boolean {
  return !scene.points().some(q => Math.hypot(q.x - p.x, q.y - p.y) < tolerance);
}

/**
 * Göreli konumları verilen nokta grubu için taban noktası: mevcut çizimin yanına, noktalar üst üste binmeden.
 * Boş sahnede grup görünüm merkezine ortalanır.
 */
export function placeGroup(scene: CommandScene, offsets: Point2D[]): Point2D {
  const xs = offsets.map(o => o.x), ys = offsets.map(o => o.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const center = scene.placeShape(Math.max(maxX - minX, 1), Math.max(maxY - minY, 1));
  const base = { x: Math.round(center.x - (minX + maxX) / 2), y: Math.round(center.y - (minY + maxY) / 2) };
  for (let r = 0; r <= 12; r++) {
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const candidate = { x: base.x + dx, y: base.y + dy };
      if (offsets.every(o => isFree(scene, add(candidate, o)))) return candidate;
    }
  }
  return base;
}

/** from noktasına göre ilk boş göreli konum. */
export function freeNear(scene: CommandScene, from: Point2D, offsets: Point2D[]): Point2D {
  const spot = offsets.map(o => add(from, o)).find(p => isFree(scene, p));
  return spot ?? add(from, offsets[0]);
}

/** Birden çok yeni nokta için görünüm merkezine yakın, birbirinden en az 1,5 birim uzak konum. */
export function spacedSpot(scene: CommandScene): Point2D {
  const c = scene.viewCenter();
  for (let r = 0; r <= 10; r++) {
    for (let dy = r; dy >= -r; dy--) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const p = { x: c.x + 2 * dx, y: c.y + 2 * dy };
      if (isFree(scene, p, 1.5)) return p;
    }
  }
  return scene.freeSpot();
}

/** Görünür alanda (yoksa −7…7 × −4…4) boş, rastgele bir tam sayı konumu. */
export function randomSpot(scene: CommandScene): Point2D {
  const b = scene.viewBounds();
  const minX = b ? Math.ceil(b.minX + 1) : -7, maxX = b ? Math.floor(b.maxX - 1) : 7;
  const minY = b ? Math.ceil(b.minY + 1) : -4, maxY = b ? Math.floor(b.maxY - 1) : 4;
  for (let i = 0; i < 60; i++) {
    const p = { x: minX + Math.floor(Math.random() * (maxX - minX + 1)), y: minY + Math.floor(Math.random() * (maxY - minY + 1)) };
    if (isFree(scene, p)) return p;
  }
  return scene.freeSpot();
}

/** Bu cümlede oluşturulan noktaların kısa listesi: "A(0; 0) ve B(4; 0)". */
export function createdPoints(scene: CommandScene, exclude: string[] = []): PointObject[] {
  return scene.clauseCreated.map(id => scene.get(id)).filter((o): o is PointObject => o?.type === 'point' && !exclude.includes(o.id));
}
export function pointsNote(scene: CommandScene, exclude: string[] = []): string {
  const pts = createdPoints(scene, exclude);
  if (!pts.length) return '';
  return pts.length === 1 ? ` ${named(pts[0])} noktası da oluşturuldu.` : ` ${listTr(pts.map(named))} noktaları da oluşturuldu.`;
}

export function angleDegrees(p1: Point2D, vertex: Point2D, p3: Point2D): number {
  const a = Math.atan2(p1.y - vertex.y, p1.x - vertex.x), b = Math.atan2(p3.y - vertex.y, p3.x - vertex.x);
  let d = Math.abs(a - b) * 180 / Math.PI;
  if (d > 180) d = 360 - d;
  return d;
}

export function lineEquation(a: Point2D, b: Point2D): string {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) < 1e-9) return `x = ${trNum(a.x)}`;
  const m = dy / dx, n = a.y - m * a.x;
  if (Math.abs(m) < 1e-9) return `y = ${trNum(n)}`;
  const mText = Math.abs(m - 1) < 1e-9 ? '' : Math.abs(m + 1) < 1e-9 ? '-' : trNum(m);
  return `y = ${mText}x${Math.abs(n) < 1e-9 ? '' : n > 0 ? ` + ${trNum(n)}` : ` - ${trNum(-n)}`}`;
}

export type { MathObject };
