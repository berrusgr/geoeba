import { describe, expect, it } from 'vitest';
import type { MathObject, Point2D, PointObject, PolygonObject } from '@/types/math';
import { runCommand } from '../engine';
import { CommandScene } from '../scene';
import { normalizeSpokenCommand } from '../speechText';
import type { CommandSuccess } from '../types';

/**
 * Çokgenler ailesi: yazılı ve konuşma biçimindeki öğretmen cümleleri, TÜM komut aileleriyle (varsayılan HANDLERS) sınanır.
 * polygons.test.ts aileyi yalıtılmış sınar; burada aileler arası çakışmalar da yakalanır.
 */

const build = (fn: (s: CommandScene) => void): MathObject[] => { const s = new CommandScene([]); fn(s); s.resolve(); return s.objects; };
const pointsScene = (spec: Record<string, [number, number]>) => build(s => { for (const [l, [x, y]] of Object.entries(spec)) s.addPoint({ x, y }, { label: l }); });
const triangleScene = () => build(s => {
  const p = [s.addPoint({ x: 0, y: 0 }, { label: 'A' }), s.addPoint({ x: 4, y: 0 }, { label: 'B' }), s.addPoint({ x: 1, y: 3 }, { label: 'C' })];
  s.addPolygon(p.map(q => q.id), { kind: 'triangle' });
});
const twoTriangles = () => build(s => {
  const p = [s.addPoint({ x: 0, y: 0 }, { label: 'A' }), s.addPoint({ x: 4, y: 0 }, { label: 'B' }), s.addPoint({ x: 1, y: 3 }, { label: 'C' })];
  s.addPolygon(p.map(q => q.id), { kind: 'triangle' });
  const q = [s.addPoint({ x: 10, y: 0 }, { label: 'D' }), s.addPoint({ x: 14, y: 0 }, { label: 'E' }), s.addPoint({ x: 11, y: 3 }, { label: 'F' })];
  s.addPolygon(q.map(x => x.id), { kind: 'triangle' });
});

const dist = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);
const polygons = (objects: MathObject[]) => objects.filter((o): o is PolygonObject => o.type === 'polygon');
const vertices = (objects: MathObject[], p: PolygonObject) => p.pointIds.map(id => objects.find(o => o.id === id) as PointObject);
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const sides = (v: Point2D[]) => sorted(v.map((p, i) => dist(p, v[(i + 1) % v.length])));
const area = (v: Point2D[]) => Math.abs(v.reduce((s, p, i) => s + p.x * v[(i + 1) % v.length].y - v[(i + 1) % v.length].x * p.y, 0) / 2);
const angles = (v: Point2D[]) => sorted(v.map((at, i) => {
  const prev = v[(i + v.length - 1) % v.length], next = v[(i + 1) % v.length];
  let d = Math.abs(Math.atan2(prev.y - at.y, prev.x - at.x) - Math.atan2(next.y - at.y, next.x - at.x)) * 180 / Math.PI;
  if (d > 180) d = 360 - d;
  return d;
}));
const closeAll = (actual: number[], expected: number[], digits = 6) => {
  expect(actual).toHaveLength(expected.length);
  sorted(expected).forEach((x, i) => expect(actual[i]).toBeCloseTo(x, digits));
};

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
/** Cümle yeni tek bir çokgen üretir; köşeleri döner. */
function created(text: string, scene: MathObject[] = [], selection: string[] = []) {
  const r = run(text, scene, selection);
  const before = new Set(scene.map(o => o.id));
  const fresh = polygons(r.objects).filter(p => !before.has(p.id));
  expect(fresh, r.message).toHaveLength(1);
  return { r, poly: fresh[0], pts: vertices(r.objects, fresh[0]) };
}
const spoken = (text: string) => normalizeSpokenCommand(text);

describe('polygons phrases (full engine): spelling and speech variants of shape names', () => {
  it.each([
    ['ikiz kenar üçgen çiz', 3],
    ['eş kenar dörtgen çiz', 4],
    ['paralel kenar çiz', 4],
    ['kenarları 4 ve 6 olan bir paralel kenar çiz', 4],
    ['baklava dilimi çiz', 4],
  ])('“%s” draws the shape', (text, n) => {
    const { pts, r } = created(text);
    expect(pts).toHaveLength(n);
    expect(r.objects.some(o => o.type === 'sector')).toBe(false);
  });

  it('keeps the measures of split-word shapes', () => {
    closeAll(sides(created('ikiz kenar üçgen çiz').pts).slice(1), [5, 5]);
    closeAll(sides(created('eş kenar dörtgen çiz').pts), [4, 4, 4, 4]);
    closeAll(sides(created('kenarları 4 ve 6 olan bir paralel kenar çiz').pts), [4, 4, 6, 6]);
  });
});

