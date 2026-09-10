import { describe, it, expect } from 'vitest';
import {
  closestPointOnCircle,
  closestPointOnEllipse,
  closestPointOnPolygonEdge,
  splitPolygonByChord,
  calculateDistance,
  calculatePolygonArea,
  projectOntoHost,
} from '@/math/geometry';

const yakin = (a: number, b: number, h = 9) => expect(a).toBeCloseTo(b, h);

describe('Çember üzerinde en yakın nokta', () => {
  it('nokta çemberin üzerine düşer', () => {
    const p = closestPointOnCircle({ x: 0, y: 0 }, 5, { x: 9, y: 0 });
    expect(p).toEqual({ x: 5, y: 0 });
  });

  it('içeriden de dışarıdan da çember üzerine oturur', () => {
    for (const q of [{ x: 1, y: 1 }, { x: 20, y: -14 }]) {
      const p = closestPointOnCircle({ x: 2, y: -1 }, 3, q);
      yakin(calculateDistance(p, { x: 2, y: -1 }), 3, 9);
    }
  });

  it('merkezin kendisinde çökmez', () => {
    const p = closestPointOnCircle({ x: 4, y: 4 }, 2, { x: 4, y: 4 });
    yakin(calculateDistance(p, { x: 4, y: 4 }), 2);
  });
});

describe('Elips üzerinde en yakın nokta', () => {
  it('bulunan nokta elips denklemini sağlar', () => {
    const merkez = { x: 1, y: -2 };
    const p = closestPointOnEllipse(merkez, 4, 2, { x: 9, y: 5 })!;
    yakin(((p.x - merkez.x) / 4) ** 2 + ((p.y - merkez.y) / 2) ** 2, 1, 9);
  });

  it('a = b iken çemberle aynı sonucu verir', () => {
    const e = closestPointOnEllipse({ x: 0, y: 0 }, 3, 3, { x: 7, y: 7 })!;
    const c = closestPointOnCircle({ x: 0, y: 0 }, 3, { x: 7, y: 7 });
    yakin(e.x, c.x, 9);
    yakin(e.y, c.y, 9);
  });

  it('sıfır yarıçapta null döner', () => {
    expect(closestPointOnEllipse({ x: 0, y: 0 }, 0, 2, { x: 1, y: 1 })).toBeNull();
  });
});

describe('Çokgen kenarında en yakın nokta', () => {
  const kare = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
  ];

  it('en yakın kenarı ve o kenardaki noktayı bulur', () => {
    const r = closestPointOnPolygonEdge(kare, { x: 2, y: -0.3 })!;
    expect(r.edgeIndex).toBe(0);
    yakin(r.point.x, 2);
    yakin(r.point.y, 0);
    yakin(r.distance, 0.3);
  });

  it('köşeye yakın tıklamada köşeyi verir', () => {
    const r = closestPointOnPolygonEdge(kare, { x: -0.2, y: -0.2 })!;
    yakin(r.point.x, 0);
    yakin(r.point.y, 0);
  });

  it('şeklin içinden tıklanınca en yakın kenara düşer', () => {
    const r = closestPointOnPolygonEdge(kare, { x: 3.5, y: 2 })!;
    expect(r.edgeIndex).toBe(1);
    yakin(r.point.x, 4);
  });
});

