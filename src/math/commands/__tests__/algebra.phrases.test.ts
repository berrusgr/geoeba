import { describe, expect, it } from 'vitest';
import type { FunctionObject, MathObject, SliderObject } from '@/types/math';
import { compileMathExpression } from '@/math/parser';
import { rankHandlers, runCommand } from '../engine';
import { parseClause } from '../text';
import { CommandScene } from '../scene';
import { normalizeSpokenCommand } from '../speechText';
import { build } from './helpers';

/**
 * Cebir ailesi (fonksiyon, kaydırıcı, oynatma, kesir, girdi kutusu, polinom uydurma) TÜM komut motoruyla:
 * öğretmenin yazdığı ya da söylediği (konuşma metni normalizeSpokenCommand'dan geçer) gerçekçi biçimler.
 */

type Objs = MathObject[];
const sliders = () => build(s => { s.addSlider('a', { value: 1 }); s.addSlider('b', { value: 2 }); s.addSlider('k', { value: 0 }); });
const points = () => build(s => {
  s.addPoint({ x: -1, y: 1 }, { label: 'A' });
  s.addPoint({ x: 0, y: 0 }, { label: 'B' });
  s.addPoint({ x: 1, y: 1 }, { label: 'C' });
  s.addPoint({ x: 2, y: 4 }, { label: 'K' });
});
const withF = () => build(s => { s.addFunction('x^2', { label: 'f(x) = x^2' }); });
const rich = () => build(s => {
  const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  const B = s.addPoint({ x: 4, y: 0 }, { label: 'B' });
  const C = s.addPoint({ x: 0, y: 3 }, { label: 'C' });
  s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
  s.addSlider('a', { value: 1 });
  s.addSlider('b', { value: 2 });
  s.addFunction('x^2', { label: 'f(x) = x^2' });
});

function run(text: string, scene: Objs = [], spoken = false) {
  const input = spoken ? normalizeSpokenCommand(text) : text;
  const before = JSON.stringify(scene);
  const result = runCommand(input, scene);
  if (!result.ok) throw new Error(`“${input}” başarısız: ${result.message}`);
  expect(new Set(result.objects.map(o => o.id)).size).toBe(result.objects.length);
  expect(JSON.stringify(scene)).toBe(before);
  return result;
}
const topHandler = (text: string, scene: Objs) => {
  const s = new CommandScene(scene);
  return rankHandlers(parseClause(text, s.known()), s)[0]?.handler.id;
};
const slider = (objects: Objs, name: string) => {
  const found = objects.find((o): o is SliderObject => o.type === 'slider' && o.variableName === name);
  if (!found) throw new Error(`${name} kaydırıcısı yok`);
  return found;
};
/** Komutun oluşturduğu ya da değiştirdiği son fonksiyon. */
const changedFunction = (objects: Objs, before: Objs) => {
  const old = new Map(before.map(o => [o.id, JSON.stringify(o)]));
  const fns = objects.filter((o): o is FunctionObject => o.type === 'function' && old.get(o.id) !== JSON.stringify(o));
  expect(fns.length).toBeGreaterThan(0);
  return fns[fns.length - 1];
};
const expectGraph = (fn: FunctionObject, objects: Objs, expected: (x: number, s: Record<string, number>) => number) => {
  const scope = Object.fromEntries(objects.filter((o): o is SliderObject => o.type === 'slider').map(s => [s.variableName, s.value]));
  const compiled = compileMathExpression(fn.expression)!;
  for (const x of [0.5, 1.5, 3]) expect(compiled(x, scope)).toBeCloseTo(expected(x, scope), 9);
};

