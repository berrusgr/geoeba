import { afterEach, describe, expect, it } from 'vitest';
import type { FunctionObject, MathObject } from '@/types/math';
import { runCommand } from '../engine';
import { compileMathExpression, getUserFunctions, setUserFunctions } from '../../parser';
import { withUserFunctions } from '../../functionNames';
import { copyObjects, pasteObjects } from '../../objectClipboard';

function run(text: string, scene: MathObject[] = []) {
  const result = runCommand(text, scene);
  if (!result.ok) throw new Error(`${text}: ${result.message}`);
  return result;
}
function chain(...texts: string[]) {
  let scene: MathObject[] = [];
  for (const text of texts) scene = run(text, scene).objects;
  return scene;
}
const functions = (scene: MathObject[]) => scene.filter((o): o is FunctionObject => o.type === 'function');

afterEach(() => setUserFunctions([]));

describe('fonksiyon adları ve fonksiyonların birbirini çağırması (komut motoru)', () => {
  it('her yeni fonksiyon boştaki adı alır: f, g, h', () => {
    const scene = chain('x kare fonksiyonu çiz', 'sin x grafiğini çiz', 'x küp grafiğini çiz');
    expect(functions(scene).map(f => f.label.split('(')[0])).toEqual(['f', 'g', 'h']);
  });

  it('başka fonksiyonu çağıran fonksiyon kaydırıcı üretmez ve doğru hesaplanır', () => {
    const scene = chain('f(x) = x^2 + 1', 'g(x) = f(x) + 1', 'h(x) = f(5) * x');
    expect(scene.filter(o => o.type === 'slider')).toEqual([]);
    const g = functions(scene).find(f => f.label.startsWith('g'))!;
    // Tuval, tabloyu ekrandaki nesnelerden kurar (WorkspaceView)
    withUserFunctions(scene, () => {
      expect(compileMathExpression(g.expression)!(2)).toBe(6);
      expect(compileMathExpression('h(x)')!(2)).toBe(52);
    });
  });

  it('a = f(2) kaydırıcıya fonksiyonun değerini atar', () => {
    const result = run('a = f(2)', chain('f(x) = x^2 + 1'));
    expect(result.objects.find(o => o.type === 'slider')).toMatchObject({ variableName: 'a', value: 5 });
  });

  it('f(5) kaç ve doğal sorular sahneyi değiştirmeden cevaplanır', () => {
    const scene = chain('f(x) = x^2 + 1');
    expect(run('f(5) kaç', scene).message).toBe('f(5) = 26.');
    expect(run('f(5) = ?', scene).message).toBe('f(5) = 26.');
    expect(run("f(5)'in değeri nedir", scene).message).toBe('f(5) = 26.');
    expect(run("f'nin 3'teki değeri nedir", scene).message).toBe('f(3) = 10.');
    expect(run('x = 2 iken f kaç', scene).message).toBe('f(2) = 5.');
    expect(run('f(5) kaç', scene).sceneChanged).toBe(false);
  });

  it('kaydırıcıya bağlı değerde kaydırıcının o anki değeri söylenir', () => {
    const scene = chain('a = 2', 'f(x) = a*x');
    expect(run('f(3) kaç', scene).message).toBe('f(3) = 6 (a = 2 iken).');
  });

  it('tanımsız ve döngüsel çağrılar açıklamayla reddedilir', () => {
    const scene = chain('f(x) = x');
    expect(runCommand('k(5) kaç', scene)).toMatchObject({ ok: false, message: expect.stringContaining('k(x) tanımlı değil') });
    expect(runCommand('g(x) = h(x) + 1', scene)).toMatchObject({ ok: false, message: expect.stringContaining('h(x) tanımlı değil') });
    expect(runCommand('f(x) = f(x) + 1', scene)).toMatchObject({ ok: false, message: expect.stringContaining('kendisine bağlı olamaz') });
  });

  it('koordinatta fonksiyonun değeri kullanılır', () => {
    const result = run('(3, f(3)) noktasını çiz', chain('f(x) = x^2'));
    expect(result.objects.find(o => o.type === 'point')).toMatchObject({ x: 3, y: 9 });
  });

  it('yeniden adlandırınca başka fonksiyonlardaki çağrılar da güncellenir', () => {
    const result = run('f fonksiyonunun adını k yap', chain('f(x) = x^2', 'g(x) = f(x) + 1'));
    expect(functions(result.objects).map(f => f.label)).toEqual(['k(x) = x^2', 'g(x) = k(x) + 1']);
  });

  it('komut motoru ekrandaki fonksiyon tablosunu değiştirmez (deneme çalıştırmaları dahil)', () => {
    setUserFunctions([['q', 'x']]);
    chain('f(x) = x^2');
    runCommand('g(x) = f(x) + 1', []);
    expect(getUserFunctions()).toEqual([['q', 'x']]);
  });

  it('hesap makinesi: 2^10 kaç', () => {
    expect(run('2^10 kaç').message).toBe('2^10 = 1024.');
  });

  it('yapıştırılan fonksiyon aynı adı taşımaz', () => {
    const scene = chain('f(x) = x^2');
    const pasted = pasteObjects(copyObjects(scene, [functions(scene)[0].id]), scene, { x: 1, y: 1 });
    expect(functions(pasted.objects)[0].label).toBe('g(x) = x^2');
  });
});
