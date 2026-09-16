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

  it('projects Z=0 ground points exactly to same XY coordinates in top mode', () => {
    const pt = { x: 5, y: -3, z: 0 };
    const p2d = projectPoint3DTo2DWorld(pt, undefined, undefined, 'top');
    expect(p2d.x).toBe(5);
    expect(p2d.y).toBe(-3);
  });

  it('projects Z>0 points with positive elevation in axonometric mode', () => {
    const pt = { x: 0, y: 0, z: 4 };
    const p2d = projectPoint3DTo2DWorld(pt, undefined, undefined, 'axonometric');
    expect(p2d.x).toBeGreaterThan(0);
    expect(p2d.y).toBeGreaterThan(0);
  });

  it('projects a cube into 2D top-down view as a square', () => {
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

    const projected = projectSolidFor2D(cube, defaultViewport, false, 'top');

    expect(projected.id).toBe('solid-cube-1');
    expect(projected.topView?.baseShapeName).toBe('Kare');
    expect(projected.topView?.points?.length).toBe(4);
    expect(projected.topView?.baseArea).toBe(9);
    expect(projected.topView?.basePerimeter).toBe(12);
    expect(projected.badge.volume).toBe(27);
  });

  it('projects a cylinder into 2D top-down view as a circle', () => {
    const cylinder: Solid3DObject = {
      id: 'solid-cyl-1',
      type: 'cylinder',
      name: 'Silindir 1',
      position: { x: 0, y: 0, z: 0 },
      dimensions: { width: 4, height: 5, depth: 4, radius: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      color: '#10b981',
      opacity: 0.85,
      showWireframe: true,
      showVertices: true,
      showFaces: true,
      unfoldProgress: 0,
      selectedFaceIndex: null,
    };

    const projected = projectSolidFor2D(cylinder, defaultViewport, false, 'top');

    expect(projected.id).toBe('solid-cyl-1');
    expect(projected.topView?.baseShapeName).toBe('Daire');
    expect(projected.topView?.kind).toBe('circle');
    expect(projected.topView?.radius).toBeCloseTo(2 * defaultViewport.zoom, 1);
  });

  it('projects a cube into 2D axonometric mode with faces and edges', () => {
    const cube: Solid3DObject = {
      id: 'solid-cube-axon',
      type: 'cube',
      name: 'Küp Axon',
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

    const projected = projectSolidFor2D(cube, defaultViewport, false, 'axonometric');

    expect(projected.id).toBe('solid-cube-axon');
    expect(projected.faces.length).toBe(6);
    expect(projected.edges.length).toBe(12);
    const hiddenEdges = projected.edges.filter((e) => e.isHidden);
    const visibleEdges = projected.edges.filter((e) => !e.isHidden);
    expect(hiddenEdges.length).toBeGreaterThan(0);
    expect(visibleEdges.length).toBeGreaterThan(0);
  });
});