describe('algebra phrases (full engine): worded and spoken functions', () => {
  it.each([
    ['iks kare fonksiyonunu çiz', false, (x: number) => x * x],
    ['iks kare fonksiyonunu çiz', true, (x: number) => x * x],
    ['iks küp eksi iks fonksiyonunu çiz', false, (x: number) => x ** 3 - x],
    ['iks kare artı iks fonksiyonunu çiz', true, (x: number) => x * x + x],
    ['f(x) = iks kare', false, (x: number) => x * x],
    ['y = iks artı bir', false, (x: number) => x + 1],
    ['(x artı bir) kare fonksiyonunu çiz', false, (x: number) => (x + 1) ** 2],
    ['parantez aç x artı bir parantez kapat kare fonksiyonunu çiz', true, (x: number) => (x + 1) ** 2],
    ['karekök parantez aç x artı bir parantez kapat fonksiyonunu çiz', true, (x: number) => Math.sqrt(x + 1)],
    ['x kare fonksiyonunu mavi renkte çiz', false, (x: number) => x * x],
    ['f(x) = 2^x fonksiyonunu mavi renkte çiz', false, (x: number) => 2 ** x],
    ['f(x) = x^2 fonksiyonunu kırmızı renkte çiz', false, (x: number) => x * x],
  ] as const)('“%s” (konuşma: %s)', (text, spoken, expected) => {
    const r = run(text, [], spoken);
    expectGraph(changedFunction(r.objects, []), r.objects, expected);
  });

  it('takes the colour of "kırmızı renkte" instead of treating "renk" as a paint command', () => {
    const plain = run('f(x) = 2^x').objects.find(o => o.type === 'function')!.color;
    for (const text of ['f(x) = 2^x fonksiyonunu kırmızı renkte çiz', 'x kare fonksiyonunu kırmızı renkte çiz']) {
      const fn = changedFunction(run(text).objects, []);
      expect(fn.color).not.toBe(plain);
    }
  });

  it('defines a named function written after its noun ("f fonksiyonu x kare olsun")', () => {
    const r = run('f fonksiyonu x kare olsun');
    const fn = changedFunction(r.objects, []);
    expect(fn.label).toBe('f(x) = x^2');
    const g = run('g fonksiyonunu sinüs x olarak tanımla');
    expectGraph(changedFunction(g.objects, []), g.objects, x => Math.sin(x));
    expect(changedFunction(g.objects, []).label.startsWith('g(x) =')).toBe(true);
    const scene = withF();
    const redefined = run('f fonksiyonu 2x artı 1 olsun', scene);
    expect(redefined.objects.filter(o => o.type === 'function')).toHaveLength(1);
    expectGraph(changedFunction(redefined.objects, scene), redefined.objects, x => 2 * x + 1);
  });

  it('does not read edit or question sentences about a named function as a definition', () => {
    const scene = withF();
    for (const text of ['f fonksiyonunu x ekseninde yansıt', 'f fonksiyonunun x eksenini kestiği noktaları bul']) {
      expect(topHandler(text, scene)).not.toBe('algebra.function.words');
      const r = runCommand(text, scene);
      if (r.ok) expect(r.objects.some(o => o.type === 'function' && o.expression === 'x')).toBe(false);
    }
  });

  it('leaves "y = 3 olan K noktası" to the point family but still draws "y = 2x + 3 doğrusunu çiz"', () => {
    for (const text of ['y = 3 olan K noktasını oluştur', 'y = 3 olan nokta']) expect(topHandler(text, [])).not.toBe('algebra.function.define');
    expect(topHandler('y = 2x + 3 doğrusunu çiz', [])).toBe('algebra.function.define');
    expect(topHandler('y = x^2 grafiğini çiz', [])).toBe('algebra.function.define');
  });

  it('turns spoken coefficient letters into slider names ("a x artı be" → a, b)', () => {
    const r = run('f x eşittir a x artı be', [], true);
    expectGraph(changedFunction(r.objects, []), r.objects, (x, s) => s.a * x + s.b);
    expect(r.objects.filter(o => o.type === 'slider').map(o => (o as SliderObject).variableName).sort()).toEqual(['a', 'b']);
  });
});

describe('algebra phrases (full engine): slider assignments', () => {
  it.each([
    ['a = 3', () => [] as Objs], ['k = 2', () => [] as Objs], ['a = 3', points], ['k = 2', points], ['a = 3', sliders], ['k = 2', sliders],
    ['a = 3 olsun', points],
  ])('“%s” assigns (known speech failure)', (text, scene) => {
    const r = run(text, scene());
    const [name, value] = text.split(/\s*=\s*/);
    expect(slider(r.objects, name).value).toBe(Number.parseFloat(value));
  });

  it.each([
    ['k = iki', 'k', 2], ['a = üç', 'a', 3], ['a = on', 'a', 10], ['a = dört buçuk', 'a', 4.5], ['a = eksi iki', 'a', -2], ['a = yarım', 'a', 0.5],
    ['a = 1 bölü iki', 'a', 0.5], ['k = 2 olsun lütfen', 'k', 2], ['a = 3 tamam', 'a', 3], ['K = iki', 'k', 2], ['k = on iki', 'k', 12],
  ] as const)('“%s” reads number words in the value', (text, name, value) => {
    expect(slider(run(text).objects, name).value).toBe(value);
  });

  it('updates an existing slider from a worded value', () => {
    expect(slider(run('a = beş', sliders()).objects, 'a').value).toBe(5);
  });

  it('assigns spoken "a eşittir üç" beside a point A (lowercase name) and leaves "A = 3" to the point', () => {
    const r = run('a eşittir üç', points(), true);
    expect(slider(r.objects, 'a').value).toBe(3);
    expect(r.objects.filter(o => o.type === 'point')).toHaveLength(4);
    expect(topHandler('A = 3', points())).not.toBe('algebra.slider.assign');
  });

  it('maps spoken letter names on the left side ("em = 2" → m, "be = 3" → b)', () => {
    const r = run('em = 2');
    expect(slider(r.objects, 'm').value).toBe(2);
    expect(r.objects.filter(o => o.type === 'slider')).toHaveLength(1);
    const existing = run('be = 3', sliders());
    expect(slider(existing.objects, 'b').value).toBe(3);
    expect(existing.objects.filter(o => o.type === 'slider')).toHaveLength(3);
  });
});

