import { describe, expect, it } from 'vitest';
import type { ArcObject, CircleObject, EllipseObject, MathObject, Point2D, PointObject, SectorObject } from '@/types/math';
import { commandCircleGeometry } from '../../commandBindings';
import { runCommand } from '../engine';
import { CommandScene } from '../scene';
import { normalizeSpokenCommand } from '../speechText';
import type { CommandSuccess } from '../types';

/**
 * Çember ailesi: yazılı ve konuşma biçimindeki öğretmen cümleleri TÜM komut aileleriyle (varsayılan HANDLERS) sınanır.
 * circles.test.ts aileyi yalıtılmış sınar; burada aileler arası çakışmalar ve konuşma metinleri de yakalanır.
 */

const build = (fn: (s: CommandScene) => void): MathObject[] => { const s = new CommandScene([]); fn(s); s.resolve(); return s.objects; };
/** A(0,0), B(3,0), C(0,3) */
const S3 = () => build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A' }); s.addPoint({ x: 3, y: 0 }, { label: 'B' }); s.addPoint({ x: 0, y: 3 }, { label: 'C' }); });
const withO = () => build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'O' }); s.addPoint({ x: 3, y: 0 }, { label: 'A' }); });
const withSlider = (name: string) => build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A' }); s.addSlider(name, { value: 2 }); });
const segmentAB = () => build(s => { const a = s.addPoint({ x: 0, y: 0 }, { label: 'A' }), b = s.addPoint({ x: 4, y: 0 }, { label: 'B' }); s.addSegment(a.id, b.id); });

const spoken = (text: string) => normalizeSpokenCommand(text);
const pt = (objects: MathObject[], id: string) => objects.find(o => o.id === id) as PointObject;
const labelOf = (objects: MathObject[], id: string) => pt(objects, id)?.label;
const near = (a: Point2D, b: Point2D) => { expect(a.x).toBeCloseTo(b.x, 6); expect(a.y).toBeCloseTo(b.y, 6); };

function run(text: string, scene: MathObject[] = [], selection: string[] = []): CommandSuccess {
  const before = JSON.stringify(scene);
  const result = runCommand(text, scene, selection);
  if (!result.ok) throw new Error(`“${text}” başarısız: ${result.message}`);
  expect(JSON.stringify(scene)).toBe(before);
  return result;
}
function failWith(text: string, scene: MathObject[] = []): string {
  const result = runCommand(text, scene);
  if (result.ok) throw new Error(`“${text}” başarısız olmalıydı: ${result.message}`);
  expect(result.unrecognized).toBeFalsy();
  expect(result.message).not.toMatch(/Komut uygulanamadı/);
  return result.message;
}
function fresh<T extends MathObject['type']>(r: CommandSuccess, scene: MathObject[], type: T) {
  const old = new Set(scene.map(o => o.id));
  return r.objects.filter(o => o.type === type && !old.has(o.id)) as Extract<MathObject, { type: T }>[];
}
/** Cümle tek bir yeni çember üretir. */
function oneCircle(text: string, scene: MathObject[] = [], selection: string[] = []) {
  const r = run(text, scene, selection);
  const list = fresh(r, scene, 'circle');
  expect(list, r.message).toHaveLength(1);
  const circle = list[0] as CircleObject;
  return { r, circle, geometry: commandCircleGeometry(circle, id => pt(r.objects, id)), center: labelOf(r.objects, circle.centerPointId) };
}
function oneEllipse(text: string, scene: MathObject[] = []) {
  const r = run(text, scene);
  const list = fresh(r, scene, 'ellipse');
  expect(list, r.message).toHaveLength(1);
  return list[0] as EllipseObject;
}
function oneArcLike(type: 'arc' | 'sector', text: string, scene: MathObject[] = []) {
  const r = run(text, scene);
  const list = fresh(r, scene, type);
  expect(list, r.message).toHaveLength(1);
  const shape = list[0] as ArcObject | SectorObject;
  const c = pt(r.objects, shape.centerPointId), s = pt(r.objects, shape.startPointId), d = pt(r.objects, shape.directionPointId);
  const sweep = ((Math.atan2(d.y - c.y, d.x - c.x) - Math.atan2(s.y - c.y, s.x - c.x)) * 180 / Math.PI + 360) % 360;
  return { r, shape, sweep, radius: Math.hypot(s.x - c.x, s.y - c.y), center: c, start: s };
}

