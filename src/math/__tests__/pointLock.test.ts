import { describe, expect, it } from 'vitest';
import { MathObject, PointObject } from '@/types/math';
import { pointLockCandidates, isPointLocked } from '../pointLock';
import { projectOntoHost } from '../geometry';

const point = (id: string, x: number, y: number): PointObject => ({ id, label: id, type: 'point', x, y, visible: true, showLabel: true, color: 'blue', createdAt: 0, isIndependent: true });
const a = point('A', -2, 0), b = point('B', 2, 0), p = point('P', 0, 0.1);
const line: MathObject = { id: 'l', label: 'l', type: 'line', point1Id: 'A', point2Id: 'B', visible: true, showLabel: true, color: 'blue', createdAt: 0 };
describe('point locking', () => {
  it('offers a circle lock and can release its radius defining point', () => {
    const edge = point('P', 0, 2), center = point('O', 0, 0);
    const circle: MathObject = { ...line, type: 'circle', centerPointId: 'O', radiusPointId: 'P' };
    const candidate = pointLockCandidates(edge, [center, edge, circle], 44)[0];
    expect(candidate.host.id).toBe(circle.id);
    expect(candidate.fixedRadius).toBe(2);
    expect(pointLockCandidates(center, [center, edge, circle], 44)).toEqual([]);
    const fixed: MathObject = { ...circle, radiusPointId: undefined, fixedRadius: 2 };
    expect(pointLockCandidates(edge, [center, edge, fixed], 44)[0].position).toEqual({ x: 0, y: 2 });
    expect(pointLockCandidates(edge, [center, edge, fixed], 44)[0].fixedRadius).toBeUndefined();
  });
  it('uses a screen-space tolerance and projects to the line', () => {
    expect(pointLockCandidates(p, [a, b, p, line], 44)[0].position).toEqual({ x: 0, y: 0 });
    expect(pointLockCandidates(p, [a, b, p, line], 200)).toEqual([]);
  });
  it('does not introduce a dependency cycle through defining points', () => {
    expect(pointLockCandidates(a, [a, b, line], 44)).toEqual([]);
    const dependent = { ...a, construction: { kind: 'midpoint' as const, pointIds: ['P', 'B'] as [string, string] } };
    expect(pointLockCandidates(p, [dependent, b, p, line], 44)).toEqual([]);
  });
  it('excludes hidden lines and already constrained points', () => {
    expect(pointLockCandidates(p, [a, b, p, { ...line, visible: false }], 44)).toEqual([]);
    expect(pointLockCandidates({ ...p, onObjectId: 'l' }, [a, b, p, line], 44)).toEqual([]);
  });
  it('keeps ray projections on the forward half-line', () => {
    expect(projectOntoHost({ x: -8, y: 3 }, { kind: 'ray', a, b })).toEqual({ x: -2, y: 0 });
  });
  it('offers arc, polygon edge and ellipse hosts so a point the point tool attached can be locked back', () => {
    const O = point('O', 0, 0), S = point('S', 3, 0), T = point('T', 0, 3);
    const arc: MathObject = { ...line, id: 'ar', type: 'arc', centerPointId: 'O', startPointId: 'S', directionPointId: 'T' };
    const nearArc = point('Q', 3 * Math.cos(0.5), 3 * Math.sin(0.5) + 0.05);
    expect(pointLockCandidates(nearArc, [O, S, T, arc, nearArc], 44)[0].host.id).toBe('ar');
    expect(pointLockCandidates(S, [O, S, T, arc], 44)).toEqual([]);
    const K = point('K', -3, -2), L = point('L', 3, -2), M = point('M', 0, 3);
    const poly: MathObject = { ...line, id: 'pg', type: 'polygon', pointIds: ['K', 'L', 'M'] };
    expect(pointLockCandidates(point('Q', 0, -2.05), [K, L, M, poly], 44)[0].host.id).toBe('pg');
    expect(pointLockCandidates(K, [K, L, M, poly], 44)).toEqual([]);
    const ellipse: MathObject = { ...line, id: 'el', type: 'ellipse', centerPointId: 'O', radiusX: 2, radiusY: 1 };
    expect(pointLockCandidates(point('Q', 2.05, 0), [O, ellipse], 44)[0].host.id).toBe('el');
  });
  it('does not offer the undrawn part of an arc or a rotated ellipse', () => {
    const O = point('O', 0, 0), S = point('S', 3, 0), T = point('T', 0, 3);
    const arc: MathObject = { ...line, id: 'ar', type: 'arc', centerPointId: 'O', startPointId: 'S', directionPointId: 'T' };
    expect(pointLockCandidates(point('X', -3, -0.1), [O, S, T, arc], 44)).toEqual([]);
    const sector: MathObject = { ...arc, id: 'sc', type: 'sector' };
    expect(pointLockCandidates(point('X', 0.1, -3), [O, S, T, sector], 44)).toEqual([]);
    const rotated: MathObject = { ...line, id: 'el', type: 'ellipse', centerPointId: 'O', radiusX: 4, radiusY: 1, rotation: 90 };
    expect(pointLockCandidates(point('X', 4, 0.05), [O, rotated], 44)).toEqual([]);
  });
  it('treats a bind to a deleted host as unlocked and the legacy locked flag as locked', () => {
    const dangling = { ...p, onObjectId: 'gone' };
    expect(isPointLocked(dangling, [a, b, dangling, line])).toBe(false);
    expect(pointLockCandidates(dangling, [a, b, dangling, line], 44)[0].host.id).toBe('l');
    const legacy = { ...p, locked: true };
    expect(isPointLocked(legacy, [a, b, legacy, line])).toBe(true);
    expect(pointLockCandidates(legacy, [a, b, legacy, line], 44)).toEqual([]);
    expect(isPointLocked({ ...p, onObjectId: 'l' }, [a, b, p, line])).toBe(true);
  });
});
