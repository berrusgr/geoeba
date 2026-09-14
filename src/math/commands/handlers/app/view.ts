import type { MathObject, ObjectType, ViewportTransform } from '@/types/math';
import { type CommandScene, fail, tidy, trNum } from '../../scene';
import type { Clause, NounKind } from '../../text';
import type { AppAction, CommandHandler } from '../../types';
import { MAX_ZOOM, MIN_ZOOM, OFF, ON, TOGGLE, actOnce, clamp, joinTr, plainOf, refersToObjects, viewportOf } from './shared';

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);

// ---------------------------------------------------------------------------------------------- aç / kapat
type Flag = 'showGrid' | 'showAxes' | 'showCoordinates' | 'showQuadrants' | 'showMeasurements' | 'snapToGrid' | 'blackWhite';
const FLAGS: { flag: Flag; re: RegExp; name: string; defaultOn?: boolean }[] = [
  { flag: 'snapToGrid', re: /\bizgaraya (?:yapistir|yapis|hizala|otur|kilitle|sabitle|yasla|cek|miknatis)\w*|\b(?:izgara )?yapistirma(?:yi|si|sini)?\b|\bizgara yakala\w*|\bmiknatis\w*|\bsnap\b/g, name: 'ızgaraya yapıştırma', defaultOn: true },
  { flag: 'blackWhite', re: /\bsiyah (?:ve )?beyaz\w*|\bgri ?ton\w*|\brenksiz\b|\bfotokopi\w*|\brenkli(?:ye)?\b(?: (?:gorunum|mod|hal|gec|don|yap)\w*)?/g, name: 'siyah–beyaz görünüm', defaultOn: true },
  { flag: 'showGrid', re: /\bizgara(?!ya\b)(?:lar|lari|larini|yi|nin|si|sini)?\b(?: cizgi\w*)?|\bgrid\b|\bkareli (?:arka ?plan|zemin|kagit|gorunum)\w*/g, name: 'ızgara' },
  { flag: 'showAxes', re: /\b(?:x ve y |koordinat )?eksen(?:ler|leri|lerini|lerin|i|ini|in)?\b/g, name: 'eksenler' },
  { flag: 'showCoordinates', re: /(?<!dik )\b(?:nokta )?koordinat(?:lar|lari|larini|i|ini)?\b(?! (?:eksen|duzlem|sistem|plan|izgara))(?: yazi\w*)?/g, name: 'nokta koordinatları' },
  { flag: 'showQuadrants', re: /\bceyrek bolge\w*(?: (?:ad|isim)\w*)?|\bbolge(?:ler|leri|lerini|lerin)?\b(?: (?:ad|isim)\w*)?|\bbolge (?:ad|isim)\w*/g, name: 'çeyrek bölge adları' },
  { flag: 'showMeasurements', re: /\b(?:tum |butun )?olcum(?:ler|leri|lerini)?\b(?! kutu)(?: (?:etiket|yazi)\w*)?|\b(?:tum |butun )?olculer(?:i)?\b/g, name: 'ölçümler' },
];
const FILLER = /\b(?:tum|butun|hepsini|lutfen|ekranda|tuvalde|ve|de|da|bir|simdi)\b/g;
const SHAPE_NOUNS: NounKind[] = ['point', 'segment', 'line', 'ray', 'circle', 'ellipse', 'arc', 'sector', 'angle', 'triangle', 'square', 'rectangle', 'polygon'];

type FlagState = boolean | 'toggle' | undefined;
interface FlagPlan { flags: Flag[]; states: FlagState[]; complete: boolean }

/** Cümledeki aç/kapat fiilleri, sırayla. */
function verbsIn(text: string): { index: number; value: boolean }[] {
  const found: { index: number; value: boolean }[] = [];
  for (const [re, value] of [[ON, true], [OFF, false]] as const) {
    for (const m of text.matchAll(new RegExp(re.source, 'g'))) found.push({ index: m.index!, value });
  }
  return found.sort((a, b) => a.index - b.index);
}

