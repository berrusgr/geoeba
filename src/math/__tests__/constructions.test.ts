import { describe, it, expect } from 'vitest';
import {
  midpoint,
  pointAtRatio,
  ratioToT,
  translatePoint,
  parallelThrough,
  perpendicularThrough,
  perpendicularBisector,
  angleBisectorPoint,
  intersectLines,
  intersectLineCircle,
  intersectCircles,
  calculateSlope,
  rightTriangleRatios,
  angleTrigRatios,
  calculateDistance,
  calculateAngleDegrees,
} from '@/math/geometry';

const yakin = (a: number, b: number, hane = 9) => expect(a).toBeCloseTo(b, hane);

describe('Orta nokta ve oranda bölme', () => {
  it('orta nokta iki uca eşit uzaklıktadır', () => {
    const m = midpoint({ x: -2, y: 1 }, { x: 4, y: 7 });
    expect(m).toEqual({ x: 1, y: 4 });
    yakin(calculateDistance(m, { x: -2, y: 1 }), calculateDistance(m, { x: 4, y: 7 }));
  });

  it('t = 0 ve t = 1 uç noktaları verir', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 5, y: 10 };
    expect(pointAtRatio(a, b, 0)).toEqual(a);
    expect(pointAtRatio(a, b, 1)).toEqual(b);
  });

  it('1:3 oranı parçayı dörtte bir noktasından böler', () => {
    const t = ratioToT(1, 3)!;
    expect(t).toBe(0.25);
    expect(pointAtRatio({ x: 0, y: 0 }, { x: 8, y: 4 }, t)).toEqual({ x: 2, y: 1 });
  });

  it('2:1 oranında bölen nokta uçlara 2/3 ve 1/3 uzaklıktadır', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 9, y: 0 };
    const p = pointAtRatio(a, b, ratioToT(2, 1)!);
    yakin(calculateDistance(a, p), 6);
    yakin(calculateDistance(p, b), 3);
  });

  it('oran toplamı sıfırsa tanımsızdır', () => {
    expect(ratioToT(2, -2)).toBeNull();
  });
});

describe('Öteleme', () => {
  it('noktayı vektör kadar kaydırır', () => {
    expect(translatePoint({ x: 1, y: -2 }, { x: 3, y: 5 })).toEqual({ x: 4, y: 3 });
  });

  it('öteleme uzaklıkları korur (izometri)', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 3, y: 4 };
    const v = { x: -7, y: 2.5 };
    yakin(calculateDistance(translatePoint(a, v), translatePoint(b, v)), calculateDistance(a, b));
  });
});

describe('Paralel ve dik doğru', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 4, y: 2 };

  it('paralel doğrunun yön vektörü aynıdır', () => {
    const p = { x: 1, y: 5 };
    const q = parallelThrough(a, b, p)!;
    yakin((q.x - p.x) * (b.y - a.y) - (q.y - p.y) * (b.x - a.x), 0);
  });

  it('dik doğrunun yön vektörü diktir (skaler çarpım sıfır)', () => {
    const p = { x: 1, y: 5 };
    const q = perpendicularThrough(a, b, p)!;
    yakin((q.x - p.x) * (b.x - a.x) + (q.y - p.y) * (b.y - a.y), 0);
  });

  it('dejenere doğruda (iki nokta çakışık) null döner', () => {
    expect(parallelThrough(a, a, { x: 1, y: 1 })).toBeNull();
    expect(perpendicularThrough(a, a, { x: 1, y: 1 })).toBeNull();
  });
});

describe('Orta dikme', () => {
  it('orta noktadan geçer ve AB ye diktir', () => {
    const a = { x: -3, y: 1 };
    const b = { x: 5, y: 7 };
    const [m, q] = perpendicularBisector(a, b)!;
    expect(m).toEqual(midpoint(a, b));
    yakin((q.x - m.x) * (b.x - a.x) + (q.y - m.y) * (b.y - a.y), 0);
  });

  it('üzerindeki her nokta iki uca eşit uzaklıktadır', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 6, y: 0 };
    const [m, q] = perpendicularBisector(a, b)!;
    const uzak = { x: m.x + (q.x - m.x) * 3, y: m.y + (q.y - m.y) * 3 };
    yakin(calculateDistance(uzak, a), calculateDistance(uzak, b));
  });
});

