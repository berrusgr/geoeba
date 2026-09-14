import type { Point2D } from '@/types/math';
import { fold } from '../../text';

/**
 * Çember ve elips denklemleri: "(x-1)^2 + (y-2)^2 = 9", "x² + y² = 16", "x^2 + y^2 - 4x + 6y - 12 = 0",
 * "x^2/16 + y^2/9 = 1", "x kare artı y kare eşittir 16".
 * İki değişkenli, en çok ikinci dereceden polinom olarak çözümlenir; sol − sağ = 0 biçimine getirilir.
 */

type Poly = Map<string, number>;
const key = (i: number, j: number) => `${i},${j}`;
const EPS = 1e-9;

function add(a: Poly, b: Poly, factor = 1): Poly {
  const out = new Map(a);
  for (const [k, v] of b) out.set(k, (out.get(k) ?? 0) + v * factor);
  return out;
}
function scale(a: Poly, factor: number): Poly {
  return new Map([...a].map(([k, v]) => [k, v * factor]));
}
function mul(a: Poly, b: Poly): Poly {
  const out: Poly = new Map();
  for (const [ka, va] of a) for (const [kb, vb] of b) {
    const [ia, ja] = ka.split(',').map(Number), [ib, jb] = kb.split(',').map(Number);
    if (ia + ib + ja + jb > 2) {
      if (Math.abs(va * vb) > EPS) throw new Error('degree');
      continue;
    }
    const k = key(ia + ib, ja + jb);
    out.set(k, (out.get(k) ?? 0) + va * vb);
  }
  return out;
}
const constant = (n: number): Poly => new Map([[key(0, 0), n]]);
function constantValue(p: Poly): number | undefined {
  for (const [k, v] of p) if (k !== '0,0' && Math.abs(v) > EPS) return undefined;
  return p.get('0,0') ?? 0;
}

