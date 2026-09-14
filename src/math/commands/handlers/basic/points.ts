import type { MathObject, ObjectType, Point2D, PointObject, PolygonObject } from '@/types/math';
import { type Clause, fold } from '../../text';
import { constructionDependencies } from '../../../commandBindings';
import { type CommandScene, fail, tidy } from '../../scene';
import type { CommandHandler } from '../../types';
import {
  FOREIGN, FOREIGN_EXCEPT_SHAPES, ON_OBJECT, POINT_NOUN, type Ref, SIGNED, type Scan, assertNumbersUsed, coordText, creationColor, foreignVerb, hasLengthBars,
  isFree, listTr, named, randomSpot, round4, scan, signedValue, spacedSpot,
} from './shared';
import { HOST_NOUNS, HOST_TYPES, type HostGeometry, hostGeometry, hostSpots, projectOnto } from './hosts';

/** Nokta dışındaki şekil adları: bunlar varsa cümle başka bir şekli anlatıyordur. */
const OTHER_SHAPE = /\bdogru\b|\bdogru(?:su|sunu|yu|lar|lari)\b|\bparca|\bisin|\baci(?:si|sini|yi|lar|lari)?\b|∠|\bcizgi/;

/** Var olan bağımsız noktayı yeni konuma taşır (nesne üzerindeki nokta nesnede kalır). */
export function movePoint(scene: CommandScene, p: PointObject, to: Point2D): Point2D {
  if (p.construction) fail(`${p.label} noktası başka nesnelerden inşa edildi; konumu elle değiştirilemez.`);
  if (p.locked) fail(`${p.label} noktası kilitli. Önce kilidini açın.`);
  let target = to;
  if (p.onObjectId) {
    const host = scene.get(p.onObjectId);
    if (host) target = round4(projectOnto(hostGeometry(scene, host), to));
  }
  if (Math.max(Math.abs(target.x), Math.abs(target.y)) > 100000) fail('Koordinatlar −100000 ile 100000 arasında olmalı.');
  scene.update(p.id, { x: tidy(target.x), y: tidy(target.y) });
  scene.setFocus([p.id]);
  return target;
}

// ------------------------------------------------------------------------------------------------ A = (1; 2)

export const pointAssign: CommandHandler = {
  id: 'basic.pointAssign',
  examples: ['A = (1; 2)', 'B=(3,5; -1)', 'C = (0; 0)', 'P = (-2; 4)', 'K=(1,5; 2,5)', 'T = (6; -3)'],
  match(c) {
    const s = scan(c);
    if (s.refs.length === 1 && s.refs[0].kind === 'coord' && !s.refs[0].origin && !s.refs[0].bare && /^[a-z] = %0$/.test(s.text) && !/^[xyz] /.test(s.text)) return 97;
    if (s.refs.length !== 2) return 0;
    const [a, b] = s.refs;
    if (a.kind !== 'label' || a.coord || a.suffix || b.kind !== 'coord' || b.suffix || b.bare) return 0;
    return /^%0 = %1(?: nokta\w*)?$/.test(s.text) ? 97 : 0;
  },
  run(c, scene) {
    const s = scan(c);
    const letter = s.text.match(/^([a-z]) = /);
    const labelText = letter ? (c.raw.trim().match(/^\s*([\p{L}])/u)?.[1] ?? letter[1]).toLocaleUpperCase('tr') : (s.refs[0] as Extract<Ref, { kind: 'label' }>).label.text;
    const to = (s.refs[s.refs.length - 1] as Extract<Ref, { kind: 'coord' }>).coord;
    const existing = scene.findPoint(labelText);
    if (existing) {
      const at = movePoint(scene, existing, to);
      scene.say(`${existing.label} noktası ${coordText(at)} konumuna taşındı.`);
      return;
    }
    if (scene.resolveLabel(labelText).some(o => o.type !== 'point')) fail(`${labelText} adı başka bir nesnede kullanılıyor. Nokta için başka bir ad yazın.`);
    const p = scene.addPoint(to, { label: labelText });
    scene.say(`${named(p)} noktası oluşturuldu.`);
  },
};

// ------------------------------------------------------------------------------------------------ nokta oluşturma

type Item = { label?: string; coord?: Point2D };