describe('circles phrases (full engine): radius, center and politeness variants', () => {
  it.each([
    ['yarıçapı 3 olan bir çember çizer misin', 3],
    ['3 yarıçaplı çember çizelim', 3],
    ['yarıçapı 4 birim olan çember oluşturmak istiyorum', 4],
    ['bana yarıçapı 5 olan bir çember lazım', 5],
    ['yarıçapı 2 cm olan çember olsun', 2],
    ['çember çiz yarıçap 6', 6],
    ['yarı çapı 3 olan çember çiz', 3],
    ['yarıçapı on iki olan çember çiz', 12],
    ['çapı on santim olan çember', 5],
    ['çap uzunluğu 8 olan çember çiz', 4],
    ['çevresi 12π olan çember', 6],
    ['çember çizmek istiyorum yarıçapı 7 olsun', 7],
    ['yarıçapı 3 olsun bir çember çiz', 3],
    ['yaricapi 3 olan cember ciz', 3],
    ["yarıçapı 3'e eşit olan çember çiz", 3],
    ['çapı 7 olan bir daire çizmeni istiyorum', 3.5],
    ['yarıçapı 3 olan çember çizebilir misin', 3],
    ['yarıçapı 1 olan birim çember çiz', 1],
  ])('“%s” → r = %d', (text, radius) => {
    expect(oneCircle(text).geometry.radius).toBeCloseTo(radius, 9);
  });

  it('corrects mild typos of the shape name', () => {
    expect(oneCircle('yarıçapı 3 olan çembr çiz').geometry.radius).toBe(3);
    expect(oneCircle('cenber çiz').geometry.radius).toBe(2);
    expect(oneEllipse('yarıçapları 4 ve 2 olan elipis çiz')).toMatchObject({ radiusX: 4, radiusY: 2 });
  });

  it.each([
    ['A noktası merkez olmak üzere yarıçapı 3 olan çember çiz', 'A', 3],
    ['merkezi A yarıçapı 4 olan çember', 'A', 4],
    ['merkez A yarıçap 3 çember çiz', 'A', 3],
    ["merkezi A'da olan 2 yarıçaplı çember", 'A', 2],
    ['merkezi A olsun yarıçapı 3 olsun çember çiz', 'A', 3],
    ['yarıçapı 2 olan çember çiz A merkezli olsun', 'A', 2],
    ['Anın etrafında yarıçapı 3 olan çember çiz', 'A', 3],
    ["A'nın etrafına 2 birimlik bir daire çiz", 'A', 2],
    ['A noktasına yarıçapı 3 olan çember çiz', 'A', 3],
    ['A noktasında yarıçapı 2 olan bir çember', 'A', 2],
    ['başlangıç noktası merkezli yarıçapı 3 olan çember', 'A', 3],
  ])('“%s” reuses %s', (text, label, radius) => {
    const scene = S3();
    const { circle, geometry, center, r } = oneCircle(text, scene);
    expect(center).toBe(label);
    expect(geometry.radius).toBeCloseTo(radius, 9);
    expect(fresh(r, scene, 'point')).toHaveLength(0);
    expect(circle.fixedRadius).toBe(radius);
  });

  it('places a circle at a coordinate given with “noktasına”', () => {
    const { geometry } = oneCircle('(1;1) noktasına yarıçapı 2 olan bir çember koy');
    near(geometry.center, { x: 1, y: 1 });
    expect(geometry.radius).toBe(2);
  });

  it('draws one circle per listed center', () => {
    const scene = S3();
    const r = run('A ve B merkezli yarıçapı 2 olan çemberler çiz', scene);
    const circles = fresh(r, scene, 'circle');
    expect(circles.map(c => [labelOf(r.objects, c.centerPointId), c.fixedRadius])).toEqual([['A', 2], ['B', 2]]);
    const three = run('A, B ve C merkezli, yarıçapları 1, 2 ve 3 olan çemberler çiz', scene);
    expect(fresh(three, scene, 'circle').map(c => [labelOf(three.objects, c.centerPointId), c.fixedRadius])).toEqual([['A', 1], ['B', 2], ['C', 3]]);
    expect(failWith('A ve B merkezli, yarıçapları 1, 2 ve 3 olan çemberler çiz', scene)).toContain('eşit olmalı');
    expect(failWith('A ve B merkezli ve C noktasından geçen çemberler çiz', scene)).toContain('yalnızca yarıçap');
  });
});

