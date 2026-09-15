import { describe, it, expect } from 'vitest';
import { PointObject, SegmentObject, CircleObject, PolygonObject } from '@/types/math';
import { getPointPathParameter, evaluatePointOnPath, advancePointOnHost } from '../pathAnimation';

describe('Path Animation Engine', () => {
  const ptA: PointObject = { id: 'A', type: 'point', label: 'A', x: 0, y: 0, showLabel: true, color: 'black', visible: true, createdAt: 0, isIndependent: true };
  const ptB: PointObject = { id: 'B', type: 'point', label: 'B', x: 10, y: 0, showLabel: true, color: 'black', visible: true, createdAt: 0, isIndependent: true };
  const ptC: PointObject = { id: 'C', type: 'point', label: 'C', x: 10, y: 10, showLabel: true, color: 'black', visible: true, createdAt: 0, isIndependent: true };
  const ptD: PointObject = { id: 'D', type: 'point', label: 'D', x: 0, y: 10, showLabel: true, color: 'black', visible: true, createdAt: 0, isIndependent: true };

  const segAB: SegmentObject = { id: 's1', type: 'segment', label: 's', startPointId: 'A', endPointId: 'B', showLabel: true, color: 'blue', visible: true, createdAt: 0 };
  const circleA: CircleObject = { id: 'c1', type: 'circle', label: 'c', centerPointId: 'A', fixedRadius: 5, showLabel: true, color: 'red', visible: true, createdAt: 0 };
  const polySquare: PolygonObject = { id: 'poly1', type: 'polygon', label: 'ABCD', pointIds: ['A', 'B', 'C', 'D'], showLabel: true, color: 'green', visible: true, createdAt: 0 };

  const scene = [ptA, ptB, ptC, ptD, segAB, circleA, polySquare];

  it('calculates point parameter on segment', () => {
    const pMid: PointObject = { id: 'P', type: 'point', label: 'P', x: 5, y: 0, showLabel: true, color: 'blue', visible: true, createdAt: 0, isIndependent: false, onObjectId: 's1' };
    const t = getPointPathParameter(pMid, segAB, scene);
    expect(t).toBeCloseTo(0.5);
  });

  it('evaluates position on segment', () => {
    const pos = evaluatePointOnPath(0.3, segAB, scene);
    expect(pos?.x).toBeCloseTo(3);
    expect(pos?.y).toBeCloseTo(0);
  });

  it('calculates and advances point on circle', () => {
    const pCirc: PointObject = { id: 'P', type: 'point', label: 'P', x: 5, y: 0, showLabel: true, color: 'blue', visible: true, createdAt: 0, isIndependent: false, onObjectId: 'c1' };
    const param = getPointPathParameter(pCirc, circleA, scene);
    expect(param).toBeCloseTo(0);

    const next = advancePointOnHost(pCirc, circleA, scene, 1, 2, 8); // 2s of 8s tour = 1/4 tour = pi/2
    expect(next).not.toBeNull();
    expect(next?.progress).toBeCloseTo(Math.PI / 2);
    expect(next?.x).toBeCloseTo(0);
    expect(next?.y).toBeCloseTo(5);
  });

  it('evaluates position on polygon perimeter', () => {
    // Square ABCD: 0..10 (bottom), 10..20 (right), 20..30 (top), 30..40 (left). Total L = 40
    // param = 0.25 -> (10, 0)
    // param = 0.5 -> (10, 10)
    // param = 0.75 -> (0, 10)
    const pos1 = evaluatePointOnPath(0.25, polySquare, scene);
    expect(pos1?.x).toBeCloseTo(10);
    expect(pos1?.y).toBeCloseTo(0);

    const pos2 = evaluatePointOnPath(0.5, polySquare, scene);
    expect(pos2?.x).toBeCloseTo(10);
    expect(pos2?.y).toBeCloseTo(10);

    const pos3 = evaluatePointOnPath(0.75, polySquare, scene);
    expect(pos3?.x).toBeCloseTo(0);
    expect(pos3?.y).toBeCloseTo(10);
  });
});
