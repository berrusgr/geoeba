import type { PointObject, PolygonObject } from '@/types/math';
import type { CommandHandler } from '../../types';
import { normalizeCommand } from '../../text';
import { type CommandScene, fail, trNum } from '../../scene';
import { refsOf } from './refs';
import { triangleOf } from './common';

const SLIDER = /\bkaydirici|\bsurgu/;
const UNBIND = /\b(?:kaldir|coz|ayir|kopar|iptal)/;

function sliderName(scene: CommandScene, label: string): string {
  const base = normalizeCommand(label).replace(/[^a-z0-9_]/g, '') || 'k';
  const taken = new Set(scene.sliders().map(s => s.variableName));
  if (!taken.has(base)) return base;
  for (let i = 1; ; i++) if (!taken.has(`${base}${i}`)) return `${base}${i}`;
}

export const bindSliders: CommandHandler = {
  id: 'constructions.bindSliders',
  examples: [
    'Üçgen uzunluklarını kaydırıcıya bağla',
    'ABC Üçgen uzunluklarını kaydırıcıya bağla',
    'üçgenin kenarlarını kaydırıcılara bağla',
  ],
  match(c) {
    if (!c.has(SLIDER) || !c.has(/\bbagla/) || c.has(UNBIND) || c.negated) return 0;
    if (c.has(/\bucgen|\bkenar|\buzunluk/) || c.labels.length) return 74;
    // Yalın "kaydırıcıya bağla": başka bir nesne adı yoksa üçgen bağı sayılır (üçgen yoksa açıklamayla reddedilir).
    return c.has(/\bfonksiyon|\bnokta|\bcember|\bdaire|\bdogru|\baci|\bdeger|\bparametre/) ? 0 : 66;
  },
  run(c, scene) {
    if (!scene.ofType('polygon').some(p => p.pointIds.length === 3)) {
      fail('Kenarları kaydırıcıya bağlanacak bir üçgen yok. Önce bir üçgen çizin (ör. “kenarları 3, 4 ve 5 olan üçgen çiz”), sonra “üçgenin kenarlarını kaydırıcıya bağla” yazın.');
    }
    const tri = triangleOf(c, scene, refsOf(c), { required: true, polygonOnly: true })!;
    const polygon = tri.polygon!;
    const [A, B, C] = tri.ids.map(id => scene.point(id));
    if ([B, C].some(p => p.construction?.kind === 'triangleVertex')) fail(`${tri.name} üçgeninin kenarları zaten kaydırıcılara bağlı.`);
    if ([B, C].some(p => p.construction)) fail(`${tri.name} üçgeninin köşeleri başka bir inşaya bağlı; kenarları kaydırıcıya bağlanamaz.`);
    const pairs: [PointObject, PointObject][] = [[A, B], [B, C], [C, A]];
    const lengths = pairs.map(([p, q]) => Math.hypot(q.x - p.x, q.y - p.y));
    if (lengths.some(l => l < 0.1)) fail('Kenar uzunlukları 0,1 birimden küçük olduğu için kaydırıcıya bağlanamaz.');
    const cross = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
    if (Math.abs(cross) < 1e-9) fail('Köşeler aynı doğru üzerinde; üçgen kaydırıcıya bağlanamaz.');
    const minY = Math.min(A.y, B.y, C.y);
    const sliders = pairs.map(([p, q], index) => {
      const value = lengths[index];
      return scene.addSlider(sliderName(scene, `${p.label}${q.label}`), {
        label: `${p.label}${q.label}`, value, min: 0.1, max: Math.max(10, 3 * value), step: 0.1, x: A.x - 1, y: minY - 2 - index, length: 4,
      });
    });
    const sliderIds = sliders.map(s => s.id) as [string, string, string];
    const rule = { kind: 'triangleVertex' as const, anchorId: A.id, sliderIds, rotation: Math.atan2(B.y - A.y, B.x - A.x), orientation: (cross > 0 ? 1 : -1) as 1 | -1 };
    scene.update(B.id, { construction: { ...rule, vertex: 1 }, isIndependent: false });
    scene.update(C.id, { construction: { ...rule, vertex: 2 }, isIndependent: false });
    scene.update(polygon.id, { edgeLabels: [0, 1, 2] });
    scene.say(`${tri.name} üçgeninin kenarları kaydırıcılara bağlandı: ${sliders.map((s, i) => `${s.variableName} = ${trNum(lengths[i])}`).join(', ')}. Kaydırıcıları değiştirdikçe üçgen yeniden kurulur.`);
    scene.setFocus([...sliderIds, polygon.id]);
  },
};

export const unbindSliders: CommandHandler = {
  id: 'constructions.unbindSliders',
  examples: [
    'üçgenin kaydırıcı bağını kaldır',
    'ABC üçgeninin kaydırıcı bağlantısını çöz',
  ],
  match(c) {
    if (!c.has(SLIDER) || !c.has(/\bbag(?:i|ini|lanti\w*|lari|larini)?\b|\bbagla/) || !c.has(UNBIND)) return 0;
    return 93;
  },
  run(c, scene) {
    const bound = (o: { type: string }) => o.type === 'polygon' && (o as PolygonObject).pointIds.some(id => scene.get(id)?.type === 'point' && scene.point(id).construction?.kind === 'triangleVertex');
    const candidates = scene.ofType('polygon').filter(bound);
    if (!candidates.length) fail('Kaydırıcılara bağlı bir üçgen yok.');
    const refs = refsOf(c).filter(r => r.label && scene.resolveLabel(r.label, ['polygon']).length);
    const polygon = scene.target(c, { types: ['polygon'], noun: 'kaydırıcıya bağlı üçgen', filter: bound, labels: refs.map(r => r.label!) }) as PolygonObject;
    const sliderIds = new Set<string>();
    for (const id of polygon.pointIds) {
      const p = scene.point(id);
      if (p.construction?.kind !== 'triangleVertex') continue;
      p.construction.sliderIds.forEach(s => sliderIds.add(s));
      scene.update(id, { construction: undefined, isIndependent: true });
    }
    const names = [...sliderIds].map(id => scene.get(id)).flatMap(s => s?.type === 'slider' ? [s.variableName] : []);
    scene.say(`${polygon.label} üçgeninin kaydırıcı bağı kaldırıldı; köşeler artık serbestçe sürüklenebilir.${names.length ? ` (${names.join(', ')} kaydırıcıları duruyor.)` : ''}`);
    scene.setFocus([polygon.id]);
  },
};
