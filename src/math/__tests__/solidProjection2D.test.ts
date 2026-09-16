import { describe, it, expect } from 'vitest';
import { projectPoint3DTo2DWorld, projectSolidFor2D } from '../solidProjection2D';
import { Solid3DObject } from '@/types/workspace3d';
import { ViewportTransform } from '@/types/math';

describe('solidProjection2D', () => {
  const defaultViewport: ViewportTransform = {
    width: 800,
    height: 600,
    zoom: 40,
    panX: 0,
    panY: 0,
    showGrid: true,
    showAxes: true,
    showCoordinates: true,
    snapToGrid: true,
    gridStep: 1,
  };

  it('projects Z=0 ground points exactly to same XY coordinates', () => {
    const pt = { x: 5, y: -3, z: 0 };
    const p2d = projectPoint3DTo2DWorld(pt);
    expect(p2d.x).toBe(5);
    expect(p2d.y).toBe(-3);
  });

  it('projects Z>0 points with positive elevation', () => {
    const pt = { x: 0, y: 0, z: 4 };
    const p2d = projectPoint3DTo2DWorld(pt);
    expect(p2d.x).toBeGreaterThan(0);
    expect(p2d.y).toBeGreaterThan(0);
  });

  it('projects a cube into 2D with footprint, faces, and edges', () => {
    const cube: Solid3DObject = {
      id: 'solid-cube-1',
      type: 'cube',
      name: 'Küp 1',
      position: { x: 2, y: 3, z: 0 },
      dimensions: { width: 3, height: 3, depth: 3 },
      rotation: { x: 0, y: 0, z: 0 },
      color: '#3b82f6',
      opacity: 0.85,
      showWireframe: true,
      showVertices: true,
      showFaces: true,
      unfoldProgress: 0,
      selectedFaceIndex: null,
    };

    const projected = projectSolidFor2D(cube, defaultViewport, false);

    expect(projected.id).toBe('solid-cube-1');
    expect(projected.name).toBe('Küp 1');
    expect(projected.footprint.points.length).toBe(4);
    expect(projected.faces.length).toBe(6);
    expect(projected.edges.length).toBe(12);

    // Has both visible and hidden edges
    const hiddenEdges = projected.edges.filter((e) => e.isHidden);
    const visibleEdges = projected.edges.filter((e) => !e.isHidden);
    expect(hiddenEdges.length).toBeGreaterThan(0);
    expect(visibleEdges.length).toBeGreaterThan(0);

    // Volume calculation
    expect(projected.badge.volume).toBe(27);
  });
});
