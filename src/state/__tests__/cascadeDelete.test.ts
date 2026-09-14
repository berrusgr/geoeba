import { describe, it, expect } from 'vitest';
import { collectDependentIds, objectDependencies } from '@/state/WorkspaceContext';
import type { MathObject } from '@/types/math';

const t = 1750000000000;
const nokta = (id: string): MathObject =>
  ({ id, type: 'point', label: id, showLabel: true, x: 0, y: 0, visible: true, createdAt: t }) as MathObject;

const yap = (o: Record<string, unknown>): MathObject =>
  ({ showLabel: true, visible: true, createdAt: t, label: String(o.id), ...o }) as MathObject;

const sil = (objeler: MathObject[], ids: string[]) => [...collectDependentIds(objeler, ids)].sort();

/**
 * Bir nesne silindiğinde ona dayanan HER ŞEY silinmelidir; aksi hâlde var olmayan
 * bir noktaya işaret eden nesneler belgede kalır ve ekranda görünmeden listeyi kirletir.
 */
describe('Bağımlı nesnelerin birlikte silinmesi', () => {
  it('çember silinince kullanılmayan merkezi de siler', () => {
    const o = [nokta('M'), nokta('R'), yap({ id: 'c', type: 'circle', centerPointId: 'M', radiusPointId: 'R' })];
    expect(sil(o, ['c'])).toEqual(['M', 'c']);
  });

  it('başka çizimin kullandığı ortak merkezi korur', () => {
    const o = [nokta('M'), nokta('R'), yap({ id: 'c', type: 'circle', centerPointId: 'M', fixedRadius: 2 }),
      yap({ id: 's', type: 'segment', startPointId: 'M', endPointId: 'R' })];
    expect(sil(o, ['c'])).toEqual(['c']);
  });

  it('aynı merkezli tüm çemberler silinince merkezi temizler', () => {
    const o = [nokta('M'), yap({ id: 'c1', type: 'circle', centerPointId: 'M', fixedRadius: 2 }),
      yap({ id: 'c2', type: 'circle', centerPointId: 'M', fixedRadius: 3 })];
    expect(sil(o, ['c1'])).toEqual(['c1']);
    expect(sil(o, ['c1', 'c2'])).toEqual(['M', 'c1', 'c2']);
  });
  it('nokta silinince onu kullanan doğru parçası da silinir', () => {
    const o = [nokta('A'), nokta('B'), yap({ id: 's1', type: 'segment', startPointId: 'A', endPointId: 'B' })];
    expect(sil(o, ['A'])).toEqual(['A', 's1']);
  });

  it('zincirleme bağımlılık geçişli olarak temizlenir', () => {
    const o = [
      nokta('A'),
      nokta('B'),
      yap({ id: 's1', type: 'segment', startPointId: 'A', endPointId: 'B' }),
      // Doğru parçasının uçlarını kullanan bir açı
      nokta('C'),
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
    ];
    expect(sil(o, ['A'])).toEqual(['A', 'ang', 's1']);
  });

  it('ELİPS de bağımlılığa dâhildir (eskiden atlanıyordu)', () => {
    const o = [nokta('M'), yap({ id: 'e1', type: 'ellipse', centerPointId: 'M', radiusX: 2, radiusY: 1 })];
    expect(sil(o, ['M'])).toEqual(['M', 'e1']);
  });

  it('ÖLÇÜM ETİKETİ de bağımlılığa dâhildir', () => {
    const o = [
      nokta('A'),
      nokta('B'),
      yap({ id: 'm1', type: 'measurement', kind: 'slope', pointIds: ['A', 'B'] }),
    ];
    expect(sil(o, ['B'])).toEqual(['B', 'm1']);
  });

  it('işaret kutusu, düğme ve girdi kutusu bağlı nesneyle birlikte gider', () => {
    const o = [
      nokta('A'),
      yap({ id: 'chk', type: 'checkbox', x: 0, y: 0, targetIds: ['A'], checked: true }),
      yap({ id: 'btn', type: 'button', x: 0, y: 0, action: { kind: 'toggle', targetIds: ['A'] } }),
      yap({ id: 'sld', type: 'slider', variableName: 'a', min: 0, max: 5, step: 0.1, value: 1 }),
      yap({ id: 'inp', type: 'input_box', x: 0, y: 0, targetId: 'sld', field: 'value' }),
    ];
    expect(sil(o, ['A'])).toEqual(['A', 'btn', 'chk']);
    expect(sil(o, ['sld'])).toEqual(['inp', 'sld']);
  });
});

