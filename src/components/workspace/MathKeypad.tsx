'use client';

import React, { useState } from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';

/**
 * Bir tuşun davranışı.
 * `ekle`: imlecin bulunduğu yere yazılacak metin.
 * `geri`: yazdıktan sonra imleç kaç karakter geri alınacak — `sin()` yazıp
 *         parantezin İÇİNE konumlanmak için 1 kullanılır.
 */
interface Tus {
  goster: React.ReactNode;
  ekle?: string;
  geri?: number;
  /** Özel eylem: silme veya gönderme */
  eylem?: 'sil' | 'gonder';
  ipucu?: string;
  genis?: boolean;
  vurgu?: 'sayi' | 'islem' | 'islev' | 'eylem';
}

const t = (goster: React.ReactNode, ekle: string, geri = 0, ipucu?: string, vurgu?: Tus['vurgu']): Tus => ({
  goster,
  ekle,
  geri,
  ipucu,
  vurgu,
});

/** Üst simge gösterimi (x², x^n gibi) */
const Us = ({ taban, us }: { taban: string; us: string }) => (
  <span>
    {taban}
    <sup className="text-[8px]">{us}</sup>
  </span>
);

const SAYI_TUSLARI: Tus[] = [
  t('x', 'x', 0, 'Değişken x', 'islev'),
  t('y', 'y', 0, 'Değişken y', 'islev'),
  t('π', 'pi', 0, 'Pi sayısı (3,14…)', 'islev'),
  t('e', 'e', 0, 'Euler sayısı (2,71…)', 'islev'),
  t('7', '7', 0, undefined, 'sayi'),
  t('8', '8', 0, undefined, 'sayi'),
  t('9', '9', 0, undefined, 'sayi'),
  t('×', '*', 0, 'Çarpma', 'islem'),
  t('÷', '/', 0, 'Bölme', 'islem'),

  t(<Us taban="□" us="2" />, '^2', 0, 'Kare', 'islev'),
  t(<Us taban="□" us="n" />, '^', 0, 'Üs', 'islev'),
  t('√□', 'sqrt()', 1, 'Karekök', 'islev'),
  t('|□|', '||', 1, 'Mutlak değer', 'islev'),
  t('4', '4', 0, undefined, 'sayi'),
  t('5', '5', 0, undefined, 'sayi'),
  t('6', '6', 0, undefined, 'sayi'),
  t('+', '+', 0, 'Toplama', 'islem'),
  t('−', '-', 0, 'Çıkarma', 'islem'),

  t('∛□', 'cbrt()', 1, 'Küpkök', 'islev'),
  t('□/□', '/', 0, 'Kesir', 'islev'),
  t('(', '(', 0, undefined, 'islem'),
  t(')', ')', 0, undefined, 'islem'),
  t('1', '1', 0, undefined, 'sayi'),
  t('2', '2', 0, undefined, 'sayi'),
  t('3', '3', 0, undefined, 'sayi'),
  t(',', ',', 0, 'Argüman ayırıcı (min, max, pow)', 'islem'),
  { goster: <Delete className="w-3.5 h-3.5" />, eylem: 'sil', ipucu: 'Sil', vurgu: 'eylem' },

  t('min', 'min(,)', 2, 'İki sayının küçüğü', 'islev'),
  t('max', 'max(,)', 2, 'İki sayının büyüğü', 'islev'),
  t('0', '0', 0, undefined, 'sayi'),
  t('.', '.', 0, 'Ondalık nokta', 'sayi'),
  { goster: <CornerDownLeft className="w-3.5 h-3.5" />, eylem: 'gonder', ipucu: 'Ekle (Enter)', vurgu: 'eylem', genis: true },
];

