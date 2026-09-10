import { describe, it, expect } from 'vitest';
import { eskiMerkezAcilariniTasi } from '@/state/WorkspaceContext';
import type { MathObject } from '@/types/math';

const t = 1750000000000;
const nokta = (id: string, label: string, x: number, y: number): MathObject =>
  ({ id, type: 'point', label, showLabel: true, x, y, visible: true, createdAt: t }) as MathObject;

const yay = (extra: Record<string, unknown> = {}): MathObject =>
  ({
    id: 'arc1',
    type: 'arc',
    label: 'Yarım Çember',
    showLabel: true,
    centerPointId: 'M',
    startPointId: 'S',
    directionPointId: 'E',
    visible: true,
    createdAt: t,
    ...extra,
  }) as MathObject;

const aci = (extra: Record<string, unknown> = {}): MathObject =>
  ({
    id: 'ang1',
    type: 'angle',
    label: '∠SME',
    showLabel: true,
    point1Id: 'S',
    vertexPointId: 'M',
    point3Id: 'E',
    visible: true,
    showValue: true,
    createdAt: t,
    ...extra,
  }) as MathObject;

const sca = (o: MathObject | undefined) => (o as { showCentralAngle?: boolean } | undefined)?.showCentralAngle;

/**
 * Eskiden "Açısını ölç (merkez açı)" yay için AYRI bir AngleObject üretiyordu.
 * Artık merkez açı şeklin kendi bayrağında tutuluyor. Eski kayıtlar açıldığında
 * ikisi birden çizilirse aynı açı için İKİ rozet oluşur; kullanıcı birine tıklayıp
 * gizlediğinde öteki ekranda kalır ("tıklıyorum ama gizlenmiyor").
 */
describe('Eski merkez açı nesnelerinin göçü', () => {
  it('yayın merkez açısını temsil eden eski açı nesnesini kaldırır', () => {
    const sonuc = eskiMerkezAcilariniTasi([
      nokta('M', 'M', 0, 0),
      nokta('S', 'S', 2, 0),
      nokta('E', 'E', -2, 0),
      yay(),
      aci(),
    ]);
    expect(sonuc.some((o) => o.type === 'angle')).toBe(false);
    expect(sonuc).toHaveLength(4);
  });

  it('görünürlüğü şeklin showCentralAngle alanına taşır', () => {
    const gorunur = eskiMerkezAcilariniTasi([yay(), aci({ showValue: true })]);
    expect(sca(gorunur.find((o) => o.type === 'arc'))).toBe(true);

    const gizli = eskiMerkezAcilariniTasi([yay(), aci({ showValue: false })]);
    expect(sca(gizli.find((o) => o.type === 'arc'))).toBe(false);
  });

  it('kolların sırası ters olsa da eşleşir', () => {
    const sonuc = eskiMerkezAcilariniTasi([yay(), aci({ point1Id: 'E', point3Id: 'S' })]);
    expect(sonuc.some((o) => o.type === 'angle')).toBe(false);
  });

  it('yayla ilgisi olmayan açıya dokunmaz', () => {
    const baskaAci = aci({ id: 'ang2', vertexPointId: 'S', point1Id: 'M', point3Id: 'E' });
    const sonuc = eskiMerkezAcilariniTasi([yay(), baskaAci]);
    expect(sonuc.some((o) => o.id === 'ang2')).toBe(true);
  });

  it('aynı merkezi paylaşan ama farklı kolları olan açıyı korur', () => {
    const digerAci = aci({ id: 'ang3', point1Id: 'S', point3Id: 'X' });
    const sonuc = eskiMerkezAcilariniTasi([yay(), digerAci]);
    expect(sonuc.some((o) => o.id === 'ang3')).toBe(true);
  });

  it('yay yoksa listeyi olduğu gibi döndürür (gereksiz kopya üretmez)', () => {
    const girdi = [nokta('A', 'A', 1, 1), aci()];
    expect(eskiMerkezAcilariniTasi(girdi)).toBe(girdi);
  });

  it('daire dilimi için de çalışır', () => {
    const dilim = yay({ id: 'sec1', type: 'sector' });
    const sonuc = eskiMerkezAcilariniTasi([dilim, aci()]);
    expect(sonuc.some((o) => o.type === 'angle')).toBe(false);
    expect(sca(sonuc[0])).toBe(true);
  });
});
