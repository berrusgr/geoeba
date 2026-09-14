import type { MathObject, Point2D } from '@/types/math';
import { type Clause, type VerbKind, detectVerbs, fold, NOUNS } from '../../text';
import { type CommandScene, colorIn, fail } from '../../scene';

/**
 * Çokgen ailesi için cümle çözümlemesi.
 *
 * Çözümleyici, text.ts'nin yer tutuculu metnini ("#0", "@0", "$0") şekil diline göre sadeleştirir:
 *   - birimler atılır ("5 cm" → "#0"), derece yazılmış sayılar işaretlenir ("60 derece" → "#2d"),
 *   - "=" / ":" boşluk olur ("AB = 3" → "$0 #0"),
 *   - sözcük olduğu anlaşılan küçük harfli "etiketler" geri sözcüğe çevrilir ("yan kenarları" → YAN etiketi değil).
 * Başka ailelerin cümleleri (ölçüm, düzenleme, inşa, dönüşüm…) burada elenir.
 */

export type ShapeKind = 'triangle' | 'square' | 'rectangle' | 'regular' | 'parallelogram' | 'rhombus' | 'trapezoid' | 'kite' | 'quad' | 'polygon';

export interface Analysis {
  shape: ShapeKind;
  /** Sadeleştirilmiş metin */
  t: string;
  /** Güçlü oluşturma fiili (çiz, oluştur, ekle, istiyorum…) */
  strongCreate: boolean;
  /** Yalnızca "olsun" / "yap" gibi zayıf fiil */
  weakOnly: boolean;
  /** "olsun" geçiyor */
  olsun: boolean;
  /** Mevcut üçgenin kenarlarını değiştirme kalıbı ("üçgenin kenarları 3, 4, 5 olsun") */
  modifyForm: boolean;
  /** "2 tane üçgen çiz" */
  count: number;
  /** Cümlede sayı, koordinat ya da etiket var */
  hasParams: boolean;
  /** Adı yazılmadan noktalara atıf: "bu noktalardan", "onları birleştirerek", "bu üç noktayı" */
  pointRef: boolean;
}

