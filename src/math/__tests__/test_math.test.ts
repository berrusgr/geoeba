// Matematik Motoru Doğrulama Testleri (vitest)

import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateMidpoint,
  calculateAngleDegrees,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateCircleArea,
  calculateLineEquation,
  getAngleArcAngles,
} from '../geometry';
import { worldToScreen, screenToWorld } from '../coordinates';
import { compileMathExpression, validateMathExpression } from '../parser';

describe('Geometri hesaplamaları', () => {
  it('Öklid mesafesi (3-4-5 üçgeni) 5 birim olmalı', () => {
    expect(calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 6);
  });

  it('Orta nokta (4, 6) olmalı', () => {
    const mid = calculateMidpoint({ x: 2, y: 4 }, { x: 6, y: 8 });
    expect(mid.x).toBe(4);
    expect(mid.y).toBe(6);
  });

  it('Dik açı 90 derece olmalı', () => {
    expect(calculateAngleDegrees({ x: 0, y: 3 }, { x: 0, y: 0 }, { x: 4, y: 0 })).toBeCloseTo(90, 6);
  });

  it('Dik üçgen alanı (4*3/2 = 6) olmalı', () => {
    const area = calculatePolygonArea([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ]);
    expect(area).toBeCloseTo(6, 6);
  });

  it('Üçgen çevresi (3+4+5 = 12) olmalı', () => {
    const perimeter = calculatePolygonPerimeter([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ]);
    expect(perimeter).toBeCloseTo(12, 6);
  });

  it('Yarıçapı 3 olan çember alanı 9pi olmalı', () => {
    expect(calculateCircleArea(3)).toBeCloseTo(Math.PI * 9, 6);
  });

  it('Eğim 2 olmalı (y = 2x + 1)', () => {
    expect(calculateLineEquation({ x: 0, y: 1 }, { x: 1, y: 3 }).slope).toBe(2);
  });
});

describe('Açı yayı açıları (ekran uzayı)', () => {
  const vertex = { x: 0, y: 0 };
  const deg = (rad: number) => (rad * 180) / Math.PI;

  it('ekran uzayına dönüştürülür: yukarı yönlü kol negatif ekran açısı verir', () => {
    const arc = getAngleArcAngles({ x: 1, y: 0 }, vertex, { x: 0, y: 1 });
    expect(arc.startAngle).toBeCloseTo(0, 6);
    expect(arc.endAngle).toBeCloseTo(-Math.PI / 2, 6);
    // Ekran y ekseni aşağı doğru olduğundan +y dünya yönü yukarıda (negatif sin) kalmalı
    expect(Math.sin(arc.endAngle)).toBeCloseTo(-1, 6);
    expect(arc.isClockwise).toBe(false);
  });

  it('yay ölçüsü daima iç açıya eşittir (|sweep| <= 180) ve kol sırasından bağımsızdır', () => {
    const p1 = { x: 3, y: 0 };
    const p2 = { x: Math.cos(Math.PI / 6), y: Math.sin(Math.PI / 6) };
    const arc = getAngleArcAngles(p1, vertex, p2);
    const reversed = getAngleArcAngles(p2, vertex, p1);

    expect(Math.abs(deg(arc.sweepAngle))).toBeCloseTo(calculateAngleDegrees(p1, vertex, p2), 6);
    expect(Math.abs(deg(reversed.sweepAngle))).toBeCloseTo(30, 6);
    expect(Math.abs(arc.sweepAngle)).toBeLessThanOrEqual(Math.PI + 1e-9);
    // Kol sırası değişince yalnızca yön değişir, ölçü değişmez
    expect(arc.isClockwise).not.toBe(reversed.isClockwise);
  });

  it('açıortay +-pi kesim çizgisinde de doğru taraftadır', () => {
    // Ekran açıları 170 ve 190 derece olan iki kol -> açıortay 180 derece
    const arm = (screenDeg: number) => ({
      x: Math.cos((screenDeg * Math.PI) / 180),
      y: -Math.sin((screenDeg * Math.PI) / 180),
    });
    const arc = getAngleArcAngles(arm(170), vertex, arm(190));
    expect(Math.abs(deg(arc.sweepAngle))).toBeCloseTo(20, 6);
    expect(deg(arc.midAngle)).toBeCloseTo(180, 6);
  });
});