describe('Açıortay', () => {
  it('açıyı iki eşit parçaya böler', () => {
    const v = { x: 0, y: 0 };
    const p1 = { x: 5, y: 0 };
    const p3 = { x: 0, y: 5 };
    const b = angleBisectorPoint(p1, v, p3)!;
    yakin(calculateAngleDegrees(p1, v, b), calculateAngleDegrees(b, v, p3), 6);
    yakin(calculateAngleDegrees(p1, v, b), 45, 6);
  });

  it('kolların uzunluğu sonucu etkilemez', () => {
    const v = { x: 1, y: 1 };
    const kisa = angleBisectorPoint({ x: 3, y: 1 }, v, { x: 1, y: 3 })!;
    const uzun = angleBisectorPoint({ x: 21, y: 1 }, v, { x: 1, y: 3 })!;
    // Aynı doğrultuda olmalılar: çapraz çarpım sıfır
    yakin((kisa.x - v.x) * (uzun.y - v.y) - (kisa.y - v.y) * (uzun.x - v.x), 0, 6);
  });

  it('kollar tam ters yönlüyse (180°) açıortay tanımsızdır', () => {
    expect(angleBisectorPoint({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});

describe('Kesiştir', () => {
  it('iki doğrunun kesişimini bulur', () => {
    const p = intersectLines({ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }, { x: 4, y: 0 })!;
    yakin(p.x, 2);
    yakin(p.y, 2);
  });

  it('paralel doğrularda null döner', () => {
    expect(intersectLines({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 3 }, { x: 1, y: 4 })).toBeNull();
  });

  it('doğru ile çemberi iki noktada keser', () => {
    const k = intersectLineCircle({ x: -5, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 0 }, 3);
    expect(k).toHaveLength(2);
    expect(k.map((p) => p.x).sort((a, b) => a - b)).toEqual([-3, 3]);
  });

  it('teğet doğruda tek nokta döner', () => {
    const k = intersectLineCircle({ x: -5, y: 3 }, { x: 5, y: 3 }, { x: 0, y: 0 }, 3);
    expect(k).toHaveLength(1);
    yakin(k[0].x, 0);
    yakin(k[0].y, 3);
  });

  it('çemberi ıskalayan doğruda kesişim yoktur', () => {
    expect(intersectLineCircle({ x: -5, y: 9 }, { x: 5, y: 9 }, { x: 0, y: 0 }, 3)).toHaveLength(0);
  });

  it('iki çemberin kesişimi her iki merkeze de doğru uzaklıktadır', () => {
    const k = intersectCircles({ x: 0, y: 0 }, 5, { x: 6, y: 0 }, 5);
    expect(k).toHaveLength(2);
    for (const p of k) {
      yakin(calculateDistance(p, { x: 0, y: 0 }), 5, 6);
      yakin(calculateDistance(p, { x: 6, y: 0 }), 5, 6);
    }
  });

  it('dıştan teğet çemberlerde tek nokta döner', () => {
    const k = intersectCircles({ x: 0, y: 0 }, 2, { x: 5, y: 0 }, 3);
    expect(k).toHaveLength(1);
    yakin(k[0].x, 2, 6);
  });

  it('ayrık ve iç içe çemberlerde kesişim yoktur', () => {
    expect(intersectCircles({ x: 0, y: 0 }, 1, { x: 10, y: 0 }, 1)).toHaveLength(0);
    expect(intersectCircles({ x: 0, y: 0 }, 5, { x: 0.5, y: 0 }, 1)).toHaveLength(0);
  });
});

describe('Eğim', () => {
  it('artan doğruda pozitif, azalanda negatiftir', () => {
    expect(calculateSlope({ x: 0, y: 0 }, { x: 2, y: 4 })).toBe(2);
    expect(calculateSlope({ x: 0, y: 0 }, { x: 2, y: -4 })).toBe(-2);
  });

  it('yatay doğruda sıfır, dikey doğruda tanımsızdır', () => {
    expect(calculateSlope({ x: 0, y: 3 }, { x: 9, y: 3 })).toBe(0);
    expect(calculateSlope({ x: 4, y: 0 }, { x: 4, y: 9 })).toBeNull();
  });
});

describe('Trigonometrik oranlar (dik üçgen)', () => {
  it('3-4-5 üçgeninde oranları doğru verir', () => {
    // Dik açı (0,0)'da; açı (4,0) köşesinde
    const o = rightTriangleRatios({ x: 4, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 3 })!;
    yakin(o.komsu, 4);
    yakin(o.karsi, 3);
    yakin(o.hipotenus, 5);
    yakin(o.sin, 3 / 5);
    yakin(o.cos, 4 / 5);
    yakin(o.tan, 3 / 4);
  });

  it('sin² + cos² = 1 özdeşliğini sağlar', () => {
    const o = rightTriangleRatios({ x: 7, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 2 })!;
    yakin(o.sin * o.sin + o.cos * o.cos, 1);
  });

  it('dik olmayan üçgende null döner', () => {
    expect(rightTriangleRatios({ x: 0, y: 0 }, { x: 4, y: 1 }, { x: 1, y: 4 })).toBeNull();
  });
});

describe('Açının trigonometrik oranları (dik üçgen şartı yok)', () => {
  it('3-4-5 dik üçgeninde kenar oranlarını da verir', () => {
    // Dik açı (0,0)'da; ölçülen açı (4,0) köşesinde
    const r = angleTrigRatios({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 })!;
    expect(r.dikKose).toBe('p1');
    expect(r.kenarlar).not.toBeNull();
    yakin(r.kenarlar!.komsu, 4, 6);
    yakin(r.kenarlar!.karsi, 3, 6);
    yakin(r.kenarlar!.hipotenus, 5, 6);
    yakin(r.sin, 3 / 5, 6);
    yakin(r.cos, 4 / 5, 6);
    yakin(r.tan!, 3 / 4, 6);
  });

  it('DİK OLMAYAN üçgende de oranları verir (eski sürüm burada hata veriyordu)', () => {
    const r = angleTrigRatios({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 3, y: 4 })!;
    expect(r).not.toBeNull();
    expect(r.dikKose).toBeNull();
    expect(r.kenarlar).toBeNull();
    // 53,13° civarı bir açı
    yakin(r.derece, 53.1301, 3);
    yakin(r.sin, Math.sin((r.derece * Math.PI) / 180), 9);
  });

  it('sin² + cos² = 1 her üçgende sağlanır', () => {
    const r = angleTrigRatios({ x: 2, y: 7 }, { x: -1, y: 1 }, { x: 6, y: -2 })!;
    yakin(r.sin * r.sin + r.cos * r.cos, 1, 9);
  });

  it('tam 90° açıda tanjant tanımsızdır', () => {
    const r = angleTrigRatios({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })!;
    yakin(r.derece, 90, 6);
    expect(r.tan).toBeNull();
    expect(r.dikKose).toBe('vertex');
    expect(r.kenarlar).toBeNull();
  });

  it('küçük ölçüm sapmasını dik kabul eder (0,5° tolerans)', () => {
    // (0,0)'daki açı 90°'den ~0,2° sapmış
    const r = angleTrigRatios({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0.01, y: 3 })!;
    expect(r.dikKose).toBe('p1');
    expect(r.kenarlar).not.toBeNull();
  });

  it('çakışık noktalarda null döner', () => {
    expect(angleTrigRatios({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 2 })).toBeNull();
  });
});
