import { describe, expect, it } from 'vitest';
import { parseClause, splitClauses } from '../text';
import { CommandScene } from '../scene';
import type { MathObject, PointObject } from '@/types/math';

const pt = (label: string, x = 0, y = 0): PointObject => ({ id: `id-${label}`, type: 'point', label, x, y, showLabel: true, visible: true, color: '#000', isIndependent: true, createdAt: 0 });
const known = (labels: string[]) => ({ points: labels, names: [] });

describe('splitClauses', () => {
  it.each([
    ['üçgen çiz ve alanını göster', ['üçgen çiz', 'alanını göster']],
    ['Üçgen çiz, A noktasının açısını yaz', ['Üçgen çiz', 'A noktasının açısını yaz']],
    ['A ve B noktalarını birleştir', ['A ve B noktalarını birleştir']],
    ['Kenarları 3, 4 ve 5 olan üçgen çiz', ['Kenarları 3, 4 ve 5 olan üçgen çiz']],
    ['bir üçgen ve bir kare çiz', ['bir üçgen çiz', 'bir kare çiz']],
    ['A(0,0), B(4,0) ve C(2,3) noktalarını oluştur sonra ABC üçgenini çiz', ['A(0,0), B(4,0) ve C(2,3) noktalarını oluştur', 'ABC üçgenini çiz']],
    ['A noktasından geçen ve BC doğrusuna paralel doğru çiz', ['A noktasından geçen ve BC doğrusuna paralel doğru çiz']],
    ['AB doğrusu ve CD doğrusunun kesişim noktasını bul', ['AB doğrusu ve CD doğrusunun kesişim noktasını bul']],
    ['üçgen çizip alanını hesapla', ['üçgen çiz', 'alanını hesapla']],
    ['yarıçapı 2,5 olan çember çiz', ['yarıçapı 2,5 olan çember çiz']],
    ['Üçgen çiz. Alanını göster.', ['Üçgen çiz', 'Alanını göster']],
    ['f(x) = max(1, x) çiz', ['f(x) = max(1, x) çiz']],
    ['çemberin alanını ve çevresini göster', ['çemberin alanını göster', 'çevresini göster']],
    ['P (2,5; -3,2) noktası oluştur', ['P (2,5; -3,2) noktası oluştur']],
    ['kare çiz\nçember çiz', ['kare çiz', 'çember çiz']],
  ])('%s', (input, expected) => {
    expect(splitClauses(input)).toEqual(expected);
  });
});

