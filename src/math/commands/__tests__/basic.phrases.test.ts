import { describe, expect, it } from 'vitest';
import type { AngleObject, LineObject, MathObject, PointObject, RayObject, SegmentObject } from '@/types/math';
import { rankHandlers, runCommand } from '../engine';
import { parseClause } from '../text';
import { CommandScene } from '../scene';
import { normalizeSpokenCommand } from '../speechText';
import { build } from './helpers';

/**
 * Nokta, doğru parçası, doğru, ışın ve açı cümleleri TÜM komut motoruyla (bütün ailelerin işleyicileri kayıtlıyken):
 * öğretmenin yazdığı ya da söylediği (konuşma metni normalizeSpokenCommand'dan geçer) gerçekçi biçimler.
 */

const pts = () => build(s => {
  s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  s.addPoint({ x: 4, y: 0 }, { label: 'B' });
  s.addPoint({ x: 2, y: 3 }, { label: 'C' });
  s.addPoint({ x: 6, y: 1 }, { label: 'D' });
});
const two = () => build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A' }); s.addPoint({ x: 4, y: 0 }, { label: 'B' }); });
const withSegment = () => build(s => { s.addSegment(s.findPoint('A')!.id, s.findPoint('B')!.id); }, pts());
const triangle = () => build(s => {
  const [a, b, c] = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }].map((p, i) => s.addPoint(p, { label: 'ABC'[i] }));
  s.addPolygon([a.id, b.id, c.id], { kind: 'triangle' });
});
const square = () => build(s => {
  const ids = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }].map((p, i) => s.addPoint(p, { label: 'KLMN'[i] }).id);
  s.addPolygon(ids, { kind: 'square' });
});

type Objs = MathObject[];
const P = (objects: Objs, label: string) => {
  const p = objects.find((o): o is PointObject => o.type === 'point' && o.label === label);
  if (!p) throw new Error(`${label} noktası yok`);
  return p;
};
const byId = (objects: Objs, id: string) => objects.find(o => o.id === id) as PointObject;
const ofType = <T extends MathObject['type']>(objects: Objs, t: T) => objects.filter(o => o.type === t) as Extract<MathObject, { type: T }>[];

function run(text: string, scene: Objs = [], selection: string[] = [], spoken = false) {
  const input = spoken ? normalizeSpokenCommand(text) : text;
  const before = JSON.stringify(scene);
  const result = runCommand(input, scene, selection);
  if (!result.ok) throw new Error(`“${input}” başarısız: ${result.message}`);
  expect(new Set(result.objects.map(o => o.id)).size).toBe(result.objects.length);
  expect(JSON.stringify(scene)).toBe(before);
  return result;
}
const failure = (text: string, scene: Objs = [], spoken = false) => {
  const result = runCommand(spoken ? normalizeSpokenCommand(text) : text, scene);
  if (result.ok) throw new Error(`“${text}” başarısız olmalıydı: ${result.message}`);
  return result.message;
};
const topHandler = (text: string, scene: Objs) => {
  const s = new CommandScene(scene);
  return rankHandlers(parseClause(text, s.known()), s)[0]?.handler.id;
};
const lastLine = (objects: Objs) => {
  const l = ofType(objects, 'line').at(-1) as LineObject;
  return [byId(objects, l.point1Id), byId(objects, l.point2Id)] as const;
};
const joins = (objects: Objs, a: string, b: string) => {
  const ids = [P(objects, a).id, P(objects, b).id];
  return ofType(objects, 'segment').some((s: SegmentObject) => ids.includes(s.startPointId) && ids.includes(s.endPointId) && s.startPointId !== s.endPointId);
};
const angleValue = (objects: Objs, a: AngleObject) => {
  const p1 = byId(objects, a.point1Id), v = byId(objects, a.vertexPointId), p3 = byId(objects, a.point3Id);
  let x = Math.abs(Math.atan2(p1.y - v.y, p1.x - v.x) - Math.atan2(p3.y - v.y, p3.x - v.x)) * 180 / Math.PI;
  if (x > 180) x = 360 - x;
  return a.reflex ? 360 - x : x;
};