describe('Alanı kirişle bölme', () => {
  const kare = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
  ];

  it('kareyi iki parçaya böler ve alanlar toplamı korunur', () => {
    // Alt kenarın ortası ile üst kenarın ortası
    const parcalar = splitPolygonByChord(kare, 0, { x: 2, y: 0 }, 2, { x: 2, y: 4 })!;
    expect(parcalar).toHaveLength(2);
    const [p1, p2] = parcalar;
    yakin(calculatePolygonArea(p1) + calculatePolygonArea(p2), calculatePolygonArea(kare), 9);
  });

  it('kareyi tam ortadan bölünce iki eşit parça çıkar', () => {
    const [p1, p2] = splitPolygonByChord(kare, 0, { x: 2, y: 0 }, 2, { x: 2, y: 4 })!;
    yakin(calculatePolygonArea(p1), 8, 9);
    yakin(calculatePolygonArea(p2), 8, 9);
  });

  it('her parça iki kesme noktasını da içerir', () => {
    const A = { x: 1, y: 0 };
    const B = { x: 4, y: 3 };
    const [p1, p2] = splitPolygonByChord(kare, 0, A, 1, B)!;
    for (const p of [p1, p2]) {
      expect(p.some((v) => v.x === A.x && v.y === A.y)).toBe(true);
      expect(p.some((v) => v.x === B.x && v.y === B.y)).toBe(true);
    }
  });

  it('aynı kenardaki iki nokta alanı bölmez', () => {
    expect(splitPolygonByChord(kare, 0, { x: 1, y: 0 }, 0, { x: 3, y: 0 })).toBeNull();
  });

  it('üçgende de çalışır', () => {
    const ucgen = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 0, y: 6 },
    ];
    const [p1, p2] = splitPolygonByChord(ucgen, 0, { x: 3, y: 0 }, 1, { x: 3, y: 3 })!;
    yakin(calculatePolygonArea(p1) + calculatePolygonArea(p2), calculatePolygonArea(ucgen), 9);
  });

  it('üçten az köşede null döner', () => {
    expect(splitPolygonByChord([{ x: 0, y: 0 }, { x: 1, y: 1 }], 0, { x: 0, y: 0 }, 1, { x: 1, y: 1 })).toBeNull();
  });
});

describe('Nesneye bağlı noktayı geri oturtma (projectOntoHost)', () => {
  it('çemberden kopan noktayı tam yarıçapa döndürür', () => {
    // Kullanıcı çember üzerindeki noktayı sürükleyince nokta çemberden
    // ayrılıyordu; bağlı nokta yalnızca çemberin ÜZERİNDE kaymalıdır.
    const iz = projectOntoHost(
      { x: 5, y: 0.4 },
      { kind: 'circle', center: { x: 0, y: 0 }, radius: 2 }
    );
    expect(iz).not.toBeNull();
    expect(Math.hypot(iz!.x, iz!.y)).toBeCloseTo(2, 9);
  });

  it('çember üzerindeki noktayı sürüklenen YÖNDE tutar', () => {
    const iz = projectOntoHost(
      { x: 0.1, y: 9 },
      { kind: 'circle', center: { x: 0, y: 0 }, radius: 2 }
    );
    // Yukarı sürüklendiyse çemberin üst yayına oturmalı
    expect(iz!.y).toBeGreaterThan(1.9);
  });

  it('doğru parçasında uçların dışına taşmaz', () => {
    const iz = projectOntoHost(
      { x: 10, y: 3 },
      { kind: 'segment', a: { x: 0, y: 0 }, b: { x: 4, y: 0 } }
    );
    expect(iz).toEqual({ x: 4, y: 0 });
  });

  it('sonsuz doğruda uçların ötesine izin verir', () => {
    const iz = projectOntoHost(
      { x: 10, y: 3 },
      { kind: 'line', a: { x: 0, y: 0 }, b: { x: 4, y: 0 } }
    );
    expect(iz!.x).toBeCloseTo(10, 9);
    expect(iz!.y).toBeCloseTo(0, 9);
  });

  it('çokgende en yakın KENARA oturtur', () => {
    const kare = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ];
    // Karenin içinde bir yer: en yakın kenar alt kenardır
    const iz = projectOntoHost({ x: 2, y: 0.6 }, { kind: 'polygon', vertices: kare });
    expect(iz).toEqual({ x: 2, y: 0 });
  });

  it('elipste yarıçapları bozmadan üzerinde tutar', () => {
    const iz = projectOntoHost(
      { x: 6, y: 6 },
      { kind: 'ellipse', center: { x: 0, y: 0 }, radiusX: 3, radiusY: 1 }
    );
    const bagintiSonucu = (iz!.x / 3) ** 2 + (iz!.y / 1) ** 2;
    expect(bagintiSonucu).toBeCloseTo(1, 4);
  });

  it('yarıçapı sıfır olan çemberde bağ kurmaz', () => {
    expect(
      projectOntoHost({ x: 1, y: 1 }, { kind: 'circle', center: { x: 0, y: 0 }, radius: 0 })
    ).toBeNull();
  });
});
