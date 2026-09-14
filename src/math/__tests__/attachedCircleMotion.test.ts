import { describe, expect, it } from 'vitest';
import { MathObject, PointObject } from '@/types/math';
import { bagliNoktalariOturt } from '@/state/WorkspaceContext';

const point = (id: string, x: number, y: number, onObjectId?: string): PointObject => ({ id, label: id, type: 'point', x, y, onObjectId, isIndependent: true, visible: true, showLabel: true, color: 'blue', createdAt: 0 });
const circle = (id: string, centerPointId: string, fixedRadius: number): MathObject => ({ id, label: id, type: 'circle', centerPointId, fixedRadius, visible: true, showLabel: true, color: 'blue', createdAt: 0 });
const fixture = () => [point('O', 0, 0), circle('outer', 'O', 2), point('A', 2, 0, 'outer'), circle('inner', 'A', 1), point('P', 3, 0, 'inner')];
const get = (scene: MathObject[], id: string) => scene.find(o => o.id === id) as PointObject;

describe('attached circle motion', () => {
  it('does not accumulate displacement on a circle whose center is constrained', () => {
    let scene = fixture();
    for (let i = 0; i < 200; i++) {
      const requested = scene.map(o => o.type === 'point' && ['A', 'P'].includes(o.id) ? { ...o, y: o.y + 0.03 } : o);
      scene = bagliNoktalariOturt(requested, scene);
      const a = get(scene, 'A'), p = get(scene, 'P');
      expect(Math.hypot(a.x, a.y)).toBeCloseTo(2, 10);
      expect(p.x - a.x).toBeCloseTo(1, 10);
      expect(p.y - a.y).toBeCloseTo(0, 10);
    }
  });
  it('updates nested hosts before their points regardless of object order', () => {
    const scene = fixture().reverse();
    const requested = scene.map(o => o.id === 'O' ? { ...o, x: 4, y: 5 } as MathObject : o);
    const result = bagliNoktalariOturt(requested, scene);
    expect(get(result, 'A').x).toBeCloseTo(6);
    expect(get(result, 'P').x).toBeCloseTo(7);
    expect(get(result, 'P').y).toBeCloseTo(5);
  });
  it('allows a point to slide when dragged independently', () => {
    const scene = fixture();
    const result = bagliNoktalariOturt(scene.map(o => o.id === 'P' ? { ...o, x: 2, y: 3 } as MathObject : o), scene);
    expect(get(result, 'P').x).toBeCloseTo(2);
    expect(get(result, 'P').y).toBeCloseTo(1);
  });
});