function planFlags(c: Clause): FlagPlan | null {
  // "kareli kağıt olsun", "koordinat sistemini göster" düzlem türüdür.
  if (refersToObjects(c) || c.quotes.length || modePlan(c)) return null;
  const full = plainOf(c);
  if (/\bgore\b|\bkes\w*/.test(full) || c.hasVerb('reflect', 'rotate', 'translate')) return null;
  // "koordinat ızgarası" ızgaranın kendisidir, nokta koordinatları değil (aynı uzunlukta boşlukla silinir).
  let text = full.replace(/\bkoordinat (?=izgara)/g, s => ' '.repeat(s.length));
  const flags: Flag[] = [], positions: number[] = [];
  for (const f of FLAGS) {
    const re = new RegExp(f.re.source, 'g');
    const first = re.exec(text);
    if (!first) continue;
    flags.push(f.flag);
    positions.push(first.index);
    // Aynı uzunlukta boşlukla sil: fiillerin konumları kaymasın.
    text = text.replace(new RegExp(f.re.source, 'g'), s => ' '.repeat(s.length));
  }
  if (!flags.length) return null;
  // "eksenleri gizle ızgarayı göster" (sesli komutta bağlaçsız): her ayar kendisinden sonraki fiili alır.
  const toggle = TOGGLE.test(full);
  // "ızgarayı göstermek istemiyorum": mastar isteğin nesnesidir, açma fiili değil (aynı uzunlukta boşlukla silinir).
  const verbs = toggle ? [] : verbsIn(full.replace(/\bgoster\w* (?=istemiyorum\b|istemem\b)/g, s => ' '.repeat(s.length)));
  const mixed = new Set(verbs.map(v => v.value)).size > 1;
  const states: FlagState[] = flags.map((_, i) => {
    if (toggle) return 'toggle';
    if (!verbs.length) return undefined;
    if (!mixed) return verbs[0].value;
    return (verbs.find(v => v.index > positions[i]) ?? verbs[verbs.length - 1]).value;
  });
  // "ölçüleri gizle" genel ayardır; "ölçüleri göster" ya da "üçgenin ölçüleri" ölçme ailesine kalır.
  const m = flags.indexOf('showMeasurements');
  if (m >= 0 && !/\bolcum/.test(full) && (states[m] !== false || c.hasNoun(...SHAPE_NOUNS))) return null;
  const complete = !text.replace(FILLER, ' ').trim();
  return { flags, states, complete };
}

export const viewToggle: CommandHandler = {
  id: 'app.view',
  examples: ['ızgarayı gizle', 'ızgarayı göster', 'eksenleri gizle', 'koordinatları gizle', 'çeyrek bölgeleri göster', 'ızgaraya yapıştır', 'ızgaraya yapıştırmayı kapat',
    'siyah beyaz görünüme geç', 'renkli görünüme dön', 'tüm ölçümleri gizle', 'ölçümleri göster', 'ızgarayı ve eksenleri gizle', 'ızgarayı aç kapa'],
  match(c) {
    const plan = planFlags(c);
    if (!plan) return 0;
    if (plan.states.some(s => s !== undefined)) return 90;
    if (plan.flags.every(f => FLAGS.find(x => x.flag === f)!.defaultOn)) return 90;
    return plan.complete ? 86 : 0;
  },
  run(c, scene) {
    const plan = planFlags(c);
    if (!plan) fail('Görünüm ayarı bulunamadı.');
    const vp = viewportOf(scene);
    const patch: Partial<ViewportTransform> = {};
    const shown: string[] = [], hidden: string[] = [], sentences: string[] = [];
    const renkli = /\brenkli/.test(plainOf(c)) && !/\bsiyah/.test(plainOf(c));
    plan.flags.forEach((flag, i) => {
      const state = plan.states[i];
      const info = FLAGS.find(f => f.flag === flag)!;
      const current = Boolean(vp[flag]);
      let value: boolean;
      if (state === 'toggle') value = !current;
      else if (state === undefined) value = info.defaultOn ? !(flag === 'blackWhite' && renkli) : !current;
      else value = state;
      if (flag === 'blackWhite' && renkli && state !== 'toggle') value = state === false ? true : false;
      patch[flag] = value;
      if (flag === 'snapToGrid') sentences.push(`Izgaraya yapıştırma ${value ? 'açıldı' : 'kapatıldı'}.`);
      else if (flag === 'blackWhite') sentences.push(value ? 'Siyah–beyaz görünüm açıldı.' : 'Renkli görünüme dönüldü.');
      else (value ? shown : hidden).push(info.name);
    });
    if (patch.showQuadrants && !vp.showAxes && patch.showAxes === undefined) { patch.showAxes = true; shown.push('eksenler'); }
    if (shown.length) sentences.unshift(`${capitalize(joinTr(shown))} gösterildi.`);
    if (hidden.length) sentences.unshift(`${capitalize(joinTr(hidden))} gizlendi.`);
    scene.act({ kind: 'viewport', patch });
    if (patch.showMeasurements) actOnce(scene, { kind: 'styleMode', mode: 'Ayrıntılı' });
    scene.say(sentences.join(' '));
  },
};

