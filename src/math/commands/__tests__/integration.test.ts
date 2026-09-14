import { describe, expect, it } from 'vitest';
import type { FunctionObject, MathObject, PointObject, SliderObject } from '@/types/math';
import { runCommand } from '../engine';
import { resolveCommandBindings } from '../../commandBindings';
import { compileMathExpression } from '../../parser';

function run(text: string, scene: MathObject[] = [], selection: string[] = []) {
  const result = runCommand(text, scene, selection);
  if (!result.ok) throw new Error(`“${text}” başarısız: ${result.message}`);
  expect(new Set(result.objects.map(o => o.id)).size).toBe(result.objects.length);
  return result;
}
const point = (objects: MathObject[], label: string) => objects.find((o): o is PointObject => o.type === 'point' && o.label === label)!;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('whole engine: user scenarios', () => {
  it('draws "x kare fonksiyonu çiz" as f(x) = x^2', () => {
    const r = run('x kare fonksiyonu çiz');
    const fn = r.objects.find((o): o is FunctionObject => o.type === 'function')!;
    expect(compileMathExpression(fn.expression)!(3)).toBeCloseTo(9);
  });

  it('understands lowercase labels such as "a noktası" and "ab uzunluğu"', () => {
    const a = run('a noktası oluştur');
    expect(point(a.objects, 'A')).toBeTruthy();
    const b = run('b noktasını (3; 4) koordinatında oluştur', a.objects);
    const c = run('ab uzunluğu kaç', b.objects);
    expect(c.message).toMatch(/5/);
  });

  it('runs several operations written in one sentence', () => {
    const r = run('A(0,0), B(4,0) ve C(0,3) noktalarını oluştur sonra ABC üçgenini çiz ve alanını hesapla');
    const polygon = r.objects.find(o => o.type === 'polygon')!;
    expect(polygon.type === 'polygon' && polygon.showArea).toBe(true);
    expect(r.message).toMatch(/6/);
  });

  it('keeps the legacy browser flow working', () => {
    let scene = run('Üçgen çiz').objects;
    scene = run('3 4 5 üçgeni olsun', scene).objects;
    expect(scene.filter(o => o.type === 'polygon')).toHaveLength(1);
    scene = run('A noktasının açısını yaz', scene).objects;
    scene = run('B noktasından dik indir', scene).objects;
    scene = run('Üçgen uzunluklarını kaydırıcıya bağla', scene).objects;
    expect(scene.filter(o => o.type === 'slider')).toHaveLength(3);
    scene = run('ab = 4', scene).objects;
    expect(dist(point(scene, 'A'), point(scene, 'B'))).toBeCloseTo(4);
    const failed = runCommand('ab = 10', scene);
    expect(failed.ok).toBe(false);
    expect(failed.ok ? '' : failed.message).toMatch(/üçgen/);
    scene = run('yarıçapı 2 olan çember çiz', scene).objects;
    const noSource = runCommand('çembere teyet doğru çiz', scene);
    expect(noSource.ok ? '' : noSource.message.toLocaleLowerCase('tr')).toMatch(/hangi noktadan/);
  });

  it('creates live constructions that follow their sources', () => {
    let scene = run('A(0;0), B(6;0) ve C(0;4) noktalarını oluştur').objects;
    scene = run('C noktasından geçen ve AB doğrusuna paralel doğru çiz', scene).objects;
    scene = run('AB doğru parçasının orta noktasını bul', scene).objects;
    const moved = resolveCommandBindings(scene.map(o => o.type === 'point' && o.label === 'B' ? { ...o, x: 10 } as MathObject : o));
    const mid = moved.find((o): o is PointObject => o.type === 'point' && o.construction?.kind === 'midpoint')!;
    expect(mid.x).toBeCloseTo(5);
  });

  it('edits, measures and transforms by name', () => {
    let scene = run('A(1;1), B(4;1) ve C(1;3) noktalarını oluştur, ABC üçgenini çiz').objects;
    scene = run('ABC üçgenini kırmızı yap', scene).objects;
    scene = run('ABC üçgenini x eksenine göre yansıt', scene).objects;
    expect(point(scene, "A'").y).toBeCloseTo(-1);
    scene = run('A noktasını (2; 2) konumuna taşı', scene).objects;
    expect(point(scene, "A'").y).toBeCloseTo(-2);
    const sliders = run('a kaydırıcısı oluştur ve a = 3', scene).objects.filter((o): o is SliderObject => o.type === 'slider');
    expect(sliders[0].value).toBe(3);
  });

  it('rejects nonsense and negation without touching the scene', () => {
    expect(runCommand('bir ejderha çiz', []).ok).toBe(false);
    expect(runCommand('üçgen çizme', []).ok).toBe(false);
  });
});