const COORDINATE_PAIRS = [
  new RegExp(`\\bkoordinat\\w* ${SIGNED} (?:ve |, |ile )?${SIGNED}`),
  new RegExp(`\\bx (?:koordinati|degeri|i)? ?(?:= |: |esittir )?${SIGNED} (?:, )?(?:ve )?y (?:koordinati|degeri|si)? ?(?:= |: |esittir )?${SIGNED}`),
  new RegExp(`\\bapsis\\w* ${SIGNED} (?:, )?(?:ve )?ordinat\\w* ${SIGNED}`),
  new RegExp(`${SIGNED} (?:ve |, |ile )?${SIGNED} koordinat`),
];
/** Parantezsiz yazılan ya da söylenen koordinatlar: "A 2 3 noktası", "A noktasını 2 3 koordinatına koy", "A noktası iki üç olsun". */
const BARE_PAIR_BEFORE = new RegExp(`%(\\d+) ${SIGNED} (?:, |ve )?${SIGNED} nokta`);
const BARE_PAIR_AFTER = new RegExp(`%(\\d+) nokta(?!lar)\\w* ${SIGNED} (?:, |ve )?${SIGNED}(?= (?:koordinat|konum|olsun|yerine)|$)`);
/** Konuşmada küçük harfle gelen ve ayrıştırıcının etiket saymadığı tek harf: "a iki üç noktasını oluştur". */
const LETTER_PAIR = new RegExp(`(?:^| )([a-wz]) ${SIGNED} (?:, |ve )?${SIGNED} nokta`);
/** Aynı durum, sayı çifti koordinata dönüşmüşken: "a %0 noktasını oluştur". */
const LETTER_COORD = /(?:^| )([a-wz]) %(\d+) nokta/;

/**
 * "x = 2, y = 3 olan nokta", "x = 2, y = 3 olan A noktasını oluştur", "A noktası x=2 y=3 olsun": sayı değerli x ve y çifti nokta koordinatıdır.
 * Ayrıştırıcı bu çifti fonksiyon tanımı saymaz; metin "x = #0 , y = #1 olan $0 noktasini olustur" biçimindedir.
 * Başka işleyiciler ("=" ayarlama) önce davranmasın diye 98 puanla eşleşir.
 */
