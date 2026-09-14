import { describe, expect, it } from 'vitest';
import type { MathObject, ViewportTransform } from '@/types/math';
import { screenToWorld, worldToScreen } from '../../coordinates';
import { DEFAULT_ZOOM } from '@/state/WorkspaceContext';
import {
  MAX_ZOOM, MIN_ZOOM, RESET_ZOOM, clampZoom, fitViewport, historyConflict, historySteps, resetViewportTransform,
  sanitizeViewportPatch, shouldForceMeasurements, viewportAfterAction, viewportCenter, zoomViewport,
} from '../viewActions';
import type { AppAction } from '../types';

const vp = (patch: Partial<ViewportTransform> = {}): ViewportTransform => ({
  zoom: 44, panX: 0, panY: 0, width: 1200, height: 700, showGrid: true, showAxes: true, showCoordinates: true,
  showMeasurements: true, snapToGrid: false, gridStep: 1, ...patch,
});
const base = { visible: true, showLabel: true, color: '#000', createdAt: 1 };
const pt = (id: string, x: number, y: number, visible = true): MathObject => ({ ...base, id, type: 'point', label: id, x, y, isIndependent: true, visible });
const centerWorld = (v: ViewportTransform) => screenToWorld({ x: v.width / 2, y: v.height / 2 }, v);

describe('zoomViewport', () => {
  it('keeps the reset zoom in sync with the workspace default', () => {
    expect(RESET_ZOOM).toBe(DEFAULT_ZOOM);
  });

  it.each([
    [1.2, { panX: 0, panY: 0 }],
    [1 / 1.2, { panX: 0, panY: 0 }],
    [2, { panX: 130, panY: -75 }],
    [0.5, { panX: -300, panY: 210 }],
    [1.12, { panX: 17.5, panY: 3.25 }],
  ])('factor %s preserves the world point under the view centre', (factor, pan) => {
    const before = vp(pan);
    const after = zoomViewport(before, factor);
    expect(after.zoom).toBeCloseTo(before.zoom * factor, 9);
    const a = centerWorld(before), b = centerWorld(after);
    expect(b.x).toBeCloseTo(a.x, 9);
    expect(b.y).toBeCloseTo(a.y, 9);
  });

  it('preserves an explicit screen anchor like the mouse wheel', () => {
    const before = vp({ panX: 40, panY: -20 });
    const anchor = { x: 200, y: 150 };
    const world = screenToWorld(anchor, before);
    const after = zoomViewport(before, 1.5, anchor);
    const screen = worldToScreen(world, after);
    expect(screen.x).toBeCloseTo(anchor.x, 9);
    expect(screen.y).toBeCloseTo(anchor.y, 9);
  });

  it('clamps to [5, 300] and returns the same object at the limits', () => {
    expect(zoomViewport(vp(), 1000).zoom).toBe(MAX_ZOOM);
    expect(zoomViewport(vp(), 0.0001).zoom).toBe(MIN_ZOOM);
    const atMax = vp({ zoom: 300 });
    expect(zoomViewport(atMax, 1.2)).toBe(atMax);
    const atMin = vp({ zoom: 5 });
    expect(zoomViewport(atMin, 0.5)).toBe(atMin);
  });

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])('ignores invalid factor %s', factor => {
    const before = vp();
    expect(zoomViewport(before, factor)).toBe(before);
  });

  it('does not mutate the input viewport', () => {
    const before = vp({ panX: 12 });
    const snapshot = JSON.stringify(before);
    zoomViewport(before, 2);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('clampZoom bounds values', () => {
    expect(clampZoom(1)).toBe(5);
    expect(clampZoom(44)).toBe(44);
    expect(clampZoom(301)).toBe(300);
  });
});

