import { describe, it, expect } from 'vitest';
import { runCommand } from '../engine';
import type { PointObject, SliderObject } from '@/types/math';

describe('Scripting and Animation Commands', () => {
  const ptA: PointObject = { id: 'A', type: 'point', label: 'A', x: 0, y: 0, showLabel: true, color: 'blue', visible: true, createdAt: 0, isIndependent: false, onObjectId: 's1' };
  const sliderA: SliderObject = { id: 'a', type: 'slider', label: 'a', variableName: 'a', min: -5, max: 5, step: 0.1, value: 1, showLabel: true, color: 'black', visible: true, createdAt: 0 };

  const scene = [ptA, sliderA];

  it('handles CanlandırmayıBaşlat[true] and StartAnimation[false]', () => {
    const res1 = runCommand('CanlandırmayıBaşlat[true]', scene);
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect(res1.actions).toContainEqual({ kind: 'playback', mode: 'play' });
    }

    const res2 = runCommand('StartAnimation[false]', scene);
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.actions).toContainEqual({ kind: 'playback', mode: 'stop' });
    }
  });

  it('handles CanlandırmayıBaşlat[A, true]', () => {
    const res = runCommand('CanlandırmayıBaşlat[A, true]', scene);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const updatedPt = res.objects.find(o => o.id === 'A') as PointObject;
      expect(updatedPt.animating).toBe(true);
      expect(res.actions).toContainEqual({ kind: 'playback', mode: 'play', targetId: 'A' });
    }
  });

  it('handles DeğerAta[a, 3] and SetValue[a, -2]', () => {
    const res1 = runCommand('DeğerAta[a, 3]', scene);
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      const s = res1.objects.find(o => o.id === 'a') as SliderObject;
      expect(s.value).toBe(3);
    }

    const res2 = runCommand('SetValue[a, -2]', scene);
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      const s = res2.objects.find(o => o.id === 'a') as SliderObject;
      expect(s.value).toBe(-2);
    }
  });

  it('handles İzBırak[A, true] and İzleriTemizle[]', () => {
    const res1 = runCommand('İzBırak[A, true]', scene);
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      const updatedPt = res1.objects.find(o => o.id === 'A');
      expect(updatedPt?.showTrace).toBe(true);
    }

    const res2 = runCommand('İzleriTemizle[]', scene);
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.actions).toContainEqual({ kind: 'clearTraces' });
    }
  });
});
