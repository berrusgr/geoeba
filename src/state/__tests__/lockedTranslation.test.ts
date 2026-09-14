import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject, SegmentObject, ArcObject, PolygonObject } from '@/types/math';
import {
  bagliNoktalariOturt,
  bagiParcalaraDevret,
  kilitliOtelemeler,
  kilitliOtelemeVektoru,
  sarkikBaglariCoz,
} from '@/state/WorkspaceContext';

const common = { showLabel: true, color: 'b', visible: true, createdAt: 0 };
const pt = (id: string, x: number, y: number, onObjectId?: string): PointObject =>
  ({ id, label: id, type: 'point', x, y, isIndependent: true, ...common, ...(onObjectId ? { onObjectId } : {}) });
const line = (id: string, a: string, b: string): MathObject => ({ id, label: id, type: 'line', point1Id: a, point2Id: b, ...common });
const seg = (id: string, s: string, e: string): SegmentObject => ({ id, label: id, type: 'segment', startPointId: s, endPointId: e, ...common });
const arc = (id: string, c: string, s: string, d: string): ArcObject => ({ id, label: id, type: 'arc', centerPointId: c, startPointId: s, directionPointId: d, ...common });
const get = (scene: MathObject[], id: string) => scene.find((o) => o.id === id) as PointObject;
const r = (scene: MathObject[], a: string, b: string) => Math.hypot(get(scene, a).x - get(scene, b).x, get(scene, a).y - get(scene, b).y);

/**
 * Canvas sürükleme döngüsünün sade kopyası: delta, çapa noktasının GÜNCEL konumundan hesaplanır
 * (Canvas.tsx), moveObjects gibi kısıtlı ortak vektörle kaydırılır ve reducer gibi yeniden oturtulur.
 */
function surukle(scene: MathObject[], shiftIds: string[], anchorId: string, by: { x: number; y: number }, steps: number) {
  const ids = new Set(shiftIds);
  const start = get(scene, anchorId);
  for (let i = 1; i <= steps; i++) {
    const anchor = get(scene, anchorId);
    const delta = { x: start.x + (by.x * i) / steps - anchor.x, y: start.y + (by.y * i) / steps - anchor.y };
    const d = kilitliOtelemeVektoru(scene, ids, delta);
    const shifted = scene.map((o) => (o.type === 'point' && ids.has(o.id) ? { ...o, x: o.x + d.x, y: o.y + d.y } : o));
    scene = bagliNoktalariOturt(shifted, scene);
  }
  return scene;
}

