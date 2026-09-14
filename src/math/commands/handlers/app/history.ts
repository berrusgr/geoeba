import { fail } from '../../scene';
import type { Clause } from '../../text';
import type { CommandHandler } from '../../types';
import { actOnce, clamp, plainOf } from './shared';

/** Geçmiş en fazla 120 adım tutar (WorkspaceContext appendHistory). */
const MAX_STEPS = 120;

const UNDO = /\bgeri al(?!ma(?:yin|yiniz|sin|yalim)?\b|in(?:an|mis|di))\w*|\bgerial\w*|\bonceki (?:adima|duruma|hale|haline) (?:don|gec|getir)\w*|\bbir adim geri (?:don|git|gel)\w*|\bgeri (?:don|git)(?:elim|in|er misin)?\b|\b(?:ctrl|kontrol|control) z\b|\b(?:son (?:islemi|adimi|degisikligi|hamleyi|yaptigimi)|yaptigim (?:son )?(?:islemi|degisikligi)) iptal et\w*/;
const REDO = /\byinele\w*|\bileri al\w*|\bgeri alin\w*(?: islem\w*)? (?:geri getir|yinele|yeniden yap|tekrar yap|geri al)\w*|\bgeri ald(?:igimi|iklarimi|igimizi|iklarimizi) (?:geri getir|yinele|yeniden yap|tekrar yap)\w*|\bgeri almayi geri al\w*|\b(?:tekrar|yeniden) yap(?:in|ar misin|abilir misin|alim)?\b|\b(?:adim )?ileri (?:git|gel)(?:elim|in|er misin)?\b|\b(?:ctrl|kontrol|control) y\b/;
const ALL_STEPS = /\b(?:tum|butun|hepsini|tamamini|her seyi|herseyi) ?(?:islemleri|adimlari|degisiklikleri)?\b/;
/** "ABC'yi geri al" gibi bir nesneye bağlı değil, işlem geçmişine yönelik mi? */
const HISTORY_WORDS = /\b(?:islem|adim|degisiklik|hamle|kez|kere|defa|sefer|son|yaptigim|yanlis|hata)\w*|\b[a-z]+[dt][iu]m\b/;
/** Aynı fiilin sayısız tekrarı ("geri al geri al"): her tekrar bir adım. */
const REPEAT = { undo: /\bgeri al(?!ma\w*\s+geri al)\w*|\bgerial\w*|\b(?:ctrl|kontrol|control) z\b/g, redo: /\byinele\w*|\bileri al\w*|\b(?:ctrl|kontrol|control) y\b/g };

