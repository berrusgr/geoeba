import { afterEach, describe, expect, it } from 'vitest';
import type { FunctionObject, MathObject, SliderObject } from '@/types/math';
import {
  compileMathExpression,
  evaluateNumericInput,
  extractVariableNames,
  getUserFunctions,
  setUserFunctions,
  validateMathExpression,
} from '../parser';
import {
  functionDefinitionCycle,
  functionNameOf,
  nextFunctionName,
  relabelFunction,
  undefinedFunctionCalls,
  userFunctionDefinitions,
  withUserFunctions,
} from '../functionNames';

const fn = (label: string, expression: string, id = label): FunctionObject => ({
  id, type: 'function', label, showLabel: true, expression, color: '#000', visible: true, createdAt: 0,
});
const slider = (variableName: string, value: number): SliderObject => ({
  id: `s-${variableName}`, type: 'slider', label: variableName, showLabel: true, variableName, min: -5, max: 5, step: 0.1, value,
  color: '#000', visible: true, createdAt: 0,
});

afterEach(() => setUserFunctions([]));

describe('kullanıcı fonksiyonu çağrıları', () => {
  it('f(5) kayıtlı fonksiyonun değerini verir', () => {
    setUserFunctions([['f', 'x^2 + 1']]);
    expect(compileMathExpression('f(5)')!(0)).toBe(26);
    expect(evaluateNumericInput('f(2) + 1')).toEqual({ ok: true, value: 6 });
  });

  it('başka bir fonksiyonun içinde x ile çağrılır ve kaydırıcıları paylaşır', () => {
    setUserFunctions([['f', 'a*x'], ['g', 'f(x) + 1']]);
    const g = compileMathExpression('g(x)')!;
    expect(g(3, { a: 2 })).toBe(7);
    expect(compileMathExpression('f(x)^2')!(3, { a: 1 })).toBe(9);
    expect(compileMathExpression('2f(x + 1)')!(1, { a: 1 })).toBe(4);
  });

  it('çağrılan fonksiyon adı kaydırıcı sayılmaz', () => {
    setUserFunctions([['f', 'x^2']]);
    expect(extractVariableNames('f(x) + b')).toEqual(['b']);
    expect(validateMathExpression('f(5)', []).ok).toBe(true);
  });

  it('kayıt yokken eski davranış sürer: a(x+1)^2 = a·(x+1)²', () => {
    expect(compileMathExpression('a(x+1)^2')!(1, { a: 2 })).toBe(8);
    expect(extractVariableNames('f(x) + 1')).toEqual(['f']);
  });

  it('önbellekteki derleme sonradan tanımlanan fonksiyonu görür', () => {
    const cached = compileMathExpression('f(x) + 1')!;
    setUserFunctions([['f', 'x^3']]);
    expect(cached(2)).toBe(9);
    setUserFunctions([['f', 'x^3 - 1']]);
    expect(cached(2)).toBe(8);
  });

  it('döngüsel tanım sonsuza gitmez, NaN verir', () => {
    setUserFunctions([['f', 'g(x) + 1'], ['g', 'f(x) - 1']]);
    expect(compileMathExpression('f(1)')!(0)).toBeNaN();
  });

  it('parantezsiz ya da çok değerli çağrı açık hata verir', () => {
    setUserFunctions([['f', 'x']]);
    expect(validateMathExpression('f + 1').ok).toBe(false);
    // "f(1, 2)" Türkçe ondalık f(1.2) okunur; iki değer ";" ile ayrılır.
    expect(validateMathExpression('f(1; 2)').ok).toBe(false);
    expect(validateMathExpression('f()').ok).toBe(false);
  });

  it('x, y, e ve yerleşik adlar kaydedilmez', () => {
    setUserFunctions([['x', '1'], ['y', '2'], ['e', '3'], ['ln', '4'], ['k', '5']]);
    expect(getUserFunctions()).toEqual([['k', '5']]);
  });
});

describe('fonksiyon adları', () => {
  it('etiketten ad okunur', () => {
    expect(functionNameOf(fn('g(x) = x^2', 'x^2'))).toBe('g');
    expect(functionNameOf(fn('F (x) = x', 'x'))).toBe('f');
    expect(functionNameOf(fn('y = 2x + 1', '2x + 1'))).toBeUndefined();
    expect(functionNameOf(fn('Parabol', 'x^2'))).toBeUndefined();
  });

  it('sıradaki ad fonksiyon ve kaydırıcılarla çakışmaz', () => {
    const scene: MathObject[] = [fn('f(x) = x', 'x'), slider('g', 1), fn('h(x) = 1', '1')];
    expect(nextFunctionName([])).toBe('f');
    expect(nextFunctionName(scene)).toBe('p');
    const full = ['f', 'g', 'h', 'p', 'q', 'r', 's', 'u', 'v', 'w'].map(n => fn(`${n}(x) = x`, 'x'));
    expect(nextFunctionName(full)).toBe('f1');
  });

  it('ifade değişince ad korunur', () => {
    const g = fn('g(x) = x', 'x');
    expect(relabelFunction(g, 'x^2', [g])).toBe('g(x) = x^2');
    expect(relabelFunction(fn('y = x', 'x'), '2x', [])).toBe('y = 2x');
    expect(relabelFunction(fn('Doğru', 'x', 'd'), '3x', [fn('f(x) = 1', '1')])).toBe('g(x) = 3x');
  });

  it('kaydırıcıyla aynı adlı fonksiyon çağrılabilir sayılmaz (eski projeler)', () => {
    expect(userFunctionDefinitions([fn('f(x) = f*x', 'f*x'), slider('f', 2)])).toEqual([]);
    const scene: MathObject[] = [fn('f(x) = f*x', 'f*x'), slider('f', 2)];
    withUserFunctions(scene, () => expect(compileMathExpression('f*x')!(3, { f: 2 })).toBe(6));
  });

  it('döngü ve tanımsız çağrı bulunur', () => {
    const scene: MathObject[] = [fn('f(x) = g(x) + 1', 'g(x) + 1')];
    expect(functionDefinitionCycle(scene, 'g', 'f(x) * 2')).toEqual(['g', 'f', 'g']);
    expect(functionDefinitionCycle([], 'f', 'f(x) + 1')).toEqual(['f', 'f']);
    expect(functionDefinitionCycle(scene, 'h', 'f(x)')).toBeNull();
    expect(undefinedFunctionCalls(scene, 'h(x) + f(2) + a(x+1) + sin(x)')).toEqual(['h']);
  });

  it('withUserFunctions önceki tabloyu geri yükler', () => {
    setUserFunctions([['k', 'x']]);
    withUserFunctions([fn('f(x) = 2x', '2x')], () => expect(evaluateNumericInput('f(4)')).toEqual({ ok: true, value: 8 }));
    expect(getUserFunctions()).toEqual([['k', 'x']]);
  });
});