describe('kilitli tanım noktasıyla şekil taşıma', () => {
  it('merkezi doğruya kilitli çember sürüklenince BÜYÜMEZ, doğru boyunca kayar', () => {
    let scene: MathObject[] = [pt('A', -6, 0), pt('B', 6, 0), line('l', 'A', 'B'), pt('O', 0, 0, 'l'), pt('R', 0, 2),
      { id: 'c', label: 'c', type: 'circle', centerPointId: 'O', radiusPointId: 'R', ...common }];
    scene = surukle(scene, ['O', 'R'], 'O', { x: 1, y: 1 }, 10);
    expect(r(scene, 'O', 'R')).toBeCloseTo(2, 9);
    expect(get(scene, 'O')).toMatchObject({ y: 0 });
    expect(get(scene, 'O').x).toBeCloseTo(1, 9);
    // Fare aynı yerde titrerken de yarıçap birikmez
    for (let i = 0; i < 20; i++) scene = surukle(scene, ['O', 'R'], 'O', { x: 0, y: i % 2 ? 0.01 : -0.01 }, 1);
    expect(r(scene, 'O', 'R')).toBeCloseTo(2, 9);
  });

  it('yarıçap noktası başka bir doğruya kilitliyse çember yalnız o doğru boyunca ötelenir', () => {
    let scene: MathObject[] = [pt('A', -6, 2), pt('B', 6, 2), line('l', 'A', 'B'), pt('O', 0, 0), pt('R', 0, 2, 'l'),
      { id: 'c', label: 'c', type: 'circle', centerPointId: 'O', radiusPointId: 'R', ...common }];
    scene = surukle(scene, ['O', 'R'], 'O', { x: 1, y: -1 }, 8);
    expect(r(scene, 'O', 'R')).toBeCloseTo(2, 9);
    expect(get(scene, 'R').y).toBeCloseTo(2, 9);
    expect(get(scene, 'O').x).toBeCloseTo(1, 9);
    expect(get(scene, 'O').y).toBeCloseTo(0, 9);
  });

  it('merkezi başka bir çembere kilitli parça boyunu korur ve merkez o çemberde kalır', () => {
    let scene: MathObject[] = [pt('M', 0, 0), { id: 'dis', label: 'dis', type: 'circle', centerPointId: 'M', fixedRadius: 3, ...common },
      pt('C', 3, 0, 'dis'), pt('D', 3, 2), seg('s', 'C', 'D')];
    scene = surukle(scene, ['C', 'D'], 'C', { x: -0.4, y: 0.8 }, 12);
    expect(r(scene, 'C', 'D')).toBeCloseTo(2, 7);
    expect(Math.hypot(get(scene, 'C').x, get(scene, 'C').y)).toBeCloseTo(3, 9);
  });

  it('kilitleri birlikte sağlayan öteleme yoksa şekil yerinde kalır (bozulmaz)', () => {
    const scene: MathObject[] = [pt('A', -6, 0), pt('B', 6, 0), line('l', 'A', 'B'), pt('E', 1, -6), pt('F', 1, 6), line('m', 'E', 'F'),
      pt('O', 1, 0, 'l'), pt('R', 1, 2, 'm'), { id: 'c', label: 'c', type: 'circle', centerPointId: 'O', radiusPointId: 'R', ...common }];
    expect(kilitliOtelemeVektoru(scene, new Set(['O', 'R']), { x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
  });

  it('kilitli nokta yoksa ya da taşıyıcısı da bütün olarak kayıyorsa delta aynen döner', () => {
    const delta = { x: 1, y: 1 };
    const free: MathObject[] = [pt('O', 0, 0), pt('R', 0, 2)];
    expect(kilitliOtelemeVektoru(free, new Set(['O', 'R']), delta)).toBe(delta);
    const riding: MathObject[] = [pt('O', 0, 0), { id: 'c', label: 'c', type: 'circle', centerPointId: 'O', fixedRadius: 2, ...common }, pt('Q', 2, 0, 'c')];
    expect(kilitliOtelemeVektoru(riding, new Set(['O', 'Q']), delta)).toBe(delta);
  });

  it('tek başına sürüklenen kilitli nokta taşıyıcısı boyunca kayar', () => {
    const scene: MathObject[] = [pt('A', -6, 0), pt('B', 6, 0), line('l', 'A', 'B'), pt('P', 0, 0, 'l')];
    expect(kilitliOtelemeVektoru(scene, new Set(['P']), { x: 1, y: 1 })).toEqual({ x: 1, y: 0 });
  });
});

describe('kısıt yalnızca sabit taşıyıcıdan gelir; seçimdeki gruplar ayrı ötelenir', () => {
  it('taşıyıcısı da kayan nokta (yarıçap parçası [OQ], Q çemberde) sürüklemeyi dondurmaz', () => {
    const scene: MathObject[] = [pt('O', 0, 0), pt('R', 2, 0), { id: 'c', label: 'c', type: 'circle', centerPointId: 'O', radiusPointId: 'R', ...common },
      pt('Q', 0, 2, 'c'), seg('oq', 'O', 'Q')];
    const delta = { x: 0.1, y: 0 };
    expect(kilitliOtelemeVektoru(scene, new Set(['O', 'Q']), delta)).toBe(delta);
  });

  it('seçimdeki başka doğruya kilitli nokta, bağımsız üçgeni dondurmaz', () => {
    const scene: MathObject[] = [pt('K', -6, 0), pt('L', 6, 0), line('l', 'K', 'L'), pt('P', 0, 0, 'l'),
      pt('A', 2, 2), pt('B', 4, 2), pt('C', 3, 4), { id: 'abc', label: 'abc', type: 'polygon', pointIds: ['A', 'B', 'C'], ...common } as PolygonObject];
    const v = kilitliOtelemeler(scene, new Set(['A', 'B', 'C', 'P']), { x: 0, y: 1 });
    expect(v.get('A')).toEqual({ x: 0, y: 1 });
    expect(v.get('C')).toEqual({ x: 0, y: 1 });
    expect(v.get('P')).toEqual({ x: 0, y: 0 });
  });

  it('etiketler (eğim ölçümü, açı) serbest üçgeni kilitli noktanın grubuna katmaz', () => {
    const scene: MathObject[] = [pt('K', -6, 0), pt('L', 6, 0), line('l', 'K', 'L'), pt('P', 0, 0, 'l'),
      pt('A', 2, 2), pt('B', 4, 2), pt('C', 3, 4), { id: 'abc', label: 'abc', type: 'polygon', pointIds: ['A', 'B', 'C'], ...common } as PolygonObject,
      { id: 'egim', label: 'egim', type: 'measurement', kind: 'slope', pointIds: ['A', 'P'], ...common } as MathObject,
      { id: 'aci', label: 'aci', type: 'angle', point1Id: 'B', vertexPointId: 'A', point3Id: 'P', ...common } as MathObject];
    const v = kilitliOtelemeler(scene, new Set(['A', 'B', 'C', 'P']), { x: 0, y: 1 });
    expect(v.get('A')).toEqual({ x: 0, y: 1 });
    expect(v.get('P')).toEqual({ x: 0, y: 0 });
  });

  it('seçimdeki eğim etiketi ya da onay kutusu (noktalarını taşımazlar) serbest üçgeni dondurmaz', () => {
    const scene: MathObject[] = [pt('K', -6, 0), pt('L', 6, 0), line('l', 'K', 'L'), pt('P', 0, 0, 'l'),
      pt('A', 2, 2), pt('B', 4, 2), pt('C', 3, 4), { id: 'abc', label: 'abc', type: 'polygon', pointIds: ['A', 'B', 'C'], ...common } as PolygonObject,
      { id: 'egim', label: 'egim', type: 'measurement', kind: 'slope', pointIds: ['A', 'P'], ...common } as MathObject,
      { id: 'kutu', label: 'kutu', type: 'checkbox', x: 0, y: 5, targetIds: ['A', 'P'], checked: true, ...common } as MathObject];
    const v = kilitliOtelemeler(scene, new Set(['A', 'B', 'C', 'P']), { x: 0, y: 1 }, undefined, new Set(['abc', 'P', 'egim', 'kutu']));
    expect(v.get('A')).toEqual({ x: 0, y: 1 });
    expect(v.get('P')).toEqual({ x: 0, y: 0 });
  });

  it('KENDİSİ sürüklenen açı nesnesi kollarıyla birlikte kayar; tepe noktası kilitliyse bütün açı kısıtlanır', () => {
    const scene: MathObject[] = [pt('K', -6, 0), pt('L', 6, 0), line('l', 'K', 'L'), pt('B', 0, 0, 'l'), pt('A', -2, 2), pt('C', 2, 2),
      { id: 'aci', label: 'aci', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C', ...common } as MathObject];
    const v = kilitliOtelemeler(scene, new Set(['A', 'B', 'C']), { x: 1, y: 1 }, undefined, new Set(['aci']));
    expect(v.get('A')).toEqual({ x: 1, y: 0 });
    expect(v.get('B')).toEqual({ x: 1, y: 0 });
    expect(v.get('C')).toEqual({ x: 1, y: 0 });
  });

  it('kilitli noktadan tutulan karışık seçimde serbest şekil farenin adımı kadar kayar (birikmez)', () => {
    let scene: MathObject[] = [pt('K', -6, 0), pt('L', 6, 0), line('l', 'K', 'L'), pt('P', 0, 0, 'l'),
      pt('A', 2, 2), pt('B', 4, 2), pt('C', 3, 4), { id: 'abc', label: 'abc', type: 'polygon', pointIds: ['A', 'B', 'C'], ...common } as PolygonObject];
    const ids = new Set(['A', 'B', 'C', 'P']);
    // Canvas sürükleme döngüsü: hedef = çapa başlangıcı + fare yolu; seçim hedef − sanal çapa kadar,
    // çapanın (P) grubu ise hedef − gerçek çapa kadar kaymak ister.
    let sanal = { x: 0, y: 0 };
    for (let i = 1; i <= 20; i++) {
      const hedef = { x: i / 20, y: i / 20 };
      const capa = get(scene, 'P');
      const delta = { x: hedef.x - sanal.x, y: hedef.y - sanal.y };
      const v = kilitliOtelemeler(scene, ids, delta, { id: 'P', delta: { x: hedef.x - capa.x, y: hedef.y - capa.y } });
      const kaymis = scene.map((o) => (o.type === 'point' && ids.has(o.id) ? { ...o, x: o.x + v.get(o.id)!.x, y: o.y + v.get(o.id)!.y } : o));
      scene = bagliNoktalariOturt(kaymis, scene);
      sanal = hedef;
    }
    expect(get(scene, 'A').x).toBeCloseTo(3, 9);
    expect(get(scene, 'A').y).toBeCloseTo(3, 9);
    expect(get(scene, 'P').x).toBeCloseTo(1, 9);
    expect(get(scene, 'P').y).toBeCloseTo(0, 9);
  });

  it('aynı şeklin noktaları tek grupta kalır: kilitli merkez yarıçap noktasını da kısıtlar', () => {
    const scene: MathObject[] = [pt('K', -6, 0), pt('L', 6, 0), line('l', 'K', 'L'), pt('O', 0, 0, 'l'), pt('R', 0, 2),
      { id: 'c', label: 'c', type: 'circle', centerPointId: 'O', radiusPointId: 'R', ...common }];
    const v = kilitliOtelemeler(scene, new Set(['O', 'R']), { x: 1, y: 1 });
    expect(v.get('O')).toEqual({ x: 1, y: 0 });
    expect(v.get('R')).toEqual({ x: 1, y: 0 });
  });
});

describe('sarkık kilitler', () => {
  it('taşıyıcısı silinmiş noktanın bağı çözülür; sarkık bağ yoksa aynı dizi döner', () => {
    const scene: MathObject[] = [pt('Q', 2, 1, 'silinmis')];
    const cozuldu = sarkikBaglariCoz(scene);
    expect('onObjectId' in get(cozuldu, 'Q')).toBe(false);
    expect(get(bagliNoktalariOturt(scene), 'Q').onObjectId).toBeUndefined();
    const saglam: MathObject[] = [pt('A', 0, 0), pt('B', 4, 0), seg('s', 'A', 'B'), pt('P', 2, 0, 's')];
    expect(sarkikBaglariCoz(saglam)).toBe(saglam);
  });
});

describe('bölmeden sonra kilit yeni parçaya geçer', () => {
  it('doğru parçası', () => {
    const prev: MathObject[] = [pt('A', -4, 0), pt('B', 4, 0), seg('s', 'A', 'B'), pt('P', -1, 0), pt('Q', 2, 0, 's')];
    const sol = seg('s1', 'A', 'P'), sag = seg('s2', 'P', 'B');
    const next = [...bagiParcalaraDevret(prev, 's', [sol, sag]).filter((o) => o.id !== 's'), sol, sag];
    expect(get(next, 'Q').onObjectId).toBe('s2');
    const suruklendi = next.map((o) => (o.id === 'Q' ? { ...o, y: 2 } : o));
    expect(get(bagliNoktalariOturt(suruklendi, next), 'Q').y).toBeCloseTo(0);
  });

  it('çember iki yaya, yay iki yaya, çokgen iki parçaya', () => {
    const cember: MathObject[] = [pt('O', 0, 0), { id: 'c', label: 'c', type: 'circle', centerPointId: 'O', fixedRadius: 3, ...common },
      pt('C', 3, 0), pt('D', 0, 3), pt('E', -3, 0, 'c')];
    expect(get(bagiParcalaraDevret(cember, 'c', [arc('y1', 'O', 'C', 'D'), arc('y2', 'O', 'D', 'C')]), 'E').onObjectId).toBe('y2');

    const yay: MathObject[] = [pt('O', 0, 0), pt('S', 3, 0), pt('T', 0, 3), arc('ar', 'O', 'S', 'T'),
      pt('F', 3 * Math.cos(Math.PI / 6), 3 * Math.sin(Math.PI / 6)), pt('G', 3 * Math.cos(Math.PI / 3), 3 * Math.sin(Math.PI / 3), 'ar')];
    expect(get(bagiParcalaraDevret(yay, 'ar', [arc('a1', 'O', 'S', 'F'), arc('a2', 'O', 'F', 'T')]), 'G').onObjectId).toBe('a2');

    const cokgen: MathObject[] = [pt('K', -3, -2), pt('L', 3, -2), pt('M', 0, 3),
      { id: 'pg', label: 'pg', type: 'polygon', pointIds: ['K', 'L', 'M'], ...common } as PolygonObject,
      pt('H', 0, -2), pt('I', 1.5, 0.5), pt('J', -1.5, 0.5, 'pg')];
    const p1 = { id: 'p1', label: 'p1', type: 'polygon', pointIds: ['H', 'L', 'I'], ...common } as PolygonObject;
    const p2 = { id: 'p2', label: 'p2', type: 'polygon', pointIds: ['I', 'M', 'K', 'H'], ...common } as PolygonObject;
    expect(get(bagiParcalaraDevret(cokgen, 'pg', [p1, p2]), 'J').onObjectId).toBe('p2');
  });

  it('hiçbir parçada olmayan noktanın bağı kaldırılır', () => {
    const prev: MathObject[] = [pt('A', -4, 0), pt('B', 4, 0), seg('s', 'A', 'B'), pt('P', -1, 0), pt('Z', 0, 5, 's')];
    expect('onObjectId' in get(bagiParcalaraDevret(prev, 's', [seg('s1', 'A', 'P')]), 'Z')).toBe(false);
  });
});