function stepCount(c: Clause, verb: 'undo' | 'redo'): number {
  const m = c.text.match(/#(\d+)\s*(?:adim|kez|kere|defa|sefer|islem|tane|hamle|degisiklik)\w*/)
    ?? c.text.match(/\bson\s+#(\d+)\b/)
    ?? (c.numbers.length === 1 ? ['', '0'] : null);
  if (m) {
    const n = c.numbers[Number(m[1])];
    if (!Number.isInteger(n) || n < 1 || n > MAX_STEPS) {
      fail(`Adım sayısı 1 ile ${MAX_STEPS} arasında bir tam sayı olmalı (ör. “2 adım ${verb === 'undo' ? 'geri al' : 'yinele'}”).`);
    }
    return n;
  }
  const text = plainOf(c);
  if (/\b(?:tum|butun|hepsini|tamamini|her seyi|herseyi)\b/.test(text) && ALL_STEPS.test(text)) return MAX_STEPS;
  return clamp((text.match(REPEAT[verb]) ?? []).length, 1, MAX_STEPS);
}

function historyMatch(c: Clause, re: RegExp): boolean {
  const text = plainOf(c);
  if (!re.test(text)) return false;
  // Nesne adı geçen "A'yı geri al" gibi cümleler geçmişe değil nesneye yöneliktir.
  if (c.labels.length && !HISTORY_WORDS.test(text)) return false;
  return true;
}

export const undo: CommandHandler = {
  id: 'app.undo',
  examples: ['geri al', 'Geri al lütfen', '2 adım geri al', 'son üç işlemi geri al', 'iki kez geri al', 'son işlemi geri alır mısın', 'önceki adıma dön'],
  match(c) {
    if (REDO.test(plainOf(c))) return 0;
    return historyMatch(c, UNDO) ? 94 : 0;
  },
  run(c, scene) {
    const count = stepCount(c, 'undo');
    scene.act(count > 1 ? { kind: 'undo', count } : { kind: 'undo' });
    scene.say(count >= MAX_STEPS ? 'Tüm işlemler geri alınıyor.' : count > 1 ? `Son ${count} işlem geri alındı.` : 'Son işlem geri alındı.');
  },
};

export const redo: CommandHandler = {
  id: 'app.redo',
  examples: ['yinele', 'ileri al', '2 adım yinele', 'geri alınanı yinele', 'son işlemi yeniden yap', 'geri almayı geri al'],
  match(c) {
    const text = plainOf(c);
    if (!historyMatch(c, REDO)) return 0;
    // "tekrar yap" yalnızca nesne/şekil adı geçmiyorsa geçmiş komutudur ("üçgeni tekrar yap" değil).
    if (!/\byinele|\bileri al|\bgeri al/.test(text) && (c.hasNoun(...NOUN_KINDS) || c.labels.length)) return 0;
    return 94;
  },
  run(c, scene) {
    const count = stepCount(c, 'redo');
    scene.act(count > 1 ? { kind: 'redo', count } : { kind: 'redo' });
    scene.say(count >= MAX_STEPS ? 'Geri alınan tüm işlemler yineleniyor.' : count > 1 ? `Geri alınan ${count} işlem yinelendi.` : 'Geri alınan işlem yinelendi.');
  },
};

const NOUN_KINDS = ['point', 'segment', 'line', 'ray', 'circle', 'ellipse', 'arc', 'sector', 'angle', 'triangle', 'square', 'rectangle', 'polygon', 'function', 'slider', 'text', 'fraction'] as const;

/** Tüm çizim anlamına gelen genel adlar ("tüm çemberleri sil" gibi türe göre silme düzenleme ailesinindir). */
const EVERYTHING = '(?:tumunu|hepsini|her seyi|herseyi|tamamini|(?:tum|butun) (?:cizimi|cizimleri|nesneleri|sekilleri|objeleri|ogeleri|seyleri|tuvali|sayfayi))';
const CLEAR = new RegExp([
  `\\b${EVERYTHING} (?:sil|temizle|kaldir|yok et)\\w*`,
  '\\b(?:tuvali|sayfayi|ekrani|tahtayi|calisma alanini|cizim alanini|cizimi|cizimleri) (?:tamamen |bastan )?(?:temizle|bosalt|sifirla)\\w*',
  '\\b(?:tuvali|sayfayi|ekrani|tahtayi|cizimleri) sil\\w*',
  '\\bsifirdan basla\\w*',
  // "baştan başlayalım" (ama "animasyonu baştan başlat" değil)
  '\\bbastan basla(?!t)\\w*',
  '\\byeni (?:bir )?(?:sayfa|tuval|cizim) (?:ac|baslat|olustur)\\w*',
].join('|'));
/** Tek başına "temizle" (sesli komutta dolgu sözcükleriyle): seçim yoksa tuvali temizleme isteğidir. */
const BARE_CLEAR = /^(?:(?:lutfen|simdi|tamam|hadi|evet|sey) )*temizle(?:yelim|yin|yiniz|r misin|r misiniz|sene|yiver)?(?: (?:lutfen|tamam|hadi))*$/;

export const clearAll: CommandHandler = {
  id: 'app.clearAll',
  examples: ['tümünü sil', 'tuvali temizle', 'her şeyi sil', 'hepsini sil', 'ekranı temizle', 'tüm şekilleri sil', 'sıfırdan başla'],
  match(c, scene) {
    const text = plainOf(c);
    if (c.labels.length || c.refersToSelection || /\bson\b/.test(text)) return 0;
    if (BARE_CLEAR.test(text)) return scene.selection.length ? 0 : 92;
    return CLEAR.test(text) ? 92 : 0;
  },
  run(_c, scene) {
    if (!scene.objects.length) { scene.say('Tuval zaten boş.'); return; }
    // "her şeyi silip baştan başla" iki cümleye bölünür: onay penceresi bir kez açılsın.
    if (!actOnce(scene, { kind: 'clearAll' })) return;
    scene.say(`Tuvali temizlemek için onay penceresi açıldı (${scene.objects.length} nesne silinecek).`);
  },
};

const SELECT_ALL = new RegExp(`\\b${EVERYTHING} sec\\w*|\\b(?:ctrl|kontrol|control) a\\b`);
const DESELECT = /\b(?:tum )?secim(?:i|leri)? (?:kaldir|temizle|iptal et|bosalt|sifirla|birak)\w*|\bsecimden cik\w*|\bhicbir (?:sey|seyi|nesneyi|sekli) secme\b|\bsecili (?:olanlari|nesneleri|sekilleri) birak\w*/;

export const selectAll: CommandHandler = {
  id: 'app.selectAll',
  examples: ['tümünü seç', 'hepsini seç', 'her şeyi seç', 'tüm nesneleri seç', 'seçimi kaldır', 'seçimi temizle'],
  match(c) {
    const text = plainOf(c);
    if (DESELECT.test(text)) return 92;
    // "ctrl a": sahnede A noktası varsa "a" etiket sayılır; kısayol adı yine de tümünü seçmektir.
    if (/^(?:ctrl|kontrol|control) a$/.test(text)) return 92;
    if (c.labels.length) return 0;
    return SELECT_ALL.test(text) ? 92 : 0;
  },
  run(c, scene) {
    if (DESELECT.test(plainOf(c))) {
      const count = scene.selection.length;
      scene.selection = [];
      scene.setFocus([]);
      scene.say(count ? 'Seçim kaldırıldı.' : 'Seçili nesne yoktu.');
      return;
    }
    const ids = scene.objects.map(o => o.id);
    if (!ids.length) { scene.say('Tuvalde seçilecek nesne yok.'); return; }
    scene.setFocus(ids);
    scene.say(`Tüm nesneler seçildi (${ids.length} nesne).`);
  },
};
