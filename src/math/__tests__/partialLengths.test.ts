import { describe, it, expect } from 'vitest';
import type { MathObject, MeasurementObject, SegmentObject } from '@/types/math';
import { collectDependentIds, objectDependencies } from '@/state/WorkspaceContext';
import { copyObjects, pasteObjects } from '@/math/objectClipboard';
import {
  collinearSegmentChain,
  distanceLabelLevel,
  isLengthShown,
  lengthOptionsAtPoint,
  orderedPointsOnStraight,
  straightLengthOptions,
  withLengthMeasurement,
} from '../partialLengths';

const t0 = 1750000000000;
const nokta = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MathObject =>
  ({ id, type: 'point', label: id, showLabel: true, x, y, visible: true, isIndependent: true, createdAt: t0, ...extra }) as MathObject;
const yap = (o: Record<string, unknown>): MathObject =>
  ({ showLabel: true, visible: true, createdAt: t0, label: String(o.id), color: '#000', ...o }) as MathObject;
const ciftler = (opts: { fromId: string; toId: string; role: string }[]) => opts.map((o) => `${o.role}:${o.fromId}${o.toId}`);

/** A(-3,0) — P(-1,0, [AB]'ye bağlı) — B(3,0) */
const parcaUzerindeNokta = () => [
  nokta('A', -3, 0),
  nokta('B', 3, 0),
  yap({ id: 'ab', type: 'segment', label: '[AB]', startPointId: 'A', endPointId: 'B', showLength: true }),
  nokta('P', -1, 0, { onObjectId: 'ab' }),
];

/** splitSegmentAtPoint çıktısı: [AB] silinir, [AP] + [PB] kalır, P'nin bağı çözülür */
const bolunmus = () => [
  nokta('A', -3, 0),
  nokta('B', 3, 0),
  nokta('P', -1, 0),
  yap({ id: 'ap', type: 'segment', label: '[AP]', startPointId: 'A', endPointId: 'P' }),
  yap({ id: 'pb', type: 'segment', label: '[PB]', startPointId: 'P', endPointId: 'B' }),
];

describe('Parça üzerindeki nokta: uzunluk seçenekleri', () => {
  it('noktasız parçada yalnızca baştan sona seçeneği vardır', () => {
    const o = [nokta('A', 0, 0), nokta('B', 4, 0), yap({ id: 'ab', type: 'segment', startPointId: 'A', endPointId: 'B' })];
    expect(ciftler(straightLengthOptions(o, 'ab').options)).toEqual(['whole:AB']);
  });

  it('parçaya sağ tık: [AB] baştan sona, [AP] P noktasına kadar, [PB] P noktasından sona', () => {
    expect(ciftler(straightLengthOptions(parcaUzerindeNokta(), 'ab').options)).toEqual([
      'whole:AB',
      'toPoint:AP',
      'fromPoint:PB',
    ]);
  });

  it('bağlı olmayan ama geometrik olarak üzerinde duran nokta da sayılır', () => {
    const o = parcaUzerindeNokta().map((x) => (x.id === 'P' ? nokta('P', -1, 0) : x));
    expect(orderedPointsOnStraight(o, 'ab').map((p) => p.id)).toEqual(['A', 'P', 'B']);
  });

  it('parça ters yönde çizilmişse baş, başlangıç noktasıdır', () => {
    const o = [nokta('A', 3, 0), nokta('B', -3, 0), yap({ id: 'ab', type: 'segment', startPointId: 'A', endPointId: 'B' }), nokta('P', 1, 0, { onObjectId: 'ab' })];
    expect(ciftler(straightLengthOptions(o, 'ab').options)).toEqual(['whole:AB', 'toPoint:AP', 'fromPoint:PB']);
  });

  it('noktanın kendi menüsü aynı ölçümleri verir', () => {
    const r = lengthOptionsAtPoint(parcaUzerindeNokta(), 'P');
    expect(r?.hostId).toBe('ab');
    expect(ciftler(r!.options)).toEqual(['whole:AB', 'toPoint:AP', 'fromPoint:PB']);
  });

  it('parçanın UCUNA sağ tıklanınca kısmi uzunluk sunulmaz', () => {
    expect(lengthOptionsAtPoint(parcaUzerindeNokta(), 'A')).toBeNull();
  });

  it('iki nokta varken her biri için ayrı madde üretilir; seçili nokta verilirse yalnızca o', () => {
    const o = [...parcaUzerindeNokta(), nokta('Q', 1, 0, { onObjectId: 'ab' })];
    expect(ciftler(straightLengthOptions(o, 'ab').options)).toEqual([
      'whole:AB', 'toPoint:AP', 'fromPoint:PB', 'toPoint:AQ', 'fromPoint:QB', 'between:PQ',
    ]);
    expect(ciftler(straightLengthOptions(o, 'ab', 'Q').options)).toEqual(['whole:AB', 'toPoint:AQ', 'fromPoint:QB', 'between:PQ']);
    expect(ciftler(lengthOptionsAtPoint(o, 'P')!.options)).toEqual(['whole:AB', 'toPoint:AP', 'fromPoint:PB', 'between:PQ']);
  });
});