describe('circles phrases (full engine): the letter O as a center', () => {
  it.each([
    'O merkezli yarıçapı 3 olan çember çiz',
    'merkezi O olan yarıçapı 3 olan çember',
    "O'yu merkez alan yarıçapı 3 olan çember çiz",
    'O noktası merkezli yarıçapı 3 olan çember',
    'O merkezli ve yarıçapı 3 birim olan bir çember çizer misin',
    'O(0;0) merkezli yarıçapı 3 olan çember çiz',
  ])('“%s” reuses the existing O', text => {
    const scene = withO();
    const { center, geometry, r } = oneCircle(text, scene);
    expect(center).toBe('O');
    expect(geometry.radius).toBe(3);
    expect(fresh(r, scene, 'point')).toHaveLength(0);
  });

  it('“O(0;0) noktası oluştur” then “O merkezli yarıçapı 3 olan çember çiz” reuses O', () => {
    const first = run('O(0;0) noktası oluştur');
    const o = first.objects.find((x): x is PointObject => x.type === 'point' && x.label === 'O');
    expect(o, first.message).toBeDefined();
    const { center, circle, r } = oneCircle('O merkezli yarıçapı 3 olan çember çiz', first.objects);
    expect(center).toBe('O');
    expect(circle.centerPointId).toBe(o!.id);
    expect(fresh(r, first.objects, 'point')).toHaveLength(0);
  });

  it('spoken lowercase “o merkezli” reuses O', () => {
    const scene = withO();
    expect(oneCircle(spoken('o merkezli yarıçapı üç olan çember çiz'), scene).center).toBe('O');
    expect(oneCircle(spoken('o noktası merkezli yarıçapı iki olan çember çiz'), scene).center).toBe('O');
  });

  it('“O(x;y) merkezli” creates O at the coordinate and refuses a conflicting one', () => {
    const { r, circle } = oneCircle('O(1;2) merkezli yarıçapı 3 olan çember çiz');
    expect(pt(r.objects, circle.centerPointId)).toMatchObject({ label: 'O', x: 1, y: 2 });
    expect(failWith('O(1;1) merkezli yarıçapı 3 olan çember çiz', withO())).toContain('zaten');
  });
});

describe('circles phrases (full engine): sliders and letters are not radii', () => {
  it('explains that a circle cannot be bound to slider b and suggests its value', () => {
    const message = failWith('A merkezli yarıçapı b olan çember çiz', withSlider('b'));
    expect(message).toContain('kaydırıcı');
    expect(message).toContain('“A merkezli yarıçapı 2 olan çember çiz”');
    expect(message).not.toContain('bulunamadı');
  });
  it.each([
    ['yarıçapı b olan çember çiz', 'b'],
    ['A merkezli yarıçapı b olan yay çiz', 'b'],
    ['yatay yarıçapı b olan elips çiz', 'b'],
    ['çapı b olan daire çiz', 'b'],
  ])('“%s” with slider %s', (text, name) => {
    const message = failWith(text, withSlider(name));
    expect(message).toContain(`${name} kaydırıcısına bağlanamaz`);
    expect(message).toContain('2');
  });
  it('slider r (a vocabulary word) and an unknown letter', () => {
    expect(failWith('yarıçapı r olan çember çiz', withSlider('r'))).toContain('r kaydırıcısına bağlanamaz');
    expect(failWith('yarıçapı k olan çember çiz')).toContain('“k” bir sayı değil');
  });
});