describe('fitViewport', () => {
  it('centres and scales the bounding box of visible points with 1.5 padding', () => {
    const objects = [pt('A', 0, 0), pt('B', 10, 0), pt('C', 10, 4)];
    const fit = fitViewport(vp(), objects);
    const boxW = 10 + 3, boxH = 4 + 3;
    const zoom = Math.min(1200 / boxW, 700 / boxH);
    expect(fit.zoom).toBeCloseTo(zoom, 9);
    expect(fit.panX).toBeCloseTo(-5 * zoom, 9);
    expect(fit.panY).toBeCloseTo(2 * zoom, 9);
    const c = centerWorld(fit);
    expect(c.x).toBeCloseTo(5, 9);
    expect(c.y).toBeCloseTo(2, 9);
    // Every point is inside the visible area.
    for (const o of objects) {
      const s = worldToScreen(o as { x: number; y: number }, fit);
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(1200);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(700);
    }
  });

  it('ignores hidden objects', () => {
    const fit = fitViewport(vp(), [pt('A', 0, 0), pt('B', 2, 2), pt('Z', 500, 500, false)]);
    const c = centerWorld(fit);
    expect(c.x).toBeCloseTo(1, 9);
    expect(c.y).toBeCloseTo(1, 9);
  });

  it('uses a minimum box of 2 units and clamps zoom to 300', () => {
    const fit = fitViewport(vp({ width: 5000, height: 5000 }), [pt('A', 3, -1)]);
    expect(fit.zoom).toBe(300);
    expect(fit.panX).toBeCloseTo(-900, 9);
    expect(fit.panY).toBeCloseTo(-300, 9);
  });

  it('clamps very large scenes to zoom 5', () => {
    const fit = fitViewport(vp(), [pt('A', -5000, 0), pt('B', 5000, 0)]);
    expect(fit.zoom).toBe(5);
  });

  it('includes circles by fixed radius and by radius point', () => {
    const center = pt('O', 0, 0);
    const edge = pt('R', 0, 3);
    const fixed: MathObject = { ...base, id: 'c1', type: 'circle', label: 'c', centerPointId: 'O', fixedRadius: 6 };
    const byPoint: MathObject = { ...base, id: 'c2', type: 'circle', label: 'd', centerPointId: 'O', radiusPointId: 'R' };
    const a = fitViewport(vp(), [center, fixed]);
    expect(a.zoom).toBeCloseTo(Math.min(1200 / 15, 700 / 15), 9);
    const b = fitViewport(vp(), [center, edge, byPoint]);
    expect(b.zoom).toBeCloseTo(Math.min(1200 / 9, 700 / 9), 9);
  });

  it('ignores three-point circles like the canvas button', () => {
    const objects: MathObject[] = [pt('A', 0, 0), pt('B', 2, 0), { ...base, id: 'c', type: 'circle', label: 'c', centerPointId: '', throughPointIds: ['A', 'B', 'A'] }];
    const fit = fitViewport(vp(), objects);
    expect(centerWorld(fit).x).toBeCloseTo(1, 9);
  });

  it('includes text, fraction, image and pen strokes', () => {
    const objects: MathObject[] = [
      { ...base, id: 't', type: 'text', label: 't', text: 'Merhaba', x: -10, y: 0, fontSize: 14 },
      { ...base, id: 'f', type: 'fraction', label: 'f', numerator: 1, denominator: 2, x: 10, y: 0, radius: 2, modelType: 'pie' },
      { ...base, id: 'i', type: 'image', label: 'i', src: 'data:', x: 0, y: 8, width: 4, height: 2, opacity: 1 } as MathObject,
      { ...base, id: 'p', type: 'pen', label: 'p', points: [{ x: 0, y: -9 }, { x: 1, y: -9 }], thickness: 2 } as MathObject,
    ];
    const fit = fitViewport(vp(), objects);
    // x: -10 … 12, y: -9 … 10 → centre (1, 0.5)
    const c = centerWorld(fit);
    expect(c.x).toBeCloseTo(1, 9);
    expect(c.y).toBeCloseTo(0.5, 9);
    expect(fit.zoom).toBeCloseTo(Math.min(1200 / 25, 700 / 22), 9);
  });

  it('resets the view for an empty or invisible scene', () => {
    const moved = vp({ zoom: 120, panX: 300, panY: -50 });
    expect(fitViewport(moved, [])).toMatchObject({ zoom: 44, panX: 0, panY: 0 });
    expect(fitViewport(moved, [pt('A', 1, 1, false)])).toMatchObject({ zoom: 44, panX: 0, panY: 0 });
  });

  it('keeps view flags untouched', () => {
    const fit = fitViewport(vp({ showGrid: false, blackWhite: true }), [pt('A', 1, 1), pt('B', 3, 3)]);
    expect(fit.showGrid).toBe(false);
    expect(fit.blackWhite).toBe(true);
    expect(fit.width).toBe(1200);
  });
});