describe('parseClause', () => {
  it('extracts coordinates with decimal commas and point labels', () => {
    const c = parseClause('P (2,5; -3,2) noktası oluştur');
    expect(c.coords).toEqual([{ x: 2.5, y: -3.2 }]);
    expect(c.labels[0].text).toBe('P');
    expect(c.text).toBe('$0 @0 noktasi olustur');
    expect(c.hasVerb('create')).toBe(true);
  });
  it('reads comma-separated coordinates and apostrophe suffixes', () => {
    const c = parseClause("A(2,3) ve B(-1, 4) noktalarını birleştir");
    expect(c.coords).toEqual([{ x: 2, y: 3 }, { x: -1, y: 4 }]);
    expect(parseClause("ABC'nin alanını hesapla").text).toBe('$0nin alanini hesapla');
    expect(parseClause("B'den AC'ye dikme indir").labels.map(l => [l.text, l.suffix])).toEqual([['B', 'den'], ['AC', 'ye']]);
  });
  it('reads number lists, decimals, words and dimensions', () => {
    expect(parseClause('Kenarları 3, 4 ve 5 olan üçgen çiz').numbers).toEqual([3, 4, 5]);
    expect(parseClause('3,4,5 üçgeni çiz').numbers).toEqual([3, 4, 5]);
    expect(parseClause('yarıçapı 2,5 olan çember').numbers).toEqual([2.5]);
    expect(parseClause('3x4 dikdörtgen').numbers).toEqual([3, 4]);
    expect(parseClause('yarıçapı iki buçuk olan çember').numbers).toEqual([2.5]);
    expect(parseClause('kırk beş derecelik açı').numbers).toEqual([45]);
    expect(parseClause('bir üçgen çiz').numbers).toEqual([]);
    expect(parseClause('yarıçapı bir olan çember').numbers).toEqual([1]);
    const c = parseClause('yarıçapı 3 olan çember çiz');
    expect(c.paramAfter(/yaricap/)).toBe(3);
    expect(parseClause('3 yarıçaplı çember').paramBefore(/yaricap/)).toBe(3);
    expect(parseClause('60° açı çiz').isDegrees('#0')).toBe(true);
  });
  it('keeps sentence-case words as words and labels as labels', () => {
    expect(parseClause('Üçgen çiz').labels).toEqual([]);
    expect(parseClause('Kare çiz').labels).toEqual([]);
    expect(parseClause('Ve sonra').labels).toEqual([]);
    expect(parseClause("A'nın simetriğini al").labels[0]).toMatchObject({ text: 'A', suffix: 'nin' });
    expect(parseClause("A' noktasını sil").labels[0].text).toBe("A'");
    expect(parseClause('A_1 noktasını sil').labels[0].text).toBe('A_1');
    expect(parseClause('[AB] parçasını ölç').labels[0]).toMatchObject({ text: 'AB', bracket: 'segment' });
    expect(parseClause('X eksenine göre yansıt').labels).toEqual([]);
  });
  it('recognises lowercase labels only with scene or context support', () => {
    expect(parseClause('abc üçgeninin alanı', known(['A', 'B', 'C'])).labels[0].text).toBe('ABC');
    expect(parseClause('a noktası oluştur').labels[0].text).toBe('A');
    expect(parseClause('abnin orta noktası', known(['A', 'B'])).labels[0]).toMatchObject({ text: 'AB', suffix: 'nin' });
    expect(parseClause('bir kare çiz', known(['B', 'I', 'R'])).labels).toEqual([]);
    expect(parseClause('kare çiz', known(['K', 'A', 'R', 'E'])).labels).toEqual([]);
  });
  it('detects definitions, assignments, quotes and negation', () => {
    expect(parseClause('f(x) = x^2 + 1').definition).toEqual({ name: 'f', body: 'x^2 + 1' });
    expect(parseClause('g(x)=2x grafiğini çiz').definition?.name).toBe('g');
    expect(parseClause('y = 2x + 1').definition?.name).toBe('y');
    expect(parseClause('ab = 4').assignment).toEqual({ name: 'ab', valueRaw: '4' });
    const q = parseClause('"A ve B eşit değil" yazısı ekle');
    expect(q.quotes).toEqual(['A ve B eşit değil']);
    expect(q.negated).toBe(false);
    expect(parseClause('üçgen çizme').negated).toBe(true);
    expect(parseClause('üçgen çizmeyin').negated).toBe(true);
  });
});

describe('CommandScene', () => {
  const scene: MathObject[] = [pt('A', 0, 0), pt('B', 4, 0), pt('C', 0, 3), pt('A_1', 9, 9), pt("A'", 1, 1)];
  it('decomposes multi-point labels including A_1 and primes', () => {
    const s = new CommandScene(scene);
    expect(s.pointsFromLabel('ABC')?.map(p => p.label)).toEqual(['A', 'B', 'C']);
    expect(s.pointsFromLabel('A_1B')?.map(p => p.label)).toEqual(['A_1', 'B']);
    expect(s.pointsFromLabel("A'B")?.map(p => p.label)).toEqual(["A'", 'B']);
    expect(s.pointsFromLabel('abc')?.map(p => p.label)).toEqual(['A', 'B', 'C']);
    expect(s.pointsFromLabel('AD')).toBeNull();
  });
  it('creates tool-compatible objects and resolves shapes by their points', () => {
    const s = new CommandScene(scene);
    const poly = s.addPolygon(['id-A', 'id-B', 'id-C'], { kind: 'triangle' });
    expect(s.resolveLabel('ABC', ['polygon'])).toEqual([poly]);
    expect(s.resolveLabel('CBA', ['polygon'])).toEqual([poly]);
    const seg = s.addSegment('id-A', 'id-B');
    expect(seg.label).toBe('[AB]');
    expect(s.addSegment('id-B', 'id-A')).toBe(seg);
    expect(s.resolveLabel({ text: 'AB', suffix: '', bracket: 'segment' })).toEqual([seg]);
    expect(scene).toHaveLength(5);
  });
  it('places new shapes beside existing drawings', () => {
    const s = new CommandScene(scene);
    const spot = s.placeShape(4, 4);
    expect(spot.x - 2).toBeGreaterThan(9);
  });
});