describe('basic phrases: points', () => {
  it.each([
    ['A 2 3 noktasını oluştur', false, 'A', 2, 3],
    ['A noktasını 2 3 koordinatlarına koy', false, 'A', 2, 3],
    ['E 5 5 noktasını oluştur', false, 'E', 5, 5],
    ['a iki üç noktasını oluştur', true, 'A', 2, 3],
    ['a iki virgül beş üç noktası oluştur', true, 'A', 2.5, 3],
    ['a noktası iki üç olsun', true, 'A', 2, 3],
    ['b noktasını dört eksi bir koordinatına koy', true, 'B', 4, -1],
    ['koordinatları iki ve üç olan a noktasını oluştur', true, 'A', 2, 3],
    ['orijine o noktasını koy', true, 'O', 0, 0],
    ['o noktasını orijine koy', true, 'O', 0, 0],
    ['e noktasını (1;1) de oluştur', true, 'E', 1, 1],
  ] as const)('%s', (text, spoken, label, x, y) => {
    const r = run(text, [], [], spoken);
    expect(ofType(r.objects, 'point')).toHaveLength(1);
    expect(P(r.objects, label)).toMatchObject({ x, y });
  });

  it('spoken signed coordinates without a name', () => {
    const r = run('x i üç y si eksi bir olan nokta', [], [], true);
    expect(ofType(r.objects, 'point')[0]).toMatchObject({ x: 3, y: -1 });
  });

  it('bare coordinates move an existing point with “olsun”', () => {
    expect(P(run('D noktası 1 2 olsun', pts()).objects, 'D')).toMatchObject({ x: 1, y: 2 });
  });
});

describe('basic phrases: joining points', () => {
  it.each([
    ['A(0;0) ile B(4;0) noktalarını oluştur ve birleştir', 1],
    ['iki nokta koy ve birleştir', 1],
    ['A(0;0), B(4;0), C(4;3) noktalarını oluştur ve sırayla birleştir', 2],
  ] as const)('joins the points of the previous clause: %s', (text, segments) => {
    const r = run(text);
    expect(ofType(r.objects, 'segment')).toHaveLength(segments);
    expect(r.selectedIds.length).toBe(segments);
  });

  it('joins selected points, the only two points, or all points', () => {
    const scene = pts();
    const selected = run('seçili noktaları birleştir', scene, [P(scene, 'A').id, P(scene, 'C').id]);
    expect(joins(selected.objects, 'A', 'C')).toBe(true);
    expect(joins(run('bu iki noktayı birleştir', scene, [P(scene, 'B').id, P(scene, 'D').id]).objects, 'B', 'D')).toBe(true);
    expect(joins(run('noktaları birleştir', two()).objects, 'A', 'B')).toBe(true);
    expect(ofType(run('tüm noktaları birleştir', pts()).objects, 'segment')).toHaveLength(3);
    expect(failure('noktaları birleştir', pts())).toContain('Hangi noktaları');
    expect(failure('birleştir')).toContain('Hangi noktaları');
  });

  it('polylines: kırık çizgi and one multi-letter name', () => {
    const chain = run('ABCD kırık çizgisini çiz', pts());
    expect(ofType(chain.objects, 'segment').map(s => s.label)).toEqual(['[AB]', '[BC]', '[CD]']);
    expect(ofType(run('A, B, C noktalarından geçen kırık çizgi çiz', pts()).objects, 'segment')).toHaveLength(2);
    expect(ofType(run('A B C D kırık çizgisi çiz', pts()).objects, 'segment')).toHaveLength(3);
    expect(ofType(run('a be ce de noktalarını sırayla birleştir', pts(), [], true).objects, 'segment')).toHaveLength(3);
  });

  it('“AB kenarını çiz” without a shape is a segment; resizing stays with edit', () => {
    expect(joins(run('AB kenarını çiz', pts()).objects, 'A', 'B')).toBe(true);
    expect(topHandler('AB kenarını 5 yap', withSegment())).not.toBe('basic.segment');
  });
});

