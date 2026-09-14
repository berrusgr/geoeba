import type { MathObject, ObjectType, PolygonObject } from '@/types/math';
import type { Clause } from '../../text';
import type { CommandScene } from '../../scene';

/**
 * Düzenleme komutları için sözcük çözümleme yardımcıları: ad kökleri, Türkçe durum ekleri ve
 * etiketlerin cümledeki görevi (belirtme "ABC'yi", yönelme "AB'ye", tamlayan "ABC'nin").
 */

export type GrammarCase = 'nom' | 'acc' | 'dat' | 'gen' | 'abl' | 'loc' | 'ins';

const CASES: Record<string, GrammarCase> = {};
/** Katlanmış eklerin ünlü uyumlu tüm biçimleri: V ∈ {i,u} (ı/i/u/ü), A ∈ {a,e}. */
const put = (kind: GrammarCase, patterns: string[]) => {
  for (const pattern of patterns) {
    let forms = [''];
    for (const ch of pattern) forms = forms.flatMap(f => ch === 'V' ? [`${f}i`, `${f}u`] : ch === 'A' ? [`${f}a`, `${f}e`] : [`${f}${ch}`]);
    for (const form of forms) CASES[form] ??= kind;
  }
};
put('nom', ['', 'sV']);
put('acc', ['V', 'yV', 'nV', 'sVnV', 'VnV']);
put('dat', ['A', 'yA', 'nA', 'sVnA', 'VnA']);
put('gen', ['Vn', 'nVn', 'sVnVn', 'VnVn']);
put('abl', ['dAn', 'tAn', 'ndAn', 'sVndAn', 'VndAn']);
put('loc', ['dA', 'tA', 'ndA', 'sVndA', 'VndA', 'dAki', 'tAki', 'ndAki', 'sVndAki', 'VndAki']);
put('ins', ['lA', 'ylA', 'VylA', 'sVylA', 'ile']);

export function caseOfSuffix(suffix: string): GrammarCase | undefined {
  return CASES[suffix];
}

export interface NounSpec {
  key: string;
  types: ObjectType[];
  /** Mesajlarda kullanılan Türkçe ad ("çember", "üçgen") */
  noun: string;
  filter?: (o: MathObject, scene: CommandScene) => boolean;
}

const EPS = 1e-6;
function sidesOf(p: PolygonObject, scene: CommandScene): number[] {
  const v = p.pointIds.map(id => scene.get(id)).filter((o): o is Extract<MathObject, { type: 'point' }> => o?.type === 'point');
  return v.map((a, i) => Math.hypot(v[(i + 1) % v.length].x - a.x, v[(i + 1) % v.length].y - a.y));
}
export function isRightQuad(p: MathObject, scene: CommandScene): boolean {
  if (p.type !== 'polygon' || p.pointIds.length !== 4) return false;
  const v = p.pointIds.map(id => scene.get(id));
  if (v.some(o => o?.type !== 'point')) return false;
  const pts = v as Extract<MathObject, { type: 'point' }>[];
  return pts.every((b, i) => {
    const a = pts[(i + 3) % 4], c = pts[(i + 1) % 4];
    const ux = a.x - b.x, uy = a.y - b.y, wx = c.x - b.x, wy = c.y - b.y;
    const scale = Math.hypot(ux, uy) * Math.hypot(wx, wy);
    return scale > 1e-12 && Math.abs(ux * wx + uy * wy) / scale < 1e-6;
  });
}
export function isRegularPolygon(p: MathObject, scene: CommandScene): boolean {
  if (p.type !== 'polygon') return false;
  const s = sidesOf(p, scene);
  if (s.length < 3) return false;
  const max = Math.max(...s);
  if (!(max > 0) || !s.every(l => Math.abs(l - s[0]) <= EPS * max)) return false;
  return s.length !== 4 || isRightQuad(p, scene);
}

const polygonWith = (n?: number, extra?: (o: MathObject, s: CommandScene) => boolean) =>
  (o: MathObject, s: CommandScene) => o.type === 'polygon' && (n === undefined || o.pointIds.length === n) && (!extra || extra(o, s));

const ALL_TYPES: ObjectType[] = ['point', 'segment', 'line', 'ray', 'circle', 'ellipse', 'arc', 'sector', 'angle', 'polygon', 'function', 'slider',
  'fraction', 'pen', 'text', 'image', 'checkbox', 'button', 'input_box', 'measurement'];
const SHAPE_TYPES: ObjectType[] = ['segment', 'line', 'ray', 'circle', 'ellipse', 'arc', 'sector', 'angle', 'polygon', 'function', 'pen', 'fraction', 'image', 'text', 'measurement'];