describe('circles phrases (full engine): through points, diameter and compass', () => {
  it('uses the selection for “üç noktadan geçen çember”', () => {
    const scene = S3();
    const ids = ['A', 'B', 'C'].map(l => (scene.find(o => o.type === 'point' && o.label === l) as PointObject).id);
    const { circle } = oneCircle('üç noktadan geçen çember çiz', scene, ids);
    expect(circle.throughPointIds).toEqual(ids);
    expect(failWith('üç noktadan geçen çember çiz', scene)).toContain('adlarıyla');
  });

  it.each([
    "A merkezli B'den geçen çember çiz",
    'A merkezli Bden geçen çember çiz',
    'a merkezli b den geçen çember',
    'A merkezli ve B noktası üzerinde olan çember çiz',
    'B noktasından geçen, merkezi A olan çember',
  ])('“%s” → live radius point', text => {
    const { circle, center, r } = oneCircle(text, S3());
    expect(center).toBe('A');
    expect(labelOf(r.objects, circle.radiusPointId!)).toBe('B');
  });

  it.each([
    ['AB yi çap kabul eden çember', S3, 1.5],
    ['A ile B noktalarını çap kabul eden çember', S3, 1.5],
    ['AB doğru parçasını çap alan çember', segmentAB, 2],
    ["[AB]'yi çap olarak alan çember çiz", segmentAB, 2],
  ])('“%s” → live midpoint center', (text, scene, radius) => {
    const { r, circle, geometry } = oneCircle(text, scene());
    expect(pt(r.objects, circle.centerPointId).construction?.kind).toBe('midpoint');
    expect(geometry.radius).toBeCloseTo(radius, 9);
  });

  it('compass: “pergeli A noktasına koyup 2 birim açarak çember çiz”', () => {
    const scene = S3();
    const { center, geometry, r } = oneCircle('pergeli A noktasına koyup 2 birim açarak çember çiz', scene);
    expect(center).toBe('A');
    expect(geometry.radius).toBe(2);
    expect(fresh(r, scene, 'point')).toHaveLength(0);
    expect(oneCircle(spoken('pergeli a noktasına koy üç birim açıklıkla çember çiz'), scene)).toMatchObject({ center: 'A', geometry: { radius: 3 } });
    const arc = oneArcLike('arc', 'pergeli C noktasına yerleştir ve 60 derecelik yay çiz', scene);
    expect(arc.center).toMatchObject({ label: 'C' });
  });

  it('compass across two spoken commands: the placed point stays selected', () => {
    const scene = S3();
    const placed = run('pergeli B noktasına koy', scene);
    expect(placed.sceneChanged).toBe(false);
    expect(placed.selectedIds.map(id => labelOf(scene, id))).toEqual(['B']);
    const { center, geometry } = oneCircle('3 birim açıklıkla çember çiz', scene, placed.selectedIds);
    expect(center).toBe('B');
    expect(geometry.radius).toBe(3);
    expect(failWith('pergeli D noktasına koy', scene)).toContain('D noktası bulunamadı');
  });
});