describe('basic phrases: lines and rays', () => {
  it.each([
    ['x eşittir üç doğrusunu çiz', 3],
    ['x eşittir eksi iki doğrusunu çiz', -2],
    ['x eşittir 5', 5],
  ] as const)('spoken vertical line: %s', (text, k) => {
    const r = run(text, [], [], true);
    const [a, b] = lastLine(r.objects);
    expect([a.x, b.x]).toEqual([k, k]);
  });

  it.each([
    ['eğimi eksi iki olan doğru çiz', true, -2],
    ['eğimi eksi 1/2 olan doğru', false, -0.5],
  ] as const)('negative slope: %s', (text, spoken, m) => {
    const [a, b] = lastLine(run(text, [], [], spoken).objects);
    expect((b.y - a.y) / (b.x - a.x)).toBeCloseTo(m, 9);
  });

  it('spoken “de noktasından” names D', () => {
    const [a, b] = lastLine(run('de noktasından geçen dikey doğru çiz', pts(), [], true).objects);
    expect(a.label).toBe('D');
    expect(b.x).toBe(6);
  });

  it('extending a segment to its line', () => {
    for (const text of ['AB doğrusunu uzat', '[AB] doğru parçasını doğruya uzat']) {
      const r = run(text, withSegment());
      const [a, b] = lastLine(r.objects);
      expect([a.label, b.label]).toEqual(['A', 'B']);
    }
    expect(topHandler('AB doğru parçasını 2 birim uzat', withSegment())).not.toBe('basic.line');
  });

  it('several rays and “yarı doğru”', () => {
    const r = run('AB ve CD ışınlarını çiz', pts());
    expect(ofType(r.objects, 'ray').map((x: RayObject) => [byId(r.objects, x.startPointId).label, byId(r.objects, x.throughPointId).label])).toEqual([['A', 'B'], ['C', 'D']]);
    const half = run('AB yarı doğrusunu çiz', pts());
    expect(ofType(half.objects, 'ray')).toHaveLength(1);
    expect(ofType(half.objects, 'line')).toHaveLength(0);
    expect(ofType(run('yarı doğru çiz').objects, 'ray')).toHaveLength(1);
  });
});

describe('basic phrases: angles', () => {
  it('all corner angles of a polygon', () => {
    const r = run('ABC üçgeninin tüm açılarını çiz', triangle());
    const angles = ofType(r.objects, 'angle');
    expect(angles).toHaveLength(3);
    expect(angles.map(a => angleValue(r.objects, a)).reduce((x, y) => x + y, 0)).toBeCloseTo(180, 6);
    expect(r.selectedIds).toHaveLength(3);
    expect(ofType(run('karenin iç açılarını oluştur', square()).objects, 'angle')).toHaveLength(4);
    expect(ofType(run('ABC nin tüm açılarını oluştur', triangle()).objects, 'angle')).toHaveLength(3);
    expect(topHandler('ABC üçgeninin açılarını göster', triangle())).not.toBe('basic.angle');
  });

  it('“EFG açısı 50 derece olsun” on an empty scene creates the angle', () => {
    const r = run('EFG açısı 50 derece olsun');
    const [angle] = ofType(r.objects, 'angle');
    expect(byId(r.objects, angle.vertexPointId).label).toBe('F');
    expect(angleValue(r.objects, angle)).toBeCloseTo(50, 6);
  });

  it.each([['geniş bir açı çiz', 120], ['dik bir açı oluştur', 90]] as const)('%s', (text, degrees) => {
    const r = run(text);
    expect(angleValue(r.objects, ofType(r.objects, 'angle')[0])).toBeCloseTo(degrees, 6);
  });
});

// ---------------------------------------------------------------------------------------- sweep regressions

