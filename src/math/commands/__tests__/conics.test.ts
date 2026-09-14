import { describe, expect, it } from 'vitest';
import type { CircleObject, EllipseObject, FunctionObject, MathObject, PointObject } from '@/types/math';
import { runCommand } from '../engine';
import { classifyConic, parsePolynomial } from '../handlers/conics';
import { splitClauses } from '../text';

function ok(text: string, scene: MathObject[] = []) {
  const r = runCommand(text, scene);
  if (!r.ok) throw new Error(`“${text}” başarısız: ${r.message}`);
  return r;
}
const circle = (objects: MathObject[]) => objects.find((o): o is CircleObject => o.type === 'circle')!;
const ellipse = (objects: MathObject[]) => objects.find((o): o is EllipseObject => o.type === 'ellipse')!;
const byId = (objects: MathObject[], id: string) => objects.find((o): o is PointObject => o.id === id)!;

describe('polynomial classification', () => {
  it('finds circles and ellipses in standard and general form', () => {
    expect(classifyConic(parsePolynomial('(x-1)^2 + (y-2)^2 - 9')!)!.conic).toEqual({ kind: 'circle', center: { x: 1, y: 2 }, radius: 3 });
    expect(classifyConic(parsePolynomial('x^2 + y^2 - 2x + 4y - 4')!)!.conic).toEqual({ kind: 'circle', center: { x: 1, y: -2 }, radius: 3 });
    expect(classifyConic(parsePolynomial('x^2/9 + y^2/4 - 1')!)!.conic).toEqual({ kind: 'ellipse', center: { x: 0, y: 0 }, rx: 3, ry: 2 });
    expect(classifyConic(parsePolynomial('x^2 - y^2 - 1')!)).toBeNull();
    expect(classifyConic(parsePolynomial('x^2 + y^2 + 4')!)).toBeNull();
    expect(parsePolynomial('x^3 + y')).toBeNull();
  });
});

describe('inequality regions', () => {
  it.each([
    ['x^2 + y^2 <= 9', { x: 0, y: 0 }, 3],
    ['x² + y² < 16 bölgesini çiz', { x: 0, y: 0 }, 4],
    ['(x-1)^2 + (y-2)^2 ≤ 4', { x: 1, y: 2 }, 2],
    ['x^2 + y^2 - 2x + 4y - 4 <= 0', { x: 1, y: -2 }, 3],
    ['x kare artı y kare küçük eşittir 25', { x: 0, y: 0 }, 5],
    ['9 >= x^2 + y^2', { x: 0, y: 0 }, 3],
    ['-x^2 - y^2 + 9 >= 0', { x: 0, y: 0 }, 3],
  ])('%s draws a filled disk', (text, center, radius) => {
    const r = ok(text);
    const c = circle(r.objects);
    expect(c.fixedRadius).toBeCloseTo(radius);
    expect(c.fillOpacity).toBe(0.25);
    expect(c.showArea).toBe(true);
    expect(byId(r.objects, c.centerPointId)).toMatchObject(center);
  });
  it('draws an elliptical region', () => {
    const e = ellipse(ok('x^2/9 + y^2/4 <= 1').objects);
    expect([e.radiusX, e.radiusY, e.fillOpacity]).toEqual([3, 2, 0.25]);
  });
  it('refuses outside regions with guidance and explains strict boundaries', () => {
    const outside = runCommand('x^2 + y^2 >= 9', []);
    expect(outside.ok).toBe(false);
    expect(outside.ok ? '' : outside.message).toMatch(/dış/i);
    expect(ok('x^2 + y^2 < 9').message).toMatch(/dahil değil/);
  });
  it('reuses an existing centre point', () => {
    const scene = ok('A(1; 2) noktası oluştur').objects;
    const r = ok('(x-1)^2 + (y-2)^2 <= 4', scene);
    expect(r.objects.filter(o => o.type === 'point')).toHaveLength(1);
  });
  it('draws the boundary of a half-plane and explains the side', () => {
    const r = ok('y >= 2x + 1');
    const fn = r.objects.find((o): o is FunctionObject => o.type === 'function')!;
    expect(fn.expression).toBe('2x + 1');
    expect(r.message).toMatch(/üst/);
    expect(ok('2x + 1 > y').message).toMatch(/alt/);
  });
});

describe('parametric circles and ellipses', () => {
  it('keeps x = …t, y = …t together when splitting', () => {
    expect(splitClauses('x = 3cos(t), y = 3sin(t)')).toEqual(['x = 3cos(t), y = 3sin(t)']);
    expect(splitClauses('x = 2 + 3 cos t ve y = 1 + 3 sin t eğrisini çiz')).toHaveLength(1);
  });
  it.each([
    ['x = 3cos(t), y = 3sin(t)', { x: 0, y: 0 }, 3],
    ['x = 2 + 3 cos t ve y = 1 + 3 sin t eğrisini çiz', { x: 2, y: 1 }, 3],
    ['x = 5sin(t), y = 5cos(t)', { x: 0, y: 0 }, 5],
    ['x = 2cos(θ); y = 2sin(θ)', { x: 0, y: 0 }, 2],
  ])('%s draws a circle', (text, center, radius) => {
    const r = ok(text);
    const c = circle(r.objects);
    expect(c.fixedRadius).toBeCloseTo(radius);
    expect(byId(r.objects, c.centerPointId)).toMatchObject(center);
    expect(r.objects.some(o => o.type === 'line' || o.type === 'function' || o.type === 'slider')).toBe(false);
  });
  it('draws a parametric ellipse and refuses other curves', () => {
    const e = ellipse(ok('x = 4cos(t), y = 2sin(t)').objects);
    expect([e.radiusX, e.radiusY]).toEqual([4, 2]);
    const other = runCommand('x = t, y = t^2', []);
    expect(other.ok).toBe(false);
    expect(other.ok ? '' : other.message).toMatch(/çember ya da elips/);
  });
});