// ---------------------------------------------------------------------------------------------- yakınlaştırma
const ZOOM_IN = /\byakinlas\w*|\bzoom in\b|\bzoom yap\w*|\b(?:gorunumu|ekrani|goruntuyu|tuvali) (?:biraz |cok )?buyut\w*|\bbuyut\w* (?:gorunumu|ekrani|goruntuyu|tuvali)\b|\b(?:daha )?yakindan goster\w*/;
const ZOOM_OUT = /\buzaklas\w*|\bzoom out\b|\b(?:gorunumu|ekrani|goruntuyu|tuvali) (?:biraz |cok )?kucult\w*|\bkucult\w* (?:gorunumu|ekrani|goruntuyu|tuvali)\b|\b(?:daha )?uzaktan goster\w*/;
const FIT = /\bsigdir\w*|\bekrana sig\w*|\b(?:tumunu|hepsini|her seyi|tum cizimi|butun cizimi|tum sekilleri|tum nesneleri) ekranda goster\w*|\b(?:cizimi|sekilleri|tumunu|hepsini|nesneleri) ortala\w*|\bhepsini gor\w*/;
const RESET = /\bgorunum\w* (?:sifirla|varsayilan|eski hal|ilk hal)\w*|\bvarsayilan gorunum\w*|\b(?:yakinlastirma|yakinlastirmayi|zoom|zoomu|olcek|olcegi) sifirla\w*|\borijine (?:don|git|gel)\w*|\b(?:orijini|orjini|baslangic noktasini) ortala\w*|\bbaslangic gorunum\w*|\bsifirla\w* (?:gorunum|yakinlastirma|zoom|olcek)\w*|\b(?:orijini|orjini|baslangic noktasini) (?:merkeze|ortaya) (?:al|getir|koy)\w*|\b(?:baslangic noktasina|orijin noktasina|sifir sifir noktasina) (?:don|git|gel)\w*|\b(?:ekrani|gorunumu|tuvali|sayfayi|goruntuyu) ortala\w*/;
const FOCUS = /\bortala\w*|\bodaklan\w*|\bodakla\w*/;
const PAN = /\b(?:tuvali|gorunumu|ekrani|sayfayi|goruntuyu|cizim alanini)\b.*?\b(saga|sola|yukari|asagi|yukariya|asagiya)\b.*?\b(?:kaydir|tasi|surukle|cek)\w*/;

type ZoomKind = 'reset' | 'fit' | 'pan' | 'target' | 'in' | 'out';

/** "üçgene yakınlaştır", "çembere odaklan": ad yazılmadan şekil türüyle hedef. Sıra önemli (üçgen çokgenden, parça doğrudan önce). */
const NOUN_TARGETS: { noun: NounKind; types: ObjectType[]; name: string; filter?: (o: MathObject) => boolean }[] = [
  { noun: 'triangle', types: ['polygon'], name: 'üçgen', filter: o => o.type === 'polygon' && o.pointIds.length === 3 },
  { noun: 'square', types: ['polygon'], name: 'kare', filter: o => o.type === 'polygon' && o.pointIds.length === 4 },
  { noun: 'rectangle', types: ['polygon'], name: 'dikdörtgen', filter: o => o.type === 'polygon' && o.pointIds.length === 4 },
  { noun: 'polygon', types: ['polygon'], name: 'çokgen' },
  { noun: 'segment', types: ['segment'], name: 'doğru parçası' },
  { noun: 'ray', types: ['ray'], name: 'ışın' },
  { noun: 'line', types: ['line'], name: 'doğru' },
  { noun: 'sector', types: ['sector'], name: 'daire dilimi' },
  { noun: 'circle', types: ['circle'], name: 'çember' },
  { noun: 'ellipse', types: ['ellipse'], name: 'elips' },
  { noun: 'arc', types: ['arc'], name: 'yay' },
  { noun: 'angle', types: ['angle'], name: 'açı' },
  { noun: 'point', types: ['point'], name: 'nokta' },
  { noun: 'text', types: ['text'], name: 'yazı' },
];