describe('polygons phrases (full engine): uppercase labels that look like words', () => {
  it('“AC” is a vertex label, not the verb “aç”', () => {
    const { pts } = created('AB = 5, BC = 6, AC = 7 olan ABC üçgeni çiz');
    expect(pts.map(p => p.label).join('')).toBe('ABC');
    closeAll(sides(pts), [5, 6, 7]);
  });

  it('labelled angle and sides beat the angle handler', () => {
    const { r, pts } = created('A açısı 90 derece, AB = 3, AC = 4 olan üçgen');
    closeAll(sides(pts), [3, 4, 5]);
    expect(r.objects.some(o => o.type === 'angle')).toBe(false);
  });
});

describe('polygons phrases (full engine): triangles', () => {
  it.each([
    ['kenarları 4 ve 6 aralarındaki açı 90 derece olan üçgen', [4, 6, Math.sqrt(52)]],
    ['iki kenarı 5 ve 7, aradaki açı 60 derece olan üçgen', [5, 7, Math.sqrt(39)]],
    ['5 ve 8 kenarları arasındaki açı 120 derece olan üçgen', [5, 8, Math.sqrt(129)]],
  ])('SAS: “%s”', (text, expected) => {
    closeAll(sides(created(text).pts), expected);
  });

  it.each([
    ['A, B, C noktalarını birleştirerek üçgen çiz'],
    ['A B ve C noktalarıyla üçgen oluştur'],
    ['A, B ve C noktalarını kullanarak üçgen çiz'],
  ])('joins existing points: “%s”', text => {
    const scene = pointsScene({ A: [0, 0], B: [4, 0], C: [1, 3] });
    const { r, pts } = created(text, scene);
    expect(pts.map(p => p.label).join('')).toBe('ABC');
    expect(r.objects.filter(o => o.type === 'point')).toHaveLength(3);
  });

  it.each([
    ['tamam şimdi üçgen çiz'],
    ['şey bir üçgen çizer misin'],
    ['a be ce üçgeni çiz'],
  ])('speech: “%s”', text => {
    expect(created(spoken(text)).pts).toHaveLength(3);
  });

  it.each([
    ['hipotenüsü on dik kenarı altı olan dik üçgen', [6, 8, 10]],
    ['iki kenarı beş ve yedi arasındaki açı altmış derece olan üçgen', [5, 7, Math.sqrt(39)]],
    ['kenar uzunluğu dört olan eşkenar üçgen çiz', [4, 4, 4]],
  ])('speech with number words: “%s”', (text, expected) => {
    closeAll(sides(created(spoken(text)).pts), expected);
  });
});

describe('polygons phrases (full engine): changing an existing triangle', () => {
  const modifies = (text: string, expected: number[], scene = triangleScene(), index = 0) => {
    const r = run(text, scene);
    expect(polygons(r.objects)).toHaveLength(polygons(scene).length);
    closeAll(sides(vertices(r.objects, polygons(r.objects)[index])), expected);
    return r;
  };

  it.each([
    ['ABCnin kenarları 6 8 10 olsun', [6, 8, 10]],
    ["ABC'nin kenarları 5, 5 ve 5 olsun", [5, 5, 5]],
    ['kenarları 6, 6 ve 6 olsun', [6, 6, 6]],
    ['üçgenin kenarları 5 5 5 olsun', [5, 5, 5]],
    ['ABC üçgeninin kenarlarını 5, 6, 7 yap', [5, 6, 7]],
  ])('“%s”', (text, expected) => {
    const r = modifies(text, expected);
    expect(r.message).toMatch(/kenarları değiştirildi/);
  });

  it('speech: “abc üçgeninin kenarları beş altı yedi olsun”', () => {
    modifies(spoken('abc üçgeninin kenarları beş altı yedi olsun'), [5, 6, 7]);
  });

  it('changes the named one of two triangles', () => {
    modifies('DEF üçgeninin kenarları 3 4 5 olsun', [3, 4, 5], twoTriangles(), 1);
  });

  it('changes the angles of a named triangle', () => {
    const r = run('ABC üçgeninin açıları 30 60 ve 90 derece olsun', triangleScene());
    expect(polygons(r.objects)).toHaveLength(1);
    closeAll(angles(vertices(r.objects, polygons(r.objects)[0])), [30, 60, 90], 4);
  });

  it('a follow-up clause edits the triangle just drawn', () => {
    const r = run('eşkenar üçgen çiz sonra kenarları 5 5 5 olsun');
    expect(polygons(r.objects)).toHaveLength(1);
    closeAll(sides(vertices(r.objects, polygons(r.objects)[0])), [5, 5, 5]);
  });

  it('explains ambiguity and does not guess', () => {
    expect(failWith('üçgenin kenarları 3 4 5 olsun', twoTriangles())).toMatch(/Birden fazla/);
    // Adı bir kareye ait: üçgen düzenlemesi sayılmaz, çokgen ailesi uygulamaz.
    const square = run('ABCD karesini çiz').objects;
    const other = runCommand('ABCD’nin kenarları 3 4 5 olsun', square);
    expect(other.ok && polygons(other.objects).some(p => p.pointIds.length === 3)).toBe(false);
  });
});