const spec = (key: string, types: ObjectType[], noun: string, filter?: NounSpec['filter']): NounSpec => ({ key, types, noun, filter });
export const SPECS = {
  point: spec('point', ['point'], 'nokta'),
  segment: spec('segment', ['segment'], 'doğru parçası'),
  line: spec('line', ['line'], 'doğru'),
  ray: spec('ray', ['ray'], 'ışın'),
  circle: spec('circle', ['circle'], 'çember'),
  ellipse: spec('ellipse', ['ellipse'], 'elips'),
  arc: spec('arc', ['arc'], 'yay'),
  sector: spec('sector', ['sector'], 'daire dilimi'),
  angle: spec('angle', ['angle'], 'açı'),
  triangle: spec('triangle', ['polygon'], 'üçgen', polygonWith(3)),
  square: spec('square', ['polygon'], 'kare', polygonWith(4, isRegularPolygon)),
  rectangle: spec('rectangle', ['polygon'], 'dikdörtgen', polygonWith(4, isRightQuad)),
  quad: spec('quad', ['polygon'], 'dörtgen', polygonWith(4)),
  polygon: spec('polygon', ['polygon'], 'çokgen'),
  function: spec('function', ['function'], 'fonksiyon'),
  slider: spec('slider', ['slider'], 'kaydırıcı'),
  text: spec('text', ['text'], 'yazı'),
  fraction: spec('fraction', ['fraction'], 'kesir'),
  checkbox: spec('checkbox', ['checkbox'], 'onay kutusu'),
  inputBox: spec('inputBox', ['input_box'], 'girdi kutusu'),
  button: spec('button', ['button'], 'düğme'),
  image: spec('image', ['image'], 'görsel'),
  pen: spec('pen', ['pen'], 'kalem çizimi'),
  shape: spec('shape', SHAPE_TYPES, 'şekil'),
  object: spec('object', ALL_TYPES, 'nesne'),
} satisfies Record<string, NounSpec>;

const N_GON: [string, number][] = [['besgen', 5], ['altigen', 6], ['yedigen', 7], ['sekizgen', 8], ['dokuzgen', 9], ['ongen', 10], ['onikigen', 12]];

/** Uzundan kısaya: "dikdortgen" "dortgen"den önce denenmeli. */
const STEMS: [string, NounSpec][] = ([
  ['dikdortgen', SPECS.rectangle], ['paralelkenar', SPECS.quad], ['fonksiyon', SPECS.function], ['kaydirici', SPECS.slider], ['parametre', SPECS.slider],
  ['fotograf', SPECS.image], ['cokgen', SPECS.polygon], ['dortgen', SPECS.quad], ['deltoid', SPECS.quad], ['yamuk', SPECS.quad],
  ...N_GON.map(([stem, n]) => [stem, spec(stem, ['polygon'], stem.replace('besgen', 'beşgen').replace('altigen', 'altıgen'), polygonWith(n))] as [string, NounSpec]),
  ['cember', SPECS.circle], ['daire', SPECS.circle], ['dilim', SPECS.sector], ['elips', SPECS.ellipse], ['ucgen', SPECS.triangle], ['kare', SPECS.square],
  ['nokta', SPECS.point], ['dogru', SPECS.line], ['parca', SPECS.segment], ['isin', SPECS.ray], ['yay', SPECS.arc], ['aci', SPECS.angle],
  ['grafik', SPECS.function], ['grafig', SPECS.function], ['parabol', SPECS.function], ['egri', SPECS.function], ['surgu', SPECS.slider],
  ['yazi', SPECS.text], ['metin', SPECS.text], ['metn', SPECS.text], ['not', SPECS.text], ['kesir', SPECS.fraction], ['kesr', SPECS.fraction],
  ['dugme', SPECS.button], ['buton', SPECS.button], ['gorsel', SPECS.image], ['resim', SPECS.image], ['resm', SPECS.image],
  ['sekil', SPECS.shape], ['sekl', SPECS.shape], ['nesne', SPECS.object],
] as [string, NounSpec][]).sort((a, b) => b[0].length - a[0].length);

export interface NounWord {
  index: number;
  spec: NounSpec;
  plural: boolean;
  grammarCase: GrammarCase;
  word: string;
}

const DIRECTION_WORD = /^(?:saga|sola|yukari(?:ya)?|asagi(?:ya)?|ileri|geri|merkeze|disa|ice|bana|ona)$/;

