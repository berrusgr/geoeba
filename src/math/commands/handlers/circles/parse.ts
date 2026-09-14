import type { Point2D, PointObject } from '@/types/math';
import { formatCoordinate } from '../../../coordinates';
import { NOUNS, detectVerbs, fold, labelKey, type Clause, type LabelRef, type VerbKind } from '../../text';
import { type CommandScene, fail, trNum } from '../../scene';

/** Çember ailesinin cümle çözümleme yardımcıları (yalnızca bu aile kullanır). */

export type ShapeKind = 'circle' | 'disk' | 'ellipse' | 'arc' | 'sector';

export interface ShapeInfo {
  kind: ShapeKind;
  /** "yarım daire" (180), "çeyrek daire" (90), "üç çeyrek daire" (270) */
  sweep?: number;
  sweepWord?: string;
  /** "yarım"/"üç" sayısının indeksi (tüketilmiş sayılır) */
  sweepNum?: number;
  /** "birim çember" */
  unit?: boolean;
}

/** Açık çizim fiilleri ("yap/olsun" düzenleme cümlelerinde de geçtiği için ayrı tutulur). */
export const DRAW = /\b(?:ciz(?!g|im)|olustur|ekle|koy|kur(?!al)|cek(?!il)|yerlestir|tanimla|getir|uret)/;
/** Başka ailelerin (inşa) çember cümleleri. */
const BLOCK = /\b(?:teget|cevrel|cevrele|kesis)/;
const ALWAYS_EXCLUDED: VerbKind[] = ['delete', 'hide', 'move', 'rotate', 'reflect', 'translate', 'scale', 'select', 'copy', 'undo', 'redo', 'bind', 'play', 'stop', 'zoom', 'lock', 'unlock'];
const SOFT_EXCLUDED: VerbKind[] = ['measure', 'show', 'color', 'rename', 'question'];

const NOUN_SCAN: [string, RegExp][] = [
  ...Object.entries(NOUNS).map(([kind, re]) => [kind, new RegExp(re.source, 'g')] as [string, RegExp]),
  ['circle', /\byuvarla[kg]|\bdisk\b/g],
];
const OWN = new Set(['circle', 'ellipse', 'arc', 'sector']);

function wordIndexAt(text: string, index: number): number {
  return text.slice(0, index).split(' ').length - 1;
}

/** Kendi adlarımızın izin verilen hâlleri: yalın, çoğul, belirtme ve iyelik ("çember", "çemberi", "çemberini", "dairesi"). */
function formOk(word: string, stem: RegExp): { ok: boolean; accusative: boolean } {
  const m = word.match(stem);
  if (!m) return { ok: false, accusative: false };
  const rest = word.slice(m[0].length);
  const ok = /^(?:l[ae]r)?(?:(?:y|s|n)?[iu]|s?[iu]n[iu])?$/.test(rest);
  const accusative = ok && rest !== '' && !/^(?:l[ae]r|s[iu])$/.test(rest);
  return { ok, accusative };
}

// ---------------------------------------------------------------------------
// Aileye özgü cümle hazırlığı

/** Konuşmada ya da yazıda araya giren ve çözümleyicinin "yarıçap" öncesinde etiket sanabildiği sözcükler. */
const FILLER_WORD = /^(?:evet|sey|tamam|hani|peki|iste|yani|hadi|haydi|bak|ee+|hm+|aa+|eden|olan|alan|egik|yatik|dolu|bos|ayni|farkli)$/;
const VOWEL = /[aeiou]/g;
/** Yalnızca fiil tespiti için yok sayılan sıfat/ulaç biçimleri ("merkez seçerek", "döndürülmüş elips", "kırmızı renkte"). */
const VERB_NOISE: RegExp[] = [
  /\bmerkez\s+(?:olarak\s+)?sec(?:erek|en|ip|ilen|ilerek)\b/g,
  /\b(?:dondurulmus|dondurulen|donmus)\b(?=\s+(?:bir\s+)?elips)/g,
  /\b(?:renkte|renkli|renginde|boyali|boyanmis)\b/g,
];

/** Yazım ve konuşma tanıma hataları: "çembr", "cenber", "elipis". */
const TYPO = /^(cembr|cenber|cemper|cmber|elipis|elibs|elpis|dayre)([a-z]*)$/;
const TYPO_FIX: Record<string, string> = { cembr: 'cember', cenber: 'cember', cemper: 'cember', cmber: 'cember', elipis: 'elips', elibs: 'elips', elpis: 'elips', dayre: 'daire' };

export interface CircleClause extends Clause {
  /** Dolgu sözcüğü olduğu için kullanılmış sayılan (yok sayılan) küçük harfli etiketler. */
  ignoredLabels: Set<number>;
}

/**
 * Çember ailesinin kullandığı cümle görünümü (asıl cümle değişmez):
 *   - "yarı çapı" → "yarıçapı" (konuşmada ayrık yazılır),
 *   - "evet/şey/eden/eğik yarıçapı …" gibi etiket sanılan sözcükler düz sözcüğe döner,
 *   - "3'ün yarısı" → 1,5,
 *   - "merkez seçerek", "döndürülmüş elips", "kırmızı renkte" fiil sayılmaz.
 */