describe('polygons phrases (full engine): quadrilaterals owned against constructions', () => {
  it.each([
    ['köşegeni 6 olan kare çiz', [6 / Math.SQRT2, 6 / Math.SQRT2, 6 / Math.SQRT2, 6 / Math.SQRT2]],
    ['köşegeni 10 bir kenarı 6 olan dikdörtgen', [6, 6, 8, 8]],
    ['köşegenleri 6 ve 8 olan eşkenar dörtgen', [5, 5, 5, 5]],
    ['eşkenar dörtgen oluştur köşegenleri 10 ve 24', [13, 13, 13, 13]],
  ])('“%s” draws a new shape instead of diagonals', (text, expected) => {
    const { r, pts } = created(text);
    closeAll(sides(pts), expected);
    expect(r.objects.some(o => o.type === 'segment')).toBe(false);
  });

  it('köşegenleri 6 ve 4 olan deltoid çiz', () => {
    expect(area(created('köşegenleri 6 ve 4 olan deltoid çiz').pts)).toBeCloseTo(12, 6);
  });

  it('still draws diagonals of an existing square', () => {
    const scene = run('ABCD karesini çiz').objects;
    const r = run('karenin köşegenlerini çiz', scene);
    expect(r.objects.filter(o => o.type === 'segment')).toHaveLength(2);
  });
});

describe('polygons phrases (full engine): squares, rectangles, regular polygons, area model', () => {
  it('square from circumradius', () => {
    closeAll(sides(created('yarıçapı 3 olan kare').pts), Array(4).fill(3 * Math.SQRT2));
  });

  it.each([
    ['3 çarpı 5 dikdörtgen', [3, 3, 5, 5]],
    ['üç çarpı beş dikdörtgen çiz', [3, 3, 5, 5]],
  ])('rectangle with “çarpı”: “%s”', (text, expected) => {
    closeAll(sides(created(spoken(text)).pts), expected);
  });

  it('rejects a third rectangle side instead of ignoring it', () => {
    expect(failWith('kenarları 3 4 5 olan dikdörtgen')).toMatch(/en ve boy/);
  });

  it.each([
    ['kenar sayısı 7 olan düzgün çokgen çiz', 7],
    ['7 kenarı olan düzgün çokgen çiz', 7],
    ['köşe sayısı 9 olan düzgün çokgen', 9],
  ])('regular polygon by side count: “%s”', (text, n) => {
    const { pts } = created(text);
    expect(pts).toHaveLength(n);
    const s = sides(pts);
    expect(s[s.length - 1] - s[0]).toBeLessThan(1e-6);
  });

  it('“alanı modelle 4 e 5” builds the area model', () => {
    const { poly, pts } = created('alanı modelle 4 e 5');
    expect(poly.label).toBe('Alan Modeli');
    closeAll(sides(pts), [4, 4, 5, 5]);
  });

  it.each([
    ['A B C D noktalarını birleştirerek dörtgen çiz'],
    ['A, B, C ve D noktalarından dörtgen oluştur'],
  ])('general quadrilateral from named points: “%s”', text => {
    const scene = pointsScene({ A: [0, 0], B: [4, 0], C: [5, 3], D: [1, 4] });
    expect(created(text, scene).pts.map(p => p.label).join('')).toBe('ABCD');
  });
});