describe('Bölünmüş parça: bütün zincir de ölçülebilir', () => {
  it('[AP] + [PB] aynı doğruda uç uca olduğu için tek zincirdir', () => {
    expect(collinearSegmentChain(bolunmus(), 'ap').map((s) => s.id).sort()).toEqual(['ap', 'pb']);
  });

  it('parçaya sağ tık: bütün [AB], bu parça [AP] ve [PB]', () => {
    expect(ciftler(straightLengthOptions(bolunmus(), 'ap').options)).toEqual(['whole:AB', 'piece:AP', 'fromPoint:PB']);
    expect(ciftler(straightLengthOptions(bolunmus(), 'pb').options)).toEqual(['whole:AB', 'piece:PB', 'toPoint:AP']);
  });

  it('bölme noktasına sağ tık da zinciri görür; parça noktaya göre adlandırılır', () => {
    const r = lengthOptionsAtPoint(bolunmus(), 'P');
    expect(ciftler(r!.options)).toEqual(['whole:AB', 'toPoint:AP', 'fromPoint:PB']);
    expect(r!.options.every((o) => o.role === 'whole' || o.viaId === 'P')).toBe(true);
  });

  it('iki kez bölünmüş zincirde ara noktanın menüsünde iki ara noktanın parçası "arası" olarak adlandırılır', () => {
    const o = [nokta('A', -3, 0), nokta('B', 3, 0), nokta('P', -1, 0), nokta('Q', 1, 0),
      yap({ id: 'ap', type: 'segment', startPointId: 'A', endPointId: 'P' }),
      yap({ id: 'pq', type: 'segment', startPointId: 'P', endPointId: 'Q' }),
      yap({ id: 'qb', type: 'segment', startPointId: 'Q', endPointId: 'B' })];
    expect(ciftler(lengthOptionsAtPoint(o, 'Q')!.options)).toEqual(['whole:AB', 'between:PQ', 'toPoint:AQ', 'fromPoint:QB']);
    expect(ciftler(lengthOptionsAtPoint(o, 'P')!.options)).toEqual(['whole:AB', 'toPoint:AP', 'fromPoint:PB', 'between:PQ']);
  });

  it('aynı doğruda OLMAYAN komşu parça zincire katılmaz', () => {
    const o = [...bolunmus(), nokta('C', 3, 2), yap({ id: 'bc', type: 'segment', startPointId: 'B', endPointId: 'C' })];
    expect(collinearSegmentChain(o, 'ap').map((s) => s.id).sort()).toEqual(['ap', 'pb']);
  });

  it('geri dönen (üst üste binen) parça zincir sayılmaz', () => {
    const o = [nokta('A', 0, 0), nokta('B', 4, 0), nokta('C', 2, 0),
      yap({ id: 'ab', type: 'segment', startPointId: 'A', endPointId: 'B' }),
      yap({ id: 'bc', type: 'segment', startPointId: 'B', endPointId: 'C' })];
    expect(collinearSegmentChain(o, 'ab').map((s) => s.id)).toEqual(['ab']);
  });
});

