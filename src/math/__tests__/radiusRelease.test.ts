import { describe, expect, it } from 'vitest';
import type { CircleObject, MathObject, PointObject } from '@/types/math';
import { copyObjects, pasteObjects } from '../objectClipboard';

const common = { showLabel: true, color: 'b', visible: true, createdAt: 0 };
const pt = (id: string, x: number, y: number, onObjectId?: string): PointObject =>
  ({ id, label: id, type: 'point', x, y, isIndependent: true, ...common, ...(onObjectId ? { onObjectId } : {}) });
/** Sağ tık "Kilitle" sonrası: R çembere kilitli, çember sabit yarıçaplı ve yarıçapı R'ye geri verebilir. */
const scene: MathObject[] = [pt('O', 0, 0), pt('R', 2, 0, 'c'),
  { id: 'c', label: 'c', type: 'circle', centerPointId: 'O', fixedRadius: 2, releasedRadiusPointId: 'R', ...common } as CircleObject];

describe('kilitlenirken bırakılan yarıçap noktası hatırlatması', () => {
  it('çemberi kopyalamak bırakılan noktayı panoya çekmez; yapıştırmada sahipsiz hatırlatma düşer', () => {
    const pano = copyObjects(scene, ['c']);
    expect(pano.objects.map((o) => o.id).sort()).toEqual(['O', 'c']);
    const circle = pasteObjects(pano, scene, { x: 5, y: 5 }).objects.find((o) => o.type === 'circle')!;
    expect('releasedRadiusPointId' in circle).toBe(false);
  });

  it('nokta da kopyalanmışsa hatırlatma yeni noktaya eşlenir', () => {
    const pasted = pasteObjects(copyObjects(scene, ['c', 'R']), scene, { x: 5, y: 5 }).objects;
    // Çember + merkezi (bağımlılık olarak) + kilitli nokta
    expect(pasted).toHaveLength(3);
    const circle = pasted.find((o) => o.type === 'circle') as CircleObject;
    const r = pasted.find((o) => o.type === 'point' && o.onObjectId) as PointObject;
    const merkez = pasted.find((o) => o.type === 'point' && !o.onObjectId) as PointObject;
    expect(pasted.some((o) => ['O', 'R', 'c'].includes(o.id))).toBe(false);
    expect(circle.centerPointId).toBe(merkez.id);
    expect(circle.releasedRadiusPointId).toBe(r.id);
    expect(r.onObjectId).toBe(circle.id);
  });
});