describe('viewport helpers', () => {
  it('resetViewportTransform restores zoom and pan only', () => {
    expect(resetViewportTransform(vp({ zoom: 10, panX: 5, panY: 6, showAxes: false }))).toEqual(vp({ showAxes: false }));
  });

  it('viewportCenter returns the world centre rounded to halves', () => {
    expect(viewportCenter(vp())).toEqual({ x: 0, y: 0 });
    expect(viewportCenter(vp({ panX: -440, panY: 220 }))).toEqual({ x: 10, y: 5 });
  });

  it('sanitizes patches: drops size and non-finite values, clamps zoom', () => {
    expect(sanitizeViewportPatch({ zoom: 1000, width: 10, height: 10, panX: Number.NaN, showGrid: false })).toEqual({ zoom: 300, showGrid: false });
    expect(sanitizeViewportPatch({ gridStep: -1, blackWhite: true })).toEqual({ gridStep: 0.01, blackWhite: true });
  });

  it.each<[AppAction, Partial<ViewportTransform>]>([
    [{ kind: 'viewport', patch: { showGrid: false, showQuadrants: true } }, { showGrid: false, showQuadrants: true, zoom: 44 }],
    [{ kind: 'zoom', factor: 2 }, { zoom: 88 }],
    [{ kind: 'resetView' }, { zoom: 44, panX: 0, panY: 0 }],
    [{ kind: 'fitView' }, { panX: -0 }],
  ])('viewportAfterAction applies %o', (action, expected) => {
    const result = viewportAfterAction(vp({ panX: action.kind === 'resetView' ? 50 : 0 }), action, [pt('A', -1, -1), pt('B', 1, 1)]);
    expect(result).toMatchObject(expected);
  });

  it('viewportAfterAction leaves the view alone for non-view actions', () => {
    const before = vp();
    for (const action of [{ kind: 'undo' }, { kind: 'clearAll' }, { kind: 'styleMode', mode: 'Sade' }, { kind: 'help' }] as AppAction[]) {
      expect(viewportAfterAction(before, action, [])).toBe(before);
    }
  });
});

describe('command result policies', () => {
  it.each<[boolean, AppAction[], boolean]>([
    [true, [], true],
    [false, [], false],
    [true, [{ kind: 'styleMode', mode: 'Sade' }], false],
    [true, [{ kind: 'styleMode', mode: 'Ayrıntılı' }], true],
    [true, [{ kind: 'viewport', patch: { showMeasurements: false } }], false],
    [true, [{ kind: 'viewport', patch: { showGrid: false } }], true],
    [false, [{ kind: 'zoom', factor: 1.2 }], false],
  ])('shouldForceMeasurements(sceneChanged=%s, %o) → %s', (sceneChanged, actions, expected) => {
    expect(shouldForceMeasurements({ sceneChanged, actions })).toBe(expected);
  });

  it('rejects undo/redo mixed with scene changes', () => {
    expect(historyConflict({ sceneChanged: true, actions: [{ kind: 'undo' }] })).toMatch(/Geri al/);
    expect(historyConflict({ sceneChanged: true, actions: [{ kind: 'zoom', factor: 2 }, { kind: 'redo', count: 2 }] })).toMatch(/Yinele/);
    expect(historyConflict({ sceneChanged: false, actions: [{ kind: 'undo', count: 3 }] })).toBeNull();
    expect(historyConflict({ sceneChanged: true, actions: [{ kind: 'fitView' }] })).toBeNull();
  });

  it.each<[('undo' | 'redo'), number | undefined, number, number, number]>([
    ['undo', undefined, 3, 4, 1],
    ['undo', 2, 3, 4, 2],
    ['undo', 10, 3, 4, 3],
    ['undo', 1, 0, 1, 0],
    ['redo', undefined, 1, 4, 1],
    ['redo', 5, 1, 4, 2],
    ['redo', 1, 3, 4, 0],
    ['undo', 0, 3, 4, 1],
    ['undo', 2.7, 5, 6, 2],
  ])('historySteps(%s, %s, index %s, length %s) → %s', (kind, requested, index, length, expected) => {
    expect(historySteps(kind, requested, index, length)).toBe(expected);
  });
});