class PolyParser {
  private pos = 0;
  constructor(private readonly s: string) {}
  parse(): Poly {
    const p = this.expr();
    if (this.pos !== this.s.length) throw new Error('syntax');
    return p;
  }
  private peek() { return this.s[this.pos]; }
  private expr(): Poly {
    let p = this.term();
    while (this.peek() === '+' || this.peek() === '-') {
      const op = this.s[this.pos++];
      p = add(p, this.term(), op === '-' ? -1 : 1);
    }
    return p;
  }
  private term(): Poly {
    let p = this.unary();
    for (;;) {
      const ch = this.peek();
      if (ch === '*') { this.pos++; p = mul(p, this.unary()); }
      else if (ch === '/') {
        this.pos++;
        const d = constantValue(this.unary());
        if (d === undefined || Math.abs(d) < EPS) throw new Error('division');
        p = scale(p, 1 / d);
      } else if (ch !== undefined && /[0-9.xy(]/.test(ch)) p = mul(p, this.power());
      else return p;
    }
  }
  private unary(): Poly {
    if (this.peek() === '-') { this.pos++; return scale(this.unary(), -1); }
    if (this.peek() === '+') { this.pos++; return this.unary(); }
    return this.power();
  }
  private power(): Poly {
    const base = this.primary();
    if (this.peek() !== '^') return base;
    this.pos++;
    const m = this.s.slice(this.pos).match(/^\d+/);
    if (!m) throw new Error('exponent');
    this.pos += m[0].length;
    const n = Number(m[0]);
    if (n > 2) {
      if (constantValue(base) === undefined) throw new Error('degree');
      return constant(constantValue(base)! ** n);
    }
    let out = constant(1);
    for (let i = 0; i < n; i++) out = mul(out, base);
    return out;
  }
  private primary(): Poly {
    const ch = this.peek();
    if (ch === '(') {
      this.pos++;
      const p = this.expr();
      if (this.peek() !== ')') throw new Error('paren');
      this.pos++;
      return p;
    }
    if (ch === 'x') { this.pos++; return new Map([[key(1, 0), 1]]); }
    if (ch === 'y') { this.pos++; return new Map([[key(0, 1), 1]]); }
    const m = this.s.slice(this.pos).match(/^\d+(?:\.\d+)?|^\.\d+/);
    if (!m) throw new Error('syntax');
    this.pos += m[0].length;
    return constant(Number(m[0]));
  }
}

export type ConicResult =
  | { kind: 'circle'; source: string; center: Point2D; radius: number }
  | { kind: 'ellipse'; source: string; center: Point2D; radiusX: number; radiusY: number }
  | { kind: 'error'; source: string; message: string };

const MATH_CHAR = /[\sxy0-9+\-*/^().,²]/;

const NUMBER_WORDS: Record<string, number> = {
  sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30, kirk: 40,
  elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90, yuz: 100,
};
const NUMBER_RUN = new RegExp(`\\b(?:${Object.keys(NUMBER_WORDS).join('|')})(?:\\s+(?:${Object.keys(NUMBER_WORDS).join('|')}|bucuk))*\\b`, 'g');

/** "on altı" → 16, "iki buçuk" → 2.5 (yalnızca konuşma biçimli denklem denemesinde). */
function spokenNumbers(s: string): string {
  return s.replace(NUMBER_RUN, run => {
    let value = 0;
    for (const word of run.split(/\s+/)) {
      if (word === 'bucuk') { value += 0.5; continue; }
      const n = NUMBER_WORDS[word];
      if (n === 100) value = (value || 1) * 100;
      else value += n;
    }
    return String(value);
  });
}

/** Ham metinden "… = …" denklemini çıkarır (sağında/solunda Türkçe sözcükler olabilir). x ve y yoksa null. */
export function extractEquation(raw: string, spoken = false): string | null {
  let s = fold(raw)
    // "x'in karesi", "y'nin karesi": kesme işareti denklemin parçası değildir.
    .replace(/(?<=[xy)])\s*['’]\s*(?=n?[iu]n\b)/g, ' ')
    // Konuşmada harf adları: "iks kare artı ye kare"
    .replace(/\biks\b/g, 'x').replace(/\bye\b(?=\s*(?:kare|\^|²|nin\s+kare|[-+]|arti\b|eksi\b))/g, 'y')
    .replace(/[−–—]/g, '-').replace(/[×·]/g, '*')
    .replace(/\besittir\b/g, '=').replace(/\barti\b/g, '+').replace(/\beksi\b/g, '-')
    .replace(/\bbolu\b/g, '/').replace(/\bcarpi\b/g, '*');
  if (spoken) s = spokenNumbers(s);
  s = s
    // "x eksi 1 in karesi" → "(x - 1)^2"
    .replace(/((?:[xy]\s*[-+]\s*\d+(?:[.,]\d+)?)|(?:(?<![/*^.\d]\s*)\d+(?:[.,]\d+)?\s*[-+]\s*[xy]))\s*['’]?\s*(?:n?[iu]n\s+)?kare(?:si)?\b/g, '($1)^2')
    .replace(/([xy)])\s*(?:nin\s+|in\s+)?kare(?:si)?\b/g, '$1^2')
    .replace(/²/g, '^2').replace(/³/g, '^3');
  // "x2 + y2 = 9": üs işareti unutulmuş
  if (/(?<![\p{L}\d])x2(?![\d.,])/u.test(s) && /(?<![\p{L}\d])y2(?![\d.,])/u.test(s)) s = s.replace(/(?<![\p{L}\d])([xy])2(?![\d.,])/gu, '$1^2');
  const eq = s.indexOf('=');
  if (eq < 0 || s.indexOf('=', eq + 1) >= 0) return null;
  let start = eq, end = eq + 1;
  while (start > 0 && MATH_CHAR.test(s[start - 1])) start--;
  while (end < s.length && MATH_CHAR.test(s[end])) end++;
  // Sözcüğe yapışık x/y harfleri ("kaydiriciy") denkleme dahil değildir.
  while (start < eq && start > 0 && /\p{L}/u.test(s[start - 1]) && /[xy]/.test(s[start])) start++;
  while (end > eq + 1 && end < s.length && /\p{L}/u.test(s[end]) && /[xy]/.test(s[end - 1])) end--;
  s = s.slice(start, end).trim().replace(/[\s,.]+$/, '').replace(/^[\s,.]+/, '');
  if (!/x/.test(s) || !/y/.test(s)) return null;
  return s;
}

/** Denklem ikinci dereceden bir çember/elips ise geometrisini, açıkça başka bir eğriyse Türkçe hata verir; ilgisizse null. */
export function analyzeConic(source: string): ConicResult | null {
  const compact = source.replace(/\s+/g, '').replace(/(\d),(\d)/g, '$1.$2');
  if (/,/.test(compact)) return null;
  const [left, right] = compact.split('=');
  if (!left || !right) return null;
  let poly: Poly;
  try {
    poly = add(new PolyParser(left).parse(), new PolyParser(right).parse(), -1);
  } catch (error) {
    if (error instanceof Error && error.message === 'degree' && /x/.test(compact) && /y/.test(compact)) {
      return { kind: 'error', source, message: 'Yalnızca ikinci dereceden çember ve elips denklemleri çizilebilir (ör. “x^2 + y^2 = 16”).' };
    }
    return null;
  }
  const get = (i: number, j: number) => poly.get(key(i, j)) ?? 0;
  let A = get(2, 0), C = get(0, 2), B = get(1, 0), D = get(0, 1), E = get(0, 0);
  const XY = get(1, 1);
  if (Math.abs(A) < EPS && Math.abs(C) < EPS) return null;
  if (Math.abs(A) < EPS || Math.abs(C) < EPS) return null; // parabol: çember/elips değil
  if (Math.abs(XY) > EPS) return { kind: 'error', source, message: 'xy terimli (eğik) denklemler desteklenmiyor. Çember için “(x-a)^2 + (y-b)^2 = r^2” biçimini kullanın.' };
  if (A < 0) { A = -A; B = -B; C = -C; D = -D; E = -E; }
  if (C < 0) return { kind: 'error', source, message: 'Bu denklem bir hiperbol belirtiyor; yalnızca çember ve elips denklemleri çizilebilir.' };
  const center = { x: -B / (2 * A), y: -D / (2 * C) };
  const K = (B * B) / (4 * A) + (D * D) / (4 * C) - E;
  if (K <= EPS) {
    return { kind: 'error', source, message: Math.abs(K) <= EPS
      ? 'Bu denklem yalnızca tek bir noktayı gösteriyor; yarıçap 0 olamaz.'
      : 'Bu denklemin grafiği yok: yarıçapın karesi pozitif olmalı (ör. “x^2 + y^2 = 16”).' };
  }
  const radiusX = Math.sqrt(K / A), radiusY = Math.sqrt(K / C);
  const clean = (n: number) => Math.abs(n) < 1e-12 ? 0 : n;
  const c = { x: clean(center.x), y: clean(center.y) };
  if (Math.abs(A - C) <= EPS * Math.max(1, Math.abs(A))) return { kind: 'circle', source, center: c, radius: radiusX };
  return { kind: 'ellipse', source, center: c, radiusX, radiusY };
}

/** Kullanıcıya gösterim: "x^2" → "x²" */
export function prettyEquation(source: string): string {
  return source.replace(/\s+/g, '').replace(/\^2/g, '²')
    .replace(/(?<=[^=(+\-*/^])([=+-])/g, ' $1 ')
    .replace(/-/g, '−').replace(/\s+/g, ' ').trim();
}