/** Önceki komutun sonucu (arayüz seçimi olarak selectedIds'i taşır). */
const afterCommand = (text: string) => {
  const r = runCommand(text, []);
  if (!r.ok) throw new Error(`“${text}” başarısız: ${r.message}`);
  return { objects: r.objects, selection: r.selectedIds };
};
const labelsOf = (pts: PointObject[]) => pts.map(p => p.label).join('');
const pointCount = (objects: MathObject[]) => objects.filter(o => o.type === 'point').length;
const rejects = (text: string, scene: MathObject[] = [], selection: string[] = []) => {
  const result = runCommand(text, scene, selection);
  if (result.ok) throw new Error(`“${text}” başarısız olmalıydı: ${result.message}`);
  expect(result.unrecognized).toBeFalsy();
  return result.message;
};

describe('polygons phrases (full engine): shapes from the points just created or selected', () => {
  const three = 'A(0;0), B(4;0) ve C(0;3) noktalarını oluştur';

  it.each([
    ['üçgen çiz'],
    ['üçgen oluştur'],
    ['şimdi bir üçgen çizer misin'],
    ['bu noktalardan üçgen çiz'],
    ['onları birleştirerek üçgen çiz'],
    ['bu üç noktayı birleştirerek üçgen oluştur'],
    ['bu noktaları kullanarak bir üçgen oluştur'],
    ['noktaları birleştirerek üçgen yap'],
    ['bunlardan üçgen çiz'],
    ['seçili noktalardan üçgen oluştur'],
  ])('“%s” after creating A, B, C joins them (no new DEF)', text => {
    const { objects, selection } = afterCommand(three);
    const { r, pts } = created(text, objects, selection);
    expect(new Set(labelsOf(pts))).toEqual(new Set(['A', 'B', 'C']));
    expect(pointCount(r.objects)).toBe(3);
  });

  it.each([
    ['A(0;0), B(4;0) ve C(0;3) noktalarını oluştur ve üçgen çiz'],
    ['A(0;0), B(4;0) ve C(0;3) noktalarını oluştur sonra bu noktalardan üçgen çiz'],
  ])('same command: “%s”', text => {
    const { r, pts } = created(text);
    expect(labelsOf(pts)).toBe('ABC');
    expect(pointCount(r.objects)).toBe(3);
  });

  it('explicit measures or a type still draw a new triangle', () => {
    const { objects, selection } = afterCommand(three);
    const measured = created('kenarları 3 4 5 olan üçgen çiz', objects, selection);
    closeAll(sides(measured.pts), [3, 4, 5]);
    expect(pointCount(measured.r.objects)).toBe(6);
    closeAll(sides(created('eşkenar üçgen çiz', objects, selection).pts), [4, 4, 4]);
    expect(labelsOf(created('DEF üçgenini çiz', objects, selection).pts)).toBe('DEF');
  });

  it('explains collinear, too few or missing points', () => {
    const line = afterCommand('A(0;0), B(1;1) ve C(2;2) noktalarını oluştur');
    expect(rejects('üçgen çiz', line.objects, line.selection)).toMatch(/aynı doğru/);
    expect(rejects('bu noktalardan üçgen çiz', line.objects, line.selection)).toMatch(/A, B, C noktaları aynı doğru/);
    const two = afterCommand('A(0;0) ve B(4;0) noktalarını oluştur');
    expect(rejects('bu noktalardan üçgen çiz', two.objects, two.selection)).toMatch(/üç nokta/);
    expect(created('üçgen çiz', two.objects, two.selection).pts).toHaveLength(3);
    expect(rejects('bu noktalardan üçgen çiz')).toMatch(/nokta/);
  });

  it.each([
    ['bu noktalardan çokgen çiz'],
    ['bu noktaları birleştirerek beşgen çiz'],
    ['seçili noktalardan çokgen oluştur'],
    ['çokgen çiz'],
  ])('five points: “%s”', text => {
    const { objects, selection } = afterCommand('A(0;0), B(4;0), C(5;3), D(2;5) ve E(-1;3) noktalarını oluştur');
    const { r, pts } = created(text, objects, selection);
    expect(labelsOf(pts)).toBe('ABCDE');
    expect(r.message).not.toMatch(/Düzgün/);
  });
});