const ISLEV_TUSLARI: Tus[] = [
  t('sin', 'sin()', 1, 'Sinüs (radyan)', 'islev'),
  t('cos', 'cos()', 1, 'Kosinüs (radyan)', 'islev'),
  t('tan', 'tan()', 1, 'Tanjant (radyan)', 'islev'),
  t('ln', 'ln()', 1, 'Doğal logaritma', 'islev'),
  t(<Us taban="log" us="10" />, 'log()', 1, '10 tabanında logaritma', 'islev'),

  t(<Us taban="sin" us="-1" />, 'asin()', 1, 'Ters sinüs', 'islev'),
  t(<Us taban="cos" us="-1" />, 'acos()', 1, 'Ters kosinüs', 'islev'),
  t(<Us taban="tan" us="-1" />, 'atan()', 1, 'Ters tanjant', 'islev'),
  t(<Us taban="e" us="□" />, 'exp()', 1, 'e üzeri', 'islev'),
  t(<Us taban="10" us="□" />, '10^', 0, '10 üzeri', 'islev'),

  t('sin°', 'sind()', 1, 'Sinüs (derece)', 'islev'),
  t('cos°', 'cosd()', 1, 'Kosinüs (derece)', 'islev'),
  t('tan°', 'tand()', 1, 'Tanjant (derece)', 'islev'),
  t('|□|', '||', 1, 'Mutlak değer', 'islev'),
  t('√□', 'sqrt()', 1, 'Karekök', 'islev'),

  t('⌊□⌋', 'floor()', 1, 'Aşağı yuvarla', 'islev'),
  t('⌈□⌉', 'ceil()', 1, 'Yukarı yuvarla', 'islev'),
  t('≈', 'round()', 1, 'En yakın tam sayıya yuvarla', 'islev'),
  t('pow', 'pow(,)', 2, 'Üs alma: pow(taban, üs)', 'islev'),
  { goster: <Delete className="w-3.5 h-3.5" />, eylem: 'sil', ipucu: 'Sil', vurgu: 'eylem' },
];

/** Parametrik fonksiyonlarda kullanılan değişken adları — her biri için kaydırıcı otomatik açılır. */
const HARF_TUSLARI: Tus[] = ['a', 'b', 'c', 'd', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'x', 'y'].map(
  (h) => t(h, h, 0, `${h} değişkeni`, 'islev')
);

interface MathKeypadProps {
  /** İmlecin bulunduğu yere metin yazar; `geri` kadar imleci geri alır. */
  onInsert: (metin: string, geri?: number) => void;
  /** İmlecin solundaki karakteri siler. */
  onDelete: () => void;
  /** İfadeyi ekler (Enter ile aynı). */
  onSubmit: () => void;
}

const VURGU_SINIFI: Record<NonNullable<Tus['vurgu']>, string> = {
  sayi: 'bg-background hover:bg-muted text-foreground',
  islem: 'bg-muted/70 hover:bg-muted text-foreground',
  islev: 'bg-background hover:bg-muted text-primary',
  eylem: 'bg-muted hover:bg-muted-foreground/20 text-foreground',
};

/**
 * Cebir girişinin altında açılan hesap makinesi çizelgesi.
 *
 * Yalnızca ifade ayrıştırıcısının GERÇEKTEN desteklediği tuşlar yer alır; aksi hâlde
 * kullanıcı bir tuşa basıp hata alırdı. Bu yüzden türev / integral / eşitsizlik gibi
 * henüz desteklenmeyen simgeler klavyede bulunmaz.
 */
export function MathKeypad({ onInsert, onDelete, onSubmit }: MathKeypadProps) {
  const [sekme, setSekme] = useState<'123' | 'fx' | 'abc'>('123');

  const tuslar = sekme === '123' ? SAYI_TUSLARI : sekme === 'fx' ? ISLEV_TUSLARI : HARF_TUSLARI;
  const sutun = sekme === '123' ? 9 : sekme === 'fx' ? 5 : 8;

  const bas = (k: Tus) => {
    if (k.eylem === 'sil') return onDelete();
    if (k.eylem === 'gonder') return onSubmit();
    if (k.ekle !== undefined) onInsert(k.ekle, k.geri ?? 0);
  };

  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-2 space-y-2">
      {/* Sekmeler */}
      <div role="tablist" aria-label="Klavye sekmeleri" className="flex gap-1">
        {(
          [
            { id: '123' as const, ad: '123' },
            { id: 'fx' as const, ad: 'f(x)' },
            { id: 'abc' as const, ad: 'ABC' },
          ]
        ).map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={sekme === s.id}
            onClick={() => setSekme(s.id)}
            className={`px-3 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
              sekme === s.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {/* Tuşlar */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${sutun}, minmax(0, 1fr))` }}
      >
        {tuslar.map((k, i) => (
          <button
            key={i}
            type="button"
            title={k.ipucu}
            aria-label={k.ipucu || (typeof k.goster === 'string' ? k.goster : undefined)}
            onClick={() => bas(k)}
            style={k.genis ? { gridColumn: 'span 2' } : undefined}
            className={`h-8 flex items-center justify-center rounded-lg border border-border/70 text-[11px] font-bold shadow-sm transition-colors cursor-pointer ${
              VURGU_SINIFI[k.vurgu || 'sayi']
            }`}
          >
            {k.goster}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground leading-snug px-0.5">
        Tek harfli değişkenler (a, b, k…) için otomatik kaydırıcı oluşturulur.
      </p>
    </div>
  );
}
