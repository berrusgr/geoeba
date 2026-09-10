import { describe, it, expect } from 'vitest';
import { evaluateNumericInput } from '@/math/parser';

const deger = (raw: string, scope?: Record<string, number>) => {
  const r = evaluateNumericInput(raw, scope);
  return r.ok ? r.value : null;
};
const hata = (raw: string, scope?: Record<string, number>) => {
  const r = evaluateNumericInput(raw, scope);
  return r.ok ? null : r.error;
};

/**
 * Kullanıcı yarıçap, uzunluk, koordinat gibi alanlara yalnızca düz sayı değil,
 * kaydırıcı adı veya ifade de yazabilmelidir.
 */
describe('Sayı veya ifade girişi', () => {
  it('düz sayıyı okur', () => {
    expect(deger('3')).toBe(3);
    expect(deger('-2')).toBe(-2);
    expect(deger('0')).toBe(0);
  });

  it('Türkçe ondalık virgülü kabul eder', () => {
    expect(deger('7,5')).toBe(7.5);
    expect(deger('7.5')).toBe(7.5);
  });

  it('kaydırıcı adını değeriyle değiştirir', () => {
    expect(deger('a', { a: 4 })).toBe(4);
  });

  it('kaydırıcı içeren ifadeyi hesaplar', () => {
    expect(deger('2*a + 1', { a: 3 })).toBe(7);
    expect(deger('a/b', { a: 6, b: 4 })).toBe(1.5);
  });

  it('sabitleri ve fonksiyonları tanır', () => {
    expect(deger('pi')).toBeCloseTo(Math.PI, 8);
    expect(deger('sqrt(2)')).toBeCloseTo(Math.SQRT2, 8);
    expect(deger('3/4')).toBe(0.75);
  });

  it('kayan nokta artığını temizler', () => {
    expect(deger('0.1 + 0.2')).toBe(0.3);
  });

  it('boş giriş hata verir', () => {
    expect(hata('   ')).toBe('Bir değer girin.');
  });

  it('tanımsız değişkende açıklayıcı hata verir', () => {
    const h = hata('zz', { a: 1 });
    expect(h).toMatch(/Tanımsız değişken/);
  });

  it('sayıya eşit olmayan ifadeyi reddeder', () => {
    expect(hata('1/0')).toBe('Bu ifade bir sayıya eşit değil.');
  });

  it('kapsam boşken kaydırıcı adı tanınmaz', () => {
    expect(hata('a')).toMatch(/Tanımsız değişken/);
  });
});