describe('polygons phrases (full engine): self-crossing vertex order is untangled', () => {
  const crossing = 'A(0;0), B(4;4), C(0;4), D(4;0) noktalarını oluştur';

  it.each([
    ['ABCD dörtgenini çiz'],
    ['A, B, C ve D noktalarından dörtgen oluştur'],
    ['ABCD çokgenini çiz'],
    ['bu noktalardan dörtgen çiz'],
    ['dörtgen çiz'],
  ])('“%s” for A(0;0) B(4;4) C(0;4) D(4;0)', text => {
    const { objects, selection } = afterCommand(crossing);
    const { r, pts } = created(text, objects, selection);
    expect(labelsOf(pts)).toBe('ADBC');
    expect(area(pts)).toBeCloseTo(16, 9);
    expect(r.message).toMatch(/ABCD sırasıyla birleştirilince kenarlar kesişiyordu; kenarları kesişmeyen ADBC sırasıyla/);
    expect(r.message).not.toMatch(/aynı doğru/);
  });

  it('coordinates in a crossing order and a square named in a crossing order', () => {
    const coords = created('A(0;0), B(4;4), C(0;4), D(4;0) dörtgenini çiz');
    expect(labelsOf(coords.pts)).toBe('ADBC');
    expect(area(coords.pts)).toBeCloseTo(16, 9);
    const { objects } = afterCommand(crossing);
    const squareResult = created('ABCD karesini çiz', objects);
    closeAll(sides(squareResult.pts), [4, 4, 4, 4]);
    expect(squareResult.r.message).toMatch(/ADBC karesi çizildi/);
  });

  it('really collinear points are still rejected', () => {
    expect(failWith('ABCD dörtgenini çiz', pointsScene({ A: [0, 0], B: [1, 0], C: [2, 0], D: [3, 0] }))).toMatch(/aynı doğru/);
  });
});

describe('polygons phrases (full engine): n-gons from given vertices', () => {
  it('“köşeleri (…) olan beşgen” draws that pentagon, not a regular one', () => {
    const { r, pts } = created('köşeleri (0;0) (6;0) (6;2) (3;5) (0;2) olan beşgen çiz');
    expect(pts).toHaveLength(5);
    expect(area(pts)).toBeCloseTo(21, 9);
    expect(r.message).toMatch(/beşgeni çizildi/);
    expect(failWith('köşeleri (0;0), (4;0), (4;4), (0;4) olan beşgen çiz')).toMatch(/5 köşe gerekir/);
  });

  it('“ABCDE beşgenini çiz” on existing points does not claim a regular pentagon', () => {
    const { objects } = afterCommand('A(0;0), B(4;0), C(5;3), D(2;5) ve E(-1;3) noktalarını oluştur');
    const { r, poly } = created('ABCDE beşgenini çiz', objects);
    expect(poly.label).toBe('ABCDE');
    expect(r.message).not.toMatch(/Düzgün/);
    expect(pointCount(r.objects)).toBe(5);
  });
});

describe('polygons phrases (full engine): changing the type of an existing triangle', () => {
  it.each([
    ['ABC üçgeni eşkenar olsun', [4, 4, 4]],
    ['üçgen eşkenar olsun', [4, 4, 4]],
    ['ABC üçgeni eşkenar üçgen olsun', [4, 4, 4]],
    ['üçgenin kenarları eşit olsun', [4, 4, 4]],
    ['ABC dik üçgen olsun', [3, 4, 5]],
    ['üçgen ikizkenar olsun', [Math.sqrt(13), Math.sqrt(13), 4]],
    ['ABC üçgeninin kenarlarını 6 yap', [6, 6, 6]],
  ])('“%s”', (text, expected) => {
    const r = run(text, triangleScene());
    expect(polygons(r.objects)).toHaveLength(1);
    closeAll(sides(vertices(r.objects, polygons(r.objects)[0])), expected);
    const a = r.objects.find((o): o is PointObject => o.type === 'point' && o.label === 'A')!;
    expect([a.x, a.y]).toEqual([0, 0]);
  });

  it('says so when the triangle already has the type', () => {
    const first = run('ABC üçgeni eşkenar olsun', triangleScene());
    expect(first.message).toMatch(/eşkenar üçgen yapıldı/);
    const again = run('ABC üçgeni eşkenar olsun', first.objects);
    expect(again.message).toMatch(/zaten eşkenar üçgen/);
    expect(again.sceneChanged).toBe(false);
  });

  it('warns when named existing points do not form the requested type', () => {
    const { r } = created('ABC eşkenar üçgenini çiz', pointsScene({ A: [0, 0], B: [4, 0], C: [1, 3] }));
    expect(r.message).toMatch(/eşkenar üçgen oluşturmuyor/);
  });

  it('“kenarları 3 4 5 olsun” on an empty scene draws that triangle', () => {
    closeAll(sides(created('kenarları 3 4 5 olsun').pts), [3, 4, 5]);
    closeAll(sides(created(spoken('kenarları üç dört beş olsun')).pts), [3, 4, 5]);
  });
});