describe('algebra phrases (full engine): slider creation and editing', () => {
  it.each([
    ['sıfırdan ona kadar bir kaydırıcı ekle', true, { min: 0, max: 10 }],
    ['eksi üçten üçe kadar a kaydırıcısı oluştur', true, { min: -3, max: 3 }],
    ['sıfır ile bir arasında t kaydırıcısı ekle', true, { min: 0, max: 1 }],
    ['adı k olan kaydırıcı ekle', false, {}],
    ['adı t olan bir parametre oluştur', false, {}],
  ] as const)('“%s”', (text, spoken, expected) => {
    const r = run(text, [], spoken);
    const created = r.objects.filter((o): o is SliderObject => o.type === 'slider');
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject(expected);
    const named = text.match(/adı (\w) olan/);
    if (named) expect(created[0].variableName).toBe(named[1]);
  });

  it.each([
    ['a değerini beşe ayarla', 'a', { value: 5 }],
    ["A'nın değerini beşe ayarla", 'a', { value: 5 }],
    ["A'yı bir azalt", 'a', { value: 0 }],
    ["A'yı üç yapar mısın", 'a', { value: 3 }],
    ["a'nın minimumunu -3 yap", 'a', { min: -3 }],
    ["a'nın maksimumunu 8 yap", 'a', { max: 8 }],
    ["A'nın minimum değerini -3 yap", 'a', { min: -3 }],
    ["B'yi iki yap", 'b', { value: 2 }],
  ] as const)('“%s”', (text, name, expected) => {
    expect(slider(run(text, sliders()).objects, name)).toMatchObject(expected);
  });

  it.each([
    ['a yı bir azalt', 'a', { value: 0 }],
    ['a yı üç yapar mısın', 'a', { value: 3 }],
    ['a nın minimum değerini eksi üç yap', 'a', { min: -3 }],
  ] as const)('spoken “%s”', (text, name, expected) => {
    expect(slider(run(text, sliders(), true).objects, name)).toMatchObject(expected);
  });

  it('prefers the slider for "A\'yı 3 yap" even when a point A exists', () => {
    expect(slider(run("A'yı 3 yap", rich()).objects, 'a').value).toBe(3);
  });
});

describe('algebra phrases (full engine): playback wording', () => {
  it.each([
    ['oynatmayı durdur', 'stop'], ['oynatmayı başlat', 'play'], ['kaydırıcıları hareket ettir', 'play'], ['kaydırıcıları hareketlendir', 'play'],
    ['oynat/durdur', 'toggle'],
  ] as const)('“%s” → %s', (text, mode) => {
    expect(run(text, sliders()).actions).toEqual([{ kind: 'playback', mode }]);
  });

  it('does not play sliders for "A noktasını hareket ettir"', () => {
    const scene = rich();
    expect(topHandler('A noktasını hareket ettir', scene)).not.toBe('algebra.slider.playback');
  });
});

describe('algebra phrases (full engine): fractions, input boxes and polynomial fit', () => {
  it.each([
    ['dörtte bir kesrini göster', 1, 4], ['ikide bir kesir modeli çiz', 1, 2], ['dörtte üç kesrini göster', 3, 4],
  ] as const)('“%s” → %i/%i', (text, numerator, denominator) => {
    const fraction = run(text, [], true).objects.find(o => o.type === 'fraction');
    expect(fraction).toMatchObject({ numerator, denominator });
  });

  it('creates a checkbox for "ABC\'yi gösterip gizleyen onay kutusu ekle" whether or not the sentence is split', () => {
    const scene = rich();
    const box = run("ABC'yi gösterip gizleyen onay kutusu ekle", scene).objects.find(o => o.type === 'checkbox');
    expect(box).toMatchObject({ targetIds: [scene.find(o => o.type === 'polygon')!.id] });
  });

  it('binds an input box to a spoken letter name ("be için girdi kutusu ekle")', () => {
    const scene = rich();
    const box = run('be için girdi kutusu ekle', scene, true).objects.find(o => o.type === 'input_box');
    expect(box).toMatchObject({ targetId: slider(scene, 'b').id, field: 'value' });
  });

  it.each([['ABC noktalarından geçen parabolü bul', false], ['A B C noktalarından geçen parabolü bul', true]] as const)('fits “%s”', (text, spoken) => {
    const scene = points();
    const r = run(text, scene, spoken);
    expectGraph(changedFunction(r.objects, scene), r.objects, x => x * x);
  });
});