/**
 * Kullanıcı bir ŞEKLİ sildiğinde o şekle ait ölçüm ve açı etiketleri de gitmelidir.
 */
describe('Şekle ait etiketlerin silinmesi', () => {
  const ucgen = () => [
    nokta('A'),
    nokta('B'),
    nokta('C'),
    yap({ id: 'poly', type: 'polygon', pointIds: ['A', 'B', 'C'] }),
  ];

  it('üçgen silinince köşelerindeki açı etiketi de silinir', () => {
    const o = [...ucgen(), yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' })];
    expect(sil(o, ['poly'])).toEqual(['ang', 'poly']);
  });

  it('üçgen silinince trig ölçüm etiketi de silinir', () => {
    const o = [
      ...ucgen(),
      yap({ id: 'trig', type: 'measurement', kind: 'trig', pointIds: ['A', 'B', 'C'] }),
    ];
    expect(sil(o, ['poly'])).toEqual(['poly', 'trig']);
  });

  it('köşe noktaları KORUNUR: bağımsız nesnelerdir', () => {
    const o = [...ucgen(), yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' })];
    const kalan = sil(o, ['poly']);
    expect(kalan).not.toContain('A');
    expect(kalan).not.toContain('B');
    expect(kalan).not.toContain('C');
  });

  it('şeklin DIŞINDAKİ bir noktayı da kullanan etiket korunur', () => {
    const o = [
      ...ucgen(),
      nokta('D'),
      // ∠ABD: D üçgenin köşesi değil, bu yüzden üçgene ait sayılmaz
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'D' }),
    ];
    expect(sil(o, ['poly'])).toEqual(['poly']);
  });

  it('doğru parçası silinince üç noktalı açı etiketi korunur', () => {
    const o = [
      nokta('A'),
      nokta('B'),
      nokta('C'),
      yap({ id: 's1', type: 'segment', startPointId: 'A', endPointId: 'B' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
    ];
    expect(sil(o, ['s1'])).toEqual(['s1']);
  });

  it('yay silinince yayın merkez açısı etiketi de gider', () => {
    const o = [
      nokta('M'),
      nokta('S'),
      nokta('E'),
      yap({ id: 'arc', type: 'arc', centerPointId: 'M', startPointId: 'S', directionPointId: 'E' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'S', vertexPointId: 'M', point3Id: 'E' }),
    ];
    expect(sil(o, ['arc'])).toEqual(['ang', 'arc']);
  });
});

describe('Bağımlılık listesi', () => {
  it('her nesne türü için doğru kimlikleri döndürür', () => {
    expect(objectDependencies(yap({ id: 'c', type: 'circle', centerPointId: 'M', radiusPointId: 'R' }))).toEqual([
      'M',
      'R',
    ]);
    expect(
      objectDependencies(yap({ id: 'c3', type: 'circle', centerPointId: '', throughPointIds: ['A', 'B', 'C'] }))
    ).toEqual(['A', 'B', 'C']);
    expect(objectDependencies(nokta('A'))).toEqual([]);
  });
});

/**
 * "Nesne üzerinde nokta" bağlıdır: barındıran şekil silinince nokta da gitmeli,
 * yoksa çember silindiğinde üzerindeki C ve D havada asılı kalırdı.
 */
describe('Nesne üzerindeki bağlı noktalar', () => {
  const cemberliBelge = () => [
    nokta('M'),
    nokta('R'),
    yap({ id: 'c1', type: 'circle', centerPointId: 'M', radiusPointId: 'R' }),
    yap({ id: 'C', type: 'point', x: 2, y: 0, onObjectId: 'c1' }),
    yap({ id: 'D', type: 'point', x: 0, y: 2, onObjectId: 'c1' }),
  ];

  it('çembere bağlı nokta, çemberin bağımlısı sayılır', () => {
    const C = cemberliBelge().find((o) => o.id === 'C')!;
    expect(objectDependencies(C)).toEqual(['c1']);
  });

  it('çember silinince ÜZERİNDEKİ noktalar da silinir', () => {
    expect(sil(cemberliBelge(), ['c1'])).toEqual(['C', 'D', 'M', 'c1']);
  });

  it('merkez silinince çember ve üzerindeki noktalar zincirleme gider', () => {
    expect(sil(cemberliBelge(), ['M'])).toEqual(['C', 'D', 'M', 'c1']);
  });

  it('üzerindeki noktayı silmek çemberi silmez', () => {
    expect(sil(cemberliBelge(), ['C'])).toEqual(['C']);
  });

  it('bağı olmayan nokta hiçbir şeye bağlı değildir', () => {
    expect(objectDependencies(nokta('A'))).toEqual([]);
  });
});