describe('circles phrases (full engine): equations', () => {
  it.each([
    ['x kare artı y kare eşittir on altı çemberini çiz', false, { x: 0, y: 0 }, 4],
    ['x kare artı y kare eşittir on altı çemberini çiz', true, { x: 0, y: 0 }, 4],
    ['x kare artı ye kare eşittir dokuz', true, { x: 0, y: 0 }, 3],
    ['iks kare artı ye kare eşittir yirmi beş', true, { x: 0, y: 0 }, 5],
    ["x'in karesi artı y'nin karesi eşittir 4", false, { x: 0, y: 0 }, 2],
    ['x kare artı y kare eksi dört x eşittir sıfır', false, { x: 2, y: 0 }, 2],
    ['x artı bir in karesi artı y eksi iki nin karesi eşittir dokuz', false, { x: -1, y: 2 }, 3],
    ['x eksi bir in karesi artı y kare eşittir dört', true, { x: 1, y: 0 }, 2],
    ['x kare + y kare = 16', false, { x: 0, y: 0 }, 4],
  ])('“%s” (spoken: %s)', (text, isSpoken, center, radius) => {
    const { geometry } = oneCircle(isSpoken ? spoken(text) : text);
    near(geometry.center, center);
    expect(geometry.radius).toBeCloseTo(radius, 9);
  });

  it('a number after “bölü” is a divisor, not part of “(4 + y)²”', () => {
    expect(oneEllipse('x kare bölü dört artı y kare bölü dokuz eşittir bir')).toMatchObject({ radiusX: 2, radiusY: 3 });
  });
});

describe('circles phrases (full engine): ellipses', () => {
  it.each([
    ["8'e 4'lük elips çiz", 4, 2],
    ['6 çarpı 4 elips çiz', 3, 2],
    ['yatay yarı ekseni 4 düşey yarı ekseni 1 olan elips', 4, 1],
    ['düşey yarıçapı 1, yatay yarıçapı 3 olan elips', 3, 1],
    ['x ekseni boyunca yarıçapı 4, y ekseni boyunca yarıçapı 2 olan elips', 4, 2],
    ['yarıçapı 5 ve 3 olan elips çiz', 5, 3],
    ['elips çizelim yatay yarıçap 5 dikey yarıçap 2', 5, 2],
    ['bir elips lazım yarıçapları 6 ve 2', 6, 2],
  ])('“%s” → %d × %d', (text, rx, ry) => {
    expect(oneEllipse(text)).toMatchObject({ radiusX: rx, radiusY: ry });
  });

  it('places an ellipse with “noktasına” and reuses O', () => {
    const scene = withO();
    const e = oneEllipse('O merkezli yarıçapları 4 ve 2 olan elips çiz', scene);
    expect(e.centerPointId).toBe((scene[0] as PointObject).id);
    const s3 = S3();
    expect(oneEllipse('B noktasına yarıçapları 2 ve 1 olan elips çiz', s3).centerPointId).toBe((s3[1] as PointObject).id);
  });

  it.each([
    ['odak noktaları A ve B olan elips', 'Odak'],
    ['yarıçapı 3 olan çeyrek elips çiz', 'çeyrek elips'],
    ['yarım elips çiz', 'çeyrek elips'],
  ])('rejects “%s” with a helpful message', (text, fragment) => {
    expect(failWith(text, S3())).toContain(fragment);
  });
});