/** Tek bir sözcüğü ad olarak çözümler. Bağlam: önceki/sonraki sözcük ("doğru parçası", "onay kutusu", "sağa doğru"). */
export function nounAt(words: string[], index: number): NounWord | null {
  const word = words[index];
  if (!word || /^[$#@"]/.test(word)) return null;
  const prev = words[index - 1] ?? '', next = words[index + 1] ?? '';
  if (/^kutu/.test(word)) {
    const s = /^(?:onay|isaret)$/.test(prev) ? SPECS.checkbox : /^(?:girdi|giris)$/.test(prev) ? SPECS.inputBox : null;
    return s ? withSuffix(word, 'kutu', s, index) : null;
  }
  if (/^cizim/.test(word) && /^(?:kalem|serbest)$/.test(prev)) return withSuffix(word, 'cizim', SPECS.pen, index);
  if (word === 'kalem' && /^cizim/.test(next)) return null;
  for (const [stem, s] of STEMS) {
    if (!word.startsWith(stem)) continue;
    if (stem === 'dogru' && /^parca/.test(next)) return null;
    if (stem === 'daire' && /^dilim/.test(next)) return null;
    const found = withSuffix(word, stem, s, index);
    if (!found) continue;
    // "sağa doğru" gibi zarf kullanımı ad değildir
    if (stem === 'dogru' && found.word === 'dogru' && DIRECTION_WORD.test(prev)) return null;
    return found;
  }
  return null;
}

function withSuffix(word: string, stem: string, s: NounSpec, index: number): NounWord | null {
  let rest = word.slice(stem.length);
  let plural = false;
  if (/^l[ae]r/.test(rest)) { plural = true; rest = rest.slice(3); }
  const grammarCase = caseOfSuffix(rest);
  if (grammarCase === undefined) return null;
  return { index, spec: s, plural, grammarCase, word };
}

export function clauseNouns(c: Clause): NounWord[] {
  const out: NounWord[] = [];
  for (let i = 0; i < c.words.length; i++) {
    const n = nounAt(c.words, i);
    if (n) out.push(n);
  }
  return out;
}

export function labelWordIndex(c: Clause, i: number): number {
  const re = new RegExp(`^\\$${i}(?!\\d)`);
  return c.words.findIndex(w => re.test(w));
}

/** Etiketin hemen ardından gelen ad ("AB doğrusunu", "A noktasına"). */
export function labelNoun(c: Clause, i: number): NounWord | null {
  const at = labelWordIndex(c, i);
  if (at < 0 || c.labels[i]?.suffix) return null;
  let j = at + 1;
  if (c.words[j] === 'dogru' && /^parca/.test(c.words[j + 1] ?? '')) j++;
  return nounAt(c.words, j);
}

const BARE_SUFFIX = /^(?:yi|yu|i|u|nin|nun|in|un|ye|ya|e|a|den|dan|ten|tan|de|da|le|la|yle|yla)$/;

/** Etiketin cümledeki görevi: ekinden ya da ardından gelen addan. */
export function labelRole(c: Clause, i: number): GrammarCase {
  const ref = c.labels[i];
  if (!ref) return 'nom';
  if (ref.suffix) return caseOfSuffix(ref.suffix) ?? 'nom';
  const at = labelWordIndex(c, i);
  const place = (word: string | undefined): GrammarCase | undefined => {
    const m = (word ?? '').match(/^(?:uzer|ust)(ine|inde|inden|i)$/);
    return m ? (m[1] === 'ine' ? 'dat' : m[1] === 'inde' ? 'loc' : m[1] === 'inden' ? 'abl' : 'acc') : undefined;
  };
  if (ref.suffix) {
    const role = caseOfSuffix(ref.suffix) ?? 'nom';
    // "AB'nin üzerine" → yönelme
    return role === 'gen' ? place(c.words[at + 1]) ?? role : role;
  }
  const next = c.words[at + 1] ?? '';
  if (BARE_SUFFIX.test(next)) {
    const role = caseOfSuffix(next) ?? 'nom';
    return role === 'gen' ? place(c.words[at + 2]) ?? role : role;
  }
  const direct = place(next);
  if (direct) return direct;
  const noun = labelNoun(c, i);
  // "AB doğrusu üzerine", "AB doğrusunun üzerinde"
  if (noun && (noun.grammarCase === 'nom' || noun.grammarCase === 'gen')) return place(c.words[noun.index + 1]) ?? noun.grammarCase;
  return noun?.grammarCase ?? 'nom';
}

// ----------------------------------------------------------------------------- ortak kalıplar (katlanmış metin)

/** Yeni nesne oluşturma fiilleri ("yap" ve "olsun" hariç: onlar düzenlemede de kullanılır). */
export const STRONG_CREATE = /\b(?:ciz(?!il|g|im|di)|olustur(?!ul|du)|ekle(?!n|di)|koy(?!ul|u\b|du)|yerlestir(?!il|di)|tanimla(?!n|di)|uret(?!il|ti)|birlestir(?!il|di))/;
export const SET_VERB = /\b(?:yap(?!ist|i\b)|olsun|ayarla|degistir|esitle|guncelle|getir|cevir|duzelt)/;
export const QUANTIFIER = /\b(?:tum|butun|hepsi|hepsini|tamami|tamamini|her)\b/;
/** "tümünü sil", "her şeyi seç", "tuvali temizle" gibi sahnenin tamamına yönelik (uygulama ailesi) ifadeler. */
export const WHOLE_SCENE = /\b(?:tumunu|hepsini|her seyi|hersey\w*|tamamini|tuval\w*|ekrani|sahneyi|calisma alanini|cizimi)\b/;
export const HIDDEN_WORDS = /\b(?:gizli|gizlen(?:en|mis)\w*|gorunmeyen\w*|gorunmez olan\w*|sakli|gizledig\w*|sakladig\w*)\b/;