describe('Doğru ve ışın', () => {
  it('doğru üzerindeki bağlı nokta için kısmi uzunluklar', () => {
    const o = [nokta('C', -3, 3), nokta('D', 3, 3), yap({ id: 'cd', type: 'line', point1Id: 'C', point2Id: 'D' }), nokta('F', 0, 3, { onObjectId: 'cd' })];
    expect(ciftler(straightLengthOptions(o, 'cd').options)).toEqual(['whole:CD', 'toPoint:CF', 'fromPoint:FD']);
  });
});

describe('Ölç / gizle: tek etiket, yineleme yok', () => {
  it('kendi uçlarıyla aynı çift, parçanın showLength bayrağını kullanır', () => {
    const o = parcaUzerindeNokta().map((x) => (x.id === 'ab' ? ({ ...x, showLength: false } as MathObject) : x));
    const acik = withLengthMeasurement(o, 'A', 'B', true, 'olc-1');
    expect(acik.find((x) => x.id === 'ab')).toMatchObject({ showLength: true });
    expect(acik.some((x) => x.type === 'measurement')).toBe(false);
    expect(isLengthShown(acik, 'B', 'A')).toBe(true);
    const kapali = withLengthMeasurement(acik, 'B', 'A', false, 'olc-2');
    expect(kapali.find((x) => x.id === 'ab')).toMatchObject({ showLength: false });
  });

  it('aynı uçlu doğru önce gelse bile parçanın bayrağı tercih edilir', () => {
    const o = [
      nokta('A', 0, 0), nokta('B', 4, 0),
      yap({ id: 'l', type: 'line', point1Id: 'A', point2Id: 'B' }),
      yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'B' }),
    ];
    const r = withLengthMeasurement(o, 'A', 'B', true, 'x');
    expect(r.find((x) => x.id === 's')).toMatchObject({ showLength: true });
    expect((r.find((x) => x.id === 'l') as { showLength?: boolean }).showLength).toBeUndefined();
  });

  it('aynı uçlu doğrunun uzunluğu zaten görünüyorsa ölçülmüş sayılır; gizle hepsini kapatır', () => {
    const o = [
      nokta('A', 0, 0), nokta('B', 4, 0),
      yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'B' }),
      yap({ id: 'l', type: 'line', point1Id: 'A', point2Id: 'B', showLength: true }),
    ];
    expect(isLengthShown(o, 'A', 'B')).toBe(true);
    expect(withLengthMeasurement(o, 'A', 'B', true, 'x')).toBe(o);
    const kapali = withLengthMeasurement(o, 'A', 'B', false, 'x');
    expect(kapali.filter((x) => (x as { showLength?: boolean }).showLength)).toEqual([]);
  });

  it('[AP] için CANLI distance ölçümü eklenir; ikinci istek yeni nesne üretmez', () => {
    const o = parcaUzerindeNokta();
    const bir = withLengthMeasurement(o, 'A', 'P', true, 'olc-1');
    expect(bir.filter((x) => x.type === 'measurement')).toEqual([
      expect.objectContaining({ id: 'olc-1', kind: 'distance', pointIds: ['A', 'P'], label: '|AP|', showValue: true }),
    ]);
    expect(withLengthMeasurement(bir, 'P', 'A', true, 'olc-2')).toBe(bir);
    const gizli = withLengthMeasurement(bir, 'A', 'P', false, 'olc-3');
    expect(isLengthShown(gizli, 'A', 'P')).toBe(false);
    const tekrar = withLengthMeasurement(gizli, 'A', 'P', true, 'olc-4');
    expect(tekrar.filter((x) => x.type === 'measurement').map((x) => x.id)).toEqual(['olc-1']);
    expect(isLengthShown(tekrar, 'A', 'P')).toBe(true);
  });

  it('bölmeden sonra [AP] parçası doğarsa, açık |AP| ölçümü "ölçülmüş" sayılır ve ikinci etiket açılmaz', () => {
    const once = withLengthMeasurement(parcaUzerindeNokta(), 'A', 'P', true, 'olc-1');
    const sonra = [...bolunmus(), once.find((x) => x.id === 'olc-1')!];
    expect(isLengthShown(sonra, 'A', 'P')).toBe(true);
    expect(withLengthMeasurement(sonra, 'A', 'P', true, 'olc-2')).toBe(sonra);
    const gizli = withLengthMeasurement(sonra, 'A', 'P', false, 'x');
    expect(isLengthShown(gizli, 'A', 'P')).toBe(false);
  });
});

