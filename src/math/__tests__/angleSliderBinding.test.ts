import { describe, expect, it } from 'vitest';
import { AngleObject, MathObject, PointObject, SliderObject } from '@/types/math';
import { resolveCommandBindings } from '../commandBindings';
import { calculateAngleDegrees } from '../geometry';

describe('angle slider binding and animation', () => {
  it('dynamically rotates point3 and updates angle measurement when slider value changes', () => {
    // V at (0, 0), P1 at (4, 0) -> initial arm along positive X axis
    const V: PointObject = {
      id: 'pt-v',
      type: 'point',
      label: 'V',
      x: 0,
      y: 0,
      createdAt: 1,
    };
    const P1: PointObject = {
      id: 'pt-p1',
      type: 'point',
      label: 'A',
      x: 4,
      y: 0,
      createdAt: 2,
    };
    const slider: SliderObject = {
      id: 'slider-alpha',
      type: 'slider',
      variableName: 'α',
      label: 'α',
      min: 0,
      max: 360,
      step: 1,
      value: 60,
      sliderType: 'angle',
      x: -5,
      y: 5,
      createdAt: 3,
    };
    // P3 rotating around V starting from P1 by slider degrees
    const P3: PointObject = {
      id: 'pt-p3',
      type: 'point',
      label: "A'",
      x: 0,
      y: 0,
      construction: {
        kind: 'rotate',
        sourceId: P1.id,
        centerId: V.id,
        sliderId: slider.id,
        sliderVariableName: 'α',
        degrees: 60,
      },
      createdAt: 4,
    };
    const angle: AngleObject = {
      id: 'ang-1',
      type: 'angle',
      label: 'α',
      point1Id: P1.id,
      vertexPointId: V.id,
      point3Id: P3.id,
      createdAt: 5,
    };

    const scene: MathObject[] = [V, P1, slider, P3, angle];

    // Initial resolution with slider value = 60°
    const resolved60 = resolveCommandBindings(scene);
    const p3Resolved60 = resolved60.find((o) => o.id === P3.id) as PointObject;
    expect(p3Resolved60.x).toBeCloseTo(4 * Math.cos((60 * Math.PI) / 180), 3);
    expect(p3Resolved60.y).toBeCloseTo(4 * Math.sin((60 * Math.PI) / 180), 3);

    const deg60 = calculateAngleDegrees(P1, V, p3Resolved60);
    expect(deg60).toBeCloseTo(60, 1);

    // Update slider value to 90° (Right angle)
    const scene90 = scene.map((o) => (o.id === slider.id ? { ...o, value: 90 } : o));
    const resolved90 = resolveCommandBindings(scene90);
    const p3Resolved90 = resolved90.find((o) => o.id === P3.id) as PointObject;
    expect(p3Resolved90.x).toBeCloseTo(0, 3);
    expect(p3Resolved90.y).toBeCloseTo(4, 3);

    const deg90 = calculateAngleDegrees(P1, V, p3Resolved90);
    expect(deg90).toBeCloseTo(90, 1);

    // Update slider value to 180° (Straight angle)
    const scene180 = scene.map((o) => (o.id === slider.id ? { ...o, value: 180 } : o));
    const resolved180 = resolveCommandBindings(scene180);
    const p3Resolved180 = resolved180.find((o) => o.id === P3.id) as PointObject;
    expect(p3Resolved180.x).toBeCloseTo(-4, 3);
    expect(p3Resolved180.y).toBeCloseTo(0, 3);

    const deg180 = calculateAngleDegrees(P1, V, p3Resolved180);
    expect(deg180).toBeCloseTo(180, 1);
  });
});