const one = () => build(s => { s.addPoint({ x: 1, y: 1 }, { label: 'A' }); });
const circleScene = () => build(s => { const o = s.addPoint({ x: 10, y: 0 }, { label: 'O' }); s.addCircle({ centerId: o.id, radius: 2 }); });
const twoCircles = () => build(s => {
  const o = s.addPoint({ x: 10, y: 0 }, { label: 'O' }); s.addCircle({ centerId: o.id, radius: 2 });
  const m = s.addPoint({ x: -10, y: 0 }, { label: 'M' }); s.addCircle({ centerId: m.id, radius: 3 });
});
const ids = (objects: Objs, ...labels: string[]) => labels.map(l => P(objects, l).id);
const added = <T extends MathObject['type']>(before: Objs, after: Objs, t: T) =>
  ofType(after, t).filter(o => !before.some(b => b.id === o.id)) as Extract<MathObject, { type: T }>[];
const failWith = (text: string, scene: Objs = [], selection: string[] = [], spoken = false) => {
  const result = runCommand(spoken ? normalizeSpokenCommand(text) : text, scene, selection);
  if (result.ok) throw new Error(`“${text}” başarısız olmalıydı: ${result.message}`);
  return result.message;
};
const segmentLength = (objects: Objs, s: SegmentObject) => {
  const a = byId(objects, s.startPointId), b = byId(objects, s.endPointId);
  return Math.hypot(a.x - b.x, a.y - b.y);
};

describe('basic phrases: numbers are never ignored', () => {
  it.each([
    ['A noktasını 2 3 noktasına koy', false, 'A', 2, 3],
    ['A noktasını -2 ve 3 koordinatlarında oluştur', false, 'A', -2, 3],
    ['koordinatları -2 ve 3 olan A noktası', false, 'A', -2, 3],
    ['A noktasını 2 3 e koy', false, 'A', 2, 3],
    ['2 3 noktasına bir nokta koy', false, 'A', 2, 3],
    ['A 2 3 noktası', false, 'A', 2, 3],
    ['a noktasını iki üç noktasına koy', true, 'A', 2, 3],
    ['a noktasını eksi iki ve üç koordinatlarında oluştur', true, 'A', -2, 3],
    ['x = 2, y = 3 olan nokta', false, 'A', 2, 3],
    ['x = 2, y = 3 olan K noktasını oluştur', false, 'K', 2, 3],
  ] as const)('point from bare numbers: %s', (text, spoken, label, x, y) => {
    const r = run(text, [], [], spoken);
    expect(ofType(r.objects, 'point')).toHaveLength(1);
    expect(P(r.objects, label)).toMatchObject({ x, y });
  });

  it('origin words and moving with bare numbers', () => {
    expect(P(run('koordinat başlangıcına O noktasını koy', pts()).objects, 'O')).toMatchObject({ x: 0, y: 0 });
    expect(P(run('başlangıç noktasına O noktası koy', pts()).objects, 'O')).toMatchObject({ x: 0, y: 0 });
    expect(P(run('A noktası x=2 y=3 olsun', pts()).objects, 'A')).toMatchObject({ x: 2, y: 3 });
    const both = run('A 2 3 ve B 4 5 noktalarını oluştur');
    expect([P(both.objects, 'A'), P(both.objects, 'B')].map(p => [p.x, p.y])).toEqual([[2, 3], [4, 5]]);
  });

  it.each([
    ['0 0 ile 4 3 arasında doğru parçası çiz', false],
    ['0 0 ve 4 3 noktalarını birleştir', false],
    ['1 1 den 4 5 e doğru parçası çiz', false],
    ['sıfır sıfır ile dört üç arasında doğru parçası çiz', true],
  ] as const)('segment between bare coordinates: %s', (text, spoken) => {
    const r = run(text, [], [], spoken);
    const [segment] = ofType(r.objects, 'segment');
    expect(ofType(r.objects, 'segment')).toHaveLength(1);
    expect(segmentLength(r.objects, segment)).toBeCloseTo(5, 9);
  });

  it('lines through bare coordinates', () => {
    const [a, b] = lastLine(run('0 0 ve 2 4 noktalarından geçen doğru').objects);
    expect((b.y - a.y) / (b.x - a.x)).toBeCloseTo(2, 9);
    const [p, q] = lastLine(run('eğimi 2 olan ve 1 3 noktasından geçen doğru').objects);
    expect(p).toMatchObject({ x: 1, y: 3 });
    expect((q.y - p.y) / (q.x - p.x)).toBeCloseTo(2, 9);
  });

  it('refuses numbers it cannot place', () => {
    expect(failWith('A noktasını 2 3 4 koordinatına koy')).toContain('nasıl kullanacağımı');
    expect(failWith('AB doğru parçası 3 4 5 çiz', pts())).toContain('nasıl kullanacağımı');
  });

  it('counts: “iki doğru”, “üç doğru parçası”, “iki ışın”, “iki açı”', () => {
    expect(ofType(run('iki doğru çiz').objects, 'line')).toHaveLength(2);
    expect(ofType(run('üç yatay doğru çiz').objects, 'line')).toHaveLength(3);
    expect(ofType(run('üç doğru parçası çiz').objects, 'segment')).toHaveLength(3);
    const fives = run('iki tane 5 birimlik doğru parçası çiz');
    expect(ofType(fives.objects, 'segment').map(s => segmentLength(fives.objects, s))).toEqual([5, 5]);
    expect(fives.selectedIds).toHaveLength(2);
    expect(ofType(run('iki ışın çiz').objects, 'ray')).toHaveLength(2);
    expect(ofType(run('iki açı çiz').objects, 'angle')).toHaveLength(2);
  });
});

