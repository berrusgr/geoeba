import { describe, expect, it } from 'vitest';
import { spokenMathToExpression } from '../spokenMath';
import { compileMathExpression } from '../../parser';

const samples = [-2.5, -1, 0.5, 1, 2, 3.7];

describe('spokenMathToExpression', () => {
  it.each<[string, (x: number) => number]>([
    ['x kare fonksiyonu çiz', x => x ** 2],
    ['x kare', x => x ** 2],
    ['x²', x => x ** 2],
    ['x küp eksi x', x => x ** 3 - x],
    ['x kare artı 2x eksi 3', x => x ** 2 + 2 * x - 3],
    ['iki x artı bir', x => 2 * x + 1],
    ['2 çarpı x artı 5 grafiğini çiz', x => 2 * x + 5],
    ['eksi x kare artı 4', x => -(x ** 2) + 4],
    ["x'in karekökü", x => Math.sqrt(x)],
    ['karekök x', x => Math.sqrt(x)],
    ['sinüs x', x => Math.sin(x)],
    ['sin 2x', x => Math.sin(2 * x)],
    ['kosinüs x fonksiyonunu çiz', x => Math.cos(x)],
    ['e üzeri x', x => Math.exp(x)],
    ['x üzeri 4', x => x ** 4],
    ['bir bölü x', x => 1 / x],
    ['mutlak değer x eksi 2', x => Math.abs(x) - 2],
    ['(x artı 1) kare', x => (x + 1) ** 2],
    ['parantez aç x eksi 2 parantez kapat küp', x => (x - 2) ** 3],
    ['doğal logaritma x', x => Math.log(x)],
    ['yarım x kare', x => 0.5 * x ** 2],
    ['3 x kare eksi 2 x artı 1 parabolünü çiz', x => 3 * x ** 2 - 2 * x + 1],
  ])('%s', (spoken, expected) => {
    const expression = spokenMathToExpression(spoken);
    expect(expression).not.toBeNull();
    const fn = compileMathExpression(expression!)!;
    for (const x of samples) {
      const want = expected(x);
      if (Number.isFinite(want)) expect(fn(x)).toBeCloseTo(want, 9);
    }
  });

  it.each(['üçgen çiz', 'kare çiz', 'bugün hava nasıl', 'x artı', 'artı x', 'karekök', '5 artı 3'])('rejects %s', text => {
    expect(spokenMathToExpression(text)).toBeNull();
  });
});