function xyDefinition(c: Clause): { at: Point2D; label?: string } | undefined {
  if (c.definition) return undefined;
  // "x = 2; y = 3", "y = 3, x = 2 olan nokta" (ters sıra), "A noktasını x = 2 y = 3 yap"
  const pair = c.text.match(/\bx (?:=|:|esittir) (eksi )?(#\d+) (?:, |; |ve )?y (?:=|:|esittir) (eksi )?(#\d+)(?: (?:olan|olsun|yap)\b(.*))?$/);
  const reversed = pair ? null : c.text.match(/\by (?:=|:|esittir) (eksi )?(#\d+) (?:, |; |ve )?x (?:=|:|esittir) (eksi )?(#\d+)(?: (?:olan|olsun|yap)\b(.*))?$/);
  const m = pair ?? reversed;
  if (!m || !/\bnokta/.test(c.text)) return undefined;
  const rest = m[5] ?? '';
  if (rest.trim() && !/^\s*(?:\$\d+\s+)?(?:bir\s+)?nokta\S*(?:\s+(?:olustur|ciz|koy|ekle|yerlestir)\S*)?\s*$/.test(rest)) return undefined;
  const ref = rest.match(/^\s*\$(\d+)\s+nokta/);
  const label = ref ? c.labels[Number(ref[1])]?.text : c.labels[0]?.text;
  const first = c.num(m[2]) * (m[1] ? -1 : 1), second = c.num(m[4]) * (m[3] ? -1 : 1);
  return { at: pair ? { x: first, y: second } : { x: second, y: first }, label: label?.toLocaleUpperCase('tr') };
}

function numericCoordinate(c: Clause, s: Scan): Point2D | undefined {
  for (const re of COORDINATE_PAIRS) {
    const m = s.text.match(re);
    if (m) return { x: signedValue(c, m[1]), y: signedValue(c, m[2]) };
  }
  return undefined;
}

function pointItems(c: Clause, s: Scan, scene: CommandScene): Item[] {
  const plural = /\bnoktalar/.test(s.text);
  const done: { at: number; item: Item }[] = [];
  const labels: Extract<Ref, { kind: 'label' }>[] = [];
  const coords: Extract<Ref, { kind: 'coord' }>[] = [];
  const bare = new Map<Ref, Point2D>();
  if (!s.refs.some(r => r.kind === 'coord' || r.coord)) {
    const m = s.text.match(BARE_PAIR_BEFORE) ?? s.text.match(BARE_PAIR_AFTER);
    const ref = m ? s.refs[Number(m[1])] : undefined;
    if (m && ref?.kind === 'label') bare.set(ref, { x: signedValue(c, m[2]), y: signedValue(c, m[3]) });
  }
  for (const ref of s.refs) {
    if (ref.kind === 'label' && (ref.coord || bare.has(ref))) done.push({ at: ref.at, item: { label: ref.label.text, coord: ref.coord ?? bare.get(ref) } });
    else if (ref.kind === 'label') labels.push(ref);
    else coords.push(ref);
  }
  const labelTexts: { at: number; text: string }[] = labels.flatMap(ref => {
    const text = ref.label.text;
    if (plural && !scene.findPoint(text)) {
      const parts = scene.splitNewLabels(text);
      if (parts && parts.length > 1) return parts.map(part => ({ at: ref.at, text: part }));
    }
    return [{ at: ref.at, text }];
  });
  if (labelTexts.length && coords.length && labelTexts.length !== coords.length) {
    fail('Hangi koordinatın hangi noktaya ait olduğunu anlayamadım. Her noktayı koordinatıyla yazın: “A(2; 3) ve B(4; 1) noktalarını oluştur”.');
  }
  if (labelTexts.length && coords.length) labelTexts.forEach((l, i) => done.push({ at: l.at, item: { label: l.text, coord: coords[i].coord } }));
  else {
    labelTexts.forEach(l => done.push({ at: l.at, item: { label: l.text } }));
    coords.forEach(r => done.push({ at: r.at, item: { coord: r.coord } }));
  }
  const items = done.sort((a, b) => a.at - b.at).map(d => d.item);
  if (!items.length && !s.refs.length) {
    const letter = s.text.match(LETTER_PAIR);
    if (letter) items.push({ label: letter[1].toLocaleUpperCase('tr'), coord: { x: signedValue(c, letter[2]), y: signedValue(c, letter[3]) } });
  }
  const letterCoord = s.text.match(LETTER_COORD);
  if (letterCoord && items.length === 1 && !items[0].label && s.refs.length === 1 && s.refs[0].kind === 'coord' && s.refs[0].bare) items[0].label = letterCoord[1].toLocaleUpperCase('tr');
  if (!items.some(i => i.coord)) {
    const xy = numericCoordinate(c, s);
    if (xy) {
      if (items.length > 1) fail('Koordinatları her nokta için ayrı yazın: “A(2; 3) ve B(4; 1) noktalarını oluştur”.');
      if (items.length) items[0].coord = xy; else items.push({ coord: xy });
    }
  }
  const count = s.text.match(/(#\d+) (?:tane |adet )?(?:yeni )?nokta/);
  if (count && !items.length) {
    const n = c.num(count[1]);
    if (!Number.isInteger(n) || n < 1 || n > 26) fail('Tek seferde 1 ile 26 arasında nokta oluşturabilirim.');
    for (let i = 0; i < n; i++) items.push({});
  }
  if (!items.length) items.push({});
  return items;
}

export const pointCreate: CommandHandler = {
  id: 'basic.point',
  examples: [
    'A(2; 3) noktası oluştur', 'P (2,5; -3,2) noktası oluştur', 'A(0,0), B(4,0) ve C(2,3) noktalarını oluştur', 'A noktası (2,3)',
    'koordinatları 2 ve 3 olan A noktası', 'orijine O noktası koy', 'rastgele bir nokta koy', '3 nokta koy', 'K noktası ekle', '(2,3) noktası',
  ],
  match(c, scene) {
    if (xyDefinition(c)) return 98;
    if (hasLengthBars(c) || c.definition) return 0;
    const s = scan(c, scene);
    const t = s.text;
    const formal = s.refs.length > 0 && /^%\d+(?: (?:, |ve )?%\d+)*$/.test(t)
      && s.refs.every(r => !r.suffix && (r.kind === 'label' ? !!r.coord && !r.pronoun : !r.origin && !r.bare));
    if (formal) return s.refs.some(r => r.kind === 'label') ? 96 : 95;
    if (!POINT_NOUN.test(t) || FOREIGN.test(t) || foreignVerb(c) || OTHER_SHAPE.test(t) || ON_OBJECT.test(t)) return 0;
    if (/\b(?:birlestir|baglayan|birlestiren|gecen|baslayan|cikan|arasina|arasinda|arasindaki|yonunde)/.test(t)) return 0;
    if (/\b(?:kose|tepe)/.test(t)) return 0;
    return s.refs.some(r => r.kind === 'coord' || (r.kind === 'label' && r.coord)) ? 43 : 40;
  },
  run(c, scene) {
    const xy = xyDefinition(c);
    if (xy) {
      const existing = xy.label ? scene.findPoint(xy.label) : undefined;
      if (existing) {
        if (!/\b(?:olsun|yap)\b/.test(c.text + fold(c.definition?.body ?? ''))) fail(`${existing.label} adlı nokta zaten var. Taşımak için “${existing.label} = ${coordText(xy.at)}” yazın.`);
        const at = movePoint(scene, existing, xy.at);
        scene.say(`${existing.label} noktası ${coordText(at)} konumuna taşındı.`);
        return;
      }
      const p = scene.addPoint(xy.at, { label: xy.label, color: creationColor(c) });
      scene.setFocus([p.id]);
      scene.say(`${named(p)} noktası oluşturuldu.`);
      return;
    }
    const s = scan(c, scene);
    const t = s.text;
    assertNumbersUsed(c, s, '“3 nokta koy”');
    const items = pointItems(c, s, scene);
    const random = /\b(?:rastgele|rasgele|gelisiguzel|herhangi bir yer)/.test(t);
    const moveExisting = /\bolsun\b/.test(t);
    const created: PointObject[] = [];
    const moved: string[] = [];
    const movedIds: string[] = [];
    const placed: PointObject[] = [];
    for (const item of items) {
      const existing = item.label ? scene.findPoint(item.label) : undefined;
      if (existing) {
        if (moveExisting && item.coord) {
          const at = movePoint(scene, existing, item.coord);
          moved.push(`${existing.label}${coordText(at)}`);
          movedIds.push(existing.id);
          continue;
        }
        const example = item.coord ?? { x: 1, y: 2 };
        fail(`${existing.label} adlı nokta zaten var. Taşımak için “${existing.label} = ${coordText(example)}” yazın; yeni nokta için başka bir ad kullanın.`);
      }
      if (item.label && scene.resolveLabel(item.label).some(o => o.type !== 'point' && o.label === item.label)) {
        fail(`${item.label} adı başka bir nesnede kullanılıyor. Nokta için başka bir ad yazın.`);
      }
      const position = item.coord ?? (random ? randomSpot(scene) : items.length > 1 ? spacedSpot(scene) : scene.freeSpot());
      const p = scene.addPoint(position, { label: item.label, color: creationColor(c) });
      created.push(p);
      if (!item.coord) placed.push(p);
    }
    const parts: string[] = [];
    if (created.length) parts.push(`${listTr(created.map(named))} ${created.length > 1 ? 'noktaları' : 'noktası'} oluşturuldu.`);
    if (moved.length) parts.push(`${listTr(moved)} ${moved.length > 1 ? 'noktaları' : 'noktası'} yeni konumuna taşındı.`);
    if (placed.length) parts.push(random ? 'Konum rastgele seçildi.' : 'Konum belirtilmediği için boş bir yere kondu; sürükleyerek taşıyabilirsiniz.');
    scene.setFocus([...created.map(p => p.id), ...movedIds]);
    scene.say(parts.join(' '));
  },
};

// ------------------------------------------------------------------------------------------------ nesne üzerinde nokta

function hostTypes(before: string): { types: ObjectType[]; noun: string } {
  if (/\bdogru parca|\bparca/.test(before)) return { types: ['segment'], noun: 'doğru parçası' };
  if (/\bisin/.test(before)) return { types: ['ray'], noun: 'ışın' };
  if (/\bdogru/.test(before)) return { types: ['line'], noun: 'doğru' };
  if (/\bdaire dilim|\bdilim/.test(before)) return { types: ['sector'], noun: 'daire dilimi' };
  if (/\bcember/.test(before)) return { types: ['circle'], noun: 'çember' };
  if (/\bdaire/.test(before)) return { types: ['circle', 'sector'], noun: 'daire' };
  if (/\belips/.test(before)) return { types: ['ellipse'], noun: 'elips' };
  if (/\byay/.test(before)) return { types: ['arc'], noun: 'yay' };
  if (/\bucgen|\bkare|\bdikdortgen|\bcokgen|\bdortgen|\bbesgen|\baltigen|\bkenar|\bparalelkenar|\byamuk|\bdeltoid/.test(before)) return { types: ['polygon'], noun: 'çokgen' };
  return { types: HOST_TYPES, noun: 'nesne' };
}

/** Nesne, noktanın kendisine (inşa, tanım noktası ya da başka bir taşıyıcı üzerinden) bağlı mı? Bağlıysa döngü oluşur. */
function dependsOnPoint(scene: CommandScene, obj: MathObject, pointId: string, seen = new Set<string>()): boolean {
  if (seen.has(obj.id)) return false;
  seen.add(obj.id);
  const ids = obj.type === 'point'
    ? [...constructionDependencies(obj), ...(obj.onObjectId ? [obj.onObjectId] : [])]
    : scene.definingPointIds(obj);
  return ids.some(id => id === pointId || (!!scene.get(id) && dependsOnPoint(scene, scene.get(id)!, pointId, seen)));
}

/** Var olan bağımsız noktayı nesnenin üzerine iz düşürüp bağlar (araçtaki "nesne üzerinde nokta" ile aynı alan). */
function attachPoint(scene: CommandScene, p: PointObject, host: MathObject, g: HostGeometry) {
  if (p.construction) fail(`${p.label} noktası inşa ile oluşturuldu; bir nesnenin üzerine alınamaz.`);
  if (p.locked) fail(`${p.label} noktası kilitli. Önce kilidini açın.`);
  if (dependsOnPoint(scene, host, p.id)) fail(`${p.label} noktası ${host.label} nesnesini oluşturan noktalardan biri; kendi nesnesinin üzerine alınamaz.`);
  const at = round4(projectOnto(g, p));
  scene.update(p.id, { x: at.x, y: at.y, onObjectId: host.id });
}

export const pointOnObject: CommandHandler = {
  id: 'basic.pointOnObject',
  examples: [
    'AB doğru parçası üzerinde bir nokta al', 'çemberin üzerine bir nokta koy', 'D noktasını AB doğrusu üzerinde oluştur', 'AB üzerinde 3 nokta al',
    'ABC üçgeninin üzerinde bir nokta al', 'AB doğru parçası üzerinde K ve L noktalarını oluştur', 'elipsin üzerine bir nokta koy',
    'C noktasını AB doğru parçası üzerine koy',
  ],
  match(c, scene) {
    if (hasLengthBars(c)) return 0;
    const s = scan(c, scene);
    const t = s.text;
    if (!ON_OBJECT.test(t) || !POINT_NOUN.test(t)) return 0;
    if (FOREIGN_EXCEPT_SHAPES.test(t) || foreignVerb(c) || /\b(?:kose|merkez)/.test(t)) return 0;
    // Adı verilen nokta zaten varsa bu bir "noktayı nesnenin üzerine al" düzenlemesidir: düzenleme ailesi eşleşmezse yedek olarak uygulanır.
    const names = s.refs.filter(r => r.kind === 'label' && /^nokta/.test(s.words[r.at + 1] ?? ''));
    if (names.some(r => r.kind === 'label' && scene.findPoint(r.label.text))) return 36;
    return 44;
  },
  run(c, scene) {
    const s = scan(c, scene);
    const t = s.text;
    assertNumbersUsed(c, s, '“AB üzerinde 3 nokta al”');
    const keyword = s.words.findIndex(w => ON_OBJECT.test(w));
    const beforeText = s.words.slice(0, keyword).join(' ');
    const nameRefs: Extract<Ref, { kind: 'label' }>[] = [];
    const hostRefs: Extract<Ref, { kind: 'label' }>[] = [];
    let near: Point2D | undefined;
    for (const ref of s.refs) {
      if (ref.kind === 'coord') { near = ref.coord; continue; }
      if (ref.coord) { near = ref.coord; nameRefs.push(ref); continue; }
      if (/^nokta/.test(s.words[ref.at + 1] ?? '') || ref.at > keyword) nameRefs.push(ref);
      else hostRefs.push(ref);
    }
    const { types, noun } = hostTypes(beforeText);

    // "ABC üçgeninin AB kenarı üzerinde": kenarı iki köşe adıyla yazılmış çokgen
    let host: MathObject | undefined;
    let edge: number | undefined;
    if (types.includes('polygon')) {
      for (const ref of hostRefs) {
        const pts = scene.pointsFromLabel(ref.label.text);
        if (!pts || pts.length !== 2 || scene.shapesWithPoints(pts.map(p => p.id), ['segment', 'line', 'ray']).length) continue;
        const polys = scene.ofType('polygon').filter(poly => {
          const i = poly.pointIds.indexOf(pts[0].id), j = poly.pointIds.indexOf(pts[1].id), n = poly.pointIds.length;
          return i >= 0 && j >= 0 && ((i + 1) % n === j || (j + 1) % n === i);
        });
        const others = hostRefs.filter(r => r !== ref).map(r => scene.resolveLabel(r.label, ['polygon'])).flat();
        const candidates = others.length ? polys.filter(p => others.some(o => o.id === p.id)) : polys;
        if (candidates.length > 1) fail(`${ref.label.text} kenarı birden fazla çokgende var. Çokgenin adını da yazın (ör. “ABC üçgeninin ${ref.label.text} kenarı üzerinde nokta al”).`);
        if (candidates.length === 1) {
          host = candidates[0];
          const poly = host as PolygonObject, i = poly.pointIds.indexOf(pts[0].id), j = poly.pointIds.indexOf(pts[1].id);
          edge = (i + 1) % poly.pointIds.length === j ? i : j;
        }
      }
    }
    if (!host) host = scene.target(c, { types, noun, labels: hostRefs.map(r => r.label) });
    const g: HostGeometry = hostGeometry(scene, host);
    if (edge !== undefined && g.kind === 'polygon') g.edge = edge;

    const names = nameRefs.flatMap(r => {
      const parts = /\bnoktalar/.test(t) && !scene.findPoint(r.label.text) ? scene.splitNewLabels(r.label.text) : null;
      return parts && parts.length > 1 ? parts : [r.label.text];
    });
    const countMatch = t.match(/(#\d+) (?:tane |adet )?(?:yeni )?nokta/);
    const count = names.length || (countMatch ? c.num(countMatch[1]) : 1);
    if (!Number.isInteger(count) || count < 1 || count > 20) fail('Bir nesnenin üzerine tek seferde 1 ile 20 arasında nokta koyabilirim.');
    if (names.length && countMatch && c.num(countMatch[1]) !== names.length) fail(`${c.num(countMatch[1])} nokta istendi ama ${names.length} ad yazıldı. Sayıyla adları eşleştirin.`);
    const existing = names.map(name => scene.findPoint(name)).filter((p): p is PointObject => !!p);
    if (existing.length) {
      if (existing.length !== names.length) fail('Bazı noktalar zaten var, bazıları yok. Var olan noktaları ve yeni noktaları ayrı cümlelerle yazın.');
      if (!/\b(?:koy|yerlestir|al\b|getir|oturt)/.test(t)) {
        fail(`${existing[0].label} adlı nokta zaten var. Noktayı bu nesnenin üzerine almak için “${existing[0].label} noktasını ${host.label} üzerine koy” yazın; yeni nokta için başka bir ad kullanın.`);
      }
      for (const p of existing) attachPoint(scene, p, host, g);
      scene.setFocus(existing.map(p => p.id));
      scene.say(`${listTr(existing.map(p => p.label))} ${existing.length > 1 ? 'noktaları' : 'noktası'} ${host.label} üzerine alındı; artık nesnenin üzerinde kayar.`);
      return;
    }

    let spots: Point2D[];
    if (near && count === 1) spots = [projectOnto(g, near)];
    else if (count === 1) {
      const candidates = hostSpots(g, 1).map(p => projectOnto(g, p));
      spots = [candidates.find(p => isFree(scene, p, 0.3)) ?? candidates[0]];
    } else spots = hostSpots(g, count).map(p => projectOnto(g, p));

    const created = spots.map((spot, i) => scene.addPoint(round4(spot), { label: names[i], onObjectId: host!.id, color: creationColor(c) }));
    const hostName = HOST_NOUNS[host.type] && !/doğru|ışın|çember|elips|yay|dilim/i.test(host.label) ? `${host.label} ${HOST_NOUNS[host.type]}` : host.label;
    scene.say(`${listTr(created.map(named))} ${created.length > 1 ? 'noktaları' : 'noktası'} ${hostName} üzerine eklendi; sürüklenince nesnenin üzerinde kayar.`);
    scene.setFocus(created.map(p => p.id));
  },
};