function nounTarget(c: Clause) {
  if (c.labels.length || c.refersToSelection || c.refersToLast) return undefined;
  if (/\b(?:ciz|olustur|ekle|koy)\w*/.test(plainOf(c))) return undefined;
  return NOUN_TARGETS.find(t => c.hasNoun(t.noun));
}

function zoomKind(c: Clause): ZoomKind | null {
  const text = plainOf(c);
  if (RESET.test(text)) return 'reset';
  if (FIT.test(text) && !c.labels.length) return 'fit';
  if (PAN.test(text) && !c.labels.length) return 'pan';
  if (refersToObjects(c) && (FOCUS.test(text) || ZOOM_IN.test(text))) return 'target';
  if (c.labels.length) return null;
  if ((FOCUS.test(text) || /\byakinlas\w*/.test(text)) && nounTarget(c)) return 'target';
  if (ZOOM_IN.test(text)) return 'in';
  if (ZOOM_OUT.test(text)) return 'out';
  return null;
}

function zoomFactor(c: Clause, zoomIn: boolean): number {
  const text = plainOf(c);
  const kat = c.text.match(/#(\d+)\s*kat\w*/);
  const pct = c.text.match(/\byuzde\s*#(\d+)/);
  const times = c.text.match(/#(\d+)\s*(?:kez|kere|defa|sefer|adim|kademe)\w*/);
  let factor = 1.2;
  if (kat) {
    const n = c.num(`#${kat[1]}`);
    if (!(n > 0 && n <= 100) || n === 1) fail('Yakınlaştırma katı 0 ile 100 arasında ve 1’den farklı olmalı (ör. “2 kat yakınlaştır”).');
    factor = zoomIn ? n : 1 / n;
  } else if (pct) {
    const p = c.num(`#${pct[1]}`);
    if (!(p > 0 && p <= 10000) || (!zoomIn && p === 100)) fail('Yüzdeyi 0’dan büyük yazın (ör. “yüzde 150 yakınlaştır”).');
    factor = zoomIn ? (p > 100 ? p / 100 : 1 + p / 100) : (p < 100 ? 1 - p / 100 : 100 / p);
  } else if (times) {
    const n = c.num(`#${times[1]}`);
    if (!Number.isInteger(n) || n < 1 || n > 20) fail('Adım sayısı 1 ile 20 arasında bir tam sayı olmalı (ör. “3 kez uzaklaştır”).');
    factor = zoomIn ? 1.2 ** n : 1 / 1.2 ** n;
  } else if (/\bbiraz\b/.test(text)) factor = zoomIn ? 1.1 : 1 / 1.1;
  else if (/\bcok\b/.test(text)) factor = zoomIn ? 2 : 0.5;
  else {
    // "yakınlaştır yakınlaştır" (sesli komutta tekrar): her tekrar bir adım.
    const repeats = Math.min(5, Math.max(1, (text.match(zoomIn ? /\byakinlas\w*/g : /\buzaklas\w*/g) ?? []).length));
    factor = zoomIn ? 1.2 ** repeats : 1 / 1.2 ** repeats;
  }
  return factor;
}

function objectsFor(c: Clause, scene: CommandScene): MathObject[] {
  const found: MathObject[] = [];
  if (c.labels.length) {
    for (const ref of c.labels) {
      let objects = scene.resolveLabel(ref);
      if (!objects.length) objects = scene.pointsFromLabel(ref.text) ?? [];
      if (!objects.length) fail(`${ref.text} adlı nesne bulunamadı. Adı kontrol edin (ör. “ABC üçgenine yakınlaştır”).`);
      found.push(...objects);
    }
  } else if (nounTarget(c)) {
    const spec = nounTarget(c)!;
    found.push(...scene.targets(c, { types: spec.types, noun: spec.name, filter: spec.filter }));
  } else {
    const ids = c.refersToSelection ? scene.selection : scene.focus.length ? scene.focus : scene.selection;
    found.push(...ids.map(id => scene.get(id)).filter((o): o is MathObject => !!o));
    if (!found.length) fail('Hangi nesneye odaklanayım? Adını yazın (ör. “A noktasını ortala”) ya da önce seçin.');
  }
  return [...new Set(found)];
}

export const zoom: CommandHandler = {
  id: 'app.zoom',
  examples: ['yakınlaştır', 'biraz uzaklaştır', '2 kat yakınlaştır', '3 kez uzaklaştır', 'yüzde 150 yakınlaştır', 'hepsini ekrana sığdır', 'görünümü sıfırla', 'orijine dön',
    'ABC üçgenine yakınlaştır', 'A noktasını ortala', 'tuvali 3 birim sağa kaydır'],
  match(c) {
    const kind = zoomKind(c);
    return kind ? 90 : 0;
  },
  run(c, scene) {
    const kind = zoomKind(c);
    const vp = viewportOf(scene);
    const text = plainOf(c);
    if (kind === 'reset') {
      scene.act({ kind: 'resetView' });
      scene.say('Görünüm sıfırlandı: başlangıç noktası ortada, varsayılan yakınlaştırma.');
      return;
    }
    if (kind === 'fit') {
      scene.act({ kind: 'fitView' });
      scene.say(scene.objects.length ? 'Tüm çizim ekrana sığdırıldı.' : 'Tuval boş; görünüm başlangıç noktasına ortalandı.');
      return;
    }
    if (kind === 'pan') {
      const m = text.match(PAN)!;
      const dir = m[1].replace(/ya$/, '');
      const horizontal = dir === 'saga' || dir === 'sola';
      const numberRef = c.text.match(/#(\d+)/);
      let d = numberRef ? c.num(numberRef[0]) : Math.max(1, Math.round((horizontal ? vp.width : vp.height) / vp.zoom / 4));
      if (!(d > 0 && d <= 10000)) fail('Kaydırma miktarı 0’dan büyük olmalı (ör. “tuvali 3 birim sağa kaydır”).');
      d = tidy(d);
      const patch: Partial<ViewportTransform> = horizontal
        ? { panX: tidy(vp.panX + (dir === 'saga' ? 1 : -1) * d * vp.zoom) }
        : { panY: tidy(vp.panY + (dir === 'yukari' ? -1 : 1) * d * vp.zoom) };
      const word = { saga: 'sağa', sola: 'sola', yukari: 'yukarı', asagi: 'aşağı' }[dir as 'saga'];
      scene.act({ kind: 'viewport', patch });
      scene.say(`Görünüm kaydırıldı: çizim ekranda ${trNum(d)} birim ${word} gitti.`);
      return;
    }
    if (kind === 'target') {
      const objects = objectsFor(c, scene);
      const pointIds = objects.flatMap(o => scene.definingPointIds(o));
      const list = [...objects, ...pointIds.map(id => scene.get(id)).filter((o): o is MathObject => !!o)];
      const box = scene.bbox(list);
      if (!box) fail('Bu nesnenin konumu hesaplanamadı; görünür bir nesne adı yazın.');
      const cx = (box.minX + box.maxX) / 2, cy = (box.minY + box.maxY) / 2;
      const centerOnly = FOCUS.test(text) && /\bortala/.test(text) && !ZOOM_IN.test(text);
      const pad = 1.5;
      const w = Math.max(2, box.maxX - box.minX + 2 * pad), h = Math.max(2, box.maxY - box.minY + 2 * pad);
      const z = centerOnly ? vp.zoom : clamp(Math.min(vp.width / w, vp.height / h), MIN_ZOOM, MAX_ZOOM);
      // "|| 0": −0 değerleri düz 0 olsun (kayıtlı görünümde −0 görünmesin).
      const patch: Partial<ViewportTransform> = { zoom: tidy(z), panX: tidy(-cx * z) || 0, panY: tidy(cy * z) || 0 };
      const names = joinTr([...new Set(objects.map(o => o.label))].slice(0, 4));
      scene.act({ kind: 'viewport', patch });
      scene.setFocus(objects.map(o => o.id));
      scene.say(centerOnly ? `Görünüm ${names} üzerine ortalandı.` : `Görünüm ${names} üzerine yakınlaştırıldı.`);
      return;
    }
    const zoomIn = kind === 'in';
    const factor = zoomFactor(c, zoomIn);
    if (scene.options.viewport) {
      const next = clamp(vp.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      if (Math.abs(next - vp.zoom) < 1e-9) { scene.say(zoomIn ? 'Görünüm zaten en yakın ölçekte.' : 'Görünüm zaten en uzak ölçekte.'); return; }
    }
    const action: AppAction = { kind: 'zoom', factor: tidy(factor) };
    scene.act(action);
    scene.say(zoomIn ? `Görünüm ${trNum(factor)} kat yakınlaştırıldı.` : `Görünüm ${trNum(1 / factor)} kat uzaklaştırıldı.`);
  },
};

// ---------------------------------------------------------------------------------------------- görünüm biçimi ve düzlem
const PLANE_WORD = /\b(?:duzlem|kagi[td]|zemin|sayfa|defter|gorunum|gec|yap|olsun|ac|kullan|don)\w*/;
type PlanePlan = { kind: 'mode'; mode: 'Sade' | 'Ayrıntılı' } | { kind: 'plane'; plane: 'dik_koordinat' | 'kareli_duzlem' | 'bos_duzlem' };

function modePlan(c: Clause): PlanePlan | null {
  if (refersToObjects(c)) return null;
  const text = plainOf(c);
  if (/\bsadelestir\w*/.test(text) || (/\bsade(?:ye|lik)?\b/.test(text) && PLANE_WORD.test(text))) return { kind: 'mode', mode: 'Sade' };
  if ((/\b(?:ayrintili|detayli)\w*/.test(text) && PLANE_WORD.test(text)) || /\bayrintilari goster\w*/.test(text)) return { kind: 'mode', mode: 'Ayrıntılı' };
  // "kareli zemini kaldır" düzlem seçimi değil, ızgarayı gizlemektir (görünüm aç/kapat işleyicisi).
  if (/\bkareli\b/.test(text) && PLANE_WORD.test(text) && !OFF.test(text)) return { kind: 'plane', plane: 'kareli_duzlem' };
  if (/\bbos (?:duzlem|zemin|sayfa|kagi[td]|beyaz)\w*|\bduz beyaz (?:zemin|sayfa)\w*|\bbeyaz (?:zemin|sayfa|kagi[td]|duzlem)\w*/.test(text)) return { kind: 'plane', plane: 'bos_duzlem' };
  if (/\bdik koordinat\w*|\bkoordinat (?:duzlem|sistem|plan)\w*|\banalitik duzlem\w*/.test(text)) {
    return { kind: 'plane', plane: OFF.test(text) ? 'bos_duzlem' : 'dik_koordinat' };
  }
  return null;
}

const PLANES = {
  dik_koordinat: { patch: { showGrid: true, showAxes: true, showCoordinates: true }, message: 'Dik koordinat düzlemine geçildi: ızgara, eksenler ve koordinatlar gösteriliyor.' },
  kareli_duzlem: { patch: { showGrid: true, showAxes: false, showCoordinates: false }, message: 'Kareli düzleme geçildi: yalnızca ızgara gösteriliyor.' },
  bos_duzlem: { patch: { showGrid: false, showAxes: false, showCoordinates: false }, message: 'Boş düzleme geçildi: ızgara, eksenler ve koordinatlar gizlendi.' },
} as const;

export const viewMode: CommandHandler = {
  id: 'app.viewMode',
  examples: ['sade görünüme geç', 'ayrıntılı görünüme geç', 'kareli düzleme geç', 'boş düzlem yap', 'dik koordinat düzlemine geç', 'koordinat sistemini göster'],
  match(c) { return modePlan(c) ? 90 : 0; },
  run(c, scene) {
    const plan = modePlan(c);
    if (!plan) fail('Görünüm biçimi bulunamadı.');
    if (plan.kind === 'mode') {
      const detailed = plan.mode === 'Ayrıntılı';
      scene.act({ kind: 'styleMode', mode: plan.mode });
      scene.act({ kind: 'viewport', patch: { showCoordinates: detailed, showMeasurements: detailed } });
      scene.say(detailed ? 'Ayrıntılı görünüme geçildi: koordinatlar ve ölçümler gösteriliyor.' : 'Sade görünüme geçildi: koordinatlar ve ölçümler gizlendi.');
      return;
    }
    const info = PLANES[plan.plane];
    scene.act({ kind: 'planeType', plane: plan.plane });
    scene.act({ kind: 'viewport', patch: { ...info.patch } });
    scene.say(info.message);
  },
};