describe('circles phrases (full engine): arcs and sectors', () => {
  it('ends given as “B noktasından başlayıp C noktasında biten”', () => {
    const scene = S3();
    const { shape, sweep, r } = oneArcLike('arc', 'B noktasından başlayıp C noktasında biten A merkezli yay', scene);
    expect([shape.centerPointId, shape.startPointId, shape.directionPointId].map(id => labelOf(r.objects, id))).toEqual(['A', 'B', 'C']);
    expect(sweep).toBeCloseTo(90, 6);
    expect(oneArcLike('sector', "B'den başlayıp C'de biten A merkezli daire dilimi", scene).sweep).toBeCloseTo(90, 6);
  });

  it.each([
    ['A merkezli Bden Cye yay çiz', 'arc'],
    ['a merkezli b den c ye yay', 'arc'],
    ['A merkezli yay çiz B den C ye', 'arc'],
    ["A merkezli B'den C'ye daire dilimi", 'sector'],
  ] as const)('“%s” → 90° %s', (text, type) => {
    expect(oneArcLike(type, text, S3()).sweep).toBeCloseTo(90, 6);
  });

  it('semicircle on a segment (“AB üzerine yarım daire”)', () => {
    const scene = S3();
    const half = oneArcLike('sector', 'AB üzerine yarım daire çiz', scene);
    expect(half.sweep).toBeCloseTo(180, 6);
    expect(pt(half.r.objects, half.shape.centerPointId).construction?.kind).toBe('midpoint');
    const onSegment = oneArcLike('arc', 'AB doğru parçası üzerine yarım çember çiz', segmentAB());
    expect(onSegment.radius).toBeCloseTo(2, 9);
    expect(failWith('AB üzerine 90 derecelik yay çiz', scene)).toBeTruthy();
  });

  it('radius given by two points: the other endpoint starts the arc', () => {
    const scene = S3();
    const a = oneArcLike('arc', 'A merkezli AB yarıçaplı 60 derecelik yay', scene);
    expect([labelOf(a.r.objects, a.shape.centerPointId), labelOf(a.r.objects, a.shape.startPointId)]).toEqual(['A', 'B']);
    expect(a.sweep).toBeCloseTo(60, 6);
    const s = oneArcLike('sector', 'yarıçapı AB olan A merkezli 90 derecelik daire dilimi', scene);
    expect(s.radius).toBeCloseTo(3, 9);
    const moved = oneArcLike('arc', 'C merkezli AB yarıçaplı 90 derecelik yay', scene);
    expect(moved.start.construction).toMatchObject({ kind: 'translate', vectorPointIds: [(scene[0] as PointObject).id, (scene[1] as PointObject).id] });
    near(moved.start, { x: 3, y: 3 });
    expect(failWith("A merkezli, B'den başlayan, AB yarıçaplı yay", scene)).toContain('bir kez');
  });

  it.each([
    ['yarıçapı 5 birim merkez açısı 72 derece olan bir yay çizer misin', 'arc', 72, 5],
    ['yarıçapı 2 olan yarım çember çizelim', 'arc', 180, 2],
    ['kırk beş derecelik dilim oluşturalım', 'sector', 45, 3],
    ['yarıçapı 3 ve açısı 60 derece olan daire dilimi', 'sector', 60, 3],
    ['dörtte üç daire çiz', 'sector', 270, 3],
  ] as const)('“%s” → %s %d° r=%d', (text, type, sweep, radius) => {
    const shape = oneArcLike(type, text);
    expect(shape.sweep).toBeCloseTo(sweep, 6);
    expect(shape.radius).toBeCloseTo(radius, 9);
  });

  it.each([
    ['yarım daire çiz lütfen', 'sector', 180],
    ['çeyrek daire çizer misin', 'sector', 90],
    ['altmış derecelik daire dilimi çiz', 'sector', 60],
    ['a merkezli b den c ye yay çiz', 'arc', 90],
  ] as const)('spoken “%s”', (text, type, sweep) => {
    const scene = /\bb den\b/.test(text) ? S3() : [];
    expect(oneArcLike(type, spoken(text), scene).sweep).toBeCloseTo(sweep, 6);
  });
});

describe('circles phrases (full engine): combined sentences', () => {
  it('draws, then measures or edits the new circle', () => {
    const area = run('yarıçapı 3 olan çember çiz ve alanını göster');
    expect(area.message).toContain('alan');
    const perimeter = run('A merkezli yarıçapı 2 olan çember çizip çevresini hesapla', S3());
    expect(perimeter.message).toContain('çevre');
    const both = run('bir çember ve bir elips çiz');
    expect([fresh(both, [], 'circle').length, fresh(both, [], 'ellipse').length]).toEqual([1, 1]);
    const points = run('A, B ve C noktalarını oluştur ve bu noktalardan geçen çember çiz');
    expect(fresh(points, [], 'circle')[0].throughPointIds).toHaveLength(3);
  });
});