describe('Koordinat dönüşümleri', () => {
  const transform = {
    zoom: 40,
    panX: 0,
    panY: 0,
    width: 800,
    height: 600,
    showGrid: true,
    showAxes: true,
    showCoordinates: true,
    snapToGrid: true,
    gridStep: 1,
  };

  it('Dünya <-> Ekran çift yönlü dönüşüm tutarlı olmalı', () => {
    const screenPt = worldToScreen({ x: 2, y: 3 }, transform);
    const worldPt = screenToWorld(screenPt, transform);
    expect(worldPt.x).toBeCloseTo(2, 6);
    expect(worldPt.y).toBeCloseTo(3, 6);
  });
});

describe('Güvenli matematik parser', () => {
  const compile = (expr: string) => {
    const fn = compileMathExpression(expr);
    expect(fn, `"${expr}" derlenmeli`).not.toBeNull();
    return fn!;
  };

  it('temel ifadeler', () => {
    expect(compile('2*x + 1')(3)).toBe(7);
    expect(compile('x^2 - 4')(3)).toBe(5);
    expect(compile('a*x^2 + b')(2, { a: 3, b: 5 })).toBe(17);
    expect(compile('sin(x)')(0)).toBeCloseTo(0, 6);
  });

  it('birli eksi üs almadan daha gevşek bağlanır: -x^2 = -(x^2)', () => {
    expect(compile('-x^2')(2)).toBe(-4);
    expect(compile('-2^2')(0)).toBe(-4);
    expect(compile('(-x)^2')(2)).toBe(4);
  });

  it('üs sağ tarafı birli işaret alabilir ve sağdan birleşmelidir', () => {
    expect(compile('2^-1')(0)).toBe(0.5);
    expect(compile('2^3^2')(0)).toBe(512);
  });

  it('boşluk ayırıcıdır ve örtük çarpım desteklenir', () => {
    expect(compile('x sin(x)')(Math.PI / 2)).toBeCloseTo(Math.PI / 2, 6);
    expect(compile('2pi')(0)).toBeCloseTo(2 * Math.PI, 6);
    expect(compile('2 pi')(0)).toBeCloseTo(2 * Math.PI, 6);
    expect(compile('2x')(3)).toBe(6);
    expect(compile('x(x+1)')(2)).toBe(6);
    expect(compile('(x+1)(x-1)')(3)).toBe(8);
  });

  it('prototip adları asla fonksiyon olarak çözümlenmez ve fırlatmaz', () => {
    for (const expr of ['__proto__(x)', 'constructor(x)', 'tostring(x)', 'hasownproperty(x)']) {
      const fn = compileMathExpression(expr);
      if (fn !== null) {
        expect(() => fn(1)).not.toThrow();
        expect(Number.isNaN(fn(1))).toBe(true);
      } else {
        expect(validateMathExpression(expr).ok).toBe(false);
      }
    }
  });

  it('sıfıra bölme fırlatmaz, NaN verir', () => {
    const fn = compile('1/0');
    expect(() => fn(0)).not.toThrow();
    expect(Number.isNaN(fn(0))).toBe(true);
    expect(Number.isNaN(compile('x/0')(5))).toBe(true);
  });

  it('Unicode semboller ve Türkçe ondalık virgül', () => {
    expect(compile('x² + 1')(3)).toBe(10);
    expect(compile('x³')(2)).toBe(8);
    expect(compile('√(x)')(9)).toBe(3);
    expect(compile('π')(0)).toBeCloseTo(Math.PI, 6);
    expect(compile('0,5 x')(4)).toBe(2);
  });

  it('çok argümanlı fonksiyonlarda virgül argüman ayırıcıdır', () => {
    expect(compile('max(1, x)')(5)).toBe(5);
    expect(compile('min(1, x)')(5)).toBe(1);
    expect(compile('pow(x, 3)')(2)).toBe(8);
  });

  it('derece cinsinden trigonometrik fonksiyonlar', () => {
    expect(compile('sind(90)')(0)).toBeCloseTo(1, 6);
    expect(compile('cosd(180)')(0)).toBeCloseTo(-1, 6);
    expect(compile('tand(45)')(0)).toBeCloseTo(1, 6);
  });

  it('bilinmeyen karakter ve tanımlayıcılar derleme hatası verir', () => {
    expect(compileMathExpression('x $ 2')).toBeNull();
    expect(compileMathExpression('foo(x)')).toBeNull();
    expect(compileMathExpression('xsin(x)')).toBeNull();
    expect(compileMathExpression('')).toBeNull();
    expect(compileMathExpression('(x + 1')).toBeNull();
    expect(compileMathExpression('2 +')).toBeNull();
  });

  it('validateMathExpression Türkçe hata mesajı döndürür', () => {
    expect(validateMathExpression('x^2 + 1')).toEqual({ ok: true });
    const bad = validateMathExpression('x $ 2');
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error).toContain('Geçersiz karakter');
    }
    const empty = validateMathExpression('   ');
    expect(empty.ok).toBe(false);
  });

  it('kapsam değişkeni yoksa NaN döner, fırlatmaz', () => {
    const fn = compile('a*x');
    expect(Number.isNaN(fn(2))).toBe(true);
    expect(fn(2, { a: 3 })).toBe(6);
  });

  it('bilimsel gösterim doğru hesaplanır (1e3, 2e-3, 6.02e23)', () => {
    expect(compile('1e3')(0)).toBe(1000);
    expect(compile('2e-3')(0)).toBeCloseTo(0.002, 10);
    expect(compile('3e+2')(0)).toBe(300);
    expect(compile('1.5e2')(0)).toBe(150);
    expect(compile('6.02e23')(0)).toBe(6.02e23);
    expect(compile('2e-3 x')(2)).toBeCloseTo(0.004, 10);
    expect(validateMathExpression('1e3')).toEqual({ ok: true });
  });

  it('üstelde rakam yoksa e sabiti ile örtük çarpım korunur', () => {
    expect(compile('2e')(0)).toBeCloseTo(2 * Math.E, 10);
    expect(compile('3e - 2')(0)).toBeCloseTo(3 * Math.E - 2, 10);
    expect(compile('x e')(2)).toBeCloseTo(2 * Math.E, 10);
  });

  it('geçersiz sayı biçimleri reddedilir', () => {
    expect(compileMathExpression('1.2.3')).toBeNull();
    expect(compileMathExpression('1e3.5')).toBeNull();
    const bad = validateMathExpression('1.2.3');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain('Geçersiz sayı');
  });

  it('bilinen değişken listesi verilince tanımsız değişken hata verir', () => {
    const bad = validateMathExpression('x2', []);
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error).toContain('Tanımsız değişken');
      expect(bad.error).toContain('x2');
      expect(bad.error).toContain('Kullanılabilir');
    }
    expect(validateMathExpression('y', ['a']).ok).toBe(false);
    expect(validateMathExpression('x*y', ['a']).ok).toBe(false);
    expect(compileMathExpression('x2', [])).toBeNull();

    // Kaydırıcı adları verilince parametreli ifadeler çalışmaya devam eder
    expect(validateMathExpression('a*x^2 + b', ['a', 'b'])).toEqual({ ok: true });
    expect(validateMathExpression('pi*x + e', [])).toEqual({ ok: true });
    const fn = compileMathExpression('a*x', ['a']);
    expect(fn).not.toBeNull();
    expect(fn!(2, { a: 3 })).toBe(6);
  });

  it('bilinen değişken listesi verilmezse davranış geriye dönük uyumludur', () => {
    // Liste yokken her 1-2 karakterlik ad kabul edilir, değeri kapsamdan gelir (yoksa NaN).
    expect(validateMathExpression('x2')).toEqual({ ok: true });
    expect(Number.isNaN(compile('x2')(3))).toBe(true);
    expect(compile('k1*x')(2, { k1: 4 })).toBe(8);
  });

  it('√ sembolü parantezsiz de kullanılabilir', () => {
    expect(compile('√9')(0)).toBe(3);
    expect(compile('√x')(9)).toBe(3);
    expect(compile('√2 + 1')(0)).toBeCloseTo(Math.SQRT2 + 1, 10);
    expect(compile('2√3 + 1')(0)).toBeCloseTo(2 * Math.sqrt(3) + 1, 10);
    expect(compile('√π')(0)).toBeCloseTo(Math.sqrt(Math.PI), 10);
    expect(compile('√0,36')(0)).toBeCloseTo(0.6, 10);
    expect(compile('√sin(x)')(Math.PI / 2)).toBeCloseTo(1, 10);
    expect(compile('min(√4, 2)')(0)).toBe(2);
    // Hata mesajı kullanıcının yazmadığı "sqrt9" gibi bir sözcük içermemeli
    const bad = validateMathExpression('√-4');
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error).not.toContain('sqrt-4');
      expect(bad.error).toContain('parantez');
    }
  });

  it('geçersiz karakter mesajı doğru karakteri gösterir (unicode sonrası indeks kaymaz)', () => {
    for (const expr of ['x² & 1', 'π & 1', 'x & 1', '√(x) & 1']) {
      const res = validateMathExpression(expr);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toBe('Geçersiz karakter: "&"');
    }
  });

  it('ondalık virgül çok argümanlı fonksiyonlarla birlikte kullanılabilir', () => {
    expect(compile('max(x, 1) + 0,5')(2)).toBe(2.5);
    expect(compile('sin(1,2)')(0)).toBeCloseTo(Math.sin(1.2), 10);
    // Çağrının içinde ondalık için ";" ayırıcısı
    expect(compile('max(0,5; x)')(0)).toBe(0.5);
    expect(compile('pow(2; 3)')(0)).toBe(8);
    expect(compile('max(1, 2)')(0)).toBe(2);
    // Belirsiz yazım reddedilir ve ";" ipucu verilir
    expect(compileMathExpression('max(0,5, x)')).toBeNull();
    const bad = validateMathExpression('max(0,5, x)');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain(';');
  });

  it('yan yana iki sayı sessizce çarpılmaz', () => {
    expect(compileMathExpression('2 3')).toBeNull();
    const bad = validateMathExpression('2 3');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain('İşlem işareti eksik');
    expect(compile('2*3')(0)).toBe(6);
    expect(compile('23')(0)).toBe(23);
  });

  it('negatif tabanlı tek dereceli kökler gerçek değeri döndürür', () => {
    expect(compile('x^(1/3)')(-8)).toBeCloseTo(-2, 10);
    expect(compile('x^(1/3)')(8)).toBeCloseTo(2, 10);
    expect(compile('x^(2/3)')(-8)).toBeCloseTo(4, 10);
    expect(compile('x^(1/5)')(-32)).toBeCloseTo(-2, 10);
    expect(compile('x^(-1/3)')(-8)).toBeCloseTo(-0.5, 10);
    expect(compile('cbrt(x)')(-27)).toBeCloseTo(-3, 10);
    expect(compile('kupkok(x)')(-27)).toBeCloseTo(-3, 10);
    // Çift paydalı üsler gerçek sayılarda tanımsız kalmalı
    expect(Number.isNaN(compile('x^0,5')(-4))).toBe(true);
    expect(Number.isNaN(compile('x^(1/4)')(-16))).toBe(true);
    // Tam sayı üsler değişmez
    expect(compile('x^3')(-2)).toBe(-8);
    expect(compile('x^2')(-3)).toBe(9);
  });

  it('çok uzun ifadeler Türkçe hata verir, İngilizce sistem mesajı sızmaz', () => {
    const derin = '('.repeat(5000) + 'x' + ')'.repeat(5000);
    const uzun = 'x+'.repeat(50000) + 'x';
    for (const expr of [derin, uzun]) {
      const res = validateMathExpression(expr);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('çok uzun');
        expect(res.error).not.toContain('Maximum');
      }
      expect(compileMathExpression(expr)).toBeNull();
    }
    // Normal uzunluktaki ifadeler etkilenmez
    expect(compile('x+'.repeat(100) + 'x')(1)).toBe(101);
  });
  it('mutlak değer çubuğu |x-2| desteklenir ve abs(...) ile aynı sonucu verir', () => {
    // Öğrencinin defterde yazdığı standart gösterim
    expect(compile('|x-2|')(5)).toBe(3);
    expect(compile('|x-2|')(0)).toBe(2);
    expect(compile('|x|')(-4)).toBe(4);
    // abs / mutlak takma adlarıyla birebir aynı
    expect(compile('|x-2|')(-7)).toBe(compile('abs(x-2)')(-7));
    expect(compile('|x|')(-7)).toBe(compile('mutlak(x)')(-7));
    // Örtük çarpım: 2|x|
    expect(compile('2|x|')(-3)).toBe(6);
    expect(compile('x*|x|')(-2)).toBe(-4);
    // Yan yana iki mutlak değer
    expect(compile('|x|+|x-1|')(-2)).toBe(5);
    expect(compile('|x|*|x-1|')(-2)).toBe(6);
    // İç içe
    expect(compile('||x|-1|')(-4)).toBe(3);
    // Üs, birli işaret ve fonksiyonla birlikte
    expect(compile('|x|^2')(-3)).toBe(9);
    expect(compile('-|x|')(4)).toBe(-4);
    expect(compile('|-x|')(5)).toBe(5);
    expect(compile('|sin(x)|')(0)).toBe(0);
    expect(compile('|x-2|/2')(8)).toBe(3);
  });

  it('hatalı mutlak değer kullanımı Türkçe hata verir', () => {
    for (const bad of ['|x', 'x|', '||', '|x|-|']) {
      const res = validateMathExpression(bad);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        // Kullanıcıya İngilizce sistem mesajı sızmamalı
        expect(res.error).not.toMatch(/Unexpected|undefined|Cannot/);
      }
      expect(compileMathExpression(bad)).toBeNull();
    }
  });
});
