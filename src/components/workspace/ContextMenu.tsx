'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { evaluateNumericInput } from '@/math/parser';
import { Check, X } from 'lucide-react';

/** Menüden seçilebilecek bir madde. */
export interface ContextMenuItem {
  id: string;
  label: string;
  /** Kırmızı (yıkıcı) görünüm — "Sil" gibi. */
  danger?: boolean;
  /** Maddenin üstünde ayırıcı çizgi gösterilsin mi? */
  separatorBefore?: boolean;
  /**
   * Şu an uygulanamayan madde: soluk görünür, tıklanmaz ama GÖRÜNÜR kalır.
   * Maddeyi tümden gizlemek, kullanıcıya özelliğin var olduğunu ve neyin
   * eksik olduğunu (ör. "ikinci bir nokta koyun") anlatma şansını yok ediyor.
   */
  disabled?: boolean;
  /** Doğrudan çalışan işlem. `prompt` verilmişse yok sayılır. */
  onSelect?: () => void;
  /**
   * Verilirse madde menüyü kapatmaz; menü satır içi bir DEĞER GİRİŞİ formuna dönüşür.
   * ("Uzunluğu ayarla…", "Açıyı ayarla…", "Yarıçapı ayarla…")
   */
  prompt?: {
    /** Form başlığı, ör. "Uzunluk" */
    label: string;
    /** Kutunun sağında gösterilecek birim, ör. "br" veya "°" */
    unit?: string;
    /** Kutuya önceden yazılacak değer (Türkçe biçimde) */
    initial?: string;
    /** Yer tutucu metin */
    placeholder?: string;
    onSubmit?: (value: number) => void;
    onSubmitText?: (text: string) => void;
    /** "a", "2*a" gibi girişler için kaydırıcı değerleri */
    scope?: Record<string, number>;
  };
}

interface ContextMenuProps {
  open: boolean;
  /** Menünün açılacağı ekran (client) koordinatları */
  x: number;
  y: number;
  /** Başlıkta gösterilen nesne adı, ör. "AB" */
  title: string;
  items: ContextMenuItem[];
  onClose: () => void;
}

const KENAR_BOSLUGU = 8;



/**
 * Tuvaldeki nesnelere sağ tıklandığında açılan bağlam menüsü.
 *
 * - Ekran dışına taşmayı önlemek için konumunu kendi ölçüsüne göre kıstırır.
 * - Klavye: açılınca odak ilk maddeye gider, Yukarı/Aşağı sararak dolaşır, Escape kapatır.
 * - Dışarı tıklama ve sağ tıklama menüyü kapatır; o tıklama tuvale GEÇMEZ
 *   (yanlışlıkla yeni nokta çizilmesin diye tam ekran bir örtü kullanılır).
 */