/** Adı yazılmamış noktalara atıf (sadeleştirilmiş metinde). Etiketler yazılmışsa adlar önceliklidir. */
export const POINT_REF = /\b(?:bu|su|o|secili|secilen|secilmis|sectigim|olusturdugum|cizdigim|son) (?:#\d+ )?nokta(?:lar)?\w*|\b(?:onlar|bunlar|sunlar)\w*|\bnokta(?:lar)?(?:i|yi|dan|la|iyla)? (?:birlestir|kullan)\w*|\bnoktalar(?:dan|la|iyla)\b/;

/** Küçük/büyük harfle yazılmış ama etiket değil, sözcük olan kısa kelimeler. */
const WORDISH = new Set(['yan', 'tepe', 'taban', 'uzun', 'kisa', 'ust', 'alt', 'dar', 'genis', 'esit', 'ic', 'dis', 'kose', 'bir', 'iki', 'uc', 'dik',
  'ciz', 'cizin', 'yap', 'ekle', 'kur', 'koy', 'olustur', 'kare', 'ucgen', 'sol', 'sag', 'orta', 'tam', 'ayni', 'her', 'tum']);

/** Konuşma tanımanın ayırdığı birleşik adların ilk parçası; text.ts bunları küçük harfli etiket sanabilir ("ikiz kenar", "eş kenar"). */
const SPLIT_WORDS = new Set(['ikiz', 'es', 'esit']);

/**
 * Şekil adı olmadan mevcut üçgeni değiştirme: "ABC'nin kenarları 6, 8, 10 olsun", "kenarları 5 5 5 olsun" (tek/odaktaki üçgen).
 * Yalnızca üç ölçü ve "olsun/yap" varsa; etiket verilmişse bir üçgene karşılık gelmeli.
 */
const IMPLICIT_TRIANGLE_EDIT = /^ (?:(?:simdi|tamam|evet|sey|lutfen|hadi|peki) )*(?:\$(\d+)(?:nin|in|un|nun) )?(?:kenar(?:lari)?|acilari) #\d+d? (?:(?:,|ve|ile) )?#\d+d? (?:(?:,|ve|ile) )?#\d+d? (?:olsun|olacak|yap)(?: (?:lutfen|tamam))? $/;

function implicitTriangleEdit(t: string, c: Clause, scene: CommandScene): 'edit' | 'create' | null {
  const m = t.match(IMPLICIT_TRIANGLE_EDIT);
  if (!m) return null;
  if (m[1] !== undefined) {
    const label = c.labels[Number(m[1])];
    return label && scene.resolveLabel(label, ['polygon']).some(isTriangle) ? 'edit' : null;
  }
  if (scene.objects.some(isTriangle)) return 'edit';
  // Hiç çokgen yokken "kenarları 3 4 5 olsun": üç ölçü yalnızca bir üçgene uyar, yeni üçgen çizilir.
  return scene.objects.some(o => o.type === 'polygon') ? null : 'create';
}

const STRONG_CREATE =/\b(?:ciz(?!g|im)|olustur|ekle|koy|kur(?!al)|cek(?!il)|yerlestir|tanimla|ist(?:iyor|ey|er\b|e(?!m))|lazim|gerek|getir|uret|insa)/;
const WEAK_CREATE = /\b(?:yap(?!istir|i\b)|olsun|olustursun|olacak)/;

const FOREIGN_VERBS: VerbKind[] = ['measure', 'delete', 'hide', 'show', 'move', 'rename', 'rotate', 'reflect', 'translate', 'scale', 'select', 'copy',
  'undo', 'redo', 'question', 'bind', 'play', 'stop', 'zoom', 'lock', 'unlock'];

/** Başka ailelere ait ilişki/işlem sözcükleri. */
const RELATION = /\b(?:kenarortay|aciortay|orta ?dikme|orta ?nokta|agirlik merkez|diklik merkez|cevrel|ic ?teget|teget|kesisim|kesis|paralel(?!kenar)|dikme|dik indir|simetri|yansi|goruntu|oteleme|donme|kopya|arac|pencere|diyalog|fonksiyon|grafi[gk]|parabol|kaydirici|surgu|parametre|icine|icinde|disina|disinda|etrafina|cevresine|koselerini|kosegenlerini|kosegenini|yuksekliklerini|yuksekligini|alanini|cevresini|acilarini|kenarlarini goster|etiket|dolgu|seffaf|gorunmez|kalinlig)/;

/** Şekil adlarının ilgi/yönelme/bulunma/ayrılma/vasıta/çoğul biçimleri: var olan bir şekle atıf. */
const SHAPE_STEM = '(?:ucgen|kare|dikdortgen|cokgen|dortgen|paralelkenar|yamu[gk]|deltoid|besgen|altigen|yedigen|sekizgen|dokuzgen|ongen|onikigen)';
const OBLIQUE = new RegExp(`\\b${SHAPE_STEM}(?:in|un|nin|nun|inin|unun|sinin|e|a|ye|ya|ine|una|sine|de|da|te|ta|inde|unda|sinde|den|dan|ten|tan|inden|undan|sinden|le|la|yle|yla|iyle|uyla|ler\\w*|lar\\w*)\\b`);
const TRIANGLE_GENITIVE = /\bucgen(?:in|inin)\b|\$\d+(?:nin|in)\b/;

const NGON_WORDS: Record<string, number> = {
  besgen: 5, altigen: 6, yedigen: 7, sekizgen: 8, dokuzgen: 9, ongen: 10, onbirgen: 11, onikigen: 12, onucgen: 13, ondortgen: 14,
  onbesgen: 15, onaltigen: 16, onsekizgen: 18, yirmigen: 20,
};
export const NGON_RE = new RegExp(`\\b(${Object.keys(NGON_WORDS).join('|')})(?:i|ini|in|e)?\\b`);
export function ngonWord(t: string): number | undefined {
  const m = t.match(NGON_RE);
  return m ? NGON_WORDS[m[1]] : undefined;
}

const cache = new WeakMap<Clause, { key: string; value: Analysis | null }>();

/** Yer tutuculu metni şekil diline indirger. */
export function simplify(c: Clause): string {
  let t = ` ${c.text.replace(/"\d+"/g, ' ')} `;
  // Sözcük olan "etiketler" (YAN, TEPE, ÇİZ…)
  t = t.replace(/\$(\d+)([a-z]*)/g, (whole, index: string, suffix: string) => {
    const label = c.labels[Number(index)];
    if (!label || label.bracket) return whole;
    const folded = fold(label.text).replace(/'/g, '');
    // Büyük harfle yazılmış "AC", "AB" gerçek etikettir; yalnızca küçük harfli adaylar fiil/sözcük olarak geri çevrilir ("aç", "yap").
    const wordLike = WORDISH.has(folded) || (label.lowercase && (SPLIT_WORDS.has(folded) || detectVerbs(folded).size > 0));
    if (/^[a-z]+$/.test(folded) && wordLike) return `${folded}${suffix}`;
    return whole;
  });
  // Konuşmada ayrı yazılan birleşik adlar: "ikiz kenar", "eş kenar dörtgen", "paralel kenar", "baklava dilimi"
  t = t
    .replace(/\bikiz kenar/g, 'ikizkenar')
    .replace(/\bes kenar (ucgen|dortgen)/g, 'eskenar $1')
    // "AB'ye paralel kenar" bir ilişki; yalnızca yönelme ekli etiketten sonra gelmeyen "paralel kenar" şekil adıdır.
    .replace(/(\$\d+(?:e|a|ye|ya) )?\bparalel kenar(\w*)/g, (whole, dative: string | undefined, suffix: string) => dative ? whole : `paralelkenar${suffix}`)
    .replace(/\bbaklava dilim\w*/g, 'eskenar dortgen');
  t = t
    .replace(/(#\d+)\s+(?:cm|br|birim|santim|santimetre|metre)\s*kare\b/g, '$1')
    .replace(/\b(?:birim ?kare|santimetre ?kare|cm ?kare|br ?kare|metre ?kare)\b/g, ' ')
    .replace(/(#\d+)\s+(?:cm|br|birim|birimlik|santim|santimlik|santimetre|metre|metrelik|mm)\b/g, '$1')
    .replace(/(#\d+)\s*derece(?:lik|li)?\b/g, '$1d')
    .replace(/(#\d+) ?(?:lik|luk|li|lu)\b/g, '$1')
    .replace(/\b(kenar\w*|kosegen\w*|taban\w*|yukseklig\w*|yaricap\w*|hipotenus\w*|cap\w*|aci\w*|bacak\w*|genislig\w*|boy\w*)\s+(?:uzunlugu|uzunluklari|uzunluklarinin|uzunlugunun|olcusu|olculeri|olcusunun|degeri)\b/g, '$1')
    .replace(/[=:]/g, ' ')
    .replace(/\s+/g, ' ');
  return ` ${t.trim()} `;
}

function computeVerbs(t: string): Set<VerbKind> {
  return detectVerbs(t.replace(/\$\d+[a-z]*|#\d+d?|@\d+/g, ' '));
}

/** İki ya da üç sözcüklü sayı öncesi ("iki kenarı 5 ve 7") sayma sözcüğünü atar. */
export function dropCountWords(t: string, c: Clause): string {
  return t.replace(/ #(\d+) (kenari|acisi|kenarlari|acilari|kosesi)(?= #)/g, (whole, index: string, word: string) => {
    const value = c.numbers[Number(index)];
    return value === 2 || value === 3 ? ` ${word}` : whole;
  });
}

function detectShape(t: string): ShapeKind[] {
  const found: ShapeKind[] = [];
  const s = t;
  if (/\b(?:eskenar dortgen|baklava dilimi|esit kenarli dortgen)/.test(s)) found.push('rhombus');
  if (/\bparalelkenar/.test(s)) found.push('parallelogram');
  if (/\byamu[gk]/.test(s)) found.push('trapezoid');
  if (/\b(?:deltoid|ucurtma)/.test(s)) found.push('kite');
  if (/\bdikdortgen/.test(s)) found.push('rectangle');
  const regular = /\bduzgun\b/.test(s) && /\b(?:cokgen|ucgen|dortgen|gen\b)|#\d+ ?-? ?gen\b/.test(s)
    || NGON_RE.test(s) || /(?:^| )#\d+ ?- ?gen\b|(?:^| )#\d+ gen\b/.test(s)
    || /#\d+ (?:kenarli|koseli) (?:duzgun )?cokgen/.test(s);
  if (regular) found.push('regular');
  if (/\bucgen/.test(s) && !(regular && /\bduzgun ucgen/.test(s))) found.push('triangle');
  if (/\bkare(?!li|kok|sel)/.test(s)) found.push('square');
  if (/\bdortgen/.test(s) && !found.includes('rhombus') && !(regular && /\bduzgun dortgen/.test(s))) found.push('quad');
  if (/\bcokgen/.test(s) && !regular) found.push('polygon');
  return found;
}

/** Cümle bu aileye ait bir çokgen oluşturma isteği mi? Değilse null. */
export function analyze(c: Clause, scene: CommandScene): Analysis | null {
  const key = scene.objects.length + ':' + scene.selection.join(',');
  const hit = cache.get(c);
  if (hit && hit.key === key) return hit.value;
  const value = analyzeUncached(c, scene);
  cache.set(c, { key, value });
  return value;
}

function analyzeUncached(c: Clause, scene: CommandScene): Analysis | null {
  if (c.negated || c.definition) return null;
  let t = simplify(c);
  t = dropCountWords(t, c);
  // "çevrel çember yarıçapı 3" düzgün çokgenlerde yarıçap bilgisidir.
  t = t.replace(/\bcevrel (?:cember(?:inin|in)? )?yaricap(\w*)/g, 'yaricap$1');
  if (/\bx(?:in)? ?kare|\bkare ?kok|\bkaresi(?:ni)? al/.test(t)) return null;

  let shapes = detectShape(t);
  const implicit = shapes.length ? null : implicitTriangleEdit(t, c, scene);
  const implicitEdit = implicit === 'edit';
  if (implicit) shapes = ['triangle'];
  if (!shapes.length) return null;
  const primary = shapes[0];
  // Birbirinden bağımsız iki şekil adı (ör. "karenin içine üçgen") başka bir işin konusu.
  const independent = shapes.filter(s => !(s === 'polygon' || s === 'quad')).length;
  if (independent > 1) return null;

  const verbs = computeVerbs(t);
  const strongCreate = STRONG_CREATE.test(t.replace(/\$\d+[a-z]*|#\d+d?|@\d+/g, ' '));
  const weak = WEAK_CREATE.test(t);
  const olsun = /\bolsun\b/.test(t);

  const foreignVerbs = FOREIGN_VERBS.filter(v => verbs.has(v)).filter(v => {
    if (v === 'select') return !/\bsec(?:ti|tig|ili|ilen|ilmis)/.test(t);
    if (v === 'rename') return !/\b(?:adi|ismi) \$\d+ olan\b/.test(t);
    return true;
  });
  if (foreignVerbs.length) return null;
  if (RELATION.test(t)) return null;
  // Başka nesne adları (nokta oluşturma, çember, doğru…) başka ailelerin işi.
  const otherNouns = (['segment', 'line', 'ray', 'circle', 'ellipse', 'arc', 'sector', 'function', 'slider', 'text', 'fraction', 'checkbox', 'button',
    'inputBox', 'image', 'pen', 'vector'] as const).filter(k => NOUNS[k].test(t));
  if (otherNouns.length) return null;
  const pointRef = POINT_REF.test(t);
  if (/\bnokta/.test(t) && !pointRef && !/\bnoktalar(?:indan|iyla|ini kullanarak|i olan|i @|dan)\b|\bnoktalar(?:ini|i) (?:kullan|birlestir|kose)\w*|\bkose noktalari\b|\bsecili noktalar|\bsectigim noktalar/.test(t)) return null;
  if (/\buzerin(?:de|e)\b/.test(t) && !/\$\d+ (?:kenari )?uzerine\b/.test(t)) return null;

  // Rengi/görünümü değiştiren "yap" cümleleri düzenleme ailesinindir.
  if (!strongCreate && (colorIn(c) || verbs.has('color'))) return null;
  if (!strongCreate && /\b(?:kalin|ince|kesik|dolu|bos|buyuk|kucuk|gizli)\b/.test(t)) return null;

  let modifyForm = false;
  if (OBLIQUE.test(t)) {
    // Tek istisna: üçgenin kenarlarını değiştirme ("ABC üçgeninin kenarları 3, 4 ve 5 olsun").
    const numbers = (t.match(/#\d+(?![\dd])/g) ?? []).length;
    const equalSides = /\bkenar(?:lari|larinin)? (?:birbirine )?esit\b/.test(t);
    if (primary === 'triangle' && TRIANGLE_GENITIVE.test(t) && /\bkenar|\bacilari\b/.test(t) && (numbers + (t.match(/#\d+d/g) ?? []).length >= 1 || equalSides) && weak && !strongCreate
      && !OBLIQUE.test(t.replace(/\bucgen(?:in|inin)\b/g, ' '))) {
      modifyForm = true;
    } else {
      return null;
    }
  } else if (/\$\d+(?:nin|in|un|nun)\b/.test(t) && !/\$\d+(?:nin|in|un|nun) (?:kenarlari|acilari)\b/.test(t)) {
    // "ABC'nin ..." biçimi var olan nesneye atıf
    return null;
  } else if (/\$\d+(?:nin|in|un|nun) (?:kenarlari|acilari)\b/.test(t)) {
    if (primary !== 'triangle' || !weak) return null;
    modifyForm = true;
  }
  if (implicitEdit) modifyForm = true;

  const countMatch = t.match(/ #(\d+) (?:tane|adet)\b/);
  const count = countMatch ? c.numbers[Number(countMatch[1])] : 1;
  const hasParams = c.numbers.length > 0 || c.coords.length > 0 || c.labels.length > 0 || c.refersToSelection;
  return { shape: primary, t, strongCreate, weakOnly: weak && !strongCreate, olsun, modifyForm, count, hasParams, pointRef };
}

// ---------------------------------------------------------------------------
// Sayı ve etiket yardımcıları
// ---------------------------------------------------------------------------

export const L = '#\\d+(?![\\dd])';
export const D = '#\\d+d?(?!\\d)';
export const SEP = '\\s*(?:,|ve|ile|x|carpi|kere|-|/|;|e|a|ye|ya)?\\s*';

export class Reader {
  s: string;
  constructor(readonly c: Clause, text: string) { this.s = text; }
  value(ref: string): number { return this.c.num(ref.replace(/d$/, '')); }
  isDegree(ref: string): boolean { return ref.endsWith('d'); }
  /** Kalıbı arar; bulursa eşleşen parçayı metinden çıkarır (sayılar iki kez kullanılmasın). */
  take(re: RegExp): RegExpMatchArray | null {
    const m = this.s.match(re);
    if (!m) return null;
    this.s = this.s.slice(0, m.index!) + ' _ ' + this.s.slice(m.index! + m[0].length);
    return m;
  }
  has(re: RegExp): boolean { return re.test(this.s); }
  /** Metinde kalan uzunluk sayıları (derece işaretsiz). */
  lengths(): number[] { return (this.s.match(/#\d+(?![\dd])/g) ?? []).map(r => this.value(r)); }
  degrees(): number[] { return (this.s.match(/#\d+d/g) ?? []).map(r => this.value(r)); }
  refs(fragment: string): string[] { return fragment.match(/#\d+d?/g) ?? []; }
  nums(fragment: string): number[] { return this.refs(fragment).map(r => this.value(r)); }
}

/** Sayı geçerli bir uzunluk mu? */
export function checkLength(value: number, what: string): number {
  if (!Number.isFinite(value) || value <= 0) fail(`${what} 0’dan büyük olmalı.`);
  if (value > 10000) fail(`${what} en fazla 10000 olabilir.`);
  return value;
}

export function checkAngle(value: number, what: string, max = 180): number {
  if (!Number.isFinite(value) || value <= 0 || value >= max) fail(`${what} 0° ile ${max}° arasında olmalı.`);
  return value;
}

export const toRad = (deg: number) => deg * Math.PI / 180;
export const toDeg = (rad: number) => rad * 180 / Math.PI;

/** Nesnenin gerçek bir üçgen çokgeni olup olmadığı */
export const isTriangle = (o: MathObject) => o.type === 'polygon' && o.pointIds.length === 3;

export function signedArea(points: Point2D[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}
