import { validateMathExpression } from '../parser';
import { fold } from './text';

/**
 * Sözle yazılmış matematik ifadesini formüle çevirir:
 *   "x kare" → "x^2", "x kare artı 2x eksi 3" → "x^2 + 2*x - 3", "x'in karekökü" → "sqrt(x)",
 *   "sinüs x" → "sin(x)", "e üzeri x" → "e^x", "bir bölü x" → "1/x", "mutlak değer x eksi 2" → "abs(x) - 2".
 * Tanınmayan bir sözcük varsa ya da sonuç geçerli bir x ifadesi değilse null döner (tahmin yapılmaz).
 */
export function spokenMathToExpression(input: string): string | null {
  const text = fold(input)
    .replace(/[’'′]/g, ' ')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/²/g, ' kare ').replace(/³/g, ' kup ')
    .replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
    .replace(/√/g, ' karekok ');
  const tokens = text.match(/\d+(?:\.\d+)?|[a-z]+|[()+\-*/^]/g) ?? [];
  const parsed = parseSequence(tokens, 0, false);
  if (!parsed || parsed.next !== tokens.length || !parsed.expr || !/\bx\b/.test(parsed.expr)) return null;
  return validateMathExpression(parsed.expr).ok ? parsed.expr : null;
}

const NUMBER_WORDS: Record<string, number> = {
  sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30, kirk: 40,
  elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90, yuz: 100,
};
const PREFIX: Record<string, string> = {
  karekok: 'sqrt', sqrt: 'sqrt', kupkok: 'cbrt', sin: 'sin', sinus: 'sin', cos: 'cos', kosinus: 'cos', cosinus: 'cos', tan: 'tan', tanjant: 'tan',
  ln: 'ln', log: 'log', logaritma: 'log', mutlak: 'abs', abs: 'abs', exp: 'exp', arcsin: 'asin', arccos: 'acos', arctan: 'atan',
};
const POSTFIX: Record<string, string> = {
  karekoku: 'sqrt', kupkoku: 'cbrt', sinusu: 'sin', kosinusu: 'cos', tanjanti: 'tan', logaritmasi: 'log', mutlakdegeri: 'abs',
};
/** Formülün parçası olmayan, komut cümlesinden kalan sözcükler. */
const NOISE = /^(?:fonksiyon\w*|grafi\w*|ciz\w*|olustur\w*|goster\w*|egri\w*|parabol\w*|denklem\w*|bana|lutfen|misin|mi|icin|olan|esittir|ifade\w*|seklinde|biciminde|bagli|degisken\w*|yap\w*|ekle\w*|istiyorum|olsun|in|nin|un|nun|yin|yun|f|g|h|y|deger|degeri|dogal)$/;

type Item = { kind: 'atom' | 'op'; value: string };

function wrap(value: string): string {
  if (/^[a-z0-9.]+$/.test(value)) return value;
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth--;
    else if (depth === 0 && '+-*/^'.includes(value[i])) return `(${value})`;
  }
  return value;
}

function join(items: Item[]): string {
  return items.map(item => item.kind === 'atom' ? item.value : item.value === 'neg' ? '-' : item.value === '+' || item.value === '-' ? ` ${item.value} ` : item.value).join('').trim();
}

function parseSequence(tokens: string[], start: number, closing: boolean): { expr: string; next: number } | null {
  const out: Item[] = [];
  const pending: string[] = [];
  let powerNext = false;
  const lastIsAtom = () => out.length > 0 && out[out.length - 1].kind === 'atom';
  const pushAtom = (atom: string): boolean => {
    let value = atom;
    while (pending.length) value = `${pending.pop()}(${value})`;
    if (powerNext) {
      powerNext = false;
      const base = out.pop();
      if (!base || base.kind !== 'atom') return false;
      out.push({ kind: 'atom', value: `${wrap(base.value)}^${wrap(value)}` });
      return true;
    }
    if (lastIsAtom()) out.push({ kind: 'op', value: '*' });
    out.push({ kind: 'atom', value });
    return true;
  };
  const postfix = (fn: (value: string) => string): boolean => {
    const last = out[out.length - 1];
    if (!last || last.kind !== 'atom') return false;
    last.value = fn(last.value);
    return true;
  };
  const operator = (value: string): boolean => {
    if (value === '-' && !lastIsAtom()) { out.push({ kind: 'op', value: 'neg' }); return true; }
    if (!lastIsAtom()) return false;
    out.push({ kind: 'op', value });
    return true;
  };
  const readNumber = (i: number): { value: number; next: number } | null => {
    const t = tokens[i];
    if (/^\d/.test(t)) {
      let value = Number(t), next = i + 1;
      if (tokens[next] === 'bucuk') { value += 0.5; next++; }
      return { value, next };
    }
    if (t === 'yarim') return { value: 0.5, next: i + 1 };
    if (!(t in NUMBER_WORDS)) return null;
    let value = NUMBER_WORDS[t], next = i + 1;
    while (next < tokens.length && tokens[next] in NUMBER_WORDS) {
      const n = NUMBER_WORDS[tokens[next]];
      if (n === 100 && value < 10) value = (value || 1) * 100;
      else if (value >= 10 && value % 10 === 0 && n < 10 && value < 100) value += n;
      else if (value >= 100 && value % 100 === 0 && n < 100) value += n;
      else break;
      next++;
    }
    if (tokens[next] === 'bucuk') { value += 0.5; next++; }
    return { value, next };
  };

  let i = start;
  while (i < tokens.length) {
    const t = tokens[i], next = tokens[i + 1];
    if (t === ')' || (t === 'parantez' && next === 'kapat')) {
      if (!closing) return null;
      return { expr: join(out), next: i + (t === ')' ? 1 : 2) };
    }
    if (t === '(' || (t === 'parantez' && next === 'ac')) {
      const inner = parseSequence(tokens, i + (t === '(' ? 1 : 2), true);
      if (!inner || !inner.expr || !pushAtom(`(${inner.expr})`)) return null;
      i = inner.next;
      continue;
    }
    const number = readNumber(i);
    if (number) {
      // "sin 2x" → sin(2*x): sayı ve x birlikte tek terim
      if (pending.length && tokens[number.next] === 'x') {
        if (!pushAtom(`${number.value}*x`)) return null;
        i = number.next + 1;
      } else {
        if (!pushAtom(String(number.value))) return null;
        i = number.next;
      }
      continue;
    }
    if (t === 'x' || t === 'iks') { if (!pushAtom('x')) return null; i++; continue; }
    if (t === 'pi') { if (!pushAtom('pi')) return null; i++; continue; }
    if (t === 'e' && (next === 'uzeri' || next === 'ussu' || next === '^')) { if (!pushAtom('e')) return null; i++; continue; }
    if (t === 'arti' || t === '+') { if (!operator('+')) return null; i++; continue; }
    if (t === 'eksi' || t === '-') { if (!operator('-')) return null; i++; continue; }
    if (t === 'carpi' || t === 'kere' || t === '*') { if (!operator('*')) return null; i++; continue; }
    if (t === 'bolu' || t === '/') { if (!operator('/')) return null; i++; continue; }
    if (t === 'kare' || t === 'karesi') { if (!postfix(v => `${wrap(v)}^2`)) return null; i++; continue; }
    if (t === 'kup' || t === 'kubu') { if (!postfix(v => `${wrap(v)}^3`)) return null; i++; continue; }
    if (t === 'uzeri' || t === 'ussu' || t === 'kuvveti' || t === '^') {
      if (!lastIsAtom()) return null;
      powerNext = true; i++; continue;
    }
    if (t === 'mutlak' && (next === 'degeri' || next === 'deger') && lastIsAtom() && tokens[i - 1] !== 'mutlak') {
      if (!postfix(v => `abs(${v})`)) return null;
      i += 2; continue;
    }
    if (t === 'dogal' && next === 'logaritma') { pending.push('ln'); i += 2; continue; }
    if (t in POSTFIX && lastIsAtom()) { const fn = POSTFIX[t]; if (!postfix(v => `${fn}(${v})`)) return null; i++; continue; }
    if (t in PREFIX) {
      pending.push(PREFIX[t]);
      i += t === 'mutlak' && (next === 'deger' || next === 'degeri') ? 2 : 1;
      continue;
    }
    if (NOISE.test(t)) { i++; continue; }
    return null;
  }
  if (closing || pending.length || powerNext || (out.length && out[out.length - 1].kind === 'op')) return null;
  return { expr: join(out), next: tokens.length };
}