export function ContextMenu({ open, x, y, title, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: x, top: y });
  const [promptItem, setPromptItem] = useState<ContextMenuItem | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Menü her açıldığında/hedef değiştiğinde form kipinden çık
  useEffect(() => {
    if (!open) {
      setPromptItem(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    setPromptItem(null);
    setError(null);
  }, [x, y, title]);

  /** Menüyü görünür alanın içine çeker (boyanmadan önce, titreme olmasın diye). */
  const kistir = useCallback(() => {
    const el = menuRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const maxLeft = window.innerWidth - w - KENAR_BOSLUGU;
    const maxTop = window.innerHeight - h - KENAR_BOSLUGU;
    setPos({
      left: Math.max(KENAR_BOSLUGU, Math.min(x, Math.max(KENAR_BOSLUGU, maxLeft))),
      top: Math.max(KENAR_BOSLUGU, Math.min(y, Math.max(KENAR_BOSLUGU, maxTop))),
    });
  }, [x, y]);

  useLayoutEffect(() => {
    if (!open) return;
    kistir();
  }, [open, kistir, promptItem, items.length]);

  // Açılışta odağı ilk maddeye taşı (form kipinde kutuya)
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (promptItem) inputRef.current?.select();
      else menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, promptItem]);

  // Pencere yeniden boyutlanır veya kaydırılırsa menüyü kapat (yanlış yerde asılı kalmasın)
  useEffect(() => {
    if (!open) return;
    const kapat = () => onClose();
    window.addEventListener('resize', kapat);
    window.addEventListener('wheel', kapat, { passive: true });
    return () => {
      window.removeEventListener('resize', kapat);
      window.removeEventListener('wheel', kapat);
    };
  }, [open, onClose]);

  if (!open) return null;

  const maddeler = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const klavye = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Escape yalnızca menüyü kapatır; arkadaki seçim ve yarım kalan araç bozulmasın
      e.stopPropagation();
      if (promptItem) {
        setPromptItem(null);
        setError(null);
      } else {
        onClose();
      }
      return;
    }
    if (promptItem) return; // Form kipinde ok tuşları imlecin
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const list = maddeler();
      if (list.length === 0) return;
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
      list[next]?.focus();
    }
  };

  const maddeSec = (item: ContextMenuItem) => {
    if (item.disabled) return;
    if (item.prompt) {
      setValue(item.prompt.initial ?? '');
      setError(null);
      setPromptItem(item);
      return;
    }
    item.onSelect?.();
    onClose();
  };

  const formGonder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptItem?.prompt) return;
    if (promptItem.prompt.onSubmitText) {
      const clean = value.trim();
      if (!clean) {
        setError('Lütfen bir ad girin.');
        return;
      }
      promptItem.prompt.onSubmitText(clean);
      onClose();
      return;
    }
    // Alan düz sayı da kabul eder, kaydırıcı adı veya ifade de ("a", "2*a", "pi/2")
    const sonuc = evaluateNumericInput(value, promptItem.prompt.scope ?? {});
    if (!sonuc.ok) {
      setError(sonuc.error);
      return;
    }
    if (!(sonuc.value > 0)) {
      setError('Değer sıfırdan büyük olmalı.');
      return;
    }
    promptItem.prompt.onSubmit?.(sonuc.value);
    onClose();
  };

  return (
    <>
      {/* Tam ekran örtü: dışarı tıklama ve sağ tıklama menüyü kapatır, tıklama tuvale geçmez */}
      <div
        className="fixed inset-0 z-40"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />

      <div
        ref={menuRef}
        role="menu"
        aria-label={`${title} için işlemler`}
        onKeyDown={klavye}
        onMouseDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        style={{ left: pos.left, top: pos.top }}
        className="fixed z-50 min-w-[13rem] max-w-[17rem] rounded-2xl border border-border bg-card/98 backdrop-blur-md shadow-2xl py-1.5 select-none animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Başlık: menünün hangi nesneyi konuştuğunu gösterir */}
        <div className="px-3 py-1.5 border-b border-border/70 mb-1">
          <span className="block text-[11px] font-black text-foreground truncate">{title}</span>
        </div>

        {promptItem?.prompt ? (
          <form onSubmit={formGonder} className="px-3 py-2 space-y-2">
            <label
              htmlFor="baglam-deger-girisi"
              className="block text-[11px] font-bold text-muted-foreground"
            >
              {promptItem.prompt.label}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="baglam-deger-girisi"
                ref={inputRef}
                type="text"
                inputMode={promptItem.prompt.onSubmitText ? 'text' : 'decimal'}
                placeholder={promptItem.prompt.placeholder}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={error !== null}
                className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-background border text-xs font-mono text-foreground outline-none focus:border-primary ${
                  error ? 'border-destructive' : 'border-border'
                }`}
              />
              {promptItem.prompt.unit && (
                <span className="text-[11px] font-bold text-muted-foreground shrink-0">
                  {promptItem.prompt.unit}
                </span>
              )}
            </div>
            {error && (
              <p role="alert" className="text-[11px] text-destructive font-semibold">
                {error}
              </p>
            )}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-black hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Uygula</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPromptItem(null);
                  setError(null);
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-muted text-foreground text-[11px] font-bold hover:bg-muted/70 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Vazgeç</span>
              </button>
            </div>
          </form>
        ) : (
          items.map((item) => (
            <React.Fragment key={item.id}>
              {item.separatorBefore && <div className="my-1 border-t border-border/70" />}
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => maddeSec(item)}
                className={`w-full text-left px-3 py-1.5 text-xs font-bold transition-colors outline-none ${
                  item.disabled
                    ? 'cursor-default text-muted-foreground/70'
                    : `cursor-pointer focus-visible:bg-muted hover:bg-muted ${
                        item.danger ? 'text-destructive' : 'text-foreground'
                      }`
                }`}
              >
                {item.label}
              </button>
            </React.Fragment>
          ))
        )}
      </div>
    </>
  );
}