describe('basic phrases: pronouns, selection and centres', () => {
  it('joins pointed, selected or previous-clause points', () => {
    const scene = pts();
    expect(joins(run('onları birleştir', scene, ids(scene, 'A', 'C')).objects, 'A', 'C')).toBe(true);
    expect(joins(run('bunları birleştir', scene, ids(scene, 'B', 'D')).objects, 'B', 'D')).toBe(true);
    expect(joins(run('seçtiğim noktaları birleştir', scene, ids(scene, 'A', 'D')).objects, 'A', 'D')).toBe(true);
    expect(joins(run('onu C ile birleştir', scene, ids(scene, 'A')).objects, 'A', 'C')).toBe(true);
    expect(joins(run('bunu B noktasına bağla', scene, ids(scene, 'D')).objects, 'D', 'B')).toBe(true);
    expect(joins(run('seçili noktayı C ile birleştir', scene, ids(scene, 'D')).objects, 'D', 'C')).toBe(true);
    expect(joins(run('iki nokta arasına doğru parçası çiz', two()).objects, 'A', 'B')).toBe(true);
    expect(joins(run('onları birleştir', scene, ids(scene, 'C', 'D'), true).objects, 'C', 'D')).toBe(true);
    expect(failWith('onları birleştir', scene)).toContain('Hangi noktaları');
    expect(failWith('onu D ile birleştir', scene, ids(scene, 'A', 'B'))).toContain('hangi noktayla');
  });

  it('“onu C(2;3) noktasıyla birleştir” creates C and joins it to the pointed point', () => {
    const single = one();
    for (const r of [run('A(1;1) noktası koy ve onu C(2;3) noktasıyla birleştir'), run('onu C(2;3) noktasıyla birleştir', single, ids(single, 'A'))]) {
      expect(joins(r.objects, 'A', 'C')).toBe(true);
      expect(P(r.objects, 'C')).toMatchObject({ x: 2, y: 3 });
    }
    expect(ofType(run('bir nokta koy ve onu (3;4) noktasıyla birleştir').objects, 'segment')).toHaveLength(1);
  });

  it('lines, rays and angles at the pointed point', () => {
    const scene = pts();
    expect(lastLine(run('ondan geçen yatay doğru çiz', scene, ids(scene, 'C')).objects)[0].label).toBe('C');
    expect(lastLine(run('seçili noktadan geçen dikey doğru', scene, ids(scene, 'D')).objects)[0].label).toBe('D');
    expect(lastLine(run('o noktadan geçen yatay doğru çiz', scene, ids(scene, 'C')).objects)[0].label).toBe('C');
    expect(lastLine(run('bu noktadan geçen dikey doğru', scene, ids(scene, 'B')).objects)[0].label).toBe('B');
    const chained = run('bir nokta koy ve ondan geçen yatay doğru çiz');
    expect(ofType(chained.objects, 'point')).toHaveLength(2);
    expect(lastLine(chained.objects)[0].label).toBe('A');
    for (const text of ['ondan başlayan ve C den geçen ışın çiz', 'seçili noktadan başlayan ve C den geçen ışın çiz']) {
      const [ray] = ofType(run(text, scene, ids(scene, 'A')).objects, 'ray');
      expect([byId(scene, ray.startPointId).label, byId(scene, ray.throughPointId).label]).toEqual(['A', 'C']);
    }
    for (const [text, degrees] of [['seçili noktada 30 derecelik açı çiz', 30], ['köşesi seçili nokta olan 45 derecelik açı çiz', 45]] as const) {
      const r = run(text, scene, ids(scene, 'D'));
      const [angle] = ofType(r.objects, 'angle');
      expect(byId(r.objects, angle.vertexPointId).label).toBe('D');
      expect(angleValue(r.objects, angle)).toBeCloseTo(degrees, 6);
    }
  });

  it('circle centres: “merkezinden geçen doğru”, rays and joins', () => {
    const r = run('çember çiz ve merkezinden geçen bir doğru çiz');
    const [circle] = ofType(r.objects, 'circle');
    const [line] = ofType(r.objects, 'line');
    expect([line.point1Id, line.point2Id]).toContain(circle.centerPointId);
    expect(lastLine(run('çemberin merkezinden geçen yatay doğru çiz', circleScene()).objects)[0].label).toBe('O');
    expect(lastLine(run('merkezden geçen bir doğru çiz', circleScene()).objects)[0].label).toBe('O');
    const rays = run('çemberin merkezinden başlayan ışın çiz', circleScene());
    expect(byId(rays.objects, ofType(rays.objects, 'ray')[0].startPointId).label).toBe('O');
    const withA = build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A' }); }, circleScene());
    expect(joins(run('çemberin merkezini A ile birleştir', withA).objects, 'O', 'A')).toBe(true);
    expect(failWith('çemberin merkezinden geçen doğru çiz', twoCircles())).toContain('Birden fazla çember');
    expect(failWith('çemberin merkezinden geçen doğru çiz')).toContain('Önce bir çember');
  });

  it('triangle centres are explained, and work once constructed', () => {
    expect(failWith('ABC üçgeninin ağırlık merkezinden geçen doğru çiz', triangle())).toContain('ağırlık merkezini bul');
    expect(failWith('ABC üçgeninin ağırlık merkezinden başlayan ışın çiz', triangle())).toContain('ağırlık merkezini bul');
    const before = triangle();
    expect(added(before, run('ABC üçgeninin ağırlık merkezini bul ve ondan geçen yatay doğru çiz', before).objects, 'line')).toHaveLength(1);
  });

  it('x = k lines never fall back to an unrelated line', () => {
    for (const [text, spoken, scene] of [
      ['x = 3 doğrusunu çiz', false, pts()], ['şimdi x = 3 doğrusunu çiz', false, []], ['x 3 doğrusunu çiz', false, []],
      ['denklemi x = 3 olan doğruyu çiz', false, []], ['x = 3 doğrusu', false, build(s => { s.addSlider('x'); })],
      ['tamam x eşittir üç doğrusunu çiz', true, []],
    ] as const) {
      const r = run(text, [...scene], [], spoken);
      const lines = added([...scene], r.objects, 'line');
      expect(lines).toHaveLength(1);
      expect([byId(r.objects, lines[0].point1Id).x, byId(r.objects, lines[0].point2Id).x]).toEqual([3, 3]);
    }
  });

  it('a point on a triangle edge is not a length question', () => {
    const before = triangle();
    const r = run('üçgenin kenarı üzerinde bir nokta al', before);
    const [p] = added(before, r.objects, 'point');
    expect(p.onObjectId).toBe(ofType(r.objects, 'polygon')[0].id);
  });
});
