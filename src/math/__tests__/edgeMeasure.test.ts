import { describe, it, expect } from 'vitest';
import { findNearestEdgeIndex, calculateDistance } from '@/math/geometry';
import { edgeLabelKey } from '@/types/math';

/**
 * Kenar uzunluğu ölçümü: kullanıcı şeklin bir KENARINA tıkladığında o kenarın
 * uzunluğu gösterilir. Doğru kenarın seçilmesi bu iki parçaya dayanır.
 */
describe('Kenar seçimi (findNearestEdgeIndex)', () => {
  // Saat yönünün tersine ABCD dikdörtgeni (ekran değil, matematik yönü)
  const dikdortgen = [
    { x: 0, y: 0 },   // A
    { x: 6, y: 0 },   // B
    { x: 6, y: 4 },   // C
    { x: 0, y: 4 },   // D
  ];

  it('alt kenarın üzerine tıklanınca 0. kenarı seçer', () => {
    expect(findNearestEdgeIndex(dikdortgen, { x: 3, y: 0.2 })).toBe(0);
  });

  it('sağ kenarın üzerine tıklanınca 1. kenarı seçer', () => {
    expect(findNearestEdgeIndex(dikdortgen, { x: 5.9, y: 2 })).toBe(1);
  });

  it('üst kenarın üzerine tıklanınca 2. kenarı seçer', () => {
    expect(findNearestEdgeIndex(dikdortgen, { x: 3, y: 3.8 })).toBe(2);
  });

  it('sol kenarın üzerine tıklanınca 3. kenarı seçer', () => {
    expect(findNearestEdgeIndex(dikdortgen, { x: 0.1, y: 2 })).toBe(3);
  });

  it('köşenin hemen dışında da o köşeye komşu bir kenarı seçer', () => {
    expect([0, 3]).toContain(findNearestEdgeIndex(dikdortgen, { x: -0.3, y: -0.3 }));
  });

  it('şeklin ortasına tıklanınca ve yakınlık sınırı varsa kenar seçmez', () => {
    expect(findNearestEdgeIndex(dikdortgen, { x: 3, y: 2 }, 1)).toBeNull();
  });

  it('yakınlık sınırı yoksa ortadaki tıklama da en yakın kenarı verir', () => {
    // (3,2) noktası üst ve alt kenara eşit uzaklıkta; ilk bulunan (0) döner
    expect(findNearestEdgeIndex(dikdortgen, { x: 3, y: 2 })).toBe(0);
  });

  it('üçgende de doğru kenarı bulur', () => {
    const ucgen = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 3 },
    ];
    expect(findNearestEdgeIndex(ucgen, { x: 2, y: 0.1 })).toBe(0); // taban
    expect(findNearestEdgeIndex(ucgen, { x: 2.1, y: 1.4 })).toBe(1); // hipotenüs
    expect(findNearestEdgeIndex(ucgen, { x: 0.1, y: 1.5 })).toBe(2); // dik kenar
  });

  it('üçten az köşe varsa kenar yoktur', () => {
    expect(findNearestEdgeIndex([{ x: 0, y: 0 }, { x: 1, y: 1 }], { x: 0.5, y: 0.5 })).toBeNull();
  });

  it('seçilen kenarın uzunluğu iki köşe arasındaki uzaklıktır', () => {
    const i = findNearestEdgeIndex(dikdortgen, { x: 5.9, y: 2 })!;
    const a = dikdortgen[i];
    const b = dikdortgen[(i + 1) % dikdortgen.length];
    expect(calculateDistance(a, b)).toBe(4);
  });
});

describe('Kenar etiketi anahtarı (edgeLabelKey)', () => {
  it('kenar dizinini benzersiz bir etiket anahtarına çevirir', () => {
    expect(edgeLabelKey(0)).toBe('edge0');
    expect(edgeLabelKey(3)).toBe('edge3');
    expect(edgeLabelKey(12)).toBe('edge12');
  });

  it('farklı kenarlar farklı anahtar üretir (etiketler birbirini ezmez)', () => {
    const anahtarlar = [0, 1, 2, 3].map(edgeLabelKey);
    expect(new Set(anahtarlar).size).toBe(4);
  });

  it("ölçüm türü anahtarlarıyla çakışmaz", () => {
    const olcumTurleri = ['length', 'area', 'perimeter', 'angle', 'arcLength'];
    for (let i = 0; i < 8; i++) expect(olcumTurleri).not.toContain(edgeLabelKey(i));
  });
});

describe('Elips ölçümleri', () => {
  it('alan π·a·b formülüne uyar', async () => {
    const { calculateEllipseArea } = await import('@/math/geometry');
    expect(calculateEllipseArea(3, 2)).toBeCloseTo(Math.PI * 6, 10);
  });

  it('a = b iken elips çemberle aynı alanı verir', async () => {
    const { calculateEllipseArea, calculateCircleArea } = await import('@/math/geometry');
    expect(calculateEllipseArea(4, 4)).toBeCloseTo(calculateCircleArea(4), 10);
  });

  it('a = b iken çevre tam olarak 2πr olur', async () => {
    const { calculateEllipsePerimeter } = await import('@/math/geometry');
    expect(calculateEllipsePerimeter(5, 5)).toBeCloseTo(2 * Math.PI * 5, 9);
  });

  it('çevre bilinen bir değere yakınsar (a=3, b=2 → ≈ 15,865)', async () => {
    const { calculateEllipsePerimeter } = await import('@/math/geometry');
    expect(calculateEllipsePerimeter(3, 2)).toBeCloseTo(15.8654, 3);
  });

  it('yarıçapların işareti sonucu değiştirmez', async () => {
    const { calculateEllipseArea, calculateEllipsePerimeter } = await import('@/math/geometry');
    expect(calculateEllipseArea(-3, 2)).toBeCloseTo(calculateEllipseArea(3, 2), 10);
    expect(calculateEllipsePerimeter(3, -2)).toBeCloseTo(calculateEllipsePerimeter(3, 2), 10);
  });

  it('sıfır yarıçapta çevre çökmez', async () => {
    const { calculateEllipsePerimeter } = await import('@/math/geometry');
    expect(calculateEllipsePerimeter(0, 0)).toBe(0);
    expect(Number.isFinite(calculateEllipsePerimeter(4, 0))).toBe(true);
  });
});
