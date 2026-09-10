import { describe, it, expect } from 'vitest';
import {
  getVertexMarkerRadius,
  getSolidExtent,
  VERTEX_MARKER_MIN_PX,
  VERTEX_MARKER_MAX_PX,
  VERTEX_MARKER_RATIO,
} from '../geometry3d';
import { Solid3DObject } from '@/types/workspace3d';

/** Test için en küçük geçerli katı cisim. */
function kup(kenar: number): Solid3DObject {
  return {
    id: 'k1',
    type: 'cube',
    name: 'Küp',
    position: { x: 0, y: 0, z: 0 },
    dimensions: { width: kenar, height: kenar, depth: kenar, radius: kenar / 2 },
    rotation: { x: 0, y: 0, z: 0 },
    color: '#3b82f6',
    opacity: 0.85,
    showWireframe: true,
    showVertices: true,
    showFaces: true,
    unfoldProgress: 0,
    selectedFaceIndex: null,
  };
}

/**
 * Perspektif kamerada bir nesnenin ekran yarıçapı = dünyaYarıçapı * zoom
 * (bkz. Canvas3D.buildCameraBasis: distance = (H/2) / (zoom * tan(fov/2))).
 */
const ekranPx = (dunyaR: number, zoom: number) => dunyaR * zoom;

describe('3D köşe (pivot) işaretçisi boyutu', () => {
  it('getSolidExtent cismin en büyük boyutunu verir', () => {
    expect(getSolidExtent(kup(4))).toBe(4);
    const yassi = kup(2);
    yassi.dimensions = { width: 2, height: 9, depth: 3, radius: 1 };
    expect(getSolidExtent(yassi)).toBe(9);
  });

  it('normal yakınlıkta işaretçi cismin boyutuyla ORANTILIDIR', () => {
    const zoom = 55;
    // Bu boyutlar piksel bandının içinde kalır, dolayısıyla oran bozulmamalı
    for (const kenar of [3, 4, 6]) {
      const r = getVertexMarkerRadius(kup(kenar), zoom);
      expect(r).toBeCloseTo(kenar * VERTEX_MARKER_RATIO, 10);
    }
    // İki kat büyük cisim, iki kat büyük işaretçi
    const r3 = getVertexMarkerRadius(kup(3), zoom);
    const r6 = getVertexMarkerRadius(kup(6), zoom);
    expect(r6 / r3).toBeCloseTo(2, 10);
  });

  it('çok uzaklaşınca işaretçi görünmez kadar küçülmez (alt piksel sınırı)', () => {
    // zoom = 15 (CAMERA_ZOOM_MIN): düzeltmeden önce 3 br küpte ~1,8 px idi
    const r = getVertexMarkerRadius(kup(3), 15);
    expect(ekranPx(r, 15)).toBeGreaterThanOrEqual(VERTEX_MARKER_MIN_PX - 1e-9);
  });

  it('çok yakınlaşınca işaretçi cismi yutan bir lekeye dönüşmez (üst piksel sınırı)', () => {
    // zoom = 180 (CAMERA_ZOOM_MAX): düzeltmeden önce 8 br cisimde ~57 px idi
    const r = getVertexMarkerRadius(kup(8), 180);
    expect(ekranPx(r, 180)).toBeLessThanOrEqual(VERTEX_MARKER_MAX_PX + 1e-9);
  });

  it('tüm zoom aralığında ekran boyutu [min, max] bandının içinde kalır', () => {
    for (const zoom of [15, 30, 55, 90, 120, 180]) {
      for (const kenar of [0.5, 1, 3, 8, 12, 20]) {
        const px = ekranPx(getVertexMarkerRadius(kup(kenar), zoom), zoom);
        expect(px).toBeGreaterThanOrEqual(VERTEX_MARKER_MIN_PX - 1e-9);
        expect(px).toBeLessThanOrEqual(VERTEX_MARKER_MAX_PX + 1e-9);
      }
    }
  });

  it('zoom verilmezse eski dünya birimi davranışına döner (geriye dönük uyum)', () => {
    expect(getVertexMarkerRadius(kup(3))).toBeCloseTo(0.12, 10);
    expect(getVertexMarkerRadius(kup(0.5))).toBeCloseTo(0.07, 10); // alt sınır
    expect(getVertexMarkerRadius(kup(20))).toBeCloseTo(0.32, 10); // üst sınır
  });

  it('geçersiz zoom değerleri çökme üretmez', () => {
    for (const z of [0, -5, NaN]) {
      const r = getVertexMarkerRadius(kup(3), z as number);
      expect(Number.isFinite(r)).toBe(true);
      expect(r).toBeGreaterThan(0);
    }
  });
});