export function prepareClause(c: Clause, scene?: CommandScene): CircleClause {
  if ((c as CircleClause).ignoredLabels) return c as CircleClause;
  const ignored = new Set<number>();
  c.labels.forEach((label, index) => {
    if (!label.lowercase || label.suffix || label.bracket) return;
    const key = fold(label.text);
    if (scene?.pointsFromLabel(label.text)) return;
    const at = c.words.indexOf(`$${index}`);
    const next = c.words[at + 1] ?? '';
    if (FILLER_WORD.test(key) || (/^(?:yari|cap)/.test(next) && (key.match(VOWEL)?.length ?? 0) >= 2)) ignored.add(index);
  });
  const words = c.words.map(w => {
    const m = w.match(/^\$(\d+)$/);
    return m && ignored.has(Number(m[1])) ? fold(c.labels[Number(m[1])].text) : w;
  });
  const numbers = [...c.numbers];
  for (let i = 0; i < words.length; i++) {
    const typo = words[i].match(TYPO);
    if (typo) words[i] = TYPO_FIX[typo[1]] + typo[2];
    if (words[i] === 'yari' && /^cap/.test(words[i + 1] ?? '')) words.splice(i, 2, `yari${words[i + 1]}`);
    const n = words[i].match(/^#(\d+)$/);
    if (n && /^n?[iu]n$/.test(words[i + 1] ?? '') && words[i + 2] === 'yarisi') {
      numbers[Number(n[1])] /= 2;
      words.splice(i + 1, 2);
    }
  }
  const text = words.join(' ');
  const verbText = VERB_NOISE.reduce((t, re) => t.replace(re, ' '), text.replace(/"\d+"/g, ' '));
  const out = Object.create(c) as CircleClause;
  Object.assign(out, { text, words: text.split(' '), numbers, verbs: detectVerbs(verbText), ignoredLabels: ignored });
  return out;
}

export function isExcludedByVerbs(c: Clause): boolean {
  if (c.negated) return true;
  if (c.hasVerb(...ALWAYS_EXCLUDED)) return true;
  if (c.hasVerb(...SOFT_EXCLUDED) && !DRAW.test(c.text)) return true;
  return false;
}

/** Cümlenin baş adı (Türkçede ad öbeğinin sonundaki ad) bu ailenin şekli mi? */
export function classify(c: Clause): ShapeInfo | null {
  if (BLOCK.test(c.text) || isExcludedByVerbs(c)) return null;
  const words = c.words;
  const hits: { kind: string; word: number; last: number }[] = [];
  for (const [kind, re] of NOUN_SCAN) {
    for (const m of c.text.matchAll(re)) {
      const word = wordIndexAt(c.text, m.index!);
      const last = wordIndexAt(c.text, m.index! + Math.max(0, m[0].length - 1));
      hits.push({ kind, word, last });
    }
  }
  const relevant = hits.filter(h => {
    if (OWN.has(h.kind)) return true;
    // "yay parçası", "çember parçası": yayın kendisi
    if (h.kind === 'segment' && /^(?:yay|cember|daire)$/.test(words[h.word - 1] ?? '')) return false;
    // "A noktası merkezli", "ABC üçgeninin köşelerinden", "[AB] doğru parçası çaplı": başka bir adı niteleyen gönderme
    const prev = words[h.word - 1] ?? '';
    const next = words[h.last + 1] ?? '';
    const reference = /^[$@]\d+/.test(prev) || /^(?:merkez|merkezi|baslangic|bitis|secili|secilen|bu|son)$/.test(prev);
    return !(reference && detectVerbs(next).size === 0);
  });
  if (!relevant.length) return null;
  const head = relevant.reduce((a, b) => (b.word > a.word || (b.word === a.word && b.kind === 'sector') ? b : a));
  if (!OWN.has(head.kind)) return null;
  const draw = DRAW.test(c.text);

  if (head.kind === 'sector') {
    const index = words.findIndex((w, i) => i >= head.word && w.startsWith('dilim'));
    const form = formOk(words[index] ?? '', /^dilim/);
    if (!form.ok || (form.accusative && words[index] !== 'dilimi' && !draw)) return null;
    // "yarım daire dilimi", "çeyrek daire dilimi"
    if (words[head.word] === 'daire') {
      const part = sweepModifier(c, head.word, true);
      if (part === 'invalid') return null;
      if (part) return { kind: 'sector', ...part };
    }
    return { kind: 'sector' };
  }
  const word = words[head.word];
  if (head.kind === 'ellipse') {
    const form = formOk(word, /^elips/);
    return form.ok && (!form.accusative || draw) ? { kind: 'ellipse' } : null;
  }
  if (head.kind === 'arc') {
    const form = formOk(word, /^yay/);
    return form.ok && (!form.accusative || draw) ? { kind: 'arc' } : null;
  }
  const stem = word.match(/^(?:cember|daire|yuvarla[kg]|disk)/)?.[0];
  if (!stem) return null;
  const form = formOk(word, new RegExp(`^${stem}`));
  if (!form.ok || (form.accusative && !draw)) return null;
  let filled = stem === 'daire' || stem === 'disk';
  // "içi dolu çember", "boyalı çember" → daire; "içi boş daire" → çember
  if (/\b(?:ici\s+)?(?:dolu|boyali|boyanmis|taranmis)\b/.test(c.text)) filled = true;
  if (/\bici\s+bos\b/.test(c.text)) filled = false;
  // "çember parçası", "daire parçası": yay / daire dilimi
  if (/^parca/.test(words[head.word + 1] ?? '')) return { kind: filled ? 'sector' : 'arc' };
  const part = sweepModifier(c, head.word, filled);
  if (part === 'invalid') return null;
  if (part) return { kind: filled ? 'sector' : 'arc', ...part };
  const prev = words[head.word - 1] ?? '', prev2 = words[head.word - 2] ?? '';
  const unit = prev === 'birim' && !/^#\d+$/.test(prev2);
  return { kind: filled ? 'disk' : 'circle', ...(unit ? { unit } : {}) };
}

/** "yarım", "çeyrek", "üç çeyrek", "dörtte bir/üç" + daire/çember (index: daire/çember sözcüğü). */
function sweepModifier(c: Clause, index: number, filled: boolean): Pick<ShapeInfo, 'sweep' | 'sweepWord' | 'sweepNum'> | 'invalid' | null {
  const words = c.words;
  const prev = words[index - 1] ?? '', prev2 = words[index - 2] ?? '';
  const noun = filled ? 'daire' : 'çember';
  const prevNum = prev.match(/^#(\d+)$/);
  if (prevNum && c.numbers[Number(prevNum[1])] === 0.5 && /\byarim\s+(?:daire|cember)/.test(fold(c.raw))) {
    return { sweep: 180, sweepWord: `yarım ${noun}`, sweepNum: Number(prevNum[1]) };
  }
  if (prev === 'ceyrek') {
    const times = prev2.match(/^#(\d+)$/);
    const n = times ? c.numbers[Number(times[1])] : 1;
    if (times && !(Number.isInteger(n) && n >= 1 && n <= 3)) return 'invalid';
    return { sweep: 90 * n, sweepWord: `${n === 3 ? 'üç ' : n === 2 ? 'iki ' : ''}çeyrek ${noun}`, ...(times ? { sweepNum: Number(times[1]) } : {}) };
  }
  if (prev2 === 'dortte' && (prev === 'bir' || prevNum)) {
    const n = prevNum ? c.numbers[Number(prevNum[1])] : 1;
    if (!(Number.isInteger(n) && n >= 1 && n <= 3)) return 'invalid';
    return { sweep: 90 * n, sweepWord: `dörtte ${['bir', 'iki', 'üç'][n - 1]} ${noun}`, ...(prevNum ? { sweepNum: Number(prevNum[1]) } : {}) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Etiket/koordinat grupları

export interface Group {
  label?: number;
  coord?: number;
  origin?: boolean;
  /** words içindeki ilk ve son sözcük */
  start: number;
  end: number;
  suffix: string;
}

const COORD_SUFFIX = /^(?:n?[iu]n|y?[iu]|y?[ea]|n?[dt][ea]n|n?[dt][ea]|l[iu]|y?l[ea]|[dt][ea]ki)$/;

export function refGroups(c: Clause): Group[] {
  const w = c.words;
  const out: Group[] = [];
  for (let i = 0; i < w.length; i++) {
    const lm = w[i].match(/^\$(\d+)([a-z]*)$/);
    const cm = w[i].match(/^@(\d+)$/);
    if (lm) {
      const g: Group = { label: Number(lm[1]), start: i, end: i, suffix: lm[2] };
      const next = (w[i + 1] ?? '').match(/^@(\d+)$/);
      if (!lm[2] && next) {
        g.coord = Number(next[1]);
        g.end = ++i;
        if (COORD_SUFFIX.test(w[i + 1] ?? '')) { g.suffix = w[++i]; g.end = i; }
      }
      out.push(g);
    } else if (cm) {
      const g: Group = { coord: Number(cm[1]), start: i, end: i, suffix: '' };
      if (COORD_SUFFIX.test(w[i + 1] ?? '')) { g.suffix = w[++i]; g.end = i; }
      out.push(g);
    } else if (/^or[i]?jin/.test(w[i])) {
      out.push({ origin: true, start: i, end: i, suffix: w[i].replace(/^or[i]?jin/, '') });
    }
  }
  return out;
}

/** Cümlede kullanılan sayı, etiket ve koordinatlar. Kullanılmayan kalırsa komut tahmin yürütmek yerine açıklamayla reddedilir. */
export class Used {
  nums = new Set<number>();
  labels = new Set<number>();
  coords = new Set<number>();
  /** "O" zamir sayıldığı için etiket listesine girmez; yalnızca "O merkezli" biçiminde kullanılabilir. */
  letterO = false;
  constructor(private readonly c: Clause) {}
  center(spec: CenterSpec | undefined) {
    if (!spec) return;
    if ('group' in spec) this.group(spec.group);
    if ('labelText' in spec || ('focus' in spec && spec.viaO)) this.letterO = true;
    if ('labelText' in spec && spec.coord !== undefined) this.coords.add(spec.coord);
  }
  group(g?: Group) {
    if (!g) return;
    if (g.label !== undefined) this.labels.add(g.label);
    if (g.coord !== undefined) this.coords.add(g.coord);
  }
  num(i?: number) { if (i !== undefined) this.nums.add(i); }
  leftover(): string | undefined {
    const hex = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/.test(this.c.raw);
    const n = this.c.numbers.findIndex((_, i) => !this.nums.has(i));
    if (n >= 0 && !hex) return `${trNum(this.c.numbers[n])} sayısını`;
    const ignored = (this.c as Partial<CircleClause>).ignoredLabels;
    const l = this.c.labels.findIndex((_, i) => !this.labels.has(i) && !ignored?.has(i));
    if (l >= 0) return `${this.c.labels[l].text} adını`;
    const k = this.c.coords.findIndex((_, i) => !this.coords.has(i));
    if (k >= 0) return `${formatCoordinate(this.c.coords[k])} koordinatını`;
    return undefined;
  }
  assertAllUsed(example: string) {
    // "O", "DE", "Kİ" gibi büyük harfli adlar zamir/bağlaç sanılıp etiket listesine girmeyebilir: sessizce yok saymak yerine uyar.
    if (/[a-zçğıöşü]/.test(this.c.raw.replace(/"[^"]*"/g, ''))) {
      const known = new Set(this.c.labels.map(l => l.text));
      for (const m of this.c.raw.matchAll(/(?<![\p{L}\p{N}_'’′#])([A-ZÇĞİÖŞÜ]{1,3})(?:['’][a-zçğıöşü]+)?(?![\p{L}\p{N}_'’′])/gu)) {
        const name = m[1];
        if (known.has(name) || (name === 'O' && this.letterO)) continue;
        fail(`“${name}” bu cümlede nokta adı olarak okunamadı (“${name.toLocaleLowerCase('tr')}” sözcüğüyle karışıyor). Adı köşeli parantezle yazın (ör. “[${name}]”)${name === 'O' ? ' ya da “O merkezli” biçimini kullanın' : ''}.`);
      }
    }
    const left = this.leftover();
    if (left) fail(`${left} bu şekilde nasıl kullanacağımı anlayamadım. Örneğin “${example}” yazın.`);
  }
}

// ---------------------------------------------------------------------------
// Sayılar

export interface NumRef { idx: number; value: number }

/** re'nin ilk yakalama grubu #k içindeki k'dır. π/pi ile yazılmışsa değer π ile çarpılır. */
export function numMatch(c: Clause, used: Used, re: RegExp): NumRef | undefined {
  const g = new RegExp(re.source, 'g');
  for (const m of c.text.matchAll(g)) {
    const idx = Number(m[1]);
    if (used.nums.has(idx) || c.numbers[idx] === undefined) continue;
    let value = c.numbers[idx];
    if (new RegExp(`#${idx}(?!\\d)\\s*(?:π|pi\\b)`).test(c.text)) value *= Math.PI;
    return { idx, value };
  }
  return undefined;
}
/** "yarıçapı 3", "çap 8", "çevresi 12": sıfat biçimi ("yarıçaplı 90 derecelik") sonraki sayıyı almaz. */
export const after = (stem: string) =>
  new RegExp(`\\b(?:${stem})(?:[iu]|s[iu]|n[iu])?\\b(?:\\s+(?:uzunlugu|olcusu|degeri|buyuklugu))?\\s*(?:=|:)?\\s*(?:olarak\\s+|ise\\s+)?#(\\d+)`);
export const before = (stem: string) =>
  new RegExp(`#(\\d+)(?:\\s*(?:π|pi))?(?:\\s*(?:br|birim|cm|santim|santimetre|metre))?(?:lik|luk)?\\s*\\b(?:${stem})[a-z]*`);

export function take(used: Used, ref: NumRef | undefined): NumRef | undefined {
  if (ref) used.num(ref.idx);
  return ref;
}

export interface RadiusSpec { value: number; from: 'yaricap' | 'cap' | 'aciklik' | 'cevre' | 'alan' | 'birim'; written: number }

/** Tek yarıçap: "yarıçapı 3", "3 yarıçaplı", "r = 3", "çapı 8", "3 birim açıklıkla", "çevresi 6π", "alanı 9π", "5 birimlik". */
export function radiusNumber(c: Clause, used: Used, o: { circumference?: boolean } = {}): RadiusSpec | undefined {
  const tries: [RadiusSpec['from'], RegExp, (n: number) => number][] = [
    ['yaricap', after('yaricap'), n => n],
    ['yaricap', before('yaricap'), n => n],
    ['yaricap', /\br\s*(?:=|:)\s*#(\d+)/, n => n],
    ['aciklik', after('aciklig|aciklik'), n => n],
    ['aciklik', before('aciklik|aciklig'), n => n],
    ['cap', after('cap(?!raz)'), n => n / 2],
    ['cap', before('cap(?!raz)'), n => n / 2],
    ...(o.circumference ? [
      ['cevre', after('cevre(?!l)'), (n: number) => n / (2 * Math.PI)],
      ['alan', after('alan(?!in\\b)'), (n: number) => (n > 0 ? Math.sqrt(n / Math.PI) : -1)],
    ] as [RadiusSpec['from'], RegExp, (n: number) => number][] : []),
    ['birim', /#(\d+)(?:\s*(?:π|pi))?\s*(?:br|birim|cm|santim|santimetre|metre)(?:lik|luk)?\b(?!\s*(?:yaricap|cap|aciklik|derece))/, n => n],
  ];
  for (const [from, re, convert] of tries) {
    const ref = take(used, numMatch(c, used, re));
    if (ref) return { value: convert(ref.value), from, written: ref.value };
  }
  return undefined;
}

/** "yarıçapları 1, 2 ve 3" ya da "1, 2 ve 3 yarıçaplı": birden fazla sayı. */
export function numberList(c: Clause, used: Used, stem: string): NumRef[] | undefined {
  const list = '((?:#\\d+\\s*(?:,|ve|ile|ile)?\\s*){2,})';
  const m = c.text.match(new RegExp(`\\b(?:${stem})(?:lari|leri)\\s*(?:=|:)?\\s*${list}`))
    ?? c.text.match(new RegExp(`${list}(?:br|birim|cm)?\\s*(?:${stem})l[iu]\\b`));
  if (!m) return undefined;
  const refs = [...m[1].matchAll(/#(\d+)/g)].map(x => Number(x[1])).filter(i => !used.nums.has(i));
  if (refs.length < 2) return undefined;
  refs.forEach(i => used.num(i));
  return refs.map(idx => ({ idx, value: c.numbers[idx] }));
}

// ---------------------------------------------------------------------------
// Rol bulucular

const NOKTA = /^nokta(?:si|sini|yi|lari|larini)?$/;

export type CenterSpec = { group: Group } | { origin: true } | { focus: true; viaO?: boolean } | { labelText: string; coord?: number } | { point: string };

export function findCenter(c: Clause, groups: Group[]): CenterSpec | undefined {
  const w = c.words;
  const endingAt = (j: number) => groups.find(g => g.end === j);
  const startingAt = (j: number) => groups.find(g => g.start === j);
  for (let i = 0; i < w.length; i++) {
    const word = w[i];
    let before = -1, afterIndex = -1;
    if (/^merkezl[iu]$/.test(word)) before = i - 1;
    else if (word === 'merkez' && CENTER_PREDICATE.test(w[i + 1] ?? '')) before = i - 1;
    // "A noktası merkez, B noktası üzerinde olacak şekilde"
    else if (word === 'merkez' && NOKTA.test(w[i - 1] ?? '') && endingAt(i - 2)) before = i - 1;
    else if (/^merkez(?:i|leri)?$/.test(word)) afterIndex = i + 1;
    if (before >= 0) {
      let j = before;
      if (NOKTA.test(w[j] ?? '')) {
        if (/^(?:secili|secilen|bu|son|o|su)$/.test(w[j - 1] ?? '')) return { focus: true, viaO: w[j - 1] === 'o' };
        if (w[j - 1] === 'baslangic') return { origin: true };
        j--;
      }
      if (/^(?:onu|bunu|sunu)$/.test(w[j] ?? '')) return { focus: true };
      const g = endingAt(j);
      if (g) return letterOWithCoord(c, g) ?? { group: g };
    }
    if (afterIndex >= 0) {
      let j = afterIndex;
      if (w[j] === ':' || w[j] === '=') j++;
      if (NOKTA.test(w[j] ?? '')) j++;
      if (w[j] === ':' || w[j] === '=') j++;
      if (w[j] === 'baslangic') return { origin: true };
      const g = startingAt(j) ?? (w[j] === 'o' ? startingAt(j + 1) : undefined);
      if (g) return letterOWithCoord(c, g) ?? { group: g };
    }
    // "A'nın etrafında", "A noktasının etrafına"
    if (/^etraf(?:inda|ina)$/.test(word)) {
      const viaNoun = w[i - 1] === 'noktasinin';
      const g = endingAt(viaNoun ? i - 2 : i - 1);
      if (g && (viaNoun ? !g.suffix : /^n?[iu]n$/.test(g.suffix)) && (g.label === undefined || SINGLE_POINT.test(c.labels[g.label]?.text ?? ''))) return { group: g };
    }
  }
  // Pergelin ucunu koymak: "pergeli A noktasına koyup", "pergelin ucunu A'ya batırıp"
  if (/\bpergel/.test(c.text)) {
    for (const g of groups) {
      let k = g.end + 1;
      const viaNoun = w[k] === 'noktasina';
      if (viaNoun) k++;
      if ((viaNoun || DAT.test(g.suffix)) && /^(?:koy|yerlestir|bat|sabitle|oturt|daya)/.test(w[k] ?? '')) return { group: g };
    }
  }
  // "O" zamir listesinde olduğu için etiket sayılmaz: "O merkezli", "merkezi O olan"; konuşmada küçük harfle: "o merkezli"
  if (/(?:^|[\s,;(])O(?:['’](?:nun|yu|ya|dan))?\s+(?:noktası\s+|noktasını\s+)?merkez/u.test(c.raw) || /[Mm]erkez(?:i|\s+noktası)\s+O(?=$|[\s,;])/u.test(c.raw)
    || /(?:^|[\s,;(])o\s+merkezl[iı]\b/u.test(c.raw)) {
    return { labelText: 'O' };
  }
  return undefined;
}

const SINGLE_POINT = /^[A-ZÇĞİÖŞÜ](?:_?\d+)?'*$/;

/** "O(0;0) merkezli": "O" zamir sayılıp etiket olmadığında koordinat grubunun önündeki büyük O harfi adıdır. */
function letterOWithCoord(c: Clause, g: Group): CenterSpec | undefined {
  if (g.label !== undefined || g.coord === undefined || c.words[g.start - 1] !== 'o') return undefined;
  return /(?:^|[\s,;])O\s*\(/u.test(c.raw) ? { labelText: 'O', coord: g.coord } : undefined;
}

/**
 * Merkez sözcüğü olmadan yer: "A noktasına yarıçapı 3 olan çember çiz", "(1;1) noktasında bir daire", "(2;3)'e elips koy".
 * Geçiş ("geçen"), başlangıç/bitiş gibi başka rol sözcükleri varsa kullanılmaz.
 */
export function findPlacement(c: Clause, groups: Group[], taken: Set<Group>): Group | undefined {
  const w = c.words;
  if (w.some(x => THROUGH_WORD.test(x) || /^(?:basla|bitis|biten|kadar|arasi)/.test(x))) return undefined;
  const hits = groups.filter(g => !taken.has(g) && (/^(?:noktasina|noktasinda|konumuna|konumunda)$/.test(w[g.end + 1] ?? '')
    || (g.coord !== undefined && g.label === undefined && /^(?:y?[ea]|n?[dt][ea])$/.test(g.suffix))));
  return hits.length === 1 ? hits[0] : undefined;
}

/** "A ve B merkezli", "A, B ve C merkezli": merkez grubundan önce bağlaçla sıralanan diğer merkezler (cümledeki sırayla). */
export function centerList(c: Clause, groups: Group[], spec: CenterSpec | undefined): Group[] {
  if (!spec || !('group' in spec)) return [];
  const w = c.words;
  const out = [spec.group];
  for (let first = spec.group; ;) {
    if (!/^(?:ve|ile|,)$/.test(w[first.start - 1] ?? '')) break;
    const prev = groups.find(g => g.end === first.start - 2 && g.label !== undefined);
    if (!prev || !SINGLE_POINT.test(c.labels[prev.label!]?.text ?? '')) break;
    out.unshift(prev);
    first = prev;
  }
  return out;
}

/** "A'yı merkez alan/alıp/kabul eden/seçerek", "A merkez olsun" */
const CENTER_PREDICATE = /^(?:alan|kabul|olan|olarak|edinen|alarak|alip|alinan|alinarak|sayan|sayip|sayarak|secen|secerek|secip|olsun|olacak|oldugu)$/;

const SEGMENT_WORD = /^(?:dogru|parcasi|parcasini|parca|kenari|kenarini|noktalari|noktalarini|arasindaki|arasinda|arasi)$/;

function groupsBefore(c: Clause, groups: Group[], taken: Set<Group>, index: number): Group[] {
  const w = c.words;
  let j = index;
  while (j >= 0 && SEGMENT_WORD.test(w[j] ?? '')) j--;
  const last = groups.find(g => g.end === j && !taken.has(g));
  if (!last) return [];
  const prevConj = w[last.start - 1];
  if (prevConj === 've' || prevConj === 'ile') {
    const first = groups.find(g => g.end === last.start - 2 && !taken.has(g));
    if (first) return [first, last];
  }
  return [last];
}

/** Çap uçları: "AB çaplı", "çapı [AB] olan", "A ve B noktalarını çap kabul eden". */
export function findDiameter(c: Clause, groups: Group[], taken: Set<Group>, o: { onto?: boolean } = {}): Group[] {
  const w = c.words;
  for (let i = 0; i < w.length; i++) {
    // "AB üzerine yarım daire", "[AB] doğru parçası üzerine yarım çember"
    if (o.onto && w[i] === 'uzerine') { const found = groupsBefore(c, groups, taken, i - 1); if (found.length) return found; }
    if (/^capl[iu]$/.test(w[i])) { const found = groupsBefore(c, groups, taken, i - 1); if (found.length) return found; }
    if (w[i] === 'cap' && /^(?:alan|kabul|olan|olarak|edinen|alarak)$/.test(w[i + 1] ?? '')) {
      const found = groupsBefore(c, groups, taken, i - 1);
      if (found.length) return found;
    }
    if (w[i] === 'capi') {
      const g = groups.find(x => x.start === i + 1 && !taken.has(x));
      if (g) return [g];
    }
    // "uçları A ve B olan çap üzerine"
    if (/^cap(?:i|a)?$/.test(w[i]) && w[i - 1] === 'olan' && w.slice(0, i).includes('uclari')) {
      const found = groupsBefore(c, groups, taken, i - 2);
      if (found.length) return found;
    }
  }
  return [];
}

/** Yarıçap olarak iki noktalı ad: "AB yarıçaplı", "yarıçapı |BC| olan", "pergel açıklığı AB olan". */
export function findRadiusGroup(c: Clause, groups: Group[], taken: Set<Group>): Group | undefined {
  const w = c.words;
  for (let i = 0; i < w.length; i++) {
    if (/^(?:yaricapl[iu]|aciklik(?:la|ta|li)?|acikliginda)$/.test(w[i])) {
      const g = groups.find(x => x.end === i - 1 && !taken.has(x) && x.label !== undefined);
      if (g) return g;
    }
    if (/^(?:yaricapi|yaricap|acikligi)$/.test(w[i])) {
      let j = i + 1;
      if (w[j] === 'uzunlugu') j++;
      if (w[j] === ':' || w[j] === '=') j++;
      const g = groups.find(x => x.start === j && !taken.has(x) && x.label !== undefined);
      if (g) return g;
    }
  }
  return undefined;
}

const THROUGH_WORD = /^(?:gecen|gecsin|gececek|gecmesi|uzerinden|uzerinde)$/;

/** "B'den geçen", "A, B ve C noktalarından geçen", "ABC üçgeninin köşelerinden geçen". */
export function findThrough(c: Clause, groups: Group[], taken: Set<Group>): Group[] {
  const index = c.words.findIndex(w => THROUGH_WORD.test(w));
  if (index < 0) return [];
  return groups.filter(g => !taken.has(g) && g.end < index);
}

const ABL = /^n?[dt][ae]n$/;

/**
 * Adı yazılmadan verilen geçiş noktaları: "seçili noktalardan geçen", "üç noktadan geçen".
 * Sayı tüketilir; seçim yoksa noktaların adını ya da seçilmesini isteyen açıklamayla reddedilir.
 */
export function implicitThrough(c: Clause, scene: CommandScene, used: Used, explicit: Group[], shape: string): PointObject[] {
  if (explicit.length || !/\b(?:gecen|gecsin|gececek|gecmesi|uzerinden)\b/.test(c.text)) return [];
  const count = take(used, numMatch(c, used, /#(\d+)\s+(?:farkli\s+|tane\s+)?nokta(?:dan|lardan|sindan)\b/));
  const selected = /\b(?:secili|secilen|secilmis|sectigim|sectigin|sectiginiz|sectiklerim|isaretli|bu|su)\s+(?:#\d+\s+)?(?:farkli\s+)?nokta(?:dan|lardan|sindan)\b/.test(c.text);
  if (!count && !selected) return [];
  let points: PointObject[] = [];
  if (selected) {
    const lists = c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
    for (const ids of lists) {
      points = ids.map(id => scene.get(id)).filter((o): o is PointObject => o?.type === 'point');
      if (points.length) break;
    }
    if (!points.length) fail(`Seçili nokta yok. Önce noktaları seçin ya da adlarını yazın (ör. “A, B ve C noktalarından geçen ${shape} çiz”).`);
  }
  if (count && !points.length) {
    // "üç noktadan geçen çember çiz": tam o kadar nokta seçiliyse seçim kullanılır.
    for (const ids of [scene.selection, scene.focus]) {
      const pts = ids.map(id => scene.get(id)).filter((o): o is PointObject => o?.type === 'point');
      if (pts.length === count.value) { points = pts; break; }
    }
  }
  if (count) {
    const n = count.value;
    if (!points.length) {
      if (n === 2 && /cember|daire/.test(fold(shape))) fail(`İki noktadan sonsuz sayıda ${shape} geçer. Merkezi de yazın (ör. “A merkezli, B noktasından geçen ${shape}”) ya da üç nokta verin (ör. “A, B ve C noktalarından geçen ${shape}”).`);
      fail(`Hangi ${trNum(n)} noktadan geçeceğini adlarıyla yazın (ör. “A, B ve C noktalarından geçen ${shape} çiz”) ya da noktaları seçip “seçili noktalardan geçen ${shape} çiz” yazın.`);
    }
    if (points.length !== n) fail(`${trNum(n)} nokta yazıldı ama ${points.length} nokta seçili. Seçimi düzeltin ya da noktaların adlarını yazın.`);
  }
  return points;
}

const DAT = /^(?:y?[ea]|n[ea])$/;

/** Yay uçları: "B'den C'ye", "B noktasından C noktasına", "B ile C arasındaki", "başlangıç noktası B, bitiş noktası C", "B'den başlayan". */
export function findEnds(c: Clause, groups: Group[], taken: Set<Group>): { start?: Group; end?: Group; between?: boolean } {
  const w = c.words;
  const free = groups.filter(g => !taken.has(g));
  const nextWord = (g: Group) => w[g.end + 1] ?? '';
  const isAbl = (g: Group) => ABL.test(g.suffix) || nextWord(g) === 'noktasindan';
  const isDat = (g: Group) => DAT.test(g.suffix) || nextWord(g) === 'noktasina';
  for (let i = 0; i + 1 < free.length; i++) {
    const g = free[i], h = free[i + 1];
    const gap = w.slice(g.end + 1, h.start).filter(x => !/^(?:noktasindan|baslayip|baslayarak|baslayan)$/.test(x));
    if (isAbl(g) && isDat(h) && gap.length === 0) return { start: g, end: h };
    const conj = w.slice(g.end + 1, h.start);
    const tail = w.slice(h.end + 1, h.end + 3);
    if (conj.length === 1 && /^(?:ile|ve)$/.test(conj[0]) && tail.some(x => /^arasind/.test(x))) return { start: g, end: h, between: true };
  }
  let start: Group | undefined, end: Group | undefined;
  for (const g of free) {
    const n = nextWord(g) === 'noktasindan' ? w[g.end + 2] ?? '' : nextWord(g);
    if (!start && (ABL.test(g.suffix) || nextWord(g) === 'noktasindan') && /^basla/.test(n)) start = g;
    // "C noktasında biten", "C'de bitsin"
    const m = nextWord(g) === 'noktasinda' ? w[g.end + 2] ?? '' : nextWord(g);
    if (!end && g !== start && (/^n?[dt][ae]$/.test(g.suffix) || nextWord(g) === 'noktasinda') && /^bit(?:en|ecek|sin|me)/.test(m)) end = g;
  }
  for (let i = 0; i < w.length; i++) {
    const role = /^baslangic(?:i|noktasi)?$/.test(w[i]) ? 'start' : /^bitis(?:i|noktasi)?$/.test(w[i]) ? 'end' : null;
    if (!role) continue;
    let j = i + 1;
    if (NOKTA.test(w[j] ?? '')) j++;
    const g = free.find(x => x.start === j);
    if (!g) continue;
    if (role === 'start') start ??= g; else end ??= g;
  }
  return { start, end };
}

// ---------------------------------------------------------------------------
// Noktaları çözme

export function labelOf(c: Clause, g: Group): LabelRef | undefined {
  return g.label !== undefined ? c.labels[g.label] : undefined;
}

export function sameSpot(a: Point2D, b: Point2D) { return Math.hypot(a.x - b.x, a.y - b.y) < 1e-9; }

/** Koordinattaki bağımsız nokta varsa onu, yoksa yeni nokta. */
export function pointAt(scene: CommandScene, position: Point2D, color?: string): { point: PointObject; created: boolean } {
  const existing = scene.points().find(p => !p.construction && sameSpot(p, position));
  if (existing) return { point: existing, created: false };
  return { point: scene.addPoint(position, { color }), created: true };
}

/**
 * Tek noktalı grup: "A", "A(1;2)", "(1;2)", "orijin".
 * create verilirse adı olup sahnede olmayan nokta o konumda oluşturulur; verilmezse açıklayıcı hata.
 */
export function groupPoint(scene: CommandScene, c: Clause, g: Group, o: { create?: () => Point2D; color?: string; role: string }): { point: PointObject; created: boolean } {
  const label = labelOf(c, g);
  const coord = g.coord !== undefined ? c.coords[g.coord] : g.origin ? { x: 0, y: 0 } : undefined;
  if (label) {
    const existing = scene.findPoint(label.text);
    if (existing) {
      if (coord && !sameSpot(existing, coord)) fail(`${existing.label} noktası zaten ${formatCoordinate(existing)} konumunda. Başka bir ad yazın ya da koordinatı kaldırın.`);
      return { point: existing, created: false };
    }
    const many = scene.pointsFromLabel(label.text);
    if (many && many.length > 1) fail(`${o.role} tek bir nokta olmalı; “${label.text}” birden fazla noktayı gösteriyor.`);
    if (coord) return { point: scene.addPoint(coord, { label: label.text, color: o.color }), created: true };
    if (!o.create) fail(`${label.text} noktası bulunamadı. Önce noktayı oluşturun (ör. “${label.text} (3; 0) noktası oluştur”).`);
    return { point: scene.addPoint(o.create(), { label: label.text, color: o.color }), created: true };
  }
  if (coord) return pointAt(scene, coord, o.color);
  return fail(`${o.role} anlaşılamadı.`);
}

/** Birden fazla nokta gösterebilen grup: "ABC", "[AB]", "ABC üçgeni", koordinat. Yeni ad oluşturmaz. */
export function groupPoints(scene: CommandScene, c: Clause, g: Group, color?: string): PointObject[] {
  const label = labelOf(c, g);
  if (!label) return [groupPoint(scene, c, g, { role: 'Nokta', color }).point];
  if (g.coord !== undefined) return [groupPoint(scene, c, g, { role: 'Nokta', color }).point];
  const exact = scene.findPoint(label.text);
  if (exact && !label.bracket) return [exact];
  const pts = scene.pointsFromLabel(label.text);
  if (pts) return pts;
  const shapes = scene.resolveLabel(label, ['segment', 'polygon']);
  if (shapes.length === 1) return scene.definingPointIds(shapes[0]).map(id => scene.point(id));
  return fail(`${label.text} noktası bulunamadı. Önce noktayı oluşturun (ör. “${label.text} (3; 0) noktası oluştur”).`);
}

export function focusPoint(scene: CommandScene, c: Clause): PointObject {
  const lists = c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
  for (const ids of lists) {
    const pts = ids.map(id => scene.get(id)).filter((o): o is PointObject => o?.type === 'point');
    if (pts.length === 1) return pts[0];
    if (pts.length > 1) fail('Birden fazla nokta seçili. Merkez olacak noktayı adıyla yazın (ör. “A merkezli çember çiz”).');
  }
  return fail('Merkez olacak nokta bulunamadı. Noktayı adıyla yazın (ör. “A merkezli çember çiz”).');
}

/** Merkezi çözer; yoksa place() konumunda yeni nokta oluşturur. */
export function resolveCenter(scene: CommandScene, c: Clause, spec: CenterSpec | undefined, place: (() => Point2D) | undefined, color?: string): { point: PointObject; created: boolean } {
  if (!spec) {
    if (!place) fail('Merkezi de yazın (ör. “A merkezli …”).');
    return { point: scene.addPoint(place(), { color }), created: true };
  }
  if ('focus' in spec) return { point: focusPoint(scene, c), created: false };
  if ('origin' in spec) return pointAt(scene, { x: 0, y: 0 }, color);
  if ('point' in spec) return { point: scene.point(spec.point), created: false };
  if ('labelText' in spec) {
    const coord = spec.coord !== undefined ? c.coords[spec.coord] : undefined;
    const existing = scene.findPoint(spec.labelText);
    if (existing && coord && !sameSpot(existing, coord)) fail(`${existing.label} noktası zaten ${formatCoordinate(existing)} konumunda. Başka bir ad yazın ya da koordinatı kaldırın.`);
    if (existing) return { point: existing, created: false };
    if (coord) return { point: scene.addPoint(coord, { label: spec.labelText, color }), created: true };
    if (!place) fail(`${spec.labelText} noktası bulunamadı. Önce noktayı oluşturun (ör. “${spec.labelText} (0; 0) noktası oluştur”).`);
    return { point: scene.addPoint(place(), { label: spec.labelText, color }), created: true };
  }
  return groupPoint(scene, c, spec.group, { create: place, color, role: 'Merkez' });
}

export const at = (p: Point2D) => formatCoordinate(p);

// ---------------------------------------------------------------------------
// Sayı yerine harf/kaydırıcı yazılan ölçüler

const MEASURE_WORD = /^(yaricap|cap|aciklig|aciklik|eksen|genislig|yukseklig)(?:i|lari|leri)?$/;
const MEASURE_NAME: Record<string, string> = { yaricap: 'yarıçapı', cap: 'çapı', aciklig: 'pergel açıklığı', aciklik: 'pergel açıklığı', eksen: 'ekseni', genislig: 'genişliği', yukseklig: 'yüksekliği' };

/**
 * "yarıçapı b olan çember": şekiller kaydırıcıya bağlanamaz (yarıçap sabit sayıdır). "B noktası bulunamadı" demek yerine
 * kaydırıcının güncel değeriyle aynı cümleyi önerir; kaydırıcı yoksa sayı yazılmasını ister.
 */
export function assertNumericMeasures(c: Clause, scene: CommandScene, shape: string, example: string) {
  const w = c.words;
  for (let i = 0; i < w.length; i++) {
    const stem = w[i].match(MEASURE_WORD);
    if (!stem) continue;
    let j = i + 1;
    if (/^(?:uzunlugu|degeri)$/.test(w[j] ?? '')) j++;
    if (w[j] === '=' || w[j] === ':') j++;
    const token = w[j] ?? '';
    const next = w[j + 1] ?? '';
    let name: string | undefined;
    const lm = token.match(/^\$(\d+)$/);
    if (lm) {
      const label = c.labels[Number(lm[1])];
      if (!label || label.bracket) continue;
      const slider = scene.sliders().find(sl => labelKey(sl.variableName) === labelKey(label.text));
      if (!slider || (!label.lowercase && scene.pointsFromLabel(label.text))) continue;
      name = slider.variableName;
    } else if (/^[a-z]$/.test(token) && token !== 'o' && !/^(?:eksen|nokta)/.test(next)) {
      name = token;
    } else continue;
    const measure = MEASURE_NAME[stem[1]] ?? 'ölçüsü';
    const slider = scene.sliders().find(sl => labelKey(sl.variableName) === labelKey(name!));
    if (!slider) fail(`“${name}” bir sayı değil; ${shape} ${measure} için bir sayı yazın (ör. “${example}”).`);
    const value = trNum(slider.value);
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const suggestion = c.raw.replace(new RegExp(`(^|\\s)${escaped}(?=\\s|$|[,.;])`, 'iu'), `$1${value}`);
    fail(`${capitalizeTr(shape)} ${measure} ${slider.variableName} kaydırıcısına bağlanamaz; bir sayı olmalı. ${slider.variableName} kaydırıcısı şu an ${value}: örneğin “${suggestion}” yazın.`);
  }
}

const capitalizeTr = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