describe('Silme, kopyalama, yerleşim', () => {
  it('nokta silinince ona dayanan |AP| ölçümü de silinir', () => {
    const o = withLengthMeasurement(parcaUzerindeNokta(), 'A', 'P', true, 'olc-1');
    expect([...collectDependentIds(o, ['P'])].sort()).toEqual(['P', 'olc-1']);
  });

  it('parça silinince üzerindeki P ve |AP| gider', () => {
    const o = withLengthMeasurement(parcaUzerindeNokta(), 'A', 'P', true, 'olc-1');
    expect([...collectDependentIds(o, ['ab'])].sort()).toEqual(['P', 'ab', 'olc-1']);
  });

  it('bölünmüş zincirde bir parçayı silmek bütün |AB| ölçümünü silmez', () => {
    const o = withLengthMeasurement(bolunmus(), 'A', 'B', true, 'olc-ab');
    expect([...collectDependentIds(o, ['pb'])].sort()).toEqual(['pb']);
  });

  it('kopyala/yapıştır ölçümün nokta kimliklerini yeniden eşler', () => {
    const o = withLengthMeasurement(parcaUzerindeNokta(), 'A', 'P', true, 'olc-1');
    const pano = copyObjects(o, ['olc-1']);
    const yapistirilan = pasteObjects(pano, o, { x: 10, y: 10 });
    const m = yapistirilan.objects.find((x) => x.type === 'measurement') as MeasurementObject;
    expect(m.kind).toBe('distance');
    for (const d of objectDependencies(m)) expect(yapistirilan.objects.some((x) => x.id === d)).toBe(true);
  });

  it('kapsayan |AB| etiketi, içindeki |AP| etiketinin bir kat dışında durur', () => {
    let o: MathObject[] = bolunmus();
    o = withLengthMeasurement(o, 'A', 'B', true, 'm-ab');
    o = [...o, yap({ id: 'm-ap', type: 'measurement', kind: 'distance', pointIds: ['A', 'P'], showValue: true })];
    expect(distanceLabelLevel(o, 'm-ap')).toBe(0);
    expect(distanceLabelLevel(o, 'm-ab')).toBe(1);
    expect((o.find((x) => x.id === 'ap') as SegmentObject).showLength).toBeUndefined();
  });

  it('kısmen örtüşen etiketler (biri ötekini kapsamasa da) farklı katlara konur', () => {
    const o: MathObject[] = [
      nokta('A', -3, 0), nokta('P', -1, 0), nokta('Q', 1, 0), nokta('B', 3, 0),
      yap({ id: 'm-ap', type: 'measurement', kind: 'distance', pointIds: ['A', 'P'], showValue: true }),
      yap({ id: 'm-aq', type: 'measurement', kind: 'distance', pointIds: ['A', 'Q'], showValue: true }),
      yap({ id: 'm-pb', type: 'measurement', kind: 'distance', pointIds: ['P', 'B'], showValue: true }),
    ];
    const kat = (id: string) => distanceLabelLevel(o, id);
    expect(kat('m-ap')).toBe(0);
    expect(kat('m-aq')).not.toBe(kat('m-ap'));
    expect(kat('m-pb')).not.toBe(kat('m-aq'));
  });

  it('eğik parçada eşit uzunluklu örtüşen etiketler de aynı kata düşmez', () => {
    const [ax, ay, bx, by] = [1.7946, 1.7312, -3.273, 3.8317];
    const [px, py] = [ax + (bx - ax) / 3, ay + (by - ay) / 3];
    const [qx, qy] = [ax + ((bx - ax) * 2) / 3, ay + ((by - ay) * 2) / 3];
    const o: MathObject[] = [
      nokta('A', ax, ay), nokta('B', bx, by), nokta('P', px, py), nokta('Q', qx, qy),
      yap({ id: 'm-aq', type: 'measurement', kind: 'distance', pointIds: ['A', 'Q'], showValue: true }),
      yap({ id: 'm-pb', type: 'measurement', kind: 'distance', pointIds: ['P', 'B'], showValue: true }),
    ];
    expect(distanceLabelLevel(o, 'm-aq')).not.toBe(distanceLabelLevel(o, 'm-pb'));
  });
});
